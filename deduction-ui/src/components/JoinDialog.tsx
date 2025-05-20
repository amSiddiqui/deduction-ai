// src/components/JoinDialog.tsx
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
} from "@mui/material";
import { PersonAdd } from "@mui/icons-material";

interface JoinDialogProps {
    open: boolean;
    onClose: () => void; // Retained for consistency, though dialog closure is mainly programmatic
    onJoin: (name: string) => void; // App.tsx handles the async nature of joining
    loading: boolean;
    initialName?: string;
}

const JoinDialog: React.FC<JoinDialogProps> = ({
    open,
    onClose,
    onJoin,
    loading,
    initialName,
}) => {
    const [name, setName] = useState<string>("");
    const [inputError, setInputError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setName(initialName || "");
            setInputError(null);
        }
    }, [open, initialName]);

    const handleSubmit = () => {
        // Not async, just calls the onJoin callback
        if (!name.trim()) {
            setInputError("Please enter your name to join.");
            return;
        }
        if (name.length > 30) {
            setInputError("Name cannot exceed 30 characters.");
            return;
        }
        setInputError(null);
        onJoin(name.trim()); // App.tsx's onJoin wrapper will call the async handleJoinGame
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            disableEscapeKeyDown
            PaperProps={{
                component: "form",
                onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    handleSubmit();
                },
                sx: {
                    width: "100%",
                    maxWidth: "400px",
                    margin: 2,
                    borderRadius: 2, // Consistent with theme
                },
            }}
        >
            <DialogTitle sx={{ textAlign: "center", pt: 3 }}>
                <PersonAdd
                    sx={{ fontSize: 40, mb: 1, color: "primary.main" }}
                />
                <Typography variant="h5" component="div">
                    Join Deduction Challenge
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                    sx={{ mb: 2 }}
                >
                    Enter your name to begin or resume.
                </Typography>
                <TextField
                    autoFocus
                    margin="dense"
                    id="name"
                    label="Your Name"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        if (inputError) setInputError(null);
                    }}
                    disabled={loading}
                    required
                    inputProps={{ maxLength: 30 }}
                    error={!!inputError}
                    helperText={inputError}
                />
            </DialogContent>
            <DialogActions sx={{ p: "0 24px 24px" }}>
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={loading || !name.trim()}
                    startIcon={
                        loading ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : null
                    }
                    sx={{ py: 1.2, fontWeight: "medium" }}
                >
                    {loading ? "Joining..." : "Join Game"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default JoinDialog;
