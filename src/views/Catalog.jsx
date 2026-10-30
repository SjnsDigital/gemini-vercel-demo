import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Package,
  ArrowUpRight,
  Save,
  Trash2,
  ShieldCheck,
  ImagePlus,
  Download,
  Upload,
  LayoutGrid,
  List,
  SlidersHorizontal,
  EyeOff,
  CheckCircle2,
  Sun,
  Zap,
  BatteryCharging,
  Cable,
  Truck,
  Wrench,
  Layers3,
  PlugZap,
  X,
} from "lucide-react";
import { categories } from "../lib/seed";
import { RecordDialog } from "./Customers";
import "./records.css";
import MoneyInput from "../components/MoneyInput.jsx";
import { searchText } from "../lib/workflow.js";

const categoryIcons = {
  panel: Sun,
  inv: Zap,
  bat: BatteryCharging,
  cab: ShieldCheck,
  rail: Layers3,
  kbia: Layers3,
  kgiua: Layers3,
  mc4: PlugZap,
  wr: Cable,
  wb: Cable,
  truck: Truck,
  misc: Wrench,
  labor: Wrench,
};
function CategoryGlyph({ category, size = 15 }) {
  const Icon = categoryIcons[category] || Package;
  return <Icon size={size} strokeWidth={1.8} />;
}
function ProductVisual({ product }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product.image]);
  const Icon = categoryIcons[product.category] || Package;
  return product.image && !failed ? (
    <img
      src={product.image}
      alt={
        product.brand +
        " " +
        (product.model || categories[product.category] || "thiết bị")
      }
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={"record-productplaceholder category-" + product.category}>
      <span>
        <Icon size={48} strokeWidth={1.55} />
      </span>
      <small>{categories[product.category] || "Thiết bị"}</small>
      <em>Chưa có ảnh sản phẩm</em>
    </div>
  );
}
const uid = () => crypto.randomUUID(),
  money = (n) => Number(n || 0).toLocaleString("vi-VN") + " đ";
