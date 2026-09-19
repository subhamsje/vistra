"""
Service script for importing processed 3D GeoJSON data into PostGIS database.
"""

import os
import sys
from pathlib import Path
import geopandas as gpd
from sqlalchemy import text

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database.connection import get_db_engine, DATABASE_URL, check_db_connection
from backend.database.models import Base

DEFAULT_GEOJSON_PATH = Path(__file__).parent.parent.parent / "data" / "processed" / "buildings_3d.geojson"


def import_geojson_to_postgis(
    geojson_path: str = str(DEFAULT_GEOJSON_PATH),
    db_url: str = DATABASE_URL,
    if_exists: str = "replace"
) -> int:
    """
    Import 3D building GeoJSON file into PostGIS database table 'buildings'.
    
    Args:
        geojson_path: Path to input 3D GeoJSON file.
        db_url: Database connection string.
        if_exists: Strategy for existing table ('append', 'replace', 'fail').
        
    Returns:
        Number of building records imported into PostGIS.
    """
    path = Path(geojson_path)
    if not path.exists():
        raise FileNotFoundError(f"GeoJSON file not found: {geojson_path}")

    is_conn, msg = check_db_connection(db_url)
    if not is_conn:
        raise ConnectionError(f"Cannot import to PostGIS: {msg}")

    print(f"Loading GeoJSON from {geojson_path}...")
    gdf = gpd.read_file(geojson_path)
    print(f"Loaded {len(gdf)} features from GeoJSON.")

    # Ensure CRS is EPSG:4326 WGS84
    if gdf.crs != "EPSG:4326":
        gdf = gdf.to_crs("EPSG:4326")

    # Ensure all required schema columns exist
    required_defaults = {
        "base_height": 0.0,
        "extruded_height": 12.0,
        "provenance": "SYNTHETIC",
        "confidence": None,
        "class_id": None,
        "class_name": None
    }
    for col, default_val in required_defaults.items():
        if col not in gdf.columns:
            gdf[col] = default_val

    # Ensure 'id' column exists to match BuildingModel primary key
    if "id" not in gdf.columns:
        gdf["id"] = range(1, len(gdf) + 1)

    engine = get_db_engine(db_url)

    # Enable PostGIS extension and ensure Base metadata exists
    with engine.begin() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        except Exception as e:
            print(f"PostGIS extension check warning: {e}")

    Base.metadata.create_all(bind=engine)

    # Import GeoDataFrame into PostGIS using GeoPandas to_postgis
    print("Writing GeoDataFrame to PostGIS table 'buildings'...")
    gdf.to_postgis(
        name="buildings",
        con=engine,
        if_exists=if_exists,
        index=False,
        schema="public"
    )

    print(f"Successfully imported {len(gdf)} building features into PostGIS 'buildings' table.")
    return len(gdf)


if __name__ == "__main__":
    try:
        count = import_geojson_to_postgis()
        print(f"Import completed successfully ({count} buildings).")
    except Exception as err:
        print(f"Import failed: {err}")
        sys.exit(1)
