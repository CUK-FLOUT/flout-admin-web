import type {
  InfrastructureIssue,
  ReviewStatus,
} from "../../pages/Infrastructure/types";
import { infrastructureAssets as assets } from "../../pages/Infrastructure/assets";
import { getInfrastructureLocation } from "../../pages/Infrastructure/mapLocations";
import type { KakaoMap, KakaoMaps } from "../../lib/kakao/maps";

const pinImages: Record<ReviewStatus, string> = {
  "검토 대기": assets.waitingPin,
  "검토 중": assets.reviewPin,
  "점검 필요": assets.reviewPin,
  "조치 진행": assets.reviewPin,
  "조치 완료": assets.completedPin,
};

type Options = {
  maps: KakaoMaps;
  map: KakaoMap;
  issue: InfrastructureIssue;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

export function addInfrastructureMarker({
  maps,
  map,
  issue,
  isSelected,
  onSelect,
}: Options) {
  const point = getInfrastructureLocation(issue);

  if (!point) return;
  const button = document.createElement("button");

  button.type = "button";
  button.className =
    "flex h-11 cursor-pointer items-center gap-1 rounded [font-family:Pretendard,sans-serif] text-[#202b36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73]";
  button.setAttribute(
    "aria-label",
    `${issue.number}번 ${issue.location}, ${issue.kind}, ${issue.status} 상세 보기`,
  );
  button.setAttribute("aria-pressed", String(isSelected));
  const pin = document.createElement("span");

  pin.className =
    "relative h-9 w-8 shrink-0 rounded-full" +
    (issue.marker.labelBefore ? " order-2" : "") +
    (isSelected ? " ring-2 ring-[#234f73] ring-offset-2" : "");
  const image = document.createElement("img");

  image.src = pinImages[issue.status];
  image.width = 32;
  image.height = 36;
  image.alt = "";
  image.className = "max-w-none";
  const number = document.createElement("span");

  number.className =
    "absolute left-0 top-[6px] w-8 text-center text-xs font-bold text-white";
  number.textContent = String(issue.number);
  pin.append(image, number);
  const label = document.createElement("span");

  label.className =
    "whitespace-nowrap rounded-[5px] border border-[#cbd5e1] bg-white px-2 py-1 text-xs text-[#334155]";
  label.textContent = issue.status;
  button.append(pin, label);
  const stopMap = () => maps.event.preventMap();
  const click = () => {
    maps.event.preventMap();
    onSelect(issue.id);
  };

  button.addEventListener("mousedown", stopMap);
  button.addEventListener("touchstart", stopMap, { passive: true });
  button.addEventListener("click", click);
  const overlay = new maps.CustomOverlay({
    map,
    content: button,
    position: new maps.LatLng(point.latitude, point.longitude),
    xAnchor: issue.marker.labelBefore ? 0.85 : 0.15,
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
