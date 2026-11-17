import { useEffect, useState } from "react";

type Props = {
  source: string;
  alt: string;
  className: string;
  readPhoto: (source: string) => Promise<string>;
  placeholderTextClassName: string;
};

type ResolvedPhoto = {
  source: string;
  url: string;
  failed: boolean;
};

// 사진 경로가 바뀐 첫 렌더에서도 이전 사진이 보이지 않도록 조회 결과의 경로를 함께 확인한다.
export default function StoredImage({
  source,
  alt,
  className,
  readPhoto,
  placeholderTextClassName,
}: Props) {
  const [resolved, setResolved] = useState<ResolvedPhoto>({
    source: "",
    url: "",
    failed: false,
  });

  useEffect(() => {
    if (!source.startsWith("idb:")) return;

    let active = true;

    readPhoto(source)
      .then((url) => {
        if (active) setResolved({ source, url, failed: false });
      })
      .catch(() => {
        if (active) setResolved({ source, url: "", failed: true });
      });

    return () => {
      active = false;
    };
  }, [readPhoto, source]);

  const isStored = source.startsWith("idb:");
  const isCurrent = resolved.source === source;
  const url = isStored ? (isCurrent ? resolved.url : "") : source;

  if (!url) {
    return (
      <div
        role="status"
        className={`grid place-items-center bg-[#f4f5f6] ${placeholderTextClassName} text-[#596672] ${className}`}
      >
        {isCurrent && resolved.failed
          ? "사진을 불러오지 못했습니다."
          : "사진 불러오는 중…"}
      </div>
    );
  }

  return <img src={url} alt={alt} className={className} />;
}
