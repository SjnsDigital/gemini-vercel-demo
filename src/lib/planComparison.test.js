import test from "node:test";
import assert from "node:assert/strict";
import {
  comparisonSnapshot,
  comparisonHasDifferentAssumptions,
} from "./planComparison.js";

test("saved comparison preserves unknown and invalid values instead of inventing zeroes", () => {
  const snapshot = comparisonSnapshot({
    result: {
      total: undefined,
      systemKwp: -4,
      batteryKwh: 0,
      monthlyGeneration: Infinity,
      monthlySavings: 2000000,
      roiYears: 2,
      valid: true,
      publishable: false,
      rows: [{ price: 0 }],
    },
  });
  assert.equal(snapshot.total, null);
  assert.equal(snapshot.systemKwp, null);
  assert.equal(snapshot.monthlyGeneration, null);
  assert.equal(snapshot.batteryKwh, 0);
  assert.equal(snapshot.roiYears, null);
  assert.equal(snapshot.missingPrice, true);
  assert.equal(snapshot.verified, false);
  assert.equal(
    comparisonSnapshot({ result: { total: " ", batteryKwh: false } }).total,
    null,
  );
  assert.equal(
    comparisonSnapshot({ result: { total: " ", batteryKwh: false } })
      .batteryKwh,
    null,
  );
  assert.equal(
    comparisonSnapshot({
      result: {
        valid: true,
        monthlySavings: 0,
        roiYears: 2,
        rows: [{ price: 1 }],
      },
    }).roiYears,
    null,
  );
});

test("comparison flags different bills and sunlight while preserving snapshots", () => {
  const first = {
    input: { monthlyBill: 2500000, specificYield: 4.2 },
    result: {
      valid: true,
      total: 100000000,
      monthlySavings: 2000000,
      roiYears: 100 / 24,
      publishable: true,
      rows: [{ price: 1000000 }],
    },
  };
  const a = comparisonSnapshot(first);
  assert.equal(a.total, 100000000);
  assert.equal(a.roiYears, 100 / 24);
  assert.equal(a.missingPrice, false);
  assert.equal(
    comparisonHasDifferentAssumptions([
      a,
      comparisonSnapshot(structuredClone(first)),
    ]),
    false,
  );
  assert.equal(
    comparisonHasDifferentAssumptions([
      a,
      comparisonSnapshot({
        ...first,
        input: { ...first.input, monthlyBill: 3000000 },
      }),
    ]),
    true,
  );
  assert.equal(first.result.total, 100000000);
});
