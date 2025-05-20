// src/components/GameScreen/ModelSelector.tsx
import React from "react";
import {
    Select,
    MenuItem,
    FormControl,
    Box,
    Typography,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import {
    Psychology as PsychologyIcon, // For "thinking" models
    Bolt as BoltIcon, // For "non-thinking" (fast) models
} from "@mui/icons-material";
import { type ModelInfo, type ModelOptionDetail } from "../../types";

interface ModelSelectorProps {
    models: ModelInfo;
    selectedModel: string; // This is the ID (option.name)
    onChange: (modelId: string) => void;
    disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
    models,
    selectedModel,
    onChange,
    disabled,
}) => {
    const getModelIcon = (thinking: boolean) => {
        return thinking ? (
            <PsychologyIcon
                fontSize="small"
                sx={{ mr: 1, color: "secondary.main" }}
            />
        ) : (
            <BoltIcon fontSize="small" sx={{ mr: 1, color: "primary.main" }} />
        );
    };

    return (
        <FormControl size="small" sx={{ minWidth: 220, maxWidth: 300 }}>
            <Select
                value={selectedModel}
                onChange={(e) => onChange(e.target.value as string)}
                disabled={disabled || models.options.length === 0}
                variant="outlined"
                sx={{
                    ".MuiSelect-select": {
                        display: "flex",
                        alignItems: "center",
                        py: "10px", // Adjust padding for icon height
                        pl: "14px",
                        pr: "32px",
                    },
                    backgroundColor: "transparent",
                    borderRadius: 1, // Consistent border radius
                }}
                // renderValue is used to customize the display of the selected value
                renderValue={(selectedValue) => {
                    const selectedOption = models.options.find(
                        (opt) => opt.name === selectedValue
                    );
                    if (!selectedOption) {
                        return "Select Model"; // Fallback
                    }
                    return (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            {getModelIcon(selectedOption.thinking)}
                            <Typography variant="body2" component="span">
                                {selectedOption.display_name}
                            </Typography>
                        </Box>
                    );
                }}
            >
                {models.options.length === 0 && (
                    <MenuItem value="" disabled>
                        <Typography variant="body2" color="textSecondary">
                            No models available
                        </Typography>
                    </MenuItem>
                )}
                {models.options.map((option: ModelOptionDetail) => (
                    <MenuItem key={option.name} value={option.name}>
                        <ListItemIcon
                            sx={{ minWidth: "auto", marginRight: 1.5 }}
                        >
                            {getModelIcon(option.thinking)}
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                <Typography variant="body2">
                                    {option.display_name}
                                </Typography>
                            }
                        />
                        {/* Optional: Add a small visual cue like a dot or badge for thinking */}
                        {/* {option.thinking && <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'secondary.light', ml: 'auto' }} />} */}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default ModelSelector;
