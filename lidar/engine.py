"""
VISTRA LiDAR & 3D Point Cloud Processing Engine
Adapted from PointCloud3DLAS and PDAL patterns:
- Ingestion of ASPRS LAS / LAZ format points
- Ground / Non-Ground morphological segmentation
- Height-slice elevation histograms for floor extraction
- 3D bounding mesh and surface generation
"""

import os
import struct
import numpy as np
from typing import Dict, Any, List, Tuple, Optional

class LiDAR3DEngine:
    def __init__(self, ground_height_thresh: float = 0.5):
        self.ground_thresh = ground_height_thresh

    def parse_las_file(self, las_path: str, max_points: int = 50000) -> Dict[str, Any]:
        """Reads standard LAS 1.2/1.4 binary point files"""
        if not os.path.exists(las_path):
            raise FileNotFoundError(f"LAS file does not exist: {las_path}")

        with open(las_path, "rb") as f:
            header = f.read(227)
            if header[:4] != b"LASF":
                raise ValueError("Invalid LAS format header")

            x_scale, y_scale, z_scale = struct.unpack("<ddd", header[131:155])
            x_offset, y_offset, z_offset = struct.unpack("<ddd", header[155:179])
            offset_data = struct.unpack("<I", header[96:100])[0]
            record_len = struct.unpack("<H", header[105:107])[0]
            total_points = struct.unpack("<I", header[107:111])[0]

            read_n = min(total_points, max_points)
            f.seek(offset_data)
            raw = f.read(read_n * record_len)

            coords = []
            for i in range(read_n):
                idx = i * record_len
                xi, yi, zi = struct.unpack("<iii", raw[idx:idx+12])
                cls_val = raw[idx+15] if record_len >= 16 else 0
                x = xi * x_scale + x_offset
                y = yi * y_scale + y_offset
                z = zi * z_scale + z_offset
                coords.append([x, y, z, cls_val])

            pts = np.array(coords, dtype=np.float64)
            return {
                "count": read_n,
                "points": pts,
                "z_min": float(np.min(pts[:, 2])),
                "z_max": float(np.max(pts[:, 2]))
            }

    def extract_floor_heights_from_histogram(self, z_points: np.ndarray, base_z: float, roof_z: float, bin_size: float = 0.3) -> List[float]:
        """
        Uses peak detection on vertical point density histogram to find floor slabs.
        Adapted from PointCloud3DLAS elevation slicing.
        """
        if len(z_points) < 20:
            # Fallback to physical 3m spacing
            h = roof_z - base_z
            n_floors = max(1, int(round(h / 3.0)))
            fl_h = h / n_floors
            return [base_z + i * fl_h for i in range(n_floors + 1)]

        bins = np.arange(base_z, roof_z + bin_size, bin_size)
        counts, bin_edges = np.histogram(z_points, bins=bins)

        # Find significant peaks representing solid concrete floor slabs
        peaks = []
        for i in range(1, len(counts) - 1):
            if counts[i] > counts[i-1] and counts[i] > counts[i+1] and counts[i] > np.mean(counts):
                peaks.append(float(bin_edges[i]))

        if not peaks or len(peaks) < 2:
            h = roof_z - base_z
            n_floors = max(1, int(round(h / 3.0)))
            fl_h = h / n_floors
            return [base_z + i * fl_h for i in range(n_floors + 1)]

        # Ensure base and roof are bounded
        slab_elevations = sorted(list(set([round(base_z, 2)] + [round(p, 2) for p in peaks] + [round(roof_z, 2)])))
        return slab_elevations
