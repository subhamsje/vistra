"""
VISTRA Demo Dataset Generator
Creates a 100% geographically consistent, realistic multi-modal cadastral dataset for ONE site:
Site: Koramangala Technology & Cadastral Complex, Bengaluru Urban, Karnataka (Survey No. 102/4A)
Center Coordinates: Longitude 77.6250, Latitude 12.9355 (EPSG:4326) / UTM Zone 43N (EPSG:32643)

Generated Modalities in datasets/demo/:
├── parcel/parcel.geojson
├── lidar/building.laz
├── floorplans/floorplan.pdf
├── elevation/dem.tif
├── imagery/drone_orthophoto.tif
└── gnss/control_points.csv
"""

import os
import csv
import json
import numpy as np
import pyproj
from shapely.geometry import Polygon, MultiPolygon, mapping
import rasterio
from rasterio.transform import from_bounds
import laspy
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Group

def generate_demo_dataset():
    base_dir = "/Users/subham/code/Vistra/datasets/demo"
    os.makedirs(f"{base_dir}/parcel", exist_ok=True)
    os.makedirs(f"{base_dir}/lidar", exist_ok=True)
    os.makedirs(f"{base_dir}/floorplans", exist_ok=True)
    os.makedirs(f"{base_dir}/elevation", exist_ok=True)
    os.makedirs(f"{base_dir}/imagery", exist_ok=True)
    os.makedirs(f"{base_dir}/gnss", exist_ok=True)

    # -------------------------------------------------------------
    # 1. Geographic Coordinates Definition (Bengaluru Site)
    # -------------------------------------------------------------
    # Site bounding box in WGS84
    # Parcel bounds: approx 100m x 80m
    min_lon, min_lat = 77.6242, 12.9348
    max_lon, max_lat = 77.6258, 12.9362
    base_elevation = 920.0 # meters AMSL

    # Parcel Boundary Polygon
    parcel_coords = [
        [77.62430, 12.93490],
        [77.62570, 12.93490],
        [77.62570, 12.93610],
        [77.62430, 12.93610],
        [77.62430, 12.93490]
    ]

    # Building Alpha Footprint (Tower Alpha - 6 Floors + 1 Basement)
    bldg_alpha_coords = [
        [77.62450, 12.93510],
        [77.62510, 12.93510],
        [77.62510, 12.93570],
        [77.62450, 12.93570],
        [77.62450, 12.93510]
    ]

    # Building Beta Footprint (Tower Beta - 4 Floors)
    bldg_beta_coords = [
        [77.62525, 12.93515],
        [77.62560, 12.93515],
        [77.62560, 12.93565],
        [77.62525, 12.93565],
        [77.62525, 12.93515]
    ]

    # -------------------------------------------------------------
    # 2. Generate parcel/parcel.geojson
    # -------------------------------------------------------------
    parcel_geojson = {
        "type": "FeatureCollection",
        "name": "Koramangala_Cadastral_Parcels",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
        },
        "features": [
            {
                "type": "Feature",
                "id": "PARCEL_102_4A",
                "properties": {
                    "survey_khasra_no": "102/4A",
                    "district": "BLR",
                    "state": "KA",
                    "country": "IN",
                    "village_ward": "Ward 151 - Koramangala",
                    "land_use": "Commercial Mixed-Use / High-Tech Innovation",
                    "base_elevation_m": base_elevation,
                    "max_elevation_m": 965.0,
                    "owner_name": "Karnataka Industrial Area Development Board (KIADB) & Vistra Holdings",
                    "registered_area_sqm": 8450.0,
                    "classification": "Freehold Urban Title",
                    "surveyor_registration": "KSRSAC-CAD-2024-8841",
                    "verification_seal": "GOVT-KA-CADASTRAL-VERIFIED"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [parcel_coords]
                }
            }
        ]
    }

    with open(f"{base_dir}/parcel/parcel.geojson", "w", encoding="utf-8") as f:
        json.dump(parcel_geojson, f, indent=2)
    print("✓ Generated datasets/demo/parcel/parcel.geojson")

    # -------------------------------------------------------------
    # 3. Generate lidar/building.laz
    # -------------------------------------------------------------
    # Use UTM Zone 43N coordinates for LAS header & spatial accuracy
    proj_to_utm = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:32643", always_xy=True)
    
    # Generate realistic synthetic LiDAR points
    # Classes: 2 = Ground, 6 = Building Roof/Facade, 5 = High Vegetation
    all_x = []
    all_y = []
    all_z = []
    all_classes = []
    all_intensities = []

    # Ground Grid (2500 points)
    gx = np.linspace(min_lon, max_lon, 50)
    gy = np.linspace(min_lat, max_lat, 50)
    grid_lon, grid_lat = np.meshgrid(gx, gy)
    for lon, lat in zip(grid_lon.flatten(), grid_lat.flatten()):
        x_m, y_m = proj_to_utm.transform(lon, lat)
        z = base_elevation + np.random.normal(0, 0.08)
        all_x.append(x_m)
        all_y.append(y_m)
        all_z.append(z)
        all_classes.append(2) # Ground
        all_intensities.append(np.random.randint(50, 120))

    # Building Alpha (Tower Alpha: 6 storeys = 18m, roof @ 938m)
    # Roof Points (approx 1500 points)
    bx_a = np.linspace(77.62450, 77.62510, 38)
    by_a = np.linspace(12.93510, 12.93570, 38)
    b_lon, b_lat = np.meshgrid(bx_a, by_a)
    for lon, lat in zip(b_lon.flatten(), b_lat.flatten()):
        x_m, y_m = proj_to_utm.transform(lon, lat)
        z = base_elevation + 18.0 + np.random.normal(0, 0.05) # Roof @ 938m
        all_x.append(x_m)
        all_y.append(y_m)
        all_z.append(z)
        all_classes.append(6) # Building
        all_intensities.append(np.random.randint(180, 255))

    # Building Alpha Facade Points (approx 1000 points)
    for edge_pt in [[77.62450, 12.93510], [77.62510, 12.93510], [77.62510, 12.93570], [77.62450, 12.93570]]:
        for z_h in np.linspace(0.5, 17.5, 20):
            x_m, y_m = proj_to_utm.transform(edge_pt[0], edge_pt[1])
            all_x.append(x_m + np.random.normal(0, 0.2))
            all_y.append(y_m + np.random.normal(0, 0.2))
            all_z.append(base_elevation + z_h)
            all_classes.append(6)
            all_intensities.append(np.random.randint(140, 200))

    # Building Beta (Tower Beta: 4 storeys = 12m, roof @ 932m)
    bx_b = np.linspace(77.62525, 77.62560, 25)
    by_b = np.linspace(12.93515, 12.93565, 25)
    b_lon, b_lat = np.meshgrid(bx_b, by_b)
    for lon, lat in zip(b_lon.flatten(), b_lat.flatten()):
        x_m, y_m = proj_to_utm.transform(lon, lat)
        z = base_elevation + 12.0 + np.random.normal(0, 0.05) # Roof @ 932m
        all_x.append(x_m)
        all_y.append(y_m)
        all_z.append(z)
        all_classes.append(6)
        all_intensities.append(np.random.randint(170, 240))

    # Vegetation (approx 400 points around perimeter)
    for _ in range(400):
        lon = np.random.uniform(min_lon, max_lon)
        lat = np.random.uniform(min_lat, max_lat)
        # Avoid building interior
        if not (77.6244 < lon < 77.6257 and 77.6250 < lat < 77.6258):
            x_m, y_m = proj_to_utm.transform(lon, lat)
            z = base_elevation + np.random.uniform(2.0, 7.5)
            all_x.append(x_m)
            all_y.append(y_m)
            all_z.append(z)
            all_classes.append(5) # High veg
            all_intensities.append(np.random.randint(30, 90))

    # Write LAS/LAZ file
    header = laspy.LasHeader(point_format=3, version="1.4")
    las = laspy.LasData(header)
    las.header.offsets = [float(np.min(all_x)), float(np.min(all_y)), float(np.min(all_z))]
    las.header.scales = [0.001, 0.001, 0.001]
    las.x = np.array(all_x, dtype=np.float64)
    las.y = np.array(all_y, dtype=np.float64)
    las.z = np.array(all_z, dtype=np.float64)
    las.classification = np.array(all_classes, dtype=np.uint8)
    las.intensity = np.array(all_intensities, dtype=np.uint16)

    las.write(f"{base_dir}/lidar/building.laz")
    print(f"✓ Generated datasets/demo/lidar/building.laz ({len(all_x)} classified LiDAR points)")

    # -------------------------------------------------------------
    # 4. Generate floorplans/floorplan.pdf
    # -------------------------------------------------------------
    pdf_path = f"{base_dir}/floorplans/floorplan.pdf"
    doc = SimpleDocTemplate(pdf_path, pagesize=landscape(A4), leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor('#0f172a'))
    subtitle_style = ParagraphStyle('SubStyle', parent=styles['Normal'], fontSize=9, leading=12, textColor=colors.HexColor('#475569'))
    heading2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=12, leading=15, textColor=colors.HexColor('#1e40af'))
    
    story = []
    story.append(Paragraph("GOVERNMENT OF KARNATAKA - DEPARTMENT OF SURVEY SETTLEMENT & LAND RECORDS", subtitle_style))
    story.append(Paragraph("VISTRA 3D CADASTRAL ARCHITECTURAL FLOOR PLAN & SUBDIVISION RECORD", title_style))
    story.append(Paragraph("Survey No: <b>102/4A</b> | Site: Koramangala Tech Complex | Datum: WGS84 / EPSG:4326 | Base Elevation: 920.00m AMSL", subtitle_style))
    story.append(Spacer(1, 10))

    # Summary table
    table_data = [
        ["Building Identifier", "Structure Name", "Storeys", "Vertical Extent (AMSL)", "Gross Area", "Unit Partitioning"],
        ["BLDG_ALPHA", "Tower Alpha (Mixed Commercial & Res)", "B1 + G + 5 (6 Levels)", "917.00m - 938.00m (+18.0m)", "2,700 sq.m", "24 Residential Suites + Parking"],
        ["BLDG_BETA", "Tower Beta (Innovation Wing)", "G + 3 (4 Levels)", "920.00m - 932.00m (+12.0m)", "1,400 sq.m", "12 Commercial Workspaces"]
    ]
    t = Table(table_data, colWidths=[1.1*inch, 2.3*inch, 1.4*inch, 1.8*inch, 1.0*inch, 2.2*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f8fafc')),
        ('FONTSIZE', (0,1), (-1,-1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(Paragraph("<b>Architectural Storey Schematic & Volumetric Unit Demarcation (Tower Alpha - Level 3)</b>", heading2_style))
    
    # Vector blueprint drawing
    d = Drawing(680, 240)
    # Background frame
    d.add(Rect(0, 0, 680, 240, fillColor=colors.HexColor('#0f172a'), strokeColor=colors.HexColor('#38bdf8'), strokeWidth=1))
    
    # Grid lines
    for x_g in range(20, 660, 40):
        d.add(Line(x_g, 10, x_g, 230, strokeColor=colors.HexColor('#1e293b'), strokeWidth=0.5))
    for y_g in range(20, 230, 40):
        d.add(Line(10, y_g, 670, y_g, strokeColor=colors.HexColor('#1e293b'), strokeWidth=0.5))

    # Building Alpha Outer Shell
    d.add(Rect(40, 30, 280, 180, fillColor=colors.HexColor('#1e293b'), strokeColor=colors.HexColor('#60a5fa'), strokeWidth=2))
    d.add(String(50, 195, "TOWER ALPHA - TYPICAL FLOOR (LEVEL 3 / ELEVATION 929.0m - 932.0m)", fontSize=8, fillColor=colors.white, fontName="Helvetica-Bold"))
    
    # 4 Units in Alpha
    # Unit 301
    d.add(Rect(50, 40, 125, 70, fillColor=colors.HexColor('#3b82f6'), strokeColor=colors.HexColor('#93c5fd'), strokeWidth=1))
    d.add(String(60, 85, "UNIT 301 (2BHK)", fontSize=8, fillColor=colors.white, fontName="Helvetica-Bold"))
    d.add(String(60, 70, "Area: 112.5 sq.m | ULPIN: ...-F3-U301", fontSize=6, fillColor=colors.HexColor('#e0e7ff')))
    d.add(String(60, 55, "Vertical: +9.0m to +12.0m", fontSize=6, fillColor=colors.HexColor('#93c5fd')))

    # Unit 302
    d.add(Rect(185, 40, 125, 70, fillColor=colors.HexColor('#8b5cf6'), strokeColor=colors.HexColor('#c4b5fd'), strokeWidth=1))
    d.add(String(195, 85, "UNIT 302 (3BHK)", fontSize=8, fillColor=colors.white, fontName="Helvetica-Bold"))
    d.add(String(195, 70, "Area: 112.5 sq.m | ULPIN: ...-F3-U302", fontSize=6, fillColor=colors.HexColor('#ede9fe')))
    d.add(String(195, 55, "Vertical: +9.0m to +12.0m", fontSize=6, fillColor=colors.HexColor('#c4b5fd')))

    # Unit 303
    d.add(Rect(50, 120, 125, 65, fillColor=colors.HexColor('#06b6d4'), strokeColor=colors.HexColor('#67e8f9'), strokeWidth=1))
    d.add(String(60, 160, "UNIT 303 (3BHK)", fontSize=8, fillColor=colors.white, fontName="Helvetica-Bold"))
    d.add(String(60, 145, "Area: 112.5 sq.m | ULPIN: ...-F3-U303", fontSize=6, fillColor=colors.HexColor('#cffafe')))
    d.add(String(60, 130, "Vertical: +9.0m to +12.0m", fontSize=6, fillColor=colors.HexColor('#67e8f9')))

    # Unit 304
    d.add(Rect(185, 120, 125, 65, fillColor=colors.HexColor('#10b981'), strokeColor=colors.HexColor('#6ee7b7'), strokeWidth=1))
    d.add(String(195, 160, "UNIT 304 (2BHK)", fontSize=8, fillColor=colors.white, fontName="Helvetica-Bold"))
    d.add(String(195, 145, "Area: 112.5 sq.m | ULPIN: ...-F3-U304", fontSize=6, fillColor=colors.HexColor('#d1fae5')))
    d.add(String(195, 130, "Vertical: +9.0m to +12.0m", fontSize=6, fillColor=colors.HexColor('#6ee7b7')))

    # Building Beta Outer Shell
    d.add(Rect(360, 30, 280, 180, fillColor=colors.HexColor('#1e293b'), strokeColor=colors.HexColor('#f59e0b'), strokeWidth=2))
    d.add(String(370, 195, "TOWER BETA - COMMERCIAL INNOVATION (LEVEL 2 / ELEV 923.0m - 926.0m)", fontSize=8, fillColor=colors.white, fontName="Helvetica-Bold"))

    # Units in Beta
    d.add(Rect(370, 40, 125, 145, fillColor=colors.HexColor('#d97706'), strokeColor=colors.HexColor('#fde68a'), strokeWidth=1))
    d.add(String(380, 160, "SUITE 201 (OFFICE)", fontSize=8, fillColor=colors.white, fontName="Helvetica-Bold"))
    d.add(String(380, 145, "Area: 140 sq.m | ULPIN: ...-F2-U201", fontSize=6, fillColor=colors.HexColor('#fef3c7')))

    d.add(Rect(505, 40, 125, 70, fillColor=colors.HexColor('#ec4899'), strokeColor=colors.HexColor('#fbcfe8'), strokeWidth=1))
    d.add(String(515, 85, "SUITE 202 (LAB)", fontSize=8, fillColor=colors.white, fontName="Helvetica-Bold"))
    d.add(String(515, 70, "Area: 70 sq.m | ...-F2-U202", fontSize=6, fillColor=colors.HexColor('#fce7f3')))

    d.add(Rect(505, 120, 125, 65, fillColor=colors.HexColor('#6366f1'), strokeColor=colors.HexColor('#c7d2fe'), strokeWidth=1))
    d.add(String(515, 160, "SUITE 203 (CONFERENCE)", fontSize=8, fillColor=colors.white, fontName="Helvetica-Bold"))
    d.add(String(515, 145, "Area: 70 sq.m | ...-F2-U203", fontSize=6, fillColor=colors.HexColor('#e0e7ff')))

    story.append(d)
    doc.build(story)
    print("✓ Generated datasets/demo/floorplans/floorplan.pdf")

    # -------------------------------------------------------------
    # 5. Generate elevation/dem.tif
    # -------------------------------------------------------------
    # Create 200x200 GeoTIFF raster covering bounding box
    width, height = 200, 200
    transform = from_bounds(min_lon, min_lat, max_lon, max_lat, width, height)

    # Base ground surface with slight natural slope (919.5m to 920.8m)
    x_lin = np.linspace(0, 1, width)
    y_lin = np.linspace(0, 1, height)
    xx, yy = np.meshgrid(x_lin, y_lin)
    dem_data = 920.0 + 0.8 * xx - 0.5 * yy + np.random.normal(0, 0.03, (height, width))

    # Add DSM elevation peaks for Tower Alpha (938m) and Tower Beta (932m)
    for r in range(height):
        for c in range(width):
            lon = min_lon + (c / width) * (max_lon - min_lon)
            lat = max_lat - (r / height) * (max_lat - min_lat)
            # Check Tower Alpha
            if (77.62450 <= lon <= 77.62510) and (12.93510 <= lat <= 12.93570):
                dem_data[r, c] = 938.0 + np.random.normal(0, 0.05)
            # Check Tower Beta
            elif (77.62525 <= lon <= 77.62560) and (12.93515 <= lat <= 12.93565):
                dem_data[r, c] = 932.0 + np.random.normal(0, 0.05)

    with rasterio.open(
        f"{base_dir}/elevation/dem.tif",
        'w',
        driver='GTiff',
        height=height,
        width=width,
        count=1,
        dtype=rasterio.float32,
        crs='EPSG:4326',
        transform=transform,
    ) as dst:
        dst.write(dem_data.astype(np.float32), 1)
    print("✓ Generated datasets/demo/elevation/dem.tif (GeoTIFF Elevation Raster)")

    # -------------------------------------------------------------
    # 6. Generate imagery/drone_orthophoto.tif
    # -------------------------------------------------------------
    # High-res 400x400 RGB GeoTIFF orthomosaic
    img_w, img_h = 400, 400
    img_transform = from_bounds(min_lon, min_lat, max_lon, max_lat, img_w, img_h)
    
    r_band = np.full((img_h, img_w), 45, dtype=np.uint8)  # Default asphalt/ground dark
    g_band = np.full((img_h, img_w), 55, dtype=np.uint8)
    b_band = np.full((img_h, img_w), 40, dtype=np.uint8)

    # Perimeter Greenery / Turf
    for r in range(img_h):
        for c in range(img_w):
            lon = min_lon + (c / img_w) * (max_lon - min_lon)
            lat = max_lat - (r / img_h) * (max_lat - min_lat)
            # Within parcel but outside buildings = courtyard & garden
            if (77.62430 <= lon <= 77.62570) and (12.93490 <= lat <= 12.93610):
                r_band[r, c] = 60
                g_band[r, c] = 110 # Green lawn
                b_band[r, c] = 65

            # Tower Alpha Roof (Clean Modern Cool White / Solar Panel Navy)
            if (77.62450 <= lon <= 77.62510) and (12.93510 <= lat <= 12.93570):
                r_band[r, c] = 30
                g_band[r, c] = 70
                b_band[r, c] = 140 # Blue modern roof

            # Tower Beta Roof (Terracotta / Warm Modern Tone)
            if (77.62525 <= lon <= 77.62560) and (12.93515 <= lat <= 12.93565):
                r_band[r, c] = 180
                g_band[r, c] = 100
                b_band[r, c] = 70

    with rasterio.open(
        f"{base_dir}/imagery/drone_orthophoto.tif",
        'w',
        driver='GTiff',
        height=img_h,
        width=img_w,
        count=3,
        dtype=rasterio.uint8,
        crs='EPSG:4326',
        transform=img_transform,
    ) as dst:
        dst.write(r_band, 1)
        dst.write(g_band, 2)
        dst.write(b_band, 3)
    print("✓ Generated datasets/demo/imagery/drone_orthophoto.tif (RGB GeoTIFF Orthophoto)")

    # -------------------------------------------------------------
    # 7. Generate gnss/control_points.csv
    # -------------------------------------------------------------
    gcp_rows = [
        ["point_id", "station_name", "latitude_wgs84", "longitude_wgs84", "easting_utm43n", "northing_utm43n", "orthometric_elevation_m", "feature_description", "horiz_accuracy_m", "vert_accuracy_m", "residual_rms_m", "status"],
        ["GCP-01", "KOR-CORS-NW", 12.93610, 77.62430, 784770.12, 1431745.88, 920.12, "Cadastral Parcel NW Boundary Monument", 0.006, 0.009, 0.004, "VERIFIED"],
        ["GCP-02", "KOR-CORS-NE", 12.93610, 77.62570, 784922.04, 1431745.88, 920.45, "Cadastral Parcel NE Boundary Pillar", 0.005, 0.008, 0.003, "VERIFIED"],
        ["GCP-03", "KOR-CORS-SE", 12.93490, 77.62570, 784922.04, 1431613.02, 919.88, "Cadastral Parcel SE Boundary Marker", 0.006, 0.010, 0.005, "VERIFIED"],
        ["GCP-04", "KOR-CORS-SW", 12.93490, 77.62430, 784770.12, 1431613.02, 919.65, "Cadastral Parcel SW Boundary Pillar", 0.005, 0.008, 0.004, "VERIFIED"],
        ["GCP-05", "BLDG-ALPHA-SW", 12.93510, 77.62450, 784791.82, 1431635.15, 920.00, "Tower Alpha SW Foundation Column", 0.004, 0.006, 0.002, "VERIFIED"],
        ["GCP-06", "BLDG-ALPHA-NE", 12.93570, 77.62510, 784857.01, 1431701.55, 920.05, "Tower Alpha NE Core Pillar", 0.004, 0.006, 0.003, "VERIFIED"],
        ["GCP-07", "BLDG-BETA-NW", 12.93565, 77.62525, 784873.30, 1431696.02, 920.10, "Tower Beta NW Structural Column", 0.005, 0.007, 0.003, "VERIFIED"],
        ["GCP-08", "BLDG-BETA-SE", 12.93515, 77.62560, 784911.33, 1431640.68, 920.02, "Tower Beta SE Plinth Cornerstone", 0.005, 0.008, 0.004, "VERIFIED"]
    ]

    with open(f"{base_dir}/gnss/control_points.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(gcp_rows)
    print("✓ Generated datasets/demo/gnss/control_points.csv")

if __name__ == "__main__":
    generate_demo_dataset()
