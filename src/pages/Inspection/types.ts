export type InspectionStatus = "대기" | "예정" | "진행" | "완료";
export type EditableStatus = Exclude<InspectionStatus, "대기">;
export type InspectionApplication = {
  id: string;
  inspectionId?: number;
  applicationId?: number;
  inspectorUserId?: number | null;
  resident: string;
  address: string;
  district: string;
  phone: string;
  priority: boolean;
  requestedDate: string;
  requestedTime: string;
  assignee: string;
  status: InspectionStatus;
  visitDate: string;
  visitTime: string;
  notice: string;
  notifyResident: boolean;
  resultPublished: boolean;
};
export type AssignmentDraft = Pick<
  InspectionApplication,
  "assignee" | "visitDate" | "visitTime" | "notice" | "notifyResident"
> & { status: EditableStatus };
