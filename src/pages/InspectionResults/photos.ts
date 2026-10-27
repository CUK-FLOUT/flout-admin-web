import type { ResultContent } from "./types";
let database: Promise<IDBDatabase> | undefined;
function openPhotos() {
  if (!database)
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("flout-inspection-photos", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("photos");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      database = undefined;
      throw error;
    });
  return database;
}
async function writePhoto(id: string, source: string) {
  const db = await openPhotos();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put(source, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function readPhoto(source: string): Promise<string> {
  if (!source.startsWith("idb:")) return source;
  const db = await openPhotos();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("photos", "readonly")
      .objectStore("photos")
      .get(source.slice(4));
    request.onsuccess = () =>
      typeof request.result === "string"
        ? resolve(request.result)
        : reject(new Error("사진 없음"));
    request.onerror = () => reject(request.error);
  });
}

export async function persistPhotoReferences(
  content: ResultContent,
): Promise<ResultContent> {
  const photos = await Promise.all(
    content.photos.map(async (photo) => {
      if (!photo.src.startsWith("data:")) return photo;
      await writePhoto(photo.id, photo.src);
      return { ...photo, src: `idb:${photo.id}` };
    }),
  );
  return { ...content, photos };
}
