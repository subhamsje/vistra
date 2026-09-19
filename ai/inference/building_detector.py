"""
Building Detector Implementation using YOLO11-seg.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np
from ai.config import AIConfig, ai_config


class BuildingDetector:
    """
    Building Detection Engine powered by YOLO11-seg.
    Supports deferred model initialization and automated weight downloading.
    """

    def __init__(self, config: Optional[AIConfig] = None, load_weights: bool = False):
        """
        Initialize BuildingDetector with deferred model loading by default.
        
        Args:
            config: Optional AIConfig instance. Uses default ai_config if None.
            load_weights: Whether to load model weights immediately upon initialization.
        """
        self.config = config or ai_config
        self.config.validate()
        self.primary_model = self.config.PRIMARY_MODEL
        self.fallback_model = self.config.FALLBACK_MODEL
        self.model = None
        
        if load_weights:
            self.load_model()

    def load_model(self) -> None:
        """
        Loads the YOLO11-seg model on demand (deferred/lazy loading).
        If model path does not exist locally, Ultralytics downloads official YOLO11-seg weights automatically.
        """
        if self.model is not None:
            return

        from ultralytics import YOLO

        model_path = Path(self.config.MODEL_PATH)
        
        # Check if local custom path exists; if not, use standard YOLO11-seg model identifier for auto-download
        if model_path.exists():
            target_model = str(model_path)
        else:
            # Fallback to standard official YOLO11-seg weights tag
            target_model = "yolo11n-seg.pt"

        print(f"Loading YOLO11-seg model from '{target_model}'...")
        self.model = YOLO(target_model)
        print("YOLO11-seg model loaded successfully.")

    def detect(self, image_path: Union[str, Path]) -> List[Dict[str, Any]]:
        """
        Run building detection on an image.
        
        Args:
            image_path: Path to input image file.
            
        Returns:
            List of structured dictionary detections containing:
            - 'bounding_box': [xmin, ymin, xmax, ymax]
            - 'confidence': float score
            - 'class_id': int class ID
            - 'class_name': str class label
            - 'segmentation_mask': list of [x, y] polygon coordinates (or None if no mask)
        """
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Input image not found: {image_path}")

        # Ensure model is loaded lazily before inference
        if self.model is None:
            self.load_model()

        # Run inference using Ultralytics YOLO
        results = self.model.predict(
            source=str(path),
            conf=self.config.CONFIDENCE_THRESHOLD,
            imgsz=self.config.IMAGE_SIZE,
            device=self.config.DEVICE,
            verbose=False
        )

        detections: List[Dict[str, Any]] = []

        if not results:
            return detections

        res = results[0]
        boxes = res.boxes
        masks = res.masks

        if boxes is None or len(boxes) == 0:
            return detections

        for i in range(len(boxes)):
            box_xyxy = boxes[i].xyxy[0].cpu().numpy().tolist()
            conf = float(boxes[i].conf[0].cpu().item())
            cls_id = int(boxes[i].cls[0].cpu().item())
            cls_name = res.names.get(cls_id, str(cls_id)) if hasattr(res, "names") else str(cls_id)

            seg_mask = None
            if masks is not None and len(masks.xy) > i:
                # Polygon coordinates [[x1, y1], [x2, y2], ...]
                polygon_coords = masks.xy[i].tolist()
                seg_mask = polygon_coords

            detections.append({
                "bounding_box": [round(c, 2) for c in box_xyxy],
                "confidence": round(conf, 4),
                "class_id": cls_id,
                "class_name": cls_name,
                "segmentation_mask": seg_mask
            })

        return detections
