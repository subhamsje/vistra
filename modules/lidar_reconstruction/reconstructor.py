"""
Module D: LiDAR & 3D Point Cloud Reconstruction
Performs ground/non-ground classification, outlier filtering, and 3D bounding mesh creation.
Adapted from PointCloud3DLAS processing workflows.
"""

from typing import Dict, Any, List, Tuple
import numpy as np

class LiDARReconstructor:
    def __init__(self, ground_cloth_resolution: float = 1.0):
        self.cloth_res = ground_cloth_resolution

    def filter_statistical_outliers(self, points: np.ndarray, k_neighbors: int = 16, std_ratio: float = 2.0) -> np.ndarray:
        """Removes isolated sensor noise points using mean distance thresholding"""
        if len(points) < k_neighbors:
            return points

        # Subsample if massive for speed
        stride = max(1, len(points) // 20000)
        sample = points[::stride]

        from scipy.spatial import cKDTree
        tree = cKDTree(sample[:, :3])
        dists, _ = tree.query(points[:, :3], k=min(k_neighbors, len(sample)))
        mean_dists = np.mean(dists, axis=1)

        thresh = np.mean(mean_dists) + std_ratio * np.std(mean_dists)
        inliers = points[mean_dists <= thresh]
        return inliers

    def separate_ground_non_ground(self, points: np.ndarray, cell_size: float = 2.0, height_threshold: float = 0.5) -> Tuple[np.ndarray, np.ndarray]:
        """
        Grid Minimum Elevation Filter (Simple Morphological Filter baseline).
        Splits into ground (class 2) and elevated objects (buildings/vegetation, class 6).
        """
        if len(points) == 0:
            return points, points

        min_x, min_y = np.min(points[:, 0]), np.min(points[:, 1])
        grid_x = np.floor((points[:, 0] - min_x) / cell_size).astype(int)
        grid_y = np.floor((points[:, 1] - min_y) / cell_size).astype(int)
        grid_keys = grid_x * 1000000 + grid_y

        # Find min Z in each cell
        unique_keys = np.unique(grid_keys)
        min_z_map = {}
        for k in unique_keys:
            mask = (grid_keys == k)
            min_z_map[k] = np.min(points[mask, 2])

        min_cell_z = np.array([min_z_map[k] for k in grid_keys])
        is_ground = (points[:, 2] - min_cell_z) < height_threshold

        ground_pts = points[is_ground].copy()
        non_ground_pts = points[~is_ground].copy()

        if ground_pts.shape[1] > 3:
            ground_pts[:, 3] = 2 # ASPRS Class 2: Ground
        if non_ground_pts.shape[1] > 3:
            non_ground_pts[:, 3] = 6 # ASPRS Class 6: Building/Object

        return ground_pts, non_ground_pts
