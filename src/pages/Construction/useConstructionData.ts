import { useEffect, useState } from "react";
import {
  assertCurrentRevision,
  constructionStorageKey,
  enrollConstruction,
  readConstructionRecords,
  writeConstructionRecords,
} from "./model";
import type { ConstructionRecord } from "./types";

export function useConstructionData() {
  const [records, setRecords] = useState(readConstructionRecords);
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === constructionStorageKey || event.key === null)
        setRecords(readConstructionRecords());
    };

    window.addEventListener("storage", sync);

    return () => window.removeEventListener("storage", sync);
  }, []);
  function commit(
    id: string,
    revision: number,
    update: (record: ConstructionRecord) => ConstructionRecord,
  ) {
    try {
      const latest = readConstructionRecords(),
        original = latest.find((a) => a.id === id);

      if (!original) throw new Error("시공 신청 정보를 찾을 수 없습니다.");
      assertCurrentRevision(original, revision);
      const updated = update(original);
      const next = latest.map((a) => (a.id === id ? updated : a));

      writeConstructionRecords(next);
      setRecords(next);
      setError("");

      return updated;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "저장하지 못했습니다. 다시 시도해 주세요.",
      );

      return null;
    }
  }

  function register(id: string) {
    try {
      const next = enrollConstruction(readConstructionRecords(), id);

      writeConstructionRecords(next);
      setRecords(next);
      setError("");

      return next.find((a) => a.id === id)!;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "등록하지 못했습니다.");

      return null;
    }
  }

  return { records, error, setError, commit, register };
}
