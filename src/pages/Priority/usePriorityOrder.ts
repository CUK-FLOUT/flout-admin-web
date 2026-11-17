import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { PriorityOrderItem } from "../../api/priorityInspections";
import { getPriorityOrder, priorityError } from "../../api/priorityInspections";
import { commitPriorityOrder } from "./orderApi";
import { changePosition, normalizePriorityOrder } from "./priorityUtils";
import { toPriorityApplication } from "./apiMapping";
import type { PriorityApplication } from "./types";

type Options = {
  hasFilters: boolean;
  mutationRef: RefObject<boolean>;
  setBusy: (busy: boolean) => void;
  setError: (error: string) => void;
  onRefresh: () => void;
  onSaved: () => void;
};

function isApplicationId(id: number | undefined): id is number {
  return id !== undefined && Number.isSafeInteger(id) && id > 0;
}

function mapOrder(items: PriorityOrderItem[]) {
  return [...items]
    .sort(
      (a, b) =>
        a.selectionOrder - b.selectionOrder ||
        a.applicationId - b.applicationId,
    )
    .map(toPriorityApplication);
}

export function usePriorityOrder({
  hasFilters,
  mutationRef,
  setBusy,
  setError,
  onRefresh,
  onSaved,
}: Options) {
  const [eligible, setEligible] = useState<PriorityApplication[]>([]);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderReady, setOrderReady] = useState(false);
  const orderRequest = useRef(0);
  const modalOrder = normalizePriorityOrder(draftOrder, eligible);

  useEffect(
    () => () => {
      orderRequest.current += 1;
    },
    [],
  );

  function invalidateOrder() {
    orderRequest.current += 1;
    setOrderLoading(false);
  }

  function resetOrder() {
    invalidateOrder();
    setOrderReady(false);
    setEligible([]);
    setDraftOrder([]);
  }

  async function loadOrder() {
    const request = ++orderRequest.current;

    setOrderLoading(true);
    setOrderReady(false);
    setEligible([]);
    setDraftOrder([]);
    try {
      const items = await getPriorityOrder();

      if (request !== orderRequest.current) return;
      const rows = mapOrder(items);

      setEligible(rows);
      setDraftOrder(rows.map((a) => a.id));
      setOrderReady(true);
    } catch (cause) {
      if (request === orderRequest.current) setError(priorityError(cause));
    } finally {
      if (request === orderRequest.current) setOrderLoading(false);
    }
  }

  function moveOrder(id: string, delta: number) {
    if (!mutationRef.current && orderReady)
      setDraftOrder((order) =>
        changePosition(normalizePriorityOrder(order, eligible), id, delta),
      );
  }

  async function saveOrder() {
    if (mutationRef.current || !orderReady || orderLoading) return;
    if (hasFilters) {
      setError("선정 순서를 저장하려면 검색어와 필터를 초기화해주세요.");

      return;
    }

    const ids = modalOrder.map(
      (id) => eligible.find((a) => a.id === id)?.applicationId,
    );

    const expectedIds = eligible.map((a) => a.applicationId);

    if (
      ids.length !== eligible.length ||
      !ids.every(isApplicationId) ||
      !expectedIds.every(isApplicationId)
    ) {
      setError("전체 대상 목록을 다시 조회해 주세요.");

      return;
    }

    mutationRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await commitPriorityOrder(ids, expectedIds, hasFilters);

      if (!result.saved) {
        const rows = mapOrder(result.applications);

        setEligible(rows);
        setDraftOrder(rows.map((a) => a.id));
        setError(
          "지정 대상이 변경되어 저장하지 못했습니다. 최신 목록을 확인하고 다시 저장해 주세요.",
        );
        onRefresh();

        return;
      }

      await loadOrder();
      onRefresh();
      onSaved();
    } catch (cause) {
      setOrderReady(false);
      setError(priorityError(cause));
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }

  return {
    eligible,
    modalOrder,
    orderLoading,
    orderReady,
    loadOrder,
    moveOrder,
    saveOrder,
    invalidateOrder,
    resetOrder,
  };
}
