"""
Module K: 3D Visualization Pipeline & Data Serializer
Generates CityJSON 1.1 / 2.0 structures, GeoJSON FeatureCollections, and Cesium 3D payloads.
Supports local ground relative extrusion, vertical floor explosion, and semantic multi-storey styling.
"""

from typing import List, Dict, Any, Tuple, Optional
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

    def generate_cesium_payload(
        self,
        parcels: List[Dict[str, Any]],
        buildings: List[Dict[str, Any]],
        floors: List[Dict[str, Any]],
        units: List[Dict[str, Any]],
        explode_factor: float = 0.0,
        selected_building_id: Optional[str] = None,
        selected_entity_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates enriched GeoJSON/3D visualization objects ready for CesiumJS and Three.js.
        Calculates local ground relative elevations so geometry sits solidly on terrain,
        plus absolute AMSL heights for cadastral inspection.
        Dynamically supports multi-building floor explosion, unit selection, and transparent context buildings.
        """
        features = []
        ground_datum = 920.0
        if parcels and "properties" in parcels[0]:
            ground_datum = float(parcels[0]["properties"].get("base_elevation_m", 920.0))

        # 1. Parcels (Cadastral ground demarcation - Thin crisp boundary)
        for p in parcels:
            props = dict(p.get("properties", {}))
            p_id = p["id"]
            props["id"] = p_id
            props["ulpin_3d"] = p.get("ulpin_3d")
            props["entity_type"] = "PARCEL"
            props["color"] = "#22c55e" # Emerald green cadastral boundary
            props["local_base_m"] = 0.0
            props["local_roof_m"] = 0.35
            props["amsl_base_m"] = props.get("base_elevation_m", ground_datum)
            props["is_selected"] = (selected_entity_id == p_id or selected_entity_id == p.get("ulpin_3d"))
            features.append({
                "type": "Feature",
                "id": p_id,
                "geometry": p.get("geometry"),
                "properties": props
            })

        # Determine which buildings to explode into units vs render as solid context
        bldg_ids = [b["id"] for b in buildings]
        target_b_id = selected_building_id if (selected_building_id and selected_building_id in bldg_ids) else None

        # 2. Buildings
        for b in buildings:
            b_id = b["id"]
            # If a specific building is selected and this is not it, render it as semi-transparent mass context
            if target_b_id and b_id != target_b_id:
                b_props = dict(b.get("properties", {}))
                height = float(b_props.get("height_m", 15.0))
                
                features.append({
                    "type": "Feature",
                    "id": b_id,
                    "geometry": b.get("geometry"),
                    "properties": {
                        "id": b_id,
                        "ulpin_3d": b.get("ulpin_3d"),
                        "entity_type": "BUILDING",
                        "building_id": b_id,
                        "name": b_props.get("name", b_id),
                        "local_base_m": 0.0,
                        "local_roof_m": height,
                        "height_m": height,
                        "amsl_base_m": b_props.get("base_elevation_m", ground_datum),
                        "amsl_roof_m": b_props.get("roof_elevation_m", ground_datum + height),
                        "color": "#475569", # Architectural slate glass
                        "is_context": True,
                        "is_selected": (selected_entity_id == b_id or selected_entity_id == b.get("ulpin_3d")),
                        "audit_hash": b.get("audit_hash")
                    }
                })

        # 3. Units & Storeys for exploded/active buildings
        active_units = units if not target_b_id else [u for u in units if any(f["id"] == u.get("floor_id") and f.get("building_id") == target_b_id for f in floors)]

        for un in active_units:
            fl_id = un.get("floor_id")
            fl = next((f for f in floors if f["id"] == fl_id), None)
            fl_lvl = fl.get("floor_level", 1) if fl else 1
            b_id = fl.get("building_id") if fl else "BLDG_ALPHA"

            amsl_min = un.get("z_bounds", [920.0, 923.0])[0]
            amsl_max = un.get("z_bounds", [920.0, 923.0])[1]
            unit_h = amsl_max - amsl_min

            # Local elevation relative to ground surface
            if fl and fl.get("is_basement"):
                local_min = -3.0
                local_max = 0.0
                disp_lvl = 0
            else:
                local_min = max(0.0, amsl_min - ground_datum)
                local_max = local_min + unit_h
                disp_lvl = fl_lvl

            # Apply vertical floor explosion displacement
            exploded_base = local_min + (disp_lvl * explode_factor)
            exploded_roof = local_max + (disp_lvl * explode_factor)

            # Palette for floors
            if fl and fl.get("is_basement"):
                color = "#475569" # Slate grey basement
            elif fl_lvl == 1:
                color = "#f59e0b" # Warm Amber
            elif fl_lvl == 2:
                color = "#10b981" # Emerald Green
            elif fl_lvl == 3:
                color = "#06b6d4" # Bright Cyan
            elif fl_lvl == 3:
                color = "#3b82f6" # Royal Blue
            elif fl_lvl == 4:
                color = "#8b5cf6" # Vibrant Purple
            elif fl_lvl == 5:
                color = "#ec4899" # Pink
            elif fl_lvl == 6:
                color = "#f43f5e" # Rose
            else:
                color = "#6366f1" # Indigo

            u_id = un["id"]
            is_selected = (selected_entity_id == u_id or selected_entity_id == un.get("ulpin_3d") or selected_entity_id == fl_id)

            props = {
                "id": u_id,
                "ulpin_3d": un.get("ulpin_3d"),
                "entity_type": "UNIT",
                "building_id": b_id,
                "floor_id": fl_id,
                "floor_level": fl_lvl,
                "unit_number": un.get("unit_number"),
                "unit_type": un.get("unit_type"),
                "local_base_m": round(exploded_base, 2),
                "local_roof_m": round(exploded_roof, 2),
                "height_m": round(unit_h, 2),
                "amsl_base_m": round(amsl_min, 2),
                "amsl_roof_m": round(amsl_max, 2),
                "color": "#facc15" if is_selected else color, # Highlight if selected
                "is_context": False,
                "is_selected": is_selected,
                "audit_hash": un.get("audit_hash")
            }

            features.append({
                "type": "Feature",
                "id": u_id,
                "geometry": un.get("geometry_2d"),
                "properties": props
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }
