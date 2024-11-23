import { GeoPoint } from '@/modules/flight/types';

// src/modules/georeferencing/types/index.ts
export interface GeoReferencedPoint {
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  timestamp: Date;
  timeMs: number;
}

export interface InterpolatedPosition extends GeoReferencedPoint {
  interpolationWeight: number; // 0-1 사이 값, 얼마나 보간되었는지
}

export interface GeoReferencedBbox {
  center: GeoPoint; // 객체 중심점의 지리 좌표
  corners: {
    // bbox 네 모서리의 지리 좌표
    topLeft: GeoPoint;
    topRight: GeoPoint;
    bottomLeft: GeoPoint;
    bottomRight: GeoPoint;
  };
  originalBbox: {
    // 원본 이미지에서의 bbox
    x: number; // 중심점 x (정규화된 좌표 0-1)
    y: number; // 중심점 y (정규화된 좌표 0-1)
    width: number; // 너비 (정규화된 값 0-1)
    height: number; // 높이 (정규화된 값 0-1)
  };
}

export interface GeoReferencedObject {
  trackId: number;
  classId: number;
  confidence: number;
  position: GeoReferencedBbox;
}
