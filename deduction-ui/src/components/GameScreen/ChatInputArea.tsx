// src/components/GameScreen/ChatInputArea.tsx
import React, { useState } from "react";
import {
    Paper,
    InputBase,
    IconButton,
    Box,
    CircularProgress,
} from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import ModelSelector from "./ModelSelector";
import { type ModelInfo } from "../../types";

interface ChatInputAreaProps {
    models: ModelInfo;
    selectedModel: string;
    onSelectedModelChange: (modelId: string) => void;
    onSendMessage: (message: string) => Promise<void>; // Model is already part of state
    isSending: boolean; // True while message is being sent and response is streaming
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
    models,
    selectedModel,
    onSelectedModelChange,
    onSendMessage,
    isSending,
}) => {
    const [userInput, setUserInput] = useState("");
    const controlsRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const [keyboardOffset, setKeyboardOffset] = useState(0);

    // Adjust for mobile keyboard using visualViewport API
    React.useEffect(() => {
        const handleViewport = () => {
            if (window.visualViewport) {
                // When keyboard is open, visualViewport.height shrinks
                const offset = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop;
                setKeyboardOffset(offset > 0 ? offset : 0);
            }
        };
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewport);
            window.visualViewport.addEventListener('scroll', handleViewport);
        }
        return () => { 
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewport);
                window.visualViewport.removeEventListener('scroll', handleViewport);
            }
        };
    }, []);

    // Optionally scroll input into view on focus (for iOS Safari)
    const handleInputFocus = () => {
        setTimeout(() => {
            controlsRef.current?.scrollIntoView({ block: 'end' });
        }, 100);
    };

    const handleSend = async () => {
        if (!userInput.trim()) return;
        await onSendMessage(userInput);
        setUserInput(""); // Clear input after sending
    };

    return (
        <Box
            ref={controlsRef}
            sx={{
                position: "fixed",
                zIndex: 99,
                width: "100%",
                transition: 'bottom 0.2s',
                bottom: keyboardOffset,
            }}
        >
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Paper sx={{
                    p: 1
                }}>
                    <ModelSelector
                        models={models}
                        selectedModel={selectedModel}
                        onChange={onSelectedModelChange}
                        disabled={isSending}
                    />
                </Paper>
            </Box>
            <Paper
                component="form"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                }}
                variant="outlined" // Subtle border
                sx={{
                    p: '0.3em',
                    border: 0,
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    backgroundColor: "background.paper", // Slightly different from page bg for definition
                }}
            >
                <InputBase
                    sx={{ ml: 1, flex: 1, alignSelf: "stretch" }}
                    placeholder="Chat with the AI..."
                    inputProps={{ "aria-label": "chat with ai" }}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    disabled={isSending}
                    multiline
                    minRows={1} // Start with single line
                    maxRows={5} // Allow expansion
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !isSending) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    inputRef={inputRef}
                    onFocus={handleInputFocus}
                />
                <IconButton
                    type="submit"
                    color="primary"
                    sx={{ p: "10px" }}
                    aria-label="send message"
                    disabled={isSending || !userInput.trim()}
                >
                    {isSending ? (
                        <CircularProgress size={24} color="inherit" />
                    ) : (
                        <SendIcon />
                    )}
                </IconButton>
            </Paper>
        </Box>
    );
};

export default ChatInputArea;
