"""
VISTRA Shared Schemas
Implements the canonical data models across backend, database, GIS, and frontend.
Incorporates:
- LADM (ISO 19152) 3D Spatial Units and RRR (Rights, Restrictions, Responsibilities)
- OGC CityJSON 1.1 / 3DCityDB LoD1-LoD3 geometry models
- Extended 3D ULPIN specification with SHA-256 provenance chains
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
    UNDERGROUND_INFRASTRUCTURE = "UNDERGROUND_INFRASTRUCTURE"
    AIR_RIGHT = "AIR_RIGHT"

class ValidationStatus(str, Enum):
    VALID = "VALID"
    WARNING = "WARNING"
    ERROR = "ERROR"
    NEEDS_REVIEW = "NEEDS_REVIEW"

class TenureType(str, Enum):
    FREEHOLD = "FREEHOLD"
    LEASEHOLD = "LEASEHOLD"
    GOVERNMENT_CROWN = "GOVERNMENT_CROWN"
    MUNICIPAL = "MUNICIPAL"
    SOCIETY_COMMON = "SOCIETY_COMMON"

class ElevationProfile(BaseModel):
    base_elevation_m: float = Field(..., description="Ground or base elevation in meters above geoid/datum")
    height_m: float = Field(..., description="Vertical extruded height in meters")
    roof_elevation_m: float = Field(..., description="Top elevation in meters (base + height)")
    datum: str = Field(default="EGM96_ELLIPSOID", description="Vertical reference datum")

class CadastralIdentity(BaseModel):
    country_code: str = "IN"
    state_code: str = "KA"
    district_code: str = "BLR"
    sub_district: Optional[str] = "Bengaluru Urban"
    village_town_ward: Optional[str] = "Ward 150"
    survey_khasra_no: str = Field(..., description="Traditional survey or Khasra plot number")
    ulpin_2d: Optional[str] = Field(None, description="India standard 14-digit parcel ULPIN")
    ulpin_3d: Optional[str] = Field(None, description="Extended 3D hierarchical ULPIN")

class RRRModel(BaseModel):
    tenure: TenureType = TenureType.FREEHOLD
    primary_owner: str = Field(default="State Land Authority")
    rights: List[str] = Field(default_factory=lambda: ["RIGHT_TO_OCCUPY", "RIGHT_TO_TRANSFER", "RIGHT_TO_ENCUMBER"])
    restrictions: List[str] = Field(default_factory=list) # e.g., ["HEIGHT_CEILING_60M", "HERITAGE_ZONE_BUFFER"]
    responsibilities: List[str] = Field(default_factory=list) # e.g., ["PROPERTY_TAX_ZONE_A", "SEWAGE_TREATMENT_SHARE"]

class ProvenanceTrace(BaseModel):
    source_type: str = Field(..., description="LIDAR_POINT_CLOUD, DRONE_ORTHOPHOTO, GIS_CADASTRAL_SHP, ARCHITECTURAL_BIM")
    sensor_model: Optional[str] = "Riegl VUX-1UAV / Leica ALS80"
    acquisition_date: Optional[str] = "2026-03-15"
    algorithm_pipeline: List[str] = Field(default_factory=list)
    confidence_score: float = Field(default=0.95, ge=0.0, le=1.0)
    audit_hash: Optional[str] = Field(None, description="SHA-256 seal of geometry, attribution, and lineage")

class SpatialUnit3D(BaseModel):
    id: str = Field(..., description="Unique entity identifier (UUID or deterministic ID)")
    entity_type: EntityType
    name: str
    cadastre: CadastralIdentity
    elevation: ElevationProfile
    footprint_geojson: Dict[str, Any] = Field(..., description="WGS84 EPSG:4326 Polygon/MultiPolygon GeoJSON")
    solid_geometry_3d: Optional[Dict[str, Any]] = Field(None, description="CityJSON Solid or MultiSurface representation")
    parent_id: Optional[str] = None
    children_ids: List[str] = Field(default_factory=list)
    rrr: RRRModel = Field(default_factory=RRRModel)
    provenance: ProvenanceTrace
    validation_status: ValidationStatus = ValidationStatus.VALID
    validation_issues: List[str] = Field(default_factory=list)

class ValidationResultItem(BaseModel):
    rule_code: str
    rule_title: str
    severity: ValidationStatus
    entity_id: str
    entity_type: str
    description: str
    spatial_evidence: Dict[str, Any] = Field(default_factory=dict)
