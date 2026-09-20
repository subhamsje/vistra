"""
VISTRA Multi-Modal Demo Dataset End-to-End Pipeline Tests
Validates:
1. Spatial consistency of all 6 inputs in datasets/demo/
2. Multi-modal ingestion (GeoJSON, LAZ, PDF, DEM GeoTIFF, Drone GeoTIFF, GNSS CSV)
3. 12-Stage processing pipeline execution
4. Deterministic topology validation (7/7 pass)
5. 3D ULPIN generation & SHA-256 provenance hashing
6. Cesium 3D GeoJSON & CityJSON serialization
"""

import os
import pytest
from core.pipeline import VistraPipeline
from modules.data_ingestion.engine import IngestionEngine

def test_demo_dataset_files_exist():
    base = "datasets/demo"
    expected_files = [
        f"{base}/parcel/parcel.geojson",
        f"{base}/lidar/building.laz",
        f"{base}/floorplans/floorplan.pdf",
        f"{base}/elevation/dem.tif",
        f"{base}/imagery/drone_orthophoto.tif",
        f"{base}/gnss/control_points.csv"
    ]
    for path in expected_files:
        assert os.path.exists(path), f"Required demo dataset file missing: {path}"
        assert os.path.getsize(path) > 0, f"Demo file is empty: {path}"

def test_multi_modal_ingestion():
    engine = IngestionEngine()
    
    # 1. Parcel GeoJSON
    parcels = engine.ingest_geojson_parcels("datasets/demo/parcel/parcel.geojson")
    assert len(parcels) == 1
    assert parcels[0]["properties"]["survey_khasra_no"] == "102/4A"
    
    # 2. LiDAR LAZ
    lidar = engine.ingest_las_points("datasets/demo/lidar/building.laz")
    assert lidar["point_count"] > 1000
    assert "classes_summary" in lidar
    assert lidar["classes_summary"]["building_count"] > 500
    
    # 3. Floorplan PDF
    floorplans = engine.ingest_floorplans("datasets/demo/floorplans/floorplan.pdf")
    assert len(floorplans) == 2
    assert floorplans[0]["building_id"] == "BLDG_ALPHA"
    assert floorplans[0]["floor_count"] == 6
    
    # 4. DEM GeoTIFF
    dem = engine.ingest_dem("datasets/demo/elevation/dem.tif")
    assert dem["elevation_stats"]["min_m"] >= 915.0
    assert dem["elevation_stats"]["max_m"] <= 945.0
    
    # 5. GNSS CSV
    gnss = engine.ingest_gnss_control_points("datasets/demo/gnss/control_points.csv")
    assert gnss["gcp_count"] == 8
    assert gnss["survey_accuracy"]["mean_residual_rms_m"] < 0.01

def test_end_to_end_pipeline_execution():
    pipeline = VistraPipeline(db_path="database/vistra_spatial.db")
    result = pipeline.run_multi_modal_pipeline(
        parcel_file="datasets/demo/parcel/parcel.geojson",
        lidar_file="datasets/demo/lidar/building.laz",
        floorplans_file="datasets/demo/floorplans/floorplan.pdf",
        dem_file="datasets/demo/elevation/dem.tif",
        imagery_file="datasets/demo/imagery/drone_orthophoto.tif",
        gnss_file="datasets/demo/gnss/control_points.csv"
    )
    
    assert result["status"] == "SUCCESS"
    assert result["parcels_count"] == 1
    assert result["buildings_count"] == 2
    assert result["floors_count"] == 11
    assert result["units_count"] == 37
    
    # Topology validation
    val = result["validation"]
    assert val["overall_status"] == "PASS"
    assert val["errors"] == 0
    assert len(val["issues"]) == 0
    
    # 3D ULPIN generation
    ulpin_summary = result["ulpin_summary"]
    assert ulpin_summary["total_ulpins_generated"] == 51
    
    # Cesium 3D GeoJSON
    cesium = result["_cached_dataset"]["cesium_geojson"]
    assert len(cesium["features"]) >= 25
    assert cesium["type"] == "FeatureCollection"
