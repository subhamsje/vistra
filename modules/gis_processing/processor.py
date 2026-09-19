"""
Module B: GIS & Coordinate Processing
Performs georeferencing, parcel boundary validation, spatial indexing (R-Tree / STRtree),
and containment testing.
"""

from typing import List, Dict, Any, Tuple, Optional
from shapely.geometry import shape, mapping, Polygon, Point, MultiPolygon
from shapely.strtree import STRtree
from core.crs import CRSProcessor

class GISProcessor:
    def __init__(self):
        self.crs_processor = CRSProcessor()

    def build_spatial_index(self, features: List[Dict[str, Any]]) -> Tuple[STRtree, List[Dict[str, Any]]]:
        """Builds a high-performance STRtree spatial index over features"""
        geometries = []
        valid_features = []
        for feat in features:
            geom_dict = feat.get("geometry") or feat.get("footprint_geojson")
            if geom_dict:
                geom = shape(geom_dict)
                if not geom.is_valid:
                    geom = geom.buffer(0) # fix self-intersections
                geometries.append(geom)
                valid_features.append(feat)
        
        index = STRtree(geometries)
        return index, valid_features

    def query_intersecting(self, query_geom_dict: Dict[str, Any], index: STRtree, indexed_features: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Finds all features intersecting query geometry"""
        q_geom = shape(query_geom_dict)
        matching_indices = index.query(q_geom)
        results = []
        for idx in matching_indices:
            feat = indexed_features[idx]
            target_geom = shape(feat.get("geometry") or feat.get("footprint_geojson"))
            if q_geom.intersects(target_geom):
                results.append(feat)
        return results

    def compute_parcel_building_containment(self, building_geom_dict: Dict[str, Any], parcel_geom_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Calculates precise overlap percentage and boundary relationship"""
        b_geom = shape(building_geom_dict)
        p_geom = shape(parcel_geom_dict)

        if not b_geom.is_valid:
            b_geom = b_geom.buffer(0)
        if not p_geom.is_valid:
            p_geom = p_geom.buffer(0)

        b_area = b_geom.area
        if b_area == 0:
            return {"contained": False, "overlap_ratio": 0.0, "relation": "DISJOINT"}

        intersection = b_geom.intersection(p_geom)
        overlap_ratio = intersection.area / b_area

        relation = "DISJOINT"
        if overlap_ratio >= 0.99:
            relation = "FULLY_CONTAINED"
        elif overlap_ratio > 0.05:
            relation = "PARTIALLY_CONTAINED_ENCROACHMENT"
        elif overlap_ratio > 0.0:
            relation = "TOUCHING_BOUNDARY"

        return {
            "contained": overlap_ratio >= 0.95,
            "overlap_ratio": round(float(overlap_ratio), 4),
            "relation": relation,
            "intersection_area": float(intersection.area)
        }
