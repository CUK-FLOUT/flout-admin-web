import { createPhotoStore, uploadLocalPhotos } from "../../lib/photoStorage";
import type { InfrastructurePhoto } from "./types";

const photoStore = createPhotoStore("flout-infrastructure-photos");

export const readInfrastructurePhoto = photoStore.read;

export function uploadInfrastructurePhotos(files: File[]): Promise<InfrastructurePhoto[]> {
  return uploadLocalPhotos(files, "infrastructure-", photoStore.writeMany);
}
