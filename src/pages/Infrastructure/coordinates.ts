import { loadKakaoMaps } from "../../lib/kakao/maps";
import type { InfrastructureIssue } from "./types";

type Coordinates = NonNullable<InfrastructureIssue["coordinates"]>;

export function validCoordinates(value: InfrastructureIssue["coordinates"]): value is Coordinates {
  return !!value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)
    && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180;
}

export async function resolveInfrastructureCoordinates(address: string): Promise<Coordinates> {
  if (!address.trim() || /[○〇]/.test(address))
    throw new Error("실제 도로명 또는 지번 주소를 입력해 주세요.");
  const { services } = await loadKakaoMaps();

  if (!services) throw new Error("주소 좌표 서비스를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("주소 확인 시간이 초과되었습니다. 다시 시도해 주세요.")), 10000);

    new services.Geocoder().addressSearch(address.trim(), (results, status) => {
      clearTimeout(timer);
      const coordinates = results.length === 1 ? {
        latitude: Number(results[0].y), longitude: Number(results[0].x),
      } : undefined;

      if (status === services.Status.OK && validCoordinates(coordinates)) resolve(coordinates);
      else reject(new Error("위치를 확인하지 못했습니다. 건물 번호를 포함한 정확한 주소를 입력해 주세요."));
    }, { analyze_type: services.AnalyzeType.EXACT });
  });
}

export function applyInfrastructureCoordinates(records: InfrastructureIssue[], id: string, location: string, coordinates: Coordinates) {
  return records.map(issue => issue.id === id && issue.location === location && !validCoordinates(issue.coordinates)
    ? { ...issue, coordinates } : issue);
}
