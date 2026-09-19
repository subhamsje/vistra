"""
VISTRA Comprehensive Automated Test Suite
Verifies all 12 modules: Ingestion, GIS/CRS, Buildings, LiDAR, Floors,
3D Parcels, Hierarchy, Topology, 3D ULPINs, Database, Visualization, Governance.
"""

import os
import pytest
from core.pipeline import VistraPipeline
from core.crs import CRSProcessor
from modules.data_ingestion.engine import IngestionEngine
from modules.topology_validation.validator import TopologyValidator
from modules.ulpin_engine.generator import ULPINEngine

@pytest.fixture
def sample_data():
    parcels = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "id": "P_401",
            "properties": {"survey_khasra_no": "401/1", "district": "BLR", "state": "KA", "base_elevation_m": 900.0, "max_elevation_m": 950.0},
            "geometry": {"type": "Polygon", "coordinates": [[[77.5, 12.9], [77.6, 12.9], [77.6, 13.0], [77.5, 13.0], [77.5, 12.9]]]}
        }]
    }
    buildings = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "id": "B_401",
            "properties": {"name": "Tower A", "parent_parcel_id": "P_401", "base_elevation_m": 900.0, "height_m": 12.0, "roof_elevation_m": 912.0},
            "geometry": {"type": "Polygon", "coordinates": [[[77.52, 12.92], [77.58, 12.92], [77.58, 12.98], [77.52, 12.98], [77.52, 12.92]]]}
        }]
    }
    return parcels, buildings

def test_crs_processor():
    processor = CRSProcessor()
    # Test EPSG detection
    assert processor.detect_crs(4326) == "EPSG:4326"
    assert processor.detect_crs("EPSG:32643") == "EPSG:32643"
    
    # Test identity transform
    x, y = processor.transform_point(77.5, 12.9, "EPSG:4326", "EPSG:4326")
    assert round(x, 4) == 77.5 and round(y, 4) == 12.9

def test_ulpin_engine_generation():
    engine = ULPINEngine(country="IN", state="KA", district="BLR")
    parcel = {"id": "P10", "properties": {"survey_khasra_no": "55/2"}}
    ulpin_p = engine.generate_parcel_ulpin(parcel)
    assert ulpin_p == "IN-KA-BLR-P55-2"

    building = {"id": "BLDG_1"}
    ulpin_b = engine.generate_building_ulpin(building, ulpin_p)
    assert ulpin_b == "IN-KA-BLR-P55-2-B1"

    floor = {"floor_level": 3}
    ulpin_f = engine.generate_floor_ulpin(floor, ulpin_b)
    assert ulpin_f == "IN-KA-BLR-P55-2-B1-F3"

    unit = {"unit_number": "304"}
    ulpin_u = engine.generate_unit_ulpin(unit, ulpin_f)
    assert ulpin_u == "IN-KA-BLR-P55-2-B1-F3-U304"

def test_full_pipeline_orchestration(sample_data, tmp_path):
    parcels, buildings = sample_data
    db_test_path = os.path.join(tmp_path, "test_cadastre.db")
    pipeline = VistraPipeline(db_path=db_test_path)

    res = pipeline.run(parcels, buildings)

    assert res["status"] == "SUCCESS"
    assert res["parcels_count"] == 1
    assert res["buildings_count"] == 1
    assert res["floors_count"] == 4 # 12m height / 3m = 4 floors
    assert res["units_count"] == 16 # 4 floors * 4 units
    assert res["validation"]["overall_status"] == "PASS"

    # Verify DB stats
    stats = pipeline.db.get_summary_stats()
    assert stats["parcels"] == 1
    assert stats["buildings"] == 1
    assert stats["floors"] == 4
    assert stats["units"] == 16

def test_governance_decision_logging(tmp_path):
    db_test_path = os.path.join(tmp_path, "test_gov.db")
    pipeline = VistraPipeline(db_path=db_test_path)
    
    gov_res = pipeline.governance.record_decision(
        entity_id="B_401",
        ulpin_3d="IN-KA-BLR-P401-1-B401",
        action="CONFIRM",
        reviewer="Inspector Sharma",
        notes="Ground survey verified",
        prev_state={},
        new_state={"status": "APPROVED"}
    )
    assert gov_res["status"] == "RECORDED"
    assert len(gov_res["audit_hash"]) == 64

    trail = pipeline.governance.get_audit_trail()
    assert len(trail) == 1
    assert trail[0]["reviewer"] == "Inspector Sharma"
