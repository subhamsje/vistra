"""
VISTRA High-Performance FastAPI Application
Exposes REST and WebSocket endpoints for:
- 3D GIS Visualization (Cesium / Three.js)
- Cadastral Parcel & Building Hierarchy
- Deterministic 3D ULPIN Querying
- Topology Validation Reports
- Human Review & Governance Audit Ledger
"""

import os
import json
from typing import Optional
from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from core.pipeline import VistraPipeline

app = FastAPI(
    title="VISTRA: 3D ULPIN & Vertical Property Mapping System",
    version="1.0.0",
    description="Next-generation multi-tier volumetric cadastre intelligence platform for India."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = VistraPipeline(db_path="vistra_cadastre.db")

# In-memory cached active run result
cached_pipeline_result = None

def init_default_data():
    global cached_pipeline_result
    # Use BoundaryLens or synthetic sample data
    sample_parcels = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": "P_102_4",
                "properties": {
                    "survey_khasra_no": "102/4",
                    "district": "BLR",
                    "state": "KA",
                    "base_elevation_m": 920.0,
                    "max_elevation_m": 960.0,
                    "owner_name": "Karnataka Industrial Area Development Board"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[77.5910, 12.9710], [77.5940, 12.9710], [77.5940, 12.9740], [77.5910, 12.9740], [77.5910, 12.9710]]]
                }
            },
            {
                "type": "Feature",
                "id": "P_102_5",
                "properties": {
                    "survey_khasra_no": "102/5",
                    "district": "BLR",
                    "state": "KA",
                    "base_elevation_m": 920.0,
                    "max_elevation_m": 960.0,
                    "owner_name": "Bangalore Development Authority"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[77.5945, 12.9710], [77.5975, 12.9710], [77.5975, 12.9740], [77.5945, 12.9740], [77.5945, 12.9710]]]
                }
            }
        ]
    }

    sample_buildings = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": "BLDG_ALPHA",
                "properties": {
                    "name": "Tower Alpha (Mixed Commercial & Residential)",
                    "parent_parcel_id": "P_102_4",
                    "base_elevation_m": 920.0,
                    "height_m": 18.0,
                    "roof_elevation_m": 938.0
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[77.5915, 12.9715], [77.5935, 12.9715], [77.5935, 12.9735], [77.5915, 12.9735], [77.5915, 12.9715]]]
                }
            },
            {
                "type": "Feature",
                "id": "BLDG_BETA",
                "properties": {
                    "name": "Tech Hub Beta",
                    "parent_parcel_id": "P_102_5",
                    "base_elevation_m": 920.0,
                    "height_m": 12.0,
                    "roof_elevation_m": 932.0
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[77.5950, 12.9715], [77.5970, 12.9715], [77.5970, 12.9735], [77.5950, 12.9735], [77.5950, 12.9715]]]
                }
            }
        ]
    }

    sample_floorplans = [
        {"building_id": "BLDG_ALPHA", "has_basement": True, "floor_count": 5},
        {"building_id": "BLDG_BETA", "has_basement": False, "floor_count": 4}
    ]

    cached_pipeline_result = pipeline.run(sample_parcels, sample_buildings, sample_floorplans)

init_default_data()

@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "platform": "VISTRA 3D Cadastre",
        "active_dataset": cached_pipeline_result["status"] if cached_pipeline_result else "EMPTY"
    }

@app.get("/api/summary")
def get_summary():
    return pipeline.db.get_summary_stats()

@app.get("/api/parcels")
def list_parcels():
    return cached_pipeline_result["_cached_dataset"]["parcels"]

@app.get("/api/cadastral-tree")
def get_cadastral_tree():
    return cached_pipeline_result["cadastral_trees"]

@app.get("/api/validation-report")
def get_validation_report():
    return cached_pipeline_result["validation"]

@app.get("/api/cityjson")
def get_cityjson():
    return cached_pipeline_result["_cached_dataset"]["cityjson"]

@app.get("/api/cesium-geojson")
def get_cesium_geojson(explode_factor: float = Query(0.0, ge=0.0, le=10.0)):
    ds = cached_pipeline_result["_cached_dataset"]
    return pipeline.visualizer.generate_cesium_payload(
        ds["parcels"],
        ds["buildings"],
        ds["floors"],
        ds["units"],
        explode_factor=explode_factor
    )

class GovernanceDecision(BaseModel):
    entity_id: str
    ulpin_3d: str
    action: str # CONFIRM, OVERRIDE, REJECT, FREEZE
    reviewer: str
    notes: str

@app.post("/api/governance/decision")
def post_governance_decision(payload: GovernanceDecision):
    res = pipeline.governance.record_decision(
        entity_id=payload.entity_id,
        ulpin_3d=payload.ulpin_3d,
        action=payload.action,
        reviewer=payload.reviewer,
        notes=payload.notes,
        prev_state={"status": "FLAGGED"},
        new_state={"status": payload.action}
    )
    return res

@app.get("/api/governance/audit-trail")
def get_governance_audit_trail(limit: int = 50):
    return pipeline.governance.get_audit_trail(limit=limit)

@app.get("/")
@app.get("/app")
def serve_ui():
    web_index = os.path.join(os.path.dirname(__file__), "..", "web", "index.html")
    if os.path.exists(web_index):
        with open(web_index, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>VISTRA 3D UI Loaded</h1>")
