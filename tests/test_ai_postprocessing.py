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

def test_ai_postprocessing():
    """Test AI segmentation mask to GIS polygon postprocessing and 3D GIS pipeline integration."""
    print("=== Testing AI Postprocessing & GIS Integration ===\n")
    
    # Import postprocessing functions
    print("Test 1: Importing postprocessing tools...")
    try:
        from ai.postprocessing import (
            mask_to_polygon,
            detections_to_geojson_features,
            process_detections_to_3d_geojson,
        )
        from gis.build_3d import process_buildings_to_3d
        print("[OK] Postprocessing modules imported successfully")
    except Exception as e:
        print(f"[FAIL] Import failed: {e}")
        return False

    # Test 2: Valid mask to Shapely Polygon conversion
    print("\nTest 2: Converting valid YOLO mask to Shapely Polygon...")
    valid_mask = [
        [77.2090, 28.6139],
        [77.2090, 28.6145],
        [77.2100, 28.6145],
        [77.2100, 28.6139]
    ]
    poly, reason = mask_to_polygon(valid_mask)
    if poly is None or not poly.is_valid or poly.area <= 0:
        print(f"[FAIL] Valid mask conversion failed: {reason}")
        return False
    print(f"[OK] Valid mask converted to Polygon successfully (Area: {poly.area:.8f})")

    # Test 3: Self-intersecting / invalid mask repair
    print("\nTest 3: Repairing self-intersecting / invalid polygon...")
    bow_tie_mask = [
        [0, 0],
        [0, 2],
        [2, 0],
        [2, 2]
    ]
    repaired_poly, repair_reason = mask_to_polygon(bow_tie_mask)
    if repaired_poly is None or not repaired_poly.is_valid:
        print(f"[FAIL] Self-intersecting mask repair failed: {repair_reason}")
        return False
    print("[OK] Self-intersecting mask successfully repaired into valid Polygon")

    # Test 4: Invalid and empty mask handling (discarding with reason)
    print("\nTest 4: Verifying invalid / empty mask error handling and discarding...")
    invalid_cases = [
        (None, "Empty or missing mask coordinates"),
        ([], "Empty or missing mask coordinates"),
        ([[77.2090, 28.6139], [77.2090, 28.6145]], "Insufficient distinct vertices"),
        ([[1, 1], [1, 1], [1, 1]], "Insufficient distinct vertices"),
    ]
    for bad_coords, expected_keyword in invalid_cases:
        res_poly, err_msg = mask_to_polygon(bad_coords)
        if res_poly is not None:
            print(f"[FAIL] Expected invalid mask {bad_coords} to be discarded")
            return False
        if expected_keyword.lower() not in (err_msg or "").lower():
            print(f"[FAIL] Discard reason '{err_msg}' did not contain expected keyword '{expected_keyword}'")
            return False
    print("[OK] Invalid / empty masks discarded with correct reasons")

    # Test 5: GeoJSON feature generation and AI metadata preservation
    print("\nTest 5: Converting YOLO detections to GeoJSON features with preserved AI attributes...")
    sample_detections = [
        {
            "segmentation_mask": valid_mask,
            "confidence": 0.925,
            "class_id": 0,
            "class_name": "building",
            "bounding_box": [77.2090, 28.6139, 77.2100, 28.6145]
        },
        {
            "segmentation_mask": [
                [77.2105, 28.6140],
                [77.2105, 28.6148],
                [77.2118, 28.6148],
                [77.2118, 28.6140]
            ],
            "confidence": 0.884,
            "class_id": 0,
            "class_name": "commercial_building",
            "bounding_box": [77.2105, 28.6140, 77.2118, 28.6148]
        },
        {
            # Invalid mask to test discarding in batch
            "segmentation_mask": [[0, 0]],
            "confidence": 0.12,
            "class_id": 0,
            "class_name": "noise",
        }
    ]

    features = detections_to_geojson_features(sample_detections, default_height_m=18.5, default_floors=5)
    if len(features) != 2:
        print(f"[FAIL] Expected 2 valid features from 3 detections, got {len(features)}")
        return False

    feat1 = features[0]
    props1 = feat1["properties"]
    assert props1["building_id"] == "AI_BLD_001", f"Unexpected building_id: {props1['building_id']}"
    assert props1["provenance"] == "AI_DETECTED", f"Unexpected provenance: {props1['provenance']}"
    assert props1["confidence"] == 0.925, f"Unexpected confidence: {props1['confidence']}"
    assert props1["class_id"] == 0, f"Unexpected class_id: {props1['class_id']}"
    assert props1["class_name"] == "building", f"Unexpected class_name: {props1['class_name']}"
    assert props1["height_m"] == 18.5, f"Unexpected height_m: {props1['height_m']}"
    assert props1["floors"] == 6, f"Unexpected floors: {props1['floors']}"
    print("[OK] GeoJSON feature generation and AI metadata preservation verified")

    # Test 6: Integration with existing 3D-ready GIS pipeline
    print("\nTest 6: Verifying integration with 3D GIS pipeline...")
    with tempfile.TemporaryDirectory() as tmp_dir:
        ai_2d_path = Path(tmp_dir) / "ai_buildings_2d.geojson"
        ai_3d_path = Path(tmp_dir) / "ai_buildings_3d.geojson"

        # Step 6a: Process detections to 3D GeoJSON
        gdf_3d = process_detections_to_3d_geojson(sample_detections, str(ai_3d_path), default_height_m=15.0, default_floors=4)

        if not ai_3d_path.exists():
            print(f"[FAIL] 3D GeoJSON output file was not created at {ai_3d_path}")
            return False

        # Verify output columns
        required_cols = [
            "building_id", "height_m", "floors", "base_height", "extruded_height",
            "provenance", "confidence", "class_id", "class_name", "geometry"
        ]
        missing_cols = [c for c in required_cols if c not in gdf_3d.columns]
        if missing_cols:
            print(f"[FAIL] 3D GeoJSON missing columns: {missing_cols}")
            return False

        # Verify values
        row0 = gdf_3d.iloc[0]
        assert row0["provenance"] == "AI_DETECTED", f"Unexpected provenance {row0['provenance']}"
        assert row0["base_height"] == 0.0, f"Unexpected base_height {row0['base_height']}"
        assert row0["extruded_height"] == 15.0, f"Unexpected extruded_height {row0['extruded_height']}"
        assert row0["confidence"] == 0.925, f"Unexpected confidence {row0['confidence']}"

        # Step 6b: Feed generated 2D GeoJSON through existing GIS process_buildings_to_3d pipeline
        gdf_from_file = gpd.read_file(ai_3d_path)
        gdf_from_file.to_file(ai_2d_path, driver="GeoJSON")
        gis_output_path = Path(tmp_dir) / "gis_processed_3d.geojson"

        process_buildings_to_3d(str(ai_2d_path), str(gis_output_path))
        assert gis_output_path.exists(), "GIS 3D output file was not created"

        gdf_gis_result = gpd.read_file(gis_output_path)
        assert len(gdf_gis_result) == 2, f"Expected 2 features from GIS pipeline, got {len(gdf_gis_result)}"
        assert "confidence" in gdf_gis_result.columns, "AI confidence column missing after GIS pipeline"
        assert "class_name" in gdf_gis_result.columns, "AI class_name column missing after GIS pipeline"

        print("[OK] Direct integration with 3D GIS pipeline verified successfully!")

    print("\n=== All AI Postprocessing Tests Passed ===")
    return True

if __name__ == "__main__":
    success = test_ai_postprocessing()
    sys.exit(0 if success else 1)
