import { useState } from "react";
import type { ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { readInspections, inspectionStorageKey } from "../Inspection/mockData";
import type { InspectionApplication } from "../Inspection/mockData";
import { categories, resultsDialogKinds } from "./types";
import type {
  Category,
  RegionIssue,
  ResultContent,
  ResultRecord,
  ResultPhoto,
  ResultsDialogKind,
} from "./types";
import {
  readResultsState,
  resultsStorageKey,
  validatePublication,
  writeResultsState,
} from "./storage";
import { persistPhotoReferences } from "./photos";
import { createInitialRecord } from "./fixtures";

export default function useInspectionResultEditor(a: InspectionApplication) {
  const [params, setParams] = useSearchParams();
  const [record, setRecord] = useState<ResultRecord>(
    () =>
      readResultsState().records[a.id] ||
      createInitialRecord(a.resultPublished),
  );
  const [draft, setDraft] = useState(() => structuredClone(record.draft));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const editingPublished = !!record.published && params.get("mode") === "edit";
  const readOnly = !!record.published && !editingPublished;
  const content = readOnly ? record.published! : draft;
  const expanded = content.selected.length > 1;
  const dialog = resultsDialogKinds.includes(
    params.get("dialog") as ResultsDialogKind,
  )
    ? (params.get("dialog") as ResultsDialogKind)
    : null;

  function setDialog(kind: ResultsDialogKind | null) {
    const next = new URLSearchParams(params);

    if (kind) next.set("dialog", kind);
    else {
      const old = next.get("dialog");

      next.delete("dialog");
      next.delete("addressQuery");
      if (old === "published" || old === "republished") next.delete("mode");
    }

    setParams(next);
  }

  function update<K extends keyof ResultContent>(
    key: K,
    value: ResultContent[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function toggleCategory(category: Category) {
    const selected = content.selected.includes(category)
      ? content.selected.filter((c) => c !== category)
      : categories.filter(
          (c) => c === category || content.selected.includes(c),
        );

    update("selected", selected);
  }

  async function persist(publish: boolean) {
    if (busy) return;
    if (publish) {
      const problem = validatePublication(draft);

      if (problem) {
        setError(problem);

        return;
      }
    }

    setBusy(true);
    try {
      const savedDraft = await persistPhotoReferences(draft);
      const state = readResultsState();
      const next: ResultRecord = {
        draft: savedDraft,
        published: publish ? structuredClone(savedDraft) : record.published,
        savedAt: new Date().toISOString(),
      };
      const previousResults = localStorage.getItem(resultsStorageKey);

      writeResultsState({
        ...state,
        records: { ...state.records, [a.id]: next },
      });
      if (publish) {
        const inspections = readInspections().map((item) =>
          item.id === a.id
            ? { ...item, status: "완료", resultPublished: true }
            : item,
        );

        try {
          localStorage.setItem(
            inspectionStorageKey,
            JSON.stringify(inspections),
          );
        } catch (error) {
          if (previousResults === null)
            localStorage.removeItem(resultsStorageKey);
          else localStorage.setItem(resultsStorageKey, previousResults);
          throw error;
        }
      }

      setRecord(next);
      setDraft(structuredClone(savedDraft));
      setError("");
      setDialog(
        publish
          ? record.published
            ? "republished"
            : "published"
          : "draft-saved",
      );
    } catch {
      setError(
        "저장하지 못했습니다. 사진 용량이나 브라우저 저장 공간을 확인해 주세요. 입력 내용은 이 화면에 유지됩니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  function registerRegion(
    issue: Omit<RegionIssue, "id" | "applicationId" | "source" | "status">,
  ) {
    try {
      const state = readResultsState();
      const item: RegionIssue = {
        ...issue,
        id: `지역-${String(state.issues.length + 1).padStart(3, "0")}`,
        applicationId: a.id,
        source: "전문가 현장점검",
        status: "검토 대기",
      };

      writeResultsState({ ...state, issues: [...state.issues, item] });
      setError("");
      setDialog("region-saved");

      return true;
    } catch {
      return false;
    }
  }

  async function upload(
    event: ChangeEvent<HTMLInputElement>,
    category: Category | null = null,
  ) {
    const files = Array.from(event.target.files || []);

    event.target.value = "";
    if (!files.length) return;
    if (
      files.some(
        (file) =>
          !["image/jpeg", "image/png"].includes(file.type) ||
          file.size > 10 * 1024 * 1024,
      )
    ) {
      setError(
        "JPG 또는 PNG 파일만 첨부할 수 있습니다. 파일당 최대 용량은 10MB입니다.",
      );

      return;
    }

    setBusy(true);
    setError("");
    try {
      const photos = await Promise.all(
        files.map(
          (file) =>
            new Promise<ResultPhoto>((resolve, reject) => {
              const reader = new FileReader();

              reader.onerror = () => reject(new Error("read"));
              reader.onload = () => {
                const src = String(reader.result);
                const image = new Image();

                image.onerror = () => reject(new Error("image"));
                image.onload = () =>
                  resolve({
                    id: crypto.randomUUID(),
                    name: file.name,
                    src,
                    category,
                  });
                image.src = src;
              };

              reader.readAsDataURL(file);
            }),
        ),
      );

      setDraft((current) => ({
        ...current,
        photos: [
          ...current.photos.filter(
            (p) => category === null || p.category !== category,
          ),
          ...photos,
        ],
      }));
    } catch {
      setError(
        "사진을 불러오지 못했습니다. 올바른 이미지 파일인지 확인해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  return {
    params,
    setParams,
    draft,
    error,
    busy,
    editingPublished,
    readOnly,
    content,
    expanded,
    dialog,
    setDialog,
    update,
    toggleCategory,
    persist,
    registerRegion,
    upload,
  };
}
