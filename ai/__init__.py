"""
AI Module for 3D ULPIN Building Detection and Segmentation.
"""

from ai.config import AIConfig, ai_config
from ai.inference.building_detector import BuildingDetector

__all__ = ["AIConfig", "ai_config", "BuildingDetector"]
