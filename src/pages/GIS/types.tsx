export type Risk = "높음" | "주의" | "낮음" | "미입력";

export type RequestStatus =
  | "접수"
  | "배정 대기"
  | "지원 검토 중"
  | "시공 진행"
  | "지원 미승인"
  | "점검 완료";

export type Application = {
  id: string;
  receiptNo?: string;
  number: number;
  address: string;
  district: string;
  resident: string;
  phone: string;
  risk: Risk;
  status: string;
  history: string[];
  memo: string;
  visitDate: string;
  visitTime: string;
  reason: string;
  houseType: string;
  tenure: string;
  inflow: string;
  facilities: string;
  floodHistory: string;
  coordinates?: { latitude: number; longitude: number };
  marker: {
    x: number;
    y: number;
    labelBefore?: boolean;
  };
};

export type Filters = {
  district: string;
  risk: string;
  status: string;
  search: string;
};
