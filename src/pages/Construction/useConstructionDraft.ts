import { useEffect, useRef, useState } from "react";
import { constructionError } from "../../api/constructions";
import { readConstructionDraft, writeConstructionDraft } from "./draftStorage";
import type { ConstructionRecord, InstallationDraft } from "./types";

export function mergeConstructionDraft(
  record: ConstructionRecord,
  draft: InstallationDraft,
): InstallationDraft {
  if (record.status === "전체 완료") return structuredClone(record.draft);

  return {
    ...draft,
    ...(record.scheduleEditable === false
      ? { date: record.date, time: record.time }
      : {}),
    photos: [
      ...record.draft.photos,
      ...draft.photos.filter((photo) => photo.file),
    ],
  };
}

export function useConstructionDraft(
  record: ConstructionRecord | undefined,
  onError: (message: string) => void,
) {
  const [state, setState] = useState({
    record,
    draft: record ? structuredClone(record.draft) : null,
    ready: false,
  });
  const photoUrls = useRef(new Set<string>());

  if (record && record !== state.record) {
    setState({
      ...state,
      record,
      draft: state.draft
        ? record.draft === state.record?.draft
          ? state.draft
          : mergeConstructionDraft(record, state.draft)
        : structuredClone(record.draft),
    });
  }

  const id = record?.id;

  useEffect(() => {
    if (!id) return;
    let active = true;
    const urls = photoUrls.current;

    void readConstructionDraft(id)
      .then((saved) => {
        if (!active) return;
        const photos = (saved?.photos || []).map((photo) => {
          const src = URL.createObjectURL(photo.file);

          urls.add(src);

          return { ...photo, src };
        });

        setState((current) => {
          if (!current.record) return current;
          if (!saved || current.record.status === "전체 완료")
            return { ...current, ready: true };

          return {
            ...current,
            ready: true,
            draft: mergeConstructionDraft(current.record, { ...saved, photos }),
          };
        });
      })
      .catch((cause) => {
        if (active)
          onError(
            "시공 초안을 복원하지 못했습니다. " + constructionError(cause),
          );
      });

    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, [id, onError]);

  useEffect(() => {
    if (!id || !state.ready || !state.draft) return;
    let active = true;

    void writeConstructionDraft(
      id,
      record?.status === "전체 완료" ? null : state.draft,
    ).catch((cause) => {
      if (active)
        onError(
          "시공 초안을 기기에 저장하지 못했습니다. " + constructionError(cause),
        );
    });

    return () => {
      active = false;
    };
  }, [id, state.ready, state.draft, record?.status, onError]);

  function setDraft(
    update:
      | InstallationDraft
      | null
      | ((draft: InstallationDraft | null) => InstallationDraft | null),
  ) {
    setState((current) => ({
      ...current,
      draft: typeof update === "function" ? update(current.draft) : update,
    }));
  }

  return {
    draft: state.draft,
    setDraft,
    restoring: !!id && !state.ready,
    photoUrls,
  };
}
