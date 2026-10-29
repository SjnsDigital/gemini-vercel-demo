import test from "node:test";
import assert from "node:assert/strict";
import { localDay, taskRows, searchText } from "./workflow.js";

test("follow-up dates use Vietnam midnight, not the server day", () => {
  assert.equal(localDay(new Date("2026-10-30T18:00:00Z")), "2026-10-31");
});
test("due work includes overdue contacts, excludes future and completed work", () => {
  const db = {
    tasks: [
      { id: "today", title: "Hẹn khảo sát", date: "2026-10-30" },
      { id: "future", title: "Bảo trì", date: "2026-11-01" },
      { id: "done", title: "Đã gọi", date: "2026-10-29", done: true },
    ],
    customers: [{ id: "c1", name: "Lan", nextContact: "2026-10-29" }],
  };
  assert.deepEqual(
    taskRows(db, "due", "2026-10-30").map((x) => x.id),
    ["c1", "today"],
  );
  assert.equal(taskRows(db, "all", "2026-10-30").length, 3);
  assert.deepEqual(
    taskRows(db, "done", "2026-10-30").map((x) => x.id),
    ["done"],
  );
});
test("Vietnamese search supports unaccented queries", () => {
  assert.equal(searchText(" Điện Mặt Trời "), "dien mat troi");
});
