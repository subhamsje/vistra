"""
Configuration settings for AI Building Detection module.
"""

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass
class AIConfig:
    """AI Module Configuration."""
    
    # Model parameters
    MODEL_PATH: str = os.getenv("AI_MODEL_PATH", "models/yolo11n-seg.pt")
    PRIMARY_MODEL: str = os.getenv("AI_PRIMARY_MODEL", "YOLO11-seg")
    FALLBACK_MODEL: str = os.getenv("AI_FALLBACK_MODEL", "SAM2")
    
    # Detection parameters
    CONFIDENCE_THRESHOLD: float = float(os.getenv("AI_CONF_THRESHOLD", "0.25"))
    IMAGE_SIZE: int = int(os.getenv("AI_IMAGE_SIZE", "640"))
    
    # Hardware device ('cpu' or 'cuda')
    DEVICE: str = os.getenv("AI_DEVICE", "cpu")
    
    def validate(self) -> bool:
        """Validate configuration parameters."""
        if not (0.0 <= self.CONFIDENCE_THRESHOLD <= 1.0):
            raise ValueError(f"Confidence threshold must be between 0.0 and 1.0, got {self.CONFIDENCE_THRESHOLD}")
        if self.IMAGE_SIZE <= 0:
            raise ValueError(f"Image size must be positive integer, got {self.IMAGE_SIZE}")
        if self.DEVICE.lower() not in ("cpu", "cuda", "mps"):
            raise ValueError(f"Device must be 'cpu', 'cuda', or 'mps', got {self.DEVICE}")
        return True


# Default instance
ai_config = AIConfig()
