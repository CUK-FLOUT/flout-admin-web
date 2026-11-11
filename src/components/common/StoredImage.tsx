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

/**
 * Renders normal image URLs directly and loads idb: photo references on demand.
 * Results from a previous source are never displayed after the source changes.
 */
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
