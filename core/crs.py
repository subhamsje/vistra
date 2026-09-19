"""
VISTRA CRS & Geodetic Processing Module
Handles CRS detection, transformation, and coordinate normalization using pyproj and shapely.
Standardizes on WGS84 (EPSG:4326) and UTM Projected zones (e.g. EPSG:32643 / EPSG:32644).
"""

from typing import Tuple, List, Dict, Any, Union
import pyproj
from pyproj import CRS, Transformer
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import transform

class CRSProcessor:
    def __init__(self, target_crs: str = "EPSG:4326"):
        self.target_crs = target_crs
        self._transformers: Dict[str, Transformer] = {}

    def get_transformer(self, source_crs: str, target_crs: str = None) -> Transformer:
        target = target_crs or self.target_crs
        key = f"{source_crs}->{target}"
        if key not in self._transformers:
            self._transformers[key] = Transformer.from_crs(source_crs, target, always_xy=True)
        return self._transformers[key]

    def detect_crs(self, crs_input: Any) -> str:
        """Determines EPSG string from GeoJSON dict, integer, or WKT"""
        if isinstance(crs_input, int):
            return f"EPSG:{crs_input}"
        if isinstance(crs_input, str):
            if crs_input.upper().startswith("EPSG:"):
                return crs_input.upper()
            try:
                c = CRS.from_user_input(crs_input)
                epsg = c.to_epsg()
                return f"EPSG:{epsg}" if epsg else "EPSG:4326"
            except Exception:
                return "EPSG:4326"
        if isinstance(crs_input, dict):
            # GeoJSON CRS format
            props = crs_input.get("properties", {})
            name = props.get("name", "")
            if "EPSG" in name.upper():
                code = name.split(":")[-1]
                return f"EPSG:{code}"
        return "EPSG:4326"

    def transform_point(self, x: float, y: float, source_crs: str, target_crs: str = "EPSG:4326") -> Tuple[float, float]:
        if source_crs == target_crs:
            return (x, y)
        trans = self.get_transformer(source_crs, target_crs)
        return trans.transform(x, y)

    def transform_geometry(self, geom_dict: Dict[str, Any], source_crs: str, target_crs: str = "EPSG:4326") -> Dict[str, Any]:
        """Transforms GeoJSON geometry from source_crs to target_crs"""
        if source_crs == target_crs:
            return geom_dict
        trans = self.get_transformer(source_crs, target_crs)
        s_geom = shape(geom_dict)
        transformed_geom = transform(trans.transform, s_geom)
        return mapping(transformed_geom)

    def calculate_projected_area_m2(self, geom_dict: Dict[str, Any], lat_hint: float, lon_hint: float) -> float:
        """Calculates true planar area in square meters using auto-detected UTM zone"""
        utm_zone = int((lon_hint + 180) / 6) + 1
        hemisphere = "north" if lat_hint >= 0 else "south"
        utm_epsg = f"EPSG:{32600 + utm_zone if hemisphere == 'north' else 32700 + utm_zone}"
        
        trans = self.get_transformer("EPSG:4326", utm_epsg)
        s_geom = shape(geom_dict)
        proj_geom = transform(trans.transform, s_geom)
        return float(proj_geom.area)

    def calculate_bounds(self, geom_dict: Dict[str, Any]) -> Tuple[float, float, float, float]:
        """Returns (minx, miny, maxx, maxy)"""
        s_geom = shape(geom_dict)
        return s_geom.bounds
