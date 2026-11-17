import assert from "node:assert/strict";
import test from "node:test";
import { createGisDetailHarness } from "./helpers/createGisDetailHarness.mjs";

export function detailProps() {
  return {
    application: {
      id: "11",
      receiptNo: "000011",
      resident: "김주민",
      phone: "010-1234-5678",
      address: "경기도 부천시 긴 주소 101동 101호",
      houseType: "반지하",
      tenure: "세입자",
      risk: "주의",
      floodHistory: "침수 경험 있음",
      inflow: "배수구",
      facilities: "없음",
      visitDate: "2026-11-20",
      visitTime: "오전 9~12시",
      reason: "점검 요청",
    },
    record: { internalMemo: "기존 메모", errors: {} },
    onClose() {},
    async onAccept() {
      return "저장되었습니다.";
    },
  };
}

test("GIS 네 탭은 로딩·빈 결과·개별 오류를 구분한다", () => {
  const props = detailProps();
  const view = createGisDetailHarness(props);
  assert.match(view.text(view.render()), /첨부사진을 불러오는 중입니다/);
  assert.match(
    view.text(view.select("처리 이력")),
    /처리 이력을 불러오는 중입니다/,
  );
  props.record.histories = { histories: [] };
  assert.match(view.text(view.render()), /등록된 처리 이력이 없습니다/);
  for (const [tab, field, label] of [
    ["지원 정보", "support", "지원"],
    ["시공 정보", "construction", "시공"],
  ]) {
    assert.match(
      view.text(view.select(tab)),
      new RegExp(`${label} 정보를 불러오는 중입니다`),
    );
    props.record[field] = null;
    assert.match(
      view.text(view.render()),
      new RegExp(`등록된 ${label} 정보가 없습니다`),
    );
    props.record.errors[field] = "조회 실패";
    const output = view.text(view.render());
    assert.match(output, /조회 실패/);
    assert.doesNotMatch(output, /불러오는 중|등록된/);
  }
});

test("GIS 지원·시공 탭은 서버 상태와 미입력 값을 기존 문구로 표시한다", () => {
  const props = detailProps();
  props.record.support = {
    status: "APPROVED",
    programName: "지원사업",
    landlordConsentRequired: true,
    landlordConsentDocumentSubmitted: false,
    constructionStatus: "SCHEDULED",
  };
  props.record.construction = {
    status: "COMPLETED",
    preferredTimeSlot: "AFTERNOON",
  };
  const view = createGisDetailHarness(props);
  const support = view.text(view.select("지원 정보"));
  for (const label of ["승인", "필요", "미제출", "예정", "미입력"])
    assert.ok(support.includes(label));
  const construction = view.text(view.select("시공 정보"));
  for (const label of ["완료", "오후", "미입력"])
    assert.ok(construction.includes(label));
});

test("GIS 탭 전환은 메모·사진 미리보기·닫기 동작을 유지한다", async () => {
  const props = detailProps();
  let saved;
  let closed = false;
  props.onAccept = async (id, memo) => {
    saved = { id, memo };
  };
  props.onClose = () => {
    closed = true;
  };
  props.record.attachments = [
    { attachmentId: 1, imageUrl: "/photo.jpg", originalFilename: "사진.jpg" },
  ];
  const view = createGisDetailHarness(props);
  let tree = view.render();
  view
    .findAll(tree, (n) => n.type === "input")[0]
    .props.onChange({ target: { value: "수정 메모" } });
  const photoButton = view.findAll(
    tree,
    (n) =>
      n.type === "button" &&
      n.children.some(
        (child) => child.type === "img" && child.props.src === "/photo.jpg",
      ),
  )[0];
  photoButton.props.onClick();
  assert.equal(view.opened, 1);
  tree = view.select("처리 이력");
  assert.equal(
    view.findAll(tree, (n) => n.type === "input")[0].props.value,
    "수정 메모",
  );
  assert.equal(
    view.findAll(tree, (n) => n.type === "img" && n.props.src === "/photo.jpg")
      .length,
    1,
  );
  view
    .findAll(
      tree,
      (n) => n.type === "button" && view.text(n) === "메모 저장",
    )[0]
    .props.onClick();
  await Promise.resolve();
  assert.deepEqual(saved, { id: "11", memo: "수정 메모" });
  view
    .findAll(tree, (n) => n.type === "button" && view.text(n) === "닫기")[0]
    .props.onClick();
  assert.equal(view.closed, 1);
  view
    .findAll(tree, (n) => n.props["aria-label"] === "신청 목록으로 돌아가기")[0]
    .props.onClick();
  assert.equal(closed, true);
});
