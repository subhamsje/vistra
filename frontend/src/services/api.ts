import { 
  EntityDetails, 
  Jurisdiction, 
  UserProfile, 
  PipelineStatus, 
  ULPINRecord, 
  DataSourceItem, 
  ReviewQueueItem, 
  AuditRecord,
  ProjectRecord,
  PlatformGlobalStats
} from '../types/cadastre';

const API_BASE = '/api';

export const cadastreApi = {
  async getProjects(): Promise<ProjectRecord[]> {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch projects:', e);
      return [];
    }
  },

  async getProject(id: string): Promise<ProjectRecord | null> {
    try {
      const res = await fetch(`${API_BASE}/projects/${id}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return await res.json();
    } catch (e) {
      console.warn(`Failed to fetch project ${id}:`, e);
      return null;
    }
  },

  async activateProject(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${id}/activate`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to activate project');
    return await res.json();
  },

  async getPlatformStats(): Promise<PlatformGlobalStats | null> {
    try {
      const res = await fetch(`${API_BASE}/platform/stats`);
      if (!res.ok) throw new Error('Failed to fetch platform stats');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch platform stats:', e);
      return null;
    }
  },

  async getJurisdictions(projectId?: string): Promise<Jurisdiction[]> {
    try {
      const url = projectId ? `${API_BASE}/jurisdictions?project=${encodeURIComponent(projectId)}` : `${API_BASE}/jurisdictions`;
      const res = await fetch(url);
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

  async updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const res = await fetch(`${API_BASE}/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (!res.ok) throw new Error('Failed to update user profile');
      return await res.json();
    } catch (e) {
      console.warn('Failed to update user profile:', e);
      return null;
    }
  },

  async getPipelineStatus(projectId?: string): Promise<PipelineStatus | null> {
    try {
      const url = projectId ? `${API_BASE}/pipeline/status?project=${encodeURIComponent(projectId)}` : `${API_BASE}/pipeline/status`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch pipeline status');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch pipeline status:', e);
      return null;
    }
  },

  async triggerPipelineRun(projectId?: string): Promise<any> {
    const url = projectId ? `${API_BASE}/pipeline/run?project=${encodeURIComponent(projectId)}` : `${API_BASE}/pipeline/run`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Pipeline execution failed');
    return await res.json();
  },

  async getEvidenceSummary(projectId?: string): Promise<any> {
    try {
      const url = projectId ? `${API_BASE}/evidence/summary?project=${encodeURIComponent(projectId)}` : `${API_BASE}/evidence/summary`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch evidence summary');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch evidence summary:', e);
      return null;
    }
  },

  async getEntityDetails(idOrUlpin: string, projectId?: string): Promise<EntityDetails | null> {
    try {
      const url = projectId 
        ? `${API_BASE}/entity/${encodeURIComponent(idOrUlpin)}?project=${encodeURIComponent(projectId)}` 
        : `${API_BASE}/entity/${encodeURIComponent(idOrUlpin)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch entity details');
      return await res.json();
    } catch (e) {
      console.warn(`Entity ${idOrUlpin} not found:`, e);
      return null;
    }
  },

  async getRegistryRecords(query = '', entityType = 'ALL', page = 1, projectId?: string): Promise<{ total: number; records: ULPINRecord[] }> {
    try {
      const params = new URLSearchParams({ query, entity_type: entityType, page: page.toString(), limit: '50' });
      if (projectId) params.set('project', projectId);
      const res = await fetch(`${API_BASE}/registry?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch registry');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch registry records:', e);
      return { total: 0, records: [] };
    }
  },

  async getValidationReport(projectId?: string): Promise<any> {
    try {
      const url = projectId ? `${API_BASE}/validation-report?project=${encodeURIComponent(projectId)}` : `${API_BASE}/validation-report`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch validation report');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch validation report:', e);
      return { overall_status: 'UNAVAILABLE', total_rules_evaluated: 0, rules_catalog: [], errors: [], warnings: [], issues: [] };
    }
  },

  async getDataSources(projectId?: string): Promise<DataSourceItem[]> {
    try {
      const url = projectId ? `${API_BASE}/datasources?project=${encodeURIComponent(projectId)}` : `${API_BASE}/datasources`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch data sources');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch data sources:', e);
      return [];
    }
  },

  async getReviewQueue(projectId?: string): Promise<ReviewQueueItem[]> {
    try {
      const url = projectId ? `${API_BASE}/governance/review-queue?project=${encodeURIComponent(projectId)}` : `${API_BASE}/governance/review-queue`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch review queue');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch review queue:', e);
      return [];
    }
  },

  async getAuditTrail(projectId?: string): Promise<AuditRecord[]> {
    try {
      const url = projectId ? `${API_BASE}/governance/audit-trail?project=${encodeURIComponent(projectId)}` : `${API_BASE}/governance/audit-trail`;
      const res = await fetch(url);
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

  async getCadastralTree(projectId?: string): Promise<any[]> {
    try {
      const url = projectId ? `${API_BASE}/cadastral-tree?project=${encodeURIComponent(projectId)}` : `${API_BASE}/cadastral-tree`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch cadastral tree');
      return await res.json();
    } catch (e) {
      console.warn('Failed to fetch cadastral tree:', e);
      return [];
    }
  },

  async getCesiumGeoJSON(explodeFactor = 0.0, buildingId = '', selectedId = '', projectId?: string): Promise<any> {
    const params = new URLSearchParams({
      explode_factor: explodeFactor.toString(),
      ...(buildingId ? { building_id: buildingId } : {}),
      ...(selectedId ? { selected_id: selectedId } : {}),
      ...(projectId ? { project: projectId } : {})
    });
    const res = await fetch(`${API_BASE}/cesium-geojson?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch 3D GeoJSON');
    return await res.json();
  },

  async getRoadsGeoJSON(projectId?: string): Promise<any> {
    try {
      const url = projectId ? `${API_BASE}/roads?project=${encodeURIComponent(projectId)}` : `${API_BASE}/roads`;
      const res = await fetch(url);
      return await res.json();
    } catch {
      return { type: 'FeatureCollection', features: [] };
    }
  },

  async getUndergroundGeoJSON(projectId?: string): Promise<any> {
    try {
      const url = projectId ? `${API_BASE}/underground?project=${encodeURIComponent(projectId)}` : `${API_BASE}/underground`;
      const res = await fetch(url);
      return await res.json();
    } catch {
      return { type: 'FeatureCollection', features: [] };
    }
  }
};
