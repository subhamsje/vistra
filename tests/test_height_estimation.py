import os
import sys
import tempfile
from pathlib import Path
import geopandas as gpd

# Configure stdout for UTF-8 encoding if reconfigure is supported
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_height_estimation_module():
    """Test building height and floor estimation logic and 3D GIS integration."""
    print("=== Testing Building Height & Floor Estimation ===\n")

    # Test 1: Import module
    print("Test 1: Importing height estimation module...")
    try:
        from gis.height_estimation import (
            estimate_building_height,
            apply_height_estimation_to_gdf,
            DEFAULT_FLOOR_HEIGHT_M,
            DEFAULT_FLOORS,
        )
        from ai.postprocessing import process_detections_to_3d_geojson, detections_to_geojson_features
        print("[OK] Height estimation module imported successfully")
    except Exception as e:
        print(f"[FAIL] Failed to import height estimation module: {e}")
        return False

    # Test 2: Height calculation from floors
    print("\nTest 2: Verifying height calculation from floor count...")
    res_h = estimate_building_height(floors=4, floor_height_m=3.0)
    assert res_h["height_m"] == 12.0, f"Expected height 12.0m, got {res_h['height_m']}"
    assert res_h["floors"] == 4, f"Expected 4 floors, got {res_h['floors']}"
    assert res_h["floor_height_m"] == 3.0, f"Expected 3.0m floor height, got {res_h['floor_height_m']}"
    assert res_h["height_source"] == "ESTIMATED", f"Expected height_source ESTIMATED, got {res_h['height_source']}"
    print("[OK] Height calculation from floors verified successfully (4 floors * 3.0m = 12.0m)")

    # Test 3: Floor calculation from height
    print("\nTest 3: Verifying floor calculation from height...")
    res_f = estimate_building_height(height_m=15.5, floor_height_m=3.0)
    assert res_f["height_m"] == 15.5, f"Expected height 15.5m, got {res_f['height_m']}"
    assert res_f["floors"] == 5, f"Expected 5 floors (15.5 / 3.0 = 5.17 -> 5), got {res_f['floors']}"
    assert res_f["height_source"] == "ESTIMATED", f"Expected ESTIMATED, got {res_f['height_source']}"
    print("[OK] Floor calculation from height verified successfully (15.5m / 3.0m -> 5 floors)")

    # Test 4: Configurable floor height parameter
    print("\nTest 4: Verifying configurable floor height multiplier...")
    res_custom = estimate_building_height(floors=6, floor_height_m=3.5, height_source="ESTIMATED")
    assert res_custom["height_m"] == 21.0, f"Expected height 21.0m, got {res_custom['height_m']}"
    assert res_custom["floors"] == 6, f"Expected 6 floors, got {res_custom['floors']}"
    assert res_custom["floor_height_m"] == 3.5, f"Expected 3.5m floor height, got {res_custom['floor_height_m']}"
    print("[OK] Configurable floor height verified successfully (6 floors * 3.5m = 21.0m)")

    # Test 5: Missing / invalid height handling (Defaults fallback)
    print("\nTest 5: Verifying missing/invalid height fallback handling...")
    res_invalid = estimate_building_height(floors=None, height_m=None)
    assert res_invalid["height_m"] == DEFAULT_FLOORS * DEFAULT_FLOOR_HEIGHT_M, f"Unexpected default height {res_invalid['height_m']}"
    assert res_invalid["floors"] == DEFAULT_FLOORS, f"Unexpected default floors {res_invalid['floors']}"
    assert res_invalid["height_source"] == "ESTIMATED", f"Unexpected source {res_invalid['height_source']}"
    print("[OK] Missing/invalid height handling fallback verified successfully")

    # Test 6: Integration with AI-generated building polygons & final 3D GeoJSON
    print("\nTest 6: Verifying integration with AI detections & 3D GeoJSON extrusion...")
    sample_detections = [
        {
            "segmentation_mask": [
                [77.2090, 28.6139],
                [77.2090, 28.6145],
                [77.2100, 28.6145],
                [77.2100, 28.6139]
            ],
            "confidence": 0.94,
            "class_id": 0,
            "class_name": "building",
            "bounding_box": [77.2090, 28.6139, 77.2100, 28.6145],
            "floors": 4,  # 4 floors -> 12.0m height
        },
        {
            "segmentation_mask": [
                [77.2105, 28.6140],
                [77.2105, 28.6148],
                [77.2118, 28.6148],
                [77.2118, 28.6140]
            ],
            "confidence": 0.89,
            "class_id": 0,
            "class_name": "building",
            "bounding_box": [77.2105, 28.6140, 77.2118, 28.6148],
            "height_m": 21.0,  # 21.0m height -> 7 floors at 3.0m
        }
    ]

    with tempfile.TemporaryDirectory() as tmp_dir:
        out_geojson_path = Path(tmp_dir) / "test_ai_height_3d.geojson"

        # Generate 3D GeoDataFrame with height estimation
        gdf_3d = process_detections_to_3d_geojson(
            sample_detections,
            str(out_geojson_path),
            floor_height_m=3.0
        )

        assert out_geojson_path.exists(), "3D GeoJSON output file not created"
        assert len(gdf_3d) == 2, f"Expected 2 features, got {len(gdf_3d)}"

        # Verify Feature 1 (4 floors -> 12.0m)
        f1 = gdf_3d.iloc[0]
        assert f1["building_id"] == "AI_BLD_001", f"Unexpected building_id {f1['building_id']}"
        assert f1["floors"] == 4, f"Expected 4 floors, got {f1['floors']}"
        assert f1["height_m"] == 12.0, f"Expected height 12.0m, got {f1['height_m']}"
        assert f1["base_height"] == 0.0, f"Expected base_height 0.0m, got {f1['base_height']}"
        assert f1["extruded_height"] == 12.0, f"Expected extruded_height 12.0m, got {f1['extruded_height']}"
        assert f1["provenance"] == "AI_DETECTED", f"Expected provenance AI_DETECTED, got {f1['provenance']}"
        assert f1["height_source"] == "ESTIMATED", f"Expected height_source ESTIMATED, got {f1['height_source']}"
        assert f1["floor_height_m"] == 3.0, f"Expected floor_height_m 3.0m, got {f1['floor_height_m']}"

        # Verify Feature 2 (21.0m height -> 7 floors)
        f2 = gdf_3d.iloc[1]
        assert f2["building_id"] == "AI_BLD_002", f"Unexpected building_id {f2['building_id']}"
        assert f2["height_m"] == 21.0, f"Expected height 21.0m, got {f2['height_m']}"
        assert f2["floors"] == 7, f"Expected 7 floors, got {f2['floors']}"
        assert f2["base_height"] == 0.0, f"Expected base_height 0.0m, got {f2['base_height']}"
        assert f2["extruded_height"] == 21.0, f"Expected extruded_height 21.0m, got {f2['extruded_height']}"
        assert f2["provenance"] == "AI_DETECTED", f"Expected provenance AI_DETECTED, got {f2['provenance']}"

        print("[OK] Integration with AI building polygons and 3D extrusion verified successfully")

    print("\n=== All Height Estimation Tests Passed ===")
    return True

if __name__ == "__main__":
    success = test_height_estimation_module()
    sys.exit(0 if success else 1)
