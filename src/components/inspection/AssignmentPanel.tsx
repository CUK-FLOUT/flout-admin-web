import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { InspectionApplication } from "../../pages/Inspection/mockData";
import { formatDate } from "../../pages/Inspection/mockData";
import { CalendarIcon, ClockIcon } from "./InspectionIcons";
import { inspectionDate, inspectionPanel } from "./styles";
import person from "../../assets/inspection/person.svg";
import { getSession } from "../../auth/session";
import { validateAssignment } from "../../pages/Inspection/apiModel";
import { inspectionResultPath } from "../../pages/Inspection/resultNavigation";
import type { InspectionDialogState } from "./InspectionDialog";

type Props = {
  application: InspectionApplication;
  onSave: (
    application: InspectionApplication,
    kind: InspectionDialogState,
  ) => Promise<boolean>;
  busy: boolean;
};
type AssignmentForm = Pick<
  InspectionApplication,
  "assignee" | "visitDate" | "visitTime" | "notice"
>;
const input =
  "h-10 w-full min-w-0 rounded-md border border-[#c8d0d7] bg-white px-3 text-[13px] font-medium leading-[19px]";

export default function AssignmentPanel({
  application: a,
  onSave,
  busy,
}: Props) {
  const [params] = useSearchParams();
  const readOnly = a.inspectorUserId != null || a.status === "진행" || a.status === "완료";
  const [draft, setDraft] = useState<AssignmentForm>(() => ({
    visitDate: a.visitDate,
    visitTime: a.visitTime,
    notice: a.notice,
    assignee: readOnly ? a.assignee : getSession()?.name || "본인",
  }));
  const [error, setError] = useState("");

  function update<K extends keyof AssignmentForm>(
    key: K,
    value: AssignmentForm[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function save() {
    if (busy || readOnly) return;
    const next = {
      ...a,
      assignee: draft.assignee,
      visitDate: draft.visitDate,
      visitTime: draft.visitTime,
      notice: draft.notice,
      status: a.status,
    };

    const problem = validateAssignment(next);

    if (problem) {
      setError(problem);

      return;
    }

    void onSave(next, "assignment-saved");
  }

  return (
    <section
      aria-labelledby="inspection-assignment-title"
      className={`${inspectionPanel} flex flex-col gap-2 overflow-y-auto rounded-lg border-[.75px] border-[#c8d0d7] bg-white p-[15.25px]`}
    >
      <h2
        id="inspection-assignment-title"
        className="flex min-h-[30px] shrink-0 items-center text-lg font-bold leading-[26px]"
      >
        {a.id} · 점검 배정
      </h2>
      <p className="shrink-0 text-[13px] leading-[19px]">
        {a.resident} · {a.address} · {a.phone}
      </p>
      <div className="flex min-h-12 shrink-0 items-center gap-2 rounded-[7px] bg-[#f4f5f6] px-3 text-[13px] font-bold leading-[19px]">
        <CalendarIcon />
        <span>
          주민 희망:{" "}
          {a.requestedDate ? formatDate(a.requestedDate) : "희망일 미입력"} ·{" "}
          {a.requestedTime}
        </span>
      </div>
      <label className="flex shrink-0 flex-col gap-[6px] text-[13px] font-bold leading-[19px]">
        점검 담당자
        <span className="relative block">
          <img
            src={person}
            alt=""
            width={18}
            height={18}
            className="pointer-events-none absolute left-3 top-[11px]"
          />
          <select
            aria-label="점검 담당자"
            disabled
            value={draft.assignee}
            onChange={(event) => update("assignee", event.target.value)}
            className={`${input} appearance-none pl-[38px] pr-7`}
          >
            <option>{draft.assignee}</option>
          </select>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-[10px] text-xs"
          >
            ⌄
          </span>
        </span>
      </label>
      <div className="flex shrink-0 gap-[10px]">
        <label className="flex min-w-0 flex-1 flex-col gap-[6px] text-[13px] font-bold leading-[19px]">
          확정 방문일
          <span className="relative block">
            <span className="pointer-events-none absolute left-3 top-[11px]">
              <CalendarIcon />
            </span>
            <input
              aria-label="확정 방문일"
              type="date"
              required
              disabled={busy || readOnly}
              value={draft.visitDate}
              onInput={(event) =>
                update("visitDate", event.currentTarget.value)
              }
              onChange={(event) => update("visitDate", event.target.value)}
              className={`${input} ${inspectionDate} pl-[38px] pr-[8px]`}
            />
          </span>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-[6px] text-[13px] font-bold leading-[19px]">
          방문 시간
          <span className="relative block">
            <span className="pointer-events-none absolute left-3 top-[11px]">
              <ClockIcon />
            </span>
            <input
              aria-label="방문 시간"
              type="time"
              required
              disabled={busy || readOnly}
              value={draft.visitTime}
              onInput={(event) =>
                update("visitTime", event.currentTarget.value)
              }
              onChange={(event) => update("visitTime", event.target.value)}
              className={`${input} ${inspectionDate} pl-[38px] pr-[8px]`}
            />
          </span>
        </label>
      </div>
      <label className="flex shrink-0 flex-col gap-[6px] text-[13px] font-bold leading-[19px]">
        주민 방문 전 안내
        <input
          aria-label="주민 방문 전 안내"
          disabled={busy || readOnly}
          maxLength={2000}
          value={draft.notice}
          onChange={(event) => update("notice", event.target.value)}
          className={`${input} h-[42px] font-normal`}
        />
      </label>
      {error && (
        <p role="alert" className="text-[13px] leading-[19px] text-[#a53632]">
          {error}
        </p>
      )}
      <div className="flex shrink-0 flex-col gap-[10px]">
        <button
          type="button"
          disabled={busy || readOnly}
          onClick={save}
          className="h-[42px] rounded-md bg-[#234f73] text-sm font-bold leading-5 text-white"
        >
          배정·일정 저장
        </button>
        <Link
          to={inspectionResultPath(a.inspectionId, params)}
          className="flex h-[42px] items-center justify-center rounded-md border border-[#c8d0d7] bg-white text-sm font-bold leading-5"
        >
          점검 결과 등록
        </Link>
      </div>
    </section>
  );
}
