const SCALES = {
  d: 1,
  dong: 1,
  vnd: 1,
  k: 1000,
  nghin: 1000,
  ngan: 1000,
  tr: 1000000,
  trieu: 1000000,
  m: 1000000,
  ty: 1000000000,
  ti: 1000000000,
  b: 1000000000,
};
const invalid = (error) => ({ valid: false, value: null, empty: false, error });
const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đ₫]/g, "d")
    .trim();

function decimalNumber(source, unitScale) {
  let text = source.trim();
  if (/^[.,]\d+$/.test(text)) text = "0" + text;
  if (!/^\d[\d.,\s]*$/.test(text)) return null;
  if (/\s/.test(text)) {
    if (!/^\d{1,3}(?:\s\d{3})+(?:[.,]\d+)?$/.test(text)) return null;
    text = text.replace(/\s/g, "");
  }
  const separators = [...text.matchAll(/[.,]/g)];
  if (!separators.length) return Number(text);
  if (separators.length === 1) {
    // A single separator is decimal for shorthand: 2.675 = 2.675 triệu.
    // Explicit đồng makes conventional 2.675đ mean 2,675 đồng.
    if (unitScale === 1 && /^\d{1,3}[.,]\d{3}$/.test(text))
      return Number(text.replace(/[.,]/g, ""));
    return /^\d+[.,]\d*$/.test(text) ? Number(text.replace(",", ".")) : null;
  }
  if (/^\d{1,3}(?:\.\d{3})+$/.test(text) || /^\d{1,3}(?:,\d{3})+$/.test(text))
    return Number(text.replace(/[.,]/g, ""));
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(text))
    return Number(text.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(?:,\d{3})+\.\d+$/.test(text))
    return Number(text.replace(/,/g, ""));
  return null;
}

/** Vietnamese money shorthand. Small bare values use triệu; full VND stays full. */
export function parseMoney(
  value,
  { defaultScale = 1000000, min = 0, max = 1000000000000 } = {},
) {
  const text = normalize(value);
  if (!text) return { valid: true, value: "", empty: true, error: "" };
  if (text.length > 80 || !Number.isFinite(defaultScale) || defaultScale <= 0)
    return invalid("Giá trị tiền không hợp lệ.");
  if (text.includes("-") || text.includes("+"))
    return invalid("Nhập số tiền không âm.");
  let amount,
    explicitScale = null;
  const compound = text.match(
    /^(\d+(?:[.,]\d+)?)\s*(trieu|tr|m|ty|ti|b|nghin|ngan|k)\s*(\d{1,6})$/,
  );
  if (compound) {
    explicitScale = SCALES[compound[2]];
    amount =
      (Number(compound[1].replace(",", ".")) + Number("0." + compound[3])) *
      explicitScale;
  } else {
    const match = text.match(
      /^([\d.,\s]+?)\s*(dong|vnd|trieu|tr|m|ty|ti|b|nghin|ngan|k|d)?$/,
    );
    if (!match)
      return invalid("Dùng dạng 2.2, 2tr2, 500k hoặc số tiền đầy đủ.");
    explicitScale = match[2] ? SCALES[match[2]] : null;
    const raw = decimalNumber(match[1], explicitScale);
    if (raw === null || !Number.isFinite(raw))
      return invalid("Dấu phân cách số tiền chưa hợp lệ.");
    const grouped =
      /(?:\d{1,3}(?:[.,]\d{3}){2,}|\d{1,3}(?:\s\d{3})+)(?:[.,]\d+)?$/.test(
        match[1].trim(),
      );
    amount =
      raw * (explicitScale ?? (grouped || raw >= 1000 ? 1 : defaultScale));
  }
  amount = Math.round(amount);
  if (!Number.isSafeInteger(amount) || amount < min || amount > max)
    return invalid(`Số tiền cần từ ${formatVnd(min)} đến ${formatVnd(max)}.`);
  return { valid: true, value: amount, empty: false, error: "" };
}

export function formatVnd(value) {
  return (
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(
      Number(value) || 0,
    ) + " đ"
  );
}

export function formatMoneyInput(value, { defaultScale = 1000000 } = {}) {
  if (value === "" || value == null) return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  if (amount === 0) return "0";
  // Exact VND suffix protects low values from the small-number triệu shortcut.
  if (amount < 1000 || amount / defaultScale >= 1000)
    return String(amount) + "đ";
  if (amount >= defaultScale / 1000)
    return String(Number((amount / defaultScale).toFixed(6)));
  return String(amount) + "đ";
}
