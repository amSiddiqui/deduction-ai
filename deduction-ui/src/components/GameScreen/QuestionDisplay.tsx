// src/components/GameScreen/QuestionDisplay.tsx
import React, { useState } from "react";
import {
    Box,
    Typography,
    IconButton,
    Button,
    Collapse,
    Paper,
    Tooltip,
} from "@mui/material";
import {
    ContentCopy as ContentCopyIcon,
    ExpandMore as ExpandMoreIcon,
    UnfoldLess as UnfoldLessIcon,
} from "@mui/icons-material";

interface QuestionDisplayProps {
    questionText: string;
    onCopy: () => void;
    onOpenSubmitDialog: () => void; // Triggers the AnswerSubmissionDialog
}

const MAX_COLLAPSED_HEIGHT = "5em"; // Approx 3-4 lines

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
    questionText,
    onCopy,
    onOpenSubmitDialog,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (contentRef.current) {
            // Check if content is taller than max collapsed height
            setIsOverflowing(
                contentRef.current.scrollHeight >
                    contentRef.current.clientHeight && !expanded
            );
        }
    }, [questionText, expanded]);

    const handleToggleExpand = () => {
        setExpanded(!expanded);
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                mb: 2,
                position: "relative",
                backgroundColor: "background.default",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1,
                }}
            >
                <Typography
                    variant="h6"
                    component="h2"
                    sx={{ color: "text.primary", fontWeight: "medium" }}
                >
                    The Challenge:
                </Typography>
                <Tooltip title="Copy Question">
                    <IconButton
                        onClick={onCopy}
                        size="small"
                        aria-label="copy question"
                    >
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            <Collapse
                in={expanded}
                timeout="auto"
                collapsedSize={MAX_COLLAPSED_HEIGHT}
            >
                <Typography
                    ref={contentRef}
                    variant="body1"
                    sx={{
                        whiteSpace: "pre-wrap",
                        color: "text.secondary",
                        lineHeight: 1.6,
                        maxHeight: expanded ? "none" : MAX_COLLAPSED_HEIGHT,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: expanded ? "none" : 4, // Fallback for browsers not supporting MAX_COLLAPSED_HEIGHT well with -webkit-box
                        WebkitBoxOrient: "vertical",
                    }}
                >
                    {questionText}
                </Typography>
            </Collapse>

            {(isOverflowing || expanded) && ( // Show expand/collapse button only if content overflows or is expanded
                <Box textAlign="center" mt={1}>
                    <Button
                        size="small"
                        onClick={handleToggleExpand}
                        startIcon={
                            expanded ? <UnfoldLessIcon /> : <ExpandMoreIcon />
                        }
                    >
                        {expanded ? "Show Less" : "Show More"}
                    </Button>
                </Box>
            )}

            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                }}
            >
                <Button
                    variant="contained"
                    color="primary"
                    onClick={onOpenSubmitDialog}
                >
                    Submit Final Answer
                </Button>
            </Box>
        </Paper>
    );
};

export default QuestionDisplay;
