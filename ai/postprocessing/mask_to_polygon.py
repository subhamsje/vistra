"""
AI Postprocessing: Segmentation Mask to GIS Polygon Conversion & 3D Integration.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import geopandas as gpd
import os
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon
from shapely.validation import make_valid
from gis.height_estimation import estimate_building_height, apply_height_estimation_to_gdf, DEFAULT_FLOOR_HEIGHT_M, DEFAULT_FLOORS


def mask_to_polygon(mask_coords: Optional[Union[List, Tuple]]) -> Tuple[Optional[Polygon], Optional[str]]:
    """
    Convert YOLO segmentation mask coordinates or bounding box to a valid Shapely Polygon.
    
    Args:
        mask_coords: List of [x, y] coordinates, or [xmin, ymin, xmax, ymax] bounding box.
        
    Returns:
        Tuple of (Shapely Polygon, None) if successful, or (None, discard_reason) if invalid/discarded.
    """
    if mask_coords is None or len(mask_coords) == 0:
        return None, "Empty or missing mask coordinates"

    # Case 1: Bounding box fallback [xmin, ymin, xmax, ymax]
    if len(mask_coords) == 4 and not isinstance(mask_coords[0], (list, tuple)):
        xmin, ymin, xmax, ymax = mask_coords
        if xmin >= xmax or ymin >= ymax:
            return None, "Invalid bounding box dimensions (zero or negative area)"
        coords = [
            [xmin, ymin],
            [xmin, ymax],
            [xmax, ymax],
            [xmax, ymin],
            [xmin, ymin]
        ]
    else:
        coords = list(mask_coords)

    # Ensure coordinate pairs are valid
    clean_coords = []
    for pt in coords:
        if isinstance(pt, (list, tuple)) and len(pt) >= 2:
            clean_coords.append((float(pt[0]), float(pt[1])))

    # Remove consecutive duplicate points
    dedup_coords = []
    for pt in clean_coords:
        if not dedup_coords or dedup_coords[-1] != pt:
            dedup_coords.append(pt)

    # Need at least 3 distinct vertices to form a polygon
    if len(dedup_coords) < 3:
        return None, f"Insufficient distinct vertices ({len(dedup_coords)} < 3)"

    # Close polygon if not closed
    if dedup_coords[0] != dedup_coords[-1]:
        dedup_coords.append(dedup_coords[0])

    try:
        poly = Polygon(dedup_coords)
    except Exception as e:
        return None, f"Failed to construct Polygon: {e}"

    # Repair invalid or self-intersecting geometries first
    if not poly.is_valid:
        try:
            repaired = make_valid(poly)
        except Exception:
            repaired = poly.buffer(0)

        # Extract largest Polygon if make_valid produced MultiPolygon or GeometryCollection
        if isinstance(repaired, (MultiPolygon, GeometryCollection)):
            polygons = [g for g in repaired.geoms if isinstance(g, Polygon) and g.area > 0]
            if not polygons:
                return None, "Geometry repair resulted in no valid Polygon components"
            poly = max(polygons, key=lambda p: p.area)
        elif isinstance(repaired, Polygon):
            poly = repaired
        else:
            return None, f"Geometry repair produced unsupported type: {type(repaired).__name__}"

    # Final validation checks
    if not poly.is_valid:
        return None, "Geometry remains invalid after repair attempt"
    if poly.area <= 0:
        return None, f"Polygon has zero or negative area ({poly.area})"

    return poly, None


def detections_to_geojson_features(
    detections: List[Dict[str, Any]],
    floor_height_m: float = DEFAULT_FLOOR_HEIGHT_M,
    default_floors: Optional[int] = DEFAULT_FLOORS,
    default_height_m: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Convert raw YOLO detection dictionaries into valid GeoJSON feature dictionaries.
    
    Args:
        detections: List of detection result dictionaries.
        floor_height_m: Configurable floor height multiplier (default 3.0m).
        default_floors: Optional fallback floor count.
        default_height_m: Optional fallback building height in meters.
        
    Returns:
        List of GeoJSON feature dictionaries with preserved AI metadata, height estimation, and valid geometry.
    """
    features: List[Dict[str, Any]] = []

    for idx, det in enumerate(detections):
        mask_coords = det.get("segmentation_mask")
        bbox = det.get("bounding_box")

        # Try segmentation mask first, fallback to bounding box
        target_coords = mask_coords if (mask_coords and len(mask_coords) >= 3) else bbox

        poly, discard_reason = mask_to_polygon(target_coords)

        if poly is None:
            print(f"Discarding detection #{idx + 1} ({det.get('class_name', 'unknown')}): {discard_reason}")
            continue

        building_id = f"AI_BLD_{idx + 1:03d}"
        confidence = float(det.get("confidence", 0.0))
        class_id = int(det.get("class_id", 0))
        class_name = str(det.get("class_name", "building"))

        # Calculate height and floor parameters via height_estimation module
        input_floors = det.get("floors", default_floors)
        input_height = det.get("height_m", default_height_m)
        input_source = det.get("height_source", "ESTIMATED")

        h_est = estimate_building_height(
            floors=input_floors,
            height_m=input_height,
            floor_height_m=floor_height_m,
            height_source=input_source
        )

        # Format coordinates for GeoJSON Polygon [[[x, y], ...]]
        exterior_coords = list(poly.exterior.coords)
        geojson_coords = [[[float(x), float(y)] for x, y in exterior_coords]]

        feature = {
            "type": "Feature",
            "properties": {
                "building_id": building_id,
                "height_m": h_est["height_m"],
                "floors": h_est["floors"],
                "base_height": 0.0,
                "extruded_height": h_est["height_m"],
                "provenance": "AI_DETECTED",
                "confidence": confidence,
                "class_id": class_id,
                "class_name": class_name,
                "height_source": h_est["height_source"],
                "floor_height_m": h_est["floor_height_m"],
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": geojson_coords,
            },
        }
        features.append(feature)

    return features


