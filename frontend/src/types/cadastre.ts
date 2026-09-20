export type EntityType = 'PARCEL' | 'BUILDING' | 'FLOOR' | 'UNIT' | 'UNDERGROUND' | 'COMMON_AREA';

export interface ValidationItem {
  name: string;
  status: 'PASS' | 'WARNING' | 'ERROR';
}

export interface EvidenceSourceDetail {
  source_name: string;
  category: string;
  status: 'USED' | 'UNAVAILABLE' | 'OPTIONAL';
  timestamp: string;
  dataset_id: string;
  confidence: number;
  contribution: string;
}

export interface EntityDetails {
  entity_id: string;
  ulpin_3d: string;
  entity_type: EntityType;
  type_label: string;
  category: string;
  validation_status: 'Validated' | 'Needs Review' | 'Disputed' | 'Pending';
  parcel_id: string;
  building_id?: string;
  floor_level?: number;
  unit_number?: string;
  area_sqft: number;
  area_sqm: number;
  vertical_extent: string;
  elevation_abs: string;
  volume_m3: number;
  geometry_confidence: number;
  data_confidence: number;
  validation_checklist: ValidationItem[];
  data_sources: string[];
  evidence_breakdown?: EvidenceSourceDetail[];
  last_updated: string;
  version: string;
  audit_hash: string;
  thumbnail_url?: string;
}

export interface ProjectStats {
  parcels: number;
  buildings: number;
  floors: number;
  units: number;
  total_ulpins: number;
  validation_status: string;
  total_volume_m3: number;
  mean_gcp_residual_m: number;
}

export interface ProjectRecord {
  id: string;
  name: string;
  jurisdiction: string;
  survey_khasra_no: string;
  state: string;
  country: string;
  crs: string;
  center: [number, number];
  elevation_m: number;
  description: string;
  featured?: boolean;
  thumbnail_url?: string;
  processing_status: string;
  dataset_count: number;
  stats: ProjectStats;
}

export interface PlatformGlobalStats {
  total_projects: number;
  total_parcels: number;
  total_buildings: number;
  total_floors: number;
  total_units: number;
  total_ulpins_registered: number;
  total_volumetric_extent_m3: number;
  system_topology_pass_rate: string;
  geodetic_survey_order: string;
  compliance_standards: string[];
}

export interface Jurisdiction {
  id: string;
  name: string;
  jurisdiction?: string;
  state: string;
  country: string;
  crs: string;
  center: [number, number];
  elevation_m: number;
  active: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  initials: string;
  department: string;
  notifications_count: number;
}

export interface PipelineStage {
  id: number;
  name: string;
  status: 'completed' | 'running' | 'pending' | 'warning' | 'failed';
  metric: string;
}

export interface PipelineStatus {
  status: string;
  completed_at: string;
  stages: PipelineStage[];
  throughput_sparkline: number[];
}

export interface ULPINRecord {
  id: string;
  ulpin_3d: string;
  entity_type: EntityType;
  name: string;
  unit_number?: string;
  unit_type?: string;
  parcel_id?: string;
  building_id?: string;
  floor_level?: number;
  z_bounds: [number, number];
  confidence: number;
  validation_status: string;
  audit_hash: string;
}

export interface DataSourceItem {
  name: string;
  type: string;
  size_formatted: string;
  crs: string;
  status: string;
  feature_count: number;
  uploaded_at: string;
  source_category: string;
}

export interface ReviewQueueItem {
  entity_id: string;
  ulpin_3d: string;
  title: string;
  building_id: string;
  confidence: number;
  reason: string;
  source: string;
  suggested_action: string;
  flagged_at: string;
  coordinates?: [number, number];
}

export interface AuditRecord {
  id: number;
  timestamp: string;
  entity_id: string;
  ulpin_3d: string;
  action: string;
  reviewer: string;
  notes: string;
  audit_hash: string;
  status?: string;
}

export interface ValidationIssue {
  id: string;
  rule_id: string;
  rule_name: string;
  entity_id: string;
  entity_type: string;
  status: 'ERROR' | 'WARNING';
  message: string;
  coordinates?: [number, number];
}

export interface ExplodedFloor {
  floorLevel: number;
  altitudeOffset: number;
  visible: boolean;
  isolated: boolean;
}

export type BasemapMode = 'streets' | 'satellite' | 'night' | 'terrain';
export type ToolMode = 'select' | 'measure' | 'section' | 'explode' | 'layers' | 'camera';
export type CadastralViewMode = 'REALITY' | 'LEGAL' | 'ANALYSIS' | 'XRAY';
export type CameraViewMode = 'CITY' | 'PARCEL' | 'BUILDING' | 'FLOOR' | 'UNIT' | 'TOP_DOWN';

export type NavView = 
  | 'landing'
  | 'projects'
  | 'overview' 
  | '3d_cadastre' 
  | 'parcels' 
  | 'buildings' 
  | 'floors_units' 
  | 'underground' 
  | 'ulpin_registry' 
  | 'analysis' 
  | 'validation' 
  | 'review_queue' 
  | 'data_sources' 
  | 'audit_trail' 
  | 'settings';

export interface LayerVisibilityState {
  terrain: boolean;
  satelliteImagery: boolean;
  parcelBoundaries: boolean;
  buildings3d: boolean;
  floorsUnits: boolean;
  underground: boolean;
  roads: boolean;
  utilities: boolean;
  lidarPointCloud: boolean;
  demDsm: boolean;
  validation: boolean;
}
