/** Solar energy model. Prices/tariffs come from the supplied source; no live tariff claim. */
export const REGIONS = [
  { id: "hcm", name: "TP. Hồ Chí Minh", yield: 4.2 },
  { id: "binhduong", name: "Bình Dương", yield: 4.1 },
  { id: "dongnai", name: "Đồng Nai", yield: 4.2 },
  { id: "longan", name: "Long An", yield: 4.1 },
  { id: "khanhhoa", name: "Khánh Hòa", yield: 4.6 },
  { id: "danang", name: "Đà Nẵng", yield: 4 },
  { id: "hanoi", name: "Hà Nội", yield: 3.4 },
];
export const DEFAULT_INPUT = {
  inputMode: "bill",
  monthlyBill: 2500000,
  monthlyKwh: 750,
  tariff: "residential",
  voltage: "low",
  peakRatio: 0.18,
  offPeakRatio: 0.25,
  dayRatio: 0.75,
  dayCoverage: 1,
  nightCoverage: 0.8,
  roofLength: 12,
  roofWidth: 6,
  layout: "auto",
  region: "hcm",
  specificYield: 4.2,
  floors: 3,
  phase: 1,
  mode: "hybrid",
  batteryCapacity: 16,
  batteryAuto: true,
  batteryCount: 1,
  batteryId: "",
  panelId: "",
  inverterId: "",
  panelWp: 630,
  panelLength: 2.382,
  panelWidth: 1.134,
  panelCountOverride: "",
  backupLoadKw: 2,
  growth: 0.05,
  mount: "tin",
  surveyConfirmed: false,
  exportPrice: 0,
};
export const defaults = DEFAULT_INPUT;
const TIERS = [
  [50, 1984],
  [50, 2050],
  [100, 2380],
  [100, 2998],
  [100, 3350],
  [Infinity, 3460],
];
const finite = (value) => Number.isFinite(Number(value));
const round = (value, digits = 2) =>
  Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;
const categoryIs = (p, category) =>
  (
    ({
      panel: ["panel", "solar_panel"],
      inverter: ["inv", "inverter"],
      battery: ["bat", "battery"],
    })[category] || [category]
  ).includes(p.category);
const active = (p) => p.active !== false;
const price = (p) => Number(p?.price ?? p?.sellingPrice) || 0;
const ratedKw = (p) => Number(p?.kw ?? p?.ratedKw) || 0;
const batteryKwh = (p) => Number(p?.capacity ?? p?.capacityKwh) || 0;

export function averageTariff(input) {
  const data = {
    business: {
      low: [3152, 5422, 1918],
      mid: [3108, 5202, 1829],
      high: [2887, 5025, 1609],
      veryhigh: [2887, 5025, 1609],
    },
    production: {
      low: [1987, 3640, 1300],
      mid: [1899, 3508, 1234],
      high: [1833, 3398, 1190],
      veryhigh: [1811, 3266, 1146],
    },
  };
  const p = Math.max(0, Math.min(1, Number(input.peakRatio) || 0));
  const o = Math.max(0, Math.min(1 - p, Number(input.offPeakRatio) || 0));
  const rates = data[input.tariff]?.[input.voltage] || data.business.low;
  return rates[0] * (1 - p - o) + rates[1] * p + rates[2] * o;
}

export function electricityBill(kwh, vat = 0.08, input = {}) {
  if (!finite(kwh) || Number(kwh) < 0)
    throw new RangeError("Số kWh phải không âm.");
  if (!finite(vat) || vat < 0 || vat > 0.2)
    throw new RangeError("VAT điện phải từ 0 đến 20%.");
  if (input.tariff && input.tariff !== "residential")
    return Number(kwh) * averageTariff(input) * (1 + Number(vat));
  let left = Number(kwh),
    total = 0;
  for (const [cap, rate] of TIERS) {
    const use = Math.min(left, cap);
    total += use * rate;
    left -= use;
    if (left <= 0) break;
  }
  return total * (1 + Number(vat));
}

