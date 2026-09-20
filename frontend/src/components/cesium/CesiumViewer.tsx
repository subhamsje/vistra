import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCadastre } from '../../store/CadastreContext';
import { cadastreApi } from '../../services/api';
import { EntityType } from '../../types/cadastre';

declare const Cesium: any;

interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

interface CameraMode {
  name: string;
  heading: number;
  pitch: number;
  rangeFactor: number;
}

type CameraModeKey = 'city' | 'parcel' | 'building' | 'floor' | 'unit';

const CAMERA_MODES: Record<CameraModeKey, CameraMode> = {
  city: { name: 'CITY VIEW', heading: 35, pitch: -28, rangeFactor: 1.0 },
  parcel: { name: 'PARCEL VIEW', heading: 45, pitch: -35, rangeFactor: 0.55 },
  building: { name: 'BUILDING VIEW', heading: 35, pitch: -30, rangeFactor: 0.35 },
  floor: { name: 'FLOOR VIEW', heading: 20, pitch: -45, rangeFactor: 0.18 },
  unit: { name: 'UNIT VIEW', heading: 15, pitch: -50, rangeFactor: 0.10 },
};

// Sophisticated Deep-Tech Palettes for Cadastral Entities
const ENTITY_COLORS: Record<EntityType, { fill: string; outline: string; highlight: string }> = {
  PARCEL: { fill: '#10b981', outline: '#059669', highlight: '#34d399' },
  BUILDING: { fill: '#0284c7', outline: '#0369a1', highlight: '#38bdf8' },
  FLOOR: { fill: '#06b6d4', outline: '#0891b2', highlight: '#67e8f9' },
  UNIT: { fill: '#8b5cf6', outline: '#7c3aed', highlight: '#c084fc' },
  UNDERGROUND: { fill: '#ec4899', outline: '#db2777', highlight: '#f472b6' },
  COMMON_AREA: { fill: '#f59e0b', outline: '#d97706', highlight: '#fbbf24' },
};

// Floor color gradient palette for distinct architectural distinction
const FLOOR_GRADIENTS = [
  { fill: '#f59e0b', outline: '#d97706' }, // Floor 1 (Gold)
  { fill: '#10b981', outline: '#059669' }, // Floor 2 (Emerald)
  { fill: '#06b6d4', outline: '#0891b2' }, // Floor 3 (Cyan)
  { fill: '#3b82f6', outline: '#2563eb' }, // Floor 4 (Blue)
  { fill: '#8b5cf6', outline: '#7c3aed' }, // Floor 5 (Purple)
  { fill: '#ec4899', outline: '#db2777' }, // Floor 6 (Pink)
];

const CONTEXT_BUILDING_COLOR = { fill: '#334155', outline: '#475569' };

