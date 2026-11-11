import type { Application } from "./types";

export type MapLocation = {
  latitude: number;
  longitude: number;
  source: "application" | "demo";
};
export const BUCHEON_CENTER = { latitude: 37.5034, longitude: 126.766 };

// UI test points only. These are NOT geocoded locations of the masked addresses.
const demoCoordinates: Record<string, [number, number]> = {
  "000001": [37.4986, 126.7618],
  "000002": [37.4957, 126.7698],
  "000003": [37.491, 126.7648],
  "000004": [37.4991, 126.7801],
  "000005": [37.4897, 126.7766],
  "000006": [37.5028, 126.7726],
};

export function getMapLocation(
  application: Application,
): MapLocation | undefined {
  const coordinates = application.coordinates;
  const point = coordinates
    ? [coordinates.latitude, coordinates.longitude]
    : application.receiptNo ? undefined : demoCoordinates[application.id];

  if (
    !point ||
    !Number.isFinite(point[0]) ||
    !Number.isFinite(point[1]) ||
    Math.abs(point[0]) > 90 ||
    Math.abs(point[1]) > 180
  )
    return undefined;

  return {
    latitude: point[0],
    longitude: point[1],
    source: coordinates ? "application" : "demo",
  };
}
