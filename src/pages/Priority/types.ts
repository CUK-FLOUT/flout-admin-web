export type PriorityRisk = "높음" | "주의" | "낮음";
export type PriorityApplication = {
  applicationId?: number;
  inspectionNeed?: string;
  designationKnown?: boolean;
  id: string;
  resident: string;
  address: string;
  district: string;
  risk: PriorityRisk;
  floodExperience: "있음" | "없음" | "모름";
  reason: string;
  nearby: number;
  designated: boolean;
  assigned: boolean;
  memo: string;
};
