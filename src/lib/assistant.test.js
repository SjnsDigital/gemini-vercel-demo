import test from "node:test";
import assert from "node:assert/strict";
import { assistantSkills, interpretAssistant } from "./assistant.js";

const now = new Date("2026-10-30T18:10:00Z"); // Already 31 October in Vietnam.
const run = (text, route = "overview", db = {}) =>
  interpretAssistant(text, { route, db, now });

test("calculation commands preserve shorthand and explicit roof/phase/load intent", () => {
  const command = run(
    "Tính hóa đơn 2.2tr mái 12x8 3 pha hòa lưới ban ngày 60%",
  ).action;
  assert.equal(command.type, "calculate");
  assert.deepEqual(command.input, {
    inputMode: "bill",
    monthlyBill: 2200000,
    roofLength: 12,
    roofWidth: 8,
    phase: 3,
    mode: "grid_tied",
    dayRatio: 0.6,
  });
  assert.equal(run("2tr2", "calculator").action.input.monthlyBill, 2200000);
  assert.equal(run("Tra 2", "lookup").action.input.monthlyBill, 2000000);
  assert.equal(run("Tính 2.200.000đ").action.input.monthlyBill, 2200000);
  assert.equal(run("Tính 2.2.3").action, null);
  assert.equal(run("Tính 2 mái 0x8").action, null);
  assert.equal(run("Tính 2 ban ngày 101%").action, null);
});

test("reminders use Vietnam dates, reject impossible dates, preserve client names", () => {
  assert.deepEqual(run("Nhắc gọi khách Nam ngày mai").action.task, {
    title: "gọi khách Nam",
    date: "2026-11-01",
  });
  assert.deepEqual(run("Nhắc gọi chị Mai").action.task, {
    title: "gọi chị Mai",
    date: "2026-10-31",
  });
  assert.deepEqual(run("Nhắc khảo sát 02/11/2026").action.task, {
    title: "khảo sát",
    date: "2026-11-02",
  });
  assert.equal(run("Nhắc khảo sát 31/02/2026").action, null);
  assert.equal(run("Nhắc ngày mai").action, null);
});

test("customer paste is a reviewable prefill rather than direct persistence", () => {
  const db = { customers: [] };
  const parsed = run(
    "Thêm Anh Nam 0901234567 địa chỉ 12 Đường Mới tiền điện 2tr2",
    "customers",
    db,
  );
  assert.equal(parsed.action.type, "create-customer");
  assert.deepEqual(parsed.action.customer, {
    name: "Anh Nam",
    phone: "0901234567",
    address: "12 Đường Mới",
    monthlyBill: 2200000,
  });
  assert.equal(db.customers.length, 0);
  assert.equal(run("Thêm Anh Nam", "customers").action, null);
});

test("workspace and device audits use actual active records and prioritize overdue care", () => {
  const db = {
    tasks: [{ id: "t", title: "Khảo sát", date: "2026-10-30", done: false }],
    customers: [],
    tickets: [
      {
        id: "a",
        title: "Phiếu mở",
        status: "Đang xử lý",
        dueDate: "2026-10-30",
      },
      {
        id: "b",
        title: "Phiếu đóng",
        status: "Đã đóng",
        dueDate: "2026-10-29",
      },
    ],
    products: [
      { id: "p", active: true, price: 0, verified: false },
      { id: "old", active: false, price: 0, verified: false },
    ],
    quotes: [{ id: "q", status: "draft" }],
  };
  const audit = run("Việc nào cần làm trước?", "overview", db);
  assert.equal(audit.action.route, "care");
  assert.equal(audit.action.filter, "Quá hạn");
  assert(audit.details.includes("1 phiếu CSKH quá hạn"));
  const missing = run("Thiết bị thiếu giá", "catalog", db);
  assert(missing.summary.startsWith("1/1"));
  assert.equal(missing.action.onlyMissingPrice, true);
  assert.equal(
    run("Thiết bị chưa xác minh", "catalog", db).action.filter,
    "unverified",
  );
  assert.equal(
    run("Báo giá nào còn nháp?", "quotes", db).action.filter,
    "draft",
  );
});

test("device search, quote handoff and knowledge use supported grounded actions", () => {
  const db = {
    products: [
      {
        id: "bat",
        active: true,
        category: "bat",
        brand: "B",
        model: "16kWh",
        price: 20000000,
      },
    ],
    plans: [
      {
        id: "p1",
        name: "Bản mới nhất",
        input: {},
        result: { total: 100000000 },
      },
    ],
  };
  const device = run("Tìm pin lưu trữ", "lookup", db);
  assert.equal(device.action.category, "bat");
  assert.equal(device.action.query, "");
  assert.equal(
    run("Báo giá từ phương án mới nhất", "plans", db).action.planId,
    "p1",
  );
  assert.equal(run("Tạo báo giá mới", "quotes", db).action.type, "new-quote");
  const answer = run("Giải thích hoàn vốn", "knowledge");
  assert.equal(answer.action.type, "knowledge");
  assert.match(answer.copyText, /tổng đầu tư/);
  assert.equal(run("Làm điều chưa hỗ trợ xyz").action, null);
});

test("all ten specialist examples resolve to supported actions or useful readouts", () => {
  assert.equal(Object.keys(assistantSkills).length, 10);
  for (const [route, skill] of Object.entries(assistantSkills)) {
    for (const example of skill.examples) {
      const parsed = run(example, route);
      assert.notEqual(
        parsed.title,
        "Chưa nhận ra tác vụ cụ thể",
        `${route}: ${example}`,
      );
    }
  }
});

test("price lookup accepts direct known brands and quote review does not issue documents", () => {
  const db = {
    products: [
      { brand: "DEYE", model: "SUN-6K", price: 20000000, active: true },
    ],
    quotes: [
      {
        number: "BG-1",
        status: "draft",
        rows: [{ price: 0, verified: false }],
        customer: {},
        validUntil: "2026-10-01",
      },
    ],
  };
  assert.equal(run("DEYE", "catalog", db).action.query, "DEYE");
  assert.equal(run("Tra giá Deye", "lookup", db).action.query, "Deye");
  const review = run("Rà soát báo giá", "quotes", db);
  assert.equal(review.action.type, "navigate");
  assert.equal(review.action.route, "quotes");
  assert(review.details.some((item) => item.includes("1 hạng mục thiếu giá")));
  assert.equal(run("Làm điều chưa hỗ trợ xyz", "catalog", db).action, null);
});
