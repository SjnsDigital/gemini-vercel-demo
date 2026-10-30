import test from "node:test";
import assert from "node:assert/strict";
import { parseMoney, formatMoneyInput } from "./money.js";

test("shorthand captures Vietnamese sales money without zero typing", () => {
  for (const [text, amount] of [
    ["2", 2000000],
    ["2.2", 2200000],
    ["2,2", 2200000],
    ["2tr2", 2200000],
    ["2 triệu 2", 2200000],
    ["2,2tr", 2200000],
    ["500k", 500000],
    ["1ty5", 1500000000],
    ["0.2", 200000],
    [".5", 500000],
    [",5tr", 500000],
    ["0", 0],
    ["2.675", 2675000],
  ])
    assert.equal(parseMoney(text).value, amount, text);
});
test("full VND and explicit grouped đồng do not get multiplied again", () => {
  for (const [text, amount] of [
    ["2800000", 2800000],
    ["2.200.000", 2200000],
    ["2,200,000", 2200000],
    ["2 200 000", 2200000],
    ["500đ", 500],
    ["2.675đ", 2675],
    ["4,500 VND", 4500],
    ["2.200.000,50đ", 2200001],
  ])
    assert.equal(parseMoney(text).value, amount, text);
  assert.equal(parseMoney("1000").value, 1000);
});
test("invalid prices and accidental syntax never turn into a silent zero", () => {
  for (const text of [
    "-2",
    "+2",
    "1e6",
    "NaN",
    "Infinity",
    "2..2",
    "2.20.000",
    "2 triệu triệu",
    "abc",
    "2 20 000",
    "2/2",
  ])
    assert.equal(parseMoney(text).valid, false, text);
  assert.equal(parseMoney("2", { max: 1000000 }).valid, false);
  assert.equal(parseMoney("0", { min: 1 }).valid, false);
  assert.equal(parseMoney("").empty, true);
  assert.equal(parseMoney("2.").value, 2000000);
});
test("existing stored prices round-trip including tiny and large amounts", () => {
  for (const value of [
    0, 1, 500, 1000, 1001, 888888, 2200000, 2675000, 999999999, 1000000000,
    1000000000000,
  ])
    assert.equal(
      parseMoney(formatMoneyInput(value)).value,
      value,
      String(value),
    );
  assert.equal(formatMoneyInput(""), "");
});

test("per-kWh rates use their labelled thousand-dong shortcut", () => {
  assert.equal(parseMoney("2.2", { defaultScale: 1000 }).value, 2200);
  assert.equal(parseMoney("2k2", { defaultScale: 1000 }).value, 2200);
  for (const value of [0, 500, 1000, 2200, 20000])
    assert.equal(
      parseMoney(formatMoneyInput(value, { defaultScale: 1000 }), {
        defaultScale: 1000,
      }).value,
      value,
    );
});
