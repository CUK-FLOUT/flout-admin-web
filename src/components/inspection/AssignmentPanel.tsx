import { useState } from "react";
import { Link } from "react-router-dom";
import type {
  AssignmentDraft,
  InspectionApplication,
} from "../../pages/Inspection/mockData";
import {
  formatDate,
  getAssignmentDraft,
} from "../../pages/Inspection/mockData";
import { CalendarIcon, ClockIcon } from "./InspectionIcons";
import StatusDropdown from "./StatusDropdown";
import { inspectionCheckbox, inspectionDate, inspectionPanel } from "./styles";
import person from "../../assets/inspection/person.svg";
import { getSession } from "../../auth/session";
import { validateAssignment } from "../../pages/Inspection/apiModel";
import type { InspectionDialogState } from "./InspectionDialog";

type Props = {
  application: InspectionApplication;
  onSave: (
    application: InspectionApplication,
    kind: InspectionDialogState,
  ) => Promise<boolean>;
  busy: boolean;
  onStatus: (status: AssignmentDraft["status"]) => void;
};
const input =
  "h-10 w-full min-w-0 rounded-md border border-[#c8d0d7] bg-white px-3 text-[13px] font-medium leading-[19px]";

export default function AssignmentPanel({
  application: a,
  onSave,
  onStatus,
  busy,
}: Props) {
  const [draft, setDraft] = useState(() => ({
    ...getAssignmentDraft(a),
    visitTime: a.visitTime,
    assignee:
      a.inspectorUserId != null ? a.assignee : getSession()?.name || "본인",
    notifyResident: false,
  }));
  const [error, setError] = useState("");

  function update<K extends keyof AssignmentDraft>(
    key: K,
    value: AssignmentDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function save() {
    const next = {
      ...a,
      assignee: draft.assignee,
      visitDate: draft.visitDate,
      visitTime: draft.visitTime,
      notice: draft.notice,
      notifyResident: draft.notifyResident,
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
              disabled={busy || a.inspectorUserId != null}
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
              disabled={busy || a.inspectorUserId != null}
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
          disabled={busy || a.inspectorUserId != null}
          maxLength={2000}
          value={draft.notice}
          onChange={(event) => update("notice", event.target.value)}
          className={`${input} h-[42px] font-normal`}
        />
      </label>
      <div className="flex shrink-0 flex-col gap-[6px]">
        <label
          htmlFor="inspection-status"
          className="text-[13px] font-bold leading-[19px]"
        >
          점검 상태
        </label>
        <div className="flex gap-2">
          <StatusDropdown
            value={draft.status}
            onChange={(value) => update("status", value)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                a.inspectorUserId != null &&
                (draft.visitDate !== a.visitDate ||
                  draft.visitTime !== a.visitTime ||
                  draft.notice !== a.notice)
              ) {
                setError("변경한 배정·일정을 먼저 저장해 주세요.");

                return;
              }

              setError("");
              onStatus(draft.status);
            }}
            className="h-10 w-[88px] shrink-0 rounded-md bg-[#234f73] px-3 text-sm font-semibold text-white"
          >
            상태 저장
          </button>
        </div>
      </div>
      <label className="flex shrink-0 items-center gap-2 text-[13px] font-medium leading-[19px]">
        <input
          type="checkbox"
          disabled
          checked={false}
          onChange={(event) => update("notifyResident", event.target.checked)}
          className={inspectionCheckbox}
        />
        주민과 변경 일정 협의 후 최종 알림
      </label>
      <p className="text-xs text-[#64748b]">
        본인에게 최초 1회 배정할 수 있습니다. 일정 변경·알림 발송은 현재 API에서
        지원하지 않습니다. 저장된 확정 일정은 재조회 응답에 포함되지 않습니다.
      </p>
      {error && (
        <p role="alert" className="text-[13px] leading-[19px] text-[#a53632]">
          {error}
        </p>
      )}
      <div className="flex shrink-0 flex-col gap-[10px]">
        <button
          type="button"
          disabled={busy || a.inspectorUserId != null}
          onClick={save}
          className="h-[42px] rounded-md bg-[#234f73] text-sm font-bold leading-5 text-white"
        >
          배정·일정 저장
        </button>
        <Link
          to={`/inspection/${a.inspectionId}/results`}
          className="flex h-[42px] items-center justify-center rounded-md border border-[#c8d0d7] bg-white text-sm font-bold leading-5"
        >
          점검 결과 등록
        </Link>
      </div>
    </section>
  );
}
