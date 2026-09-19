import geopandas as gpd
from shapely.geometry import Polygon, MultiPolygon
from shapely.validation import make_valid
import pyproj
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

INPUT_PATH = "data/synthetic/buildings.geojson"
OUTPUT_PATH = "data/processed/buildings_3d.geojson"

def validate_geometry(geometry):
    """Validate and fix geometry if needed."""
    if not geometry.is_valid:
        geometry = make_valid(geometry)
    return geometry

def process_buildings_to_3d(input_path, output_path):
    """
    Convert 2D building footprints to 3D-ready GeoJSON with height information.
    
    Args:
        input_path: Path to input GeoJSON file
        output_path: Path to output 3D-ready GeoJSON file
    """
    print(f"Loading buildings from {input_path}...")
    
    # Load the GeoJSON
    gdf = gpd.read_file(input_path)
    
    print(f"Loaded {len(gdf)} buildings")
    
    # Validate geometries
    print("Validating geometries...")
    gdf['geometry'] = gdf['geometry'].apply(validate_geometry)
    
    # Check current CRS
    print(f"Current CRS: {gdf.crs}")
    
    # Reproject to a suitable projected CRS for metric calculations
    # Using UTM zone for the approximate location (Delhi area - UTM 43N)
    target_crs = "EPSG:32643"  # UTM Zone 43N
    print(f"Reprojecting to {target_crs} for metric calculations...")
    gdf_projected = gdf.to_crs(target_crs)
    
    # Calculate 3D properties
    print("Calculating 3D properties...")
    
    # Base height (ground level) - set to 0 for now
    gdf_projected['base_height'] = 0.0
    
    # Extruded height is the building height
    gdf_projected['extruded_height'] = gdf_projected['height_m']
    
    # Preserve original and AI metadata properties if present
    base_required = ['building_id', 'height_m', 'floors', 'base_height', 'extruded_height', 'provenance']
    optional_fields = ['confidence', 'class_id', 'class_name']
    
    # Ensure all required fields exist
    for field in base_required:
        if field not in gdf_projected.columns:
            print(f"Warning: Field '{field}' not found in input data")
    
    selected_fields = [f for f in base_required + optional_fields if f in gdf_projected.columns]
    gdf_3d = gdf_projected[selected_fields + ['geometry']].copy()
    
    # Reproject back to WGS84 for output (standard for GeoJSON)
    print("Reprojecting back to WGS84 for output...")
    gdf_3d_wgs84 = gdf_3d.to_crs("EPSG:4326")
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Save to GeoJSON
    print(f"Saving 3D-ready buildings to {output_path}...")
    gdf_3d_wgs84.to_file(output_path, driver='GeoJSON')
    
    print(f"Successfully processed {len(gdf_3d_wgs84)} buildings")
    print(f"Output saved to {output_path}")
    
    return gdf_3d_wgs84

if __name__ == "__main__":
    # Change to project root directory
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(project_root)
    
    # Process buildings
    result = process_buildings_to_3d(INPUT_PATH, OUTPUT_PATH)
    
    # Print summary
    print("\n=== Summary ===")
    print(f"Total buildings processed: {len(result)}")
    print("\nBuilding details:")
    for idx, row in result.iterrows():
        print(f"  {row['building_id']}: height={row['height_m']}m, floors={row['floors']}, "
              f"base_height={row['base_height']}m, extruded_height={row['extruded_height']}m")
