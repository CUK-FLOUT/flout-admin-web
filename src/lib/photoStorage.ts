/**
 * Local-only photo persistence used by the inspection, construction and
 * infrastructure mock workflows. Keep the database names stable so existing
 * photos remain readable after a refactor.
 */
export type StoredPhoto = { id: string; name: string; src: string };

type PhotoWrite = { id: string; source: string };

export function createPhotoStore(databaseName: string) {
  let database: Promise<IDBDatabase> | undefined;

  function openDatabase(): Promise<IDBDatabase> {
    if (!database) {
      database = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1);

        request.onupgradeneeded = () => {
          request.result.createObjectStore("photos");
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }).catch((error: unknown) => {
        database = undefined;
        throw error;
      });
    }

    return database;
  }

  async function read(source: string): Promise<string> {
    if (!source.startsWith("idb:")) return source;

    const db = await openDatabase();

    return new Promise<string>((resolve, reject) => {
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

  async function writeMany(photos: readonly PhotoWrite[]): Promise<void> {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("photos", "readwrite");
      const store = transaction.objectStore("photos");

      photos.forEach(({ id, source }) => store.put(source, id));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  return { read, writeMany };
}

export async function uploadLocalPhotos(
  files: File[],
  idPrefix: string,
  writeMany: (photos: readonly PhotoWrite[]) => Promise<void>,
): Promise<StoredPhoto[]> {
  if (
    files.some(
      (file) =>
        !["image/jpeg", "image/png"].includes(file.type) ||
        file.size > 10 * 1024 * 1024,
    )
  ) {
    throw new Error("JPG 또는 PNG 사진을 파일당 10MB 이하로 첨부해 주세요.");
  }

  const sources = await Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () =>
            typeof reader.result === "string"
              ? resolve(reader.result)
              : reject(new Error("사진 읽기 실패"));
          reader.onerror = () => reject(new Error("사진을 읽을 수 없습니다."));
          reader.readAsDataURL(file);
        }),
    ),
  );

  const photos = files.map((file) => {
    const id = idPrefix + crypto.randomUUID();

    return { id, name: file.name, src: "idb:" + id };
  });

  await writeMany(
    photos.map((photo, index) => ({ id: photo.id, source: sources[index] })),
  );

  return photos;
}
