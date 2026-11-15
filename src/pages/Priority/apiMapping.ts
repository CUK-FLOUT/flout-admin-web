import type { PriorityItem } from "../../api/priorityInspections";
import type { PriorityApplication } from "./types";

export function toPriorityApplication(item: PriorityItem): PriorityApplication {
  return {
    applicationId: item.applicationId,
    id: item.receiptNo,
    resident: "",
    address: item.address,
    district: "",
    risk: ({ HIGH: "높음", CAUTION: "주의", LOW: "낮음" } as const)[
      item.riskLevel
    ],
    floodExperience: ({ YES: "있음", NO: "없음", UNKNOWN: "모름" } as const)[
      item.floodExperience
    ],
    reason: item.requestReason || "미입력",
    nearby: item.nearbyApplicationCount,
    designated: item.designated,
    assigned: false,
    memo: "",
  };
}
