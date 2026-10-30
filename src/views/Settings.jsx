import React, { useEffect, useRef, useState } from "react";
import {
  Building2,
  Database,
  Download,
  Upload,
  ShieldCheck,
  HardDrive,
  ArrowRight,
  Check,
  AlertTriangle,
  Trash2,
  SlidersHorizontal,
  FileSpreadsheet,
  X,
} from "lucide-react";
import "./settings.css";
import MoneyInput from "../components/MoneyInput.jsx";

const TABLES = [
  "customers",
  "products",
  "plans",
  "quotes",
  "tickets",
  "tasks",
  "activities",
];
const CATEGORY_KEYS = [
  "panel",
  "inv",
  "bat",
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
];
const CSV_FIELDS = [
  "id",
  "category",
  "brand",
  "model",
  "description",
  "price",
  "purchasePrice",
  "verified",
  "active",
  "wp",
  "length",
  "width",
  "kw",
  "maxDcKw",
  "phase",
  "capacity",
  "dod",
  "image",
  "warranty",
];
const NUMERIC_FIELDS = [
  "price",
  "purchasePrice",
  "wp",
  "length",
  "width",
  "kw",
  "maxDcKw",
  "phase",
  "capacity",
  "dod",
];
const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const timestamp = () => new Date().toISOString();
const archive = (db) => ({
  app: "kimsolar-workspace",
  version: 1,
  exportedAt: timestamp(),
  db,
});

