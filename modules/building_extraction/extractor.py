"""
Module C: Building Extraction & Footprint Associator
Extracts building footprints from GIS/imagery, estimates heights from point clouds or DEMs,
and associates buildings with parent parcels using topological spatial analysis.
"""

from typing import List, Dict, Any, Optional
from shapely.geometry import shape, mapping, Polygon
from modules.gis_processing.processor import GISProcessor

class BuildingExtractor:
    def __init__(self):
        self.gis_processor = GISProcessor()

    def associate_buildings_to_parcels(self, buildings: List[Dict[str, Any]], parcels: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Maps each building to its dominant parcel, detecting cross-parcel encroachments.
        Adapted from BoundaryLens matching engine.
        """
        parcel_index, indexed_parcels = self.gis_processor.build_spatial_index(parcels)
        
        associated_buildings = []
        for b in buildings:
            b_geom = b.get("geometry") or b.get("footprint_geojson")
            candidates = self.gis_processor.query_intersecting(b_geom, parcel_index, indexed_parcels)
            
            best_parcel = None
            highest_overlap = 0.0
            encroachments = []

            for p in candidates:
                p_geom = p.get("geometry") or p.get("footprint_geojson")
                rel = self.gis_processor.compute_parcel_building_containment(b_geom, p_geom)
                if rel["overlap_ratio"] > highest_overlap:
                    highest_overlap = rel["overlap_ratio"]
                    best_parcel = p
                if 0.01 < rel["overlap_ratio"] < 0.95:
                    encroachments.append({
                        "parcel_id": p.get("id"),
                        "overlap_ratio": rel["overlap_ratio"]
                    })

            props = dict(b.get("properties", {}))
            props["parent_parcel_id"] = best_parcel.get("id") if best_parcel else None
            props["parcel_overlap_ratio"] = highest_overlap
            props["encroachment_flag"] = len(encroachments) > 1 or (0.01 < highest_overlap < 0.95)
            props["encroaching_parcels"] = encroachments

            associated_buildings.append({
                "id": b.get("id"),
                "type": "BUILDING",
                "geometry": b_geom,
                "properties": props,
                "provenance": b.get("provenance", {
                    "source": "BUILDING_FOOTPRINT_EXTRACTOR",
                    "confidence": 0.95
                })
            })

        return associated_buildings

    def estimate_building_height_from_points(self, building_geom_dict: Dict[str, Any], point_cloud: Dict[str, Any], default_height_m: float = 12.0) -> Dict[str, float]:
        """Calculates 95th percentile height minus ground elevation from LiDAR slice"""
        import numpy as np
        pts = point_cloud.get("points")
        if pts is None or len(pts) == 0:
            return {"base_elevation_m": 920.0, "height_m": default_height_m, "roof_elevation_m": 920.0 + default_height_m}

        b_poly = shape(building_geom_dict)
        minx, miny, maxx, maxy = b_poly.bounds
        
        # Spatial bounding box pre-filter
        mask = (pts[:, 0] >= minx) & (pts[:, 0] <= maxx) & (pts[:, 1] >= miny) & (pts[:, 1] <= maxy)
        subset = pts[mask]

        if len(subset) < 5:
            return {"base_elevation_m": 920.0, "height_m": default_height_m, "roof_elevation_m": 920.0 + default_height_m}

        z_vals = subset[:, 2]
        # Ground elevation (5th percentile or classification==2)
        ground_pts = subset[subset[:, 3] == 2] if subset.shape[1] > 3 else None
        base_z = float(np.median(ground_pts[:, 2])) if ground_pts is not None and len(ground_pts) > 0 else float(np.percentile(z_vals, 5))
        roof_z = float(np.percentile(z_vals, 95))
        height = max(3.0, roof_z - base_z)

        return {
            "base_elevation_m": round(base_z, 2),
            "height_m": round(height, 2),
            "roof_elevation_m": round(base_z + height, 2)
        }
