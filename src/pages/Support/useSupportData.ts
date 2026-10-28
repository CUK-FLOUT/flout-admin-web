import { useEffect, useState } from "react";
import type { SupportApplication } from "./types";
import { readSupportApplications, supportStorageKey, writeSupportApplications } from "./model";
export function useSupportData() {
  const [applications, setApplications] = useState(readSupportApplications);
  const [error, setError] = useState("");
  useEffect(() => {
    const update = (event: StorageEvent) => { if (event.key === supportStorageKey || event.key === null) setApplications(readSupportApplications()); };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  function updateApplication(id: string, update: (application: SupportApplication) => SupportApplication) {
    try {
      const latest = readSupportApplications();
      const application = latest.find(a => a.id === id);
      if (!application) throw new Error("신청 정보를 찾을 수 없습니다.");
      const next = latest.map(a => a.id === id ? update(a) : a);
      writeSupportApplications(next);
      setApplications(next);
      setError("");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "검토 내용을 저장하지 못했습니다. 다시 시도해 주세요.");
      return false;
    }
  }
  return { applications, error, updateApplication };
}
