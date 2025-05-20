// src/components/GameScreen/ChatHistory.tsx
import React, { useRef, useEffect } from "react";
import {
    Box,
    Paper,
    Typography,
    CircularProgress,
    Avatar,
} from "@mui/material";
import { type ChatMessage } from "../../types";
import {
    Person as UserIcon,
    SmartToy as AssistantIcon,
    Psychology as ThinkingIcon,
} from "@mui/icons-material";

interface ChatHistoryProps {
    messages: ChatMessage[];
    isModelStreaming: boolean;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
    messages,
    isModelStreaming,
}) => {
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
        }
    }, [messages, isModelStreaming]);

    const getAvatar = (role: ChatMessage["role"]) => {
        if (role === "user")
            return (
                <Avatar sx={{ bgcolor: "primary.main", width: 30, height: 30 }}>
                    <UserIcon fontSize="small" />
                </Avatar>
            );
        if (role === "assistant")
            return (
                <Avatar
                    sx={{ bgcolor: "secondary.main", width: 30, height: 30 }}
                >
                    <AssistantIcon fontSize="small" />
                </Avatar>
            );
        if (role === "thinking")
            return (
                <Avatar sx={{ bgcolor: "info.main", width: 30, height: 30 }}>
                    <ThinkingIcon fontSize="small" />
                </Avatar>
            );
        return null;
    };

    return (
        <Box
            ref={chatContainerRef}
            sx={{
                flexGrow: 1,
                overflowY: "auto",
                p: 2,
                mb: 2,
                // Removed border and explicit background, for a flatter look within GameScreen
                // border: '1px solid',
                // borderColor: 'divider',
                // borderRadius: 1,
                // backgroundColor: 'action.hover',
                minHeight: "250px", // Ensure a good minimum height
            }}
        >
            {messages.map((msg, index) => (
                <Box
                    key={msg.id || index} // Use index as fallback key if id is somehow missing
                    sx={{
                        mb: 2,
                        display: "flex",
                        flexDirection:
                            msg.role === "user" ? "row-reverse" : "row",
                        alignItems: "flex-start", // Align avatar with top of message bubble
                        gap: 1,
                    }}
                >
                    {getAvatar(msg.role)}
                    <Paper
                        elevation={0} // Flat paper
                        variant={
                            msg.role === "thinking" ? "outlined" : "elevation"
                        }
                        sx={{
                            p: 1.5,
                            borderRadius:
                                msg.role === "user"
                                    ? "12px 12px 0 12px"
                                    : "12px 12px 12px 0",
                            backgroundColor:
                                msg.role === "user"
                                    ? "primary.light" // Keep user messages distinct
                                    : msg.role === "thinking"
                                    ? "rgba(255, 255, 255, 0.05)" // Very subtle for thinking
                                    : "background.paper", // Assistant messages blend with paper bg
                            color:
                                msg.role === "user"
                                    ? "primary.contrastText"
                                    : "text.primary",
                            maxWidth: "80%",
                            wordBreak: "break-word",
                            border:
                                msg.role === "thinking" ? "1px dashed" : "none",
                            borderColor:
                                msg.role === "thinking"
                                    ? "info.main"
                                    : "transparent",
                        }}
                    >
                        {msg.role === "thinking" && (
                            <Typography
                                variant="caption"
                                display="block"
                                sx={{
                                    fontStyle: "italic",
                                    mb: 0.5,
                                    display: "flex",
                                    alignItems: "center",
                                    color: "info.light",
                                }}
                            >
                                <ThinkingIcon
                                    fontSize="inherit"
                                    sx={{
                                        mr: 0.5
                                    }}
                                />
                                Thinking...
                            </Typography>
                        )}
                        <Typography
                            variant="body2"
                            sx={{ whiteSpace: "pre-wrap" }}
                        >
                            {msg.content}
                        </Typography>
                    </Paper>
                </Box>
            ))}
            {isModelStreaming &&
                messages[messages.length - 1]?.role === "user" && ( // Show general loading if last msg was user
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "flex-start",
                            alignItems: "flex-start",
                            gap: 1,
                            mb: 2,
                        }}
                    >
                        <Avatar
                            sx={{
                                bgcolor: "secondary.main",
                                width: 30,
                                height: 30,
                            }}
                        >
                            <AssistantIcon fontSize="small" />
                        </Avatar>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.5,
                                borderRadius: "12px 12px 12px 0",
                                backgroundColor: "background.paper",
                                color: "text.primary",
                                display: "inline-flex",
                                alignItems: "center",
                            }}
                        >
                            <CircularProgress size={20} color="inherit" />
                            <Typography
                                variant="body2"
                                sx={{ ml: 1, fontStyle: "italic" }}
                            >
                                Assistant is typing...
                            </Typography>
                        </Paper>
                    </Box>
                )}
        </Box>
    );
};

export default ChatHistory;
