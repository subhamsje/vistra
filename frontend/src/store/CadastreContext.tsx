import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  EntityDetails, 
  Jurisdiction, 
  UserProfile, 
  PipelineStatus, 
  LayerVisibilityState, 
  BasemapMode, 
  ToolMode, 
  NavView 
} from '../types/cadastre';
import { cadastreApi } from '../services/api';

interface CadastreContextType {
  activeView: NavView;
  setActiveView: (view: NavView) => void;
  selectedEntity: EntityDetails | null;
  setSelectedEntityId: (id: string) => Promise<void>;
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
  triggerFlyTo: (coords: [number, number]) => void;
  refreshData: () => Promise<void>;
}

const defaultLayers: LayerVisibilityState = {
  terrain: true,
  satelliteImagery: true,
  parcelBoundaries: true,
  buildings3d: true,
  floorsUnits: true,
  underground: true,
  roads: true,
  utilities: false,
  lidarPointCloud: false,
  demDsm: false
};

const CadastreContext = createContext<CadastreContextType | undefined>(undefined);

export const CadastreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<NavView>('3d_cadastre');
  const [selectedEntity, setSelectedEntity] = useState<EntityDetails | null>(null);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [activeJurisdiction, setActiveJurisdiction] = useState<Jurisdiction | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  
  const [layers, setLayers] = useState<LayerVisibilityState>(defaultLayers);
  const [buildingTransparency, setBuildingTransparency] = useState<number>(0);
  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [basemap, setBasemap] = useState<BasemapMode>('satellite');
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState<boolean>(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null);

  const loadInitialData = async () => {
    try {
      const [jList, uProfile, pStatus, initEntity] = await Promise.all([
        cadastreApi.getJurisdictions(),
        cadastreApi.getUserProfile(),
        cadastreApi.getPipelineStatus(),
        cadastreApi.getEntityDetails('B12_F3_U04')
      ]);
      setJurisdictions(jList);
      if (jList.length > 0) setActiveJurisdiction(jList[0]);
      setUser(uProfile);
      setPipelineStatus(pStatus);
      setSelectedEntity(initEntity);
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

  const setSelectedEntityId = async (id: string) => {
    try {
      const details = await cadastreApi.getEntityDetails(id);
      setSelectedEntity(details);
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
        triggerFlyTo,
        refreshData: loadInitialData
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
