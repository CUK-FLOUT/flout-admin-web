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
  viewOnly = false,
) {
  if (!validId(id)) return inspectionManagementPath(undefined, params);
  const suffix = filterSuffix(params);
  const view = viewOnly ? `${suffix ? "&" : "?"}view=readonly` : "";

  return `/inspection/${id}/results${suffix}${view}`;
}


function validSupportReturnPath(path: string | null): path is string {
  return path !== null && /^\/support(?:\/[1-9]\d*)?(?:\?[^#]*)?$/.test(path);
}

export function supportInspectionResultPath(
  inspectionId: number | null | undefined,
  returnTo: string,
) {
  if (!validId(inspectionId ?? undefined) || !validSupportReturnPath(returnTo)) return null;
  const params = new URLSearchParams({ supportReturnTo: returnTo, view: "readonly" });

  return `/inspection/${inspectionId}/results?${params}`;
}

export type InspectionResultReturn = { to: string; label: string };

export function inspectionResultReturn(
  id: string | undefined,
  params: URLSearchParams,
): InspectionResultReturn {
  const supportReturnTo = params.get("supportReturnTo");

  return validSupportReturnPath(supportReturnTo)
    ? { to: supportReturnTo, label: "지원 관리로 돌아가기" }
    : { to: inspectionManagementPath(id, params), label: "현장점검 관리로 돌아가기" };
}
