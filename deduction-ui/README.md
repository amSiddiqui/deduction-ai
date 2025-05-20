# Deduction Game - User Interface

This is the frontend for the Deduction Game, an AI-powered chat application where participants solve interesting puzzles by interacting with Anthropic's Claude language models.

## 🚀 Features

* **Join Game**: Users can join a new game or resume an existing session by providing a name.
* **Puzzle Interaction**: Engage with puzzles presented by the game.
* **AI Chat**: Leverage Claude language models to get hints or discuss puzzle strategies.
* **Model Selection**: Choose between different available Claude models for interaction.
* **Answer Submission**: Submit answers to puzzles.
* **Progress Tracking**: The game tracks the user's current stage.
* **Victory Screen**: A celebratory screen upon completing all puzzles.
* **Play Again**: Option to start a completely new game session.
* **Responsive Design**: Built with Material-UI for a consistent experience across devices.

## 🛠️ Tech Stack

* **React**: JavaScript library for building user interfaces.
* **TypeScript**: Superset of JavaScript for static type checking.
* **Material-UI (MUI)**: React UI component library for faster and easier web development.
* **Vite**: Frontend build tool for fast development and optimized builds.

## 🏁 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

* Node.js (v18.x or later recommended)
* npm (v9.x or later) or yarn (v1.22.x or later)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <ui-directory-name>
    ```

2.  **Install dependencies:**
    Using npm:
    ```bash
    npm install
    ```
    Or using yarn:
    ```bash
    yarn install
    ```

### Environment Variables

The UI needs to know the base URL of the backend API. Create a `.env` file in the root of the UI project directory and add the following variable:

```env
VITE_API_BASE_URL=http://localhost:8000
````

Replace `http://localhost:8000` with the actual URL where your FastAPI backend is running if it's different.

### Running the Development Server

To start the development server:

Using npm:

```bash
npm run dev
```

Or using yarn:

```bash
yarn dev
```

This will typically start the application on `http://localhost:5173` (or another port if 5173 is busy). Open this URL in your browser to see the application.

## 📁 Project Structure (Key Files/Directories)

```
.
├── public/                     # Static assets
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── GameScreen/         # Components specific to the game interaction view
│   │   ├── AnswerSubmissionDialog.tsx
│   │   ├── JoinDialog.tsx
│   │   └── VictoryScreen.tsx
│   ├── App.tsx                 # Main application component, routing, and state management
│   ├── MainLayout.tsx          # Main layout structure after joining
│   ├── types.ts                # TypeScript type definitions
│   └── main.tsx                # Entry point of the React application
├── .env                        # Environment variables (API URL)
├── index.html                  # Main HTML file
├── package.json                # Project dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite configuration
```

## 📜 Available Scripts

In the project directory, you can run:

  * `npm run dev` or `yarn dev`: Runs the app in development mode.
  * `npm run build` or `yarn build`: Builds the app for production to the `dist` folder.
  * `npm run lint` or `yarn lint`: Lints the codebase using ESLint (if configured).
  * `npm run preview` or `yarn preview`: Serves the production build locally for preview.
