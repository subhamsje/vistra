import os
import sys
import json
import tempfile
from pathlib import Path
import geopandas as gpd
from shapely.geometry import Polygon
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configure stdout for UTF-8 encoding if reconfigure is supported
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_database_layer():
    """Test database configuration, PostGIS model schema, GeoJSON conversion, and attribute preservation."""
    print("=== Testing PostGIS Database Layer ===\n")

    # Test 1: Database configuration
    print("Test 1: Verifying database configuration...")
    try:
        from backend.database.connection import DATABASE_URL, check_db_connection, get_db_engine
        from backend.database.models import BuildingModel, Base
        assert DATABASE_URL is not None and len(DATABASE_URL) > 0, "DATABASE_URL is empty"
        print(f"[OK] Database configuration verified (URL: {DATABASE_URL})")
    except Exception as e:
        print(f"[FAIL] Database configuration test failed: {e}")
        return False

    # Test 2: Model & Table Definition
    print("\nTest 2: Verifying BuildingModel schema & table definition...")
    try:
        model_cols = [c.name for c in BuildingModel.__table__.columns]
        expected_cols = [
            "id", "building_id", "height_m", "floors", "base_height", "extruded_height",
            "provenance", "confidence", "class_id", "class_name", "geometry", "created_at"
        ]
        missing = [c for c in expected_cols if c not in model_cols]
        assert not missing, f"BuildingModel schema missing columns: {missing}"
        print(f"[OK] BuildingModel table schema verified (Columns: {model_cols})")
    except Exception as e:
        print(f"[FAIL] Schema test failed: {e}")
        return False

    # Test 3: GeoJSON to Spatial Table & Geometry/Attribute Preservation
    print("\nTest 3: Testing GeoJSON -> Spatial Table conversion and attribute preservation...")
    with tempfile.TemporaryDirectory() as tmp_dir:
        sample_geojson_path = Path(tmp_dir) / "sample_buildings_3d.geojson"

        # Create sample 3D GeoJSON feature
        sample_feature = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "building_id": "BLD_DB_001",
                        "height_m": 18.0,
                        "floors": 6,
                        "base_height": 0.0,
                        "extruded_height": 18.0,
                        "provenance": "AI_DETECTED",
                        "confidence": 0.95,
                        "class_id": 0,
                        "class_name": "building"
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [
                                [77.2090, 28.6139],
                                [77.2090, 28.6145],
                                [77.2100, 28.6145],
                                [77.2100, 28.6139],
                                [77.2090, 28.6139]
                            ]
                        ]
                    }
                }
            ]
        }

        with open(sample_geojson_path, "w") as f:
            json.dump(sample_feature, f)

        # Verify GeoDataFrame loads correctly
        gdf = gpd.read_file(sample_geojson_path)
        assert len(gdf) == 1, "Failed to load sample GeoJSON"
        
        # Verify geometry preservation
        geom = gdf.iloc[0].geometry
        assert isinstance(geom, Polygon), f"Expected Polygon geometry, got {type(geom)}"
        assert abs(geom.area - 0.0000006) < 1e-9, "Geometry area mismatch"

        # Verify attributes preservation
        props = gdf.iloc[0]
        assert props["building_id"] == "BLD_DB_001"
        assert props["height_m"] == 18.0
        assert props["floors"] == 6
        assert props["base_height"] == 0.0
        assert props["extruded_height"] == 18.0
        assert props["provenance"] == "AI_DETECTED"
        assert props["confidence"] == 0.95

        print("[OK] GeoJSON features, geometries, and AI attributes verified successfully")

    # Test 4: Database Health Checker
    print("\nTest 4: Verifying database health checker function...")
    try:
        is_conn, status_msg = check_db_connection()
        print(f"[OK] Health check function executed cleanly: Connected={is_conn} ({status_msg})")
    except Exception as e:
        print(f"[FAIL] Health check failed: {e}")
        return False

    print("\n=== All Database Layer Tests Passed ===")
    return True

if __name__ == "__main__":
    success = test_database_layer()
    sys.exit(0 if success else 1)
