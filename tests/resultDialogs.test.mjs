import assert from "node:assert/strict";
import test from "node:test";
import {
  createResultDialogsHarness,
  resultDialogProps,
} from "./helpers/createResultDialogsHarness.mjs";

const event = { preventDefault() {} };
const plain = (value) => JSON.parse(JSON.stringify(value));
const find = (view, predicate) => view.findAll(view.render(), predicate)[0];
const input = (view, id) => find(view, (node) => node.props.id === id);
const button = (view, label) =>
  find(view, (node) => node.type === "button" && view.text(node) === label);
const submit = (view) =>
  find(view, (node) => node.type === "form").props.onSubmit(event);

test("권장조치는 빈 입력을 거부하고 공백을 정리한 목록만 반영한다", () => {
  const props = resultDialogProps("actions");
  props.content.actions = [];
  let saved;
  props.onActions = (value) => {
    saved = value;
  };
  const view = createResultDialogsHarness(props);
  assert.equal(
    view.findAll(view.render(), (node) => node.type === "input").length,
    4,
  );
  button(view, "목록에 반영").props.onClick();
  assert.match(view.text(view.render()), /권장조치를 1개 이상 입력/);
  assert.equal(saved, undefined);
  find(
    view,
    (node) => node.props["aria-label"] === "권장조치 1",
  ).props.onChange({ target: { value: "  물막이판 설치  " } });
  button(view, "목록에 반영").props.onClick();
  assert.deepEqual(plain(saved), ["물막이판 설치"]);
});

test("권장조치가 네 개 이상이어도 기존 항목과 추가 입력 한 칸을 유지한다", () => {
  const props = resultDialogProps("actions");
  props.content.actions = ["1", "2", "3", "4", "5"];
  const view = createResultDialogsHarness(props);
  assert.deepEqual(
    view
      .findAll(view.render(), (node) => node.type === "input")
      .map((node) => node.props.value),
    ["1", "2", "3", "4", "5", ""],
  );
});

test("지역 문제 등록은 위치·내용·현장 확인의 필수 입력을 검증한다", async () => {
  const props = resultDialogProps();
  let calls = 0;
  props.onRegion = async () => {
    calls++;
    return true;
  };
  const view = createResultDialogsHarness(props);
  input(view, "region-description").props.onChange({
    target: { value: "   " },
  });
  await submit(view);
  assert.equal(calls, 0);
  assert.match(
    view.text(view.render()),
    /위치, 문제 내용, 현장 확인 내용을 모두 입력/,
  );
});

test("지역 문제 등록은 선택한 유형과 정리된 값을 전달하고 거부·오류를 표시한다", async () => {
  const props = resultDialogProps();
  let body;
  let closes = 0;
  props.setDialog = () => {
    closes++;
  };
  props.onRegion = async (value) => {
    body = value;
    return false;
  };
  const view = createResultDialogsHarness(props);
  button(view, "하수 역류").props.onClick();
  await submit(view);
  assert.deepEqual(plain(body), {
    location: "부천시 주소",
    postcode: "",
    kind: "하수 역류",
    description: "문제 내용",
    findings: "현장 확인",
  });
  assert.match(view.text(view.render()), /등록할 수 없는 상태입니다/);
  props.onRegion = async () => {
    throw new Error("서버 오류");
  };
  await submit(view);
  assert.match(view.text(view.render()), /서버 오류/);
  props.onRegion = async () => true;
  await submit(view);
  assert.doesNotMatch(
    view.text(view.render()),
    /서버 오류|등록할 수 없는 상태/,
  );
  assert.equal(closes, 0);
});

test("지역 문제 등록은 저장 중·읽기 전용 상태를 유지하고 닫기를 제어한다", async () => {
  const props = resultDialogProps();
  props.busy = true;
  let closes = 0;
  let calls = 0;
  props.setDialog = (value) => {
    assert.equal(value, null);
    closes++;
  };
  props.onRegion = async () => {
    calls++;
    return true;
  };
  const view = createResultDialogsHarness(props);
  assert.equal(
    find(view, (node) => node.type === "fieldset").props.disabled,
    true,
  );
  assert.equal(view.render().props.closeDisabled, true);
  view.render().props.onClose();
  await submit(view);
  assert.equal(closes, 0);
  assert.equal(calls, 0);
  props.busy = false;
  props.readOnly = true;
  await submit(view);
  assert.equal(calls, 0);
  assert.match(
    view.text(view.render()),
    /공개된 점검 결과에서는 지역 문제를 등록할 수 없습니다/,
  );
  view.render().props.onClose();
  assert.equal(closes, 1);
});

test("지역 문제 폼은 늦게 로드된 결과를 반영하고 같은 결과의 재렌더링에는 편집값을 유지한다", () => {
  const props = resultDialogProps();
  const view = createResultDialogsHarness(props);
  props.content = {
    ...props.content,
    summary: "새 요약",
    feedbackEntries: [
      { category: "배수구", feedback: { findings: "첫 번째" } },
      { category: "배수구", feedback: { findings: "두 번째" } },
    ],
  };
  assert.equal(input(view, "region-description").props.value, "새 요약");
  assert.equal(
    find(view, (node) => node.type === "GrowingTextarea").props.value,
    "첫 번째\n두 번째",
  );
  input(view, "region-description").props.onChange({
    target: { value: "작성 중" },
  });
  assert.equal(input(view, "region-description").props.value, "작성 중");
});

test("저장·공개·재공개·지역 등록 안내 모달은 기존 제목과 닫기 콜백을 유지한다", () => {
  for (const [kind, title] of [
    ["draft-saved", "임시저장되었습니다."],
    ["published", "결과를 저장·공개했습니다."],
    ["republished", "수정 결과를 저장·공개했습니다."],
    ["region-saved", "지역 문제를 등록했습니다."],
  ]) {
    const props = resultDialogProps(kind);
    let closed;
    props.setDialog = (value) => {
      closed = value;
    };
    const view = createResultDialogsHarness(props);
    assert.equal(view.render().props.title, title);
    button(view, "확인").props.onClick();
    assert.equal(closed, null);
  }
});
