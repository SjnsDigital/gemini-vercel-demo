const officialLogoURL = new URL("../assets/brand-logo.png", import.meta.url)
  .href;
const MAX_TOKEN = 180000;
const MAX_BYTES = 250000;
const INPUT_FIELDS = [
  "mode",
  "inputMode",
  "bill",
  "monthlyBill",
  "monthlyBillWithVat",
  "kwh",
  "monthlyKwh",
  "dayRatio",
  "dayUsageRatio",
  "roofL",
  "roofW",
  "roofLength",
  "roofWidth",
  "roofLengthM",
  "roofWidthM",
  "region",
  "regionId",
  "sun",
  "specificYield",
  "specificYieldKwhPerKwpDay",
  "floors",
  "phase",
  "gridPhase",
  "system",
  "systemMode",
  "hybrid",
  "hasBattery",
  "batteryCapacity",
  "batteryCapacityKwh",
  "batteryCount",
  "batteryAuto",
  "nightCoverage",
  "nightCoverageRatio",
  "dayCoverage",
  "dayCoverageRatio",
  "panelId",
  "panelWp",
  "wp",
  "panelLength",
  "panelWidth",
  "panelLengthM",
  "panelWidthM",
  "inverterId",
  "batteryId",
  "growth",
  "electricityPriceGrowth",
  "vatRate",
  "orientation",
  "roofOrientation",
  "yieldFactor",
  "tariff",
  "voltage",
  "peakRatio",
  "offPeakRatio",
  "layout",
  "panelCountOverride",
  "backupLoadKw",
  "mount",
  "surveyConfirmed",
  "exportPrice",
];
const RESULT_FIELDS = [
  "valid",
  "panelCount",
  "systemKwp",
  "inverterKw",
  "batteryCount",
  "batteryKwh",
  "batteryRequiredKwh",
  "batteryUsableKwh",
  "dailyGeneration",
  "monthlyGeneration",
  "yearlyGeneration",
  "monthlySavings",
  "yearlySavings",
  "total",
  "roiYears",
  "roofAreaAvailable",
  "roofAreaRequired",
  "roofSufficient",
  "monthlyKwh",
  "monthlyBill",
  "savingsPercent",
  "publishable",
];
const pick = (obj, fields) =>
  Object.fromEntries(
    fields
      .filter(
        (k) =>
          obj?.[k] !== undefined &&
          ["string", "number", "boolean"].includes(typeof obj[k]),
      )
      .map((k) => [k, obj[k]]),
  );
