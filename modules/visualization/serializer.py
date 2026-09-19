"""
Module K: 3D Visualization Pipeline & Data Serializer
Generates CityJSON 1.1 / 2.0 structures, GeoJSON FeatureCollections, and Cesium 3D payloads.
Supports interactive floor-explosion offsets and unit color encodings.
Adapted from 3D-Cadastre CityJSON exporter and BoundaryLens 3D viewer.
"""

from typing import List, Dict, Any, Tuple
import json

class Visualization3DSerializer:
    def __init__(self):
        pass

    def export_to_cityjson(self, parcels: List[Dict[str, Any]], buildings: List[Dict[str, Any]], floors: List[Dict[str, Any]], units: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Produces an OGC-standard CityJSON document with CityObjects for Buildings, Storeys, and BuildingUnits.
        """
        all_vertices = []
        vertex_map = {}

        def get_v_idx(x: float, y: float, z: float) -> int:
            key = (round(x, 6), round(y, 6), round(z, 3))
            if key not in vertex_map:
                vertex_map[key] = len(all_vertices)
                all_vertices.append([x, y, z])
            return vertex_map[key]

        city_objects = {}

        # 1. Buildings
        for b in buildings:
            b_id = b["id"]
            city_objects[b_id] = {
                "type": "Building",
                "attributes": {
                    "ulpin_3d": b.get("ulpin_3d"),
                    "name": b.get("properties", {}).get("name", b_id),
                    "base_elevation_m": b.get("properties", {}).get("base_elevation_m"),
                    "roof_elevation_m": b.get("properties", {}).get("roof_elevation_m")
                },
                "children": [fl["id"] for fl in floors if fl.get("building_id") == b_id]
            }

        # 2. Storeys / Floors
        for fl in floors:
            fl_id = fl["id"]
            city_objects[fl_id] = {
                "type": "BuildingStorey",
                "attributes": {
                    "ulpin_3d": fl.get("ulpin_3d"),
                    "floor_level": fl.get("floor_level"),
                    "is_basement": fl.get("is_basement", False),
                    "base_elevation_m": fl.get("base_elevation_m"),
                    "roof_elevation_m": fl.get("roof_elevation_m")
                },
                "parents": [fl.get("building_id")],
                "children": [u["id"] for u in units if u.get("floor_id") == fl_id]
            }

        # 3. Units
        for un in units:
            u_id = un["id"]
            geom_3d = un.get("geometry_3d", {})
            raw_verts = geom_3d.get("vertices", [])
            raw_bounds = geom_3d.get("boundaries", [])

            indexed_boundaries = []
            if raw_verts and raw_bounds:
                v_offset_map = {}
                for local_i, v in enumerate(raw_verts):
                    v_offset_map[local_i] = get_v_idx(v[0], v[1], v[2])

                for shell in raw_bounds:
                    shell_faces = []
                    for face in shell:
                        ring = face[0]
                        mapped_ring = [v_offset_map[idx] for idx in ring if idx in v_offset_map]
                        shell_faces.append([mapped_ring])
                    indexed_boundaries.append(shell_faces)

            city_objects[u_id] = {
                "type": "BuildingUnit",
                "attributes": {
                    "ulpin_3d": un.get("ulpin_3d"),
                    "unit_number": un.get("unit_number"),
                    "unit_type": un.get("unit_type")
                },
                "parents": [un.get("floor_id")],
                "geometry": [{
                    "type": "Solid",
                    "lod": "1.2",
                    "boundaries": indexed_boundaries
                }] if indexed_boundaries else []
            }

        return {
            "type": "CityJSON",
            "version": "1.1",
            "extensions": {
                "Cadastre": {
                    "url": "https://cityjson.org/extensions/download/cadastre.json",
                    "version": "1.0"
                }
            },
            "CityObjects": city_objects,
            "vertices": all_vertices,
            "metadata": {
                "title": "VISTRA 3D Cadastral Urban Property Model",
                "referenceSystem": "https://www.opengis.net/def/crs/EPSG/0/4326"
            }
        }

    def generate_cesium_payload(self, parcels: List[Dict[str, Any]], buildings: List[Dict[str, Any]], floors: List[Dict[str, Any]], units: List[Dict[str, Any]], explode_factor: float = 0.0) -> Dict[str, Any]:
        """
        Generates enriched GeoJSON/3D visualization objects ready for CesiumJS and Three.js.
        Supports dynamic vertical floor explosion: z += floor_level * explode_factor.
        """
        features = []

        # 1. Parcels (Ground Polygon)
        for p in parcels:
            props = dict(p.get("properties", {}))
            props["ulpin_3d"] = p.get("ulpin_3d")
            props["entity_type"] = "PARCEL"
            props["color"] = "#22c55e" # Green
            props["base_m"] = props.get("base_elevation_m", 920.0)
            features.append({
                "type": "Feature",
                "id": p["id"],
                "geometry": p.get("geometry"),
                "properties": props
            })

        # 2. Units / Floors (Volumetric Features)
        for un in units:
            fl_id = un.get("floor_id")
            # find floor
            fl = next((f for f in floors if f["id"] == fl_id), None)
            fl_lvl = fl.get("floor_level", 0) if fl else 0
            
            z_min = un.get("z_bounds", [920.0, 923.0])[0] + (fl_lvl * explode_factor)
            z_max = un.get("z_bounds", [920.0, 923.0])[1] + (fl_lvl * explode_factor)

            # Palette styling
            if fl and fl.get("is_basement"):
                color = "#64748b" # Slate
            elif fl_lvl == 1:
                color = "#3b82f6" # Blue
            elif fl_lvl == 2:
                color = "#8b5cf6" # Purple
            elif fl_lvl == 3:
                color = "#ec4899" # Pink
            else:
                color = "#f59e0b" # Amber

            props = {
                "id": un["id"],
                "ulpin_3d": un.get("ulpin_3d"),
                "entity_type": "UNIT",
                "floor_id": fl_id,
                "floor_level": fl_lvl,
                "unit_number": un.get("unit_number"),
                "unit_type": un.get("unit_type"),
                "base_m": round(z_min, 2),
                "roof_m": round(z_max, 2),
                "height_m": round(z_max - z_min, 2),
                "color": color,
                "audit_hash": un.get("audit_hash")
            }

            features.append({
                "type": "Feature",
                "id": un["id"],
                "geometry": un.get("geometry_2d"),
                "properties": props
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }
