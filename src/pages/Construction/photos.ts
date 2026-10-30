import type { ConstructionPhoto } from "./types";
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("flout-construction-photos", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(error => {database = undefined; throw error;});
  return database;
}
export async function readConstructionPhoto(source: string): Promise<string> {
  if (!source.startsWith("idb:")) return source;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction("photos", "readonly").objectStore("photos").get(source.slice(4));
    request.onsuccess = () => typeof request.result === "string" ? resolve(request.result) : reject(new Error("사진 없음"));
    request.onerror = () => reject(request.error);
  });
}
export async function uploadConstructionPhotos(files: File[]): Promise<ConstructionPhoto[]> {
  if (files.some(file => !["image/jpeg", "image/png"].includes(file.type) || file.size > 10 * 1024 * 1024))
    throw new Error("JPG 또는 PNG 사진을 파일당 10MB 이하로 첨부해 주세요.");
  const sources = await Promise.all(files.map(file => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("사진 읽기 실패"));
    reader.onerror = () => reject(new Error("사진을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  })));
  const photos = files.map(file => {const id = "construction-" + crypto.randomUUID(); return {id, name: file.name, src: "idb:" + id};});
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    photos.forEach((photo, index) => tx.objectStore("photos").put(sources[index], photo.id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return photos;
}
