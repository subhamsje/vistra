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

export interface Jurisdiction {
  id: string;
  name: string;
  state: string;
  country: string;
  crs: string;
  center: [number, number]; // [lon, lat]
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
  entity_id: string;
  ulpin_3d: string;
  action: string;
  reviewer: string;
  notes: string;
  audit_hash: string;
  timestamp: string;
}

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
}

export type BasemapMode = 'satellite' | 'streets' | 'terrain' | 'lidar' | 'night' | 'master_plan';
export type ToolMode = 'select' | 'measure' | 'section' | 'explode' | 'compare' | 'layers' | 'dim' | 'basemap';
export type NavView = '3d_cadastre' | 'overview' | 'parcels' | 'buildings' | 'floors_units' | 'underground' | 'ulpin_registry' | 'analysis' | 'validation' | 'review_queue' | 'data_sources' | 'audit_trail' | 'settings';
export type CadastralViewMode = 'REALITY' | 'ANALYSIS';
export type CameraViewMode = 'CITY' | 'PARCEL' | 'BUILDING' | 'FLOOR' | 'UNIT' | 'TOP_DOWN' | 'ORBIT';
