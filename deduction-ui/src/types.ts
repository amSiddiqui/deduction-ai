// src/types.ts
export interface User {
    id: string;
    name: string;
    current_stage: number;
}

export interface Question {
    id: string;
    prompt: string;
    // The 'answer' field from the backend is used for checking,
    // not typically displayed directly.
}

export interface ModelOptionDetail {
    name: string; // The actual model ID (e.g., "claude-3-5-haiku-latest")
    display_name: string; // The name for the UI (e.g., "Claude 3.5 Haiku")
    thinking: boolean; // The new "thinking" flag
}

export interface ModelInfo {
    default: string; // ID of the default model
    options: ModelOptionDetail[]; // Array of detailed model options
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "thinking"; // Added 'thinking'
    content: string;
    isThinking?: boolean; // Optional flag for thinking messages
}

// For API responses
export interface JoinResponse {
    user: User;
    question: Question | null; // Null if user has already won
}

export interface AttemptResponse {
    correct: boolean;
    victory: boolean;
    question: Question | null; // Next question or same question if incorrect
    message?: string; // Optional feedback message
}

// For model run stream chunks (example, adjust based on actual stream structure)
export interface ModelStreamChunk {
    type: "thinking" | "final" | "error" | "delta"; // 'delta' for traditional LLM stream
    content?: string; // For thinking, final, error, delta
    delta?: string; // More specific for traditional LLM stream
}

export type GameView =
    | "loading"
    | "joining"
    | "playing"
    | "victory"
    | "error"
    | "attemptingAutoJoin";

export const MAX_STAGES = 3; // Keep in sync with backend
export const API_BASE_URL = "/api";
