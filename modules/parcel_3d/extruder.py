"""
Module F: 3D Volumetric Parcel & Unit Extrusion
Generates 3D Solid / MultiSurface geometries for Cadastral Parcels, Floors, and Units.
Adapted from 3D-Cadastre CityJSON CityObjects structure and BoundaryLens 3D visual geometry.
"""

from typing import List, Dict, Any, Tuple
from shapely.geometry import shape, Polygon

class VolumetricParcelGenerator:
    def __init__(self):
        pass

    def extrude_polygon_to_3d_box(self, polygon_coords_2d: List[List[float]], z_min: float, z_max: float) -> Dict[str, Any]:
        """
        Extrudes a 2D ring [[x, y], ...] into a 3D Polyhedron (Solid) representation
        compatible with CityJSON / Three.js BufferGeometry / Cesium polygons.
        Returns vertices [x, y, z] and polygon boundaries indexing those vertices.
        """
        ring = polygon_coords_2d[0] if isinstance(polygon_coords_2d[0][0], list) else polygon_coords_2d
        if len(ring) > 0 and ring[0] == ring[-1]:
            ring = ring[:-1] # Remove duplicate closing vertex

        n = len(ring)
        vertices = []

        # 1. Base vertices (Z_min): indices 0 to n-1
        for pt in ring:
            vertices.append([pt[0], pt[1], z_min])

        # 2. Top vertices (Z_max): indices n to 2n-1
        for pt in ring:
            vertices.append([pt[0], pt[1], z_max])

        boundaries = []

        # Base face (clockwise/counter-clockwise oriented)
        boundaries.append([[i for i in reversed(range(n))]])

        # Top face
        boundaries.append([[n + i for i in range(n)]])

        # Side quad faces (each represented as a 4-vertex polygon)
        for i in range(n):
            next_i = (i + 1) % n
            # Quad: (i, next_i, next_i + n, i + n)
            side_poly = [i, next_i, next_i + n, i + n]
            boundaries.append([side_poly])

        return {
            "type": "Solid",
            "lod": "1.2",
            "vertices": vertices,
            "boundaries": [boundaries], # Solid is list of Shells
            "z_bounds": [z_min, z_max]
        }

    def partition_floor_into_units(self, building_geom_dict: Dict[str, Any], floor_info: Dict[str, Any], unit_count: int = 4) -> List[Dict[str, Any]]:
        """
        Subdivides a floor horizontal boundary into individual apartment/unit volumetric spaces.
        """
        b_geom = shape(building_geom_dict)
        minx, miny, maxx, maxy = b_geom.bounds
        z_min = floor_info["base_elevation_m"]
        z_max = floor_info["roof_elevation_m"]
        fl_id = floor_info["id"]

        units = []
        if unit_count <= 1:
            coords = list(b_geom.exterior.coords)
            geom_3d = self.extrude_polygon_to_3d_box(coords, z_min, z_max)
            units.append({
                "id": f"{fl_id}_U1",
                "floor_id": fl_id,
                "unit_number": "Whole Floor",
                "unit_type": "COMMERCIAL_SUITE" if not floor_info.get("is_basement") else "PARKING_LOT",
                "geometry_2d": building_geom_dict,
                "geometry_3d": geom_3d,
                "z_bounds": [z_min, z_max]
            })
            return units

        # 2x2 grid partitioning for demo units
        mid_x = (minx + maxx) / 2.0
        mid_y = (miny + maxy) / 2.0

        quads = [
            (Polygon([(minx, miny), (mid_x, miny), (mid_x, mid_y), (minx, mid_y), (minx, miny)]), "A"),
            (Polygon([(mid_x, miny), (maxx, miny), (maxx, mid_y), (mid_x, mid_y), (mid_x, miny)]), "B"),
            (Polygon([(minx, mid_y), (mid_x, mid_y), (mid_x, maxy), (minx, maxy), (minx, mid_y)]), "C"),
            (Polygon([(mid_x, mid_y), (maxx, mid_y), (maxx, maxy), (mid_x, maxy), (mid_x, mid_y)]), "D"),
        ]

        fl_num = floor_info["floor_level"]

        for i, (quad_poly, letter) in enumerate(quads[:unit_count]):
            intersected = b_geom.intersection(quad_poly)
            if intersected.is_empty or intersected.area <= 0:
                continue

            poly_geom = intersected if isinstance(intersected, Polygon) else list(intersected.geoms)[0]
            coords = list(poly_geom.exterior.coords)
            geom_3d = self.extrude_polygon_to_3d_box(coords, z_min, z_max)

            u_num = f"{fl_num}0{i+1}" if fl_num > 0 else f"B1-{letter}"
            units.append({
                "id": f"{fl_id}_U{u_num}",
                "floor_id": fl_id,
                "unit_number": u_num,
                "unit_type": "APARTMENT_RESIDENTIAL" if fl_num > 0 else "BASEMENT_STORAGE",
                "geometry_2d": {"type": "Polygon", "coordinates": [coords]},
                "geometry_3d": geom_3d,
                "z_bounds": [z_min, z_max]
            })

        return units
