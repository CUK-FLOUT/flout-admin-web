import assert from "node:assert/strict";
import test from "node:test";

import {
  changePosition,
  orderApplications,
  normalizePriorityOrder,
} from "../src/pages/Priority/priorityUtils.ts";

const applications = [
  { id: "A", designated: true, assigned: false },
  { id: "B", designated: false, assigned: false },
  { id: "C", designated: true, assigned: false },
  { id: "D", designated: true, assigned: true },
];

test("only designated, unassigned rows change order", () => {
  const result = orderApplications(applications, ["C", "A"]);

  assert.deepEqual(
    result.map((item) => item.id),
    ["C", "B", "A", "D"],
  );
  assert.deepEqual(
    applications.map((item) => item.id),
    ["A", "B", "C", "D"],
  );
});

test("entries missing from the draft order are appended", () => {
  const result = orderApplications(applications, ["C"]);

  assert.deepEqual(
    result.map((item) => item.id),
    ["C", "B", "A", "D"],
  );
});

test("moves a selected entry up or down without mutating the original", () => {
  const original = ["A", "B", "C"];

  assert.deepEqual(changePosition(original, "B", -1), ["B", "A", "C"]);
  assert.deepEqual(changePosition(original, "B", 1), ["A", "C", "B"]);
  assert.deepEqual(original, ["A", "B", "C"]);
});

test("out-of-range and unknown moves leave the order unchanged", () => {
  const order = ["A", "B"];

  assert.strictEqual(changePosition(order, "A", -1), order);
  assert.strictEqual(changePosition(order, "B", 1), order);
  assert.strictEqual(changePosition(order, "unknown", 1), order);
});

test("normalization removes stale and duplicate IDs and appends missing eligible entries", () => {
  const eligible = [{ id: "A" }, { id: "C" }, { id: "E" }];
  assert.deepEqual(normalizePriorityOrder(["stale", "C", "C"], eligible), [
    "C",
    "A",
    "E",
  ]);
  assert.deepEqual(normalizePriorityOrder([], eligible), ["A", "C", "E"]);
});

test("dragging a displayed but previously unsaved entry updates the same order that gets saved", () => {
  const eligible = [{ id: "A" }, { id: "C" }, { id: "E" }];
  let draft = ["stale", "A"];
  const displayed = normalizePriorityOrder(draft, eligible);
  const from = displayed.indexOf("E"),
    to = displayed.indexOf("A");
  for (let position = from; position > to; position--)
    draft = changePosition(normalizePriorityOrder(draft, eligible), "E", -1);
  assert.deepEqual(draft, ["E", "A", "C"]);
  assert.deepEqual(normalizePriorityOrder(draft, eligible), draft);
});
