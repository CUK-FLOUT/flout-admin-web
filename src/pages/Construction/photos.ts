import { createPhotoStore, uploadLocalPhotos } from "../../lib/photoStorage";
import type { ConstructionPhoto } from "./types";

const photoStore = createPhotoStore("flout-construction-photos");

export const readConstructionPhoto = photoStore.read;

export function uploadConstructionPhotos(files: File[]): Promise<ConstructionPhoto[]> {
  return uploadLocalPhotos(files, "construction-", photoStore.writeMany);
}
