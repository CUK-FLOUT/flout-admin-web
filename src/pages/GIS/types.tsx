export type Risk = "높음" | "주의" | "낮음";

export type RequestStatus =
  | "접수"
  | "배정 대기"
  | "지원 검토 중"
  | "시공 진행"
  | "지원 미승인"
  | "점검 완료";

export type Application = {
  id: string;
  number: number;
  address: string;
  district: string;
  resident: string;
  phone: string;
  risk: Risk;
  status: RequestStatus;
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
