// src/components/GameScreen.tsx
import React, { useState, useEffect } from "react";
import { Box, Alert } from "@mui/material";
import {
    type User,
    type Question,
    type ModelInfo,
    type ChatMessage,
    type AttemptResponse,
} from "../types";

import QuestionDisplay from "./GameScreen/QuestionDisplay";
import ChatHistory from "./GameScreen/ChatHistory";
import ChatInputArea from "./GameScreen/ChatInputArea";
import AnswerSubmissionDialog from "./AnswerSubmissionDialog";

interface GameScreenProps {
    user: User;
    question: Question | null;
    models: ModelInfo;
    onAttempt: (answer: string) => Promise<AttemptResponse>;
    onModelRun: (
        model: string,
        messages: { role: string; content: string }[]
    ) => Promise<AsyncIterable<string | Record<string, unknown>>>;
    isLoading: boolean; // For final answer submission loading state (actionLoading from App.tsx)
    currentLevel: number;
    maxLevel: number;
}

const GameScreen: React.FC<GameScreenProps> = ({
    question, // This is the currently active question from App.tsx
    models,
    onAttempt, // This is App.tsx's handleSubmitAttempt
    onModelRun,
    isLoading: parentLoading, // This is actionLoading from App.tsx
    // ... other props
}) => {
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>(
        models.default || models.options[0].name
    );
    const [isModelStreaming, setIsModelStreaming] = useState<boolean>(false);
    const [isAnswerDialogOpen, setIsAnswerDialogOpen] =
        useState<boolean>(false);
    // State to hold the specific question for which the dialog is opened
    const [questionForDialog, setQuestionForDialog] = useState<Question | null>(
        null
    );

    useEffect(() => {
        // This effect runs when the main 'question' prop from App.tsx changes
        if (question) {
            setChatMessages([]); // Reset chat for new question - This is good.
        }
    }, [question]);

    useEffect(() => {
        if (models && models.default && !selectedModel) {
            setSelectedModel(models.default);
        }
        setChatMessages([]);
    }, [models, selectedModel]);

    const handleOpenSubmitDialog = () => {
        if (question) {
            // Ensure there's a current question to open the dialog for
            setQuestionForDialog(question); // Capture the current question for the dialog
            setIsAnswerDialogOpen(true);
        }
    };

    const handleCloseSubmitDialog = () => {
        setIsAnswerDialogOpen(false);
        // Optionally, clear questionForDialog, though it will be overwritten on next open
        // setQuestionForDialog(null);
    };

    const handleCopyToClipboard = async () => {
        // Use `question` (the current active question) for copy, not necessarily questionForDialog
        if (question?.prompt) {
            try {
                await navigator.clipboard.writeText(question.prompt);
            } catch (err) {
                console.error("Failed to copy question:", err);
            }
        }
    };

    const handleSendMessageToModel = async (userInput: string) => {
        if (!userInput.trim()) return;

        const newUserMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: userInput,
        };
        const messagesForApi = [...chatMessages, newUserMessage]
            .filter((msg) => msg.role === "user" || msg.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content }));

        setChatMessages((prev) => [...prev, newUserMessage]);
        setIsModelStreaming(true);
        const assistantResponseId = `assistant-${Date.now()}`;
        let currentAssistantMessage = "";
        let thinkingMessageId: string | null = null;

        try {
            const stream = await onModelRun(selectedModel, messagesForApi);
            for await (const chunk of stream) {
                if (typeof chunk === "object" && chunk !== null) {
                    const typedChunk = chunk as Record<string, unknown>;
                    if (typedChunk.type === "thinking") {
                        const thinkingContent = (typedChunk.delta ||
                            "") as string;
                        if (!thinkingMessageId) {
                            thinkingMessageId = `thinking-${Date.now()}`;
                            setChatMessages((prev) => [
                                ...prev,
                                {
                                    id: thinkingMessageId!,
                                    role: "thinking",
                                    content: thinkingContent,
                                    isThinking: true,
                                },
                            ]);
                        } else {
                            setChatMessages((prev) =>
                                prev.map((m) =>
                                    m.id === thinkingMessageId
                                        ? {
                                              ...m,
                                              content:
                                                  m.content + thinkingContent,
                                              isThinking: true,
                                          }
                                        : m
                                )
                            );
                        }
                    } else if (typedChunk.type === "text") {
                        const contentPart = (typedChunk.delta || "") as string;
                        currentAssistantMessage += contentPart;
                        if (thinkingMessageId) {
                            setChatMessages((prev) =>
                                prev.map((m) =>
                                    m.id === thinkingMessageId
                                        ? { ...m, isThinking: false }
                                        : m
                                )
                            );
                            thinkingMessageId = null;
                        }
                        setChatMessages((prev) => {
                            const lastMsg = prev[prev.length - 1];
                            if (
                                lastMsg?.id === assistantResponseId &&
                                lastMsg.role === "assistant"
                            ) {
                                return prev.map((m) =>
                                    m.id === assistantResponseId
                                        ? {
                                              ...m,
                                              content: currentAssistantMessage,
                                          }
                                        : m
                                );
                            } else {
                                const messagesWithoutThinking = prev.filter(
                                    (m) => m.id !== thinkingMessageId
                                );
                                return [
                                    ...messagesWithoutThinking,
                                    {
                                        id: assistantResponseId,
                                        role: "assistant",
                                        content: currentAssistantMessage,
                                    },
                                ];
                            }
                        });
                    } else if (typedChunk.type === "error") {
                        console.error(
                            "Error from AI stream:",
                            typedChunk.error || typedChunk.delta
                        );
                        setChatMessages((prev) => [
                            ...prev,
                            {
                                id: `error-${Date.now()}`,
                                role: "assistant",
                                content: `Error from AI: ${
                                    typedChunk.error || typedChunk.delta
                                }`,
                            },
                        ]);
                        if (thinkingMessageId) {
                            setChatMessages((prev) =>
                                prev.map((m) =>
                                    m.id === thinkingMessageId
                                        ? { ...m, isThinking: false }
                                        : m
                                )
                            );
                            thinkingMessageId = null;
                        }
                        break;
                    }
                } else {
                    console.warn(
                        "Received non-object chunk from stream:",
                        chunk
                    );
                }
            }
        } catch (error) {
            console.error("Model run stream processing error:", error);
            setChatMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    content: `Chat Error: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                },
            ]);
        } finally {
            setIsModelStreaming(false);
            if (thinkingMessageId) {
                setChatMessages((prev) =>
                    prev.map((m) =>
                        m.id === thinkingMessageId
                            ? { ...m, isThinking: false }
                            : m
                    )
                );
            }
        }
    };

    // This logic ensures that if the main question becomes null (e.g. victory screen triggered by App.tsx)
    // and the dialog was open, it should also close.
    useEffect(() => {
        if (!question && isAnswerDialogOpen) {
            setIsAnswerDialogOpen(false);
            setQuestionForDialog(null);
        }
    }, [question, isAnswerDialogOpen]);

    if (!question) {
        // If the main question is null (e.g., loading initial state, or victory screen),
        // GameScreen might show a loader or nothing. The useEffect above handles closing the dialog.
        return (
            <Box sx={{ p: 3, textAlign: "center" }}>
                <Alert severity="info">Loading question or game ended...</Alert>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            <QuestionDisplay
                questionText={question.prompt}
                onCopy={handleCopyToClipboard}
                onOpenSubmitDialog={handleOpenSubmitDialog} // Use the new handler
            />

            <Box
                sx={{
                    flexGrow: 1,
                    overflowY: "auto",
                    marginBottom: '5em',
                }}
            >
                <ChatHistory
                    messages={chatMessages}
                    isModelStreaming={
                        isModelStreaming &&
                        chatMessages[chatMessages.length - 1]?.role === "user"
                    }
                />
            </Box>
            <ChatInputArea
                models={models}
                selectedModel={selectedModel}
                onSelectedModelChange={setSelectedModel}
                onSendMessage={handleSendMessageToModel}
                isSending={isModelStreaming}
            />

            {/* Render dialog only if it's set to open AND we have a question context for it */}
            {isAnswerDialogOpen && questionForDialog && (
                <AnswerSubmissionDialog
                    open={isAnswerDialogOpen}
                    onClose={handleCloseSubmitDialog} // Use the new handler
                    onSubmitAttempt={onAttempt} // Passed from App.tsx
                    questionPrompt={questionForDialog.prompt} // Use the latched question's prompt
                    isLoading={parentLoading} // Pass App.tsx's loading state
                />
            )}
        </Box>
    );
};

export default GameScreen;
