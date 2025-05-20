// src/App.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
    ThemeProvider,
    createTheme,
    CssBaseline,
    Box,
    CircularProgress,
    Alert,
    Snackbar,
    Button,
    Typography,
} from "@mui/material";

import {
    type User,
    type Question,
    type ModelInfo,
    type GameView,
    type JoinResponse,
    type AttemptResponse,
    MAX_STAGES,
    API_BASE_URL,
} from "./types";

import JoinDialog from "./components/JoinDialog";
import MainLayout from "./MainLayout"; // Assuming MainLayout.tsx exists

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#64b5f6" },
        secondary: { main: "#f06292" },
        background: { default: "#121212", paper: "#1E1E1E" },
        text: { primary: "#E0E0E0", secondary: "#BDBDBD" },
        divider: "rgba(255, 255, 255, 0.12)",
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    shape: { borderRadius: 8 },
    components: {
        MuiPaper: { defaultProps: { elevation: 0 } },
        MuiButton: {
            styleOverrides: {
                root: { textTransform: "none", fontWeight: "medium" },
            },
        },
        MuiDialog: { styleOverrides: { paper: { borderRadius: 12 } } },
    },
});

const STREAM_CHUNK_DELIMITER = "\u001E";
const LOCAL_STORAGE_USER_NAME_KEY = "deductionGameUserName";

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(
        null
    );
    const [models, setModels] = useState<ModelInfo | null>(null);
    const [currentView, setCurrentView] = useState<GameView>("loading");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isAttemptingAutoJoin, setIsAttemptingAutoJoin] =
        useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState<boolean>(false);
    const [actionLoading, setActionLoading] = useState<boolean>(false); // For JoinDialog submit
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>("");
    const [persistedUserName, setPersistedUserName] = useState<string | null>(
        null
    );
    const [isNewGameMode, setIsNewGameMode] = useState<boolean>(false);

    // Renamed to clarify its purpose based on new requirements
    const handleShowErrorSnackbar = useCallback((message: string) => {
        setSnackbarMessage(message);
        setSnackbarOpen(true);
    }, []);

    const handleCloseSnackbar = () => {
        setSnackbarOpen(false);
        setSnackbarMessage("");
    };

    const handleJoinGame = useCallback(
        async (
            name: string,
            options?: { startNew?: boolean; isAutoAttempt?: boolean }
        ): Promise<boolean> => {
            if (!name.trim()) {
                // if (!options?.isAutoAttempt) {
                //     handleShowErrorSnackbar("Please enter a name."); // No longer showing snackbar for this validation
                // }
                // Instead, you might want to set an error state for the dialog itself or handle validation differently
                if (!options?.isAutoAttempt) {
                    setError("Please enter a name."); // Set an error state that JoinDialog can potentially use
                }
                return false;
            }

            if (!options?.isAutoAttempt) setActionLoading(true);
            setError(null);
            const startNewSession = options?.startNew || isNewGameMode;

            try {
                const response = await fetch(`${API_BASE_URL}/join`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: name.trim(),
                        start_new: startNewSession,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({
                        detail: "Failed to join. Please try again.",
                    }));
                    throw new Error(
                        errorData.detail ||
                            `HTTP error! status: ${response.status}`
                    );
                }

                const data: JoinResponse = await response.json();
                setCurrentUser(data.user);
                setCurrentQuestion(data.question);
                localStorage.setItem(
                    LOCAL_STORAGE_USER_NAME_KEY,
                    data.user.name
                );
                setPersistedUserName(data.user.name);

                if (data.user.current_stage > MAX_STAGES)
                    setCurrentView("victory");
                else if (data.question) setCurrentView("playing");
                else setCurrentView("victory");

                setIsJoinDialogOpen(false);
                setIsNewGameMode(false);
                return true;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : String(err);
                setError(errorMessage);
                if (options?.isAutoAttempt) {
                    localStorage.removeItem(LOCAL_STORAGE_USER_NAME_KEY);
                    setPersistedUserName(null);
                } else {
                    handleShowErrorSnackbar(`Failed to join: ${errorMessage}`);
                }
                return false;
            } finally {
                if (!options?.isAutoAttempt) setActionLoading(false);
            }
        },
        [isNewGameMode, handleShowErrorSnackbar] // Updated dependency
    );

    useEffect(() => {
        const initializeApp = async () => {
            setIsLoading(true);
            setIsAttemptingAutoJoin(false);
            setError(null);
            setCurrentUser(null);
            setModels(null);
            setCurrentView("loading");

            try {
                const modelsResponse = await fetch(`${API_BASE_URL}/models`);
                if (!modelsResponse.ok) {
                    const errorData = await modelsResponse.json().catch(() => ({
                        detail: "Failed to load game configuration.",
                    }));
                    throw new Error(
                        errorData.detail || "Network error loading models."
                    );
                }
                const modelsData: ModelInfo = await modelsResponse.json();
                setModels(modelsData);

                const savedName = localStorage.getItem(
                    LOCAL_STORAGE_USER_NAME_KEY
                );
                if (savedName && modelsData) {
                    setPersistedUserName(savedName);
                    setIsAttemptingAutoJoin(true);
                    setCurrentView("attemptingAutoJoin");

                    const autoJoinSuccess = await handleJoinGame(savedName, {
                        startNew: false,
                        isAutoAttempt: true,
                    });
                    if (!autoJoinSuccess) {
                        // Removed snackbar, user will be taken to join dialog
                        // handleShowErrorSnackbar("Could not resume session. Please join.");
                        setCurrentView("joining");
                        setIsJoinDialogOpen(true);
                    }
                } else if (modelsData) {
                    setCurrentView("joining");
                    setIsJoinDialogOpen(true);
                }
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : String(err);
                setError(errorMessage);
                setCurrentView("error");
                handleShowErrorSnackbar(`App Error: ${errorMessage}`); // Use error snackbar
            } finally {
                setIsLoading(false);
                setIsAttemptingAutoJoin(false);
            }
        };
        initializeApp();
    }, [handleJoinGame, handleShowErrorSnackbar]); // Updated dependency

    const handleSubmitAttempt = useCallback(
        async (answer: string): Promise<AttemptResponse> => {
            if (!currentUser || !currentQuestion) {
                const errorMsg =
                    "User or question not available for submission.";
                setError(errorMsg);
                handleShowErrorSnackbar(`Error: ${errorMsg}`); // Use error snackbar
                throw new Error(errorMsg);
            }
            setActionLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/attempt`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: currentUser.id, answer }),
                });
                if (!response.ok) {
                    const errorData = await response
                        .json()
                        .catch(() => ({ detail: "Submission failed." }));
                    throw new Error(
                        errorData.detail ||
                            `HTTP error! status: ${response.status}`
                    );
                }
                const data: AttemptResponse = await response.json();

                if (data.correct) {
                    setCurrentUser((prevUser) =>
                        prevUser
                            ? {
                                  ...prevUser,
                                  current_stage: prevUser.current_stage + 1,
                              }
                            : null
                    );
                    if (data.victory) {
                        setCurrentView("victory");
                        setCurrentQuestion(null);
                    } else {
                        setCurrentQuestion(data.question);
                        setCurrentView("playing");
                    }
                } else {
                    if (data.question) setCurrentQuestion(data.question);
                    if (data.message && !data.correct) {
                        console.log("Attempt feedback:", data.message);
                    }
                }
                return data;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : String(err);
                setError(errorMessage);
                handleShowErrorSnackbar(
                    `Error submitting answer: ${errorMessage}`
                ); // Use error snackbar
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [currentUser, currentQuestion, handleShowErrorSnackbar] // Updated dependency
    );

    const handleModelRun = useCallback(
        async (
            model: string,
            messages: { role: string; content: string }[]
        ): Promise<AsyncIterable<Record<string, unknown>>> => {
            setError(null);
            if (!currentUser) {
                const msg = "User not available for model run.";
                setError(msg);
                handleShowErrorSnackbar(`Error: ${msg}`); // Use error snackbar
                return (async function* () {
                    yield { type: "error", error: { message: msg } } as Record<
                        string,
                        unknown
                    >;
                })();
            }
            try {
                const response = await fetch(`${API_BASE_URL}/model-run`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model,
                        messages,
                        user_id: currentUser.id,
                    }),
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    const errorDetail =
                        JSON.parse(errorText)?.detail ||
                        errorText ||
                        `HTTP error! status: ${response.status}`;
                    throw new Error(errorDetail);
                }
                if (!response.body) throw new Error("Response body is null");
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                return (async function* () {
                    let buffer = "";
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) {
                                if (buffer.trim())
                                    yield JSON.parse(buffer.trim()) as Record<
                                        string,
                                        unknown
                                    >;
                                break;
                            }
                            buffer += decoder.decode(value, { stream: true });
                            const parts = buffer.split(STREAM_CHUNK_DELIMITER);
                            buffer = parts.pop() || "";
                            for (const part of parts) {
                                if (part.trim())
                                    yield JSON.parse(part.trim()) as Record<
                                        string,
                                        unknown
                                    >;
                            }
                        }
                    } finally {
                        reader.releaseLock();
                    }
                })();
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : String(err);
                setError(errorMessage);
                handleShowErrorSnackbar(`AI Chat Error: ${errorMessage}`); // Use error snackbar
                return (async function* () {
                    yield {
                        type: "error",
                        error: { message: errorMessage },
                    } as Record<string, unknown>;
                })();
            }
        },
        [currentUser, handleShowErrorSnackbar]
    );

    const handlePlayAgain = () => {
        setCurrentUser(null);
        setCurrentQuestion(null);
        setError(null);
        setIsNewGameMode(true);
        setCurrentView("joining");
        setIsJoinDialogOpen(true);
        localStorage.removeItem(LOCAL_STORAGE_USER_NAME_KEY);
    };

    const renderInitialLoadOrError = () => {
        if (
            currentView === "attemptingAutoJoin" ||
            (isLoading && isAttemptingAutoJoin)
        ) {
            return (
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    minHeight="100vh"
                >
                    <CircularProgress />{" "}
                    <Typography sx={{ ml: 2 }}>
                        Resuming your game...
                    </Typography>
                </Box>
            );
        }
        if (isLoading && currentView === "loading") {
            return (
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    minHeight="100vh"
                >
                    <CircularProgress />{" "}
                    <Typography sx={{ ml: 2 }}>Loading Game Data...</Typography>
                </Box>
            );
        }
        if (currentView === "error" && error) {
            return (
                <Box
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                    minHeight="100vh"
                    p={3}
                >
                    <Alert severity="error" sx={{ mb: 2 }}>
                        App Error: {error}{" "}
                        {/* This alert remains for critical app-breaking errors */}
                    </Alert>
                    <Button
                        variant="contained"
                        onClick={() => window.location.reload()}
                    >
                        Try Refreshing
                    </Button>
                </Box>
            );
        }
        return null;
    };

    const initialScreenOrError = renderInitialLoadOrError();
    if (initialScreenOrError) {
        return (
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {initialScreenOrError}
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={6000}
                    onClose={handleCloseSnackbar}
                    message={snackbarMessage}
                    anchorOrigin={{ vertical: "top", horizontal: "left" }} // Moved to top-left
                />
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {isJoinDialogOpen && currentView === "joining" && models && (
                <JoinDialog
                    open={isJoinDialogOpen}
                    onJoin={async (nameFromDialog) => {
                        await handleJoinGame(nameFromDialog, {
                            startNew: isNewGameMode,
                        });
                    }}
                    loading={actionLoading}
                    initialName={persistedUserName || ""}
                    onClose={() => {}}

                />
            )}

            {!isJoinDialogOpen &&
                currentUser &&
                models &&
                currentView !== "loading" &&
                currentView !== "attemptingAutoJoin" && (
                    <MainLayout
                        user={currentUser}
                        currentQuestion={currentQuestion}
                        models={models}
                        currentView={currentView}
                        onAttempt={handleSubmitAttempt}
                        onModelRun={handleModelRun}
                        onPlayAgain={handlePlayAgain}
                        isLoading={actionLoading}
                        maxStages={MAX_STAGES}
                    />
                )}
            {!isLoading &&
                !currentUser &&
                !isJoinDialogOpen &&
                currentView !== "error" &&
                currentView !== "attemptingAutoJoin" && (
                    <Box
                        display="flex"
                        flexDirection="column"
                        justifyContent="center"
                        alignItems="center"
                        minHeight="100vh"
                        p={3}
                    >
                        <Typography variant="h6" gutterBottom>
                            Welcome to Deduction!
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => {
                                setError(null); // Clear previous errors before opening join dialog
                                setCurrentView("joining");
                                setIsJoinDialogOpen(true);
                            }}
                        >
                            Join Game
                        </Button>
                    </Box>
                )}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                message={snackbarMessage}
                anchorOrigin={{ vertical: "top", horizontal: "left" }} // Moved to top-left
            />
        </ThemeProvider>
    );
};
export default App;
