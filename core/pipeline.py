"""
VISTRA Master End-to-End Orchestrator Pipeline
Connects Modules A through L into a unified workflow:
Ingestion -> GIS/CRS -> Building Extraction -> Floor Segmentation -> 3D Extrusion ->
Vertical Hierarchy -> Topology Validation -> 3D ULPIN -> Database -> Visualization & Governance
"""

import os
import json
from typing import Dict, Any, List, Optional

from modules.data_ingestion.engine import IngestionEngine
from modules.gis_processing.processor import GISProcessor
from modules.building_extraction.extractor import BuildingExtractor
from modules.lidar_reconstruction.reconstructor import LiDARReconstructor
from modules.floor_segmentation.segmenter import FloorSegmenter
from modules.parcel_3d.extruder import VolumetricParcelGenerator
from modules.vertical_modelling.modeler import VerticalPropertyModeler
from modules.topology_validation.validator import TopologyValidator
from modules.ulpin_engine.generator import ULPINEngine
from modules.database.database import SpatialDatabase
from modules.visualization.serializer import Visualization3DSerializer
from modules.governance.governance import GovernanceManager

class VistraPipeline:
    def __init__(self, db_path: str = "vistra_cadastre.db"):
        self.ingestion = IngestionEngine()
        self.gis = GISProcessor()
        self.building_extractor = BuildingExtractor()
        self.lidar = LiDARReconstructor()
        self.floor_segmenter = FloorSegmenter()
        self.parcel_extruder = VolumetricParcelGenerator()
        self.vertical_modeler = VerticalPropertyModeler()
        self.topology_validator = TopologyValidator()
        self.ulpin_engine = ULPINEngine()
        self.db = SpatialDatabase(db_path)
        self.visualizer = Visualization3DSerializer()
        self.governance = GovernanceManager(self.db)

    def run(self, raw_parcels_geojson: Any, raw_buildings_geojson: Optional[Any] = None, floorplans_data: Optional[Any] = None) -> Dict[str, Any]:
        """
        Executes the autonomous 12-stage VISTRA pipeline on provided or default urban data.
        """
        # Step 1: Ingest & Normalize GIS Parcels (Module A & B)
        parcels = self.ingestion.ingest_geojson_parcels(raw_parcels_geojson)

        # Step 2: Extract & Associate Buildings (Module C)
        raw_bldgs = []
        if raw_buildings_geojson:
            if isinstance(raw_buildings_geojson, str):
                with open(raw_buildings_geojson) as f:
                    raw_bldgs = json.load(f).get("features", [])
            elif isinstance(raw_buildings_geojson, dict):
                raw_bldgs = raw_buildings_geojson.get("features", [raw_buildings_geojson])

        buildings = self.building_extractor.associate_buildings_to_parcels(raw_bldgs, parcels)

        # Step 3: Floor Segmentation (Module E)
        all_floors = []
        all_units = []
        for b in buildings:
            floors = self.floor_segmenter.segment_building_floors(b, point_cloud=None, floorplans=floorplans_data)
            all_floors.extend(floors)

            # Step 4: Volumetric 3D Unit Extrusion (Module F)
            for fl in floors:
                units = self.parcel_extruder.partition_floor_into_units(b.get("geometry"), fl, unit_count=fl.get("units_count", 4))
                all_units.extend(units)

        # Step 5: Vertical Property Modelling & Tree Construction (Module G)
        cadastral_trees = []
        for p in parcels:
            tree = self.vertical_modeler.build_cadastral_tree(p, buildings, all_floors, all_units)
            cadastral_trees.append(tree)

        # Step 6: Deterministic Cadastral Topology Validation (Module H)
        validation_report = self.topology_validator.validate_dataset(parcels, buildings, all_floors, all_units)

        # Step 7: 3D ULPIN Generation & SHA-256 Provenance Audit Seals (Module I)
        ulpin_summary = self.ulpin_engine.apply_ulpins_to_cadastral_dataset(parcels, buildings, all_floors, all_units)

        # Step 8: Spatial Persistence into 3DCityDB-compatible DB (Module J)
        self.db.insert_dataset(parcels, buildings, all_floors, all_units)

        # Step 9: Serializations for 3D Visualization (Module K)
        cityjson = self.visualizer.export_to_cityjson(parcels, buildings, all_floors, all_units)
        cesium_geojson = self.visualizer.generate_cesium_payload(parcels, buildings, all_floors, all_units, explode_factor=0.0)

        return {
            "status": "SUCCESS",
            "parcels_count": len(parcels),
            "buildings_count": len(buildings),
            "floors_count": len(all_floors),
            "units_count": len(all_units),
            "validation": validation_report,
            "ulpin_summary": ulpin_summary,
            "cadastral_trees": cadastral_trees,
            "cityjson_summary": {
                "objects_count": len(cityjson["CityObjects"]),
                "vertices_count": len(cityjson["vertices"])
            },
            "cesium_features_count": len(cesium_geojson["features"]),
            "_cached_dataset": {
                "parcels": parcels,
                "buildings": buildings,
                "floors": all_floors,
                "units": all_units,
                "cityjson": cityjson,
                "cesium_geojson": cesium_geojson
            }
        }
