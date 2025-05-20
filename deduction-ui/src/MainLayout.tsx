// src/MainLayout.tsx
import React from "react";
import {
    AppBar,
    Toolbar,
    Typography,
    Container,
    Box,
    CircularProgress,
    Alert,
    Button,
} from "@mui/material";
import {
    type User,
    type Question,
    type ModelInfo,
    type GameView,
    type AttemptResponse,
} from "./types"; // Assuming types.ts is in src/

// GameScreen and VictoryScreen are imported
import GameScreen from "./components/GameScreen";
import VictoryScreen from "./components/VictoryScreen";

interface MainLayoutProps {
    user: User;
    currentQuestion: Question | null;
    models: ModelInfo;
    currentView: GameView; // 'playing', 'victory', 'loading', 'error' (within main app context)
    onAttempt: (answer: string) => Promise<AttemptResponse>;
    onModelRun: (
        model: string,
        messages: { role: string; content: string }[]
    ) => Promise<AsyncIterable<string | Record<string, unknown>>>;
    onPlayAgain: () => void;
    isLoading: boolean; // General loading for actions like submitting final answers
    maxStages: number;
}

const MainLayout: React.FC<MainLayoutProps> = ({
    user,
    currentQuestion,
    models,
    currentView,
    onAttempt,
    onModelRun,
    onPlayAgain,
    isLoading,
    maxStages,
}) => {
    const renderCurrentView = () => {
        switch (currentView) {
            case "playing":
                if (!currentQuestion) {
                    return (
                        <Box
                            display="flex"
                            flexDirection="column"
                            justifyContent="center"
                            alignItems="center"
                            sx={{ p: 3, flexGrow: 1 }}
                        >
                            <CircularProgress sx={{ mb: 2 }} />
                            <Typography color="text.secondary">
                                Loading next challenge...
                            </Typography>
                        </Box>
                    );
                }
                return (
                    <GameScreen
                        user={user}
                        question={currentQuestion}
                        models={models}
                        onAttempt={onAttempt}
                        onModelRun={onModelRun}
                        isLoading={isLoading}
                        currentLevel={user.current_stage}
                        maxLevel={maxStages}
                    />
                );
            case "victory":
                return (
                    <VictoryScreen
                        userName={user.name}
                        onPlayAgain={onPlayAgain}
                    />
                );
            case "loading": // A general loading state if MainLayout is rendered while something big is happening
                return (
                    <Box
                        display="flex"
                        flexDirection="column"
                        justifyContent="center"
                        alignItems="center"
                        sx={{ p: 3, height: "100%" }}
                    >
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography color="text.secondary">
                            Loading Game...
                        </Typography>
                    </Box>
                );
            case "error": // Fallback error display within main layout
                return (
                    <Container
                        maxWidth="sm"
                        sx={{
                            textAlign: "center",
                            py: 4,
                            flexGrow: 1,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                        }}
                    >
                        <Alert severity="error" sx={{ mb: 2 }}>
                            An unexpected error occurred. Please try again.
                        </Alert>
                        <Button variant="contained" onClick={onPlayAgain}>
                            Start Over
                        </Button>
                    </Container>
                );
            default:
                // 'joining' view is handled by JoinDialog in App.tsx before MainLayout is shown.
                console.warn(
                    "MainLayout rendered with unexpected view:",
                    currentView
                );
                return (
                    <Typography
                        sx={{
                            p: 3,
                            textAlign: "center",
                            color: "text.secondary",
                        }}
                    >
                        Preparing your game... If this persists, please try
                        refreshing.
                    </Typography>
                );
        }
    };

    return (
        <Box 
            sx={{
                display: "flex",
                flexDirection: "column",
                bgcolor: "background.default",
                overflow: "hidden", // Prevent the whole page from scrolling
            }}
        >
            <AppBar
                position="static" // Changed from sticky for this fixed layout
                elevation={0}
                sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    flexShrink: 0 /* AppBar does not grow/shrink */,
                }}
            >
                <Toolbar>
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{ flexGrow: 1 }}
                    >
                        Deduction AI
                    </Typography>
                    <Box sx={{ textAlign: "right" }}>
                        <Typography variant="body2">{user.name}</Typography>
                        <Typography variant="caption">
                            Level:{" "}
                            {user.current_stage > maxStages
                                ? maxStages
                                : user.current_stage}{" "}
                            / {maxStages}
                        </Typography>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* This Box will contain the GameScreen or VictoryScreen and allow it to grow */}
            <Box
                component="main"
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                {renderCurrentView()}
            </Box>
        </Box>
    );
};


export default MainLayout;
