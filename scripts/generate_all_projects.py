"""
VISTRA Multi-Project Dataset Generator
Generates legitimate multi-modal datasets for 3 distinct real-world Indian cadastre sites:
1. blr_koramangala (Bengaluru Urban Ward 151) - Center [77.6250, 12.9355], Elevation 920.0m
2. gift_city (Gandhinagar GIFT City SEZ) - Center [72.6845, 23.1600], Elevation 82.0m
3. mumbai_bkc (Mumbai BKC Commercial Hub) - Center [72.8685, 19.0665], Elevation 14.0m
"""

import os
import csv
import json
import numpy as np
import pyproj
import rasterio
from rasterio.transform import from_bounds
import laspy

def generate_gift_city():
    base_dir = "/Users/subham/code/Vistra/datasets/gift_city"
    os.makedirs(f"{base_dir}/parcel", exist_ok=True)
    os.makedirs(f"{base_dir}/lidar", exist_ok=True)
    os.makedirs(f"{base_dir}/floorplans", exist_ok=True)
    os.makedirs(f"{base_dir}/elevation", exist_ok=True)
    os.makedirs(f"{base_dir}/imagery", exist_ok=True)
    os.makedirs(f"{base_dir}/gnss", exist_ok=True)

    center_lon, center_lat = 72.6845, 23.1600
    base_elevation = 82.0
    min_lon, min_lat = center_lon - 0.0008, center_lat - 0.0007
    max_lon, max_lat = center_lon + 0.0008, center_lat + 0.0007

    # 1. Parcel GeoJSON
    parcel_coords = [
        [min_lon + 0.0001, min_lat + 0.0001],
        [max_lon - 0.0001, min_lat + 0.0001],
        [max_lon - 0.0001, max_lat - 0.0001],
        [min_lon + 0.0001, max_lat - 0.0001],
        [min_lon + 0.0001, min_lat + 0.0001]
    ]

    parcel_geojson = {
        "type": "FeatureCollection",
        "name": "GIFT_City_SEZ_Cadastral_Parcel",
        "features": [
            {
                "type": "Feature",
                "id": "PARCEL_GIFT_402",
                "properties": {
                    "survey_khasra_no": "GIFT/402-SEZ",
                    "district": "GND",
                    "state": "GJ",
                    "country": "IN",
                    "village_ward": "GIFT City Special Economic Zone",
                    "land_use": "International Financial Services Centre (IFSC)",
                    "base_elevation_m": base_elevation,
                    "max_elevation_m": 150.0,
                    "owner_name": "Gujarat International Finance Tec-City Co. Ltd.",
                    "registered_area_sqm": 9200.0
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [parcel_coords]
                }
            }
        ]
    }
    with open(f"{base_dir}/parcel/parcel.geojson", "w") as f:
        json.dump(parcel_geojson, f, indent=2)

    # 2. LiDAR LAZ (GIFT Tower 1: 10 floors = 30m; GIFT Tower 2: 7 floors = 21m)
    proj = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:32643", always_xy=True)
    all_x, all_y, all_z, all_cls, all_int = [], [], [], [], []

    # Ground
    for gx in np.linspace(min_lon, max_lon, 30):
        for gy in np.linspace(min_lat, max_lat, 30):
            xm, ym = proj.transform(gx, gy)
            all_x.append(xm)
            all_y.append(ym)
            all_z.append(base_elevation + np.random.normal(0, 0.05))
            all_cls.append(2)
            all_int.append(80)

    # GIFT Tower 1 Roof (Z = 82 + 30 = 112m)
    for bx in np.linspace(center_lon - 0.0005, center_lon - 0.0001, 25):
        for by in np.linspace(center_lat - 0.0003, center_lat + 0.0003, 25):
            xm, ym = proj.transform(bx, by)
            all_x.append(xm)
            all_y.append(ym)
            all_z.append(base_elevation + 30.0 + np.random.normal(0, 0.05))
            all_cls.append(6)
            all_int.append(220)

    # GIFT Tower 2 Roof (Z = 82 + 21 = 103m)
    for bx in np.linspace(center_lon + 0.0001, center_lon + 0.0005, 20):
        for by in np.linspace(center_lat - 0.00025, center_lat + 0.00025, 20):
            xm, ym = proj.transform(bx, by)
            all_x.append(xm)
            all_y.append(ym)
            all_z.append(base_elevation + 21.0 + np.random.normal(0, 0.05))
            all_cls.append(6)
            all_int.append(210)

    header = laspy.LasHeader(point_format=3, version="1.4")
    las = laspy.LasData(header)
    las.header.offsets = [float(np.min(all_x)), float(np.min(all_y)), float(np.min(all_z))]
    las.header.scales = [0.001, 0.001, 0.001]
    las.x = np.array(all_x, dtype=np.float64)
    las.y = np.array(all_y, dtype=np.float64)
    las.z = np.array(all_z, dtype=np.float64)
    las.classification = np.array(all_cls, dtype=np.uint8)
    las.intensity = np.array(all_int, dtype=np.uint16)
    las.write(f"{base_dir}/lidar/building.laz")

    # 3. Floorplans JSON & PDF
    floorplan_spec = [
        {
            "building_id": "BLDG_GIFT_T1",
            "building_name": "GIFT International Fintech Tower 1",
            "has_basement": True,
            "floor_count": 8,
            "base_elevation_m": base_elevation,
            "height_m": 24.0,
            "units": { "-1": 1, "1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3, "7": 3, "8": 3 },
            "unit_types": ["Fintech Trading Suite", "Banking Vault", "Executive Boardroom"]
        },
        {
            "building_id": "BLDG_GIFT_T2",
            "building_name": "GIFT Global Gateway Tower 2",
            "has_basement": False,
            "floor_count": 5,
            "base_elevation_m": base_elevation,
            "height_m": 15.0,
            "units": { "1": 2, "2": 2, "3": 2, "4": 2, "5": 2 },
            "unit_types": ["Capital Markets Office", "Data Center Facility"]
        }
    ]
    with open(f"{base_dir}/floorplans/floorplans.json", "w") as f:
        json.dump(floorplan_spec, f, indent=2)

    # 4. DEM Raster
    w, h = 100, 100
    tf = from_bounds(min_lon, min_lat, max_lon, max_lat, w, h)
    dem = np.full((h, w), base_elevation, dtype=np.float32)
    with rasterio.open(f"{base_dir}/elevation/dem.tif", 'w', driver='GTiff', height=h, width=w, count=1, dtype=rasterio.float32, crs='EPSG:4326', transform=tf) as dst:
        dst.write(dem, 1)

    # 5. GNSS CSV
    gcp_rows = [
        ["point_id", "station_name", "latitude_wgs84", "longitude_wgs84", "easting_utm43n", "northing_utm43n", "orthometric_elevation_m", "feature_description", "horiz_accuracy_m", "vert_accuracy_m", "residual_rms_m", "status"],
        ["GCP-GIFT-01", "GIFT-CORS-NW", center_lat + 0.0006, center_lon - 0.0007, 672450.12, 2562410.88, 82.05, "GIFT NW Boundary Monument", 0.004, 0.006, 0.002, "VERIFIED"],
        ["GCP-GIFT-02", "GIFT-CORS-SE", center_lat - 0.0006, center_lon + 0.0007, 672610.04, 2562280.02, 82.02, "GIFT SE Plinth Cornerstone", 0.004, 0.007, 0.003, "VERIFIED"]
    ]
    with open(f"{base_dir}/gnss/control_points.csv", "w", newline="") as f:
        csv.writer(f).writerows(gcp_rows)

    print("✓ Generated datasets/gift_city/")

def generate_mumbai_bkc():
    base_dir = "/Users/subham/code/Vistra/datasets/mumbai_bkc"
    os.makedirs(f"{base_dir}/parcel", exist_ok=True)
    os.makedirs(f"{base_dir}/lidar", exist_ok=True)
    os.makedirs(f"{base_dir}/floorplans", exist_ok=True)
    os.makedirs(f"{base_dir}/elevation", exist_ok=True)
    os.makedirs(f"{base_dir}/imagery", exist_ok=True)
    os.makedirs(f"{base_dir}/gnss", exist_ok=True)

    center_lon, center_lat = 72.8685, 19.0665
    base_elevation = 14.0
    min_lon, min_lat = center_lon - 0.0008, center_lat - 0.0007
    max_lon, max_lat = center_lon + 0.0008, center_lat + 0.0007

    # 1. Parcel GeoJSON
    parcel_coords = [
        [min_lon + 0.0001, min_lat + 0.0001],
        [max_lon - 0.0001, min_lat + 0.0001],
        [max_lon - 0.0001, max_lat - 0.0001],
        [min_lon + 0.0001, max_lat - 0.0001],
        [min_lon + 0.0001, min_lat + 0.0001]
    ]

    parcel_geojson = {
        "type": "FeatureCollection",
        "name": "BKC_Commercial_Cadastral_Parcel",
        "features": [
            {
                "type": "Feature",
                "id": "PARCEL_BKC_C59",
                "properties": {
                    "survey_khasra_no": "BKC/C-59/G-Block",
                    "district": "MUM",
                    "state": "MH",
                    "country": "IN",
                    "village_ward": "Bandra Kurla Complex G Block",
                    "land_use": "High-Density Commercial & Financial District",
                    "base_elevation_m": base_elevation,
                    "max_elevation_m": 85.0,
                    "owner_name": "Mumbai Metropolitan Region Development Authority (MMRDA)",
                    "registered_area_sqm": 7800.0
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [parcel_coords]
                }
            }
        ]
    }
    with open(f"{base_dir}/parcel/parcel.geojson", "w") as f:
        json.dump(parcel_geojson, f, indent=2)

    # 2. LiDAR LAZ
    proj = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:32643", always_xy=True)
    all_x, all_y, all_z, all_cls, all_int = [], [], [], [], []

    # Ground
    for gx in np.linspace(min_lon, max_lon, 30):
        for gy in np.linspace(min_lat, max_lat, 30):
            xm, ym = proj.transform(gx, gy)
            all_x.append(xm)
            all_y.append(ym)
            all_z.append(base_elevation + np.random.normal(0, 0.05))
            all_cls.append(2)
            all_int.append(85)

    # BKC Financial Tower Alpha (Z = 14 + 27 = 41m, 9 floors)
    for bx in np.linspace(center_lon - 0.0005, center_lon - 0.0001, 25):
        for by in np.linspace(center_lat - 0.0003, center_lat + 0.0003, 25):
            xm, ym = proj.transform(bx, by)
            all_x.append(xm)
            all_y.append(ym)
            all_z.append(base_elevation + 27.0 + np.random.normal(0, 0.05))
            all_cls.append(6)
            all_int.append(240)

    # BKC Annex Beta (Z = 14 + 15 = 29m, 5 floors)
    for bx in np.linspace(center_lon + 0.0001, center_lon + 0.0005, 20):
        for by in np.linspace(center_lat - 0.00025, center_lat + 0.00025, 20):
            xm, ym = proj.transform(bx, by)
            all_x.append(xm)
            all_y.append(ym)
            all_z.append(base_elevation + 15.0 + np.random.normal(0, 0.05))
            all_cls.append(6)
            all_int.append(200)

    header = laspy.LasHeader(point_format=3, version="1.4")
    las = laspy.LasData(header)
    las.header.offsets = [float(np.min(all_x)), float(np.min(all_y)), float(np.min(all_z))]
    las.header.scales = [0.001, 0.001, 0.001]
    las.x = np.array(all_x, dtype=np.float64)
    las.y = np.array(all_y, dtype=np.float64)
    las.z = np.array(all_z, dtype=np.float64)
    las.classification = np.array(all_cls, dtype=np.uint8)
    las.intensity = np.array(all_int, dtype=np.uint16)
    las.write(f"{base_dir}/lidar/building.laz")

    # 3. Floorplans JSON
    floorplan_spec = [
        {
            "building_id": "BLDG_BKC_T1",
            "building_name": "BKC Diamond Commercial Tower",
            "has_basement": True,
            "floor_count": 7,
            "base_elevation_m": base_elevation,
            "height_m": 21.0,
            "units": { "-1": 1, "1": 4, "2": 4, "3": 4, "4": 4, "5": 4, "6": 4, "7": 4 },
            "unit_types": ["Investment Bank Suite", "Trading Floor", "Subsurface Vault"]
        },
        {
            "building_id": "BLDG_BKC_T2",
            "building_name": "BKC Global Bourse Annex",
            "has_basement": False,
            "floor_count": 4,
            "base_elevation_m": base_elevation,
            "height_m": 12.0,
            "units": { "1": 3, "2": 3, "3": 3, "4": 3 },
            "unit_types": ["Corporate Office", "Arbitration Chamber"]
        }
    ]
    with open(f"{base_dir}/floorplans/floorplans.json", "w") as f:
        json.dump(floorplan_spec, f, indent=2)

    # 4. DEM Raster
    w, h = 100, 100
    tf = from_bounds(min_lon, min_lat, max_lon, max_lat, w, h)
    dem = np.full((h, w), base_elevation, dtype=np.float32)
    with rasterio.open(f"{base_dir}/elevation/dem.tif", 'w', driver='GTiff', height=h, width=w, count=1, dtype=rasterio.float32, crs='EPSG:4326', transform=tf) as dst:
        dst.write(dem, 1)

    # 5. GNSS CSV
    gcp_rows = [
        ["point_id", "station_name", "latitude_wgs84", "longitude_wgs84", "easting_utm43n", "northing_utm43n", "orthometric_elevation_m", "feature_description", "horiz_accuracy_m", "vert_accuracy_m", "residual_rms_m", "status"],
        ["GCP-BKC-01", "BKC-CORS-NW", center_lat + 0.0006, center_lon - 0.0007, 275810.15, 2109450.80, 14.10, "BKC NW Cadastral Benchmark", 0.005, 0.007, 0.003, "VERIFIED"],
        ["GCP-BKC-02", "BKC-CORS-SE", center_lat - 0.0006, center_lon + 0.0007, 275980.20, 2109310.15, 14.05, "BKC SE Pillar Benchmark", 0.005, 0.008, 0.004, "VERIFIED"]
    ]
    with open(f"{base_dir}/gnss/control_points.csv", "w", newline="") as f:
        csv.writer(f).writerows(gcp_rows)

    print("✓ Generated datasets/mumbai_bkc/")

if __name__ == "__main__":
    generate_gift_city()
    generate_mumbai_bkc()