const blank = () => ({
  category: "panel",
  brand: "",
  model: "",
  description: "",
  price: 0,
  purchasePrice: 0,
  verified: false,
  active: true,
  wp: null,
  length: null,
  width: null,
  kw: null,
  phase: null,
  capacity: null,
  dod: null,
  image: "",
  warranty: "",
  source: "Nhập thủ công",
});
const numericFields = [
  ["wp", "Công suất tấm (Wp)"],
  ["length", "Chiều dài tấm (m)"],
  ["width", "Chiều rộng tấm (m)"],
  ["kw", "Công suất biến tần (kW)"],
  ["maxDcKw", "PV DC tối đa (kWp)"],
  ["capacity", "Dung lượng pin (kWh)"],
  ["dod", "DoD (0–1)"],
];
function downloadCsv(products) {
  const cols = [
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
  const escape = (x) => '"' + String(x ?? "").replaceAll('"', '""') + '"';
  const csv =
    "\uFEFF" +
    [cols, ...products.map((p) => cols.map((k) => p[k] ?? ""))]
      .map((r) => r.map(escape).join(","))
      .join("\r\n");
  const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = "kimsolar-danh-muc-thiet-bi.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Catalog({
  db,
  updateDb,
  notify,
  onNavigate,
  initialQuery = "",
  assistantAction = null,
  onConsumedAssistantAction,
}) {
  const [search, setSearch] = useState(initialQuery),
    [category, setCategory] = useState("all"),
    [status, setStatus] = useState("active"),
    [layout, setLayout] = useState("grid"),
    [sort, setSort] = useState("default"),
    [draft, setDraft] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    setSearch(String(initialQuery || ""));
    if (initialQuery) setStatus("all");
  }, [initialQuery]);
  const consumedAssistant = useRef(null);
  useEffect(() => {
    if (!assistantAction || consumedAssistant.current === assistantAction)
      return;
    consumedAssistant.current = assistantAction;
    if (assistantAction.type === "new-product") {
      setDraft({
        ...blank(),
        ...(assistantAction.product || {}),
        id: undefined,
      });
      setError("");
    } else if (assistantAction.type === "filter") {
      setSearch(String(assistantAction.query || ""));
      setStatus(
        assistantAction.onlyMissingPrice
          ? "missing-price"
          : [
                "all",
                "active",
                "inactive",
                "unverified",
                "missing-price",
              ].includes(assistantAction.filter)
            ? assistantAction.filter
            : "all",
      );
      setCategory(
        assistantAction.category && categories[assistantAction.category]
          ? assistantAction.category
          : "all",
      );
    }
    onConsumedAssistantAction?.();
  }, [assistantAction, onConsumedAssistantAction]);
  const products = db.products || [],
    filtered = products
      .filter(
        (p) =>
          (category === "all" || p.category === category) &&
          (status === "all" ||
            (status === "active"
              ? p.active
              : status === "unverified"
                ? p.active && !p.verified
                : status === "missing-price"
                  ? p.active !== false && !(Number(p.price) > 0)
                  : !p.active)) &&
          [p.brand, p.model, p.description].some((s) =>
            searchText(s).includes(searchText(search)),
          ),
      )
      .sort((a, b) =>
        sort === "name"
          ? `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, "vi")
          : sort === "price-up"
            ? (Number(a.price) > 0 ? Number(a.price) : Infinity) -
              (Number(b.price) > 0 ? Number(b.price) : Infinity)
            : sort === "price-down"
              ? Number(b.price || 0) - Number(a.price || 0)
              : 0,
      );
  const brands = [...new Set(products.map((p) => p.brand))].sort();
  const change = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const save = (e) => {
    e.preventDefault();
    if (!draft.brand.trim()) {
      setError("Cần nhập tên hãng.");
      return;
    }
    if (
      draft.active &&
      ["panel", "inv", "bat"].includes(draft.category) &&
      !draft.model.trim()
    ) {
      setError(
        "Sản phẩm đang bán cần có model rõ ràng. Hãy tắt Đang sử dụng nếu mới lưu tên hãng.",
      );
      return;
    }
    if (!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0) {
      setError("Đơn giá phải là số không âm.");
      return;
    }
    for (const [k] of numericFields) {
      if (
        draft[k] != null &&
        draft[k] !== "" &&
        (!Number.isFinite(Number(draft[k])) || Number(draft[k]) <= 0)
      ) {
        setError("Thông số kỹ thuật đã nhập phải lớn hơn 0.");
        return;
      }
    }
    if (draft.dod && Number(draft.dod) > 1) {
      setError("DoD cần nằm trong khoảng 0–1.");
      return;
    }
    if (
      draft.image &&
      !/^(https:\/\/|\/(?:gemini-vercel-demo\/)?assets\/|data:image\/(jpeg|png|webp);base64,)/i.test(
        draft.image,
      )
    ) {
      setError("Ảnh cần là URL HTTPS, ảnh đã tải lên hoặc ảnh tài sản nguồn.");
      return;
    }
    const time = new Date().toISOString(),
      id = draft.id || uid(),
      p = {
        ...draft,
        id,
        brand: draft.brand.trim(),
        model: draft.model.trim(),
        price: Number(draft.price),
        purchasePrice: Number(draft.purchasePrice) || 0,
        updatedAt: time,
        createdAt: draft.createdAt || time,
      };
    numericFields.forEach(
      ([k]) =>
        (p[k] = draft[k] === "" || draft[k] == null ? null : Number(draft[k])),
    );
    p.phase = draft.phase ? Number(draft.phase) : null;
    updateDb((prev) => ({
      ...prev,
      products: draft.id
        ? prev.products.map((x) => (x.id === id ? p : x))
        : [p, ...prev.products],
      activities: [
        {
          id: uid(),
          type: "catalog",
          text:
            (draft.id ? "Cập nhật thiết bị " : "Thêm thiết bị ") +
            p.brand +
            " " +
            p.model,
          createdAt: time,
        },
        ...(prev.activities || []),
      ].slice(0, 200),
    }));
    setDraft(null);
    setError("");
    notify("Đã lưu thiết bị và giá. Báo giá đã lưu giữ nguyên bản cũ.");
  };
  const toggle = (p) => {
    updateDb((prev) => ({
      ...prev,
      products: prev.products.map((x) =>
        x.id === p.id
          ? { ...x, active: !x.active, updatedAt: new Date().toISOString() }
          : x,
      ),
    }));
    notify(p.active ? "Đã ngừng sử dụng sản phẩm." : "Đã bật sản phẩm.");
  };
  const remove = (p) => {
    if (
      !window.confirm(
        "Xóa vĩnh viễn " +
          p.brand +
          " " +
          (p.model || "hãng chưa có model") +
          " khỏi danh mục? Các báo giá đã lưu không bị thay đổi.",
      )
    )
      return;
    updateDb((prev) => ({
      ...prev,
      products: prev.products.filter((x) => x.id !== p.id),
    }));
    setDraft(null);
    notify("Đã xóa thiết bị khỏi danh mục.");
  };
  const upload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 8e6) {
      setError("Chọn ảnh nhỏ hơn 8 MB.");
      return;
    }
    const src = URL.createObjectURL(f),
      img = new Image();
    img.onload = () => {
      const sc = Math.min(1, 800 / Math.max(img.width, img.height)),
        c = document.createElement("canvas");
      c.width = img.width * sc;
      c.height = img.height * sc;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      change("image", c.toDataURL("image/jpeg", 0.75));
      URL.revokeObjectURL(src);
    };
    img.onerror = () => {
      setError("Không đọc được ảnh này.");
      URL.revokeObjectURL(src);
    };
    img.src = src;
    e.target.value = "";
  };
  const renderBadge = (p) =>
    !p.active ? (
      <span className="badge neutral">Chưa kích hoạt</span>
    ) : p.verified ? (
      <span className="badge success">
        <ShieldCheck size={12} />
        Đã xác minh
      </span>
    ) : (
      <span className="badge warning">Cần xác minh</span>
    );
  return (
    <div className="record-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            PRODUCT LIBRARY / THIẾT BỊ & CHÍNH SÁCH GIÁ
          </span>
          <h1>Mỗi lựa chọn, một tiêu chuẩn.</h1>
          <p>
            Quản lý model, thông số và giá. Giữ báo giá luôn nhất quán với thiết
            bị.
          </p>
        </div>
        <div className="record-actions">
          <button
            className="btn btn-secondary"
            onClick={() => downloadCsv(products)}
          >
            <Download size={16} />
            Xuất CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setDraft(blank());
              setError("");
            }}
          >
            <Plus size={17} />
            Thêm thiết bị
          </button>
        </div>
      </div>
      <div className="record-statrow">
        <div>
          <span>Tổng danh mục</span>
          <strong>{products.length.toString().padStart(2, "0")}</strong>
        </div>
        <div>
          <span>Đang sử dụng</span>
          <strong>
            {products
              .filter((p) => p.active)
              .length.toString()
              .padStart(2, "0")}
          </strong>
        </div>
        <div>
          <span>Hãng thiết bị</span>
          <strong>{brands.length.toString().padStart(2, "0")}</strong>
        </div>
        <div>
          <span>Cần xác minh giá</span>
          <strong>
            {products
              .filter((p) => p.active && !p.verified)
              .length.toString()
              .padStart(2, "0")}
          </strong>
        </div>
      </div>
      <div className="record-categorystrip">
        <button
          className={category === "all" ? "active" : ""}
          onClick={() => setCategory("all")}
        >
          <LayoutGrid size={15} />
          Tất cả <span>{products.length}</span>
        </button>
        {Object.entries(categories).map(([k, v]) => (
          <button
            key={k}
            className={category === k ? "active" : ""}
            onClick={() => setCategory(k)}
          >
            <CategoryGlyph category={k} />
            {v} <span>{products.filter((p) => p.category === k).length}</span>
          </button>
        ))}
      </div>
      <section className="card record-catalogsection">
        <div className="record-toolbar">
          <label className="record-search">
            <Search size={17} />
            <input
              aria-label="Tìm thiết bị"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm hãng, model, thông số thiết bị..."
            />
          </label>
          <div className="record-actions">
            <select
              className="select"
              value={status}
              aria-label="Lọc thiết bị"
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Mọi trạng thái</option>
              <option value="active">Đang sử dụng</option>
              <option value="unverified">Cần xác minh</option>
              <option value="missing-price">Đang dùng · chưa có giá</option>
              <option value="inactive">Chưa kích hoạt</option>
            </select>
            <div className="record-layouttoggle">
              <button
                className={layout === "grid" ? "active" : ""}
                onClick={() => setLayout("grid")}
                aria-label="Xem thẻ thiết bị"
              >
                <LayoutGrid size={17} />
              </button>
              <button
                className={layout === "table" ? "active" : ""}
                onClick={() => setLayout("table")}
                aria-label="Xem bảng thiết bị"
              >
                <List size={17} />
              </button>
            </div>
          </div>
        </div>
        <div className="record-resultsbar record-catalogresults">
          <span role="status">
            {filtered.length} / {products.length} thiết bị
          </span>
          <label className="record-sort">
            <span>Sắp xếp</span>
            <select
              className="select"
              aria-label="Sắp xếp thiết bị"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="default">Mặc định</option>
              <option value="name">Hãng / model A–Z</option>
              <option value="price-up">Giá thấp → cao</option>
              <option value="price-down">Giá cao → thấp</option>
            </select>
          </label>
          {(search || category !== "all" || status !== "active") && (
            <button
              onClick={() => {
                setSearch("");
                setCategory("all");
                setStatus("active");
              }}
            >
              Đặt lại <X size={13} />
            </button>
          )}
        </div>
        {filtered.length ? (
          layout === "grid" ? (
            <div className="record-productgrid">
              {filtered.map((p) => (
                <article
                  className={"record-product " + (!p.active ? "inactive" : "")}
                  key={p.id}
                >
                  <div className="record-productvisual">
                    <span className="record-productcategory">
                      {categories[p.category] || p.category}
                    </span>
                    <ProductVisual product={p} />
                    <button
                      className="record-icon"
                      onClick={() => {
                        setDraft(structuredClone(p));
                        setError("");
                      }}
                      aria-label={"Sửa " + p.brand + " " + p.model}
                    >
                      <ArrowUpRight size={19} />
                    </button>
                  </div>
                  <div className="record-productbody">
                    <div className="record-productbrand">{p.brand}</div>
                    <h3>{p.model || "Chưa bổ sung model"}</h3>
                    <p>
                      {p.wp
                        ? `${p.wp} Wp · ${p.length} × ${p.width} m`
                        : p.kw
                          ? `${p.kw} kW · ${p.phase ? p.phase + " pha" : "Chưa xác nhận pha"}`
                          : p.capacity
                            ? `${p.capacity} kWh · DoD ${Math.round((p.dod || 0.9) * 100)}%`
                            : p.warranty ||
                              "Bổ sung thông số để tư vấn chính xác"}
                    </p>
                    <div className="record-productbottom">
                      <strong>
                        {p.price ? money(p.price) : "Chưa có giá"}
                      </strong>
                      {renderBadge(p)}
                    </div>
                    <button
                      className="record-productedit"
                      onClick={() => {
                        setDraft(structuredClone(p));
                        setError("");
                      }}
                    >
                      Xem & chỉnh sửa
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Thiết bị</th>
                    <th>Nhóm</th>
                    <th>Đơn giá</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <b>{p.brand}</b>
                        <small className="record-sub">
                          {p.model || "Chưa bổ sung model"}
                        </small>
                      </td>
                      <td>{categories[p.category]}</td>
                      <td>{money(p.price)}</td>
                      <td>{renderBadge(p)}</td>
                      <td>
                        <button
                          className="record-icon"
                          onClick={() => setDraft(structuredClone(p))}
                          aria-label={"Sửa " + p.model}
                        >
                          <ArrowUpRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="record-empty">
            <Package size={36} />
            <h3>Chưa có thiết bị phù hợp</h3>
            <p>Đổi bộ lọc hoặc thêm một model mới vào thư viện của bạn.</p>
            <button
              className="btn btn-secondary"
              onClick={() =>
                setDraft({
                  ...blank(),
                  category: category === "all" ? "panel" : category,
                })
              }
            >
              <Plus size={16} />
              Thêm thiết bị
            </button>
          </div>
        )}
        <p className="record-catalogfoot">
          <ShieldCheck size={14} />
          Giá nguồn chưa được coi là giá bán đã xác nhận. Dùng “Đã xác minh” sau
          khi đối chiếu với chính sách thực tế.{" "}
          <button onClick={() => onNavigate?.("settings")}>
            Nhập danh mục CSV <Upload size={13} />
          </button>
        </p>
      </section>
      {draft && (
        <RecordDialog
          title={draft.id ? "Chi tiết thiết bị" : "Thêm thiết bị mới"}
          onClose={() => {
            setDraft(null);
            setError("");
          }}
          wide
        >
          <form onSubmit={save}>
            <div className="record-dialogbody">
              <div className="record-productform">
                <div className="record-productimageedit">
                  {draft.image ? (
                    <img src={draft.image} alt="Ảnh thiết bị" />
                  ) : (
                    <Package size={85} strokeWidth={0.8} />
                  )}
                  <label className="btn btn-secondary record-upload">
                    <ImagePlus size={16} />
                    Tải ảnh lên
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={upload}
                    />
                  </label>
                  {draft.image && (
                    <button
                      type="button"
                      className="record-textdanger"
                      onClick={() => change("image", "")}
                    >
                      Bỏ ảnh
                    </button>
                  )}
                </div>
                <div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Nhóm thiết bị</span>
                      <select
                        aria-label="Nhóm thiết bị"
                        className="select"
                        value={draft.category}
                        onChange={(e) => change("category", e.target.value)}
                      >
                        {Object.entries(categories).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Hãng *</span>
                      <input
                        className="input"
                        list="productBrands"
                        required
                        value={draft.brand}
                        onChange={(e) => change("brand", e.target.value)}
                      />
                      <datalist id="productBrands">
                        {brands.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </label>
                  </div>
                  <label className="field">
                    <span>Model / mã sản phẩm</span>
                    <input
                      className="input"
                      value={draft.model}
                      onChange={(e) => change("model", e.target.value)}
                    />
                  </label>
                  <div className="form-grid">
                    <label className="field">
                      <span>Giá bán (đ)</span>
                      <MoneyInput
                        className="input"
                        aria-label="Giá bán (đ)"
                        compact
                        min={0}
                        max={1e12}
                        value={draft.price}
                        onChange={(value) => change("price", value)}
                      />
                    </label>
                    <label className="field">
                      <span>Giá nhập tham khảo (đ)</span>
                      <MoneyInput
                        className="input"
                        aria-label="Giá nhập tham khảo (đ)"
                        compact
                        min={0}
                        max={1e12}
                        value={draft.purchasePrice ?? 0}
                        onChange={(value) => change("purchasePrice", value)}
                      />
                    </label>
                  </div>
                  <div className="record-checkboxrow">
                    <label>
                      <input
                        type="checkbox"
                        checked={!!draft.active}
                        onChange={(e) => change("active", e.target.checked)}
                      />
                      Đang sử dụng
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!draft.verified}
                        onChange={(e) => change("verified", e.target.checked)}
                      />
                      Đã xác minh giá & thông tin
                    </label>
                  </div>
                </div>
              </div>
              <label className="field">
                <span>Mô tả trên báo giá (giữ được nhiều dòng)</span>
                <textarea
                  className="input"
                  rows={4}
                  value={draft.description || ""}
                  onChange={(e) => change("description", e.target.value)}
                />
              </label>
              <label className="field">
                <span>Bảo hành</span>
                <textarea
                  className="input"
                  rows={3}
                  value={draft.warranty || ""}
                  onChange={(e) => change("warranty", e.target.value)}
                />
              </label>
              <details className="record-surveygroup" open>
                <summary>
                  <span>
                    <SlidersHorizontal size={15} />
                  </span>
                  Thông số kỹ thuật để kiểm tra tương thích
                </summary>
                <p className="record-helper">
                  Chỉ nhập thông số đã biết. Để trống thông số chưa xác nhận;
                  không suy ra pha hoặc điện áp từ tiêu đề thiết bị.
                </p>
                <div className="form-grid">
                  {numericFields
                    .filter(([k]) =>
                      draft.category === "panel"
                        ? ["wp", "length", "width"].includes(k)
                        : draft.category === "inv"
                          ? ["kw", "maxDcKw"].includes(k)
                          : draft.category === "bat"
                            ? ["capacity", "dod"].includes(k)
                            : false,
                    )
                    .map(([k, label]) => (
                      <label className="field" key={k}>
                        <span>{label}</span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="any"
                          value={draft[k] ?? ""}
                          onChange={(e) => change(k, e.target.value)}
                        />
                      </label>
                    ))}
                  {draft.category === "inv" && (
                    <label className="field">
                      <span>Pha</span>
                      <select
                        aria-label="Pha"
                        className="select"
                        value={draft.phase ?? ""}
                        onChange={(e) => change("phase", e.target.value)}
                      >
                        <option value="">Chưa xác nhận</option>
                        <option value="1">1 pha</option>
                        <option value="3">3 pha</option>
                      </select>
                    </label>
                  )}
                </div>
              </details>
              <p className="record-helper">
                Nguồn: {draft.source || "Nhập thủ công"}
                {draft.updatedAt
                  ? " · Cập nhật " +
                    new Date(draft.updatedAt).toLocaleDateString("vi-VN")
                  : ""}
              </p>
              {error && (
                <p className="record-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <footer>
              {draft.id && (
                <button
                  type="button"
                  className="btn btn-secondary record-dangerbutton"
                  onClick={() => remove(draft)}
                >
                  <Trash2 size={15} />
                  Xóa thiết bị
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDraft(null)}
              >
                Hủy
              </button>
              <button className="btn btn-primary" type="submit">
                <Save size={16} />
                Lưu thiết bị
              </button>
            </footer>
          </form>
        </RecordDialog>
      )}
    </div>
  );
}
