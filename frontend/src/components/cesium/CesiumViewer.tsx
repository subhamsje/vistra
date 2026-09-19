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

const CAMERA_MODES: Record<string, CameraMode> = {
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
  const [entityBoundingBoxes, setEntityBoundingBoxes] = useRef<Map<string, BoundingBox>>(new Map());

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
    activeView
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

  const flyToEntity = useCallback((entityId: string, mode: keyof typeof CAMERA_MODES = 'building') => {
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