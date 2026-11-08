import type { InfrastructureIssue } from "./types";

const demoCoordinates: Record<string, [number, number]> = {
  "region-001": [37.4986, 126.7618],
  "region-002": [37.4957, 126.7698],
  "region-003": [37.491, 126.7648],
  "region-004": [37.4991, 126.7801],
  "region-005": [37.4897, 126.7766],
};

export function getInfrastructureLocation(issue: InfrastructureIssue) {
  const coordinates = issue.coordinates;
  const point = coordinates
    ? [coordinates.latitude, coordinates.longitude]
    : demoCoordinates[issue.id];

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
    source: coordinates ? ("issue" as const) : ("demo" as const),
  };
}
