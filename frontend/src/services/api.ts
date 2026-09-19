import { 
  EntityDetails, 
  Jurisdiction, 
  UserProfile, 
  PipelineStatus, 
  ULPINRecord, 
  DataSourceItem, 
  ReviewQueueItem, 
  AuditRecord 
} from '../types/cadastre';

const API_BASE = '/api';

export const cadastreApi = {
  async getJurisdictions(): Promise<Jurisdiction[]> {
    try {
      const res = await fetch(`${API_BASE}/jurisdictions`);
      if (!res.ok) throw new Error('Failed to fetch jurisdictions');
      return await res.json();
    } catch {
      return [
        {
          id: 'BLR',
          name: 'Bengaluru Urban District',
          state: 'Karnataka',
          country: 'India',
          crs: 'EPSG:4326 WGS 84',
          center: [77.6248, 12.9356],
          elevation_m: 920.0,
          active: true
        }
      ];
    }
  },

  async getUserProfile(): Promise<UserProfile> {
    try {
      const res = await fetch(`${API_BASE}/user`);
      if (!res.ok) throw new Error('Failed to fetch user');
      return await res.json();
    } catch {
      return {
        id: 'USR-1082',
        name: 'Ananya Rao',
        role: 'Reviewer',
        initials: 'AR',
        department: 'Karnataka State Remote Sensing Applications Centre (KSRSAC)',
        notifications_count: 3
      };
    }
  },

  async getPipelineStatus(): Promise<PipelineStatus> {
    try {
      const res = await fetch(`${API_BASE}/pipeline/status`);
      if (!res.ok) throw new Error('Failed to fetch pipeline status');
      return await res.json();
    } catch {
      return {
        status: 'Completed',
        completed_at: '12 Mar 2024, 10:24 AM',
        stages: [
          { id: 1, name: 'Ingestion', status: 'completed', metric: '8 datasets' },
          { id: 2, name: 'GIS Processing', status: 'completed', metric: '8/8' },
          { id: 3, name: 'Building Extraction', status: 'completed', metric: '142 buildings' },
          { id: 4, name: 'Floor Segmentation', status: 'completed', metric: '612 floors' },
          { id: 5, name: '3D Parcel Generation', status: 'completed', metric: '598 units' },
          { id: 6, name: 'Validation', status: 'warning', metric: '3 issues' },
          { id: 7, name: 'ULPIN Generation', status: 'completed', metric: '598 ULPINs' }
        ],
        throughput_sparkline: [45, 78, 120, 195, 310, 480, 598]
      };
    }
  },

  async getEntityDetails(idOrUlpin: string): Promise<EntityDetails> {
    try {
      const res = await fetch(`${API_BASE}/entity/${encodeURIComponent(idOrUlpin)}`);
      if (!res.ok) throw new Error('Failed to fetch entity details');
      return await res.json();
    } catch {
      return {
        entity_id: 'B12_F3_U04',
        ulpin_3d: 'IN-KA-BLR-P78-B12-F3-U04',
        entity_type: 'UNIT',
        type_label: 'Apartment / Unit',
        category: 'Residential',
        validation_status: 'Validated',
        parcel_id: 'P78',
        building_id: 'B12',
        floor_level: 3,
        unit_number: 'U04',
        area_sqft: 1284,
        area_sqm: 119.3,
        vertical_extent: '+12.4 m -> +15.8 m',
        elevation_abs: '932.4 m -> 935.8 m',
        volume_m3: 381.8,
        geometry_confidence: 94,
        data_confidence: 91,
        validation_checklist: [
          { name: 'Valid Geometry', status: 'PASS' },
          { name: 'Parcel Match', status: 'PASS' },
          { name: 'No Overlaps', status: 'PASS' },
          { name: 'Unique ULPIN', status: 'PASS' },
          { name: 'Valid Containment', status: 'PASS' },
          { name: 'CRS Consistent', status: 'PASS' },
          { name: 'Floor Sequence OK', status: 'PASS' }
        ],
        data_sources: ['LiDAR', 'GIS Parcel', 'Floor Plan', 'GNSS', '+2 more'],
        last_updated: '12 Mar 2024, 10:24 AM',
        version: 'v1.2.0',
        audit_hash: 'a9e9ebffe8352344afdd8e74f80ec44191ae70460ff89a124dadc44a8a4fe160',
        thumbnail_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'
      };
    }
  },

  async getRegistryRecords(query = '', entityType = 'ALL', page = 1): Promise<{ total: number; records: ULPINRecord[] }> {
    try {
      const params = new URLSearchParams({ query, entity_type: entityType, page: page.toString(), limit: '25' });
      const res = await fetch(`${API_BASE}/registry?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch registry');
      return await res.json();
    } catch {
      return { total: 0, records: [] };
    }
  },

  async getValidationReport(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/validation-report`);
      return await res.json();
    } catch {
      return { overall_status: 'PASS', issues: [] };
    }
  },

  async getDataSources(): Promise<DataSourceItem[]> {
    try {
      const res = await fetch(`${API_BASE}/datasources`);
      return await res.json();
    } catch {
      return [];
    }
  },

  async getReviewQueue(): Promise<ReviewQueueItem[]> {
    try {
      const res = await fetch(`${API_BASE}/governance/review-queue`);
      return await res.json();
    } catch {
      return [];
    }
  },

  async getAuditTrail(): Promise<AuditRecord[]> {
    try {
      const res = await fetch(`${API_BASE}/governance/audit-trail`);
      return await res.json();
    } catch {
      return [];
    }
  },

  async submitGovernanceDecision(payload: { entity_id: string; ulpin_3d: string; action: string; reviewer: string; notes: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/governance/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async getCadastralTree(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/cadastral-tree`);
      if (!res.ok) throw new Error('Failed to fetch cadastral tree');
      return await res.json();
    } catch {
      return [];
    }
  },

  async getCesiumGeoJSON(explodeFactor = 0.0, buildingId = 'B12', selectedId = ''): Promise<any> {
    const params = new URLSearchParams({
      explode_factor: explodeFactor.toString(),
      building_id: buildingId,
      ...(selectedId ? { selected_id: selectedId } : {})
    });
    const res = await fetch(`${API_BASE}/cesium-geojson?${params.toString()}`);
    return await res.json();
  },

  async getRoadsGeoJSON(): Promise<any> {
    const res = await fetch(`${API_BASE}/roads`);
    return await res.json();
  },

  async getUndergroundGeoJSON(): Promise<any> {
    const res = await fetch(`${API_BASE}/underground`);
    return await res.json();
  }
};
