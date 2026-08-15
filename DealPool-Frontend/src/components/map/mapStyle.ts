/**
 * Zomato / Blinkit style muted light map skin for Google Maps.
 * Features:
 * - High-legibility road and street names from Google Maps API
 * - Clean muted gray & white road geometry
 * - Hidden commercial store pin clutter for clean discovery
 * - Soft pastel park and water features
 */
export interface MapTypeStyle {
  elementType?: string;
  featureType?: string;
  stylers: Array<Record<string, string | number | boolean>>;
}

export const mutedMapStyle: MapTypeStyle[] = [
  {
    elementType: "geometry",
    stylers: [{ color: "#f8f9fa" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#334155" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }, { weight: 3.5 }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#0f172a" }, { weight: 700 }],
  },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: "#1e293b" }, { weight: 600 }],
  },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cbd5e1" }, { weight: 1.5 }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry.fill",
    stylers: [{ color: "#e6f4ea" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#e2e8f0" }, { weight: 1.2 }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }, { weight: 500 }],
  },
  {
    featureType: "road",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }, { weight: 3 }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cbd5e1" }, { weight: 1.6 }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#fef3c7" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#fde68a" }, { weight: 2 }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#92400e" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: "#e0f2fe" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#0369a1" }],
  },
];

export default mutedMapStyle;
