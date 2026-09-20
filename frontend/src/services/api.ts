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
    } catch (e) {
      console.warn('Failed to fetch jurisdictions:', e);
      return [];
    }
  },

  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const res = await fetch(`${API_BASE}/user`);
      if (!res.ok) throw new Error('Failed to fetch user');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch user profile:', e);
      return null;
    }
  },

  async getPipelineStatus(): Promise<PipelineStatus | null> {
    try {
      const res = await fetch(`${API_BASE}/pipeline/status`);
      if (!res.ok) throw new Error('Failed to fetch pipeline status');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch pipeline status:', e);
      return null;
    }
  },

  async triggerPipelineRun(): Promise<any> {
    const res = await fetch(`${API_BASE}/pipeline/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Pipeline execution failed');
    return await res.json();
  },

  async getEvidenceSummary(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/evidence/summary`);
      if (!res.ok) throw new Error('Failed to fetch evidence summary');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch evidence summary:', e);
      return null;
    }
  },

  async getEntityDetails(idOrUlpin: string): Promise<EntityDetails | null> {
    try {
      const res = await fetch(`${API_BASE}/entity/${encodeURIComponent(idOrUlpin)}`);
      if (!res.ok) throw new Error('Failed to fetch entity details');
      return await res.json();
    } catch (e) {
      console.warn(`Entity ${idOrUlpin} not found:`, e);
      return null;
    }
  },

  async getRegistryRecords(query = '', entityType = 'ALL', page = 1): Promise<{ total: number; records: ULPINRecord[] }> {
    try {
      const params = new URLSearchParams({ query, entity_type: entityType, page: page.toString(), limit: '50' });
      const res = await fetch(`${API_BASE}/registry?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch registry');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch registry records:', e);
      return { total: 0, records: [] };
    }
  },

  async getValidationReport(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/validation-report`);
      if (!res.ok) throw new Error('Failed to fetch validation report');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch validation report:', e);
      return { overall_status: 'UNAVAILABLE', total_rules_evaluated: 0, rules_catalog: [], errors: [], warnings: [], issues: [] };
    }
  },

  async getDataSources(): Promise<DataSourceItem[]> {
    try {
      const res = await fetch(`${API_BASE}/datasources`);
      if (!res.ok) throw new Error('Failed to fetch data sources');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch data sources:', e);
      return [];
    }
  },

  async getReviewQueue(): Promise<ReviewQueueItem[]> {
    try {
      const res = await fetch(`${API_BASE}/governance/review-queue`);
      if (!res.ok) throw new Error('Failed to fetch review queue');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch review queue:', e);
      return [];
    }
  },

  async getAuditTrail(): Promise<AuditRecord[]> {
    try {
      const res = await fetch(`${API_BASE}/governance/audit-trail`);
      if (!res.ok) throw new Error('Failed to fetch audit trail');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch audit trail:', e);
      return [];
    }
  },

  async submitGovernanceDecision(payload: { entity_id: string; ulpin_3d: string; action: string; reviewer: string; notes: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/governance/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to submit governance decision');
    return await res.json();
  },

  async getCadastralTree(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/cadastral-tree`);
      if (!res.ok) throw new Error('Failed to fetch cadastral tree');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch cadastral tree:', e);
      return [];
    }
  },

  async getCesiumGeoJSON(explodeFactor = 0.0, buildingId = 'BLDG_ALPHA', selectedId = ''): Promise<any> {
    const params = new URLSearchParams({
      explode_factor: explodeFactor.toString(),
      ...(buildingId ? { building_id: buildingId } : {}),
      ...(selectedId ? { selected_id: selectedId } : {})
    });
    const res = await fetch(`${API_BASE}/cesium-geojson?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch 3D GeoJSON');
    return await res.json();
  },

  async getRoadsGeoJSON(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/roads`);
      return await res.json();
    } catch {
      return { type: 'FeatureCollection', features: [] };
    }
  },

  async getUndergroundGeoJSON(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/underground`);
      return await res.json();
    } catch {
      return { type: 'FeatureCollection', features: [] };
    }
  }
};
