import type { Application, Filters } from "./types";

const districtRegions: Record<string, string> = {
  중동: "원미구",
  상동: "원미구",
  원미동: "원미구",
};
const statusGroups: Record<string, string[]> = {
  점검: ["접수", "배정 대기", "점검 완료"],
  지원: ["지원 검토 중", "지원 미승인"],
  시공: ["시공 진행"],
};

export function filterApplications(
  applications: Application[],
  filters: Filters,
) {
  const query = filters.search.trim().toLowerCase();

  return applications.filter(
    (a) =>
      (!filters.district ||
        a.district === filters.district ||
        districtRegions[a.district] === filters.district) &&
      (!filters.risk || a.risk === filters.risk) &&
      (!filters.status ||
        (statusGroups[filters.status] ?? [filters.status]).includes(
          a.status,
        )) &&
      (!query || `${a.address} ${a.id}`.toLowerCase().includes(query)),
  );
}
