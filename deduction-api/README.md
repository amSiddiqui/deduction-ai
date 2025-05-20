# Deduction Game - API

This is the FastAPI backend for the Deduction Game. It handles game session management, user progress, answer validation, and acts as a proxy for interacting with Anthropic's Claude language models.

## 🚀 Features

* **User Session Management**: Allows users to join, resume, or start new game sessions.
* **Progress Tracking**: Stores and updates user progress (current stage) using a DuckDB database.
* **Answer Submission & Validation**: Checks submitted answers against predefined correct answers for each puzzle stage.
* **Claude Model Proxy**: Securely proxies requests to Anthropic's Claude API for AI chat interactions within the game.
* **Model Listing**: Provides a list of available Claude models configured for the game.
* **Persistent Storage**: Uses DuckDB for lightweight, file-based storage of user game states and simple stats.

## 🛠️ Tech Stack

* **Python**: Programming language.
* **FastAPI**: Modern, fast (high-performance) web framework for building APIs with Python.
* **Pydantic**: Data validation and settings management using Python type annotations.
* **DuckDB**: In-process analytical data management system (used here for simple, file-based persistence).
* **uv**: An extremely fast Python package installer, resolver, and virtual environment manager, written in Rust.
* **Uvicorn**: ASGI server (run via `uv run` and likely configured in `pyproject.toml` scripts).
* **`pyproject.toml`**: For project metadata and dependency management.

## 🏁 Getting Started

Follow these instructions to set up and run the API backend locally using `uv`.

### Prerequisites

* Python (v3.8 or later recommended).
* **`uv`**: Installed. If you don't have `uv`, install it from the official astral.sh guide: [https://github.com/astral-sh/uv](https://github.com/astral-sh/uv)
* Access to Anthropic's Claude API and an API Key.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <api-directory-name>
    ```

2.  **Synchronize Environment and Dependencies:**
    Navigate to the root folder of the API and run:
    ```bash
    uv sync
    ```
    This command will:
    * Create a virtual environment (typically `.venv`) if it doesn't exist, based on your `pyproject.toml`.
    * Install all necessary dependencies specified in your `pyproject.toml` (and `uv.lock` if present) into this virtual environment.

### Environment Variables

The API requires certain environment variables to function correctly. Create a `.env` file in the root of the API project directory:

```env
# .env

# Path for the DuckDB database file
DED_DB_FILE=./deduction_game.duckdb

# Your Anthropic API Key (REQUIRED for Claude model interaction)
ANTHROPIC_API_KEY=

# Optional: Configure specific Claude model IDs if different from defaults in config.py
# CLAUDE_35_MODEL_ID="claude-3-haiku-20240307"
# CLAUDE_37_MODEL_ID="claude-3-sonnet-20240229"
````

  * Populate `ANTHROPIC_API_KEY` with your actual Anthropic API key.
  * `DED_DB_FILE` specifies where the DuckDB database file will be stored. The application will create this file and its schema if it doesn't exist (via `db.py`).

### Database Setup & Initial Data

1.  **Schema Initialization**: The DuckDB database schema is initialized automatically when the application starts (defined in `db.py`). The database file will be created at the path specified by `DED_DB_FILE`.

2.  **Import Questions**: To populate the questions table, run the provided import script (assuming you have `script/import_questions.py` and `questions.json`):

    ```bash
    uv run python -m script.import_questions questions.json
    ```

    `uv run` executes the command within the `uv`-managed virtual environment.

### Running the Development Server

To start the FastAPI development server, use the script defined for `uv run`:

```bash
uv run fastapi dev
```

## 📁 Project Structure (Key Files/Directories)

```
.
├── .venv/                  # Virtual environment managed by uv (usually gitignored)
├── script/
│   └── import_questions.py   # Script to import questions into the DB
├── services/
│   ├── __init__.py
│   ├── session.py            # Core game session logic
│   ├── question_bank.py      # Logic for fetching questions
│   ├── answer_checker.py     # Logic for checking answers
│   └── llm_client.py         # Client for interacting with Anthropic API
├── config.py                 # Application settings and logger configuration
├── db.py                     # DuckDB database setup, schema, and CRUD helpers
├── main.py                   # FastAPI application entry point, routes, and Pydantic models
├── .env                      # Environment variables (API keys, DB path)
├── questions.json            # JSON file containing questions data (assumed)
├── pyproject.toml            # Project metadata, dependencies, and uv scripts
├── uv.lock                   # Lock file for reproducible dependencies (generated by uv)
└── README.md                 # This file
```

## 📡 API Endpoints

A brief overview of the main API endpoints:

  * **`POST /join`**: Allows a user to join or resume a game.
      * Request Body: `{ "name": "string", "start_new": "boolean (optional)" }`
      * Response: User details and current question.
  * **`POST /attempt`**: Submits an answer for the user's current stage.
      * Request Body: `{ "user_id": "uuid", "answer": "string" }`
      * Response: Correctness of the answer, victory status, next question, and a message.
  * **`POST /model-run`**: Proxies a chat completion request to the configured Claude model.
      * Request Body: `{ "model": "string", "messages": [{"role": "string", "content": "string"}] }`
      * Response: Streaming NDJSON response from the language model.
  * **`GET /models`**: Lists the available Claude models configured for the game.
      * Response: `{ "default": "string", "options": [{"Model Name": "string", "Display Name": "string", "Thinking Mode?": "boolean"}] }`

