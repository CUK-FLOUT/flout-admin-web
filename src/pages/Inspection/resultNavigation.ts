const filterKeys = [
  "stage",
  "district",
  "assignee",
  "visit",
  "q",
  "page",
] as const;

function filterSuffix(params: URLSearchParams) {
  const filters = new URLSearchParams();

  for (const key of filterKeys) {
    const value = params.get(key);

    if (value) filters.set(key, value);
  }

  const query = filters.toString();

  return query ? `?${query}` : "";
}

function validId(id: string | number | undefined) {
  return (
    id !== undefined &&
    /^[1-9]\d*$/.test(String(id)) &&
    Number.isSafeInteger(Number(id))
  );
}

export function inspectionManagementPath(
  id: string | number | undefined,
  params: URLSearchParams,
) {
  return `/inspection${validId(id) ? `/${id}` : ""}${filterSuffix(params)}`;
}

export function inspectionResultPath(
  id: number | undefined,
  params: URLSearchParams,
) {
  return validId(id)
    ? `/inspection/${id}/results${filterSuffix(params)}`
    : inspectionManagementPath(undefined, params);
}
