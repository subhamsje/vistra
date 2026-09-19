import os
import sys
import json
import geopandas as gpd
from pathlib import Path

# Configure stdout for UTF-8 encoding if reconfigure is supported
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_gis_pipeline():
    """Test the GIS to 3D building pipeline."""
    print("=== Testing GIS Pipeline ===\n")
    
    project_root = Path(__file__).parent.parent
    input_path = project_root / "data" / "synthetic" / "buildings.geojson"
    output_path = project_root / "data" / "processed" / "buildings_3d.geojson"
    
    # Test 1: Input GeoJSON loads
    print("Test 1: Loading input GeoJSON...")
    try:
        gdf_input = gpd.read_file(input_path)
        print(f"[OK] Input GeoJSON loaded successfully")
        print(f"  Features: {len(gdf_input)}")
    except Exception as e:
        print(f"[FAIL] Failed to load input GeoJSON: {e}")
        return False
    
    # Test 2: Verify input has required fields
    print("\nTest 2: Verifying input fields...")
    required_fields = ['building_id', 'height_m', 'floors', 'provenance']
    missing_fields = [f for f in required_fields if f not in gdf_input.columns]
    if missing_fields:
        print(f"[FAIL] Missing required fields: {missing_fields}")
        return False
    print(f"[OK] All required fields present: {required_fields}")
    
    # Test 3: Run GIS processing script
    print("\nTest 3: Running GIS processing script...")
    try:
        os.chdir(project_root)
        from gis.build_3d import process_buildings_to_3d
        result = process_buildings_to_3d(str(input_path), str(output_path))
        print(f"[OK] GIS processing completed successfully")
    except Exception as e:
        print(f"[FAIL] GIS processing failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 4: Verify output file exists
    print("\nTest 4: Verifying output file exists...")
    if not output_path.exists():
        print(f"[FAIL] Output file not created: {output_path}")
        return False
    print(f"[OK] Output file created: {output_path}")
    
    # Test 5: Load and verify output GeoJSON
    print("\nTest 5: Loading and verifying output GeoJSON...")
    try:
        gdf_output = gpd.read_file(output_path)
        print(f"[OK] Output GeoJSON loaded successfully")
        print(f"  Features: {len(gdf_output)}")
    except Exception as e:
        print(f"[FAIL] Failed to load output GeoJSON: {e}")
        return False
    
    # Test 6: Verify 3 buildings are processed
    print("\nTest 6: Verifying building count...")
    if len(gdf_output) != 3:
        print(f"[FAIL] Expected 3 buildings, got {len(gdf_output)}")
        return False
    print(f"[OK] Correct number of buildings: {len(gdf_output)}")
    
    # Test 7: Verify height values are preserved
    print("\nTest 7: Verifying height values are preserved...")
    output_fields = ['building_id', 'height_m', 'floors', 'base_height', 'extruded_height', 'provenance']
    missing_output_fields = [f for f in output_fields if f not in gdf_output.columns]
    if missing_output_fields:
        print(f"[FAIL] Missing output fields: {missing_output_fields}")
        return False
    print(f"[OK] All output fields present: {output_fields}")
    
    # Verify height values match
    for idx, row in gdf_output.iterrows():
        building_id = row['building_id']
        height_m = row['height_m']
        extruded_height = row['extruded_height']
        base_height = row['base_height']
        
        if height_m != extruded_height:
            print(f"[FAIL] Height mismatch for {building_id}: height_m={height_m}, extruded_height={extruded_height}")
            return False
        
        if base_height != 0.0:
            print(f"[FAIL] Base height should be 0.0 for {building_id}, got {base_height}")
            return False
    
    print(f"[OK] Height values preserved correctly")
    
    # Test 8: Verify provenance is preserved
    print("\nTest 8: Verifying provenance is preserved...")
    for idx, row in gdf_output.iterrows():
        if row['provenance'] != 'SYNTHETIC':
            print(f"[FAIL] Provenance mismatch for {row['building_id']}: expected SYNTHETIC, got {row['provenance']}")
            return False
    print(f"[OK] Provenance preserved correctly")
    
    print("\n=== All Tests Passed ===")
    return True

if __name__ == "__main__":
    success = test_gis_pipeline()
    sys.exit(0 if success else 1)

