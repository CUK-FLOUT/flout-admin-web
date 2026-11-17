import {
  constructionScheduleError,
  saveConstructionSchedule,
} from "../../api/constructions";
import type { ConstructionActionContext } from "./constructionActionTypes";

export function useConstructionSchedule({
  record: a,
  draft,
  mutation,
  setError,
}: ConstructionActionContext) {
  function schedule() {
    if (!a || !draft) return;
    if (!a.scheduleEditable) {
      setError("일정은 미배정 시공에 최초 한 번만 저장할 수 있습니다.");

      return;
    }

    const issue = constructionScheduleError(draft.date, draft.time);

    if (issue) {
      setError(issue);

      return;
    }

    void mutation.request(
      () => saveConstructionSchedule(Number(a.id), draft.date, draft.time),
      "schedule-saved",
    );
  }

  return { schedule };
}
