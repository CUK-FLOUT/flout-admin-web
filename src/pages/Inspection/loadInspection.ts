import { getInspection, getInspections } from "../../api/inspections";
import type { InspectionItem } from "../../api/inspections";
import { inspectionDetail, inspectionRow } from "./apiModel";

export async function loadInspection(
  id: number,
  signal?: AbortSignal,
  known?: InspectionItem,
) {
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error("올바른 점검 ID가 아닙니다.");
  const detail = await getInspection(id, signal);
  let item = known;
  let page = 0;

  while (!item) {
    const response = await getInspections(
      { keyword: detail.receiptNo, page, size: 100 },
      signal,
    );

    item = response.inspections.find((row) => row.inspectionId === id);
    if (item || ++page >= response.totalPages) break;
  }

  if (!item)
    throw new Error(
      "목록에서 현재 점검 상태를 확인하지 못했습니다. 목록을 다시 조회해 주세요.",
    );

  return inspectionDetail(detail, inspectionRow(item));
}
