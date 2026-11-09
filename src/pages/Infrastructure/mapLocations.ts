import type { InfrastructureIssue } from "./types";

export function getInfrastructureLocation(issue: InfrastructureIssue) {
  const coordinates = issue.coordinates;
  const point = coordinates
    ? [coordinates.latitude, coordinates.longitude]
    : undefined;

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
    source: "issue" as const,
  };
}
