import test from "node:test";
import assert from "node:assert/strict";
import {
  calculate,
  defaults,
  electricityBill,
  billToKwh,
} from "./calculator.js";

const products = [
  {
    id: "panel",
    category: "panel",
    brand: "Source",
    model: "630",
    wp: 630,
    price: 2675000,
    active: true,
    verified: true,
  },
  {
    id: "inverter6",
    category: "inv",
    brand: "Source",
    model: "6",
    kw: 6,
    phase: 1,
    price: 13520000,
    active: true,
    verified: true,
  },
  {
    id: "inverter8",
    category: "inv",
    brand: "Source",
    model: "8",
    kw: 8,
    phase: 1,
    price: 31560000,
    active: true,
    verified: true,
  },
  {
    id: "battery",
    category: "bat",
    brand: "Source",
    model: "16",
    capacity: 16,
    dod: 0.9,
    price: 46100000,
    active: true,
    verified: true,
  },
  ...[
    "cab",
    "rail",
    "kbia",
    "kgiua",
    "mc4",
    "wr",
    "wb",
    "truck",
    "misc",
    "labor",
  ].map((category) => ({
    id: category,
    category,
    model: category,
    price: 10000,
    active: true,
    verified: true,
  })),
];
const close = (a, b, epsilon = 0.00001) =>
  assert.ok(Math.abs(a - b) < epsilon, `${a} should equal ${b}`);

test("progressive tariff is continuous and inverse at all tier boundaries", () => {
  close(electricityBill(50), 107136);
  close(electricityBill(100), 217836);
  for (const kwh of [
    0, 0.1, 49.99, 50, 50.01, 100, 200, 300, 400, 400.1, 1000, 20000,
  ]) {
    close(billToKwh(electricityBill(kwh)), kwh);
  }
  assert.throws(() => electricityBill(-1), RangeError);
  assert.throws(() => billToKwh(Infinity), RangeError);
});

test("business and production apply their own voltage and three-rate mix", () => {
  const input = {
    tariff: "business",
    voltage: "low",
    peakRatio: 0.2,
    offPeakRatio: 0.3,
  };
  close(
    electricityBill(1000, 0.08, input),
    (3152 * 0.5 + 5422 * 0.2 + 1918 * 0.3) * 1000 * 1.08,
  );
  close(billToKwh(electricityBill(1000, 0.08, input), 0.08, input), 1000);
  assert.notEqual(
    electricityBill(1000, 0.08, input),
    electricityBill(1000, 0.08, { ...input, tariff: "production" }),
  );
});

test("hybrid conserves PV energy including both charge and discharge losses", () => {
  const result = calculate({ ...defaults, monthlyBill: 2500000 }, products);
  assert.equal(result.valid, true);
  close(
    result.directEnergy + result.chargeEnergy + result.surplusEnergy,
    result.dailyGeneration,
  );
  close(result.dischargeEnergy, result.chargeEnergy * 0.96 * 0.96);
  assert.ok(result.dischargeEnergy <= result.batteryUsableKwh);
  assert.ok(result.monthlySelfConsumed <= result.monthlyKwh + 0.0001);
  assert.ok(result.monthlySavings <= result.monthlyBill + 0.0001);
  assert.ok(result.monthlyRemainingKwh >= 0);
  close(result.roiMonths, result.total / result.monthlySavings);
});

test("hybrid sizing funds the real daytime load before reserving PV to charge batteries", () => {
  const result = calculate(
    {
      ...defaults,
      dayCoverage: 0.2,
      nightCoverage: 1,
      roofLength: 50,
      roofWidth: 50,
    },
    products,
  );
  assert.ok(result.dischargeEnergy + 0.001 >= result.nighttimeKwh);
  close(
    result.directEnergy + result.chargeEnergy + result.surplusEnergy,
    result.dailyGeneration,
  );
});

test("grid-tied system has no battery rows or night output", () => {
  const result = calculate(
    { ...defaults, mode: "grid_tied", dayRatio: 0.3 },
    products,
  );
  assert.equal(result.batteryKwh, 0);
  assert.equal(result.batteryCount, 0);
  assert.equal(result.dischargeEnergy, 0);
  assert.ok(!result.rows.some((r) => r.id === "bat"));
  assert.ok(result.warnings.some((w) => w.code === "LOW_DAYTIME_USAGE"));
});

test("roof capacity considers geometry and clearances rather than area alone", () => {
  const result = calculate(
    { ...defaults, roofLength: 1, roofWidth: 30 },
    products,
  );
  assert.equal(result.roofLayout.capacity, 0);
  assert.equal(result.roofSufficient, false);
  assert.ok(result.warnings.some((w) => w.code === "ROOF_AREA_INSUFFICIENT"));
  const enough = calculate(
    { ...defaults, roofLength: 30, roofWidth: 30 },
    products,
  );
  assert.equal(enough.roofSufficient, true);
});

test("manual battery shortage and phase-incompatible inverter are flagged", () => {
  const shortage = calculate(
    { ...defaults, batteryAuto: false, batteryCount: 0, dayRatio: 0.3 },
    products,
  );
  assert.ok(shortage.warnings.some((w) => w.code === "BATTERY_INSUFFICIENT"));
  assert.equal(shortage.dischargeEnergy, 0);
  const phase3 = calculate({ ...defaults, phase: 3 }, products);
  assert.ok(phase3.warnings.some((w) => w.code === "INVERTER_MODEL_MISSING"));
  assert.ok(phase3.rows.find((r) => r.id === "inv").price === 0);
});

test("source price and missing verification cannot produce publishable plans", () => {
  const unverified = products.map((p) => ({ ...p, verified: false }));
  const result = calculate(defaults, unverified);
  assert.equal(result.publishable, false);
  assert.ok(result.warnings.some((w) => w.code === "PRICE_UNVERIFIED"));
  const unusual = products.map((p) =>
    p.id === "battery" ? { ...p, price: 8888888 } : p,
  );
  assert.ok(
    calculate(defaults, unusual).warnings.some(
      (w) => w.code === "SUSPICIOUS_SOURCE_PRICE",
    ),
  );
});

test("invalid or fractional structural inputs never create NaN results", () => {
  for (const input of [
    { monthlyBill: "" },
    { roofLength: 0 },
    { floors: 1.5 },
    { specificYield: Infinity },
    { growth: -0.1 },
    { batteryAuto: false, batteryCount: 1.2 },
    { inputMode: "kwh", monthlyKwh: -1 },
  ]) {
    const result = calculate({ ...defaults, ...input }, products);
    assert.equal(result.valid, false, JSON.stringify(input));
    assert.ok(result.errors.length > 0);
  }
});

test("custom wire, installation rates and VAT use current settings", () => {
  const first = calculate(defaults, products);
  const updated = calculate(defaults, products, {
    wireByFloor: { 3: 101 },
    installationRates: { labor: 123456, misc: 111111, truck: 222222 },
    vatQuote: 0.08,
    quotePricesIncludeVat: false,
  });
  assert.equal(updated.wireMeters, updated.strings * 101);
  close(
    updated.rows.find((r) => r.id === "labor").price,
    updated.inverterKw * 123456,
  );
  close(updated.total, updated.subtotal * 1.08);
  assert.notEqual(first.total, updated.total);
});

test("zero growth cashflow and zero night coverage stay finite", () => {
  const result = calculate(
    { ...defaults, growth: 0, nightCoverage: 0 },
    products,
  );
  assert.equal(result.batteryCount, 0);
  close(result.cashflow[25].savings, result.monthlySavings * 12 * 25);
  assert.ok(result.cashflow.every((point) => Number.isFinite(point.savings)));
});
