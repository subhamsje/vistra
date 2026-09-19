import React, { useEffect, useRef, useState } from 'react';
import { useCadastre } from '../../store/CadastreContext';
import { cadastreApi } from '../../services/api';

declare const Cesium: any;

export const CesiumViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const dataSourceRef = useRef<any>(null);
  const roadsSourceRef = useRef<any>(null);
  const undergroundSourceRef = useRef<any>(null);

  const [imageryLoaded, setImageryLoaded] = useState(true);
  const [loading3D, setLoading3D] = useState(true);

  const { 
    layers, 
    buildingTransparency, 
    explodeFactor, 
    basemap, 
    selectedEntity,
    setSelectedEntityId,
    selectedBuildingId,
    setSelectedBuildingId,
    viewMode,
    cameraMode,
    activeJurisdiction,
    flyToTarget
  } = useCadastre();

  // 1. Initialize Cesium Viewer with Open Imagery (No Black Screen)
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    if (typeof Cesium === 'undefined') {
      console.error('Cesium is not loaded globally.');
      return;
    }

    Cesium.Ion.defaultAccessToken = '';

    // High quality imagery provider fallback - Esri World Imagery (Satellite)
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
    });

    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0b0f19');

    // Default framing for Koramangala P78 / B12
    const targetLon = activeJurisdiction?.center[0] || 77.62515;
    const targetLat = activeJurisdiction?.center[1] || 12.9358;
    const targetCenter = Cesium.Cartesian3.fromDegrees(targetLon, targetLat, 10.0);

    viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(targetCenter, 85),
      {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(35),
          Cesium.Math.toRadians(-28),
          200
        ),
        duration: 1.2,
      }
    );

    // Entity Selection Click Handler
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: any) => {
      const picked = viewer.scene.pick(movement.position);
      if (Cesium.defined(picked) && picked.id && picked.id.properties) {
        const props = picked.id.properties;
        const eId = props.id ? props.id.getValue() : (picked.id.id || 'B12_F3_U304');
        const bId = props.building_id ? props.building_id.getValue() : (picked.id.id?.startsWith('B') ? picked.id.id.split('_')[0] : 'B12');
        if (bId) setSelectedBuildingId(bId);
        setSelectedEntityId(eId);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    viewerRef.current = viewer;

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // 2. Basemap Switcher Support & Reality / Analysis View Balance
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let newProvider;
    if (viewMode === 'ANALYSIS') {
      // In Analysis View, use a minimalist high-contrast slate dark basemap so 3D geometry pops
      newProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        maximumLevel: 19
      });
    } else if (basemap === 'streets') {
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
    } else {
      // Default satellite (Reality View)
      newProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 19
      });
    }

    try {
      viewer.imageryLayers.removeAll();
      const layer = viewer.imageryLayers.addImageryProvider(newProvider);
      // In analysis mode, soften imagery saturation/alpha so cadastral lines are crystal clear
      if (viewMode === 'ANALYSIS') {
        layer.alpha = 0.8;
      } else {
        layer.alpha = 1.0;
      }
    } catch (e) {
      console.warn('Could not switch basemap', e);
    }
  }, [basemap, viewMode]);

  // 3. Load & Render 3D Cadastral Geometry (Buildings, Floors, Parcels)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const load3DData = async () => {
      setLoading3D(true);
      try {
        if (dataSourceRef.current) {
          viewer.dataSources.remove(dataSourceRef.current);
        }

        const geojson = await cadastreApi.getCesiumGeoJSON(
          explodeFactor,
          selectedBuildingId || 'B12',
          selectedEntity?.entity_id || ''
        );
        const ds = await Cesium.GeoJsonDataSource.load(geojson, { clampToGround: false });

        const baseAlpha = Math.max(0.15, (100 - buildingTransparency) / 100);
        const selectedId = selectedEntity?.entity_id || 'B12_F3_U304';
        const selectedFloorNum = selectedEntity?.floor_level;

        ds.entities.values.forEach((entity: any) => {
          const props = entity.properties;
          const eType = props.entity_type ? props.entity_type.getValue() : 'UNIT';
          const eId = props.id ? props.id.getValue() : entity.id;
          const flLvl = props.floor_level ? props.floor_level.getValue() : 1;
          const isContext = props.is_context ? props.is_context.getValue() : false;
          const colorHex = props.color ? props.color.getValue() : '#3b82f6';
          
          const localBase = props.local_base_m ? props.local_base_m.getValue() : 0.0;
          const localRoof = props.local_roof_m ? props.local_roof_m.getValue() : 3.0;

          if (entity.polygon) {
            if (eType === 'PARCEL') {
              // Cadastral ground parcel footprint - Crisp, thin boundary
              const isSelectedParcel = (eId === selectedEntity?.parcel_id) || (eId === selectedEntity?.entity_id);
              entity.polygon.height = 0.05;
              entity.polygon.extrudedHeight = 0.25;
              entity.polygon.material = Cesium.Color.fromCssColorString(isSelectedParcel ? '#10b981' : '#22c55e').withAlpha(isSelectedParcel ? 0.25 : 0.12);
              entity.polygon.outline = true;
              entity.polygon.outlineColor = Cesium.Color.fromCssColorString(isSelectedParcel ? '#34d399' : '#22c55e').withAlpha(0.95);
              entity.polygon.outlineWidth = isSelectedParcel ? 4 : 2;
              entity.show = layers.parcelBoundaries;
            } else if (isContext) {
              // Surrounding context buildings - Subdued, semi-transparent architectural massing
              entity.polygon.height = localBase;
              entity.polygon.extrudedHeight = localRoof;
              entity.polygon.material = Cesium.Color.fromCssColorString('#475569').withAlpha(0.25 * baseAlpha);
              entity.polygon.outline = true;
              entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.35);
              entity.polygon.outlineWidth = 1;
              entity.show = layers.buildings3d;
            } else {
              // Primary Focused Building Storeys / Units
              entity.polygon.height = localBase;
              entity.polygon.extrudedHeight = localRoof;

              const isUnitSelected = (eId === selectedId);
              const isFloorActive = selectedFloorNum !== undefined && (flLvl === selectedFloorNum);

              if (isUnitSelected) {
                // High-visibility focus for selected unit
                entity.polygon.material = Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.98);
                entity.polygon.outline = true;
                entity.polygon.outlineColor = Cesium.Color.WHITE;
                entity.polygon.outlineWidth = 4;
              } else if (isFloorActive) {
                // Highlighted active floor
                entity.polygon.material = Cesium.Color.fromCssColorString(colorHex).withAlpha(0.92);
                entity.polygon.outline = true;
                entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.9);
                entity.polygon.outlineWidth = 3;
              } else {
                // Non-selected floors in active building
                entity.polygon.material = Cesium.Color.fromCssColorString(colorHex).withAlpha(0.70 * baseAlpha);
                entity.polygon.outline = true;
                entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.65);
                entity.polygon.outlineWidth = 1.5;
              }
              entity.show = layers.floorsUnits;
            }
          }
        });

        // Add 3D spatial labels
        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(77.62515, 12.9358, 24.0 + (6 * explodeFactor)),
          label: {
            text: 'TOWER B12\nIN-KA-BLR-P78-B12 | G+5',
            font: 'bold 11px JetBrains Mono, sans-serif',
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString('#0d1321').withAlpha(0.9),
            backgroundPadding: new Cesium.Cartesian2(8, 5),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }
        });

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(77.62415, 12.9358, 17.0),
          label: {
            text: 'TOWER B11\nContext Commercial',
            font: '10px Inter, sans-serif',
            fillColor: Cesium.Color.WHITE.withAlpha(0.8),
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
            backgroundPadding: new Cesium.Cartesian2(6, 3),
            verticalOrigin: Cesium.VerticalOrigin.TOP,
          }
        });

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(77.6273, 12.9358, 23.0),
          label: {
            text: 'TOWER B13\nContext Commercial',
            font: '10px Inter, sans-serif',
            fillColor: Cesium.Color.WHITE.withAlpha(0.8),
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
            backgroundPadding: new Cesium.Cartesian2(6, 3),
            verticalOrigin: Cesium.VerticalOrigin.TOP,
          }
        });

        viewer.dataSources.add(ds);
        dataSourceRef.current = ds;
        setLoading3D(false);
      } catch (err) {
        console.error('Failed loading 3D Cadastre data', err);
        setLoading3D(false);
      }
    };

    load3DData();
  }, [
    explodeFactor, 
    buildingTransparency, 
    selectedEntity?.entity_id, 
    selectedEntity?.floor_level, 
    selectedBuildingId, 
    viewMode,
    layers.parcelBoundaries, 
    layers.buildings3d, 
    layers.floorsUnits
  ]);

  // 4. Roads & Underground Infrastructure Layers
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleRoads = async () => {
      if (layers.roads) {
        if (!roadsSourceRef.current) {
          const rGeo = await cadastreApi.getRoadsGeoJSON();
          const rDs = await Cesium.GeoJsonDataSource.load(rGeo, {
            stroke: Cesium.Color.fromCssColorString('#94a3b8').withAlpha(0.7),
            strokeWidth: 5,
            clampToGround: true
          });

          // Add Street Labels
          rDs.entities.add({
            position: Cesium.Cartesian3.fromDegrees(77.6250, 12.9372, 2),
            label: {
              text: 'Outer Ring Road',
              font: 'bold 11px Inter, sans-serif',
              fillColor: Cesium.Color.fromCssColorString('#f8fafc'),
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.65),
              backgroundPadding: new Cesium.Cartesian2(6, 4)
            }
          });
          rDs.entities.add({
            position: Cesium.Cartesian3.fromDegrees(77.6250, 12.9345, 2),
            label: {
              text: 'Koramangala 5th Block',
              font: 'bold 11px Inter, sans-serif',
              fillColor: Cesium.Color.fromCssColorString('#f8fafc'),
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.65),
              backgroundPadding: new Cesium.Cartesian2(6, 4)
            }
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

  // 5. Dynamic Camera Framing when Selection, Camera Mode, or FlyTo Target changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (flyToTarget) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(flyToTarget[0], flyToTarget[1] - 0.0018, 120),
        orientation: {
          heading: Cesium.Math.toRadians(35),
          pitch: Cesium.Math.toRadians(-28),
          roll: 0.0,
        },
        duration: 1.2,
      });
      return;
    }

    // Dynamic bounding sphere calculation based on selection
    let centerLon = 77.62515;
    let centerLat = 12.9358;
    let radius = 60;
    let range = 160;
    let pitch = -28;
    let heading = 35;

    if (selectedBuildingId === 'B11') {
      centerLon = 77.62415;
    } else if (selectedBuildingId === 'B13') {
      centerLon = 77.6273;
    }

    if (cameraMode === 'CITY') {
      radius = 450;
      range = 950;
      pitch = -45;
    } else if (cameraMode === 'PARCEL') {
      radius = 120;
      range = 280;
      pitch = -35;
    } else if (cameraMode === 'BUILDING') {
      radius = 50;
      range = 140;
      pitch = -25;
    } else if (cameraMode === 'FLOOR' || cameraMode === 'UNIT') {
      radius = 25;
      range = 80;
      pitch = -18;
    } else if (cameraMode === 'TOP_DOWN') {
      radius = 70;
      range = 220;
      pitch = -89; // Straight down 2D cadastral perspective
      heading = 0;
    } else if (cameraMode === 'ORBIT') {
      radius = 60;
      range = 160;
      pitch = -22;
      heading = 120;
    }

    // Adjust target center z if a specific floor is selected
    const flLvl = selectedEntity?.floor_level ?? 3;
    const centerZ = Math.max(10.0, (flLvl * 3.0) + (flLvl * explodeFactor));
    const targetCenter = Cesium.Cartesian3.fromDegrees(centerLon, centerLat, centerZ);

    viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(targetCenter, radius),
      {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(heading),
          Cesium.Math.toRadians(pitch),
          range
        ),
        duration: 1.0,
      }
    );
  }, [
    selectedEntity?.entity_id, 
    selectedEntity?.floor_level, 
    selectedBuildingId, 
    cameraMode, 
    flyToTarget
  ]);

  return (
    <div className="relative w-full h-full bg-[#0b0f19] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" id="cesiumContainer" />
      
      {/* Loading Indicator */}
      {loading3D && (
        <div className="absolute top-16 right-4 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-white/10 text-cyan-400 text-xs font-mono flex items-center space-x-2 z-10 shadow-xl pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>Rendering 3D Cadastre...</span>
        </div>
      )}
    </div>
  );
};
