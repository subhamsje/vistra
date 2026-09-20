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
  parcel: { name: 'PARCEL VIEW', heading: 45, pitch: -35, rangeFactor: 0.5 },
  building: { name: 'BUILDING VIEW', heading: 35, pitch: -30, rangeFactor: 0.3 },
  floor: { name: 'FLOOR VIEW', heading: 0, pitch: -60, rangeFactor: 0.15 },
  unit: { name: 'UNIT VIEW', heading: 0, pitch: -75, rangeFactor: 0.08 },
};

const ENTITY_COLORS: Record<EntityType, { fill: string; outline: string }> = {
  PARCEL: { fill: '#22c55e', outline: '#16a34a' },
  BUILDING: { fill: '#3b82f6', outline: '#2563eb' },
  FLOOR: { fill: '#06b6d4', outline: '#0891b2' },
  UNIT: { fill: '#a855f7', outline: '#9333ea' },
  UNDERGROUND: { fill: '#ec4899', outline: '#db2777' },
  COMMON_AREA: { fill: '#f59e0b', outline: '#d97706' },
};

const CONTEXT_BUILDING_COLOR = { fill: '#475569', outline: '#334155' };

export const CesiumViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const dataSourceRef = useRef<any>(null);
  const roadsSourceRef = useRef<any>(null);
  const undergroundSourceRef = useRef<any>(null);
  const validationSourceRef = useRef<any>(null);
  const selectionIndicatorRef = useRef<any>(null);

  const [imageryLoaded, setImageryLoaded] = useState(true);
  const [loading3D, setLoading3D] = useState(true);
  const [currentCameraMode, setCurrentCameraMode] = useState<'city' | 'parcel' | 'building' | 'floor' | 'unit'>('city');
  const [viewMode, setViewMode] = useState<'reality' | 'analysis'>('reality');
  const entityBoundingBoxes = useRef<Map<string, BoundingBox>>(new Map());

  // Measurement tool state
  const [measureType, setMeasureType] = useState<'distance' | 'height'>('distance');
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
  const [sectionPlaneActive, setSectionPlaneActive] = useState<boolean>(false);

  // Point Cloud Primitive Collection Ref
  const pointCloudPrimitivesRef = useRef<any>(null);
  // DEM Grid Primitive Collection Ref
  const demPrimitivesRef = useRef<any>(null);
  // Orbit listener removal ref
  const orbitListenerRef = useRef<any>(null);

  const { 
    layers, 
    buildingTransparency, 
    explodeFactor, 
    basemap, 
    selectedEntity,
    setSelectedEntityId,
    activeJurisdiction,
    flyToTarget,
    setFlyToTarget,
    activeView,
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
    
    return new Cesium.BoundingSphere(center, maxDist * 1.2);
  }, []);

  const flyToEntity = useCallback((entityId: string, mode: CameraModeKey = 'building') => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const bbox = entityBoundingBoxes.current.get(entityId);
    if (!bbox) return;

    const cameraMode = CAMERA_MODES[mode];
    const boundingSphere = computeBoundingSphere(bbox);
    const range = boundingSphere.radius * cameraMode.rangeFactor * 2;

    viewer.camera.flyToBoundingSphere(boundingSphere, {
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(cameraMode.heading),
        Cesium.Math.toRadians(cameraMode.pitch),
        range
      ),
      duration: 1.2,
      complete: () => {
        setCurrentCameraMode(mode);
      }
    });
  }, [computeBoundingSphere]);

  const flyToValidationIssue = useCallback((issueId: string) => {
    const viewer = viewerRef.current;
    if (!viewer || !validationSourceRef.current) return;

    const entity = validationSourceRef.current.entities.getById(issueId);
    if (!entity) return;

    const bbox = calculateBoundingBox(entity);
    if (!bbox) return;

    const boundingSphere = computeBoundingSphere(bbox);
    
    viewer.camera.flyToBoundingSphere(boundingSphere, {
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(45),
        Cesium.Math.toRadians(-45),
        boundingSphere.radius * 3
      ),
      duration: 1.5
    });
  }, [calculateBoundingBox, computeBoundingSphere]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    if (typeof Cesium === 'undefined') {
      console.error('Cesium is not loaded globally.');
      return;
    }

    Cesium.Ion.defaultAccessToken = '';

    const imageryProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maximumLevel: 19,
      credit: 'Esri World Imagery'
    });

    const viewer = new Cesium.Viewer(containerRef.current, {
      imageryProvider: imageryProvider,
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
      orderIndependentTranslucency: true,
      contextOptions: {
        webgl: {
          alpha: true,
          preserveDrawingBuffer: true
        }
      }
    });

    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0b0f19');
    viewer.scene.sun.show = true;
    viewer.scene.moon.show = false;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.skyAtmosphere.hueShift = -0.1;
    viewer.scene.skyAtmosphere.saturationShift = -0.2;
    viewer.scene.skyAtmosphere.brightnessShift = -0.3;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0003;
    viewer.scene.fog.minimumBrightness = 0.1;
    viewer.scene.fog.screenSpaceErrorFactor = 1.0;

    viewer.shadows = true;
    viewer.shadowMap.enabled = true;
    viewer.shadowMap.softShadows = true;
    viewer.shadowMap.darkness = 0.4;
    viewer.shadowMap.maximumDistance = 50000;

    if (activeJurisdiction) {
      const targetCenter = Cesium.Cartesian3.fromDegrees(
        activeJurisdiction.center[0], 
        activeJurisdiction.center[1], 
        activeJurisdiction.elevation_m || 10.0
      );

      viewer.camera.flyToBoundingSphere(
        new Cesium.BoundingSphere(targetCenter, 500),
        {
          offset: new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(35),
            Cesium.Math.toRadians(-28),
            1200
          ),
          duration: 1.5,
        }
      );
    }

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

    handler.setInputAction((movement: any) => {
      const picked = viewer.scene.pick(movement.endPosition);
      if (Cesium.defined(picked) && picked.id && picked.id.properties) {
        const props = picked.id.properties;
        const eId = props.id ? props.id.getValue() : (picked.id.id || '');
        if (eId && selectionIndicatorRef.current) {
          selectionIndicatorRef.current.showSelection(eId);
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    viewerRef.current = viewer;

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [activeJurisdiction, setSelectedEntityId]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let newProvider;
    if (basemap === 'streets') {
      newProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        maximumLevel: 19
      });
    } else if (basemap === 'night') {
      newProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        maximumLevel: 19
      });
    } else if (basemap === 'terrain') {
      newProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 19
      });
    } else if (basemap === 'master_plan') {
      newProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 19
      });
    } else {
      newProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 19
      });
    }

    try {
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(newProvider);
      
      if (viewMode === 'analysis') {
        const analysisLayer = viewer.imageryLayers.addImageryProvider(newProvider);
        analysisLayer.alpha = 0.3;
        analysisLayer.brightness = 1.2;
        analysisLayer.contrast = 1.3;
        analysisLayer.saturation = 0.3;
        analysisLayer.gamma = 1.1;
      }
    } catch (e) {
      console.warn('Could not switch basemap', e);
    }
  }, [basemap, viewMode]);

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

    const colors = ENTITY_COLORS[eType] || { fill: '#3b82f6', outline: '#2563eb' };
    const isSelected = eId === selectedId;
    const isFloorSelected = flLvl === selectedFloorNum && selectedFloorNum > 0;

    if (eType === 'PARCEL') {
      entity.polygon.height = 0.1;
      entity.polygon.extrudedHeight = 0.5;
      entity.polygon.material = Cesium.Color.fromCssColorString(colors.fill).withAlpha(0.15);
      entity.polygon.outline = true;
      entity.polygon.outlineColor = Cesium.Color.fromCssColorString(colors.outline).withAlpha(0.9);
      entity.polygon.outlineWidth = 3;
      entity.polygon.perPositionHeight = false;
      entity.polygon.closeTop = true;
      entity.polygon.closeBottom = true;
      entity.show = layers.parcelBoundaries;
      
      const bbox = calculateBoundingBox(entity);
      if (bbox) entityBoundingBoxes.current.set(eId, bbox);
      
    } else if (isContext) {
      entity.polygon.height = props.local_base_m?.getValue() || 0;
      entity.polygon.extrudedHeight = props.local_roof_m?.getValue() || 15;
      entity.polygon.material = Cesium.Color.fromCssColorString(CONTEXT_BUILDING_COLOR.fill).withAlpha(0.25 * baseAlpha);
      entity.polygon.outline = true;
      entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.3);
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
      entity.polygon.material = Cesium.Color.fromCssColorString(colors.fill).withAlpha(isSelected ? 0.9 : 0.6 * baseAlpha);
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
      entity.polygon.material = Cesium.Color.fromCssColorString(colors.fill).withAlpha(isFloorSelected ? 0.95 : 0.7 * baseAlpha);
      entity.polygon.outline = true;
      entity.polygon.outlineColor = isFloorSelected
        ? Cesium.Color.fromCssColorString('#38bdf8').withAlpha(1.0)
        : Cesium.Color.WHITE.withAlpha(0.6);
      entity.polygon.outlineWidth = isFloorSelected ? 3 : 1.5;
      entity.polygon.perPositionHeight = false;
      entity.polygon.closeTop = true;
      entity.polygon.closeBottom = true;
      entity.show = layers.floorsUnits;
      
      const bbox = calculateBoundingBox(entity);
      if (bbox) entityBoundingBoxes.current.set(eId, bbox);
      
    } else if (eType === 'UNIT') {
      entity.polygon.height = props.local_base_m?.getValue() || 0;
      entity.polygon.extrudedHeight = props.local_roof_m?.getValue() || 3;
      
      if (isSelected) {
        entity.polygon.material = Cesium.Color.fromCssColorString(colors.fill).withAlpha(1.0);
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#38bdf8').withAlpha(1.0);
        entity.polygon.outlineWidth = 4;
      } else if (isFloorSelected) {
        entity.polygon.material = Cesium.Color.fromCssColorString(colors.fill).withAlpha(0.85);
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.7);
        entity.polygon.outlineWidth = 2;
      } else {
        entity.polygon.material = Cesium.Color.fromCssColorString(colors.fill).withAlpha(0.55 * baseAlpha);
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.4);
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

        const geojson = await cadastreApi.getCesiumGeoJSON(explodeFactor);
        const ds = await Cesium.GeoJsonDataSource.load(geojson, { clampToGround: false });

        const baseAlpha = Math.max(0.1, (100 - buildingTransparency) / 100);
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
              entity.polyline.width = 5;
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
  }, [explodeFactor, buildingTransparency, selectedEntity?.entity_id, selectedEntity?.floor_level, 
      layers.parcelBoundaries, layers.buildings3d, layers.floorsUnits, layers.underground, layers.validation,
      applyEntityStyling]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleRoads = async () => {
      if (layers.roads) {
        if (!roadsSourceRef.current) {
          const rGeo = await cadastreApi.getRoadsGeoJSON();
          const rDs = await Cesium.GeoJsonDataSource.load(rGeo, {
            stroke: Cesium.Color.fromCssColorString('#94a3b8').withAlpha(0.7),
            strokeWidth: 4,
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
            stroke: Cesium.Color.fromCssColorString('#ec4899').withAlpha(0.9),
            strokeWidth: 6,
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

  // Underground visualization: enable globe translucency and disable collision detection
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

  // Section Clipping Plane effect
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !viewer.scene || !viewer.scene.globe) return;

    if (activeTool === 'section') {
      setSectionPlaneActive(true);
      // Create clipping plane cutting vertically down at the given elevation
      // Normal pointing DOWN (0, 0, -1) with distance = sectionHeight
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
      setSectionPlaneActive(false);
      viewer.scene.globe.clippingPlanes = undefined;
    }
  }, [activeTool, sectionHeight]);

  // LiDAR Point Cloud Simulation effect
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (layers.lidarPointCloud) {
      if (!pointCloudPrimitivesRef.current) {
        const pointCollection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
        // Generate realistic LiDAR scan points around the center coordinates
        const center = activeJurisdiction?.center || [77.5925, 12.9725];
        const numPoints = 1200;
        
        for (let i = 0; i < numPoints; i++) {
          // Spread in ~150m radius
          const offsetLon = (Math.random() - 0.5) * 0.003;
          const offsetLat = (Math.random() - 0.5) * 0.003;
          const lon = center[0] + offsetLon;
          const lat = center[1] + offsetLat;
          
          // Realistic building elevation distribution: ground points, wall points, roof points
          let z = 0;
          const r = Math.random();
          if (r < 0.3) {
            z = Math.random() * 0.5; // ground
          } else if (r < 0.7) {
            z = Math.random() * 22; // building facades
          } else {
            z = 18 + Math.random() * 4; // roofs
          }

          // Spectrum color ramp: blue (low) -> cyan -> green -> yellow -> red (high)
          let color = Cesium.Color.fromCssColorString('#3b82f6');
          if (z < 2) color = Cesium.Color.fromCssColorString('#10b981');
          else if (z < 8) color = Cesium.Color.fromCssColorString('#06b6d4');
          else if (z < 15) color = Cesium.Color.fromCssColorString('#eab308');
          else color = Cesium.Color.fromCssColorString('#ef4444');

          pointCollection.add({
            position: Cesium.Cartesian3.fromDegrees(lon, lat, (activeJurisdiction?.elevation_m || 0) + z),
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
  }, [layers.lidarPointCloud, activeJurisdiction]);

  // DEM / DSM Grid Wireframe Simulation effect
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (layers.demDsm) {
      if (!demPrimitivesRef.current) {
        const polylineCollection = viewer.scene.primitives.add(new Cesium.PolylineCollection());
        const center = activeJurisdiction?.center || [77.5925, 12.9725];
        const gridStep = 0.0004;
        const gridCount = 10;
        const startLon = center[0] - (gridCount * gridStep) / 2;
        const startLat = center[1] - (gridCount * gridStep) / 2;

        // Longitude lines
        for (let i = 0; i <= gridCount; i++) {
          const lon = startLon + i * gridStep;
          const pos = [
            Cesium.Cartesian3.fromDegrees(lon, startLat, 0.5),
            Cesium.Cartesian3.fromDegrees(lon, startLat + gridCount * gridStep, 0.5)
          ];
          polylineCollection.add({
            positions: pos,
            width: 1.5,
            material: Cesium.Material.fromType('Color', {
              color: Cesium.Color.fromCssColorString('#14b8a6').withAlpha(0.4)
            })
          });
        }

        // Latitude lines
        for (let j = 0; j <= gridCount; j++) {
          const lat = startLat + j * gridStep;
          const pos = [
            Cesium.Cartesian3.fromDegrees(startLon, lat, 0.5),
            Cesium.Cartesian3.fromDegrees(startLon + gridCount * gridStep, lat, 0.5)
          ];
          polylineCollection.add({
            positions: pos,
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
  }, [layers.demDsm, activeJurisdiction]);

  // Camera Mode handler (TOP_DOWN 2D, ORBIT Turntable, CITY, PARCEL, BUILDING, FLOOR, UNIT)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Clear existing orbit tick listener if active
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
          viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.004);
        };
        viewer.clock.onTick.addEventListener(rotateCallback);
        orbitListenerRef.current = rotateCallback;
      } else if (cameraMode === 'CITY') {
        const center = activeJurisdiction?.center || [77.5925, 12.9725];
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(center[0], center[1], 1800),
          orientation: {
            heading: Cesium.Math.toRadians(35),
            pitch: Cesium.Math.toRadians(-30),
            roll: 0.0
          },
          duration: 1.2
        });
      } else if (cameraMode === 'PARCEL') {
        const center = activeJurisdiction?.center || [77.5925, 12.9725];
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(center[0], center[1], 600),
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
  }, [cameraMode, activeJurisdiction, selectedEntity, flyToEntity]);

  // Measurement Tool Screen-Space Event Handler
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
        // First point picked
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

        // Add temporary polyline
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
            pixelSize: 8,
            color: Cesium.Color.fromCssColorString('#38bdf8'),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
          }
        });
      } else if (pts.length === 2) {
        // Second point picked - finalize measurement
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

        // Add midpoint badge
        const midpoint = Cesium.Cartesian3.midpoint(pts[0], pts[1], new Cesium.Cartesian3());
        viewer.entities.add({
          position: midpoint,
          label: {
            text: `Dist: ${euclidDist.toFixed(2)}m\nΔZ: ${dZ.toFixed(2)}m`,
            font: '12px monospace',
            fillColor: Cesium.Color.WHITE,
            backgroundColor: Cesium.Color.fromCssColorString('#0b0f19').withAlpha(0.85),
            showBackground: true,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10)
          }
        });

        // Reset points for subsequent measurement
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

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (flyToTarget) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(flyToTarget[0], flyToTarget[1], 200),
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
      
      let mode: keyof typeof CAMERA_MODES = 'building';
      if (eType === 'PARCEL') mode = 'parcel';
      else if (eType === 'BUILDING') mode = 'building';
      else if (eType === 'FLOOR') mode = 'floor';
      else if (eType === 'UNIT') mode = 'unit';
      
      flyToEntity(entityId, mode);
    }
  }, [selectedEntity?.entity_id, selectedEntity?.entity_type, flyToTarget, flyToEntity]);

  return (
    <div className="relative w-full h-full bg-[#0b0f19] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" id="cesiumContainer" />
      
      {loading3D && (
        <div className="absolute top-16 right-4 px-4 py-2 rounded-lg bg-slate-900/95 border border-white/10 text-cyan-400 text-xs font-mono flex items-center space-x-2 z-10 shadow-xl pointer-events-none animate-in fade-in duration-200">
          <svg className="w-4 h-4 animate-spin text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Rendering 3D Cadastre...</span>
        </div>
      )}

      {selectedEntity && (
        <div className="absolute bottom-20 left-4 right-4 flex justify-center pointer-events-none z-10">
          <div className="px-4 py-2 rounded-lg bg-slate-900/95 border border-white/10 shadow-xl animate-in slide-in-from-bottom duration-300 pointer-events-auto">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <span className="font-medium text-white">
                {selectedEntity.entity_type}: {selectedEntity.entity_id}
              </span>
              {selectedEntity.floor_level && (
                <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded text-xs font-mono">
                  Floor {selectedEntity.floor_level}
                </span>
              )}
              {selectedEntity.unit_number && (
                <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded text-xs font-mono">
                  {selectedEntity.unit_number}
                </span>
              )}
              <span className="px-2 py-0.5 bg-emerald-600/30 text-emerald-300 rounded text-xs font-mono">
                {selectedEntity.validation_status}
              </span>
              <button
                onClick={() => setCurrentCameraMode('city')}
                className="ml-2 px-2 py-1 text-[10px] text-slate-400 hover:text-white bg-slate-800 rounded transition"
              >
                City View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Measurement HUD */}
      {activeTool === 'measure' && (
        <div className="absolute top-20 left-4 p-4 rounded-xl bg-[#0d1321]/92 backdrop-blur-xl border border-cyan-500/30 shadow-2xl z-20 w-72 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="font-bold text-white uppercase tracking-wider">3D Measurement Tool</span>
            </div>
            <button
              onClick={() => setActiveTool('select')}
              className="text-slate-400 hover:text-white text-[11px]"
            >
              Close
            </button>
          </div>

          <div className="text-[11px] text-slate-300 mb-3 leading-relaxed">
            Click two points on the terrain, building facades, or roof structures to measure 3D spatial distance and vertical height differential.
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

      {/* Interactive Section / Clipping Plane HUD */}
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
            Slice vertically across building volumes and subterranean structures to inspect interior cadastre slices and floor envelopes.
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-medium">Cut Elevation Datum:</span>
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

      {/* View Mode & Camera Preset Controls (Bottom Right) */}
      <div className="absolute bottom-16 right-4 flex flex-col items-end space-y-2 z-10 pointer-events-none">
        <div className="flex items-center space-x-2 pointer-events-auto">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">View</span>
          <button
            onClick={() => setViewMode('reality')}
            className={`px-2 py-1 rounded text-[10px] font-medium transition ${
              viewMode === 'reality' 
                ? 'bg-blue-600 text-white shadow-blue-600/30' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Reality
          </button>
          <button
            onClick={() => setViewMode('analysis')}
            className={`px-2 py-1 rounded text-[10px] font-medium transition ${
              viewMode === 'analysis' 
                ? 'bg-cyan-600 text-white shadow-cyan-600/30' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Analysis
          </button>
        </div>

        <div className="flex flex-col space-y-1 pointer-events-auto">
          {Object.entries(CAMERA_MODES).map(([key, mode]) => (
            <button
              key={key}
              onClick={() => {
                if (selectedEntity) {
                  flyToEntity(selectedEntity.entity_id, key as keyof typeof CAMERA_MODES);
                }
              }}
              disabled={!selectedEntity}
              className={`px-2 py-1.5 rounded-l-lg text-[10px] font-medium transition w-32 text-left ${
                currentCameraMode === key
                  ? 'bg-cyan-600 text-white shadow-cyan-600/30'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
              } ${!selectedEntity ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {mode.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};