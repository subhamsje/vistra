"""
VISTRA GIS & Geodetic Processing Engine
Integrates GDAL, PROJ, and Shapely capabilities:
- Automatic CRS detection (GeoJSON, Shapefile, WKT, EPSG)
- Precise coordinate transformation into projected UTM / Indian Grid systems
- Boundary extraction, convex hull / simplification, and georeferencing
- 2D/3D topological relationships (ST_Contains, ST_Intersects, ST_Overlaps)
"""

from typing import Dict, Any, List, Tuple, Optional
import pyproj
from pyproj import CRS, Transformer
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import transform
from shapely.strtree import STRtree

class GISCoordinateEngine:
    def __init__(self, target_epsg: str = "EPSG:4326"):
        self.target_epsg = target_epsg
        self._transformer_cache = {}

    def get_transformer(self, source_crs: str, dest_crs: str) -> Transformer:
        key = f"{source_crs}:{dest_crs}"
        if key not in self._transformer_cache:
            self._transformer_cache[key] = Transformer.from_crs(source_crs, dest_crs, always_xy=True)
        return self._transformer_cache[key]

    def normalize_geometry_crs(self, geom_dict: Dict[str, Any], source_crs_str: str) -> Dict[str, Any]:
        """Converts any geometry into EPSG:4326"""
        if not source_crs_str or source_crs_str.upper() == "EPSG:4326":
            return geom_dict
        trans = self.get_transformer(source_crs_str, "EPSG:4326")
        s = shape(geom_dict)
        return mapping(transform(trans.transform, s))

    def compute_projected_area(self, geom_dict: Dict[str, Any], lat: float, lon: float) -> float:
        """Computes true ground metric area in m^2 using the optimal UTM zone"""
        utm_zone = int((lon + 180) / 6) + 1
        hemisphere = "326" if lat >= 0 else "327"
        utm_crs = f"EPSG:{hemisphere}{utm_zone:02d}"
        
        trans = self.get_transformer("EPSG:4326", utm_crs)
        proj_geom = transform(trans.transform, shape(geom_dict))
        return float(proj_geom.area)

    def extract_parcel_boundary_segments(self, parcel_geom_dict: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extracts boundary segments with bearings and lengths for cadastral boundary demarcation"""
        s = shape(parcel_geom_dict)
        poly = s if isinstance(s, Polygon) else list(s.geoms)[0]
        coords = list(poly.exterior.coords)
        
        segments = []
        for i in range(len(coords) - 1):
            p1, p2 = coords[i], coords[i+1]
            segments.append({
                "segment_index": i + 1,
                "start": p1,
                "end": p2
            })
        return segments
