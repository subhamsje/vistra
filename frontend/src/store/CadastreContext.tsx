import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  EntityDetails, 
  Jurisdiction, 
  UserProfile, 
  PipelineStatus, 
  LayerVisibilityState, 
  BasemapMode, 
  ToolMode, 
  NavView,
  CadastralViewMode,
  CameraViewMode,
  ValidationIssue,
  ExplodedFloor,
  DataSourceItem,
  ProjectRecord
} from '../types/cadastre';
import { cadastreApi } from '../services/api';

interface CadastreContextType {
  activeView: NavView;
  setActiveView: (view: NavView) => void;
  currentProject: ProjectRecord | null;
  projects: ProjectRecord[];
  setActiveProjectById: (projectId: string) => Promise<void>;
  navigateTo: (path: string, params?: Record<string, string>) => void;
  selectedEntity: EntityDetails | null;
  setSelectedEntityId: (id: string | null) => Promise<void>;
  selectedBuildingId: string;
  setSelectedBuildingId: (bId: string) => void;
  isPropertyPanelOpen: boolean;
  setIsPropertyPanelOpen: (open: boolean) => void;
  isPropertyPanelMinimized: boolean;
  setIsPropertyPanelMinimized: (minimized: boolean) => void;
  isPipelineDockMinimized: boolean;
  setIsPipelineDockMinimized: (minimized: boolean) => void;
  viewMode: CadastralViewMode;
  setViewMode: (mode: CadastralViewMode) => void;
  cameraMode: CameraViewMode;
  setCameraMode: (mode: CameraViewMode) => void;
  jurisdictions: Jurisdiction[];
  activeJurisdiction: Jurisdiction | null;
  setActiveJurisdiction: (j: Jurisdiction) => void;
  user: UserProfile | null;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<UserProfile | null>;
  reviewQueueCount: number;
  pipelineStatus: PipelineStatus | null;
  layers: LayerVisibilityState;
  toggleLayer: (layer: keyof LayerVisibilityState) => void;
  buildingTransparency: number;
  setBuildingTransparency: (val: number) => void;
  explodeFactor: number;
  setExplodeFactor: (val: number) => void;
  basemap: BasemapMode;
  setBasemap: (b: BasemapMode) => void;
  activeTool: ToolMode;
  setActiveTool: (tool: ToolMode) => void;
  isLayersPanelOpen: boolean;
  setIsLayersPanelOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  flyToTarget: [number, number] | null;
  setFlyToTarget: (coords: [number, number] | null) => void;
  triggerFlyTo: (coords: [number, number]) => void;
  refreshData: () => Promise<void>;
  validationIssues: ValidationIssue[];
  setValidationIssues: (issues: ValidationIssue[]) => void;
  activeValidationIssue: ValidationIssue | null;
  setActiveValidationIssue: (issue: ValidationIssue | null) => void;
  evidenceSources: DataSourceItem[];
  setEvidenceSources: (sources: DataSourceItem[]) => void;
  isEvidenceDrawerOpen: boolean;
  setIsEvidenceDrawerOpen: (open: boolean) => void;
  isValidationPanelOpen: boolean;
  setIsValidationPanelOpen: (open: boolean) => void;
  explodedBuildingId: string | null;
  setExplodedBuildingId: (id: string | null) => void;
  explodedFloors: Map<number, ExplodedFloor>;
  setExplodedFloors: (floors: Map<number, ExplodedFloor>) => void;
}

const defaultLayers: LayerVisibilityState = {
  terrain: true,
  satelliteImagery: true,
  parcelBoundaries: true,
  buildings3d: true,
  floorsUnits: true,
  underground: false,
  roads: true,
  utilities: false,
  lidarPointCloud: false,
  demDsm: false,
  validation: true
};

const CadastreContext = createContext<CadastreContextType | undefined>(undefined);

