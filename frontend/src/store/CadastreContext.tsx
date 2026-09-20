import React, { createContext, useContext, useState, useEffect } from 'react';
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
  DataSourceItem
} from '../types/cadastre';
import { cadastreApi } from '../services/api';

interface CadastreContextType {
  activeView: NavView;
  setActiveView: (view: NavView) => void;
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
  const [activeView, setActiveView] = useState<NavView>('3d_cadastre');
  const [selectedEntity, setSelectedEntity] = useState<EntityDetails | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('B12');
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState<boolean>(false);
  const [isPropertyPanelMinimized, setIsPropertyPanelMinimized] = useState<boolean>(false);
  const [isPipelineDockMinimized, setIsPipelineDockMinimized] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<CadastralViewMode>('REALITY');
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('CITY');
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [activeJurisdiction, setActiveJurisdiction] = useState<Jurisdiction | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  
  const [layers, setLayers] = useState<LayerVisibilityState>(defaultLayers);
  const [buildingTransparency, setBuildingTransparency] = useState<number>(0);
  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [basemap, setBasemap] = useState<BasemapMode>('satellite');
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

  const loadInitialData = async () => {
    try {
      const [jList, uProfile, pStatus, initEntity] = await Promise.all([
        cadastreApi.getJurisdictions(),
        cadastreApi.getUserProfile(),
        cadastreApi.getPipelineStatus(),
        cadastreApi.getEntityDetails('B12_F3_U304')
      ]);
      setJurisdictions(jList);
      if (jList.length > 0) setActiveJurisdiction(jList[0]);
      setUser(uProfile);
      setPipelineStatus(pStatus);
      setSelectedEntity(initEntity);
      if (initEntity && initEntity.building_id) {
        setSelectedBuildingId(initEntity.building_id);
      }
    } catch (err) {
      console.error('Failed loading initial cadastre state', err);
    }
  };

  useEffect(() => {
    loadInitialData();

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
      const details = await cadastreApi.getEntityDetails(id);
      setSelectedEntity(details);
      setIsPropertyPanelOpen(true);
      if (details.building_id) {
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
        refreshData: loadInitialData,
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
