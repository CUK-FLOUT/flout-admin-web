import type { PriorityApplication } from "../../pages/Priority/mockData";
import PriorityDialog from "./PriorityDialog";

const primary =
  "min-h-11 rounded-md bg-[#234f73] px-4 text-sm font-bold text-white hover:bg-[#183b58] disabled:cursor-not-allowed disabled:bg-[#eef3f7] disabled:text-[#94a3b8]";

const secondary =
  "min-h-11 rounded-md border border-[#234f73] bg-white px-4 text-sm font-bold text-[#234f73] hover:bg-[#eef3f7] disabled:cursor-not-allowed disabled:border-[#cbd5e1] disabled:bg-[#f1f5f9] disabled:text-[#94a3b8]";

const modalKinds = ["designate", "designated", "saved", "reorder"];

type Props = {
  dialog: string;
  selected?: PriorityApplication;
  eligible: PriorityApplication[];
  modalOrder: string[];
  onClose: () => void;
  onDesignate: () => void;
  onSaveOrder: () => void;
  onMove: (id: string, delta: number) => void;
  onCancelReorder: () => void;
};

export default function PriorityModals({
  dialog,
  selected,
  eligible,
  modalOrder,
  onClose,
  onDesignate,
  onSaveOrder,
  onMove,
  onCancelReorder,
}: Props) {
  if (!modalKinds.includes(dialog)) return null;

  return (
    <PriorityDialog
      key={dialog}
      wide={dialog === "reorder"}
      title={
        dialog === "designate"
          ? "우선점검 대상으로 지정할까요?"
          : dialog === "designated"
            ? "우선점검 대상으로 지정했습니다."
            : dialog === "saved"
              ? "선정 순서를 저장했습니다."
              : "지정된 우선점검 대상의 순서 변경"
      }
      onClose={onClose}
    >
      {dialog === "designate" && (
        <>
          <p className="mt-2 text-sm leading-[21px]">
            {selected
              ? `${selected.id} · ${selected.resident}님의 신청`
              : "선택된 신청이 없습니다."}
            <br />
            지정 후 현장점검 담당자와 방문 일정을 배정할 수 있습니다.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className={secondary}
            >
              취소
            </button>
            <button
              type="button"
              onClick={onDesignate}
              disabled={!selected || selected.designated}
              className={primary}
            >
              대상 지정
            </button>
          </div>
        </>
      )}
      {dialog === "designated" && (
        <>
          <p className="mt-2 text-sm leading-[21px] text-[#64748b]">
            점검 담당자와 방문 일정은 현장점검 관리에서 별도로 배정합니다.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex">
              <dt className="w-32 text-[#64748b]">접수번호</dt>
              <dd>
                {selected?.id} · {selected?.resident}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-[#64748b]">우선점검</dt>
              <dd>지정</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onClose}
            className={`${primary} mt-4 w-full`}
          >
            확인
          </button>
        </>
      )}
      {dialog === "saved" && (
        <>
          <p className="mt-2 text-sm leading-[21px]">
            지정된 대상의 점검 순서를 변경합니다.
          </p>
          <button
            type="button"
            onClick={onClose}
            className={`${primary} mt-3 w-full`}
          >
            확인
          </button>
        </>
      )}
      {dialog === "reorder" && (
        <>
          <p className="mb-3 mt-2 text-[13px] leading-5 text-[#64748b]">
            지정된 미배정 신청만 표시합니다. 미지정·배정 완료 신청은
            제외됩니다.
          </p>
          <ol className="max-h-[50dvh] space-y-3 overflow-auto">
            {modalOrder.map((id, i) => {
              const a = eligible.find((a) => a.id === id)!;

              return (
                <li
                  key={id}
                  className="flex min-h-12 items-center gap-2 bg-[#f1f5f9] p-2 text-sm font-bold"
                >
                  <span className="min-w-0 flex-1">
                    {i + 1} · {id} · {a.address}
                  </span>
                  <button
                    type="button"
                    disabled={i === 0}
                    aria-label={`${id} 위로`}
                    onClick={() => onMove(id, -1)}
                    className={`${secondary} min-h-10 w-20`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === modalOrder.length - 1}
                    aria-label={`${id} 아래로`}
                    onClick={() => onMove(id, 1)}
                    className={`${secondary} min-h-10 w-20`}
                  >
                    ↓
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onCancelReorder}
              className={`${secondary} w-36`}
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSaveOrder}
              className={`${primary} w-36`}
            >
              순서 저장
            </button>
          </div>
        </>
      )}
    </PriorityDialog>
  );
}
