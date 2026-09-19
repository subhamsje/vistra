import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw

# Configure stdout for UTF-8 encoding if reconfigure is supported
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_ai_module():
    """Test AI module imports, configuration loading, and YOLO11-seg BuildingDetector inference."""
    print("=== Testing AI Module ===\n")
    
    # Test 1: Verify AI modules import successfully
    print("Test 1: Importing AI modules...")
    try:
        import ai
        from ai.config import AIConfig, ai_config
        from ai.inference.building_detector import BuildingDetector
        print("[OK] AI modules imported successfully")
    except Exception as e:
        print(f"[FAIL] Failed to import AI modules: {e}")
        return False

    # Test 2: Verify configuration loads correctly with expected parameters
    print("\nTest 2: Verifying AI configuration...")
    try:
        config = AIConfig()
        config.validate()
        
        # Verify required config keys exist
        assert hasattr(config, "MODEL_PATH"), "Missing MODEL_PATH"
        assert hasattr(config, "CONFIDENCE_THRESHOLD"), "Missing CONFIDENCE_THRESHOLD"
        assert hasattr(config, "IMAGE_SIZE"), "Missing IMAGE_SIZE"
        assert hasattr(config, "DEVICE"), "Missing DEVICE"
        
        # Verify default types and values
        assert isinstance(config.CONFIDENCE_THRESHOLD, float), "CONFIDENCE_THRESHOLD must be float"
        assert 0.0 <= config.CONFIDENCE_THRESHOLD <= 1.0, "CONFIDENCE_THRESHOLD out of range"
        assert isinstance(config.IMAGE_SIZE, int), "IMAGE_SIZE must be int"
        assert config.DEVICE in ("cpu", "cuda", "mps"), f"Invalid device {config.DEVICE}"
        assert config.PRIMARY_MODEL == "YOLO11-seg", "Primary model should default to YOLO11-seg"
        assert config.FALLBACK_MODEL == "SAM2", "Fallback model should default to SAM2"
        
        print(f"[OK] AI configuration verified successfully:")
        print(f"  Model Path: {config.MODEL_PATH}")
        print(f"  Primary Model: {config.PRIMARY_MODEL}")
        print(f"  Fallback Model: {config.FALLBACK_MODEL}")
        print(f"  Confidence Threshold: {config.CONFIDENCE_THRESHOLD}")
        print(f"  Image Size: {config.IMAGE_SIZE}")
        print(f"  Device: {config.DEVICE}")
    except Exception as e:
        print(f"[FAIL] Configuration verification failed: {e}")
        return False

    # Test 3: Verify BuildingDetector can be initialized without loading a model (Deferred/Lazy loading)
    print("\nTest 3: Initializing BuildingDetector without loading model weights (Lazy loading)...")
    try:
        detector = BuildingDetector(load_weights=False)
        assert detector.model is None, "Model should be None when load_weights=False"
        assert detector.primary_model == "YOLO11-seg", f"Unexpected primary model {detector.primary_model}"
        assert detector.fallback_model == "SAM2", f"Unexpected fallback model {detector.fallback_model}"
        assert hasattr(detector, "detect"), "BuildingDetector missing detect method"
        print("[OK] BuildingDetector initialized without loading weights (lazy loading verified)")
    except Exception as e:
        print(f"[FAIL] BuildingDetector initialization failed: {e}")
        return False

    # Test 4: Verify detect() method error handling for missing file
    print("\nTest 4: Verifying detect() method error handling...")
    try:
        try:
            detector.detect("non_existent_file.jpg")
            print("[FAIL] Expected FileNotFoundError for missing file")
            return False
        except FileNotFoundError:
            print("[OK] detect() correctly raised FileNotFoundError for missing file")
    except Exception as e:
        print(f"[FAIL] Unexpected error in detect() error handling test: {e}")
        return False

    # Test 5: Real YOLO11-seg inference execution on a synthetic image
    print("\nTest 5: Testing YOLO11-seg model loading and real inference on synthetic image...")
    test_img_path = Path(__file__).parent / "test_synthetic_building.jpg"
    try:
        # Create a synthetic test image with a building-like rectangular shape
        img = Image.new("RGB", (640, 640), color=(200, 200, 200))
        draw = ImageDraw.Draw(img)
        # Draw a simulated building polygon
        draw.rectangle([100, 100, 400, 400], fill=(50, 50, 50), outline=(0, 0, 0))
        img.save(test_img_path)
        print(f"  Created synthetic test image: {test_img_path}")

        # Execute detection (triggers lazy load_model)
        detections = detector.detect(test_img_path)
        assert detector.model is not None, "Model should be loaded after detect()"
        
        print(f"[OK] YOLO11-seg inference executed successfully")
        print(f"  Total detections returned: {len(detections)}")
        for idx, det in enumerate(detections):
            print(f"  Detection {idx + 1}: Class='{det['class_name']}', Conf={det['confidence']}, BBox={det['bounding_box']}")

    except Exception as e:
        print(f"[FAIL] Real YOLO11-seg inference test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Cleanup synthetic test image
        if test_img_path.exists():
            try:
                os.remove(test_img_path)
            except Exception:
                pass

    print("\n=== All AI Module Tests Passed ===")
    return True

if __name__ == "__main__":
    success = test_ai_module()
    sys.exit(0 if success else 1)
