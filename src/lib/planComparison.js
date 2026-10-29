const finite = (value) =>
  (typeof value === "number" ||
    (typeof value === "string" && value.trim() !== "")) &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0
    ? Number(value)
    : null;

// Compare saved snapshots, never silently recalculate them with today's catalog.
export function comparisonSnapshot(plan) {
  const result = plan?.result || {};
  const input = plan?.input || result.input || {};
  const monthlySavings = finite(result.monthlySavings);
  const missingPrice =
    !Array.isArray(result.rows) ||
    result.rows.length === 0 ||
    result.rows.some((row) => !(finite(row.price) > 0));
  return {
    systemKwp: finite(result.systemKwp),
    total: finite(result.total),
    monthlyGeneration: finite(result.monthlyGeneration),
    monthlySavings,
    roiYears:
      result.valid === true && !missingPrice && monthlySavings > 0
        ? finite(result.roiYears)
        : null,
    batteryKwh: finite(result.batteryKwh),
    monthlyBill: finite(result.monthlyBill ?? input.monthlyBill),
    specificYield: finite(input.specificYield),
    mode: input.mode,
    valid: result.valid === true,
    verified: result.publishable === true,
    missingPrice,
  };
}

export function comparisonHasDifferentAssumptions(snapshots) {
  if (snapshots.length < 2) return false;
  return ["monthlyBill", "specificYield"].some((key) =>
    snapshots.some((snapshot) => snapshot[key] !== snapshots[0][key]),
  );
}