function download(contents, name, type) {
  const file = new Blob([contents], { type });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function validateBackup(value) {
  if (
    !object(value) ||
    value.app !== "kimsolar-workspace" ||
    value.version !== 1 ||
    !object(value.db)
  )
    throw new Error(
      "File không phải bản sao lưu Kim Solar Workspace phiên bản 1.",
    );
  const data = value.db;
  if (!object(data.settings))
    throw new Error("File thiếu phần cấu hình công ty.");
  for (const table of TABLES) {
    if (!Array.isArray(data[table]) || data[table].length > 50000)
      throw new Error(
        `Dữ liệu ${table} không hợp lệ hoặc vượt giới hạn 50.000 bản ghi.`,
      );
    const ids = new Set();
    for (const row of data[table]) {
      if (
        !object(row) ||
        typeof row.id !== "string" ||
        !row.id.trim() ||
        row.id.length > 200 ||
        ids.has(row.id)
      )
        throw new Error(
          `Có mã trống, trùng hoặc bản ghi không hợp lệ trong ${table}.`,
        );
      for (const field of [
        "name",
        "title",
        "status",
        "stage",
        "phone",
        "tel",
        "email",
        "address",
        "brand",
        "model",
        "description",
        "priority",
      ])
        if (row[field] != null && typeof row[field] !== "string")
          throw new Error(`Trường ${field} trong ${table} phải là văn bản.`);
      ids.add(row.id);
    }
  }
  for (const product of data.products) {
    if (
      !CATEGORY_KEYS.includes(product.category) ||
      typeof product.brand !== "string" ||
      !Number.isFinite(product.price) ||
      product.price < 0 ||
      product.price > 1e12
    )
      throw new Error(
        "Danh mục sản phẩm có nhóm, hãng hoặc đơn giá không hợp lệ.",
      );
    for (const field of ["model", "description", "image", "warranty"])
      if (product[field] != null && typeof product[field] !== "string")
        throw new Error(`Thuộc tính ${field} của sản phẩm phải là văn bản.`);
    for (const field of [
      "purchasePrice",
      "wp",
      "length",
      "width",
      "kw",
      "maxDcKw",
      "phase",
      "capacity",
      "dod",
    ])
      if (
        product[field] != null &&
        (!Number.isFinite(product[field]) || product[field] < 0)
      )
        throw new Error(`Thông số ${field} của sản phẩm không hợp lệ.`);
    if (product.phase != null && ![1, 3].includes(product.phase))
      throw new Error("Số pha sản phẩm chỉ được là 1 hoặc 3.");
    if (product.dod != null && product.dod > 1)
      throw new Error("DoD sản phẩm phải nằm trong khoảng 0–1.");
    for (const field of ["active", "verified"])
      if (product[field] != null && typeof product[field] !== "boolean")
        throw new Error(`Thuộc tính ${field} của sản phẩm phải là true/false.`);
  }
  for (const field of [
    "companyName",
    "address",
    "taxCode",
    "email",
    "salesName",
    "salesPhone",
    "website",
  ])
    if (
      data.settings[field] != null &&
      typeof data.settings[field] !== "string"
    )
      throw new Error(`Cấu hình ${field} phải là văn bản.`);
  for (const field of ["vatElectricity", "vatQuote"])
    if (
      data.settings[field] != null &&
      (!Number.isFinite(data.settings[field]) ||
        data.settings[field] < 0 ||
        data.settings[field] > 0.3)
    )
      throw new Error(`Thuế suất ${field} không hợp lệ.`);
  for (const field of ["wireByFloor", "installationRates"])
    if (
      data.settings[field] != null &&
      (!object(data.settings[field]) ||
        Object.values(data.settings[field]).some(
          (v) => v != null && (!Number.isFinite(v) || v < 0 || v > 1e9),
        ))
    )
      throw new Error(`Định mức ${field} có giá trị không hợp lệ.`);
  return JSON.parse(JSON.stringify(data));
}

export function parseCsv(text) {
  const input = text.replace(/^\uFEFF/, "");
  const records = [];
  let row = [],
    field = "",
    quote = false,
    justClosed = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quote = false;
        justClosed = true;
      } else field += ch;
    } else if (ch === '"') {
      if (field || justClosed)
        throw new Error("CSV có dấu ngoặc kép không đúng vị trí.");
      quote = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
      justClosed = false;
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((v) => v.trim())) records.push(row);
      row = [];
      field = "";
      justClosed = false;
    } else {
      if (justClosed && ch.trim())
        throw new Error("CSV có ký tự không hợp lệ sau dấu ngoặc kép.");
      if (!justClosed) field += ch;
    }
  }
  if (quote) throw new Error("CSV thiếu dấu ngoặc kép đóng.");
  row.push(field);
  if (row.some((v) => v.trim())) records.push(row);
  if (!records.length) throw new Error("CSV chưa có dữ liệu.");
  const headers = records.shift().map((v) => v.trim());
  if (new Set(headers).size !== headers.length)
    throw new Error("CSV có tên cột trùng nhau.");
  for (const name of ["category", "brand", "price"])
    if (!headers.includes(name))
      throw new Error(`CSV thiếu cột ${name}. Hãy tải bảng mẫu trước.`);
  const ids = new Set();
  return records.map((cells, index) => {
    if (cells.length !== headers.length)
      throw new Error(
        `Dòng ${index + 2} có ${cells.length} cột, cần ${headers.length} cột.`,
      );
    const raw = Object.fromEntries(
      headers.map((header, i) => [header, cells[i]]),
    );
    if (!CATEGORY_KEYS.includes(raw.category?.trim()))
      throw new Error(`Dòng ${index + 2}: nhóm sản phẩm không hợp lệ.`);
    if (!raw.brand?.trim())
      throw new Error(`Dòng ${index + 2}: cần nhập hãng.`);
    const product = {
      id: raw.id?.trim() || uid(),
      category: raw.category.trim(),
      brand: raw.brand.trim(),
      model: raw.model || "",
      description: raw.description || "",
      image: raw.image || "",
      warranty: raw.warranty || "",
      verified: /^(true|1|yes)$/i.test(raw.verified?.trim()),
      active: !/^(false|0|no)$/i.test(raw.active?.trim()),
    };
    if (ids.has(product.id))
      throw new Error(`Dòng ${index + 2}: mã sản phẩm bị trùng trong file.`);
    ids.add(product.id);
    for (const key of NUMERIC_FIELDS) {
      let v = (raw[key] || "").trim();
      if (!v && key !== "price") {
        product[key] = key === "purchasePrice" ? 0 : null;
        continue;
      }
      if (!v) throw new Error(`Dòng ${index + 2}: chưa có đơn giá.`);
      if (key === "price" && /^\d{1,3}(\.\d{3})+$/.test(v))
        v = v.replace(/\./g, "");
      const num = Number(v);
      if (!Number.isFinite(num) || num < 0 || num > 1e12)
        throw new Error(`Dòng ${index + 2}: ${key} phải là số không âm.`);
      product[key] = num;
    }
    if (product.phase != null && ![1, 3].includes(product.phase))
      throw new Error(`Dòng ${index + 2}: phase chỉ nhận 1 hoặc 3.`);
    if (product.dod != null && product.dod > 1)
      throw new Error(`Dòng ${index + 2}: dod phải từ 0 đến 1.`);
    return product;
  });
}