export const CadastreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation State from URL pathname
  const [activeView, setActiveView] = useState<NavView>(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '') return 'landing';
    if (path.startsWith('/projects')) return 'projects';
    return '3d_cadastre';
  });

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectRecord | null>(null);

  const [selectedEntity, setSelectedEntity] = useState<EntityDetails | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState<boolean>(false);
  const [isPropertyPanelMinimized, setIsPropertyPanelMinimized] = useState<boolean>(false);
  const [isPipelineDockMinimized, setIsPipelineDockMinimized] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<CadastralViewMode>('REALITY');
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('CITY');
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [activeJurisdiction, setActiveJurisdiction] = useState<Jurisdiction | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [reviewQueueCount, setReviewQueueCount] = useState<number>(0);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  
  const [layers, setLayers] = useState<LayerVisibilityState>(defaultLayers);
  const [buildingTransparency, setBuildingTransparency] = useState<number>(0);
  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [basemap, setBasemap] = useState<BasemapMode>('light');
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [activeValidationIssue, setActiveValidationIssue] = useState<ValidationIssue | null>(null);
  const [evidenceSources, setEvidenceSources] = useState<DataSourceItem[]>([]);
  const [isEvidenceDrawerOpen, setIsEvidenceDrawerOpen] = useState<boolean>(false);
  const [isValidationPanelOpen, setIsValidationPanelOpen] = useState<boolean>(false);
  const [explodedBuildingId, setExplodedBuildingId] = useState<string | null>(null);
  const [explodedFloors, setExplodedFloors] = useState<Map<number, ExplodedFloor>>(new Map());

  // URL Navigation helper
  const navigateTo = useCallback((path: string, params?: Record<string, string>) => {
    let url = path;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    window.history.pushState({}, '', url);

    if (path === '/' || path === '') {
      setActiveView('landing');
    } else if (path.startsWith('/projects')) {
      setActiveView('projects');
    } else {
      setActiveView('3d_cadastre');
    }
  }, []);

  // Listen to browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/' || path === '') {
        setActiveView('landing');
      } else if (path.startsWith('/projects')) {
        setActiveView('projects');
      } else {
        setActiveView('3d_cadastre');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load project data
  const loadProjectData = async (projectId?: string) => {
    try {
      const pList = await cadastreApi.getProjects();
      setProjects(pList);

      const searchParams = new URLSearchParams(window.location.search);
      const targetProjId = projectId || searchParams.get('project') || (pList.length > 0 ? pList[0].id : 'blr_koramangala');
      
      const activeProj = pList.find(p => p.id === targetProjId) || pList[0];
      if (activeProj) {
        setCurrentProject(activeProj);
      }

      const [jList, uProfile, pStatus, rQueue, regData, valRep, dSources] = await Promise.all([
        cadastreApi.getJurisdictions(targetProjId),
        cadastreApi.getUserProfile(),
        cadastreApi.getPipelineStatus(targetProjId),
        cadastreApi.getReviewQueue(targetProjId),
        cadastreApi.getRegistryRecords('', 'ALL', 1, targetProjId),
        cadastreApi.getValidationReport(targetProjId),
        cadastreApi.getDataSources(targetProjId)
      ]);

      setJurisdictions(jList);
      const matchedJ = jList.find(j => j.id === targetProjId) || jList[0];
      if (matchedJ) setActiveJurisdiction(matchedJ);
      setUser(uProfile);
      setPipelineStatus(pStatus);
      setReviewQueueCount(rQueue.length);
      if (valRep?.issues) setValidationIssues(valRep.issues);
      if (dSources) setEvidenceSources(dSources);

      // Select initial entity from real records
      if (regData.records && regData.records.length > 0) {
        const firstUnit = regData.records.find(r => r.entity_type === 'UNIT') || regData.records[0];
        const details = await cadastreApi.getEntityDetails(firstUnit.id, targetProjId);
        setSelectedEntity(details);
        if (details?.building_id) {
          setSelectedBuildingId(details.building_id);
          setIsPropertyPanelOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed loading cadastre state', err);
    }
  };

  // Update User Profile state and persist
  const updateUserProfile = async (profileUpdate: Partial<UserProfile>): Promise<UserProfile | null> => {
    try {
      const updated = await cadastreApi.updateUserProfile(profileUpdate);
      if (updated) {
        setUser(updated);
        try {
          localStorage.setItem('vistra_user_profile', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      }
    } catch (e) {
      console.warn('Failed updating user profile:', e);
    }
    return null;
  };

  // Switch active project
  const setActiveProjectById = async (projectId: string) => {
    try {
      // Update browser URL query parameter without full reload
      const url = new URL(window.location.href);
      url.searchParams.set('project', projectId);
      window.history.pushState({}, '', url.toString());

      await cadastreApi.activateProject(projectId);
      await loadProjectData(projectId);

      // Trigger fly to new project center
      const proj = projects.find(p => p.id === projectId);
      if (proj && proj.center) {
        triggerFlyTo(proj.center);
      }
    } catch (err) {
      console.error(`Failed to activate project ${projectId}:`, err);
    }
  };

  useEffect(() => {
    loadProjectData();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const setSelectedEntityId = async (id: string | null) => {
    if (!id) {
      setSelectedEntity(null);
      setIsPropertyPanelOpen(false);
      return;
    }
    try {
      const details = await cadastreApi.getEntityDetails(id, currentProject?.id);
      setSelectedEntity(details);
      setIsPropertyPanelOpen(true);
      if (details?.building_id) {
        setSelectedBuildingId(details.building_id);
      }
    } catch (err) {
      console.error('Failed loading entity details for', id, err);
    }
  };

  const toggleLayer = (layer: keyof LayerVisibilityState) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const triggerFlyTo = (coords: [number, number]) => {
    setFlyToTarget(coords);
  };

  return (
    <CadastreContext.Provider
      value={{
        activeView,
        setActiveView,
        currentProject,
        projects,
        setActiveProjectById,
        navigateTo,
        selectedEntity,
        setSelectedEntityId,
        selectedBuildingId,
        setSelectedBuildingId,
        isPropertyPanelOpen,
        setIsPropertyPanelOpen,
        isPropertyPanelMinimized,
        setIsPropertyPanelMinimized,
        isPipelineDockMinimized,
        setIsPipelineDockMinimized,
        viewMode,
        setViewMode,
        cameraMode,
        setCameraMode,
        jurisdictions,
        activeJurisdiction,
        setActiveJurisdiction,
        user,
        updateUserProfile,
        reviewQueueCount,
        pipelineStatus,
        layers,
        toggleLayer,
        buildingTransparency,
        setBuildingTransparency,
        explodeFactor,
        setExplodeFactor,
        basemap,
        setBasemap,
        activeTool,
        setActiveTool,
        isLayersPanelOpen,
        setIsLayersPanelOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        flyToTarget,
        setFlyToTarget,
        triggerFlyTo,
        refreshData: () => loadProjectData(currentProject?.id),
        validationIssues,
        setValidationIssues,
        activeValidationIssue,
        setActiveValidationIssue,
        evidenceSources,
        setEvidenceSources,
        isEvidenceDrawerOpen,
        setIsEvidenceDrawerOpen,
        isValidationPanelOpen,
        setIsValidationPanelOpen,
        explodedBuildingId,
        setExplodedBuildingId,
        explodedFloors,
        setExplodedFloors
      }}
    >
      {children}
    </CadastreContext.Provider>
  );
};

export const useCadastre = () => {
  const context = useContext(CadastreContext);
  if (!context) {
    throw new Error('useCadastre must be used within a CadastreProvider');
  }
  return context;
};

