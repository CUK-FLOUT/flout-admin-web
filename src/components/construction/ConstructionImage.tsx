import { useEffect, useState } from "react";
import { readConstructionPhoto } from "../../pages/Construction/photos";
export default function ConstructionImage({source, alt, className}: {source: string; alt: string; className: string}) {
  const [loaded, setLoaded] = useState({source: "", url: "", failed: false});
  useEffect(() => {
    if (!source.startsWith("idb:")) return;
    let active = true;
    readConstructionPhoto(source).then(url => {if (active) setLoaded({source, url, failed: false});})
      .catch(() => {if (active) setLoaded({source, url: "", failed: true});});
    return () => {active = false;};
  }, [source]);
  const url = source.startsWith("idb:") ? (loaded.source === source ? loaded.url : "") : source;
  if (!url) return <div role="status" className={"grid place-items-center bg-[#f4f5f6] text-xs text-[#596672] " + className}>{loaded.failed ? "사진을 불러오지 못했습니다." : "사진 불러오는 중…"}</div>;
  return <img src={url} alt={alt} className={className}/>;
}
