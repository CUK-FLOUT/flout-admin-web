import assert from "node:assert/strict";
import { test } from "node:test";
import { createApiHarness } from "./helpers/createApiHarness.mjs";

const jsx = (type, props) => ({ type, props });
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap((node) => nodes(node, predicate));
  if (!tree || typeof tree !== "object") return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join("");
  if (node && typeof node === "object") return text(node.props?.children);
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}

test("완료된 점검만 결과 보기로 표시하고 기존 점검 ID·검색 조건을 유지한다", () => {
  const h = createApiHarness({ overrides: {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: { useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}] },
    "react-router-dom": { Link: "Link", useSearchParams: () => [new URLSearchParams("page=2&stage=완료")] },
    "../../auth/session": { getSession: () => ({ name: "김운영" }) },
    "../../pages/Inspection/apiModel": { validateAssignment: () => "" },
  } });
  const { default: AssignmentPanel } = h.load("src/components/inspection/AssignmentPanel.tsx");
  for (const status of ["대기", "예정", "진행", "완료"]) {
    const tree = AssignmentPanel({ application: { id: "000005", inspectionId: 91, status, assignee: "김운영" }, busy: false, onSave: async () => true });
    const link = nodes(tree, (node) => node.type === "Link")[0];
    assert.equal(text(link), status === "완료" ? "점검 결과 보기" : "점검 결과 등록");
    const url = new URL(link.props.to, "https://example.com");
    assert.equal(url.pathname, "/inspection/91/results");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("stage"), "완료");
    assert.equal(url.searchParams.get("view"), status === "완료" ? "readonly" : null);
  }
});

test("지원관리 결과 보기 버튼은 화면 이동을 사용하고 점검 연결이 없으면 비활성화한다", () => {
  const h = createApiHarness({ overrides: {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "../../pages/Support/model": { consentLabel: () => "불필요", inspectionFor: () => ({ actions: [] }) },
  } });
  const { default: SupportDetail } = h.load("src/components/support/SupportDetail.tsx");
  const application = { id: "000005", documents: [], review: {}, status: "승인" };
  let opened = 0;
  const onInspection = () => opened++;
  for (const handler of [onInspection, undefined]) {
    const tree = SupportDetail({ application, onInspection: handler, onReview: () => {}, onDialog: () => { throw new Error("결과 모달을 열면 안 됩니다."); }, className: "" });
    const button = nodes(tree, (node) => node.type === "button" && text(node) === "점검 결과 보기")[0];
    assert.equal(button.props.disabled, !handler);
    button.props.onClick?.();
  }
  assert.equal(opened, 1);
});


test("지원 결과 조회와 자격 검토는 같은 복귀 주소를 사용하며 검색·페이지를 보존한다", () => {
  const calls = [];
  const h = createApiHarness({ overrides: {
    "react-router-dom": { useNavigate: () => (...args) => calls.push(args) },
  } });
  const { useSupportNavigation } = h.load("src/pages/Support/useSupportNavigation.ts");
  const params = new URLSearchParams("page=3&district=원미구&q=김&selected=201&dialog=document&document=file-1");
  const original = params.toString();
  const navigation = useSupportNavigation(params, { apiId: 201, inspectionId: 91, status: "검토 중" });
  const result = new URL(navigation.inspectionPath, "https://example.com");
  const returnTo = result.searchParams.get("supportReturnTo");
  assert.equal(new URL(returnTo, result.origin).pathname, "/support/201");
  assert.equal(new URL(returnTo, result.origin).searchParams.get("page"), "3");
  navigation.review();
  const review = new URL(calls[0][0], result.origin);
  assert.equal(review.pathname, "/support/201/review");
  assert.equal(review.searchParams.get("returnTo"), returnTo);
  assert.equal(review.searchParams.has("selected"), false);
  navigation.showDialog("document", "file-2");
  assert.equal(calls[1][0].pathname, "/support/201");
  assert.equal(new URLSearchParams(calls[1][0].search).get("document"), "file-2");
  assert.equal(new URLSearchParams(calls[1][0].search).get("page"), "3");
  const query = navigation.returnQuery();
  query.delete("page");
  assert.equal(navigation.returnQuery().get("page"), "3");
  assert.equal(params.toString(), original);
  for (const status of ["승인", "미승인"]) {
    calls.length = 0;
    useSupportNavigation(params, { apiId: 201, inspectionId: null, status }).review();
    assert.equal(new URLSearchParams(calls[0][0].search).get("dialog"), status === "승인" ? "approved-view" : "rejected-view");
  }
  calls.length = 0;
  const empty = useSupportNavigation(params, undefined);
  assert.equal(empty.inspectionPath, null);
  empty.review();
  empty.showDialog("document");
  assert.equal(calls.length, 0);
});

