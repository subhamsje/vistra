"""
GIS Height and Floor Estimation Module for 3D ULPIN Building Extrusion.
"""

from typing import Any, Dict, List, Optional, Union
import geopandas as gpd

# Configurable defaults for height & floor estimation
DEFAULT_FLOOR_HEIGHT_M: float = 3.0  # Default floor-to-floor height in meters
DEFAULT_FLOORS: int = 3             # Default floor count if unspecified


def estimate_building_height(
    floors: Optional[Union[int, float]] = None,
    height_m: Optional[Union[int, float]] = None,
    floor_height_m: float = DEFAULT_FLOOR_HEIGHT_M,
    height_source: Optional[str] = None
) -> Dict[str, Any]:
    """
    Estimate or derive building height and floor count.
    
    Args:
        floors: Number of floors (optional if height_m is provided).
        height_m: Height in meters (optional if floors is provided).
        floor_height_m: Configurable floor height multiplier in meters (default 3.0m).
        height_source: Source tag ("ESTIMATED", "LIDAR", "DSM", "SYNTHETIC").
        
    Returns:
        Dict containing validated 'height_m', 'floors', 'height_source', and 'floor_height_m'.
    """
    # Ensure positive floor height multiplier
    if floor_height_m is None or float(floor_height_m) <= 0:
        floor_height_m = DEFAULT_FLOOR_HEIGHT_M
    else:
        floor_height_m = float(floor_height_m)

    source = height_source or "ESTIMATED"

    # Case 1: height_m is explicitly provided
    if height_m is not None and float(height_m) > 0:
        h = float(height_m)
        computed_floors = max(1, int(round(h / floor_height_m)))
        # If floors was not provided or conflicts with height_m, use computed floors
        if floors is None or abs(float(floors) * floor_height_m - h) > 0.1:
            f = computed_floors
        else:
            f = int(floors)

        return {
            "height_m": round(h, 2),
            "floors": f,
            "floor_height_m": floor_height_m,
            "height_source": source
        }

    # Case 2: floors is explicitly provided
    if floors is not None and int(floors) > 0:
        f = int(floors)
        h = round(f * floor_height_m, 2)
        return {
            "height_m": h,
            "floors": f,
            "floor_height_m": floor_height_m,
            "height_source": source
        }

    # Case 3: Missing/Invalid inputs -> Use default floor count & configurable floor height
    f = DEFAULT_FLOORS
    h = round(f * floor_height_m, 2)
    return {
        "height_m": h,
        "floors": f,
        "floor_height_m": floor_height_m,
        "height_source": "ESTIMATED" if height_source is None else source
    }


def apply_height_estimation_to_gdf(
    gdf: gpd.GeoDataFrame,
    default_floor_height_m: float = DEFAULT_FLOOR_HEIGHT_M,
    default_floors: int = DEFAULT_FLOORS
) -> gpd.GeoDataFrame:
    """
    Apply height and floor estimation across all rows of a GeoDataFrame.
    Populates base_height (0.0) and extruded_height (height_m) for 3D extrusion.
    """
    gdf_out = gdf.copy()

    heights = []
    floors_list = []
    sources = []
    floor_heights = []

    for _, row in gdf_out.iterrows():
        input_height = row.get("height_m") if "height_m" in row and row["height_m"] is not None else None
        input_floors = row.get("floors") if "floors" in row and row["floors"] is not None else None
        input_source = row.get("height_source") if "height_source" in row and row["height_source"] is not None else None

        res = estimate_building_height(
            floors=input_floors,
            height_m=input_height,
            floor_height_m=default_floor_height_m,
            height_source=input_source
        )

        heights.append(res["height_m"])
        floors_list.append(res["floors"])
        sources.append(res["height_source"])
        floor_heights.append(res["floor_height_m"])

    gdf_out["height_m"] = heights
    gdf_out["floors"] = floors_list
    gdf_out["height_source"] = sources
    gdf_out["floor_height_m"] = floor_heights

    # Populate 3D GIS properties
    gdf_out["base_height"] = 0.0
    gdf_out["extruded_height"] = gdf_out["height_m"]

    return gdf_out
