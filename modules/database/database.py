"""
Module J: 3D Spatial Database & Store
Implements a 3DCityDB / CityJSON compatible spatial database using SQLite / SpatiaLite and JSON store.
Stores Parcels, Buildings, Storeys, Units, Geometry Solids, 3D ULPINs, and RRR metadata.
"""

import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

class SpatialDatabase:
    def __init__(self, db_path: str = "vistra_cadastre.db"):
        self.db_path = db_path
        self._init_tables()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_tables(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Parcels table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS parcels (
                id TEXT PRIMARY KEY,
                ulpin_3d TEXT UNIQUE,
                survey_khasra_no TEXT,
                district TEXT,
                state TEXT,
                base_elevation_m REAL,
                max_elevation_m REAL,
                geometry_geojson TEXT,
                rrr_data TEXT,
                audit_hash TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # Buildings table (Adapted from 3DCityDB Building / ThematicSurface)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS buildings (
                id TEXT PRIMARY KEY,
                ulpin_3d TEXT UNIQUE,
                parcel_id TEXT,
                name TEXT,
                base_elevation_m REAL,
                height_m REAL,
                roof_elevation_m REAL,
                geometry_geojson TEXT,
                geometry_3d_cityjson TEXT,
                audit_hash TEXT,
                FOREIGN KEY (parcel_id) REFERENCES parcels(id)
            )
            """)

            # Floors / Storeys table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS floors (
                id TEXT PRIMARY KEY,
                ulpin_3d TEXT UNIQUE,
                building_id TEXT,
                floor_level INTEGER,
                name TEXT,
                base_elevation_m REAL,
                roof_elevation_m REAL,
                is_basement BOOLEAN,
                audit_hash TEXT,
                FOREIGN KEY (building_id) REFERENCES buildings(id)
            )
            """)

            # 3D Units table (Adapted from 3D-Cadastre BuildingUnit)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS units (
                id TEXT PRIMARY KEY,
                ulpin_3d TEXT UNIQUE,
                floor_id TEXT,
                unit_number TEXT,
                unit_type TEXT,
                geometry_2d TEXT,
                geometry_3d TEXT,
                audit_hash TEXT,
                FOREIGN KEY (floor_id) REFERENCES floors(id)
            )
            """)

            # Governance Audit Ledger (Adapted from Landmark-AI & gujarat-landchain)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS governance_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id TEXT,
                ulpin_3d TEXT,
                action TEXT,
                previous_state TEXT,
                new_state TEXT,
                reviewer TEXT,
                notes TEXT,
                audit_hash TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            conn.commit()

    def insert_dataset(self, parcels: List[Dict[str, Any]], buildings: List[Dict[str, Any]], floors: List[Dict[str, Any]], units: List[Dict[str, Any]]):
        """Atomically persists the complete cadastral hierarchy"""
        with self.get_connection() as conn:
            cur = conn.cursor()

            # Insert Parcels
            for p in parcels:
                props = p.get("properties", {})
                cur.execute("""
                INSERT OR REPLACE INTO parcels (id, ulpin_3d, survey_khasra_no, district, state, base_elevation_m, max_elevation_m, geometry_geojson, rrr_data, audit_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    p["id"],
                    p.get("ulpin_3d"),
                    props.get("survey_khasra_no"),
                    props.get("district", "BLR"),
                    props.get("state", "KA"),
                    props.get("base_elevation_m", 920.0),
                    props.get("max_elevation_m", 960.0),
                    json.dumps(p.get("geometry", {})),
                    json.dumps(props.get("rrr", {})),
                    p.get("audit_hash")
                ))

            # Insert Buildings
            for b in buildings:
                props = b.get("properties", {})
                cur.execute("""
                INSERT OR REPLACE INTO buildings (id, ulpin_3d, parcel_id, name, base_elevation_m, height_m, roof_elevation_m, geometry_geojson, geometry_3d_cityjson, audit_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    b["id"],
                    b.get("ulpin_3d"),
                    props.get("parent_parcel_id"),
                    props.get("name", b["id"]),
                    props.get("base_elevation_m", 920.0),
                    props.get("height_m", 15.0),
                    props.get("roof_elevation_m", 935.0),
                    json.dumps(b.get("geometry", {})),
                    json.dumps(b.get("geometry_3d", {})),
                    b.get("audit_hash")
                ))

            # Insert Floors
            for fl in floors:
                cur.execute("""
                INSERT OR REPLACE INTO floors (id, ulpin_3d, building_id, floor_level, name, base_elevation_m, roof_elevation_m, is_basement, audit_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    fl["id"],
                    fl.get("ulpin_3d"),
                    fl.get("building_id"),
                    fl.get("floor_level"),
                    fl.get("name"),
                    fl.get("base_elevation_m"),
                    fl.get("roof_elevation_m"),
                    fl.get("is_basement", False),
                    fl.get("audit_hash")
                ))

            # Insert Units
            for un in units:
                cur.execute("""
                INSERT OR REPLACE INTO units (id, ulpin_3d, floor_id, unit_number, unit_type, geometry_2d, geometry_3d, audit_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    un["id"],
                    un.get("ulpin_3d"),
                    un.get("floor_id"),
                    un.get("unit_number"),
                    un.get("unit_type"),
                    json.dumps(un.get("geometry_2d", {})),
                    json.dumps(un.get("geometry_3d", {})),
                    un.get("audit_hash")
                ))

            conn.commit()

    def get_summary_stats(self) -> Dict[str, int]:
        with self.get_connection() as conn:
            cur = conn.cursor()
            parcels = cur.execute("SELECT COUNT(*) FROM parcels").fetchone()[0]
            buildings = cur.execute("SELECT COUNT(*) FROM buildings").fetchone()[0]
            floors = cur.execute("SELECT COUNT(*) FROM floors").fetchone()[0]
            units = cur.execute("SELECT COUNT(*) FROM units").fetchone()[0]
            audit_logs = cur.execute("SELECT COUNT(*) FROM governance_audit_log").fetchone()[0]
            return {
                "parcels": parcels,
                "buildings": buildings,
                "floors": floors,
                "units": units,
                "audit_logs": audit_logs
            }
