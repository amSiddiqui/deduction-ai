# services/answer_checker.py
"""Simple answer-checking utilities.

The logic is deliberately lightweight so new rules or an LLM
self-evaluation step can be swapped in without touching the rest
of the codebase.
"""

import re
import ast
import operator as op
from typing import Callable, Any

# Supported operators for the _eval function
EVAL_ALLOWED_OPERATORS = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.USub: op.neg,  # For unary minus (e.g., -5)
    ast.UAdd: op.pos,  # For unary plus (e.g., +5)
}


def _safe_eval_expr(expr_str: str, expected_numbers: set[int]) -> Any:
    """
    Safely evaluates a mathematical expression string.
    Checks for allowed characters, specific numbers, and uses a restricted AST evaluation.
    """
    # 0. Normalize whitespace (handles non-breaking spaces like \xa0 and leading/trailing)
    normalized_expr_str = " ".join(expr_str.strip().split())

    # 1. Validate allowed characters (numbers, basic operators, parentheses, spaces, decimal point)
    # This regex is critical for initial filtering.
    if not re.fullmatch(r"^[0-9+\-*/().\s]*$", normalized_expr_str):
        raise ValueError("Expression contains invalid characters.")

    # 2. Extract all numbers from the expression
    try:
        found_numbers_str = re.findall(r"\d+(?:\.\d+)?|\d+", normalized_expr_str)
        found_numbers = set()
        for s_num in found_numbers_str:
            try:
                if "." in s_num:
                    num = float(s_num)
                    if num.is_integer():
                        found_numbers.add(int(num))
                    else:
                        raise ValueError(
                            f"Non-integer number {s_num} found in expression, only whole numbers from the set are allowed."
                        )
                else:
                    found_numbers.add(int(s_num))
            except (
                ValueError
            ) as e_inner:  # Catch conversion errors for individual numbers
                raise ValueError(
                    f"Invalid number format '{s_num}' in expression: {e_inner}"
                ) from e_inner

    except Exception as e:  # Catch errors from re.findall or other unexpected issues
        raise ValueError(f"Error processing numbers in expression: {str(e)}") from e

    # 3. Check if all numbers in the expression are from the expected set
    if not found_numbers.issubset(expected_numbers):
        raise ValueError(
            f"Expression uses numbers not allowed. Expected a subset of: {sorted(list(expected_numbers))}, Found: {sorted(list(found_numbers))}"
        )

    # 4. Check if all expected numbers are used in the expression
    if not expected_numbers.issubset(found_numbers):
        raise ValueError(
            f"Expression does not use all required numbers. Required: {sorted(list(expected_numbers))}, Used: {sorted(list(found_numbers))}"
        )

    try:
        # 5. Parse the expression to an AST. mode='eval' ensures it's a single expression.
        node = ast.parse(normalized_expr_str, mode="eval")

        # 6. Evaluate the AST using a restricted interpreter (_eval function)
        def _eval(node_to_eval):
            if isinstance(node_to_eval, ast.Expression):
                # The top node for mode='eval' is Expression, evaluate its body
                return _eval(node_to_eval.body)
            elif isinstance(node_to_eval, ast.Constant):  # For Python 3.8+
                if not isinstance(node_to_eval.value, (int, float)):
                    raise ValueError(
                        f"Only numeric constants are allowed. Found: {type(node_to_eval.value)}"
                    )
                return node_to_eval.value
            elif isinstance(node_to_eval, ast.Num):  # For Python < 3.8 (deprecated)
                if not isinstance(node_to_eval.n, (int, float)):
                    raise ValueError(
                        f"Only numeric constants are allowed. Found: {type(node_to_eval.n)}"
                    )
                return node_to_eval.n
            elif isinstance(node_to_eval, ast.BinOp):
                op_type = type(node_to_eval.op)
                if op_type not in EVAL_ALLOWED_OPERATORS:
                    raise ValueError(f"Unsupported binary operator: {op_type.__name__}")
                left = _eval(node_to_eval.left)
                right = _eval(node_to_eval.right)
                return EVAL_ALLOWED_OPERATORS[op_type](left, right)
            elif isinstance(node_to_eval, ast.UnaryOp):
                op_type = type(node_to_eval.op)
                if op_type not in EVAL_ALLOWED_OPERATORS:
                    raise ValueError(f"Unsupported unary operator: {op_type.__name__}")
                operand = _eval(node_to_eval.operand)
                return EVAL_ALLOWED_OPERATORS[op_type](operand)
            else:
                # If any other AST node type is encountered, it's an error.
                raise TypeError(
                    f"Unsupported AST node type in expression: {type(node_to_eval).__name__}"
                )

        return _eval(node)

    except (SyntaxError, TypeError, ValueError, ZeroDivisionError) as e:
        # Catch common evaluation or parsing errors
        raise ValueError(f"Invalid or malformed expression: {str(e)}") from e
    except Exception as e:  # Catch any other unexpected errors
        # This could be, for example, a RecursionError for deeply nested expressions
        raise ValueError(
            f"An unexpected error occurred evaluating the expression: {str(e)}"
        ) from e


def _normalise(text: str) -> str:
    """Lower-case, collapse whitespace and strip punctuation for comparison."""
    text = re.sub(r"[\\W_]+", " ", text.lower())
    return " ".join(text.split())


def check_answer_rule(
    user_answer: str, canonical: str, stage: int
) -> (
    bool
):  # Added question_prompt back for signature consistency, though not used in this version
    """
    Checks the user's answer.
    For stage 1, it evaluates the mathematical expression.
    For other stages, it performs a normalized exact match.
    """
    user_answer = user_answer.strip()  # Basic strip before passing to specific logic
    if stage == 1:
        # replace x with * for multiplication
        user_answer = user_answer.replace("x", "*").replace("X", "*")
        expected_numbers_for_stage1 = {1, 2, 3, 7}
        try:
            result = _safe_eval_expr(user_answer, expected_numbers_for_stage1)
            # Canonical answer for stage 1 is the target number, e.g., "24"
            # Using a tolerance for float comparison
            return abs(result - float(canonical)) < 1e-9
        except ValueError as e:
            # Log this error for debugging on the server side
            print(f"Stage 1 answer validation error for input '{user_answer}': {e}")
            return False
    else:
        return _normalise(user_answer) == _normalise(canonical)


# Default rule used by SessionService - now includes stage logic
DEFAULT_ANSWER_RULE: Callable[[str, str, int], bool] = check_answer_rule
