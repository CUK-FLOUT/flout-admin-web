import { emptyFilters } from "./model";
import { registrationTypes, reviewStatuses } from "./types";
import type { InfrastructureFilters } from "./types";

export function infrastructureFiltersFrom(
  params: URLSearchParams,
): InfrastructureFilters {
  return {
    district:
      ["원미구", "소사구", "오정구"].find(
        (value) => value === params.get("district"),
      ) || emptyFilters.district,
    status:
      reviewStatuses.find((value) => value === params.get("status")) ||
      emptyFilters.status,
    kind:
      registrationTypes.find((value) => value === params.get("kind")) ||
      emptyFilters.kind,
    query: params.get("q") || "",
  };
}
