"""
SQLAlchemy and GeoAlchemy2 ORM Models for PostGIS spatial tables.
Includes BuildingModel and Property3DPIDModel for vertical cadastre representation.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, func, JSON, Boolean
from sqlalchemy.orm import declarative_base
from geoalchemy2 import Geometry

Base = declarative_base()


class BuildingModel(Base):
    """
    PostGIS spatial model representing 3D property buildings.
    Table name: buildings
    """
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    building_id = Column(String(50), nullable=False, index=True)
    height_m = Column(Float, nullable=False)
    floors = Column(Integer, nullable=False, default=1)
    base_height = Column(Float, nullable=False, default=0.0)
    extruded_height = Column(Float, nullable=False)
    provenance = Column(String(100), nullable=False, default="SYNTHETIC")
    
    # Optional AI detection metadata
    confidence = Column(Float, nullable=True)
    class_id = Column(Integer, nullable=True)
    class_name = Column(String(50), nullable=True)
    
    # PostGIS Spatial Polygon Geometry (EPSG:4326 WGS84)
    geometry = Column(Geometry(geometry_type="GEOMETRY", srid=4326), nullable=False)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def to_dict(self) -> dict:
        """Convert ORM model to dictionary."""
        return {
            "id": self.id,
            "building_id": self.building_id,
            "height_m": self.height_m,
            "floors": self.floors,
            "base_height": self.base_height,
            "extruded_height": self.extruded_height,
            "provenance": self.provenance,
            "confidence": self.confidence,
            "class_id": self.class_id,
            "class_name": self.class_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Property3DPIDModel(Base):
    """
    PostGIS spatial model representing Vertical Property Units & Prototype 3D-PIDs.
    Clearly designated as PROTOTYPE_3D_PID (research/experimental cadastre, not official govt ULPIN).
    Table name: properties_3d_pid
    """
    __tablename__ = "properties_3d_pid"

    id = Column(Integer, primary_key=True, autoincrement=True)
    prototype_pid = Column(String(100), nullable=False, unique=True, index=True)
    building_id = Column(String(50), nullable=False, index=True)
    floor_level = Column(Integer, nullable=False)
    unit_number = Column(String(50), nullable=False)
    unit_type = Column(String(50), nullable=False, default="RESIDENTIAL")
    
    # Vertical spatial bounds (True 3D elevation extent)
    z_min = Column(Float, nullable=False)
    z_max = Column(Float, nullable=False)
    height_m = Column(Float, nullable=False)
    volume_m3 = Column(Float, nullable=False)
    area_sqm = Column(Float, nullable=False)
    
    # 2D footprint geometry (PostGIS SRID 4326) with 3D Z attributes
    geometry = Column(Geometry(geometry_type="POLYGON", srid=4326), nullable=False)
    
    # Metadata & Provenance
    is_prototype = Column(Boolean, nullable=False, default=True)
    prototype_label = Column(String(50), nullable=False, default="PROTOTYPE_3D_PID")
    audit_hash = Column(String(64), nullable=True)
    rrr_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def to_dict(self) -> dict:
        """Convert ORM model to dictionary."""
        return {
            "id": self.id,
            "prototype_pid": self.prototype_pid,
            "prototype_label": self.prototype_label,
            "is_prototype": self.is_prototype,
            "building_id": self.building_id,
            "floor_level": self.floor_level,
            "unit_number": self.unit_number,
            "unit_type": self.unit_type,
            "z_bounds": [self.z_min, self.z_max],
            "height_m": self.height_m,
            "volume_m3": self.volume_m3,
            "area_sqm": self.area_sqm,
            "audit_hash": self.audit_hash,
            "rrr": self.rrr_data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
