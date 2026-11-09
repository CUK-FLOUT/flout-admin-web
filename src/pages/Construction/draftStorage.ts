import { getSession } from "../../auth/session";
import type { InstallationDraft } from "./types";

type SavedDraft = Omit<InstallationDraft, "photos"> & {
  photos: { id: string; name: string; file: File }[];
};
let database: Promise<IDBDatabase> | undefined;
const writes = new Map<string, Promise<void>>();

function key(id: string) {
  const user = getSession()?.userId;

  if (!user) throw new Error("초안을 복원하려면 운영자 인증이 필요합니다.");

  return `${user}:${id}`;
}

function open() {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("flout-construction-drafts", 1);

      request.onupgradeneeded = () =>
        request.result.createObjectStore("drafts");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((cause: unknown) => {
      database = undefined;
      throw cause;
    });
  }

  return database;
}

export async function readConstructionDraft(
  id: string,
): Promise<SavedDraft | null> {
  const idKey = key(id);

  await writes.get(idKey);
  const db = await open();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction("drafts", "readonly")
      .objectStore("drafts")
      .get(idKey);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function writeConstructionDraft(
  id: string,
  draft: InstallationDraft | null,
) {
  const idKey = key(id);
  const saved: SavedDraft | null = draft
    ? {
        ...draft,
        photos: draft.photos.flatMap((photo) =>
          photo.file
            ? [{ id: photo.id, name: photo.name, file: photo.file }]
            : [],
        ),
      }
    : null;
  const pending = (writes.get(idKey) || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const db = await open();

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("drafts", "readwrite");
        const store = transaction.objectStore("drafts");

        if (saved) store.put(saved, idKey);
        else store.delete(idKey);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    });

  writes.set(idKey, pending);
  void pending
    .finally(() => {
      if (writes.get(idKey) === pending) writes.delete(idKey);
    })
    .catch(() => {});

  return pending;
}