export const CesiumViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const dataSourceRef = useRef<any>(null);
  const roadsSourceRef = useRef<any>(null);
  const undergroundSourceRef = useRef<any>(null);
  const validationSourceRef = useRef<any>(null);

  const [loading3D, setLoading3D] = useState(true);
  const [currentCameraMode, setCurrentCameraMode] = useState<CameraModeKey>('city');
  const entityBoundingBoxes = useRef<Map<string, BoundingBox>>(new Map());

  // Measurement tool state
  const [measurePoints, setMeasurePoints] = useState<any[]>([]);
  const [measureResult, setMeasureResult] = useState<{
    distance: number;
    deltaZ: number;
    horizDist: number;
    p1?: { lon: number; lat: number; height: number };
    p2?: { lon: number; lat: number; height: number };
  } | null>(null);
  const measureHandlerRef = useRef<any>(null);
  const measureEntityRef = useRef<any>(null);

  // Section clipping plane state
  const [sectionHeight, setSectionHeight] = useState<number>(30); // 0 to 60 meters elevation

  // Primitives ref
  const pointCloudPrimitivesRef = useRef<any>(null);
  const demPrimitivesRef = useRef<any>(null);
  const orbitListenerRef = useRef<any>(null);

  const { 
    layers, 
    buildingTransparency, 
    explodeFactor, 
    basemap, 
    selectedEntity,
    setSelectedEntityId,
    selectedBuildingId,
    activeJurisdiction,
    flyToTarget,
    setFlyToTarget,
    viewMode,
    setViewMode,
    activeTool,
    setActiveTool,
    cameraMode,
    setCameraMode
  } = useCadastre();

  const calculateBoundingBox = useCallback((entity: any): BoundingBox | null => {
    if (!entity.polygon || !entity.polygon.hierarchy) return null;
    
    const positions = entity.polygon.hierarchy.getValue ? entity.polygon.hierarchy.getValue() : entity.polygon.hierarchy;
    if (!positions) return null;

    let minLon = Infinity, minLat = Infinity, minHeight = Infinity;
    let maxLon = -Infinity, maxLat = -Infinity, maxHeight = -Infinity;

    const processPositions = (pos: any) => {
      if (Array.isArray(pos)) {
        pos.forEach(p => {
          const cart = Cesium.Cartographic.fromCartesian(p);
          const lon = Cesium.Math.toDegrees(cart.longitude);
          const lat = Cesium.Math.toDegrees(cart.latitude);
          const height = cart.height;
          minLon = Math.min(minLon, lon);
          maxLon = Math.max(maxLon, lon);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minHeight = Math.min(minHeight, height);
          maxHeight = Math.max(maxHeight, height);
        });
      }
    };

    if (positions.positions) {
      processPositions(positions.positions);
    } else if (Array.isArray(positions)) {
      processPositions(positions);
    }

    if (minLon === Infinity) return null;

    return {
      min: [minLon, minLat, minHeight],
      max: [maxLon, maxLat, maxHeight]
    };
  }, []);

  const computeBoundingSphere = useCallback((bbox: BoundingBox) => {
    const centerLon = (bbox.min[0] + bbox.max[0]) / 2;
    const centerLat = (bbox.min[1] + bbox.max[1]) / 2;
    const centerHeight = (bbox.min[2] + bbox.max[2]) / 2;
    
    const center = Cesium.Cartesian3.fromDegrees(centerLon, centerLat, centerHeight);
    
    const corners = [
      [bbox.min[0], bbox.min[1], bbox.min[2]],
      [bbox.min[0], bbox.min[1], bbox.max[2]],
      [bbox.min[0], bbox.max[1], bbox.min[2]],
      [bbox.min[0], bbox.max[1], bbox.max[2]],
      [bbox.max[0], bbox.min[1], bbox.min[2]],
      [bbox.max[0], bbox.min[1], bbox.max[2]],
      [bbox.max[0], bbox.max[1], bbox.min[2]],
      [bbox.max[0], bbox.max[1], bbox.max[2]],
    ];
    
    let maxDist = 0;
    corners.forEach(corner => {
      const cornerCart = Cesium.Cartesian3.fromDegrees(corner[0], corner[1], corner[2]);
      const dist = Cesium.Cartesian3.distance(center, cornerCart);
      maxDist = Math.max(maxDist, dist);
    });
    
    return new Cesium.BoundingSphere(center, Math.max(maxDist * 1.3, 20));
  }, []);

  const flyToEntity = useCallback((entityId: string, mode: CameraModeKey = 'building') => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const bbox = entityBoundingBoxes.current.get(entityId);
    if (!bbox) {
      // Fallback target if entity bounding box not yet cached
      const targetCenter = Cesium.Cartesian3.fromDegrees(77.62515, 12.9358, 20.0);
      viewer.camera.flyToBoundingSphere(
        new Cesium.BoundingSphere(targetCenter, 80),
        {
          offset: new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(35),
            Cesium.Math.toRadians(-30),
            120
          ),
          duration: 1.2,
          complete: () => setCurrentCameraMode(mode)
        }
      );
      return;
    }

    const modeConfig = CAMERA_MODES[mode];
    const boundingSphere = computeBoundingSphere(bbox);
    const range = Math.max(boundingSphere.radius * modeConfig.rangeFactor * 3.5, 30);

    viewer.camera.flyToBoundingSphere(boundingSphere, {
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(modeConfig.heading),
        Cesium.Math.toRadians(modeConfig.pitch),
        range
      ),
      duration: 1.2,
      complete: () => {
        setCurrentCameraMode(mode);
      }
    });
  }, [computeBoundingSphere]);

  // Initial Cesium Scene Setup
  useEffect(() => {
    let isCancelled = false;
    let timer: any = null;

    const initViewer = () => {
      if (isCancelled || !containerRef.current || viewerRef.current) return;

      if (typeof Cesium === 'undefined') {
        timer = setTimeout(initViewer, 100);
        return;
      }

      try {
        Cesium.Ion.defaultAccessToken = '';

        // Create initial imagery provider
        let initialProvider: any = null;
        try {
          initialProvider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 19,
            credit: 'Esri World Imagery'
          });
        } catch (e) {
          console.warn('Initial imagery provider fallback:', e);
        }

        // Create viewer with dark deep-tech spatial canvas
        const viewer = new Cesium.Viewer(containerRef.current, {
          imageryProvider: initialProvider || false,
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          skyAtmosphere: false,
          skyBox: false,
          orderIndependentTranslucency: true,
          contextOptions: {
            webgl: {
              alpha: true,
              preserveDrawingBuffer: true
            }
          }
        });

        // Dark high-tech cosmos configuration - zero blue haze
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = false;
        }
        if (viewer.scene.skyBox) {
          viewer.scene.skyBox.show = false;
        }
        if (viewer.scene.sun) {
          viewer.scene.sun.show = false;
        }
        if (viewer.scene.moon) {
          viewer.scene.moon.show = false;
        }

        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.globe.enableLighting = false;
        viewer.scene.globe.showGroundAtmosphere = false;
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#070b14');
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#070b14');
        viewer.scene.fog.enabled = false;
        viewer.shadows = false;

        // Initial camera position directly looking down at Koramangala site (77.62515, 12.9358)
        const initLon = activeJurisdiction?.center ? activeJurisdiction.center[0] : 77.62515;
        const initLat = activeJurisdiction?.center ? activeJurisdiction.center[1] : 12.9358;

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(initLon - 0.0016, initLat - 0.0022, 280.0),
          orientation: {
            heading: Cesium.Math.toRadians(35),
            pitch: Cesium.Math.toRadians(-38),
            roll: 0.0
          }
        });

        // Entity click picking handler
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        
        handler.setInputAction((movement: any) => {
          const picked = viewer.scene.pick(movement.position);
          if (Cesium.defined(picked) && picked.id && picked.id.properties) {
            const props = picked.id.properties;
            const eId = props.id ? props.id.getValue() : (picked.id.id || '');
            if (eId) {
              setSelectedEntityId(eId);
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        viewerRef.current = viewer;
      } catch (err) {
        console.error('Error initializing Cesium viewer:', err);
      }
    };

    initViewer();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [activeJurisdiction, setSelectedEntityId]);

  // Robust Basemap Imagery Layer Switcher (Handles Failures Gracefully)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let provider: any = null;

    try {
      if (basemap === 'streets') {
        provider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          maximumLevel: 19,
          credit: 'OpenStreetMap'
        });
      } else if (basemap === 'night') {
        provider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c', 'd'],
          maximumLevel: 19,
          credit: 'CartoDB Dark'
        });
      } else if (basemap === 'terrain') {
        provider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
          maximumLevel: 19,
          credit: 'Esri Topo'
        });
      } else if (basemap === 'master_plan') {
        provider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
          maximumLevel: 19,
          credit: 'Esri Street'
        });
      } else if (basemap === 'satellite') {
        provider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          maximumLevel: 19,
          credit: 'Esri World Imagery'
        });
      }
    } catch (e) {
      console.warn('Basemap imagery provider init fallback:', e);
      provider = null;
    }

    try {
      viewer.imageryLayers.removeAll();
      if (provider) {
        const layer = viewer.imageryLayers.addImageryProvider(provider);
        if (layer) {
          // Keep satellite tone clean and subdued to let 3D property geometries pop
          layer.brightness = viewMode === 'ANALYSIS' ? 0.7 : 0.85;
          layer.contrast = 1.15;
          layer.saturation = viewMode === 'ANALYSIS' ? 0.2 : 0.7;
          layer.alpha = viewMode === 'ANALYSIS' ? 0.35 : 0.85;
        }
      }
    } catch (e) {
      console.warn('Could not switch basemap layer, falling back to spatial grid canvas', e);
    }
  }, [basemap, viewMode]);

  // Styling logic for 3D Cadastral Entities
  const applyEntityStyling = useCallback((
    entity: any, 
    props: any, 
    eType: EntityType, 
    eId: string, 
    flLvl: number, 
    isContext: boolean, 
    baseAlpha: number, 
    selectedId: string, 
    selectedFloorNum: number
  ) => {
    if (!entity.polygon) return;

    const isSelected = eId === selectedId;
    const isFloorSelected = flLvl === selectedFloorNum && selectedFloorNum > 0;
    const colors = ENTITY_COLORS[eType] || ENTITY_COLORS.BUILDING;

    if (eType === 'PARCEL') {
      entity.polygon.height = 0.05;
      entity.polygon.extrudedHeight = 0.25;
      entity.polygon.material = Cesium.Color.fromCssColorString(isSelected ? '#34d399' : '#10b981').withAlpha(isSelected ? 0.35 : 0.15);
      entity.polygon.outline = true;
      entity.polygon.outlineColor = Cesium.Color.fromCssColorString(isSelected ? '#34d399' : '#059669').withAlpha(0.95);
      entity.polygon.outlineWidth = isSelected ? 4 : 2;
      entity.polygon.perPositionHeight = false;
      entity.polygon.closeTop = true;
      entity.polygon.closeBottom = true;
      entity.show = layers.parcelBoundaries;
      
      const bbox = calculateBoundingBox(entity);
      if (bbox) entityBoundingBoxes.current.set(eId, bbox);
      
    } else if (isContext) {
      // Subdued context buildings around selected site
      entity.polygon.height = props.local_base_m?.getValue() || 0;
      entity.polygon.extrudedHeight = props.local_roof_m?.getValue() || 15;
      entity.polygon.material = Cesium.Color.fromCssColorString(CONTEXT_BUILDING_COLOR.fill).withAlpha(0.28 * baseAlpha);
      entity.polygon.outline = true;
      entity.polygon.outlineColor = Cesium.Color.fromCssColorString(CONTEXT_BUILDING_COLOR.outline).withAlpha(0.5);
      entity.polygon.outlineWidth = 1;
      entity.polygon.perPositionHeight = false;
      entity.polygon.closeTop = true;
      entity.polygon.closeBottom = true;
      entity.show = layers.buildings3d;
      
      const bbox = calculateBoundingBox(entity);
      if (bbox) entityBoundingBoxes.current.set(eId, bbox);
      
    } else if (eType === 'BUILDING') {
      entity.polygon.height = props.local_base_m?.getValue() || 0;
      entity.polygon.extrudedHeight = props.local_roof_m?.getValue() || 18;
      entity.polygon.material = Cesium.Color.fromCssColorString(colors.fill).withAlpha(isSelected ? 0.92 : 0.65 * baseAlpha);
      entity.polygon.outline = true;
      entity.polygon.outlineColor = isSelected 
        ? Cesium.Color.fromCssColorString('#38bdf8').withAlpha(1.0)
        : Cesium.Color.WHITE.withAlpha(0.5);
      entity.polygon.outlineWidth = isSelected ? 4 : 2;
      entity.polygon.perPositionHeight = false;
      entity.polygon.closeTop = true;
      entity.polygon.closeBottom = true;
      entity.show = layers.buildings3d;
      
      const bbox = calculateBoundingBox(entity);
      if (bbox) entityBoundingBoxes.current.set(eId, bbox);
      
    } else if (eType === 'FLOOR') {
      entity.polygon.height = props.local_base_m?.getValue() || 0;
      entity.polygon.extrudedHeight = props.local_roof_m?.getValue() || 3;
      
      const floorGrad = FLOOR_GRADIENTS[Math.abs(flLvl - 1) % FLOOR_GRADIENTS.length];
      entity.polygon.material = Cesium.Color.fromCssColorString(floorGrad.fill).withAlpha(isFloorSelected ? 0.95 : 0.70 * baseAlpha);
      entity.polygon.outline = true;
      entity.polygon.outlineColor = isFloorSelected
        ? Cesium.Color.fromCssColorString('#38bdf8').withAlpha(1.0)
        : Cesium.Color.WHITE.withAlpha(0.65);
      entity.polygon.outlineWidth = isFloorSelected ? 3.5 : 1.5;
      entity.polygon.perPositionHeight = false;
      entity.polygon.closeTop = true;
      entity.polygon.closeBottom = true;
      entity.show = layers.floorsUnits;
      
      const bbox = calculateBoundingBox(entity);
      if (bbox) entityBoundingBoxes.current.set(eId, bbox);
      
    } else if (eType === 'UNIT') {
      entity.polygon.height = props.local_base_m?.getValue() || 0;
      entity.polygon.extrudedHeight = props.local_roof_m?.getValue() || 3;
      
      const floorGrad = FLOOR_GRADIENTS[Math.abs(flLvl - 1) % FLOOR_GRADIENTS.length];
      
      if (isSelected) {
        // High-contrast cyan/sky hero highlight for selected property unit
        entity.polygon.material = Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.96);
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(1.0);
        entity.polygon.outlineWidth = 4;
      } else if (isFloorSelected) {
        entity.polygon.material = Cesium.Color.fromCssColorString(floorGrad.fill).withAlpha(0.88);
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.85);
        entity.polygon.outlineWidth = 2;
      } else {
        entity.polygon.material = Cesium.Color.fromCssColorString(floorGrad.fill).withAlpha(0.55 * baseAlpha);
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.35);
        entity.polygon.outlineWidth = 1;
      }
      entity.polygon.perPositionHeight = false;
      entity.polygon.closeTop = true;
      entity.polygon.closeBottom = true;
      entity.show = layers.floorsUnits;
      
      const bbox = calculateBoundingBox(entity);
      if (bbox) entityBoundingBoxes.current.set(eId, bbox);
      
    } else if (eType === 'UNDERGROUND') {
      entity.polygon.height = props.local_base_m?.getValue() || -10;
      entity.polygon.extrudedHeight = props.local_roof_m?.getValue() || 0;
      entity.polygon.material = Cesium.Color.fromCssColorString(colors.fill).withAlpha(0.4 * baseAlpha);
      entity.polygon.outline = true;
      entity.polygon.outlineColor = Cesium.Color.fromCssColorString(colors.outline).withAlpha(0.8);
      entity.polygon.outlineWidth = 2;
      entity.polygon.perPositionHeight = false;
      entity.show = layers.underground;
      
      const bbox = calculateBoundingBox(entity);
      if (bbox) entityBoundingBoxes.current.set(eId, bbox);
    }
  }, [calculateBoundingBox, layers]);

  // Load 3D Cadastral GeoJSON Data from Backend
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const load3DData = async () => {
      setLoading3D(true);
      try {
        entityBoundingBoxes.current.clear();

        if (dataSourceRef.current) {
          viewer.dataSources.remove(dataSourceRef.current);
        }
        if (validationSourceRef.current) {
          viewer.dataSources.remove(validationSourceRef.current);
          validationSourceRef.current = null;
        }

        const bId = selectedBuildingId || selectedEntity?.building_id || 'B12';
        const sId = selectedEntity?.entity_id || '';
        const geojson = await cadastreApi.getCesiumGeoJSON(explodeFactor, bId, sId);
        const ds = await Cesium.GeoJsonDataSource.load(geojson, { clampToGround: false });

        const baseAlpha = Math.max(0.15, (100 - buildingTransparency) / 100);
        const selectedId = selectedEntity?.entity_id || '';
        const selectedFloorNum = selectedEntity?.floor_level ?? 0;

        ds.entities.values.forEach((entity: any) => {
          const props = entity.properties;
          const eType = (props.entity_type ? props.entity_type.getValue() : 'UNIT') as EntityType;
          const eId = props.id ? props.id.getValue() : entity.id;
          const flLvl = props.floor_level ? props.floor_level.getValue() : 0;
          const isContext = props.is_context ? props.is_context.getValue() : false;

          applyEntityStyling(entity, props, eType, eId, flLvl, isContext, baseAlpha, selectedId, selectedFloorNum);
        });

        const validationIssues = geojson.features?.filter((f: any) => 
          f.properties?.entity_type === 'VALIDATION_ISSUE'
        ) || [];

        if (validationIssues.length > 0) {
          const valDs = await Cesium.GeoJsonDataSource.load({
            type: 'FeatureCollection',
            features: validationIssues
          }, { clampToGround: false });
          
          valDs.entities.values.forEach((entity: any) => {
            if (entity.polygon) {
              entity.polygon.material = Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.6);
              entity.polygon.outline = true;
              entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#fecaca').withAlpha(1.0);
              entity.polygon.outlineWidth = 3;
              entity.polygon.height = entity.properties.local_base_m?.getValue() || 0;
              entity.polygon.extrudedHeight = entity.properties.local_roof_m?.getValue() || 3;
            } else if (entity.polyline) {
              entity.polyline.material = Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.9);
              entity.polyline.width = 4;
              entity.polyline.clampToGround = false;
            }
            entity.show = layers.validation;
          });
          
          viewer.dataSources.add(valDs);
          validationSourceRef.current = valDs;
        }

        viewer.dataSources.add(ds);
        dataSourceRef.current = ds;
        setLoading3D(false);
      } catch (err) {
        console.error('Failed loading 3D Cadastre data', err);
        setLoading3D(false);
      }
    };

    load3DData();
  }, [explodeFactor, selectedBuildingId, buildingTransparency, selectedEntity?.entity_id, selectedEntity?.floor_level, 
      layers.parcelBoundaries, layers.buildings3d, layers.floorsUnits, layers.underground, layers.validation,
      applyEntityStyling]);

  // Manage Real Road & Underground Networks
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleRoads = async () => {
      if (layers.roads) {
        if (!roadsSourceRef.current) {
          const rGeo = await cadastreApi.getRoadsGeoJSON();
          const rDs = await Cesium.GeoJsonDataSource.load(rGeo, {
            stroke: Cesium.Color.fromCssColorString('#64748b').withAlpha(0.85),
            strokeWidth: 3,
            clampToGround: true
          });
          viewer.dataSources.add(rDs);
          roadsSourceRef.current = rDs;
        }
        roadsSourceRef.current.show = true;
      } else if (roadsSourceRef.current) {
        roadsSourceRef.current.show = false;
      }
    };

    const handleUnderground = async () => {
      if (layers.underground) {
        if (!undergroundSourceRef.current) {
          const uGeo = await cadastreApi.getUndergroundGeoJSON();
          const uDs = await Cesium.GeoJsonDataSource.load(uGeo, {
            stroke: Cesium.Color.fromCssColorString('#ec4899').withAlpha(0.95),
            strokeWidth: 5,
            clampToGround: false
          });
          viewer.dataSources.add(uDs);
          undergroundSourceRef.current = uDs;
        }
        undergroundSourceRef.current.show = true;
      } else if (undergroundSourceRef.current) {
        undergroundSourceRef.current.show = false;
      }
    };

    handleRoads();
    handleUnderground();
  }, [layers.roads, layers.underground]);

  // Underground globe translucency
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !viewer.scene || !viewer.scene.globe) return;

    if (layers.underground) {
      viewer.scene.globe.translucency.enabled = true;
      viewer.scene.globe.translucency.frontFaceAlpha = 0.55;
      viewer.scene.globe.translucency.backFaceAlpha = 0.35;
      viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
    } else {
      viewer.scene.globe.translucency.enabled = false;
      viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
    }
  }, [layers.underground]);

  // Section Clipping Plane
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !viewer.scene || !viewer.scene.globe) return;

    if (activeTool === 'section') {
      const plane = new Cesium.ClippingPlane(
        new Cesium.Cartesian3(0.0, 0.0, -1.0),
        sectionHeight
      );
      const collection = new Cesium.ClippingPlaneCollection({
        planes: [plane],
        edgeWidth: 2.0,
        edgeColor: Cesium.Color.fromCssColorString('#38bdf8'),
        unionClippingRegions: false,
        enabled: true
      });
      viewer.scene.globe.clippingPlanes = collection;
    } else {
      viewer.scene.globe.clippingPlanes = undefined;
    }
  }, [activeTool, sectionHeight]);

  // LiDAR Point Cloud Simulation
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (layers.lidarPointCloud) {
      if (!pointCloudPrimitivesRef.current) {
        const pointCollection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
        const center = [77.6248, 12.9356];
        const numPoints = 1400;
        
        for (let i = 0; i < numPoints; i++) {
          const offsetLon = (Math.random() - 0.5) * 0.004;
          const offsetLat = (Math.random() - 0.5) * 0.003;
          const lon = center[0] + offsetLon;
          const lat = center[1] + offsetLat;
          
          let z = 0;
          const r = Math.random();
          if (r < 0.25) {
            z = Math.random() * 0.5;
          } else if (r < 0.75) {
            z = Math.random() * 20;
          } else {
            z = 18 + Math.random() * 3;
          }

          let color = Cesium.Color.fromCssColorString('#38bdf8');
          if (z < 2) color = Cesium.Color.fromCssColorString('#10b981');
          else if (z < 8) color = Cesium.Color.fromCssColorString('#06b6d4');
          else if (z < 15) color = Cesium.Color.fromCssColorString('#eab308');
          else color = Cesium.Color.fromCssColorString('#f43f5e');

          pointCollection.add({
            position: Cesium.Cartesian3.fromDegrees(lon, lat, z),
            color: color.withAlpha(0.85),
            pixelSize: 3.5
          });
        }
        pointCloudPrimitivesRef.current = pointCollection;
      }
      pointCloudPrimitivesRef.current.show = true;
    } else if (pointCloudPrimitivesRef.current) {
      pointCloudPrimitivesRef.current.show = false;
    }
  }, [layers.lidarPointCloud]);

  // DEM / DSM Grid Wireframe Simulation
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (layers.demDsm) {
      if (!demPrimitivesRef.current) {
        const polylineCollection = viewer.scene.primitives.add(new Cesium.PolylineCollection());
        const center = [77.62515, 12.9358];
        const gridStep = 0.0004;
        const gridCount = 10;
        const startLon = center[0] - (gridCount * gridStep) / 2;
        const startLat = center[1] - (gridCount * gridStep) / 2;

        for (let i = 0; i <= gridCount; i++) {
          const lon = startLon + i * gridStep;
          polylineCollection.add({
            positions: [
              Cesium.Cartesian3.fromDegrees(lon, startLat, 0.5),
              Cesium.Cartesian3.fromDegrees(lon, startLat + gridCount * gridStep, 0.5)
            ],
            width: 1.5,
            material: Cesium.Material.fromType('Color', {
              color: Cesium.Color.fromCssColorString('#14b8a6').withAlpha(0.4)
            })
          });
        }

        for (let j = 0; j <= gridCount; j++) {
          const lat = startLat + j * gridStep;
          polylineCollection.add({
            positions: [
              Cesium.Cartesian3.fromDegrees(startLon, lat, 0.5),
              Cesium.Cartesian3.fromDegrees(startLon + gridCount * gridStep, lat, 0.5)
            ],
            width: 1.5,
            material: Cesium.Material.fromType('Color', {
              color: Cesium.Color.fromCssColorString('#14b8a6').withAlpha(0.4)
            })
          });
        }
        demPrimitivesRef.current = polylineCollection;
      }
      demPrimitivesRef.current.show = true;
    } else if (demPrimitivesRef.current) {
      demPrimitivesRef.current.show = false;
    }
  }, [layers.demDsm]);

  // Camera Mode Navigation
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (orbitListenerRef.current) {
      viewer.clock.onTick.removeEventListener(orbitListenerRef.current);
      orbitListenerRef.current = null;
    }

    if (cameraMode === 'TOP_DOWN') {
      viewer.scene.morphTo2D(1.2);
    } else {
      if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
        viewer.scene.morphTo3D(1.2);
      }

      if (cameraMode === 'ORBIT') {
        const rotateCallback = () => {
          viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.003);
        };
        viewer.clock.onTick.addEventListener(rotateCallback);
        orbitListenerRef.current = rotateCallback;
      } else if (cameraMode === 'CITY') {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(77.62515, 12.9358, 1200),
          orientation: {
            heading: Cesium.Math.toRadians(35),
            pitch: Cesium.Math.toRadians(-30),
            roll: 0.0
          },
          duration: 1.2
        });
      } else if (cameraMode === 'PARCEL') {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(77.6248, 12.9356, 450),
          orientation: {
            heading: Cesium.Math.toRadians(45),
            pitch: Cesium.Math.toRadians(-35),
            roll: 0.0
          },
          duration: 1.2
        });
      } else if (cameraMode === 'BUILDING' && selectedEntity) {
        flyToEntity(selectedEntity.entity_id, 'building');
      } else if (cameraMode === 'FLOOR' && selectedEntity) {
        flyToEntity(selectedEntity.entity_id, 'floor');
      } else if (cameraMode === 'UNIT' && selectedEntity) {
        flyToEntity(selectedEntity.entity_id, 'unit');
      }
    }

    return () => {
      if (orbitListenerRef.current && viewer && viewer.clock) {
        viewer.clock.onTick.removeEventListener(orbitListenerRef.current);
        orbitListenerRef.current = null;
      }
    };
  }, [cameraMode, selectedEntity, flyToEntity]);

  // Measurement Tool
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (activeTool !== 'measure') {
      if (measureHandlerRef.current) {
        measureHandlerRef.current.destroy();
        measureHandlerRef.current = null;
      }
      return;
    }

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    let pts: any[] = [];

    handler.setInputAction((movement: any) => {
      const ray = viewer.camera.getPickRay(movement.position);
      const position = viewer.scene.globe.pick(ray, viewer.scene);
      if (!position) return;

      pts.push(position);
      setMeasurePoints([...pts]);

      if (pts.length === 1) {
        const cart1 = Cesium.Cartographic.fromCartesian(pts[0]);
        setMeasureResult({
          distance: 0,
          deltaZ: 0,
          horizDist: 0,
          p1: {
            lon: Cesium.Math.toDegrees(cart1.longitude),
            lat: Cesium.Math.toDegrees(cart1.latitude),
            height: cart1.height
          }
        });

        if (measureEntityRef.current) {
          viewer.entities.remove(measureEntityRef.current);
        }
        measureEntityRef.current = viewer.entities.add({
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              return pts.length === 2 ? pts : [pts[0], pts[0]];
            }, false),
            width: 3,
            material: Cesium.Color.fromCssColorString('#38bdf8'),
            depthFailMaterial: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.5)
          },
          point: {
            pixelSize: 7,
            color: Cesium.Color.fromCssColorString('#38bdf8'),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
          }
        });
      } else if (pts.length === 2) {
        const cart1 = Cesium.Cartographic.fromCartesian(pts[0]);
        const cart2 = Cesium.Cartographic.fromCartesian(pts[1]);
        
        const euclidDist = Cesium.Cartesian3.distance(pts[0], pts[1]);
        const dZ = Math.abs(cart2.height - cart1.height);
        const dH = Math.sqrt(Math.max(0, euclidDist * euclidDist - dZ * dZ));

        setMeasureResult({
          distance: euclidDist,
          deltaZ: dZ,
          horizDist: dH,
          p1: {
            lon: Cesium.Math.toDegrees(cart1.longitude),
            lat: Cesium.Math.toDegrees(cart1.latitude),
            height: cart1.height
          },
          p2: {
            lon: Cesium.Math.toDegrees(cart2.longitude),
            lat: Cesium.Math.toDegrees(cart2.latitude),
            height: cart2.height
          }
        });

        const midpoint = Cesium.Cartesian3.midpoint(pts[0], pts[1], new Cesium.Cartesian3());
        viewer.entities.add({
          position: midpoint,
          label: {
            text: `Dist: ${euclidDist.toFixed(2)}m\nΔZ: ${dZ.toFixed(2)}m`,
            font: '11px monospace',
            fillColor: Cesium.Color.WHITE,
            backgroundColor: Cesium.Color.fromCssColorString('#0b0f19').withAlpha(0.9),
            showBackground: true,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10)
          }
        });

        pts = [];
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    measureHandlerRef.current = handler;

    return () => {
      if (measureHandlerRef.current) {
        measureHandlerRef.current.destroy();
        measureHandlerRef.current = null;
      }
    };
  }, [activeTool]);

  const clearMeasurements = () => {
    setMeasurePoints([]);
    setMeasureResult(null);
    const viewer = viewerRef.current;
    if (viewer && measureEntityRef.current) {
      viewer.entities.remove(measureEntityRef.current);
      measureEntityRef.current = null;
    }
  };

  // FlyTo Controller for selection updates
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (flyToTarget) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(flyToTarget[0], flyToTarget[1], 160),
        orientation: {
          heading: Cesium.Math.toRadians(35),
          pitch: Cesium.Math.toRadians(-28),
          roll: 0.0,
        },
        duration: 1.2,
      });
      return;
    }

    if (selectedEntity) {
      const entityId = selectedEntity.entity_id;
      const eType = selectedEntity.entity_type;
      
      let mode: CameraModeKey = 'building';
      if (eType === 'PARCEL') mode = 'parcel';
      else if (eType === 'BUILDING') mode = 'building';
      else if (eType === 'FLOOR') mode = 'floor';
      else if (eType === 'UNIT') mode = 'unit';
      
      flyToEntity(entityId, mode);
    }
  }, [selectedEntity?.entity_id, selectedEntity?.entity_type, flyToTarget, flyToEntity]);

  return (
    <div className="relative w-full h-full bg-[#070b14] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" id="cesiumContainer" />
      
      {/* Loading Indicator */}
      {loading3D && (
        <div className="absolute top-16 right-4 px-3.5 py-1.5 rounded-lg bg-slate-900/90 border border-white/10 text-cyan-400 text-xs font-mono flex items-center space-x-2 z-10 shadow-xl pointer-events-none animate-in fade-in duration-200">
          <svg className="w-3.5 h-3.5 animate-spin text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Syncing 3D Cadastre...</span>
        </div>
      )}

      {/* Interactive Measurement HUD */}
      {activeTool === 'measure' && (
        <div className="absolute top-20 left-4 p-4 rounded-xl bg-[#0d1321]/92 backdrop-blur-xl border border-cyan-500/30 shadow-2xl z-20 w-72 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="font-bold text-white uppercase tracking-wider">3D Measurement</span>
            </div>
            <button
              onClick={() => setActiveTool('select')}
              className="text-slate-400 hover:text-white text-[11px]"
            >
              Close
            </button>
          </div>

          <div className="text-[11px] text-slate-300 mb-3 leading-relaxed">
            Click two points on terrain or building facades to measure 3D spatial distance and vertical elevation differential.
          </div>

          <div className="space-y-2 bg-slate-900/60 p-2.5 rounded-lg border border-white/5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Euclidean Distance:</span>
              <span className="text-cyan-300 font-bold">
                {measureResult ? `${measureResult.distance.toFixed(2)} m` : '---'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Height Diff (ΔZ):</span>
              <span className="text-emerald-300 font-bold">
                {measureResult ? `${measureResult.deltaZ.toFixed(2)} m` : '---'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Horizontal Dist:</span>
              <span className="text-purple-300 font-bold">
                {measureResult ? `${measureResult.horizDist.toFixed(2)} m` : '---'}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={clearMeasurements}
              className="px-2.5 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
            >
              Clear Marks
            </button>
            <span className="text-[10px] text-slate-500">
              {measurePoints.length === 1 ? 'Pick 2nd point...' : 'Ready for pick'}
            </span>
          </div>
        </div>
      )}

      {/* Interactive Section Plane HUD */}
      {activeTool === 'section' && (
        <div className="absolute top-20 left-4 p-4 rounded-xl bg-[#0d1321]/92 backdrop-blur-xl border border-blue-500/30 shadow-2xl z-20 w-72 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="font-bold text-white uppercase tracking-wider">Dynamic Section Plane</span>
            </div>
            <button
              onClick={() => setActiveTool('select')}
              className="text-slate-400 hover:text-white text-[11px]"
            >
              Close
            </button>
          </div>

          <div className="text-[11px] text-slate-300 mb-3 leading-relaxed">
            Slice vertically across building volumes to inspect interior cadastre storeys and unit envelopes.
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-medium">Cut Datum:</span>
              <span className="font-mono text-cyan-400 font-bold">{sectionHeight} m</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="1"
              value={sectionHeight}
              onChange={(e) => setSectionHeight(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>0m (Ground)</span>
              <span>30m (Mid-Rise)</span>
              <span>60m (Tower)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};