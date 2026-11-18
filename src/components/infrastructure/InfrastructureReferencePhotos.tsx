import { useState } from "react";
import type { InfrastructurePhoto } from "../../pages/Infrastructure/types";
import InfrastructureDialog from "./InfrastructureDialog";
import InfrastructureImage from "./InfrastructureImage";
import { infrastructureSecondary } from "./styles";

export default function InfrastructureReferencePhotos({
  photos,
}: {
  photos: InfrastructurePhoto[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 임시 URL이 갱신되면 새 주소를 사용하도록 사진 객체 대신 ID만 보관한다.
  const selected = photos.find((photo) => photo.id === selectedId);

  // 제거된 사진이 나중에 다시 나타나도 이전 선택으로 미리보기가 열리지 않게 한다.
  if (selectedId !== null && !selected) setSelectedId(null);

  function closePhoto() {
    setSelectedId(null);
  }

  return (
    <>
      <div className="mt-[18px] flex gap-4 overflow-x-auto">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            aria-label={`${photo.name} 크게 보기 (사진 ${index + 1}/${photos.length})`}
            onClick={() => setSelectedId(photo.id)}
            className="min-w-[180px] flex-1 cursor-pointer overflow-hidden rounded-lg border border-[#c8d0d7] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#234f73]"
          >
            <InfrastructureImage
              source={photo.src}
              alt={photo.name}
              className="h-[105px] w-full object-cover"
            />
          </button>
        ))}
        {!photos.length && (
          <p className="flex h-[140px] w-full items-center justify-center rounded-md bg-[#f4f5f6] text-sm text-[#596672]">
            등록된 현장 자료가 없습니다.
          </p>
        )}
      </div>
      {selected && (
        <InfrastructureDialog
          title="현장사진 크게 보기"
          width="max-w-5xl"
          height=""
          onClose={closePhoto}
        >
          <InfrastructureImage
            source={selected.src}
            alt={selected.name}
            className="max-h-[70dvh] w-full object-contain"
          />
          <button
            type="button"
            onClick={closePhoto}
            className={infrastructureSecondary + " h-11"}
          >
            닫기
          </button>
        </InfrastructureDialog>
      )}
    </>
  );
}
