// src/components/AnswerSubmissionDialog.tsx
import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Typography,
    CircularProgress,
    Box,
    Alert,
    IconButton,
} from "@mui/material";
import {
    CheckCircleOutline,
    NavigateNext,
    Close as CloseIcon,
    EmojiEvents,
} from "@mui/icons-material";
import { type AttemptResponse } from "../types";

// Import canvas-confetti
import confetti from "canvas-confetti";

interface AnswerSubmissionDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmitAttempt: (answer: string) => Promise<AttemptResponse>;
    questionPrompt: string;
    isLoading: boolean; // Loading state from App.tsx (actionLoading)
}

// Define the confetti firing function (can be outside the component or inside)
const fireConfetti = () => {
    // Left side
    confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 }, // Adjusted y slightly for better visibility with dialog
        zIndex: 2000, // Ensure confetti is above the dialog
    });
    // Right side
    confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 }, // Adjusted y slightly
        zIndex: 2000,
    });
    // Optional: A more central burst
    // setTimeout(() => { // Slight delay for a layered effect
    //     confetti({
    //         particleCount: 150,
    //         angle: 90,
    //         spread: 80,
    //         origin: { x: 0.5, y: 0.6 },
    //         zIndex: 2000,
    //     });
    // }, 100);
};

const AnswerSubmissionDialog: React.FC<AnswerSubmissionDialogProps> = ({
    open,
    onClose,
    onSubmitAttempt,
    questionPrompt,
    isLoading: parentIsLoading,
}) => {
    const [answer, setAnswer] = useState<string>("");
    const [submissionResult, setSubmissionResult] =
        useState<AttemptResponse | null>(null);
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        if (open) {
            setAnswer("");
            setSubmissionResult(null);
            setFieldError(null);
            setIsSubmitting(false);
        }
    }, [open, questionPrompt]);

    // useEffect to trigger confetti when a correct answer is submitted
    useEffect(() => {
        if (
            submissionResult &&
            submissionResult.correct &&
            !isSubmitting &&
            open
        ) {
            fireConfetti();
        }
    }, [submissionResult, isSubmitting, open]); // Depend on open to ensure it only fires when dialog is visible

    const handleSubmit = async () => {
        if (!answer.trim()) {
            setFieldError("Please enter your answer.");
            setSubmissionResult(null);
            return;
        }
        setFieldError(null);
        setIsSubmitting(true);
        try {
            const result = await onSubmitAttempt(answer);
            setSubmissionResult(result);
        } catch (err) {
            setSubmissionResult({
                correct: false,
                question: null,
                victory: false,
                message:
                    err instanceof Error
                        ? err.message
                        : "Failed to submit answer. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDialogClose = () => {
        onClose();
    };

    const currentLoading = parentIsLoading || isSubmitting;

    return (
        <Dialog
            open={open}
            onClose={currentLoading ? undefined : handleDialogClose}
            fullWidth
            maxWidth="sm"
            disableEscapeKeyDown={currentLoading}
            PaperProps={{
                sx: {
                    // This ensures that if confetti tries to render inside the dialog's canvas (it usually uses viewport),
                    // it won't be clipped if the dialog has overflow:hidden.
                    // However, canvas-confetti typically creates its own canvas on top of everything.
                    overflow: "visible", // Good practice when dealing with effects that might exceed bounds
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                {submissionResult?.correct
                    ? submissionResult?.victory
                        ? "Challenge Complete! 🏆"
                        : "Correct! 🎉"
                    : "Submit Your Final Answer"}
                {!currentLoading && (
                    <IconButton
                        aria-label="close"
                        onClick={handleDialogClose}
                        sx={{ position: "absolute", right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                )}
            </DialogTitle>
            <DialogContent dividers>
                <Typography
                    variant="body1"
                    gutterBottom
                    sx={{
                        whiteSpace: "pre-wrap",
                        maxHeight: "100px",
                        overflowY: "auto",
                        mb: 2,
                        p: 1,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                    }}
                >
                    <strong>Question:</strong> {questionPrompt}
                </Typography>

                {submissionResult &&
                    !submissionResult.correct &&
                    !isSubmitting && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            <Typography fontWeight="bold">
                                {submissionResult.message || "Incorrect Answer"}
                            </Typography>
                            Please review your answer and try again.
                        </Alert>
                    )}

                {!(submissionResult && submissionResult.correct) && (
                    <TextField
                        autoFocus
                        label="Your Final Answer"
                        multiline
                        rows={3}
                        fullWidth
                        variant="outlined"
                        value={answer}
                        onChange={(e) => {
                            setAnswer(e.target.value);
                            if (fieldError) setFieldError(null);
                        }}
                        disabled={currentLoading}
                        error={!!fieldError}
                        helperText={fieldError}
                        sx={{ mb: 2 }}
                    />
                )}

                {currentLoading && (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            my: 3,
                        }}
                    >
                        <CircularProgress size={24} sx={{ mr: 2 }} />
                        <Typography>Submitting...</Typography>
                    </Box>
                )}

                {submissionResult &&
                    submissionResult.correct &&
                    !isSubmitting && (
                        <Box sx={{ my: 2 }}>
                            <Alert
                                severity="success"
                                iconMapping={{
                                    success: (
                                        <CheckCircleOutline fontSize="inherit" />
                                    ),
                                }}
                            >
                                <Typography fontWeight="bold">
                                    {submissionResult.victory
                                        ? "Congratulations! You've completed all challenges! 🥳"
                                        : submissionResult.message ||
                                          "Excellent! That's correct! 👍"}
                                </Typography>
                                {!submissionResult.victory &&
                                    "Ready for the next level?"}
                            </Alert>
                        </Box>
                    )}
            </DialogContent>
            <DialogActions sx={{ p: "16px 24px" }}>
                {submissionResult?.correct ? (
                    <Button
                        onClick={handleDialogClose}
                        variant="contained"
                        color="primary"
                        startIcon={
                            submissionResult.victory ? (
                                <EmojiEvents />
                            ) : (
                                <NavigateNext />
                            )
                        }
                        disabled={currentLoading}
                    >
                        {submissionResult.victory
                            ? "View Victory Screen"
                            : "Next Level"}
                    </Button>
                ) : (
                    <>
                        <Button
                            onClick={handleDialogClose}
                            disabled={currentLoading}
                            color="inherit"
                        >
                            {submissionResult && !submissionResult.correct
                                ? "Close"
                                : "Cancel"}
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            disabled={currentLoading || !answer.trim()}
                        >
                            {isSubmitting ? "Submitting..." : "Submit Answer"}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default AnswerSubmissionDialog;
