import { createPhotoStore } from "../../lib/photoStorage";
import type { ResultContent } from "./types";

const photoStore = createPhotoStore("flout-inspection-photos");

export const readPhoto = photoStore.read;

export async function persistPhotoReferences(
  content: ResultContent,
): Promise<ResultContent> {
  const photos = await Promise.all(
    content.photos.map(async (photo) => {
      if (!photo.src.startsWith("data:")) return photo;

      await photoStore.writeMany([{ id: photo.id, source: photo.src }]);

      return { ...photo, src: `idb:${photo.id}` };
    }),
  );

  return { ...content, photos };
}
