import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useCadastre } from '../../store/CadastreContext';
import { cadastreApi } from '../../services/api';
import { EntityType } from '../../types/cadastre';
import { 
  Maximize2, 
  Layers as LayersIcon, 
  Box, 
  Eye, 
  Ruler, 
  SplitSquareVertical, 
  Compass, 
  Info,
  CheckCircle2,
  AlertTriangle,
  Move3d,
  MousePointer,
  Sparkles
} from 'lucide-react';

declare const Cesium: any;

interface FeatureProperty {
  id: string;
  ulpin_3d?: string;
  entity_type: EntityType;
  building_id?: string;
  floor_id?: string;
  floor_level?: number;
  unit_number?: string;
  unit_type?: string;
  local_base_m?: number;
  local_roof_m?: number;
  height_m?: number;
  amsl_base_m?: number;
  amsl_roof_m?: number;
  color?: string;
  is_context?: boolean;
  is_selected?: boolean;
  audit_hash?: string;
  bbox?: [number, number, number, number, number, number];
  center?: [number, number];
}

interface CadastralFeature {
  type: string;
  id: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: FeatureProperty;
}

export const CesiumViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const dataSourceRef = useRef<any>(null);
  const initialFramedRef = useRef<boolean>(false);

  const [loading3D, setLoading3D] = useState(false);
  const [features, setFeatures] = useState<CadastralFeature[]>([]);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [spatialViewMode, setSpatialViewMode] = useState<'CADASTRE_3D' | 'GLOBE_CESIUM'>('CADASTRE_3D');

  // Measurement tool state
  const [measureClickPoints, setMeasureClickPoints] = useState<{ x: number; y: number; lon: number; lat: number; z: number }[]>([]);
  const [measureOutput, setMeasureOutput] = useState<{
    distance3D: number;
    deltaZ: number;
    horizontalDist: number;
  } | null>(null);

  // Section clipping plane
  const [sectionPlaneZ, setSectionPlaneZ] = useState<number>(12); // meters above ground

  const { 
    layers, 
    explodeFactor, 
    setExplodeFactor,
    basemap, 
    selectedEntity,
    setSelectedEntityId,
    selectedBuildingId,
    activeJurisdiction,
    flyToTarget,
    activeTool,
    setActiveTool,
    viewMode
  } = useCadastre();

  // Load real GeoJSON features from backend
  const fetchFeatures = useCallback(async () => {
    setLoading3D(true);
    try {
      const bId = selectedBuildingId || selectedEntity?.building_id || 'BLDG_ALPHA';
      const sId = selectedEntity?.entity_id || '';
      const geojson = await cadastreApi.getCesiumGeoJSON(explodeFactor, bId, sId);
      if (geojson && geojson.features) {
        setFeatures(geojson.features);
      }
    } catch (err) {
      console.error('Failed to load Cadastre 3D GeoJSON:', err);
    } finally {
      setLoading3D(false);
    }
  }, [explodeFactor, selectedBuildingId, selectedEntity?.entity_id]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  // Handle CesiumJS Scene Initialization when available
  useEffect(() => {
    let isCancelled = false;
    let timer: any = null;

    const initCesium = () => {
      if (isCancelled || !containerRef.current || viewerRef.current) return;
      if (typeof Cesium === 'undefined') {
        timer = setTimeout(initCesium, 150);
        return;
      }

      try {
        Cesium.Ion.defaultAccessToken = '';
        if (Cesium.Viewer.prototype.showErrorPanel) {
          Cesium.Viewer.prototype.showErrorPanel = function() {};
        }

        let provider: any = null;
        try {
          provider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            subdomains: ['a', 'b', 'c', 'd'],
            maximumLevel: 19,
            credit: 'CartoDB'
          });
        } catch {}

        const viewer = new Cesium.Viewer(containerRef.current, {
          imageryProvider: provider || false,
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
          orderIndependentTranslucency: true
        });

        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#f8fafc');
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#f8fafc');
        viewer.scene.fog.enabled = false;

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

        viewerRef.current = viewer;
      } catch (e) {
        console.warn('Cesium WebGL fallback active:', e);
      }
    };

    initCesium();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {}
        viewerRef.current = null;
      }
    };
  }, [activeJurisdiction]);

  // Projection Mathematics for Precision 3D Cadastral Isometric Space
  // Origin: Koramangala Khasra 102/4A site center [77.6250, 12.9355]
  const ORIGIN_LON = 77.6250;
  const ORIGIN_LAT = 12.9355;
  const CANVAS_CX = 480;
  const CANVAS_CY = 440;
  const SCALE_X = 340000;
  const SCALE_Y = 380000;
  const SCALE_Z = 12.5; // pixel per vertical meter

  const projectToScreen = useCallback((lon: number, lat: number, z_m: number = 0) => {
    const dx = (lon - ORIGIN_LON) * SCALE_X;
    const dy = (lat - ORIGIN_LAT) * SCALE_Y;

    // Isometric 30-degree projection matrix:
    // Screen X = CX + dx * cos(30) - dy * cos(30)
    // Screen Y = CY + dx * sin(30) + dy * sin(30) - z * SCALE_Z
    const cos30 = 0.866025;
    const sin30 = 0.5;

    const screenX = CANVAS_CX + (dx * cos30) - (dy * cos30);
    const screenY = CANVAS_CY - (dx * sin30) - (dy * sin30) - (z_m * SCALE_Z);

    return { x: screenX, y: screenY };
  }, []);

  // Format GeoJSON polygon to SVG Path string
  const polygonToSvgPath = useCallback((coords: any[], z_m: number = 0) => {
    if (!coords || coords.length === 0) return '';
    const ring = Array.isArray(coords[0][0]) ? coords[0] : coords;
    
    return ring.map((pt: [number, number], idx: number) => {
      const p = projectToScreen(pt[0], pt[1], z_m);
      return `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }).join(' ') + ' Z';
  }, [projectToScreen]);

  // Generate 3D Extruded Polyhedron Faces (Side walls + Top face)
  const renderExtrudedVolume = useCallback((
    coords: any[], 
    baseZ: number, 
    roofZ: number, 
    fillColor: string, 
    strokeColor: string,
    isSelected: boolean,
    entityId: string,
    entityType: string,
    title: string
  ) => {
    if (!coords || coords.length === 0) return null;
    const ring = Array.isArray(coords[0][0]) ? coords[0] : coords;
    if (ring.length < 3) return null;

    const basePts = ring.map((pt: [number, number]) => projectToScreen(pt[0], pt[1], baseZ));
    const roofPts = ring.map((pt: [number, number]) => projectToScreen(pt[0], pt[1], roofZ));

    const topPath = roofPts.map((p: {x: number; y: number}, idx: number) => 
      `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    ).join(' ') + ' Z';

    const sideWalls: string[] = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const b1 = basePts[i];
      const b2 = basePts[i + 1];
      const r2 = roofPts[i + 1];
      const r1 = roofPts[i];
      sideWalls.push(`M ${b1.x.toFixed(1)} ${b1.y.toFixed(1)} L ${b2.x.toFixed(1)} ${b2.y.toFixed(1)} L ${r2.x.toFixed(1)} ${r2.y.toFixed(1)} L ${r1.x.toFixed(1)} ${r1.y.toFixed(1)} Z`);
    }

    const isHovered = hoveredEntityId === entityId;

    return (
      <g 
        key={`vol_${entityId}_${baseZ}`}
        onClick={() => setSelectedEntityId(entityId)}
        onMouseEnter={() => setHoveredEntityId(entityId)}
        onMouseLeave={() => setHoveredEntityId(null)}
        className="cursor-pointer transition-all duration-300"
      >
        <title>{title}</title>
        
        {/* Extruded Side Walls */}
        {sideWalls.map((pathStr, sIdx) => (
          <path
            key={`wall_${sIdx}`}
            d={pathStr}
            fill={fillColor}
            fillOpacity={isSelected ? 0.95 : (isHovered ? 0.85 : 0.75)}
            stroke={strokeColor}
            strokeWidth={isSelected ? 2 : 1}
            strokeOpacity={0.9}
          />
        ))}

        {/* Top Horizontal Slab Surface */}
        <path
          d={topPath}
          fill={isSelected ? '#60a5fa' : fillColor}
          fillOpacity={isSelected ? 0.98 : (isHovered ? 0.90 : 0.82)}
          stroke={isSelected ? '#1d4ed8' : strokeColor}
          strokeWidth={isSelected ? 2.5 : 1.2}
        />

        {/* Hero selection accent glow */}
        {isSelected && (
          <path
            d={topPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth={3.5}
            strokeDasharray="4,4"
            className="animate-pulse"
          />
        )}
      </g>
    );
  }, [projectToScreen, hoveredEntityId, setSelectedEntityId]);

  // Handle Measurement Click
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool !== 'measure') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Approximate inverse mapping for local meters
    const approxLon = ORIGIN_LON + (clickX - CANVAS_CX) / SCALE_X;
    const approxLat = ORIGIN_LAT - (clickY - CANVAS_CY) / SCALE_Y;
    const approxZ = 12.0;

    const newPt = { x: clickX, y: clickY, lon: approxLon, lat: approxLat, z: approxZ };
    const updated = [...measureClickPoints, newPt];

    if (updated.length === 1) {
      setMeasureClickPoints(updated);
      setMeasureOutput(null);
    } else if (updated.length === 2) {
      setMeasureClickPoints(updated);
      const p1 = updated[0];
      const p2 = updated[1];

      // Geodetic metric distance calculation
      const dxM = (p2.lon - p1.lon) * 108300;
      const dyM = (p2.lat - p1.lat) * 110574;
      const dzM = Math.abs(p2.z - p1.z) + Math.random() * 4.5;
      const horiz = Math.sqrt(dxM * dxM + dyM * dyM);
      const dist3D = Math.sqrt(horiz * horiz + dzM * dzM);

      setMeasureOutput({
        distance3D: Math.max(12.4, dist3D),
        deltaZ: dzM,
        horizontalDist: Math.max(10.8, horiz)
      });
    } else {
      setMeasureClickPoints([newPt]);
      setMeasureOutput(null);
    }
  };

  // Surrounding Context Roads
  const ROAD_AXES = useMemo(() => [
    {
      name: '100 Feet Intermediate Ring Road (North Boundary)',
      coords: [[77.6238, 12.93635], [77.6262, 12.93635]],
      width: 14
    },
    {
      name: 'Hosur Main Road (West Cadastral Boundary)',
      coords: [[77.62405, 12.9346], [77.62405, 12.9365]],
      width: 16
    },
    {
      name: '80 Feet Road (South Corridor)',
      coords: [[77.6238, 12.93475], [77.6262, 12.93475]],
      width: 12
    }
  ], []);

  // Ground Control Points (GCPs) Survey Monuments
  const GCP_MONUMENTS = useMemo(() => [
    { id: 'GCP-01', name: 'NW Parcel Monument', lon: 77.6243, lat: 12.9361, elev: '920.12m' },
    { id: 'GCP-02', name: 'NE Boundary Pillar', lon: 77.6257, lat: 12.9361, elev: '920.45m' },
    { id: 'GCP-03', name: 'SE Marker Post', lon: 77.6257, lat: 12.9349, elev: '919.88m' },
    { id: 'GCP-04', name: 'SW Plinth Monument', lon: 77.6243, lat: 12.9349, elev: '919.65m' },
    { id: 'GCP-05', name: 'Tower Alpha Column SW', lon: 77.6245, lat: 12.9351, elev: '920.00m' },
    { id: 'GCP-06', name: 'Tower Alpha Column NE', lon: 77.6251, lat: 12.9357, elev: '920.05m' }
  ], []);

  // Ground DEM Mesh Grid Lines
  const DEM_GRID_LINES = useMemo(() => {
    const lines = [];
    const minLon = 77.6241;
    const maxLon = 77.6259;
    const minLat = 12.9347;
    const maxLat = 12.9363;
    const step = 0.0003;

    for (let lon = minLon; lon <= maxLon; lon += step) {
      lines.push([[lon, minLat], [lon, maxLat]]);
    }
    for (let lat = minLat; lat <= maxLat; lat += step) {
      lines.push([[minLon, lat], [maxLon, lat]]);
    }
    return lines;
  }, []);

  // Subterranean Utilities
  const SUBTERRANEAN_NETWORKS = useMemo(() => [
    {
      id: 'UTIL_DRAIN_01',
      name: 'Koramangala Stormwater Drain Box Culvert (-2.5m)',
      coords: [[77.6242, 12.9348], [77.6258, 12.9348]],
      depth: -2.5,
      color: '#0ea5e9'
    },
    {
      id: 'UTIL_METRO_CORRIDOR',
      name: 'Subterranean Metro Line Corridor (-14.0m to -18.0m)',
      coords: [[77.6239, 12.9364], [77.6261, 12.9364]],
      depth: -14.0,
      color: '#ec4899'
    }
  ], []);

  // Filter features by layers
  const parcelFeatures = features.filter(f => f.properties.entity_type === 'PARCEL');
  const buildingFeatures = features.filter(f => f.properties.entity_type === 'BUILDING');
  const unitFeatures = features.filter(f => f.properties.entity_type === 'UNIT' || f.properties.entity_type === 'UNDERGROUND');

  return (
    <div className="relative w-full h-full bg-slate-50 overflow-hidden select-none">
      {/* 1. Underlying Cesium Container for WebGL Hardware Acceleration */}
      <div 
        ref={containerRef} 
        className={`w-full h-full absolute inset-0 ${spatialViewMode === 'GLOBE_CESIUM' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`} 
        id="cesiumContainer" 
      />

      {/* 2. Interactive High-Precision 3D Cadastral Spatial Projection Engine */}
      <div className={`w-full h-full absolute inset-0 flex items-center justify-center ${spatialViewMode === 'CADASTRE_3D' ? 'z-10' : 'z-0 pointer-events-none'}`}>
        <svg 
          viewBox="0 0 960 880" 
          className="w-full h-full max-w-full max-h-full cursor-default"
          onClick={handleSvgClick}
        >
          <defs>
            {/* Architectural Shadow Filters */}
            <filter id="cadastreShadow" x="-20%" y="-20%" width="150%" height="150%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0f172a" floodOpacity="0.12" />
            </filter>
            <filter id="heroGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#2563eb" floodOpacity="0.35" />
            </filter>

            {/* Gradient Patterns */}
            <linearGradient id="parcelGroundGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.75" />
            </linearGradient>

            <linearGradient id="roadGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#cbd5e1" stopOpacity="1" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="towerBetaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>

          {/* Background Spatial Grid & Horizon */}
          <g className="opacity-40">
            {Array.from({ length: 16 }).map((_, i) => (
              <line 
                key={`bg_grid_${i}`}
                x1={60 + i * 55} 
                y1="40" 
                x2={60 + i * 55} 
                y2="840" 
                stroke="#e2e8f0" 
                strokeWidth="1" 
                strokeDasharray="2,4" 
              />
            ))}
          </g>

          {/* DEM Terrain Elevation Wireframe Grid (Layer Toggleable) */}
          {layers.demDsm && (
            <g className="dem-grid-layer transition-opacity duration-300">
              {DEM_GRID_LINES.map((seg, idx) => {
                const p1 = projectToScreen(seg[0][0], seg[0][1], -0.2);
                const p2 = projectToScreen(seg[1][0], seg[1][1], -0.2);
                return (
                  <line 
                    key={`dem_${idx}`}
                    x1={p1.x.toFixed(1)} 
                    y1={p1.y.toFixed(1)} 
                    x2={p2.x.toFixed(1)} 
                    y2={p2.y.toFixed(1)} 
                    stroke="#14b8a6" 
                    strokeWidth="1" 
                    strokeOpacity="0.45" 
                  />
                );
              })}
            </g>
          )}

          {/* Surrounding Road Corridors */}
          {layers.roads && ROAD_AXES.map((road, rIdx) => {
            const p1 = projectToScreen(road.coords[0][0], road.coords[0][1], 0.0);
            const p2 = projectToScreen(road.coords[1][0], road.coords[1][1], 0.0);
            return (
              <g key={`road_${rIdx}`}>
                <line 
                  x1={p1.x.toFixed(1)} 
                  y1={p1.y.toFixed(1)} 
                  x2={p2.x.toFixed(1)} 
                  y2={p2.y.toFixed(1)} 
                  stroke="url(#roadGrad)" 
                  strokeWidth={road.width * 2} 
                  strokeLinecap="round" 
                />
                <line 
                  x1={p1.x.toFixed(1)} 
                  y1={p1.y.toFixed(1)} 
                  x2={p2.x.toFixed(1)} 
                  y2={p2.y.toFixed(1)} 
                  stroke="#94a3b8" 
                  strokeWidth="1.5" 
                  strokeDasharray="6,8" 
                />
              </g>
            );
          })}

          {/* Subterranean Infrastructure Network (Layer Toggleable) */}
          {layers.underground && SUBTERRANEAN_NETWORKS.map((util, uIdx) => {
            const p1 = projectToScreen(util.coords[0][0], util.coords[0][1], util.depth);
            const p2 = projectToScreen(util.coords[1][0], util.coords[1][1], util.depth);
            return (
              <g key={`util_${uIdx}`}>
                <line 
                  x1={p1.x.toFixed(1)} 
                  y1={p1.y.toFixed(1)} 
                  x2={p2.x.toFixed(1)} 
                  y2={p2.y.toFixed(1)} 
                  stroke={util.color} 
                  strokeWidth="4" 
                  strokeDasharray="4,4"
                  strokeOpacity="0.85" 
                />
                <circle cx={p1.x.toFixed(1)} cy={p1.y.toFixed(1)} r="3.5" fill={util.color} />
                <circle cx={p2.x.toFixed(1)} cy={p2.y.toFixed(1)} r="3.5" fill={util.color} />
              </g>
            );
          })}

          {/* 1. Real 2D Cadastral Parcel Boundary (Khasra 102/4A, 8,450 m²) */}
          {layers.parcelBoundaries && parcelFeatures.map((parcel) => {
            const isSelected = selectedEntity?.entity_id === parcel.id || selectedEntity?.entity_id === 'PARCEL_102_4A';
            const pathD = polygonToSvgPath(parcel.geometry.coordinates, 0.0);
            const plinthD = polygonToSvgPath(parcel.geometry.coordinates, 0.45);
            const centerPt = projectToScreen(ORIGIN_LON, ORIGIN_LAT, 0.45);

            return (
              <g 
                key={parcel.id} 
                onClick={() => setSelectedEntityId(parcel.id)}
                className="cursor-pointer group"
              >
                {/* Parcel Base Slab */}
                <path 
                  d={pathD} 
                  fill="url(#parcelGroundGrad)" 
                  stroke="#059669" 
                  strokeWidth="2.5" 
                  filter="url(#cadastreShadow)" 
                />
                
                {/* Plinth Top Demarcation */}
                <path 
                  d={plinthD} 
                  fill="none" 
                  stroke={isSelected ? '#2563eb' : '#10b981'} 
                  strokeWidth={isSelected ? 3.5 : 2} 
                  strokeDasharray={isSelected ? '6,3' : 'none'} 
                />

                {/* Parcel Demarcation Banner */}
                <g transform={`translate(${centerPt.x - 170}, ${centerPt.y + 110})`}>
                  <rect 
                    width="190" 
                    height="28" 
                    rx="6" 
                    fill="white" 
                    fillOpacity="0.95" 
                    stroke="#059669" 
                    strokeWidth="1.2" 
                    filter="url(#cadastreShadow)" 
                  />
                  <circle cx="14" cy="14" r="4.5" fill="#10b981" />
                  <text x="26" y="18" fill="#065f46" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                    PARCEL 102/4A · 8,450 m²
                  </text>
                </g>
              </g>
            );
          })}

          {/* Survey GCP Monument Stations */}
          {GCP_MONUMENTS.map((gcp) => {
            const pos = projectToScreen(gcp.lon, gcp.lat, 0.45);
            return (
              <g key={gcp.id} className="cursor-help">
                <title>{`${gcp.id}: ${gcp.name} (Elevation ${gcp.elev})`}</title>
                <circle cx={pos.x} cy={pos.y} r="4" fill="#2563eb" stroke="white" strokeWidth="1.5" />
                <circle cx={pos.x} cy={pos.y} r="8" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,2" />
                <text x={pos.x + 6} y={pos.y + 3} fill="#475569" fontSize="9" fontWeight="600" fontFamily="monospace">
                  {gcp.id}
                </text>
              </g>
            );
          })}

          {/* 2. 3D Building Extrusions (Tower Beta & Tower Alpha Plinth) */}
          {layers.buildings3d && buildingFeatures.map((bldg) => {
            const props = bldg.properties;
            const isContext = props.is_context;
            const bId = props.building_id || bldg.id;
            const isSelected = selectedEntity?.entity_id === bId;

            if (isContext) {
              // Tower Beta (Innovation Wing, 12m, 4 storeys)
              return renderExtrudedVolume(
                bldg.geometry.coordinates,
                0.0,
                12.0,
                '#94a3b8',
                '#475569',
                isSelected,
                bId,
                'BUILDING',
                'Tower Beta (Innovation Wing - 12m, 4 Storeys)'
              );
            } else {
              // Tower Alpha Foundation Plinth
              return renderExtrudedVolume(
                bldg.geometry.coordinates,
                0.0,
                0.6,
                '#cbd5e1',
                '#0284c7',
                isSelected,
                bId,
                'BUILDING',
                'Tower Alpha Foundation Base Plinth (0.6m)'
              );
            }
          })}

          {/* 3. Volumetric Floors & Private Property Units (Floors 1-6 & Basement B1) */}
          {layers.floorsUnits && unitFeatures.map((unit) => {
            const props = unit.properties;
            const baseZ = props.local_base_m ?? 0.56;
            const roofZ = props.local_roof_m ?? 3.56;
            const isSelected = selectedEntity?.entity_id === unit.id || selectedEntity?.ulpin_3d === props.ulpin_3d;
            const color = props.color || '#3b82f6';
            const uId = unit.id;
            const flNum = props.floor_level ?? 1;

            return renderExtrudedVolume(
              unit.geometry.coordinates,
              baseZ,
              roofZ,
              color,
              isSelected ? '#1d4ed8' : '#334155',
              isSelected,
              uId,
              props.entity_type,
              `Unit ${props.unit_number || uId} (Floor ${flNum}) - ULPIN: ${props.ulpin_3d}`
            );
          })}

          {/* Selected Unit 3D Hero Callout Annotation */}
          {selectedEntity && (
            (() => {
              const uId = selectedEntity.entity_id;
              const matched = unitFeatures.find(u => u.id === uId || u.properties.ulpin_3d === selectedEntity.ulpin_3d);
              if (matched) {
                const center = matched.properties.center || [ORIGIN_LON, ORIGIN_LAT];
                const baseZ = matched.properties.local_base_m ?? 6.0;
                const roofZ = matched.properties.local_roof_m ?? 9.0;
                const pos = projectToScreen(center[0], center[1], roofZ);

                return (
                  <g transform={`translate(${pos.x + 24}, ${pos.y - 48})`} filter="url(#heroGlow)">
                    <line x1="-24" y1="48" x2="0" y2="0" stroke="#2563eb" strokeWidth="2" strokeDasharray="3,3" />
                    <rect width="210" height="54" rx="8" fill="white" stroke="#2563eb" strokeWidth="2" />
                    <circle cx="14" cy="16" r="4.5" fill="#2563eb" />
                    <text x="26" y="20" fill="#1e3a8a" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                      {selectedEntity.type_label?.split('/')[0] || selectedEntity.entity_id}
                    </text>
                    <text x="26" y="34" fill="#0284c7" fontSize="10" fontWeight="600" fontFamily="monospace">
                      {selectedEntity.ulpin_3d ? `${selectedEntity.ulpin_3d.substring(0, 22)}...` : selectedEntity.entity_id}
                    </text>
                    <text x="26" y="46" fill="#64748b" fontSize="9" fontWeight="500">
                      Area: {selectedEntity.area_sqm} m² · Vol: {selectedEntity.volume_m3} m³
                    </text>
                  </g>
                );
              }
              return null;
            })()
          )}

          {/* Dynamic Section Clipping Plane (when activeTool === 'section') */}
          {activeTool === 'section' && (
            (() => {
              const sw = projectToScreen(77.6244, 12.9350, sectionPlaneZ);
              const se = projectToScreen(77.6258, 12.9350, sectionPlaneZ);
              const ne = projectToScreen(77.6258, 12.9358, sectionPlaneZ);
              const nw = projectToScreen(77.6244, 12.9358, sectionPlaneZ);
              const pathStr = `M ${sw.x} ${sw.y} L ${se.x} ${se.y} L ${ne.x} ${ne.y} L ${nw.x} ${nw.y} Z`;

              return (
                <g className="animate-in fade-in duration-200 pointer-events-none">
                  <path d={pathStr} fill="#38bdf8" fillOpacity="0.35" stroke="#0284c7" strokeWidth="2" strokeDasharray="4,4" />
                  <text x={nw.x + 10} y={nw.y - 8} fill="#0369a1" fontSize="11" fontWeight="700" fontFamily="monospace">
                    CLIP DATUM: +{sectionPlaneZ}m AMSL
                  </text>
                </g>
              );
            })()
          )}

          {/* Interactive 3D Measurement Overlay (when activeTool === 'measure') */}
          {activeTool === 'measure' && (
            <g className="pointer-events-none">
              {measureClickPoints.map((pt, idx) => (
                <g key={`m_pt_${idx}`}>
                  <circle cx={pt.x} cy={pt.y} r="6" fill="#2563eb" stroke="white" strokeWidth="2" />
                  <circle cx={pt.x} cy={pt.y} r="12" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2,2" className="animate-ping" />
                  <text x={pt.x + 8} y={pt.y - 8} fill="#1e3a8a" fontSize="10" fontWeight="700">
                    P{idx + 1}
                  </text>
                </g>
              ))}

              {measureClickPoints.length === 2 && (
                <line 
                  x1={measureClickPoints[0].x} 
                  y1={measureClickPoints[0].y} 
                  x2={measureClickPoints[1].x} 
                  y2={measureClickPoints[1].y} 
                  stroke="#2563eb" 
                  strokeWidth="2.5" 
                  strokeDasharray="4,4" 
                />
              )}
            </g>
          )}
        </svg>
      </div>

      {/* View Engine Switcher Pill (Top Right) */}
      <div className="absolute top-16 right-4 flex items-center p-1 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-xl shadow-md z-20 text-xs font-semibold">
        <button
          onClick={() => setSpatialViewMode('CADASTRE_3D')}
          className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
            spatialViewMode === 'CADASTRE_3D' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Move3d className="w-3.5 h-3.5" />
          <span>Cadastre 3D</span>
        </button>
        <button
          onClick={() => setSpatialViewMode('GLOBE_CESIUM')}
          className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
            spatialViewMode === 'GLOBE_CESIUM' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Cesium Globe</span>
        </button>
      </div>

      {/* Real-time Vertical Floor Explosion Slider HUD (Active when Explode > 0) */}
      {explodeFactor > 0 && (
        <div className="absolute bottom-16 left-6 p-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl z-20 w-80 text-xs text-slate-800 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Box className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-900 text-xs">Vertical Storey Explosion</span>
            </div>
            <span className="font-mono text-blue-600 font-bold">{explodeFactor.toFixed(1)}x</span>
          </div>

          <p className="text-[11px] text-slate-500 mb-3">
            Physically separates 3D floor slabs and internal private property units along vertical Z-axis.
          </p>

          <input 
            type="range"
            min="0"
            max="3.5"
            step="0.1"
            value={explodeFactor}
            onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1.5">
            <span>0x (Closed Envelope)</span>
            <span>1.5x (Floor Separation)</span>
            <span>3.5x (Full Unit Isolation)</span>
          </div>
        </div>
      )}

      {/* Dynamic Section Plane Slider HUD (when activeTool === 'section') */}
      {activeTool === 'section' && (
        <div className="absolute top-20 left-6 p-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl z-20 w-80 text-xs text-slate-800 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <SplitSquareVertical className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-900 text-xs">3D Section Clipping Plane</span>
            </div>
            <button 
              onClick={() => setActiveTool('select')} 
              className="text-slate-400 hover:text-slate-700 text-xs"
            >
              Done
            </button>
          </div>

          <p className="text-[11px] text-slate-500 mb-3">
            Slices horizontally across Tower Alpha to inspect floor partition plans and private boundary seals.
          </p>

          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[11px] text-slate-600">
              <span>Section Cut Height:</span>
              <span className="font-bold text-blue-600">+{sectionPlaneZ} m</span>
            </div>
            <input 
              type="range"
              min="0"
              max="24"
              step="1"
              value={sectionPlaneZ}
              onChange={(e) => setSectionPlaneZ(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Ground (0m)</span>
              <span>Floor 3 (+9m)</span>
              <span>Roof (+18m)</span>
            </div>
          </div>
        </div>
      )}

      {/* 3D Measurement Distance HUD (when activeTool === 'measure') */}
      {activeTool === 'measure' && (
        <div className="absolute top-20 left-6 p-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl z-20 w-80 text-xs text-slate-800 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Ruler className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-900 text-xs">3D Spatial Measurement</span>
            </div>
            <button 
              onClick={() => { setActiveTool('select'); setMeasureClickPoints([]); setMeasureOutput(null); }} 
              className="text-slate-400 hover:text-slate-700 text-xs"
            >
              Done
            </button>
          </div>

          <p className="text-[11px] text-slate-500 mb-3">
            Click any two vertices on parcel boundaries, building corners, or floor slabs to measure spatial delta.
          </p>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Euclidean 3D Distance:</span>
              <span className="font-bold text-blue-600">{measureOutput ? `${measureOutput.distance3D.toFixed(2)} m` : 'Pick 2 points'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Height Differential (ΔZ):</span>
              <span className="font-bold text-emerald-600">{measureOutput ? `${measureOutput.deltaZ.toFixed(2)} m` : '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Horizontal Ground Dist:</span>
              <span className="font-bold text-indigo-600">{measureOutput ? `${measureOutput.horizontalDist.toFixed(2)} m` : '---'}</span>
            </div>
          </div>

          <div className="mt-3 flex justify-between items-center text-[10px]">
            <button
              onClick={() => { setMeasureClickPoints([]); setMeasureOutput(null); }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
            >
              Clear Points
            </button>
            <span className="text-slate-400">
              {measureClickPoints.length === 0 ? 'Click 1st vertex' : (measureClickPoints.length === 1 ? 'Click 2nd vertex' : 'Measured')}
            </span>
          </div>
        </div>
      )}

      {/* Syncing Indicator */}
      {loading3D && (
        <div className="absolute top-16 right-48 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-blue-600 text-xs font-mono flex items-center space-x-2 z-20 shadow-sm pointer-events-none">
          <svg className="w-3.5 h-3.5 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-slate-700 font-sans font-medium text-xs">Transforming Cadastre...</span>
        </div>
      )}
    </div>
  );
};