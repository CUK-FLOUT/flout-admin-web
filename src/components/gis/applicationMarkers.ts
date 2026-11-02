import type { Application, Risk } from "../../pages/GIS/types";
import { getMapLocation } from "../../pages/GIS/mapLocations";
import type { KakaoMap, KakaoMaps } from "../../lib/kakao/maps";
import highPin from "../../assets/gis/img1.svg";
import mediumPin from "../../assets/gis/img2.svg";
import lowPin from "../../assets/gis/img4.svg";

const pinImages: Record<Risk, string> = {
  높음: highPin,
  주의: mediumPin,
  낮음: lowPin,
};

type Options = {
  maps: KakaoMaps;
  map: KakaoMap;
  application: Application;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

export function addApplicationMarker({
  maps,
  map,
  application,
  isSelected,
  onSelect,
}: Options) {
  const point = getMapLocation(application);

  if (!point) return;
  const button = document.createElement("button");

  button.type = "button";
  button.className =
    "flex h-11 cursor-pointer items-center gap-1 rounded [font-family:Pretendard,sans-serif] text-[#202b36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73]";
  button.setAttribute(
    "aria-label",
    `${application.number}번 ${application.address}, ${application.risk}, ${application.status} 상세 보기`,
  );
  button.setAttribute("aria-pressed", String(isSelected));
  const pin = document.createElement("span");

  pin.className =
    "relative h-9 w-8 shrink-0 rounded-full" +
    (application.marker.labelBefore ? " order-2" : "") +
    (isSelected ? " ring-2 ring-[#234f73] ring-offset-2" : "");
  const image = document.createElement("img");

  image.src = pinImages[application.risk];
  image.width = 32;
  image.height = 36;
  image.alt = "";
  image.className = "max-w-none";
  const number = document.createElement("span");

  number.className =
    "absolute left-0 top-[6px] w-8 text-center text-xs font-bold text-white";
  number.textContent = String(application.number);
  pin.append(image, number);
  const label = document.createElement("span");

  label.className =
    "whitespace-nowrap rounded-[5px] border border-[#cbd5e1] bg-white px-2 py-1 text-xs text-[#334155]";
  label.textContent = application.status;
  button.append(pin, label);
  const stopMap = () => maps.event.preventMap();
  const click = () => {
    maps.event.preventMap();
    onSelect(application.id);
  };

  button.addEventListener("mousedown", stopMap);
  button.addEventListener("touchstart", stopMap, { passive: true });
  button.addEventListener("click", click);
  const overlay = new maps.CustomOverlay({
    map,
    content: button,
    position: new maps.LatLng(point.latitude, point.longitude),
    xAnchor: application.marker.labelBefore ? 0.85 : 0.15,
    yAnchor: 1,
    zIndex: isSelected ? 10 : 1,
  });

  return () => {
    overlay.setMap(null);
    button.removeEventListener("mousedown", stopMap);
    button.removeEventListener("touchstart", stopMap);
    button.removeEventListener("click", click);
  };
}
