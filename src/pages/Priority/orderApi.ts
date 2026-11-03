import {
  getPriorityOrder,
  isPriorityConflict,
  savePriorityOrder,
  validateApplicationIds,
} from "../../api/priorityInspections";

export async function commitPriorityOrder(
  applicationIds: number[],
  expectedIds: number[],
  filtered: boolean,
) {
  if (filtered)
    throw new Error("선정 순서를 저장하려면 검색어와 필터를 초기화해주세요.");
  validateApplicationIds(applicationIds);
  validateApplicationIds(expectedIds);
  const expected = new Set(expectedIds);

  if (
    applicationIds.length !== expected.size ||
    applicationIds.some((id) => !expected.has(id))
  )
    throw new Error("전체 대상 목록을 다시 조회해 주세요.");

  try {
    await savePriorityOrder(applicationIds);

    return { saved: true as const };
  } catch (error) {
    if (!isPriorityConflict(error)) throw error;
    const applications = await getPriorityOrder();

    return { saved: false as const, applications };
  }
}
