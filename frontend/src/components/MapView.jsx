import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { area as turfArea } from "@turf/area";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

function MapView({ onAreaCalculated, onGeometryChanged, onSiteDeleted, savedSites = [] }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const draw = useRef(null);
  const areaCallback = useRef(onAreaCalculated);
  const geometryCallback = useRef(onGeometryChanged);
  const deleteCallback = useRef(onSiteDeleted);

  useEffect(() => {
    areaCallback.current = onAreaCalculated;
    geometryCallback.current = onGeometryChanged;
    deleteCallback.current = onSiteDeleted;
  }, [onAreaCalculated, onGeometryChanged, onSiteDeleted]);

  useEffect(() => {
    if (map.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;

    if (!token) {
      console.error("Mapbox token is missing.");
      return;
    }

    mapboxgl.accessToken = token;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [78.9629, 20.5937],
      zoom: 4,
    });

    map.current = mapInstance;

    mapInstance.addControl(
      new mapboxgl.NavigationControl(),
      "top-right"
    );

    const drawControl = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
    });

    draw.current = drawControl;
    mapInstance.addControl(drawControl, "top-left");

    mapInstance.on("draw.create", (event) => {
      const feature = event.features[0];

      if (!feature) return;

      const areaInSquareMeters = turfArea(feature);
      const areaInKm2 = areaInSquareMeters / 1000000;

      console.log("Calculated area:", areaInKm2);

      if (areaCallback.current) {
        areaCallback.current(areaInKm2);
      }
      if (geometryCallback.current) {
        geometryCallback.current(feature.geometry, feature.properties?.siteId);
      }
    });

    mapInstance.on("draw.update", (event) => {
      const feature = event.features[0];

      if (!feature) return;

      const areaInSquareMeters = turfArea(feature);
      const areaInKm2 = areaInSquareMeters / 1000000;

      if (areaCallback.current) {
        areaCallback.current(areaInKm2);
      }
      if (geometryCallback.current) {
        geometryCallback.current(feature.geometry, feature.properties?.siteId);
      }
    });

    mapInstance.on("draw.delete", (event) => {
      if (areaCallback.current) {
        areaCallback.current(0);
      }
      const deletedSiteId = event.features?.[0]?.properties?.siteId;
      if (deleteCallback.current && deletedSiteId) {
        deleteCallback.current(deletedSiteId);
      }
    });

    return () => {
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!draw.current) return;

    const existingFeatures = draw.current.getAll().features;
    const existingSiteIds = new Set(
      existingFeatures.map((feature) => feature.properties?.siteId),
    );
    savedSites.forEach((site) => {
      if (existingSiteIds.has(site.id)) return;
      if (existingFeatures.some((feature) => (
        JSON.stringify(feature.geometry) === JSON.stringify(site.geometry)
      ))) return;
      draw.current.add({
        type: "Feature",
        properties: { siteId: site.id },
        geometry: site.geometry,
      });
    });
  }, [savedSites]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "330px",
      }}
    />
  );
}

export default MapView;