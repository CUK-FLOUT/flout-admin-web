import { useEffect, useRef, useState } from "react";
import {
  constructionError,
  getConstructionDetail,
  getConstructions,
} from "../../api/constructions";
import type {
  ConstructionListStatus,
  ConstructionPage,
} from "../../api/constructions";
import { constructionDetailRecord, constructionListRecord } from "./apiMapping";
import type { ConstructionRecord } from "./types";

type Query = {
  keyword: string;
  page: number;
  status?: ConstructionListStatus;
  selectedId?: string | null;
};
export function useConstructionData({
  keyword,
  page,
  status,
  selectedId,
}: Query) {
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const noteDrafts = useRef(new Map<string, string>());
  const key = JSON.stringify([keyword, page, status, revision]);
  const [list, setList] = useState<{
    key: string;
    data?: ConstructionPage;
    error?: string;
  }>({ key: "" });
  const records =
    list.key === key
      ? (list.data?.constructions || []).map(constructionListRecord)
      : [];
  const id = selectedId == null ? records[0]?.id : selectedId;
  const detailKey = JSON.stringify([id, revision]);
  const [detail, setDetail] = useState<{
    key: string;
    record?: ConstructionRecord;
    error?: string;
  }>({ key: "" });

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getConstructions(keyword, page, status, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setList({ key, data });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setList({ key, error: constructionError(cause) });
      });

    return () => controller.abort();
  }, [keyword, page, status, key]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    void getConstructionDetail(Number(id), controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setDetail({ key: detailKey, record: constructionDetailRecord(data) });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setDetail({ key: detailKey, error: constructionError(cause) });
      });

    return () => controller.abort();
  }, [id, detailKey]);

  function refresh() {
    if (mounted.current) setRevision((value) => value + 1);
  }

  return {
    records,
    noteDrafts,
    selected: detail.key === detailKey ? detail.record : undefined,
    error:
      error ||
      (list.key === key ? list.error : "") ||
      (detail.key === detailKey ? detail.error : "") ||
      "",
    setError,
    refresh,
    revision,
    listLoading: list.key !== key,
    detailLoading: !!id && detail.key !== detailKey,
    totalElements: list.key === key ? list.data?.totalElements || 0 : 0,
    totalPages: list.key === key ? list.data?.totalPages || 0 : 0,
  };
}
