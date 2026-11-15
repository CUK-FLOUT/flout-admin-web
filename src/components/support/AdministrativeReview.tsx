import type {
  ReviewDraft,
  SupportApplication,
} from "../../pages/Support/types";
import { supportInput, supportPrimary, supportSecondary } from "./styles";
import check from "../../assets/support/check.svg";

const checkLabels = [
  "신청자·주택 정보 확인",
  "전문가 점검 결과 확인",
  "사업 자격·필요서류 확인",
];

export default function AdministrativeReview({
  application: a,
  busy = false,
  draft,
  onChange,
  onApprove,
  onReject,
  onCheck,
}: {
  application: SupportApplication;
  busy?: boolean;
  draft: ReviewDraft;
  onChange: (draft: ReviewDraft) => void;
  onApprove: () => void;
  onReject: () => void;
  onCheck: () => void;
}) {
  const readOnly =
    busy ||
    (a.apiId
      ? !a.reviewLoaded || a.serverStatus !== "SUBMITTED"
      : a.status !== "검토 중");
  const owner = a.ownership === "소유자";

  if (owner)
    return (
      <section
        aria-labelledby="administrative-review-title"
        className="flex w-full min-w-0 flex-col gap-[6px] rounded-lg border border-[#c8d0d7] bg-white p-[15px]"
      >
        <h2
          id="administrative-review-title"
          className="text-base font-bold leading-6"
        >
          행정 검토 · {a.id}
        </h2>
        {checkLabels.map((label, i) => (
          <label
            key={label}
            className="flex min-h-[21px] items-center gap-2 text-sm leading-[21px]"
          >
            <span className="relative size-[18px] shrink-0">
              <input
                aria-label={label}
                type="checkbox"
                disabled={readOnly}
                checked={draft.checks[i]}
                onChange={(e) => {
                  const checks: ReviewDraft["checks"] = [...draft.checks];

                  checks[i] = e.target.checked;
                  onChange({ ...draft, checks });
                }}
                className="size-[18px] cursor-pointer appearance-none rounded border border-[#c8d0d7] checked:border-[#234f73] checked:bg-[#234f73] disabled:cursor-default"
              />
              {draft.checks[i] && (
                <img
                  src={check}
                  alt=""
                  width={12}
                  height={12}
                  className="pointer-events-none absolute top-[3px] left-[3px]"
                />
              )}
            </span>
            {label}
          </label>
        ))}
        <div className="h-px bg-[#c8d0d7]" />
        <dl className="flex flex-col gap-2">
          <dt className="text-sm font-bold leading-[21px]">
            임대인 동의 필요 여부
          </dt>
          <dd className={supportInput + " flex min-h-10 items-center py-2"}>
            {draft.consentRequired}
          </dd>
        </dl>
        <dl className="flex flex-col gap-2">
          <dt className="text-sm font-bold leading-[21px]">
            임대인 동의서 제출 여부
          </dt>
          <dd className={supportInput + " flex min-h-10 items-center py-2"}>
            {draft.consentSubmission}
          </dd>
        </dl>
        <p className="text-xs leading-[18px] text-[#64748b]">
          {draft.consentRequired === "불필요"
            ? "임대인 동의서 제출 대상이 아닙니다."
            : "동의서 제출 여부는 주민이 첨부한 자료를 기준으로 표시됩니다."}
        </p>
        <label className="flex flex-col gap-2 text-sm font-bold leading-[21px]">
          지원 범위
          <textarea
            aria-label="지원 범위"
            rows={1}
            readOnly={readOnly}
            value={draft.scope}
            onChange={(e) => onChange({ ...draft, scope: e.target.value })}
            placeholder="확정할 범위를 입력하세요"
            className={
              supportInput +
              " h-10 min-h-10 resize-y py-[8.5px] text-[14px]! leading-[21px]! font-normal"
            }
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-bold leading-[21px]">
          검토 메모 / 미승인 안내
          <textarea
            aria-label="검토 메모 / 미승인 안내"
            rows={1}
            readOnly={readOnly}
            value={draft.memo}
            onChange={(e) => onChange({ ...draft, memo: e.target.value })}
            placeholder="검토 결과를 입력하세요"
            className={
              supportInput +
              " h-10 min-h-10 resize-y py-[8.5px] text-[14px]! leading-[21px]! font-normal"
            }
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={readOnly}
            className={supportSecondary + " text-[#234f73]"}
          >
            지원 승인
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={readOnly}
            className={supportPrimary}
          >
            지원 미승인
          </button>
        </div>
        <p className="text-xs leading-[18px] text-[#64748b]">
          세입자는 임대인 동의서가 제출되어야 승인할 수 있습니다.
        </p>
        <label className="flex min-h-[21px] items-center gap-2 text-sm leading-[21px]">
          <input
            type="checkbox"
            disabled={!!a.apiId || readOnly}
            checked={draft.notify}
            onChange={(e) => onChange({ ...draft, notify: e.target.checked })}
            className="size-[18px] shrink-0 accent-[#234f73]"
          />
          승인·미승인 확정 시 주민에게 알림
        </label>
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={onCheck}
              className={supportSecondary}
            >
              검토 확인사항
            </button>
          </>
        )}
      </section>
    );

  return (
    <section
      aria-labelledby="administrative-review-title"
      className="w-full min-w-0 rounded-lg border-[0.75px] border-[#c8d0d7] bg-white px-[19.25px] pt-[17.25px] pb-[44px]"
    >
      <h2
        id="administrative-review-title"
        className="mb-4 flex h-[23px] items-center gap-3 text-lg font-bold leading-[23px]"
      >
        <span aria-hidden="true" className="text-[#234f73]">
          ✓
        </span>
        행정 검토 · {a.id}
      </h2>
      <div className="flex flex-col gap-3">
        {checkLabels.map((label, i) => (
          <label
            key={label}
            className="flex min-h-[18px] items-center gap-[10px] text-sm font-medium leading-[18px]"
          >
            <span className="relative size-[18px] shrink-0">
              <input
                aria-label={label}
                type="checkbox"
                disabled={readOnly}
                checked={draft.checks[i]}
                onChange={(e) => {
                  const checks: ReviewDraft["checks"] = [...draft.checks];

                  checks[i] = e.target.checked;
                  onChange({ ...draft, checks });
                }}
                className="size-[18px] cursor-pointer appearance-none rounded border border-[#c8d0d7] checked:border-[#234f73] checked:bg-[#234f73] disabled:cursor-default"
              />
              {draft.checks[i] && (
                <img
                  src={check}
                  alt=""
                  width={12}
                  height={12}
                  className="pointer-events-none absolute top-[3px] left-[3px]"
                />
              )}
            </span>
            {label}
          </label>
        ))}
      </div>
      <div className="mt-[14px] h-px bg-[#f4f5f6]" />
      <div className="mt-4 flex flex-col gap-4">
        <dl className="flex flex-col gap-2">
          <dt className="text-sm font-bold leading-[17px]">
            임대인 동의 필요 여부
          </dt>
          <dd className={supportInput + " flex min-h-10 items-center py-2"}>
            {draft.consentRequired}
          </dd>
        </dl>
        <dl className="flex flex-col gap-2">
          <dt className="text-sm font-bold leading-[17px]">
            임대인 동의서 제출 여부
          </dt>
          <dd className={supportInput + " flex min-h-10 items-center py-2"}>
            {draft.consentSubmission}
          </dd>
        </dl>
        {owner && (
          <p className="text-xs leading-[18px] text-[#64748b]">
            {draft.consentRequired === "불필요"
              ? "임대인 동의서 제출 대상이 아닙니다."
              : "동의서 제출 여부는 주민이 첨부한 자료를 기준으로 표시됩니다."}
          </p>
        )}
        <label className="flex flex-col gap-2 text-sm font-bold leading-[17px]">
          지원 범위
          <textarea
            aria-label="지원 범위"
            readOnly={readOnly}
            value={draft.scope}
            onChange={(e) => onChange({ ...draft, scope: e.target.value })}
            placeholder="확정할 범위를 입력하세요"
            className={supportInput + " min-h-[78px] resize-y py-3 font-normal"}
          />
        </label>
        {owner && (
          <label className="flex flex-col gap-2 text-sm font-bold leading-[17px]">
            검토 메모 / 미승인 안내
            <textarea
              aria-label="검토 메모 / 미승인 안내"
              readOnly={readOnly}
              value={draft.memo}
              onChange={(e) => onChange({ ...draft, memo: e.target.value })}
              placeholder="검토 결과를 입력하세요"
              className={
                supportInput + " min-h-[60px] resize-y py-3 font-normal"
              }
            />
          </label>
        )}
      </div>
      <label className="mt-6 flex min-h-[21px] items-center gap-[10px] text-sm leading-[21px]">
        <input
          type="checkbox"
          disabled={!!a.apiId || readOnly}
          checked={draft.notify}
          onChange={(e) => onChange({ ...draft, notify: e.target.checked })}
          className="size-[18px] shrink-0 accent-[#234f73]"
        />
        승인·미승인 확정 시 주민에게 알림
      </label>
      <div className="mt-[27px] grid grid-cols-2 gap-[7px] pl-[3px]">
        <button
          type="button"
          onClick={onApprove}
          disabled={readOnly}
          className={supportSecondary + " min-h-[38px] text-[#234f73]"}
        >
          지원 승인
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={readOnly}
          className={supportPrimary + " min-h-[38px]"}
        >
          지원 미승인
        </button>
      </div>
      {owner && !readOnly && (
        <div className="mt-3 flex flex-col gap-2">
          <button type="button" onClick={onCheck} className={supportSecondary}>
            검토 확인사항
          </button>
        </div>
      )}
    </section>
  );
}