function mountResultApplication(loadInspection) {
  const slots = [], effects = [], setters = [];
  let index = 0;
  const h = createApiHarness({ overrides: {
    react: {
      useState(initial) {
        const i = index++;
        if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
        return [slots[i], setters[i] ??= (next) => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }];
      },
      useEffect(effect, deps) {
        const i = index++, previous = slots[i];
        if (!previous || deps.some((value, j) => value !== previous.deps[j])) effects.push(() => {
          previous?.cleanup?.();
          slots[i] = { deps, cleanup: effect() };
        });
      },
    },
    "../Inspection/loadInspection": { loadInspection },
    "../../api/inspections": { inspectionError: (error) => error.message },
  } });
  const { useInspectionResultApplication } = h.load("src/pages/InspectionResults/useInspectionResultApplication.ts");
  return {
    render(id = "91") {
      index = 0;
      const result = useInspectionResultApplication(id);
      for (const effect of effects.splice(0)) effect();
      return result;
    },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}
const settle = () => new Promise(setImmediate);

test("결과 신청 조회 Hook은 실패 후 재시도하고 선택 변경·화면 이탈 시 이전 요청을 무효화한다", async () => {
  const requests = [];
  const h = mountResultApplication((id, signal) => new Promise((resolve, reject) => requests.push({ id, signal, resolve, reject })));
  assert.equal(h.render().loading, true);
  requests[0].reject(new Error("조회 실패"));
  await settle();
  let state = h.render();
  assert.equal(state.error, "조회 실패");
  assert.equal(state.loading, false);
  state.retry();
  h.render();
  assert.equal(requests[0].signal.aborted, true);
  requests[1].resolve({ inspectionId: 91 });
  await settle();
  state = h.render();
  assert.equal(state.application.inspectionId, 91);
  assert.equal(state.error, "");
  h.render("92");
  h.render("93");
  assert.equal(requests[2].signal.aborted, true);
  requests[3].resolve({ inspectionId: 93 });
  await settle();
  requests[2].resolve({ inspectionId: 92 });
  await settle();
  assert.equal(h.render("93").application.inspectionId, 93);
  h.render("94");
  h.unmount();
  assert.equal(requests[4].signal.aborted, true);
});

test("분리한 복귀 링크는 저장 중 이동을 막고 일반 조회에서는 링크 동작을 유지한다", () => {
  const h = createApiHarness({ overrides: {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-router-dom": { Link: "Link" },
  } });
  const { default: InspectionReturnLink } = h.load("src/components/inspection-results/InspectionReturnLink.tsx");
  for (const blocked of [false, true]) {
    let prevented = false;
    const link = InspectionReturnLink({ to: "/support/201?page=3", label: "지원 관리로 돌아가기", blocked });
    assert.equal(link.props.to, "/support/201?page=3");
    assert.equal(link.props["aria-disabled"], blocked);
    assert.equal(link.props.tabIndex, blocked ? -1 : undefined);
    link.props.onClick({ preventDefault: () => { prevented = true; } });
    assert.equal(prevented, blocked);
    assert.match(text(link), /지원 관리로 돌아가기/);
  }
});
