export const categories = [
  "출입구",
  "창문·개구부",
  "배수구",
  "기타 구조",
] as const;
export type Category = (typeof categories)[number];
export type Feedback = { title: string; opinion: string; findings: string };
export type ResultPhoto = {
  id: string;
  name: string;
  src: string;
  category: Category | null;
};
export type ResultContent = {
  selected: Category[];
  summary: string;
  details: Record<Category, Feedback>;
  actions: string[];
  route: "개별 주택" | "지역·공공";
  memo: string;
  photos: ResultPhoto[];
  notify: boolean;
};
export type ResultRecord = {
  draft: ResultContent;
  published: ResultContent | null;
  savedAt: string;
};
export type RegionIssue = {
  id: string;
  applicationId: string;
  location: string;
  postcode: string;
  kind: string;
  description: string;
  findings: string;
  source: "전문가 현장점검";
  status: "검토 대기";
};
export type ResultsState = {
  records: Record<string, ResultRecord>;
  issues: RegionIssue[];
};

export const resultsDialogKinds = [
  "actions",
  "region",
  "address",
  "address-results",
  "published",
  "republished",
  "draft-saved",
  "region-saved",
] as const;

export type ResultsDialogKind = (typeof resultsDialogKinds)[number];
