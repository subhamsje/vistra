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

    // High quality imagery provider fallback - Esri World Imagery (Satellite) & OpenStreetMap
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
      new Cesium.BoundingSphere(targetCenter, 95),
      {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(35),
          Cesium.Math.toRadians(-28),
          220
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
        const eId = props.id ? props.id.getValue() : (picked.id.id || 'B12_F3_U04');
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

  // 2. Basemap Switcher Support
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
    } else {
      // Default satellite
      newProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 19
      });
    }

    try {
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(newProvider);
    } catch (e) {
      console.warn('Could not switch basemap', e);
    }
  }, [basemap]);

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

        const geojson = await cadastreApi.getCesiumGeoJSON(explodeFactor);
        const ds = await Cesium.GeoJsonDataSource.load(geojson, { clampToGround: false });

        const baseAlpha = Math.max(0.15, (100 - buildingTransparency) / 100);
        const selectedId = selectedEntity?.entity_id || 'B12_F3_U04';
        const selectedFloorNum = selectedEntity?.floor_level ?? 3;

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
              // Cadastral ground parcel footprint
              entity.polygon.height = 0.1;
              entity.polygon.extrudedHeight = 0.35;
              entity.polygon.material = Cesium.Color.fromCssColorString('#22c55e').withAlpha(0.2);
              entity.polygon.outline = true;
              entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#22c55e').withAlpha(0.9);
              entity.polygon.outlineWidth = 3;
              entity.show = layers.parcelBoundaries;
            } else if (isContext) {
              // Surrounding context buildings (B11, B13)
              entity.polygon.height = localBase;
              entity.polygon.extrudedHeight = localRoof;
              entity.polygon.material = Cesium.Color.fromCssColorString('#475569').withAlpha(0.35 * baseAlpha);
              entity.polygon.outline = true;
              entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.4);
              entity.show = layers.buildings3d;
            } else {
              // Primary Building B12 Storeys / Units
              entity.polygon.height = localBase;
              entity.polygon.extrudedHeight = localRoof;

              const isFloorSelected = (flLvl === selectedFloorNum) || (eId === selectedId);
              
              if (isFloorSelected) {
                // Highlighted active floor / unit
                entity.polygon.material = Cesium.Color.fromCssColorString(colorHex).withAlpha(0.95);
                entity.polygon.outline = true;
                entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#38bdf8'); // Glowing cyan border
                entity.polygon.outlineWidth = 4;
              } else {
                entity.polygon.material = Cesium.Color.fromCssColorString(colorHex).withAlpha(0.65 * baseAlpha);
                entity.polygon.outline = true;
                entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.6);
              }
              entity.show = layers.floorsUnits;
            }
          }
        });

        // Add 3D spatial labels matching screenshot
        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(77.62515, 12.9358, 25.0 + (5 * explodeFactor)),
          label: {
            text: 'IN-KA-BLR-P78-B12\n8 Units | G+5 | Residential',
            font: 'bold 11px JetBrains Mono, sans-serif',
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString('#0d1321').withAlpha(0.9),
            backgroundPadding: new Cesium.Cartesian2(10, 6),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }
        });

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(77.62515, 12.9358, 19.0 + (5 * explodeFactor)),
          point: { pixelSize: 8, color: Cesium.Color.fromCssColorString('#38bdf8') },
          label: {
            text: 'B12',
            font: 'bold 13px Inter, sans-serif',
            fillColor: Cesium.Color.CYAN,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
          }
        });

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(77.62415, 12.9358, 16.0),
          label: {
            text: 'B11',
            font: 'bold 11px Inter, sans-serif',
            fillColor: Cesium.Color.WHITE.withAlpha(0.9),
            verticalOrigin: Cesium.VerticalOrigin.TOP,
          }
        });

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(77.6273, 12.9358, 22.0),
          label: {
            text: 'B13',
            font: 'bold 11px Inter, sans-serif',
            fillColor: Cesium.Color.WHITE.withAlpha(0.9),
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
  }, [explodeFactor, buildingTransparency, selectedEntity?.entity_id, selectedEntity?.floor_level, layers.parcelBoundaries, layers.buildings3d, layers.floorsUnits]);

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

  // 5. Dynamic Camera Framing when Selection or FlyTo Target changes
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

    // When entity is selected, smoothly frame it
    if (selectedEntity) {
      const lon = 77.62515;
      const lat = 12.9358;
      const targetCenter = Cesium.Cartesian3.fromDegrees(lon, lat, 12.0);

      viewer.camera.flyToBoundingSphere(
        new Cesium.BoundingSphere(targetCenter, 70), // Framed so building occupies 30-40% of viewport
        {
          offset: new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(35),
            Cesium.Math.toRadians(-28),
            180
          ),
          duration: 1.0,
        }
      );
    }
  }, [selectedEntity?.entity_id, selectedEntity?.floor_level, flyToTarget]);

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