export function billToKwh(bill, vat = 0.08, input = {}) {
  if (!finite(bill) || Number(bill) < 0)
    throw new RangeError("Tiền điện phải không âm.");
  if (!finite(vat) || vat < 0 || vat > 0.2)
    throw new RangeError("VAT điện phải từ 0 đến 20%.");
  if (input.tariff && input.tariff !== "residential")
    return Number(bill) / ((1 + Number(vat)) * averageTariff(input));
  let remaining = Number(bill) / (1 + Number(vat)),
    kwh = 0;
  for (const [cap, rate] of TIERS) {
    const energy = Math.min(cap, remaining / rate);
    kwh += energy;
    remaining -= energy * rate;
    if (remaining < 1e-8) break;
  }
  return kwh;
}

export function calculate(raw = {}, products = [], settings = {}) {
  const input = { ...DEFAULT_INPUT, ...raw };
  const errors = [],
    warnings = [];
  const warn = (code, level, message) =>
    warnings.push({ code, level, message });
  const ranges = {
    dayRatio: [0, 1],
    dayCoverage: [0, 1],
    nightCoverage: [0, 1],
    roofLength: [0.1, 100],
    roofWidth: [0.1, 100],
    specificYield: [1, 8],
    floors: [1, 20],
    panelWp: [100, 1000],
    panelLength: [0.5, 3],
    panelWidth: [0.5, 2],
    batteryCount: [0, 20],
    backupLoadKw: [0.1, 100],
    growth: [0, 0.3],
    exportPrice: [0, 20000],
  };
  const fieldNames = {
    dayRatio: "Tỷ lệ dùng ban ngày",
    dayCoverage: "Mục tiêu bù ngày",
    nightCoverage: "Mục tiêu bù đêm",
    roofLength: "Chiều dài mái",
    roofWidth: "Chiều rộng mái",
    specificYield: "Sản lượng riêng",
    floors: "Số tầng",
    panelWp: "Công suất tấm",
    panelLength: "Chiều dài tấm",
    panelWidth: "Chiều rộng tấm",
    batteryCount: "Số bộ pin",
    backupLoadKw: "Công suất tải dự phòng",
    growth: "Tăng giá điện",
    exportPrice: "Giá điện dư",
  };
  for (const [key, [lo, hi]] of Object.entries(ranges)) {
    if (
      !finite(input[key]) ||
      input[key] === "" ||
      Number(input[key]) < lo ||
      Number(input[key]) > hi
    )
      errors.push(`${fieldNames[key]} phải từ ${lo} đến ${hi}.`);
    else input[key] = Number(input[key]);
  }
  if (!Number.isInteger(Number(input.floors)))
    errors.push("Số tầng phải là số nguyên.");
  if (!input.batteryAuto && !Number.isInteger(Number(input.batteryCount)))
    errors.push("Số bộ pin phải là số nguyên.");
  if (!["bill", "kwh"].includes(input.inputMode))
    errors.push("Chọn nhập theo tiền hoặc kWh.");
  if (!["hybrid", "grid_tied"].includes(input.mode))
    errors.push("Loại hệ thống không hợp lệ.");
  if (!["auto", "portrait", "landscape"].includes(input.layout))
    errors.push("Kiểu bố trí mái không hợp lệ.");
  if (!["tin", "frame"].includes(input.mount))
    errors.push("Kiểu thi công không hợp lệ.");
  if (
    typeof input.batteryAuto !== "boolean" ||
    typeof input.surveyConfirmed !== "boolean"
  )
    errors.push("Trạng thái tự chọn pin hoặc khảo sát không hợp lệ.");
  if (![1, 3].includes(Number(input.phase)))
    errors.push("Chọn điện lưới 1 pha hoặc 3 pha.");
  if (![5, 10, 16].includes(Number(input.batteryCapacity)))
    errors.push("Chọn dung lượng pin 5, 10 hoặc 16 kWh.");
  if (!REGIONS.some((r) => r.id === input.region))
    errors.push("Chọn khu vực có trong danh mục.");
  if (!["residential", "business", "production"].includes(input.tariff))
    errors.push("Biểu giá điện không hợp lệ.");
  if (
    input.tariff !== "residential" &&
    (!finite(input.peakRatio) ||
      !finite(input.offPeakRatio) ||
      input.peakRatio < 0 ||
      input.offPeakRatio < 0 ||
      Number(input.peakRatio) + Number(input.offPeakRatio) > 1)
  )
    errors.push("Tổng tỷ trọng cao điểm và thấp điểm không vượt 100%.");
  const amount = Number(
    input.inputMode === "bill" ? input.monthlyBill : input.monthlyKwh,
  );
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > (input.inputMode === "bill" ? 500000000 : 100000)
  )
    errors.push(
      input.inputMode === "bill"
        ? "Nhập tiền điện lớn hơn 0 và không quá 500 triệu."
        : "Nhập số kWh lớn hơn 0 và không quá 100.000.",
    );
  const vatElectricity = Number(settings.vatElectricity ?? 0.08);
  const vatQuote = Number(settings.vatQuote ?? 0);
  if (!finite(vatElectricity) || vatElectricity < 0 || vatElectricity > 0.2)
    errors.push("VAT điện trong cài đặt phải từ 0 đến 20%.");
  if (!finite(vatQuote) || vatQuote < 0 || vatQuote > 0.2)
    errors.push("VAT báo giá trong cài đặt phải từ 0 đến 20%.");
  if (
    input.panelCountOverride !== "" &&
    input.panelCountOverride != null &&
    (!Number.isInteger(Number(input.panelCountOverride)) ||
      input.panelCountOverride < 1 ||
      input.panelCountOverride > 5000)
  )
    errors.push("Số tấm nhập tay phải là số nguyên từ 1 đến 5.000.");
  if (errors.length)
    return { input, valid: false, errors, warnings, rows: [], total: 0 };

  const monthlyKwh =
    input.inputMode === "kwh"
      ? amount
      : billToKwh(amount, vatElectricity, input);
  const monthlyBill = electricityBill(monthlyKwh, vatElectricity, input);
  const dailyKwh = monthlyKwh / 30,
    daytimeKwh = dailyKwh * input.dayRatio,
    nighttimeKwh = dailyKwh - daytimeKwh;
  const hasBattery = input.mode === "hybrid";
  const chargeEff = 0.96,
    dischargeEff = 0.96;
  const panel =
    products.find(
      (p) => p.id === input.panelId && active(p) && categoryIs(p, "panel"),
    ) ||
    products.find((p) => active(p) && categoryIs(p, "panel") && price(p) > 0);
  if (
    input.panelId &&
    !products.some((p) => p.id === input.panelId && active(p))
  )
    warn(
      "PANEL_NOT_FOUND",
      "error",
      "Model tấm đã chọn không còn trong danh mục đang hoạt động.",
    );
  if (panel?.wp && Math.abs(Number(panel.wp) - input.panelWp) > 0.1)
    warn(
      "PANEL_SPEC_MISMATCH",
      "warning",
      "Wp nhập tay khác model trong bảng giá; cần kiểm tra lại model và đơn giá.",
    );
  const batteries = products.filter(
    (p) => active(p) && categoryIs(p, "battery"),
  );
  const battery =
    batteries.find(
      (p) =>
        p.id === input.batteryId &&
        batteryKwh(p) === Number(input.batteryCapacity),
    ) ||
    batteries.find(
      (p) =>
        batteryKwh(p) === Number(input.batteryCapacity) &&
        price(p) > 0 &&
        price(p) !== 8888888,
    ) ||
    batteries.find((p) => batteryKwh(p) === Number(input.batteryCapacity));
  if (
    hasBattery &&
    input.batteryId &&
    !batteries.some(
      (p) =>
        p.id === input.batteryId &&
        batteryKwh(p) === Number(input.batteryCapacity),
    )
  )
    warn(
      "BATTERY_UNAVAILABLE",
      "error",
      "Model pin đã chọn không phù hợp dung lượng hoặc đã ngừng dùng.",
    );
  const dod =
    Number(battery?.dod) > 0 && Number(battery.dod) <= 1
      ? Number(battery.dod)
      : 0.9;
  const batteryRequiredKwh = hasBattery
    ? (nighttimeKwh * input.nightCoverage) / (dod * dischargeEff)
    : 0;
  const batteryCount = hasBattery
    ? input.batteryAuto
      ? Math.ceil(round(batteryRequiredKwh / input.batteryCapacity, 8))
      : input.batteryCount
    : 0;
  const batteryInstalledKwh = batteryCount * Number(input.batteryCapacity);
  const batteryUsableKwh = batteryInstalledKwh * dod * dischargeEff;
  // Include the energy needed to charge storage, rather than creating night energy for free.
  const dayTarget = daytimeKwh * input.dayCoverage;
  const nightTarget = hasBattery
    ? Math.min(nighttimeKwh * input.nightCoverage, batteryUsableKwh)
    : 0;
  // PV feeds the actual daytime load before charging: a lower day-coverage target
  // cannot reserve that same energy for the battery at the same time.
  const designDayEnergy =
    nightTarget > 0 ? Math.max(dayTarget, daytimeKwh) : dayTarget;
  const requiredKwp =
    (designDayEnergy + nightTarget / (chargeEff * dischargeEff)) /
    input.specificYield;
  const autoPanels = Math.max(
    1,
    Math.ceil(round((requiredKwp * 1000) / input.panelWp, 8)),
  );
  const panelCount =
    input.panelCountOverride !== "" && input.panelCountOverride != null
      ? Number(input.panelCountOverride)
      : autoPanels;
  const systemKwp = (panelCount * input.panelWp) / 1000;

  const usableLength = Math.max(0, input.roofLength - 0.2),
    usableWidth = Math.max(0, input.roofWidth - 0.2),
    gap = 0.02;
  const arrangement = (w, h, orientation) => {
    const columns = Math.max(0, Math.floor((usableLength + gap) / (w + gap)));
    const rows = Math.max(0, Math.floor((usableWidth + gap) / (h + gap)));
    return { columns, rows, capacity: columns * rows, orientation };
  };
  const portrait = arrangement(input.panelWidth, input.panelLength, "portrait"),
    landscape = arrangement(input.panelLength, input.panelWidth, "landscape");
  const roofLayout =
    input.layout === "portrait"
      ? portrait
      : input.layout === "landscape"
        ? landscape
        : portrait.capacity >= landscape.capacity
          ? portrait
          : landscape;
  const roofAreaAvailable = input.roofLength * input.roofWidth,
    roofAreaRequired = panelCount * input.panelLength * input.panelWidth;
  const roofSufficient = panelCount <= roofLayout.capacity;
  if (!roofSufficient)
    warn(
      "ROOF_AREA_INSUFFICIENT",
      "error",
      `Cần ${panelCount} tấm, mái xếp được ${roofLayout.capacity} tấm sau khi chừa lề 10 cm. Cần thêm mái, chọn Wp khác hoặc giảm số tấm.`,
    );

  const minimumInverter = systemKwp / 1.3;
  const tiers = [3, 5, 6, 8, 10, 12, 15, 20, 25, 30, 50, 100];
  const recommendedInverterKw =
    tiers.find((k) => k >= minimumInverter) || Math.ceil(minimumInverter);
  const inverters = products.filter(
    (p) =>
      active(p) &&
      categoryIs(p, "inverter") &&
      ratedKw(p) > 0 &&
      (!p.phase || Number(p.phase) === Number(input.phase)) &&
      (!p.type || p.type === input.mode || p.type === "hybrid"),
  );
  const inverter =
    inverters.find((p) => p.id === input.inverterId) ||
    inverters
      .filter((p) => ratedKw(p) >= minimumInverter)
      .sort(
        (a, b) =>
          ratedKw(a) - ratedKw(b) ||
          (price(a) === 8888888) - (price(b) === 8888888) ||
          price(a) - price(b),
      )[0];
  if (input.inverterId && !inverters.some((p) => p.id === input.inverterId))
    warn(
      "INVERTER_UNAVAILABLE",
      "error",
      "Biến tần đã chọn không phù hợp pha/loại hệ hoặc đã ngừng dùng.",
    );
  const inverterKw = inverter ? ratedKw(inverter) : recommendedInverterKw;
  if (!inverter)
    warn(
      "INVERTER_MODEL_MISSING",
      "error",
      `Chưa có model biến tần ${input.phase} pha phù hợp từ ${round(minimumInverter)} kW trong danh mục. Cần bổ sung giá và datasheet.`,
    );
  if (inverter && !inverter.phase)
    warn(
      "INVERTER_PHASE_UNCONFIRMED",
      "error",
      "Danh mục chưa xác nhận số pha của biến tần. Cần đối chiếu datasheet trước khi phát hành.",
    );
  if (systemKwp > (Number(inverter?.maxDcKw) || inverterKw * 1.3) + 0.00001)
    warn(
      "INVERTER_UNDERPOWERED",
      "error",
      "Công suất PV vượt giới hạn DC của biến tần đang chọn.",
    );
  if (Number(input.phase) === 1 && inverterKw > 10)
    warn(
      "GRID_PHASE_LIMIT",
      "warning",
      "Hệ 1 pha công suất lớn: cần kiểm tra công tơ, dây dẫn, bảo vệ và điều kiện đấu nối thực tế.",
    );
  if (hasBattery && batteryCount > 20)
    warn(
      "BATTERY_COUNT_LIMIT",
      "error",
      "Cấu hình cần hơn 20 bộ pin; cần kỹ thuật lập phương án riêng.",
    );
  if (
    hasBattery &&
    batteryUsableKwh + 0.001 < nighttimeKwh * input.nightCoverage
  )
    warn(
      "BATTERY_INSUFFICIENT",
      "warning",
      `Pin hữu dụng ${round(batteryUsableKwh)} kWh, thấp hơn mục tiêu đêm ${round(nighttimeKwh * input.nightCoverage)} kWh/ngày.`,
    );
  if (
    hasBattery &&
    batteryRequiredKwh > 0 &&
    batteryInstalledKwh > batteryRequiredKwh * 1.8
  )
    warn(
      "BATTERY_OVERSIZED",
      "info",
      "Dung lượng pin cao hơn nhu cầu đêm dự kiến; cân nhắc bộ nhỏ hơn để tối ưu chi phí.",
    );
  const backupRuntimeHours = batteryUsableKwh / input.backupLoadKw;
  if (
    hasBattery &&
    Number(battery?.maxDischargeKw) > 0 &&
    input.backupLoadKw > Number(battery.maxDischargeKw) * batteryCount
  )
    warn(
      "BATTERY_POWER_LIMIT",
      "error",
      "Tải dự phòng vượt công suất xả của các bộ pin đã chọn.",
    );
  if (hasBattery && input.backupLoadKw > inverterKw)
    warn(
      "BACKUP_POWER_LIMIT",
      "error",
      "Tải dự phòng nhập vào vượt công suất liên tục của biến tần.",
    );

  const dailyGeneration = systemKwp * input.specificYield;
  const directEnergy = Math.min(dailyGeneration, daytimeKwh);
  const availableCharge = Math.max(0, dailyGeneration - directEnergy);
  const dischargeEnergy = hasBattery
    ? Math.min(
        nighttimeKwh,
        batteryUsableKwh,
        availableCharge * chargeEff * dischargeEff,
      )
    : 0;
  const chargeEnergy = dischargeEnergy / (chargeEff * dischargeEff);
  const surplusEnergy = Math.max(
    0,
    dailyGeneration - directEnergy - chargeEnergy,
  );
  const monthlySelfConsumed = (directEnergy + dischargeEnergy) * 30;
  const monthlyRemainingKwh = Math.max(0, monthlyKwh - monthlySelfConsumed);
  const monthlyBillAfter = electricityBill(
    monthlyRemainingKwh,
    vatElectricity,
    input,
  );
  const exportIncome = surplusEnergy * 30 * input.exportPrice;
  const monthlySavings = Math.max(
    0,
    monthlyBill - monthlyBillAfter + exportIncome,
  );
  if (input.exportPrice > 0)
    warn(
      "EXPORT_PRICE_ASSUMPTION",
      "warning",
      "Đang giả định được bán điện dư. Chỉ sử dụng sau khi xác nhận cơ chế và điều kiện mua điện của công trình.",
    );
  if (hasBattery && dischargeEnergy + 0.05 < nighttimeKwh * input.nightCoverage)
    warn(
      "NIGHT_COVERAGE_SHORTFALL",
      "warning",
      "Điện cấp đêm chưa đạt mục tiêu; cần kiểm tra lại sản lượng PV, dung lượng và số bộ pin.",
    );
  if (input.dayRatio < 0.4 && !hasBattery)
    warn(
      "LOW_DAYTIME_USAGE",
      "warning",
      "Tải ngày thấp và không có lưu trữ: có thể dư nhiều điện mặt trời, giảm hiệu quả đầu tư.",
    );
  if (!input.surveyConfirmed)
    warn(
      "MISSING_REAL_SURVEY",
      "info",
      "Phương án sơ bộ, chưa thay thế khảo sát mái, kết cấu và kiểm tra điện áp/dòng từng chuỗi.",
    );
  if (input.floors > 10)
    warn(
      "WIRE_ESTIMATE_EXTENDED",
      "info",
      "Định mức dây nguồn chỉ có tầng 1–10. Các tầng cao hơn đang ước tính tăng 20 m/tầng/chuỗi, cần đo thực tế.",
    );

  const strings = Math.ceil(panelCount / 10),
    roofRowsUsed = Math.ceil(panelCount / Math.max(1, roofLayout.columns));
  const railCount = 3 * (panelCount + roofRowsUsed),
    edgeClamps = roofRowsUsed * 4,
    midClamps = Math.max(0, 2 * (panelCount - roofRowsUsed));
  const wireTable = settings.wireByFloor ||
    settings.wire || {
      1: 30,
      2: 50,
      3: 70,
      4: 90,
      5: 120,
      6: 150,
      7: 170,
      8: 190,
      9: 210,
      10: 230,
    };
  const wireMeters =
    strings *
    (Number(wireTable[input.floors]) ||
      230 + Math.max(0, input.floors - 10) * 20);
  const rows = [];
  const add = (id, name, unit, qty, product, priceOverride) => {
    if (!(qty > 0)) return;
    rows.push({
      id,
      productId: product?.id || null,
      name,
      model: product?.model || "",
      unit,
      qty,
      price: priceOverride ?? price(product),
      verified:
        product?.verified === true &&
        (priceOverride != null || price(product) > 0),
      image: product?.image || "",
      warranty: product?.warranty || "",
      description: product?.description || "",
    });
  };
  const material = (key) =>
    products.find((p) => active(p) && p.category === key && price(p) > 0) ||
    products.find((p) => active(p) && p.category === key);
  add(
    "panel",
    `Tấm pin ${panel?.brand || ""} ${input.panelWp} Wp`,
    "tấm",
    panelCount,
    panel,
  );
  add(
    "inv",
    `Biến tần ${inverter?.brand || ""} ${inverterKw} kW · ${input.phase} pha`,
    "bộ",
    1,
    inverter,
  );
  if (hasBattery)
    add(
      "bat",
      `Pin lưu trữ ${battery?.brand || ""} ${input.batteryCapacity} kWh`,
      "bộ",
      batteryCount,
      battery,
    );
  add("cab", "Tủ điện bảo vệ", "bộ", 1, material("cab"));
  if (input.mount === "frame")
    add(
      "frame",
      "Kẹp U / vật tư khung",
      "cái",
      panelCount * 6,
      material("frame"),
    );
  else {
    add("rail", "Rail nhôm", "thanh", railCount, material("rail"));
    add("kbia", "Kẹp biên", "bộ", edgeClamps, material("kbia"));
    add("kgiua", "Kẹp giữa", "bộ", midClamps, material("kgiua"));
  }
  add(
    "mc4",
    "Cặp đầu nối MC4",
    "cặp",
    strings * 2 + Math.max(0, roofRowsUsed - strings),
    material("mc4"),
  );
  add("wr", "Dây DC 4.0 mm đỏ", "m", wireMeters, material("wr"));
  add("wb", "Dây DC 4.0 mm đen", "m", wireMeters, material("wb"));
  for (const [key, name] of [
    ["truck", "Vận chuyển"],
    ["misc", "Vật tư phụ"],
    ["labor", "Nhân công lắp đặt"],
  ]) {
    const configured = Number(
      settings[`${key}PerKw`] ??
        settings.installationRates?.[key] ??
        settings.rate?.[key] ??
        500000,
    );
    add(
      key,
      name,
      "hệ",
      1,
      material(key),
      Math.max(0, configured) * inverterKw,
    );
  }
  const missing = rows.filter((r) => r.price <= 0);
  if (missing.length)
    warn(
      "PRICE_MISSING",
      "error",
      `Chưa có đơn giá: ${missing.map((r) => r.name).join(", ")}.`,
    );
  if (rows.some((r) => !r.verified))
    warn(
      "PRICE_UNVERIFIED",
      "warning",
      "Một số giá/model từ file nguồn chưa được quản lý xác minh. Chỉ tạo báo giá nháp cho đến khi được duyệt.",
    );
  if (rows.some((r) => r.price === 8888888 || r.price === 1111111111))
    warn(
      "SUSPICIOUS_SOURCE_PRICE",
      "error",
      "Có giá nguồn dạng 8.888.888 hoặc 1.111.111.111, cần xác minh trước khi phát hành.",
    );
  const subtotal = rows.reduce((sum, row) => sum + row.qty * row.price, 0);
  const pricesIncludeVat =
    settings.quotePricesIncludeVat ?? settings.pricesIncludeVat ?? true;
  const vatAmount = pricesIncludeVat === false ? subtotal * vatQuote : 0;
  const total = subtotal + vatAmount;
  const roiMonths = monthlySavings > 0 ? total / monthlySavings : null;
  const cashflow = Array.from({ length: 26 }, (_, year) => ({
    year,
    savings: year
      ? (monthlySavings * 12 * ((1 + input.growth) ** year - 1)) /
        (input.growth || 1)
      : 0,
  }));
  if (!input.growth)
    cashflow.forEach((point) => {
      point.savings = point.year * monthlySavings * 12;
    });
  return {
    input,
    valid: true,
    errors: [],
    warnings,
    publishable:
      !warnings.some((w) => w.level === "error") &&
      rows.every((r) => r.verified),
    monthlyKwh,
    monthlyBill,
    dailyKwh,
    daytimeKwh,
    nighttimeKwh,
    requiredKwp,
    autoPanels,
    panelCount,
    systemKwp,
    recommendedInverterKw,
    inverterKw,
    inverterId: inverter?.id,
    roofAreaAvailable,
    roofAreaRequired,
    roofLayout,
    roofSufficient,
    batteryRequiredKwh,
    batteryCount,
    batteryKwh: batteryInstalledKwh,
    batteryInstalledKwh,
    batteryUsableKwh,
    backupRuntimeHours,
    dailyGeneration,
    monthlyGeneration: dailyGeneration * 30,
    yearlyGeneration: dailyGeneration * 365,
    directEnergy,
    chargeEnergy,
    dischargeEnergy,
    surplusEnergy,
    monthlySelfConsumed,
    monthlyRemainingKwh,
    monthlyBillAfter,
    monthlySavings,
    yearlySavings: monthlySavings * 12,
    exportIncome,
    savingsPercent: monthlyBill
      ? ((monthlyBill - monthlyBillAfter) / monthlyBill) * 100
      : 0,
    rows,
    subtotal,
    vatAmount,
    total,
    roiMonths,
    roiYears: roiMonths == null ? null : roiMonths / 12,
    cashflow,
    strings,
    wireMeters,
    railCount,
    edgeClamps,
    midClamps,
    assumptions: [
      "Biểu giá nguồn QĐ 1279/QĐ-BCT; cần đối chiếu hóa đơn/biểu giá thực tế.",
      `VAT điện ${round(vatElectricity * 100)}%; khác với VAT thiết bị.`,
      `Sản lượng riêng ${input.specificYield} kWh/kWp/ngày là giả định khu vực, không phải dữ liệu đo của công trình.`,
      "Mô hình trung bình 30 ngày/tháng; không mô phỏng bóng che theo giờ, suy giảm tấm hoặc thay pin.",
      `DoD pin ${round(dod * 100)}%, hiệu suất sạc/xả mỗi chiều 96%.`,
      "Số chuỗi tối đa 10 tấm theo quy tắc nguồn; kỹ thuật phải kiểm tra điện áp, dòng và MPPT theo model.",
      "Hoàn vốn đơn giản; biểu đồ 25 năm giả định tăng giá điện, chưa trừ bảo trì/thay thế.",
    ],
  };
}