const bounded = (v, max = 1000) => String(v ?? "").slice(0, max);
const encoder = new TextEncoder();
function b64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function unb64(s) {
  if (!/^[A-Za-z0-9_-]+$/.test(s))
    throw Error("Liên kết chứa dữ liệu không hợp lệ.");
  return Uint8Array.from(
    atob(s.replaceAll("-", "+").replaceAll("_", "/")),
    (c) => c.charCodeAt(0),
  );
}
async function digest(s) {
  return [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(s))),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function transform(bytes, format, compress) {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(
      compress
        ? new CompressionStream(format)
        : new DecompressionStream(format),
    );
  const reader = stream.getReader(),
    chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw Error("Liên kết vượt dung lượng cho phép.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const part of chunks) {
    all.set(part, offset);
    offset += part.length;
  }
  return all;
}
export function publicPlan(plan) {
  const result = plan?.result || {};
  return {
    name: "Phương án điện mặt trời",
    input: pick(plan?.input || result.input || {}, INPUT_FIELDS),
    result: {
      ...pick(result, RESULT_FIELDS),
      warnings: (result.warnings || []).slice(0, 30).map((w) =>
        typeof w === "string"
          ? { level: "warning", message: bounded(w) }
          : {
              code: bounded(w.code, 80),
              level: ["info", "warning", "error"].includes(w.level)
                ? w.level
                : "warning",
              message: bounded(w.message || w.text),
            },
      ),
      assumptions: (result.assumptions || [])
        .slice(0, 3)
        .map((x) => bounded(x)),
      rows: (result.rows || []).slice(0, 40).map((r) => ({
        id: bounded(r.id, 80),
        name: bounded(r.name, 200),
        model: bounded(r.model, 1000),
        unit: bounded(r.unit, 30),
        qty: Number(r.qty) || 0,
        price: Number(r.price) || 0,
        verified: !!r.verified,
        warranty: bounded(r.warranty, 1000),
      })),
    },
  };
}
export async function encodeShare(plan, settings = {}, expiresDays = 90) {
  if (!plan?.result) throw Error("Chưa có phương án để chia sẻ.");
  if (!Number.isFinite(expiresDays) || expiresDays < 1 || expiresDays > 365)
    throw Error("Hiệu lực liên kết phải từ 1–365 ngày.");
  const envelope = {
    version: 1,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiresDays * 86400000).toISOString(),
    plan: publicPlan(plan),
    company: {
      name: bounded(
        settings.companyName || "CÔNG TY TNHH NĂNG LƯỢNG KIM SOLAR",
        200,
      ),
      phone: bounded(settings.salesPhone || "0987000783", 30),
      salesName: bounded(settings.salesName || "Nhân Viên Kinh Doanh", 100),
      email: bounded(settings.email || "cskh.kimsolar@gmail.com", 100),
    },
  };
  const payload = JSON.stringify(envelope);
  if (encoder.encode(payload).length > MAX_BYTES / 2)
    throw Error("Phương án quá lớn để tạo liên kết tự chứa.");
  const raw = encoder.encode(
    JSON.stringify({ payload, checksum: await digest(payload) }),
  );
  return typeof CompressionStream !== "undefined"
    ? "z1." + b64(await transform(raw, "deflate", true))
    : "j1." + b64(raw);
}
export async function decodeShare(token) {
  if (typeof token !== "string" || token.length > MAX_TOKEN || !token.length)
    throw Error("Liên kết chia sẻ không hợp lệ.");
  try {
    const [kind, data, ...extra] = token.split(".");
    if (extra.length || !["z1", "j1"].includes(kind)) throw Error();
    let bytes = unb64(data);
    if (kind === "z1") {
      if (typeof DecompressionStream === "undefined")
        throw Error(
          "Trình duyệt chưa hỗ trợ giải nén liên kết. Vui lòng dùng trình duyệt mới hơn.",
        );
      bytes = await transform(bytes, "deflate", false);
    }
    if (bytes.length > MAX_BYTES) throw Error();
    const wrapped = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (
      typeof wrapped.payload !== "string" ||
      wrapped.checksum !== (await digest(wrapped.payload))
    )
      throw Error("Dữ liệu liên kết đã thay đổi hoặc bị lỗi.");
    const value = JSON.parse(wrapped.payload);
    if (
      value.version !== 1 ||
      !value.plan?.input ||
      !value.plan?.result ||
      !Array.isArray(value.plan.result.rows) ||
      value.plan.result.rows.length > 40
    )
      throw Error();
    if (
      !Number.isFinite(Date.parse(value.expiresAt)) ||
      !Number.isFinite(Date.parse(value.createdAt))
    )
      throw Error();
    if (Date.parse(value.expiresAt) < Date.now())
      throw Error(
        "Liên kết đã hết hiệu lực. Hãy liên hệ nhân viên kinh doanh.",
      );
    if (
      Date.parse(value.createdAt) > Date.now() + 86400000 ||
      Date.parse(value.expiresAt) > Date.parse(value.createdAt) + 366 * 86400000
    )
      throw Error();
    for (const key of RESULT_FIELDS) {
      const n = value.plan.result[key];
      if (
        n !== undefined &&
        !["valid", "roofSufficient", "publishable"].includes(key) &&
        (!Number.isFinite(n) || n < 0)
      )
        throw Error();
    }
    for (const r of value.plan.result.rows)
      if (
        !Number.isFinite(r.qty) ||
        !Number.isFinite(r.price) ||
        r.qty < 0 ||
        r.price < 0 ||
        r.price > 1e12
      )
        throw Error();
    return {
      ...value,
      plan: publicPlan(value.plan),
      company: {
        name: bounded(value.company?.name, 200),
        phone: bounded(value.company?.phone, 30),
        salesName: bounded(value.company?.salesName, 100),
        email: bounded(value.company?.email, 100),
      },
    };
  } catch (e) {
    if (
      e.message &&
      /hết hiệu lực|Trình duyệt|đã thay đổi|vượt dung lượng/.test(e.message)
    )
      throw e;
    throw Error(
      "Không đọc được liên kết chia sẻ. Dữ liệu không đúng định dạng hoặc bị lỗi.",
    );
  }
}
export async function getSharedPlan() {
  if (typeof location === "undefined") return null;
  const hash = new URLSearchParams(location.hash.slice(1));
  const token =
    hash.get("share") || new URLSearchParams(location.search).get("d");
  return token ? decodeShare(token) : null;
}
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const fmt = (n) => Math.round(n || 0).toLocaleString("vi-VN");
function rounded(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}
function wrap(ctx, text, x, y, max, line = 32, maxLines = 8) {
  const words = String(text).split(/\s+/);
  let str = "",
    lines = 0;
  for (const word of words) {
    if (ctx.measureText(str + word).width > max && str) {
      ctx.fillText(str.trim(), x, y);
      y += line;
      str = "";
      lines++;
      if (lines >= maxLines) return y;
    }
    str += word + " ";
  }
  if (str) ctx.fillText(str.trim(), x, y);
  return y + line;
}
export async function renderSummaryImage(plan, settings = {}) {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1440;
  const ctx = c.getContext("2d");
  const r = plan.result || {},
    pv = r.systemKwp || 0,
    saving = r.monthlySavings || 0,
    total = r.total ?? r.totalInvestmentWithVat ?? 0;
  ctx.fillStyle = "#f5f3ee";
  ctx.fillRect(0, 0, 1080, 1440);
  rounded(ctx, 40, 40, 1000, 1360, 32, "#ffffff");
  rounded(ctx, 40, 40, 1000, 480, 32, "#143554");
  ctx.fillRect(40, 450, 1000, 70);
  const logo = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Không tải được logo Kim Solar. Vui lòng thử lại."));
    img.src = officialLogoURL;
  });
  rounded(ctx, 66, 65, 335, 130, 17, "#ffffff");
  ctx.drawImage(logo, 80, 72, 307, (307 * 278) / 720);
  ctx.font = "500 18px system-ui";
  ctx.fillStyle = "#b8d6ed";
  ctx.fillText("GIẢI PHÁP ĐIỆN MẶT TRỜI", 75, 207);
  ctx.font = "700 76px system-ui";
  ctx.fillStyle = "white";
  ctx.fillText(
    pv.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + " kWp",
    75,
    308,
  );
  ctx.font = "400 27px system-ui";
  ctx.fillStyle = "#c3daed";
  ctx.fillText(
    `${r.panelCount || 0} tấm pin · Biến tần ${r.inverterKw || r.recommendedInverterKw || 0} kW`,
    75,
    365,
  );
  ctx.fillText(
    (r.batteryKwh || r.batteryInstalledKwh || 0) > 0
      ? `Lưu trữ ${fmt(r.batteryKwh || r.batteryInstalledKwh)} kWh · Hệ Hybrid`
      : "Hòa lưới tự dùng · Không lưu trữ",
    75,
    412,
  );
  const blocks = [
    ["TIẾT KIỆM DỰ KIẾN", fmt(saving) + " đ/tháng"],
    [
      "SẢN LƯỢNG DỰ KIẾN",
      fmt(r.monthlyGeneration || r.monthlyGenerationKwh) + " kWh/tháng",
    ],
    ["TỔNG ĐẦU TƯ TẠM TÍNH", fmt(total) + " đ"],
    [
      "HOÀN VỐN ĐƠN GIẢN",
      r.roiYears || r.paybackYears
        ? (r.roiYears || r.paybackYears).toLocaleString("vi-VN", {
            maximumFractionDigits: 1,
          }) + " năm"
        : "Cần xác nhận giá",
    ],
  ];
  blocks.forEach(([label, value], i) => {
    const x = 75 + (i % 2) * 470,
      y = 580 + Math.floor(i / 2) * 165;
    rounded(ctx, x, y, 455, 145, 16, "#f5f5ef");
    ctx.fillStyle = "#778079";
    ctx.font = "600 18px system-ui";
    ctx.fillText(label, x + 22, y + 39);
    ctx.fillStyle = i === 0 ? "#317957" : "#19373b";
    ctx.font = "700 31px system-ui";
    ctx.fillText(value, x + 22, y + 91);
  });
  ctx.fillStyle = "#7b684e";
  ctx.font = "400 21px system-ui";
  let y = wrap(
    ctx,
    "Ước tính theo điều kiện và dữ liệu đã nhập; không thay thế khảo sát kỹ thuật. Giá, thuế và phạm vi thi công cần được xác nhận.",
    75,
    975,
    925,
    32,
    4,
  );
  if ((r.warnings || []).length) {
    ctx.fillStyle = "#a65a35";
    ctx.font = "600 20px system-ui";
    y = wrap(
      ctx,
      "Lưu ý: " +
        (typeof r.warnings[0] === "string"
          ? r.warnings[0]
          : r.warnings[0].message),
      75,
      y + 20,
      925,
      31,
      3,
    );
  }
  ctx.fillStyle = "#d9dfd5";
  ctx.fillRect(75, 1207, 930, 1);
  ctx.fillStyle = "#19373b";
  ctx.font = "700 32px system-ui";
  ctx.fillText(settings.salesPhone || "0987000783", 75, 1274);
  ctx.fillStyle = "#78847c";
  ctx.font = "400 23px system-ui";
  ctx.fillText(settings.salesName || "Nhân Viên Kinh Doanh", 75, 1317);
  ctx.font = "400 18px system-ui";
  ctx.fillText(
    new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    830,
    1320,
  );
  return new Promise((resolve, reject) =>
    c.toBlob(
      (blob) => (blob ? resolve(blob) : reject(Error("Không tạo được ảnh."))),
      "image/png",
    ),
  );
}