export function productsCsv(products) {
  const escape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return (
    "\uFEFF" +
    [
      CSV_FIELDS.join(","),
      ...products.map((p) => CSV_FIELDS.map((key) => escape(p[key])).join(",")),
    ].join("\r\n")
  );
}

export default function Settings({
  db,
  updateDb,
  notify = () => {},
  initialTab = "company",
  onTabChange = () => {},
}) {
  const validTab = (value) =>
    ["company", "pricing", "data"].includes(value) ? value : "company";
  const [tab, setTab] = useState(() => validTab(initialTab));
  useEffect(() => {
    setTab(validTab(initialTab));
  }, [initialTab]);
  const [form, setForm] = useState(() => ({ ...db.settings }));
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const [resetText, setResetText] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [hasBeforeBackup, setHasBeforeBackup] = useState(() => {
    try {
      return Boolean(localStorage.getItem("kimsolar.beforeRestore"));
    } catch {
      return false;
    }
  });
  const jsonInput = useRef(null);
  const csvInput = useRef(null);
  const [storageAvailable] = useState(() => {
    try {
      const key = "kimsolar.storage.check";
      localStorage.setItem(key, "1");
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  });
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const stats = [
    ["Khách hàng", db.customers?.length || 0],
    ["Phương án", db.plans?.length || 0],
    ["Báo giá", db.quotes?.length || 0],
    ["Sản phẩm", db.products?.length || 0],
    ["Phiếu CSKH", db.tickets?.length || 0],
  ];
  const mark = (previous, title) =>
    [
      ...(previous.activities || []),
      {
        id: uid(),
        title,
        text: title,
        type: "settings",
        createdAt: timestamp(),
      },
    ].slice(-500);
  function saveSettings(event) {
    event.preventDefault();
    if (!(form.companyName || "").trim() || !(form.salesPhone || "").trim()) {
      notify("Vui lòng nhập tên công ty và số điện thoại kinh doanh.");
      return;
    }
    if (!/^\+?[\d\s().-]{8,20}$/.test(form.salesPhone)) {
      notify("Số điện thoại liên hệ chưa hợp lệ.");
      return;
    }
    const rate = (value) => Number(value ?? 0);
    if (
      ![form.vatElectricity ?? 0.08, form.vatQuote ?? 0].every(
        (v) => Number.isFinite(rate(v)) && rate(v) >= 0 && rate(v) <= 0.3,
      )
    ) {
      notify("Thuế suất phải từ 0 đến 30%.");
      return;
    }
    const next = {
      ...form,
      companyName: form.companyName.trim(),
      salesPhone: form.salesPhone.trim(),
      vatElectricity: rate(form.vatElectricity ?? 0.08),
      vatQuote: rate(form.vatQuote ?? 0),
    };
    updateDb((prev) => ({
      ...prev,
      settings: next,
      activities: mark(prev, "Cập nhật cấu hình doanh nghiệp và giá"),
    }));
    notify("Đã lưu cấu hình trên trình duyệt này.");
  }
  function exportBackup() {
    download(
      JSON.stringify(archive(db), null, 2),
      `kimsolar-backup-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json",
    );
    notify("Đã tạo bản sao lưu đầy đủ. Hãy giữ file ở nơi an toàn.");
  }
  function inspectBeforeBackup() {
    try {
      const raw = localStorage.getItem("kimsolar.beforeRestore");
      if (!raw)
        throw new Error("Chưa có bản trước khi khôi phục trên máy này.");
      setPending({
        kind: "json",
        data: validateBackup(JSON.parse(raw)),
        filename: "Bản trước lần nhập / đặt lại gần nhất",
      });
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  async function inspectFile(event, kind) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");
    setPending(null);
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("File vượt giới hạn 10 MB.");
      const text = await file.text();
      if (kind === "json") {
        const data = validateBackup(JSON.parse(text));
        setPending({ kind, data, filename: file.name });
      } else {
        const data = parseCsv(text);
        if (!data.length) throw new Error("CSV chưa có sản phẩm.");
        setPending({ kind, data, filename: file.name });
      }
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? "Không đọc được JSON. File có thể sai định dạng hoặc chưa tải xong."
          : e.message,
      );
    }
  }
  function applyImport() {
    if (!pending) return;
    try {
      localStorage.setItem(
        "kimsolar.beforeRestore",
        JSON.stringify(archive(db)),
      );
      setHasBeforeBackup(true);
    } catch {
      setError(
        "Chưa giữ được bản dữ liệu trước khi nhập. Hãy tải bản sao lưu hiện tại, giải phóng dung lượng trình duyệt rồi thử lại. Dữ liệu chưa bị thay đổi.",
      );
      return;
    }
    if (pending.kind === "json") {
      const next = pending.data;
      updateDb(() => ({
        ...next,
        activities: mark(next, "Khôi phục dữ liệu từ bản sao lưu"),
      }));
      setForm({ ...next.settings });
      notify("Đã khôi phục dữ liệu trên máy. Đây không phải đồng bộ đám mây.");
    } else {
      const incoming = new Map(pending.data.map((p) => [p.id, p]));
      updateDb((prev) => ({
        ...prev,
        products: [
          ...prev.products.map((old) =>
            incoming.has(old.id) ? { ...old, ...incoming.get(old.id) } : old,
          ),
          ...pending.data.filter(
            (p) => !prev.products.some((old) => old.id === p.id),
          ),
        ],
        activities: mark(prev, `Nhập ${pending.data.length} sản phẩm từ CSV`),
      }));
      notify(
        "Đã gộp danh mục theo mã sản phẩm. Các dòng không có trong file được giữ lại.",
      );
    }
    setPending(null);
    setError("");
  }
  function resetRecords() {
    if (resetText !== "XOA") return;
    try {
      localStorage.setItem(
        "kimsolar.beforeRestore",
        JSON.stringify(archive(db)),
      );
      setHasBeforeBackup(true);
    } catch {
      setError(
        "Không lưu được bản trước khi xóa. Hãy tải sao lưu và giải phóng dung lượng trước. Chưa có dữ liệu bị xóa.",
      );
      return;
    }
    updateDb((prev) => ({
      ...prev,
      customers: [],
      plans: [],
      quotes: [],
      tickets: [],
      tasks: [],
      activities: mark(
        prev,
        "Đặt lại hồ sơ công việc; giữ danh mục và cấu hình",
      ),
    }));
    setResetOpen(false);
    setResetText("");
    notify("Đã đặt lại hồ sơ công việc. Danh mục và cấu hình được giữ nguyên.");
  }
  const settingsField = (key, label, options = {}) => (
    <div className={`field ${options.wide ? "settings-wide" : ""}`} key={key}>
      <label htmlFor={`settings-${key}`}>{label}</label>
      <input
        className="input"
        id={`settings-${key}`}
        type={options.type || "text"}
        value={form[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        placeholder={options.placeholder}
        required={options.required}
      />
      <small>{options.note}</small>
    </div>
  );
  return (
    <div className="settings-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE / CẤU HÌNH</p>
          <h1>Mọi thứ, theo cách của bạn.</h1>
          <p>
            Thông tin doanh nghiệp, định mức và dữ liệu làm việc trong cùng một
            nơi.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportBackup}>
          <Download size={16} /> Sao lưu toàn bộ
        </button>
      </div>
      <div className="settings-shell">
        <nav className="settings-nav" aria-label="Nhóm cài đặt">
          {[
            {
              id: "company",
              icon: Building2,
              name: "Doanh nghiệp",
              desc: "Thương hiệu & liên hệ",
            },
            {
              id: "pricing",
              icon: SlidersHorizontal,
              name: "Giá & định mức",
              desc: "Thuế, dây DC, thi công",
            },
            {
              id: "data",
              icon: Database,
              name: "Dữ liệu & sao lưu",
              desc: "Xuất, nhập và khôi phục",
            },
          ].map(({ id, icon: Icon, name, desc }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => {
                setTab(id);
                onTabChange(id);
                setError("");
              }}
            >
              <Icon size={19} />
              <span>
                <strong>{name}</strong>
                <small>{desc}</small>
              </span>
              <ArrowRight size={14} />
            </button>
          ))}
          <div className="settings-storage">
            <HardDrive size={18} />
            <strong>
              {storageAvailable
                ? "Dữ liệu trên trình duyệt"
                : "Chưa ghi được bộ nhớ"}
            </strong>
            <p>
              {storageAvailable
                ? "Chưa kết nối máy chủ dùng chung. Dùng sao lưu để giữ thêm một bản dữ liệu."
                : "Hãy xuất JSON để bảo toàn dữ liệu. Kiểm tra dung lượng và quyền trình duyệt."}
            </p>
            <span className="settings-status">
              <i />
              {storageAvailable ? "Lưu cục bộ" : "Cần kiểm tra"}
            </span>
          </div>
        </nav>
        <div className="settings-content">
          {tab === "company" && (
            <form className="card" onSubmit={saveSettings}>
              <div className="card-head">
                <div>
                  <span className="settings-kicker">01 / NHẬN DIỆN</span>
                  <h2>Thông tin doanh nghiệp</h2>
                  <p>
                    Hiển thị trên phương án, báo giá, ảnh chia sẻ và bản in mới.
                  </p>
                </div>
                <Building2 size={23} />
              </div>
              <div className="settings-form-grid">
                {settingsField("companyName", "Tên công ty", {
                  wide: true,
                  required: true,
                })}
                {settingsField("address", "Địa chỉ", { wide: true })}
                {settingsField("taxCode", "Mã số thuế")}
                {settingsField("email", "Email liên hệ", { type: "email" })}
                {settingsField("salesName", "Tên / chức danh nhân viên", {
                  placeholder: "Nhân Viên Kinh Doanh",
                })}
                {settingsField("salesPhone", "Số điện thoại kinh doanh", {
                  placeholder: "0987000783",
                  type: "tel",
                  required: true,
                })}
                {settingsField("website", "Website", { wide: true })}
              </div>
              <div className="settings-info">
                <ShieldCheck size={17} />
                <p>
                  Thay đổi áp dụng cho tài liệu tạo mới. Báo giá đã lưu giữ
                  nguyên thông tin tại thời điểm lưu. Số điện thoại khách hàng
                  không bị thay đổi.
                </p>
              </div>
              <div className="settings-form-actions">
                <span>Được lưu trên thiết bị này</span>
                <button className="btn btn-primary" type="submit">
                  <Check size={16} /> Lưu thông tin
                </button>
              </div>
            </form>
          )}
          {tab === "pricing" && (
            <form onSubmit={saveSettings} className="settings-stack">
              <section className="card">
                <div className="card-head">
                  <div>
                    <span className="settings-kicker">02 / CHÍNH SÁCH GIÁ</span>
                    <h2>Thuế & điều kiện báo giá</h2>
                    <p>
                      Thuế hóa đơn điện tách riêng với thuế của thiết bị và thi
                      công.
                    </p>
                  </div>
                  <SlidersHorizontal size={22} />
                </div>
                <div className="settings-form-grid">
                  <div className="field">
                    <label htmlFor="electricity-vat">
                      VAT điện dùng trong phép tính (%)
                    </label>
                    <input
                      id="electricity-vat"
                      className="input"
                      type="number"
                      min="0"
                      max="30"
                      step="0.1"
                      value={Number(
                        ((form.vatElectricity ?? 0.08) * 100).toFixed(3),
                      )}
                      onChange={(e) =>
                        set("vatElectricity", Number(e.target.value) / 100)
                      }
                    />
                    <small>Đối chiếu với hóa đơn điện thực tế.</small>
                  </div>
                  <div className="field">
                    <label htmlFor="quote-vat">VAT báo giá (%)</label>
                    <input
                      id="quote-vat"
                      className="input"
                      type="number"
                      min="0"
                      max="30"
                      step="0.1"
                      value={Number(((form.vatQuote ?? 0) * 100).toFixed(3))}
                      onChange={(e) =>
                        set("vatQuote", Number(e.target.value) / 100)
                      }
                    />
                    <small>Không suy ra thuế hàng hóa từ VAT điện.</small>
                  </div>
                  <div className="settings-wide settings-check">
                    <input
                      id="vat-included"
                      type="checkbox"
                      checked={form.quotePricesIncludeVat ?? true}
                      onChange={(e) =>
                        set("quotePricesIncludeVat", e.target.checked)
                      }
                    />
                    <label htmlFor="vat-included">
                      <strong>Giá bán trong danh mục đã gồm VAT</strong>
                      <small>
                        Nếu bỏ chọn, báo giá cộng thêm VAT theo thuế suất bên
                        trên.
                      </small>
                    </label>
                  </div>
                </div>
              </section>
              <section className="card">
                <div className="card-head">
                  <div>
                    <h2>Định mức theo công suất biến tần</h2>
                    <p>
                      Đơn giá trên mỗi kW; cần xác nhận theo điều kiện công
                      trình.
                    </p>
                  </div>
                </div>
                <div className="settings-rate-grid">
                  {[
                    ["labor", "Nhân công"],
                    ["misc", "Vật tư phụ"],
                    ["truck", "Vận chuyển"],
                  ].map(([key, label]) => (
                    <div className="field" key={key}>
                      <label htmlFor={`rate-${key}`}>{label} (đ/kW)</label>
                      <MoneyInput
                        id={`rate-${key}`}
                        className="input"
                        min={0}
                        max={100000000}
                        required
                        value={form.installationRates?.[key] ?? 500000}
                        onChange={(value) =>
                          set("installationRates", {
                            ...form.installationRates,
                            [key]: value,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>
              <section className="card">
                <div className="card-head">
                  <div>
                    <h2>Dây DC theo số tầng</h2>
                    <p>
                      Mét cho một chuỗi, mỗi màu. Dây đỏ và dây đen tính riêng.
                    </p>
                  </div>
                </div>
                <div className="settings-wire-grid">
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((floor) => (
                    <div className="field" key={floor}>
                      <label htmlFor={`wire-${floor}`}>{floor} tầng</label>
                      <div className="settings-unit-input">
                        <input
                          id={`wire-${floor}`}
                          className="input"
                          type="number"
                          min="0"
                          max="10000"
                          placeholder="Chưa có"
                          value={form.wireByFloor?.[floor] ?? ""}
                          onChange={(e) =>
                            set("wireByFloor", {
                              ...form.wireByFloor,
                              [floor]:
                                e.target.value === ""
                                  ? null
                                  : Math.max(0, Number(e.target.value)),
                            })
                          }
                        />
                        <span>m</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="settings-info">
                  <AlertTriangle size={17} />
                  <p>
                    Các tầng chưa có định mức cần khảo sát và nhập thêm trước
                    khi lập báo giá. Không phải tổng chiều dài dây của cả hai
                    màu.
                  </p>
                </div>
              </section>
              <div className="settings-savebar">
                <span>
                  Giá nguồn chưa xác minh cần được duyệt ở từng sản phẩm.
                </span>
                <button className="btn btn-primary" type="submit">
                  <Check size={16} /> Lưu chính sách giá
                </button>
              </div>
            </form>
          )}
          {tab === "data" && (
            <div className="settings-stack">
              <section className="card">
                <div className="card-head">
                  <div>
                    <span className="settings-kicker">
                      03 / DỮ LIỆU CỦA BẠN
                    </span>
                    <h2>Giữ một bản sao, luôn chủ động.</h2>
                    <p>
                      Bản sao lưu bao gồm danh mục, khách hàng, phương án, báo
                      giá và cấu hình.
                    </p>
                  </div>
                  <Database size={24} />
                </div>
                <div className="settings-data-stats">
                  {stats.map(([label, value]) => (
                    <div key={label}>
                      <strong>{value}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <div className="settings-backup-grid">
                  <div>
                    <Download size={24} />
                    <h3>Xuất bản sao đầy đủ</h3>
                    <p>
                      Tải JSON và giữ riêng để phục hồi khi đổi máy hoặc xóa
                      nhầm.
                    </p>
                    <button
                      className="btn btn-secondary"
                      onClick={exportBackup}
                    >
                      Tải bản sao lưu <ArrowRight size={14} />
                    </button>
                  </div>
                  <div>
                    <Upload size={24} />
                    <h3>Khôi phục có xem trước</h3>
                    <p>
                      Chỉ nhận JSON của ứng dụng này. Không thực thi HTML hoặc
                      script trong tệp.
                    </p>
                    <button
                      className="btn btn-secondary"
                      onClick={() => jsonInput.current.click()}
                    >
                      Chọn file JSON <ArrowRight size={14} />
                    </button>
                    <input
                      type="file"
                      ref={jsonInput}
                      accept="application/json,.json"
                      hidden
                      onChange={(e) => inspectFile(e, "json")}
                    />
                  </div>
                </div>
                {hasBeforeBackup && (
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: 16 }}
                    onClick={inspectBeforeBackup}
                  >
                    Xem bản trước lần nhập gần nhất <ArrowRight size={14} />
                  </button>
                )}
                <div className="settings-info">
                  <HardDrive size={17} />
                  <p>
                    Sao lưu bằng file không phải đồng bộ đám mây. Thiết bị khác
                    chỉ có dữ liệu sau khi bạn chuyển và nạp bản sao. Chưa có
                    tài khoản hoặc phân quyền máy chủ trong phiên bản hiện tại.
                  </p>
                </div>
              </section>
              <section className="card">
                <div className="card-head">
                  <div>
                    <h2>Danh mục thiết bị qua CSV</h2>
                    <p>
                      Giữ mô tả nhiều dòng và dấu phẩy bằng định dạng CSV có
                      ngoặc kép.
                    </p>
                  </div>
                  <FileSpreadsheet size={22} />
                </div>
                <div className="settings-csv-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      download(
                        productsCsv(db.products),
                        "kimsolar-products.csv",
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    <Download size={16} /> Xuất toàn bộ danh mục
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => csvInput.current.click()}
                  >
                    <Upload size={16} /> Nhập / cập nhật CSV
                  </button>
                  <input
                    ref={csvInput}
                    type="file"
                    accept=".csv,text/csv"
                    hidden
                    onChange={(e) => inspectFile(e, "csv")}
                  />
                </div>
                <p className="settings-help">
                  Tải danh mục hiện tại làm mẫu. Các dòng trùng <code>id</code>{" "}
                  được cập nhật; mã mới được thêm; dòng vắng trong CSV vẫn được
                  giữ. Cột <code>verified</code> cần ghi <code>true</code> chỉ
                  khi giá đã xác minh. File Excel hãy lưu thành CSV UTF-8 trước
                  khi nhập.
                </p>
              </section>
              {error && (
                <div className="settings-import-error" role="alert">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Chưa thể thực hiện</strong>
                    <p>{error}</p>
                    <button
                      className="btn btn-secondary"
                      onClick={exportBackup}
                    >
                      Tải bản dữ liệu hiện tại
                    </button>
                  </div>
                </div>
              )}
              {pending && (
                <section className="card settings-preview" aria-live="polite">
                  <div className="card-head">
                    <div>
                      <span className="settings-kicker">
                        XEM TRƯỚC • CHƯA ÁP DỤNG
                      </span>
                      <h2>{pending.filename}</h2>
                    </div>
                    <button
                      className="btn btn-secondary"
                      aria-label="Hủy nhập dữ liệu"
                      onClick={() => setPending(null)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                  {pending.kind === "json" ? (
                    <>
                      <p>
                        Bản sao lưu có{" "}
                        <strong>{pending.data.customers.length}</strong> khách
                        hàng, <strong>{pending.data.plans.length}</strong>{" "}
                        phương án, <strong>{pending.data.quotes.length}</strong>{" "}
                        báo giá và{" "}
                        <strong>{pending.data.products.length}</strong> sản
                        phẩm.
                      </p>
                      <div className="settings-info">
                        <AlertTriangle size={17} />
                        <p>
                          Khôi phục sẽ thay dữ liệu đang mở bằng bản này. Ứng
                          dụng giữ bản hiện tại trong bộ nhớ{" "}
                          <code>kimsolar.beforeRestore</code> trước khi thay
                          thế.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>
                        <strong>{pending.data.length}</strong> sản phẩm hợp lệ:{" "}
                        <strong>
                          {
                            pending.data.filter((row) =>
                              db.products.some((old) => old.id === row.id),
                            ).length
                          }
                        </strong>{" "}
                        cập nhật,{" "}
                        <strong>
                          {
                            pending.data.filter(
                              (row) =>
                                !db.products.some((old) => old.id === row.id),
                            ).length
                          }
                        </strong>{" "}
                        thêm mới.
                      </p>
                      <div className="table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Hãng</th>
                              <th>Model</th>
                              <th>Giá</th>
                              <th>Tình trạng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pending.data.slice(0, 5).map((row) => (
                              <tr key={row.id}>
                                <td>{row.brand}</td>
                                <td>{row.model || "Chưa có model"}</td>
                                <td>{row.price.toLocaleString("vi-VN")} đ</td>
                                <td>
                                  {row.verified
                                    ? "Đã xác minh"
                                    : "Chờ xác minh"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {pending.data.length > 5 && (
                        <p className="settings-help">
                          Hiển thị 5 trong {pending.data.length} dòng xem trước.
                        </p>
                      )}
                    </>
                  )}
                  <div className="settings-form-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setPending(null)}
                    >
                      Hủy, giữ dữ liệu hiện tại
                    </button>
                    <button className="btn btn-primary" onClick={applyImport}>
                      <Check size={16} />{" "}
                      {pending.kind === "json"
                        ? "Khôi phục bản đã chọn"
                        : "Gộp danh mục CSV"}
                    </button>
                  </div>
                </section>
              )}
              <section className="card settings-danger-zone">
                <div>
                  <h3>Đặt lại hồ sơ công việc</h3>
                  <p>
                    Xóa khách hàng, phương án, báo giá, phiếu CSKH và lịch hẹn
                    trên máy. Giữ danh mục và cài đặt.
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setResetOpen(true);
                    setResetText("");
                  }}
                >
                  <Trash2 size={15} /> Đặt lại dữ liệu
                </button>
                {resetOpen && (
                  <div className="settings-reset-confirm">
                    <label htmlFor="reset-word">
                      Gõ <strong>XOA</strong> để xác nhận. Một bản trước khi xóa
                      sẽ được giữ trên máy.
                    </label>
                    <input
                      id="reset-word"
                      className="input"
                      value={resetText}
                      onChange={(e) => setResetText(e.target.value)}
                      autoComplete="off"
                      placeholder="XOA"
                    />
                    <div>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setResetOpen(false)}
                      >
                        Giữ lại
                      </button>
                      <button
                        className="btn settings-delete-btn"
                        disabled={resetText !== "XOA"}
                        onClick={resetRecords}
                      >
                        Xóa hồ sơ công việc
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
