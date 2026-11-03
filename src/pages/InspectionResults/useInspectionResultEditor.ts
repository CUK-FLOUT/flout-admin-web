import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import type { InspectionApplication } from "../Inspection/mockData";
import { getSessionGeneration } from "../../auth/session";
import {
  inspectionError,
  publishInspectionResult,
  saveInspectionDraft,
  uploadInspectionPhotos,
} from "../../api/inspections";
import {
  emptyResultContent,
  resultRequest,
  validateResult,
} from "./apiContent";
import { categories, resultsDialogKinds } from "./types";
import type { Category, ResultContent, ResultsDialogKind } from "./types";

const sessionDrafts = new Map<
  number,
  {
    generation: number;
    content: ResultContent;
    published: boolean;
    acknowledged: boolean;
  }
>();

export default function useInspectionResultEditor(a: InspectionApplication) {
  const [params, setParams] = useSearchParams();
  const id = a.inspectionId!;
  const generation = getSessionGeneration();
  const cached = sessionDrafts.get(id);
  const validCache = cached?.generation === generation ? cached : undefined;
  const [draft, setDraft] = useState<ResultContent>(() =>
    validCache ? structuredClone(validCache.content) : emptyResultContent(),
  );
  const [readOnly, setReadOnly] = useState(validCache?.published || false);
  const acknowledged = useRef(validCache?.acknowledged || false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const active = useRef(true);
  const editingPublished = false;
  const content = draft;
  const expanded = content.selected.length > 1;
  const requestedDialog = params.get("dialog") as ResultsDialogKind;
  const dialog =
    resultsDialogKinds.includes(requestedDialog) &&
    ["actions", "draft-saved", "published"].includes(requestedDialog)
      ? requestedDialog
      : null;

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    sessionDrafts.set(id, {
      generation,
      content: structuredClone(draft),
      published: readOnly,
      acknowledged: acknowledged.current,
    });
    for (const [key, value] of sessionDrafts)
      if (value.generation !== generation) sessionDrafts.delete(key);
  }, [id, generation, draft, readOnly]);

  function setDialog(kind: ResultsDialogKind | null) {
    const next = new URLSearchParams(params);

    if (kind) next.set("dialog", kind);
    else next.delete("dialog");
    setParams(next);
  }

  function update<K extends keyof ResultContent>(
    key: K,
    value: ResultContent[K],
  ) {
    if (inFlight.current || readOnly) return;
    if (key === "photos") {
      setError(
        "사진 삭제 API는 이번 범위에 포함되지 않아 업로드한 사진을 삭제할 수 없습니다.",
      );

      return;
    }

    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function toggleCategory(category: Category) {
    update(
      "selected",
      content.selected.includes(category)
        ? content.selected.filter((c) => c !== category)
        : categories.filter(
            (c) => c === category || content.selected.includes(c),
          ),
    );
  }

  async function persist(publish: boolean) {
    if (inFlight.current || readOnly) return;
    const problem = validateResult(draft, publish);

    if (problem) {
      setError(problem);

      return;
    }

    if (publish && a.status !== "완료") {
      setError("현장점검 관리에서 점검 상태를 완료로 저장한 후 공개해 주세요.");

      return;
    }

    if (
      !acknowledged.current &&
      !window.confirm(
        "결과 조회 API가 아직 연결되지 않아 기존 서버 초안을 불러올 수 없습니다. 현재 입력 내용 전체로 서버 초안을 교체할까요? 기존 사진은 유지됩니다.",
      )
    )
      return;
    acknowledged.current = true;
    inFlight.current = true;
    setBusy(true);
    try {
      if (publish) await publishInspectionResult(id, resultRequest(draft));
      else await saveInspectionDraft(id, resultRequest(draft));
      if (generation !== getSessionGeneration()) return;
      sessionDrafts.set(id, {
        generation,
        content: structuredClone(draft),
        published: publish,
        acknowledged: true,
      });
      if (!active.current) return;
      setReadOnly(publish);
      setError("");
      setDialog(publish ? "published" : "draft-saved");
    } catch (error) {
      if (active.current) setError(inspectionError(error));
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  }

  function registerRegion() {
    setError("지역·공공문제 등록 API는 수정 완료 후 별도로 연결할 예정입니다.");

    return false;
  }

  async function upload(
    event: ChangeEvent<HTMLInputElement>,
    category: Category | null = null,
  ) {
    const files = Array.from(event.target.files || []);

    event.target.value = "";
    if (!files.length || inFlight.current || readOnly) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await uploadInspectionPhotos(id, files);
      const photos = response.photos.map((photo) => ({
        id: String(photo.photoId),
        name: photo.fileName,
        src: photo.url,
        category,
      }));
      const next = { ...draft, photos: [...draft.photos, ...photos] };

      if (generation !== getSessionGeneration()) return;
      sessionDrafts.set(id, {
        generation,
        content: structuredClone(next),
        published: false,
        acknowledged: acknowledged.current,
      });
      if (active.current) setDraft(next);
    } catch (error) {
      if (active.current) setError(inspectionError(error));
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
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
