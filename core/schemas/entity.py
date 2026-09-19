"""
VISTRA Core Schemas
Defines the canonical data model for 3D Land & Vertical Property Cadastre.
Adapted from CityJSON, 3DCityDB, and BoundaryLens schemas.
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import datetime

class EntityType(str, Enum):
    PARCEL = "PARCEL"
    BUILDING = "BUILDING"
    FLOOR = "FLOOR"
    UNIT = "UNIT"
    COMMON_AREA = "COMMON_AREA"
    SUB_SURFACE = "SUB_SURFACE"
    AIR_RIGHT = "AIR_RIGHT"

class ValidationStatus(str, Enum):
    VALID = "VALID"
    WARNING = "WARNING"
    ERROR = "ERROR"
    NEEDS_REVIEW = "NEEDS_REVIEW"

class RightType(str, Enum):
    FREEHOLD = "FREEHOLD"
    LEASEHOLD = "LEASEHOLD"
    GOVERNMENT = "GOVERNMENT"
    MUNICIPAL = "MUNICIPAL"
    COMMON_PROPERTY = "COMMON_PROPERTY"

class ElevationInfo(BaseModel):
    base_m: float = Field(..., description="Ground/base elevation in meters above datum")
    height_m: float = Field(..., description="Vertical height of the entity in meters")
    roof_m: float = Field(..., description="Top elevation in meters (base + height)")
    datum: str = Field(default="WGS84_ELLIPSOID", description="Vertical datum (e.g. WGS84, EGM96)")

class CadastralMetadata(BaseModel):
    country: str = "IN"
    state: str = "KA"
    district: str = "BLR"
    sub_district: Optional[str] = "Bengaluru Urban"
    village_town: Optional[str] = "Ward 150"
    survey_khasra_no: Optional[str] = "102/4"
    land_use: Optional[str] = "Mixed Commercial / Residential"

class RRR(BaseModel):
    rights: List[str] = Field(default_factory=lambda: ["RIGHT_TO_OCCUPY", "RIGHT_TO_TRANSFER"])
    restrictions: List[str] = Field(default_factory=list) # e.g. "HEIGHT_RESTRICTION_45M"
    responsibilities: List[str] = Field(default_factory=list) # e.g. "MAINTENANCE_LEVY_SHARE"
    owner_name: Optional[str] = "Department of Land Records"
    tenure_type: RightType = RightType.FREEHOLD

class ProvenanceInfo(BaseModel):
    source: str = Field(..., description="LiDAR_POINTCLOUD, DRONE_IMAGERY, GIS_CADASTRE, MANUAL_SURVEY")
    timestamp: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")
    algorithm: Optional[str] = None
    transformation_chain: List[str] = Field(default_factory=list)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)

class VistraEntity(BaseModel):
    id: str = Field(..., description="Deterministic or UUID identifier")
    entity_type: EntityType
    name: Optional[str] = None
    ulpin_3d: Optional[str] = Field(None, description="Extended 3D ULPIN (e.g., IN-KA-BLR-P102-B1-F3-U301)")
    parent_id: Optional[str] = None
    children_ids: List[str] = Field(default_factory=list)
    cadastral: CadastralMetadata = Field(default_factory=CadastralMetadata)
    elevation: ElevationInfo
    footprint_geojson: Dict[str, Any] = Field(..., description="GeoJSON polygon or multi-polygon")
    geometry_3d: Optional[Dict[str, Any]] = Field(None, description="CityJSON / 3D Solid representation")
    rrr: RRR = Field(default_factory=RRR)
    provenance: ProvenanceInfo
    validation_status: ValidationStatus = ValidationStatus.VALID
    validation_notes: List[str] = Field(default_factory=list)
    audit_hash: Optional[str] = None

class ValidationReportItem(BaseModel):
    rule_id: str
    rule_name: str
    entity_id: str
    entity_type: str
    status: ValidationStatus
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
