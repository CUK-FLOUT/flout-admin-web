import { useEffect, useRef, useState } from "react";
import type { PriorityApplication } from "../../pages/Priority/mockData";
import dragHandle from "../../assets/priority/order-drag-handle.svg";
import highDot from "../../assets/priority/risk-high.svg";
import warningDot from "../../assets/priority/risk-warning.svg";
import lowDot from "../../assets/priority/risk-low.svg";

const riskStyle = {
  높음: "border-[#a53632] bg-[#faefed] text-[#a53632]",
  주의: "border-[#865a16] bg-[#faf4e8] text-[#865a16]",
  낮음: "border-[#27654d] bg-[#edf5f0] text-[#27654d]",
};
const riskDots = { 높음: highDot, 주의: warningDot, 낮음: lowDot };

type Props = {
  applications: PriorityApplication[];
  busy?: boolean;
  loading?: boolean;
  ready?: boolean;
  error?: string;
  onRetry?: () => void;
  order: string[];
  onMove: (id: string, delta: number) => void;
  onCancel: () => void;
  onSave: () => void;
};

export default function PriorityOrderModal({
  applications,
  busy = false,
  loading = false,
  ready = true,
  error = "",
  onRetry,
  order,
  onMove,
  onCancel,
  onSave,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragging = useRef<string | null>(null);
  const lastDragY = useRef<number | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const pointerDrag = useRef<{
    id: string;
    pointerId: number;
  } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const byId = new Map(
    applications.map((application) => [application.id, application]),
  );
  const rows = order.flatMap((id) => {
    const application = byId.get(id);

    return application ? [application] : [];
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const scrollContainers = [
      document.documentElement,
      document.body,
      document.querySelector("main"),
    ].filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    );
    const previous = scrollContainers.map((element) => ({
      element,
      overflow: element.style.overflow,
      gutter: element.style.scrollbarGutter,
    }));

    scrollContainers.forEach((element) => {
      const hasScrollbar =
        element === document.documentElement
          ? window.innerWidth > element.clientWidth
          : element.offsetWidth > element.clientWidth;

      if (hasScrollbar) element.style.scrollbarGutter = "stable";
      element.style.overflow = "hidden";
    });
    dialog?.showModal();

    return () => {
      if (scrollFrame.current !== null)
        window.cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
      lastDragY.current = null;
      dragging.current = null;
      pointerDrag.current = null;
      if (dialog?.open) dialog.close();
      previous.forEach(({ element, overflow, gutter }) => {
        element.style.overflow = overflow;
        element.style.scrollbarGutter = gutter;
      });
      const focusTarget = opener?.isConnected
        ? opener
        : document.querySelector<HTMLElement>(
            "[data-priority-order-trigger]",
          ) ||
          document.querySelector<HTMLElement>(
            'form[aria-label="우선점검 검색 조건"] select',
          );

      if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });
    };
  }, []);

  function moveTo(id: string, targetId: string) {
    if (busy) return;
    const from = order.indexOf(id);
    const to = order.indexOf(targetId);

    if (from < 0 || to < 0 || from === to) return;
    const step = Math.sign(to - from);

    for (let position = from; position !== to; position += step)
      onMove(id, step);
    setAnnouncement(`${id} 신청을 ${to + 1}번째로 이동했습니다.`);
  }

  function scrollList(clientY: number) {
    const viewport = dialogRef.current?.querySelector<HTMLElement>(
      "[data-order-scroll]",
    );

    if (!viewport) return;
    const bounds = viewport.getBoundingClientRect();

    if (clientY < bounds.top + 40) viewport.scrollTop -= 24;
    else if (clientY > bounds.bottom - 40) viewport.scrollTop += 24;
  }

  function startDragScroll(clientY: number) {
    if (!Number.isFinite(clientY)) return;
    lastDragY.current = clientY;
    if (scrollFrame.current !== null) return;
    const tick = () => {
      scrollFrame.current = null;
      if (
        (!dragging.current && !pointerDrag.current) ||
        lastDragY.current === null
      )
        return;
      scrollList(lastDragY.current);
      scrollFrame.current = window.requestAnimationFrame(tick);
    };

    scrollFrame.current = window.requestAnimationFrame(tick);
  }

  function stopDrag() {
    setDropTarget(null);
    if (scrollFrame.current !== null)
      window.cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = null;
    lastDragY.current = null;
    dragging.current = null;
    const pointer = pointerDrag.current;

    pointerDrag.current = null;
    if (pointer && dialogRef.current?.hasPointerCapture(pointer.pointerId))
      dialogRef.current.releasePointerCapture(pointer.pointerId);
  }

  return (
    <dialog
      ref={dialogRef}
      onPointerMove={(event) => {
        const drag = pointerDrag.current;

        if (!drag || drag.pointerId !== event.pointerId) return;
        startDragScroll(event.clientY);
        const target = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLElement>("[data-order-id]")?.dataset.orderId;

        setDropTarget(target && byId.has(target) ? target : null);
        if (target && target !== drag.id && byId.has(target))
          moveTo(drag.id, target);
      }}
      onPointerUp={(event) => {
        if (pointerDrag.current?.pointerId === event.pointerId) stopDrag();
      }}
      onPointerCancel={(event) => {
        if (pointerDrag.current?.pointerId === event.pointerId) stopDrag();
      }}
      onLostPointerCapture={(event) => {
        if (
          event.target === event.currentTarget &&
          pointerDrag.current?.pointerId === event.pointerId
        )
          stopDrag();
      }}
      aria-labelledby="priority-order-title"
      aria-describedby="priority-order-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();

        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          if (!busy) onCancel();
      }}
      className="fixed inset-0 m-auto h-[470px] max-h-[calc(100dvh_-_32px)] w-[calc(100vw_-_32px)] max-w-[900px] overflow-y-auto rounded-xl border-0 bg-white px-7 pb-6 pt-7 font-[family-name:Pretendard,sans-serif] text-[#202b36] shadow-none backdrop:bg-black/[.36] open:flex open:flex-col open:gap-5 [&_button]:cursor-pointer [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#234f73]"
    >
      <header className="flex h-8 shrink-0 items-center justify-between">
        <h2
          id="priority-order-title"
          className="h-6 text-2xl font-bold leading-9"
        >
          선정 순서 변경
        </h2>
        <button
          type="button"
          aria-label="선정 순서 변경 닫기"
          onClick={onCancel}
          disabled={busy}
          className="flex h-6 w-7 shrink-0 items-center justify-center text-[28px] font-medium leading-[22px]"
        >
          ×
        </button>
      </header>
      <p
        id="priority-order-description"
        className="min-h-6 shrink-0 text-[15px] font-medium leading-[22px]"
      >
        지정된 신청을 드래그해 점검 우선순서를 변경해주세요.
      </p>
      <p className="min-h-6 shrink-0 text-sm font-medium leading-[22px]">
        {busy || loading
          ? "처리 중입니다."
          : `우선점검 지정 대상 ${rows.length}건`}
        {error && <span role="alert"> · {error}</span>}
        {!ready && !busy && !loading && (
          <button type="button" onClick={onRetry}>
            {" "}
            전체 대상 다시 조회
          </button>
        )}
      </p>
      <p className="sr-only" id="priority-order-keyboard">
        정렬 버튼에 초점을 맞춘 뒤 위아래 방향키로 순서를 변경할 수 있습니다.
      </p>
      <div
        data-order-scroll
        onDragOver={(event) => {
          if (!dragging.current) return;
          event.preventDefault();
          startDragScroll(event.clientY);
        }}
        tabIndex={0}
        aria-label="선정 순서 목록"
        className="min-h-0 flex-1 overflow-auto overscroll-contain [@media(max-height:320px)]:min-h-[100px]"
      >
        <table className="w-full min-w-[820px] table-fixed border-separate border-spacing-0 text-center text-[13px] font-normal leading-5 [&_td]:border-b [&_td]:border-[#c8d0d7]">
          <colgroup>
            {[48, 110, 90, 110, 260, 100, 126].map((width, index) => (
              <col key={index} style={{ width: `${(width / 844) * 100}%` }} />
            ))}
          </colgroup>
          <thead
            onDragOver={(event) => {
              if (!dragging.current) return;
              event.stopPropagation();
              event.dataTransfer.dropEffect = "none";
              setDropTarget(null);
              startDragScroll(event.clientY);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              stopDrag();
            }}
            className="sticky top-0 z-10 bg-white text-xs font-normal leading-[18px]"
          >
            <tr className="h-11">
              {[
                "정렬",
                "접수번호",
                "취약도",
                "침수 경험",
                "주민 요청 사유",
                "인근 신청",
                "우선점검",
              ].map((label) => (
                <th scope="col" key={label} className="p-0 font-normal">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((application, index) => (
              <tr
                key={application.id}
                data-order-id={application.id}
                className={`h-14 ${dropTarget === application.id ? "bg-[#eef3f7]" : "bg-white"}`}
                onDragOver={(event) => {
                  if (!dragging.current) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTarget(application.id);
                  startDragScroll(event.clientY);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragging.current)
                    moveTo(dragging.current, application.id);
                  stopDrag();
                }}
              >
                <td className="p-0">
                  <button
                    type="button"
                    draggable={!busy && !loading && ready}
                    disabled={busy || loading || !ready}
                    aria-label={`${application.id} 순서 변경`}
                    aria-describedby="priority-order-keyboard"
                    className="mx-auto flex size-9 touch-none items-center justify-center !cursor-grab active:!cursor-grabbing"
                    onDragStart={(event) => {
                      if (busy || loading || !ready) {
                        event.preventDefault();

                        return;
                      }

                      dragging.current = application.id;
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", application.id);
                      startDragScroll(event.clientY);
                    }}
                    onDragEnd={() => {
                      stopDrag();
                    }}
                    onKeyDown={(event) => {
                      if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
                      event.preventDefault();
                      const to = index + (event.key === "ArrowUp" ? -1 : 1);

                      if (to >= 0 && to < rows.length)
                        moveTo(application.id, rows[to].id);
                    }}
                    onPointerDown={(event) => {
                      if (
                        busy ||
                        loading ||
                        !ready ||
                        event.pointerType === "mouse"
                      )
                        return;
                      pointerDrag.current = {
                        id: application.id,
                        pointerId: event.pointerId,
                      };
                      event.preventDefault();
                      dialogRef.current?.setPointerCapture(event.pointerId);
                      startDragScroll(event.clientY);
                    }}
                  >
                    <img
                      src={dragHandle}
                      draggable={false}
                      alt=""
                      width={18}
                      height={18}
                    />
                  </button>
                </td>
                <td className="p-0">{application.id}</td>
                <td className="p-0">
                  <span
                    className={`inline-flex items-center gap-[5px] rounded-lg border px-[9px] py-1 font-bold ${riskStyle[application.risk]}`}
                  >
                    <img
                      src={riskDots[application.risk]}
                      alt=""
                      width={7}
                      height={7}
                    />
                    {application.risk}
                  </span>
                </td>
                <td className="p-0">{application.floodExperience}</td>
                <td className="p-0">
                  <span
                    className="block truncate px-2"
                    title={application.reason}
                  >
                    {application.reason}
                  </span>
                </td>
                <td className="p-0">{application.nearby}건</td>
                <td className="p-0">
                  <span className="inline-flex h-7 w-[58px] items-center justify-center rounded-lg border border-[#a53632] bg-[#faefed] text-[#a53632]">
                    지정
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="py-7 text-center text-sm">
            순서를 변경할 지정 대상이 없습니다.
          </p>
        )}
      </div>
      <footer className="flex h-[46px] shrink-0 justify-end gap-[10px]">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-[46px] w-[100px] rounded-md border border-[#c8d0d7] bg-white text-[15px] font-medium leading-[21px] tracking-[-.09px]"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={busy || loading || !ready || !rows.length}
          className="h-[46px] w-40 rounded-[6.364px] bg-[#234f73] text-[15px] font-medium leading-[21px] tracking-[-.09px] text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          선정 순서 저장
        </button>
      </footer>
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </dialog>
  );
}
