// src/components/VictoryScreen.tsx
import React from "react";
import { Typography, Button, Paper, Container } from "@mui/material";
import { EmojiEvents, Replay } from "@mui/icons-material"; // Re-using existing icons

interface VictoryScreenProps {
    userName: string;
    onPlayAgain: () => void;
}

const VictoryScreen: React.FC<VictoryScreenProps> = ({
    userName,
    onPlayAgain,
}) => {
    return (
        <Container maxWidth="sm" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
            <Paper
                elevation={0} // Flat design
                variant="outlined" // Subtle border instead of shadow
                sx={{
                    p: { xs: 3, sm: 4 },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    backgroundColor: "background.paper", // Use theme's paper color
                    borderColor: "divider", // Use theme's divider color for border
                }}
            >
                <EmojiEvents
                    sx={{
                        fontSize: { xs: 70, sm: 90 }, // Responsive icon size
                        mb: 2,
                        color: "secondary.main", // Keep the celebratory color
                    }}
                />
                <Typography
                    variant="h4" // Adjusted for better hierarchy within a possibly smaller screen
                    component="h1"
                    gutterBottom
                    sx={{ fontWeight: "bold", color: "text.primary" }}
                >
                    Congratulations, {userName}!
                </Typography>
                <Typography
                    variant="h6"
                    component="p"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                >
                    You've mastered all the deduction challenges!
                </Typography>
                <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 4 }}
                >
                    Your reasoning skills are truly impressive. Well done!
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={onPlayAgain}
                    startIcon={<Replay />}
                    sx={{
                        py: 1.5,
                        px: { xs: 3, sm: 4 }, // Responsive padding
                        fontSize: { xs: "1rem", sm: "1.1rem" }, // Responsive font size
                    }}
                >
                    Play Again
                </Button>
            </Paper>
        </Container>
    );
};

export default VictoryScreen;
