import test from "node:test";
import assert from "node:assert/strict";
import { encodeShare, decodeShare, publicPlan } from "./share.js";
const plan = {
  name: "Khách Nguyễn riêng tư",
  input: { bill: 2500000, dayRatio: 0.5, customerName: "Riêng tư", roofL: 16 },
  result: {
    systemKwp: 5.67,
    panelCount: 9,
    total: 102605000,
    monthlySavings: 2000000,
    rows: [
      {
        id: "p1",
        name: "Tấm pin điện mặt trời",
        model: "ASTRONERGY",
        qty: 9,
        price: 2675000,
        unit: "tấm",
        verified: false,
      },
    ],
    warnings: [{ level: "warning", message: "Cần khảo sát mái" }],
  },
  customer: { phone: "0999999999" },
};
test("share roundtrip keeps Unicode, public calculation and no customer PII", async () => {
  const token = await encodeShare(plan);
  const got = await decodeShare(token);
  assert.equal(got.plan.result.rows[0].name, "Tấm pin điện mặt trời");
  assert.equal(got.plan.result.total, 102605000);
  assert.equal(got.plan.input.bill, 2500000);
  assert.equal(got.plan.input.customerName, undefined);
  assert.equal(got.plan.customer, undefined);
  assert(!JSON.stringify(got).includes("Riêng tư"));
});
test("corrupt links and unknown versions fail", async () => {
  const token = await encodeShare(plan);
  await assert.rejects(() => decodeShare(token.slice(0, -12) + "AAAA"));
  await assert.rejects(() => decodeShare("v5.abc"));
  await assert.rejects(() => decodeShare("x".repeat(180001)));
});
test("expiry is enforced on read", async () => {
  const original = Date.now;
  const token = await encodeShare(plan, {}, 1);
  Date.now = () => original() + 2 * 86400000;
  try {
    await assert.rejects(() => decodeShare(token), /hết hiệu lực/);
  } finally {
    Date.now = original;
  }
});
test("invalid expiration and missing plans fail", async () => {
  await assert.rejects(() => encodeShare({}));
  await assert.rejects(() => encodeShare(plan, {}, 0));
  await assert.rejects(() => encodeShare(plan, {}, Infinity));
});
test("private arbitrary fields are never serialized", () => {
  const got = publicPlan({
    ...plan,
    result: { ...plan.result, customer: { name: "SECRET" }, notes: "SECRET" },
    input: { ...plan.input, email: "secret@example.com" },
  });
  assert(!JSON.stringify(got).includes("SECRET"));
  assert(!JSON.stringify(got).includes("secret@example.com"));
});

test("negative result values are rejected even with a valid checksum", async () => {
  const token = await encodeShare({
    ...plan,
    result: { ...plan.result, systemKwp: -5 },
  });
  await assert.rejects(() => decodeShare(token));
});
