// src/modules/georeferencing/types/index.ts
export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitude: number;
}

export interface DroneState extends GeoPoint {
  heading: number; // degrees, 0 = north, clockwise
  timestamp: Date; // UTC timestamp
  timeMs: number; // relative time in ms
}

export interface ObjectDimensions {
  width: number; // meters
  height: number; // meters
}

export interface GeoReferencedObject {
  center: GeoPoint;
  dimensions: ObjectDimensions;
  pixelToWorldRatio: number;
}
