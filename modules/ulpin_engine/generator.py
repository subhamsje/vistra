"""
Module I: 3D ULPIN (Unique Land Parcel Identification Number) Engine
Extends India's 14-digit geospatial Bhuvan ULPIN standard to vertical 3D space:
Standard: IN-[STATE]-[DISTRICT]-P[PARCEL_ID]-B[BUILDING_ID]-F[FLOOR_ID]-U[UNIT_ID]
Generates deterministic identifiers and cryptographically hashes the provenance chain (SHA-256).
Adapted from BoundaryLens and Landmark-AI concepts.
"""

import hashlib
import json
from typing import Dict, Any, List, Optional
from shapely.geometry import shape

class ULPINEngine:
    def __init__(self, country: str = "IN", state: str = "KA", district: str = "BLR"):
        self.country = country
        self.state = state
        self.district = district

    def generate_parcel_ulpin(self, parcel: Dict[str, Any]) -> str:
        """Generates standard root 2D ULPIN based on centroid geocoding or survey ID"""
        props = parcel.get("properties", {})
        khasra = str(props.get("survey_khasra_no", parcel.get("id", "0"))).replace("/", "-")
        # Format: IN-KA-BLR-P102-4
        return f"{self.country}-{self.state}-{self.district}-P{khasra}"

    def generate_building_ulpin(self, building: Dict[str, Any], parent_parcel_ulpin: str) -> str:
        b_id = str(building.get("id", "1")).replace("BLDG_", "").replace("B_", "")
        return f"{parent_parcel_ulpin}-B{b_id}"

    def generate_floor_ulpin(self, floor: Dict[str, Any], parent_building_ulpin: str) -> str:
        fl_lvl = floor.get("floor_level", 0)
        fl_tag = f"B{abs(fl_lvl)}" if fl_lvl < 0 else f"{fl_lvl}"
        return f"{parent_building_ulpin}-F{fl_tag}"

    def generate_unit_ulpin(self, unit: Dict[str, Any], parent_floor_ulpin: str) -> str:
        u_num = str(unit.get("unit_number", "101")).replace(" ", "")
        return f"{parent_floor_ulpin}-U{u_num}"

    def compute_audit_hash(self, ulpin: str, geometry_dict: Dict[str, Any], z_bounds: List[float], provenance: Dict[str, Any]) -> str:
        """
        Creates an immutable SHA-256 cryptographic seal linking identity, 3D bounds, and provenance.
        """
        payload = {
            "ulpin": ulpin,
            "z_bounds": [round(z_bounds[0], 3), round(z_bounds[1], 3)],
            "provenance": provenance,
            "coords_sample": str(geometry_dict.get("coordinates", []))[:200]
        }
        serialized = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def apply_ulpins_to_cadastral_dataset(self, parcels: List[Dict[str, Any]], buildings: List[Dict[str, Any]], floors: List[Dict[str, Any]], units: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Processes an entire multi-tier cadastral dataset, assigning ULPINs and audit seals"""
        parcel_ulpin_map = {}
        building_ulpin_map = {}
        floor_ulpin_map = {}

        # 1. Parcels
        for p in parcels:
            u = self.generate_parcel_ulpin(p)
            p["ulpin_3d"] = u
            parcel_ulpin_map[p["id"]] = u
            z_min = p.get("properties", {}).get("base_elevation_m", 920.0)
            z_max = p.get("properties", {}).get("max_elevation_m", 960.0)
            p["audit_hash"] = self.compute_audit_hash(u, p.get("geometry", {}), [z_min, z_max], p.get("provenance", {}))

        # 2. Buildings
        for b in buildings:
            p_id = b.get("properties", {}).get("parent_parcel_id") or b.get("parent_id")
            parent_ulpin = parcel_ulpin_map.get(p_id, f"{self.country}-{self.state}-{self.district}-P_UNMAPPED")
            u = self.generate_building_ulpin(b, parent_ulpin)
            b["ulpin_3d"] = u
            building_ulpin_map[b["id"]] = u
            z_min = b.get("properties", {}).get("base_elevation_m", 920.0)
            z_max = b.get("properties", {}).get("roof_elevation_m", 935.0)
            b["audit_hash"] = self.compute_audit_hash(u, b.get("geometry", {}), [z_min, z_max], b.get("provenance", {}))

        # 3. Floors
        for fl in floors:
            b_id = fl.get("building_id")
            parent_ulpin = building_ulpin_map.get(b_id, f"{self.country}-{self.state}-{self.district}-B_UNMAPPED")
            u = self.generate_floor_ulpin(fl, parent_ulpin)
            fl["ulpin_3d"] = u
            floor_ulpin_map[fl["id"]] = u
            z_min = fl.get("base_elevation_m", 920.0)
            z_max = fl.get("roof_elevation_m", 923.0)
            fl["audit_hash"] = self.compute_audit_hash(u, {}, [z_min, z_max], fl.get("provenance", {}))

        # 4. Units
        for un in units:
            fl_id = un.get("floor_id")
            parent_ulpin = floor_ulpin_map.get(fl_id, f"{self.country}-{self.state}-{self.district}-F_UNMAPPED")
            u = self.generate_unit_ulpin(un, parent_ulpin)
            un["ulpin_3d"] = u
            z_bounds = un.get("z_bounds", [920.0, 923.0])
            un["audit_hash"] = self.compute_audit_hash(u, un.get("geometry_2d", {}), z_bounds, {"source": "3D_PARCEL_SUBDIVISION"})

        return {
            "total_ulpins_generated": len(parcels) + len(buildings) + len(floors) + len(units),
            "sample_ulpins": [
                parcels[0]["ulpin_3d"] if parcels else None,
                buildings[0]["ulpin_3d"] if buildings else None,
                floors[0]["ulpin_3d"] if floors else None,
                units[0]["ulpin_3d"] if units else None
            ]
        }
