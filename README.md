# VISTRA: 3D ULPIN Generation & Vertical Property Mapping System
**Smart India Hackathon (SIH) Flagship Engineering Project**

VISTRA is a multi-tier geospatial intelligence and cadastral platform designed to extend India's 2D Unique Land Parcel Identification Number (ULPIN) standard into **volumetric, deterministic 3D cadastral identities**. It enables 3D property tenure mapping across vertical storeys, residential apartments, commercial units, and subterranean infrastructure.

---

## 🏗️ System Architecture & Layout

```
/Users/subham/code/vistra/
├── backend/                # Production FastAPI Backend & API endpoints
├── frontend/               # React + TypeScript + CesiumJS UI components
├── gis/                    # GDAL / PROJ / Shapely georeferencing & spatial index
├── lidar/                  # ASPRS LAS / LAZ point cloud segmentation & height histograms
├── ml/                     # Bayesian evidence fusion & floor anomaly detection
├── ulpin/                  # Deterministic 3D ULPIN generator & SHA-256 audit authority
├── database/               # 3DCityDB & PostGIS / SpatiaLite relational models
├── shared/                 # Canonical LADM ISO 19152 & CityJSON data schemas
├── modules/                # Core loosely coupled pipeline modules
├── datasets/               # Ingested datasets and manifests
├── sample_data/            # Ready-to-run demo datasets (Parcels, Buildings, Floorplans)
├── tests/                  # Automated test suite (pytest)
├── docs/                   # Architectural specs & technical documentation
├── docker-compose.yml      # Zero-config containerized deployment
├── Dockerfile              # Production Python geospatial container image
├── run_vistra.py           # One-click executable CLI & server runner
└── README.md
```

---

## ⚡ 12-Stage Processing Pipeline

1. **Data Ingestion**: Multi-modal reader supporting GIS parcels, LiDAR LAS/LAZ, and architectural floorplans.
2. **GIS / Coordinate Processing**: Georeferencing, automated CRS detection, UTM projections, and R-tree spatial indexing.
3. **Building Extraction**: Footprint parsing, LiDAR height percentile extraction, and parcel containment evaluation.
4. **LiDAR 3D Reconstruction**: Statistical outlier filtering, ground/non-ground morphological separation, and surface boundary reconstruction.
5. **Floor Segmentation**: Storey elevation histogram peak analysis, basement level detection, and floor height sanity checking.
6. **3D Parcel Generation**: Volumetric polyhedron solid extrusions, unit partitioning, and subterranean space modeling.
7. **Vertical Property Modelling**: ISO 19152 LADM hierarchy (`Parcel -> Building -> Floor -> Unit`) with RRR (Rights, Restrictions, Responsibilities).
8. **Topology Validation**: Deterministic auditing for unit volumetric overlaps, inter-floor penetrations, void gaps, and containment breaches.
9. **3D ULPIN Generation**: Deterministic hierarchical string format: `IN-[STATE]-[DISTRICT]-P[PARCEL]-B[BLDG]-F[FLOOR]-U[UNIT]` paired with SHA-256 provenance audit seals.
10. **3D Database**: 3DCityDB and PostGIS-compatible persistence layer storing 3D geometries, attribution, and governance audit logs.
11. **3D Visualization**: Interactive CesiumJS WebGIS cockpit supporting real-time vertical floor explosion and unit-level inspection.
12. **Human Review & Governance**: Human-in-the-Loop triage for low-confidence detections, property dispute freezes, and audit trails.

---

## 🚀 One-Command Launch

### 1. Run Automated Test Suite
```bash
cd /Users/subham/code/vistra
PYTHONPATH=. pytest tests/test_vistra_suite.py
```

### 2. Launch Local Server & 3D WebGIS Cockpit
```bash
cd /Users/subham/code/vistra
PYTHONPATH=. ./run_vistra.py
```
- **3D Cesium Cadastre Cockpit**: [http://localhost:8000/app](http://localhost:8000/app)
- **Interactive OpenAPI Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Live System Stats API**: [http://localhost:8000/api/stats](http://localhost:8000/api/stats)
- **Validation Report API**: [http://localhost:8000/api/validation-report](http://localhost:8000/api/validation-report)
- **CityJSON Model Export API**: [http://localhost:8000/api/cityjson](http://localhost:8000/api/cityjson)

### 3. Docker Deployment
```bash
docker-compose up --build
```
