import React, { useEffect, useRef } from 'react';
import { useCadastre } from '../../store/CadastreContext';
import { cadastreApi } from '../../services/api';

declare const Cesium: any;

export const CesiumViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const dataSourceRef = useRef<any>(null);
  const roadsSourceRef = useRef<any>(null);
  const undergroundSourceRef = useRef<any>(null);

  const { 
    layers, 
    buildingTransparency, 
    explodeFactor, 
    basemap, 
    setSelectedEntityId,
    activeJurisdiction,
    flyToTarget
  } = useCadastre();

  // 1. Initialize Cesium Viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    if (typeof Cesium === 'undefined') {
      console.error('Cesium is not loaded globally.');
      return;
    }

    Cesium.Ion.defaultAccessToken = '';

    const viewer = new Cesium.Viewer(containerRef.current, {
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

    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.globe.enableLighting = false;

    // Set initial camera to Bengaluru Koramangala
    const centerLon = activeJurisdiction?.center[0] || 77.6255;
    const centerLat = activeJurisdiction?.center[1] || 12.9356;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat - 0.0035, 950),
      orientation: {
        heading: Cesium.Math.toRadians(15),
        pitch: Cesium.Math.toRadians(-40),
        roll: 0.0,
      },
      duration: 1.5,
    });

    // Handle Click Selection
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

  // 2. Load and Style 3D Cadastre Buildings & Floors
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const load3DData = async () => {
      try {
        if (dataSourceRef.current) {
          viewer.dataSources.remove(dataSourceRef.current);
        }

        const geojson = await cadastreApi.getCesiumGeoJSON(explodeFactor);
        const ds = await Cesium.GeoJsonDataSource.load(geojson, { clampToGround: false });

        const alpha = Math.max(0.15, (100 - buildingTransparency) / 100);

        ds.entities.values.forEach((entity: any) => {
          const props = entity.properties;
          const eType = props.entity_type ? props.entity_type.getValue() : 'UNIT';
          const colorHex = props.color ? props.color.getValue() : '#3b82f6';
          const baseM = props.base_m ? props.base_m.getValue() : 920.0;
          const roofM = props.roof_m ? props.roof_m.getValue() : 923.0;

          if (entity.polygon) {
            entity.polygon.height = baseM;
            entity.polygon.extrudedHeight = eType === 'PARCEL' ? baseM + 0.4 : roofM;
            entity.polygon.material = Cesium.Color.fromCssColorString(colorHex).withAlpha(alpha);
            entity.polygon.outline = true;
            entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.7);
          }
        });

        // Add spatial building tags (B11, B12, B13) and district label
        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(77.62515, 12.9358, 946),
          label: {
            text: 'IN-KA-BLR-P78-B12\n8 Units | G+5 | Residential',
            font: '10px JetBrains Mono, sans-serif',
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString('#0d1321').withAlpha(0.85),
            backgroundPadding: new Cesium.Cartesian2(8, 5),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }
        });

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(77.62515, 12.9358, 940),
          point: { pixelSize: 8, color: Cesium.Color.fromCssColorString('#38bdf8') },
          label: {
            text: 'B12',
            font: 'bold 12px Inter, sans-serif',
            fillColor: Cesium.Color.CYAN,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
          }
        });

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(77.62415, 12.9358, 937),
          label: {
            text: 'B11',
            font: 'bold 11px Inter, sans-serif',
            fillColor: Cesium.Color.WHITE,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
          }
        });

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(77.6273, 12.9358, 943),
          label: {
            text: 'B13',
            font: 'bold 11px Inter, sans-serif',
            fillColor: Cesium.Color.WHITE,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
          }
        });

        viewer.dataSources.add(ds);
        dataSourceRef.current = ds;
      } catch (err) {
        console.error('Failed loading Cesium 3D data', err);
      }
    };

    load3DData();
  }, [explodeFactor, buildingTransparency]);

  // 3. Toggle Roads & Underground Infrastructure
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Roads Layer
    const handleRoads = async () => {
      if (layers.roads) {
        if (!roadsSourceRef.current) {
          const rGeo = await cadastreApi.getRoadsGeoJSON();
          const rDs = await Cesium.GeoJsonDataSource.load(rGeo, {
            stroke: Cesium.Color.fromCssColorString('#94a3b8').withAlpha(0.6),
            strokeWidth: 4,
            clampToGround: true
          });
          // Add Street Labels
          rDs.entities.add({
            position: Cesium.Cartesian3.fromDegrees(77.6250, 12.9372, 922),
            label: {
              text: 'Outer Ring Road',
              font: '10px Inter, sans-serif',
              fillColor: Cesium.Color.fromCssColorString('#cbd5e1'),
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.5)
            }
          });
          rDs.entities.add({
            position: Cesium.Cartesian3.fromDegrees(77.6250, 12.9345, 922),
            label: {
              text: 'Koramangala 5th Block',
              font: '10px Inter, sans-serif',
              fillColor: Cesium.Color.fromCssColorString('#cbd5e1'),
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.5)
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

    // Underground Layer
    const handleUnderground = async () => {
      if (layers.underground) {
        if (!undergroundSourceRef.current) {
          const uGeo = await cadastreApi.getUndergroundGeoJSON();
          const uDs = await Cesium.GeoJsonDataSource.load(uGeo, {
            stroke: Cesium.Color.fromCssColorString('#ec4899').withAlpha(0.8),
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

  // 4. Handle Fly-To Camera Dispatch
  useEffect(() => {
    if (!viewerRef.current || !flyToTarget) return;
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(flyToTarget[0], flyToTarget[1] - 0.002, 940),
      orientation: {
        heading: Cesium.Math.toRadians(15),
        pitch: Cesium.Math.toRadians(-40),
        roll: 0.0,
      },
      duration: 1.8,
    });
  }, [flyToTarget]);

  return (
    <div className="relative w-full h-full bg-[#0b0f19] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" id="cesiumContainer" />
    </div>
  );
};