def process_detections_to_3d_geojson(
    detections: List[Dict[str, Any]],
    output_path: str,
    floor_height_m: float = DEFAULT_FLOOR_HEIGHT_M,
    default_floors: Optional[int] = DEFAULT_FLOORS,
    default_height_m: Optional[float] = None,
) -> gpd.GeoDataFrame:
    """
    Connect AI detection polygons directly to the 3D-ready GIS pipeline and save to GeoJSON.
    
    Args:
        detections: List of YOLO building detections.
        output_path: Path where 3D GeoJSON will be saved.
        floor_height_m: Configurable floor height multiplier.
        default_floors: Fallback floor count.
        default_height_m: Fallback building height in meters.
        
    Returns:
        GeoDataFrame of 3D-ready building features containing all required GIS and AI fields.
    """
    features = detections_to_geojson_features(
        detections,
        floor_height_m=floor_height_m,
        default_floors=default_floors,
        default_height_m=default_height_m
    )

    required_cols = [
        "building_id", "height_m", "floors", "base_height", "extruded_height",
        "provenance", "confidence", "class_id", "class_name", "height_source",
        "floor_height_m", "geometry"
    ]

    if not features:
        gdf_empty = gpd.GeoDataFrame(columns=required_cols, crs="EPSG:4326")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        gdf_empty.to_file(output_path, driver="GeoJSON")
        return gdf_empty

    # Create GeoDataFrame from GeoJSON features
    gdf = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")
    gdf_3d = apply_height_estimation_to_gdf(gdf, default_floor_height_m=floor_height_m)

    # Reorder columns predictably
    gdf_final = gdf_3d[required_cols].copy()

    # Save to output file
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    gdf_final.to_file(output_path, driver="GeoJSON")
    print(f"Saved {len(gdf_final)} AI-detected 3D building features to {output_path}")

    return gdf_final
