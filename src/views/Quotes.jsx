import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  FileText,
  ArrowUpRight,
  Download,
  Copy,
  Check,
  X,
  Trash2,
  Printer,
  Image,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ChevronRight,
  LoaderCircle,
  SquarePen,
  Eye,
  Save,
} from "lucide-react";
import { downloadBlob } from "../lib/share.js";
import "./quotes.css";
import Brand from "../components/Brand.jsx";

const money = (n) => Math.round(Number(n) || 0).toLocaleString("vi-VN") + " đ";
const number = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
const day = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const uid = () => crypto.randomUUID();
const date = (x) =>
  x
    ? new Date(x).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : "—";
const clone = (x) => structuredClone(x);
const endDate = (days) =>
  new Date(Date.now() + days * 86400000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
const statusText = {
  draft: "Bản nháp",
  issued: "Đã phát hành",
  accepted: "Khách đồng ý",
  declined: "Không tiếp tục",
};
function createDraft(plan, settings, source) {
  if (source)
    return {
      ...clone(source),
      id: undefined,
      status: "draft",
      parentId: source.id,
      revision: (source.revision || 1) + 1,
      createdAt: undefined,
      number: source.number + " / R" + ((source.revision || 1) + 1),
    };
  return {
    number:
      "BG-NHAP-" +
      day().replaceAll("-", "") +
      "-" +
      uid().slice(0, 4).toUpperCase(),
    revision: 1,
    status: "draft",
    createdAt: new Date().toISOString(),
    validUntil: endDate(Number(settings.quoteValidityDays) || 7),
    template: "premium",
    customerId: "",
    customer: { name: "", phone: "", address: "", taxCode: "" },
    rows: clone(plan?.result?.rows || []).map((r, i) => ({
      ...r,
      id: r.id || "r" + i,
      name: r.name || "Hạng mục",
      model: r.model || "",
      unit: r.unit || "bộ",
      qty: number(r.qty),
      price: number(r.price),
      verified: !!r.verified,
    })),
    vatMode: settings.quotePricesIncludeVat === false ? "excluded" : "included",
    vatRate: number(settings.vatQuote ?? 0.08),
    discount: 0,
    terms:
      settings.quoteTerms ||
      `Báo giá có hiệu lực ${Number(settings.quoteValidityDays) || 7} ngày. Tiến độ và điều kiện thanh toán được xác nhận sau khảo sát. Phạm vi khung dàn, tiếp địa và phát sinh cần được hai bên thống nhất.`,
    plan: plan ? clone(plan) : null,
  };
}
function amounts(q) {
  const subtotal = q.rows.reduce(
      (s, r) => s + number(r.qty) * number(r.price),
      0,
    ),
    discount = Math.min(subtotal, Math.max(0, number(q.discount))),
    net = subtotal - discount,
    tax = q.vatMode === "excluded" ? Math.round(net * number(q.vatRate)) : 0;
  return { subtotal, discount, net, tax, total: Math.round(net + tax) };
}
function blocks(q) {
  const out = [];
  if (!q.customer?.name?.trim()) out.push("Chưa có tên khách hàng.");
  if (!q.customer?.phone?.trim()) out.push("Chưa có số điện thoại khách hàng.");
  else if (
    !/^\+?[0-9()\s.-]{8,22}$/.test(q.customer.phone) ||
    q.customer.phone.replace(/\D/g, "").length < 8
  )
    out.push("Số điện thoại khách hàng chưa hợp lệ.");
  if (!q.rows.length) out.push("Chưa có hạng mục báo giá.");
  if (
    q.rows.some(
      (r) =>
        !r.name?.trim() ||
        !Number.isFinite(+r.qty) ||
        +r.qty <= 0 ||
        +r.qty > 100000 ||
        !Number.isFinite(+r.price) ||
        +r.price < 0 ||
        +r.price > 1e12,
    )
  )
    out.push("Tên, số lượng hoặc giá của hạng mục chưa hợp lệ.");
  if (
    q.rows.some(
      (r) =>
        !r.verified ||
        +r.price === 0 ||
        +r.price === 8888888 ||
        +r.price === 1111111111,
    )
  )
    out.push("Có hạng mục chưa xác minh giá hoặc giá cần kiểm tra.");
  if (q.plan?.result?.warnings?.some((w) => w.level === "error"))
    out.push("Phương án còn lỗi kỹ thuật cần xử lý trước khi phát hành.");
  if (
    q.plan?.result?.rows?.some(
      (source) =>
        ["panel", "inv", "bat"].includes(source.id) &&
        !q.rows.some(
          (r) =>
            r.id === source.id &&
            number(r.qty) === number(source.qty) &&
            String(r.model || "") === String(source.model || ""),
        ),
    )
  )
    out.push(
      "Thiết bị hoặc số lượng đã khác phương án tính toán. Hãy lập lại báo giá từ phương án được tính lại.",
    );
  if (q.plan && q.plan.input?.surveyConfirmed !== true)
    out.push(
      "Chưa xác nhận khảo sát thực tế; chỉ lưu nháp cho đến khi phương án đã được kiểm tra.",
    );
  if (
    !q.validUntil ||
    Date.parse(q.validUntil + "T23:59:59+07:00") < Date.now()
  )
    out.push("Hiệu lực báo giá không hợp lệ hoặc đã hết hạn.");
  return out;
}
async function capturePages(node) {
  await document.fonts.ready;
  const { toCanvas } = await import("html-to-image");
  const canvas = await toCanvas(node, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    skipFonts: false,
    preferredFontFormat: "woff2",
    cacheBust: false,
  });
  const pageHeight = Math.floor((canvas.width / 190) * 273),
    scale = canvas.width / node.offsetWidth;
  const origin = node.getBoundingClientRect().top,
    breaks = [...node.querySelectorAll("tr,.ks-q-totals,.ks-q-terms")].map(
      (e) => ({
        top: Math.floor((e.getBoundingClientRect().top - origin) * scale),
        bottom: Math.ceil((e.getBoundingClientRect().bottom - origin) * scale),
      }),
    );
  const pages = [];
  let start = 0;
  while (start < canvas.height) {
    let end = Math.min(start + pageHeight, canvas.height);
    const crossing = breaks.find(
      (b) => b.top < end && b.bottom > end && b.top > start + pageHeight * 0.35,
    );
    if (crossing) end = crossing.top;
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = end - start;
    const ctx = slice.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(
      canvas,
      0,
      start,
      canvas.width,
      end - start,
      0,
      0,
      canvas.width,
      end - start,
    );
    pages.push(slice);
    start = end;
  }
  return pages;
}
function Editor({
  draft,
  setDraft,
  readOnly,
  settings,
  customers,
  products,
  onClose,
  onSave,
  onDuplicate,
  notify,
}) {
  const dialog = useRef(),
    paper = useRef(),
    [busy, setBusy] = useState(""),
    [tab, setTab] = useState(readOnly ? "preview" : "edit");
  const totals = amounts(draft),
    issues = blocks(draft),
    company = settings.companyName || "CÔNG TY TNHH NĂNG LƯỢNG KIM SOLAR";
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const change = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const rowChange = (i, key, value) =>
    setDraft((d) => ({
      ...d,
      rows: d.rows.map((r, j) => (i === j ? { ...r, [key]: value } : r)),
    }));
  const customerChange = (key, value) =>
    setDraft((d) => ({ ...d, customer: { ...d.customer, [key]: value } }));
  function chooseCustomer(id) {
    const c = customers.find((c) => c.id === id);
    setDraft((d) => ({
      ...d,
      customerId: id,
      customer: c
        ? {
            name: c.name || c.fullName || "",
            phone: c.phone || c.tel || "",
            address: c.address || "",
            taxCode: c.taxCode || "",
          }
        : { name: "", phone: "", address: "", taxCode: "" },
    }));
  }
  function productAdd(id) {
    const p = products.find((p) => p.id === id);
    if (!p) return;
    setDraft((d) => ({
      ...d,
      rows: [
        ...d.rows,
        {
          id: uid(),
          name:
            ({ panel: "Tấm pin", inv: "Biến tần", bat: "Pin lưu trữ" }[
              p.category
            ] || p.category) +
            " " +
            p.brand,
          model: p.model || p.description || "",
          unit: p.category === "panel" ? "tấm" : "bộ",
          qty: 1,
          price: number(p.price),
          verified: !!p.verified,
          image: p.image,
          warranty: p.warranty || "",
        },
      ],
    }));
  }
  async function exportDoc(type) {
    setBusy(type);
    try {
      setTab("preview");
      await new Promise((r) => setTimeout(r, 120));
      const pages = await capturePages(paper.current);
      if (type === "pdf") {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
          compress: true,
        });
        pages.forEach((page, i) => {
          if (i) pdf.addPage();
          pdf.addImage(
            page.toDataURL("image/jpeg", 0.94),
            "JPEG",
            10,
            10,
            190,
            (page.height / page.width) * 190,
            undefined,
            "FAST",
          );
          pdf.setFontSize(8);
          pdf.setTextColor(100);
          pdf.text(
            "Kim Solar | " + (settings.salesPhone || "0987000783"),
            10,
            290,
          );
          pdf.text(`${i + 1} / ${pages.length}`, 200, 290, { align: "right" });
        });
        pdf.save(
          (draft.number || "Bao-gia-Kim-Solar").replaceAll("/", "-") + ".pdf",
        );
      } else {
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i],
            canvas = document.createElement("canvas");
          canvas.width = 2480;
          canvas.height = 3508;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, 2480, 3508);
          ctx.drawImage(
            page,
            118,
            118,
            2244,
            (page.height / page.width) * 2244,
          );
          const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/png"),
          );
          if (!blob) throw Error("Không dựng được ảnh.");
          downloadBlob(
            blob,
            `Kim-Solar-${draft.number.replaceAll("/", "-")}-A4-${i + 1}.png`,
          );
        }
      }
      notify(
        type === "pdf"
          ? "Đã tạo báo giá PDF A4."
          : "Đã tạo ảnh A4. Nếu có nhiều trang, trình duyệt có thể hỏi cho phép tải nhiều tệp.",
      );
    } catch (e) {
      console.error(e);
      notify("Không xuất được tài liệu: " + e.message);
    } finally {
      setBusy("");
    }
  }
  const quoteIssued = draft.status !== "draft" && draft.status;
  return (
    <dialog
      ref={dialog}
      className="ks-dialog ks-quote-dialog"
      onCancel={onClose}
      aria-labelledby="quote-editor-title"
    >
      <header className="ks-modal-head">
        <div>
          <span className="eyebrow">BÁO GIÁ & HỒ SƠ BÁN HÀNG</span>
          <h2 id="quote-editor-title">
            {readOnly ? "Bản báo giá đã lưu" : "Soạn báo giá"}{" "}
            <span className="ks-revision">R{draft.revision || 1}</span>
          </h2>
        </div>
        <button
          className="ks-icon-btn"
          onClick={onClose}
          aria-label="Đóng báo giá"
        >
          <X size={21} />
        </button>
      </header>
      <div className="ks-q-toolbar">
        <div className="ks-tabs">
          <button
            className={tab === "edit" ? "selected" : ""}
            onClick={() => setTab("edit")}
          >
            <SquarePen size={16} />
            Thông tin & hạng mục
          </button>
          <button
            className={tab === "preview" ? "selected" : ""}
            onClick={() => setTab("preview")}
          >
            <Eye size={16} />
            Xem bản A4
          </button>
        </div>
        <div className="ks-q-export">
          <button
            className="btn btn-secondary"
            disabled={!!busy}
            onClick={() => exportDoc("image")}
          >
            <Image size={15} />
            Ảnh A4
          </button>
          <button
            className="btn btn-secondary"
            disabled={!!busy}
            onClick={() => exportDoc("pdf")}
          >
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Download size={15} />
            )}
            PDF A4
          </button>
        </div>
      </div>
      {tab === "edit" ? (
        <div className="ks-q-editor">
          <div className="ks-q-editor-main">
            <section className="card">
              <div className="card-head">
                <h3>Khách hàng nhận báo giá</h3>
                <span className="badge">{draft.number}</span>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Chọn từ hồ sơ khách</span>
                  <select
                    className="input"
                    value={draft.customerId || ""}
                    onChange={(e) => chooseCustomer(e.target.value)}
                    disabled={readOnly}
                  >
                    <option value="">Nhập khách hàng trực tiếp</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.fullName} · {c.phone || c.tel || ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Tên khách hàng / Công ty</span>
                  <input
                    className="input"
                    value={draft.customer?.name || ""}
                    onChange={(e) => customerChange("name", e.target.value)}
                    disabled={readOnly}
                  />
                </label>
                <label className="field">
                  <span>Điện thoại khách hàng</span>
                  <input
                    className="input"
                    inputMode="tel"
                    value={draft.customer?.phone || ""}
                    onChange={(e) => customerChange("phone", e.target.value)}
                    disabled={readOnly}
                  />
                </label>
                <label className="field">
                  <span>Mã số thuế (nếu có)</span>
                  <input
                    className="input"
                    value={draft.customer?.taxCode || ""}
                    onChange={(e) => customerChange("taxCode", e.target.value)}
                    disabled={readOnly}
                  />
                </label>
                <label className="field ks-span-full">
                  <span>Địa chỉ lắp đặt</span>
                  <input
                    className="input"
                    value={draft.customer?.address || ""}
                    onChange={(e) => customerChange("address", e.target.value)}
                    disabled={readOnly}
                  />
                </label>
              </div>
            </section>
            <section className="card">
              <div className="card-head">
                <h3>Danh mục hàng hóa & dịch vụ</h3>
                <span className="ks-muted">{draft.rows.length} hạng mục</span>
              </div>
              <div className="table-wrap">
                <table className="data-table ks-editor-table">
                  <thead>
                    <tr>
                      <th>Hạng mục</th>
                      <th>SL</th>
                      <th>Đơn giá (đ)</th>
                      <th>Thành tiền</th>
                      <th>Giá đã kiểm tra</th>
                      {!readOnly && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.rows.map((r, i) => (
                      <tr key={r.id + "-" + i}>
                        <td data-label={`Hạng mục ${i + 1}`}>
                          <input
                            aria-label={`Tên hạng mục ${i + 1}`}
                            value={r.name}
                            onChange={(e) =>
                              rowChange(i, "name", e.target.value)
                            }
                            disabled={readOnly}
                          />
                          <textarea
                            aria-label={`Model hạng mục ${i + 1}`}
                            value={r.model || ""}
                            onChange={(e) =>
                              rowChange(i, "model", e.target.value)
                            }
                            disabled={readOnly}
                            rows={2}
                          />
                          <input
                            className="ks-unit-input"
                            aria-label={`Đơn vị hạng mục ${i + 1}`}
                            value={r.unit}
                            onChange={(e) =>
                              rowChange(i, "unit", e.target.value)
                            }
                            disabled={readOnly}
                          />
                        </td>
                        <td data-label="Số lượng">
                          <input
                            type="number"
                            min="0"
                            max="100000"
                            step="0.01"
                            aria-label={`Số lượng hạng mục ${i + 1}`}
                            value={r.qty}
                            onChange={(e) =>
                              rowChange(
                                i,
                                "qty",
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                              )
                            }
                            disabled={readOnly}
                          />
                        </td>
                        <td data-label="Đơn giá (đ)">
                          <input
                            type="number"
                            min="0"
                            max="1000000000000"
                            aria-label={`Đơn giá hạng mục ${i + 1}`}
                            value={r.price}
                            onChange={(e) =>
                              rowChange(
                                i,
                                "price",
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                              )
                            }
                            disabled={readOnly}
                          />
                        </td>
                        <td className="ks-nowrap" data-label="Thành tiền">
                          {money(number(r.qty) * number(r.price))}
                        </td>
                        <td data-label="Xác minh đơn giá">
                          <label className="ks-price-check">
                            <input
                              type="checkbox"
                              checked={!!r.verified}
                              onChange={(e) =>
                                rowChange(i, "verified", e.target.checked)
                              }
                              disabled={readOnly}
                            />
                            <span>
                              {r.verified ? "Đã kiểm tra" : "Chờ xác minh"}
                            </span>
                          </label>
                        </td>
                        {!readOnly && (
                          <td>
                            <button
                              className="ks-icon-btn"
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  rows: d.rows.filter((_, j) => i !== j),
                                }))
                              }
                              aria-label={`Xóa hạng mục ${i + 1}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!readOnly && (
                <div className="ks-add-row">
                  <select
                    className="input"
                    value=""
                    onChange={(e) => productAdd(e.target.value)}
                    aria-label="Thêm thiết bị từ danh mục"
                  >
                    <option value="">+ Chọn thiết bị từ danh mục</option>
                    {products
                      .filter((p) => p.active && p.model)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.brand} · {p.model.split("\n")[0]}
                        </option>
                      ))}
                  </select>
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        rows: [
                          ...d.rows,
                          {
                            id: uid(),
                            name: "Hạng mục bổ sung",
                            model: "",
                            unit: "bộ",
                            qty: 1,
                            price: 0,
                            verified: false,
                          },
                        ],
                      }))
                    }
                  >
                    <Plus size={15} />
                    Thêm dòng
                  </button>
                </div>
              )}
            </section>
          </div>
          <aside className="ks-q-editor-side">
            <section className="card">
              <h3>Điều kiện báo giá</h3>
              <label className="field">
                <span>Mẫu trình bày</span>
                <select
                  className="input"
                  value={draft.template}
                  onChange={(e) => change("template", e.target.value)}
                  disabled={readOnly}
                >
                  <option value="premium">Kim Solar Signature</option>
                  <option value="standard">Bảng giá tiêu chuẩn</option>
                </select>
              </label>
              <label className="field">
                <span>Có hiệu lực đến</span>
                <input
                  className="input"
                  type="date"
                  value={draft.validUntil}
                  onChange={(e) => change("validUntil", e.target.value)}
                  disabled={readOnly}
                />
              </label>
              <label className="field">
                <span>Cách tính VAT hàng hóa</span>
                <select
                  className="input"
                  value={draft.vatMode}
                  onChange={(e) => change("vatMode", e.target.value)}
                  disabled={readOnly}
                >
                  <option value="included">Đơn giá đã gồm VAT</option>
                  <option value="excluded">Đơn giá chưa gồm VAT</option>
                  <option value="none">Không tính VAT / Chưa áp dụng</option>
                </select>
              </label>
              {draft.vatMode !== "none" && (
                <label className="field">
                  <span>Thuế suất hàng hóa (%)</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="20"
                    value={Math.round(number(draft.vatRate) * 100)}
                    onChange={(e) =>
                      change(
                        "vatRate",
                        Math.max(0, Math.min(20, +e.target.value)) / 100,
                      )
                    }
                    disabled={readOnly}
                  />
                </label>
              )}
              <label className="field">
                <span>Giảm giá (đ)</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max={totals.subtotal}
                  value={draft.discount}
                  onChange={(e) =>
                    change("discount", Math.max(0, +e.target.value || 0))
                  }
                  disabled={readOnly}
                />
              </label>
              <label className="field">
                <span>Phạm vi & điều khoản</span>
                <textarea
                  className="input"
                  rows={5}
                  value={draft.terms}
                  onChange={(e) => change("terms", e.target.value)}
                  disabled={readOnly}
                />
              </label>
            </section>
            <section className="ks-q-summary">
              <div>
                <span>Tiền hàng</span>
                <b>{money(totals.subtotal)}</b>
              </div>
              <div>
                <span>Giảm giá</span>
                <b>− {money(totals.discount)}</b>
              </div>
              <div>
                <span>
                  {draft.vatMode === "excluded"
                    ? "VAT cộng thêm"
                    : draft.vatMode === "included"
                      ? "VAT đã nằm trong đơn giá"
                      : "Không cộng VAT"}
                </span>
                <b>{draft.vatMode === "excluded" ? money(totals.tax) : "—"}</b>
              </div>
              <div className="ks-q-grand">
                <span>Tổng thanh toán</span>
                <strong>{money(totals.total)}</strong>
              </div>
            </section>
            {issues.length > 0 && (
              <div className="ks-q-issues">
                <b>
                  <AlertTriangle size={15} />
                  Chưa đủ điều kiện phát hành
                </b>
                <ul>
                  {issues.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <p>
                  Vẫn có thể lưu và xuất bản nháp. Kiểm tra giá ở báo giá này
                  không sửa bảng giá chung.
                </p>
              </div>
            )}
          </aside>
        </div>
      ) : (
        <div className="ks-q-preview-wrap">
          <article
            ref={paper}
            className={
              "ks-q-paper " +
              (draft.template === "standard" ? "ks-q-standard" : "")
            }
          >
            <header className="ks-q-company">
              <div>
                <div className="ks-q-logo">
                  <Brand className="quote-brand" />
                </div>
                <strong>{company}</strong>
                <p>
                  {settings.address ||
                    "19C Đường N4, KĐT The Seasons Bình Dương, P. Lái Thiêu, TP.HCM"}
                </p>
                <p>
                  MST: {settings.taxCode || "3703397629"} ·{" "}
                  {settings.email || "cskh.kimsolar@gmail.com"}
                </p>
                <p>
                  <b>
                    {settings.salesPhone || "0987000783"} —{" "}
                    {settings.salesName || "Nhân Viên Kinh Doanh"}
                  </b>
                </p>
              </div>
              <span className={"ks-q-state " + (quoteIssued ? "issued" : "")}>
                {statusText[draft.status] || "BẢN NHÁP"}
              </span>
            </header>
            <div className="ks-q-title">
              <span>GIẢI PHÁP ĐIỆN MẶT TRỜI ÁP MÁI</span>
              <h1>BẢNG BÁO GIÁ</h1>
              <p>
                {draft.number} · Phiên bản {draft.revision || 1} · Ngày{" "}
                {date(draft.createdAt || new Date().toISOString())}
              </p>
            </div>
            <section className="ks-q-recipient">
              <div>
                <small>KÍNH GỬI</small>
                <strong>{draft.customer?.name || "Quý khách hàng"}</strong>
                <p>
                  {draft.customer?.address ||
                    "Địa chỉ lắp đặt chưa được cung cấp"}
                </p>
              </div>
              <div>
                <p>Điện thoại: {draft.customer?.phone || "—"}</p>
                <p>MST: {draft.customer?.taxCode || "—"}</p>
                <p>
                  Hiệu lực đến: <b>{date(draft.validUntil)}</b>
                </p>
              </div>
            </section>
            {draft.plan?.result && (
              <div className="ks-q-specs">
                <div>
                  <small>Công suất hệ thống</small>
                  <b>
                    {draft.plan.result.systemKwp?.toLocaleString("vi-VN", {
                      maximumFractionDigits: 2,
                    }) || "—"}{" "}
                    kWp
                  </b>
                </div>
                <div>
                  <small>Tấm pin</small>
                  <b>{draft.plan.result.panelCount || "—"} tấm</b>
                </div>
                <div>
                  <small>Biến tần</small>
                  <b>
                    {draft.plan.result.inverterKw ||
                      draft.plan.result.recommendedInverterKw ||
                      "—"}{" "}
                    kW
                  </b>
                </div>
                <div>
                  <small>Lưu trữ</small>
                  <b>
                    {draft.plan.result.batteryKwh ||
                      draft.plan.result.batteryInstalledKwh ||
                      0}{" "}
                    kWh
                  </b>
                </div>
              </div>
            )}
            <table className="ks-q-print-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>THIẾT BỊ / HẠNG MỤC</th>
                  <th>ĐVT</th>
                  <th>SL</th>
                  <th>ĐƠN GIÁ</th>
                  <th>THÀNH TIỀN</th>
                </tr>
              </thead>
              <tbody>
                {draft.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      <strong>{r.name}</strong>
                      {r.model && <p>{r.model}</p>}
                      {r.warranty && <small>{r.warranty}</small>}
                      {!r.verified && <em>Giá chờ xác minh</em>}
                    </td>
                    <td>{r.unit}</td>
                    <td>{number(r.qty).toLocaleString("vi-VN")}</td>
                    <td>{money(r.price)}</td>
                    <td>
                      <b>{money(number(r.qty) * number(r.price))}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <section className="ks-q-totals">
              <div>
                <span>Tiền hàng</span>
                <b>{money(totals.subtotal)}</b>
              </div>
              {totals.discount > 0 && (
                <div>
                  <span>Giảm giá</span>
                  <b>− {money(totals.discount)}</b>
                </div>
              )}
              <div>
                <span>
                  {draft.vatMode === "excluded"
                    ? "VAT " + Math.round(number(draft.vatRate) * 100) + "%"
                    : draft.vatMode === "included"
                      ? "Đơn giá đã gồm VAT " +
                        Math.round(number(draft.vatRate) * 100) +
                        "%"
                      : "Không cộng VAT"}
                </span>
                <b>
                  {draft.vatMode === "excluded"
                    ? money(totals.tax)
                    : "Đã thể hiện trong tổng"}
                </b>
              </div>
              <div className="ks-q-total">
                <span>TỔNG THANH TOÁN</span>
                <strong>{money(totals.total)}</strong>
              </div>
            </section>
            <section className="ks-q-terms">
              <h3>Phạm vi & điều kiện</h3>
              <p>{draft.terms}</p>
              {draft.plan && (
                <p className="ks-q-disclaimer">
                  Sản lượng, tiết kiệm và thông số là ước tính theo dữ liệu
                  phương án. Thay đổi thiết bị/khối lượng trong báo giá cần được
                  kiểm tra lại thiết kế; bảng này không tự tính lại hiệu quả
                  điện năng.
                </p>
              )}
              {!quoteIssued && (
                <p className="ks-q-draft-note">
                  BẢN NHÁP — CHƯA ĐƯỢC PHÁT HÀNH. Giá, thuế, model và phạm vi
                  cần được xác nhận.
                </p>
              )}
              <div className="ks-q-signatures">
                <span>ĐẠI DIỆN KHÁCH HÀNG</span>
                <span>
                  ĐẠI DIỆN KIM SOLAR
                  <br />
                  <small>{settings.salesName || "Nhân Viên Kinh Doanh"}</small>
                </span>
              </div>
            </section>
            <footer className="ks-q-footer">
              KIM SOLAR · {settings.salesPhone || "0987000783"} ·{" "}
              {settings.email || "cskh.kimsolar@gmail.com"}
            </footer>
          </article>
        </div>
      )}
      <footer className="ks-q-bottom">
        <p>
          <ShieldCheck size={15} />
          {readOnly
            ? "Bản đã lưu được giữ nguyên. Tạo phiên bản mới để chỉnh sửa."
            : "Lưu một bản chụp riêng, không thay đổi báo giá cũ."}
        </p>
        <div>
          {readOnly ? (
            <button
              className="btn btn-primary"
              onClick={() => onDuplicate(draft)}
            >
              <Copy size={16} />
              Tạo phiên bản mới
            </button>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => onSave(draft, "draft")}
              >
                <Save size={16} />
                Lưu bản nháp
              </button>
              <button
                className="btn btn-primary"
                disabled={!!issues.length}
                title={
                  issues.length
                    ? "Hoàn thiện các mục kiểm tra trước khi phát hành"
                    : ""
                }
                onClick={() => onSave(draft, "issued")}
              >
                <Check size={16} />
                Phát hành bản chốt
              </button>
            </>
          )}
        </div>
      </footer>
    </dialog>
  );
}
export default function Quotes({
  db,
  updateDb,
  notify = () => {},
  onNavigate,
  initialPlan,
  onConsumedPlan,
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [draft, setDraft] = useState(null),
    [readOnly, setReadOnly] = useState(false);
  const settings = db.settings || {},
    quotes = db.quotes || [];
  useEffect(() => {
    if (initialPlan) {
      setDraft(createDraft(initialPlan, settings));
      setReadOnly(false);
      onConsumedPlan?.();
    }
  }, [initialPlan]);
  const visible = useMemo(
    () =>
      quotes.filter(
        (q) =>
          (filter === "all" || q.status === filter) &&
          [q.number, q.customer?.name, q.customer?.phone].some((x) =>
            String(x || "")
              .toLowerCase()
              .includes(search.toLowerCase()),
          ),
      ),
    [quotes, filter, search],
  );
  function save(q, status) {
    if (status === "issued") {
      const issues = blocks(q);
      if (issues.length) {
        notify(issues[0]);
        return;
      }
    }
    if (!q.rows.length) {
      notify("Thêm ít nhất một hạng mục trước khi lưu.");
      return;
    }
    if (
      q.rows.some(
        (r) =>
          !r.name?.trim() ||
          !Number.isFinite(+r.qty) ||
          +r.qty <= 0 ||
          +r.qty > 100000 ||
          !Number.isFinite(+r.price) ||
          +r.price < 0 ||
          +r.price > 1e12,
      )
    ) {
      notify("Kiểm tra tên, số lượng và giá của từng dòng.");
      return;
    }
    const snapshot = {
      ...clone(q),
      ...amounts(q),
      id: uid(),
      status,
      createdAt: new Date().toISOString(),
      issuedAt: status === "issued" ? new Date().toISOString() : null,
    };
    updateDb((prev) => ({
      ...prev,
      quotes: [snapshot, ...(prev.quotes || [])],
    }));
    setDraft(null);
    notify(
      status === "issued"
        ? "Đã lưu bản báo giá phát hành trên thiết bị này."
        : "Đã lưu báo giá nháp và giá tại thời điểm lập.",
    );
  }
  const issued = quotes.filter((q) => q.status === "issued"),
    value = issued.reduce((n, q) => n + number(q.total), 0);
  return (
    <section className="ks-quotes-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TỪ PHƯƠNG ÁN ĐẾN QUYẾT ĐỊNH</span>
          <h1>Báo giá & đề xuất</h1>
          <p>Mỗi phiên bản là một lời tư vấn rõ ràng, có thể tra cứu lại.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setDraft(createDraft(null, settings));
            setReadOnly(false);
          }}
        >
          <Plus size={17} />
          Tạo báo giá
        </button>
      </div>
      <div className="ks-q-stats">
        <div className="card">
          <span>
            <FileText size={16} />
            Tổng báo giá
          </span>
          <strong>{quotes.length}</strong>
          <small>Bản chụp đã lưu trên thiết bị</small>
        </div>
        <div className="card">
          <span>
            <Clock size={16} />
            Đang soạn thảo
          </span>
          <strong>{quotes.filter((q) => q.status === "draft").length}</strong>
          <small>Cần hoàn thiện trước khi phát hành</small>
        </div>
        <div className="card">
          <span>
            <ShieldCheck size={16} />
            Đã phát hành
          </span>
          <strong>{issued.length}</strong>
          <small>{money(value)} tổng giá trị đề xuất</small>
        </div>
      </div>
      <section className="card ks-q-list-card">
        <div className="ks-q-list-tools">
          <div className="ks-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm khách hàng, số báo giá, điện thoại…"
              aria-label="Tìm báo giá"
            />
          </div>
          <div className="ks-filter-pills">
            {[
              ["all", "Tất cả"],
              ["draft", "Bản nháp"],
              ["issued", "Đã phát hành"],
            ].map(([v, t]) => (
              <button
                key={v}
                className={filter === v ? "active" : ""}
                onClick={() => setFilter(v)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {visible.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Báo giá / Phiên bản</th>
                  <th>Khách hàng</th>
                  <th>Giá trị</th>
                  <th>Trạng thái</th>
                  <th>Hiệu lực</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <button
                        className="ks-quote-number"
                        onClick={() => {
                          setDraft(clone(q));
                          setReadOnly(true);
                        }}
                      >
                        <FileText size={17} />
                        <span>
                          <b>{q.number}</b>
                          <small>
                            Phiên bản {q.revision || 1} · {date(q.createdAt)}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td>
                      {q.customer?.name || "Chưa nhập khách"}
                      <small className="ks-block-muted">
                        {q.customer?.phone || "—"}
                      </small>
                    </td>
                    <td>
                      <b>{money(q.total)}</b>
                    </td>
                    <td>
                      <span
                        className={
                          "badge " +
                          (q.status === "issued" ? "success" : "warning")
                        }
                      >
                        {statusText[q.status] || q.status}
                      </span>
                    </td>
                    <td>{date(q.validUntil)}</td>
                    <td>
                      <button
                        className="ks-icon-btn"
                        onClick={() => {
                          setDraft(clone(q));
                          setReadOnly(true);
                        }}
                        aria-label={"Xem " + q.number}
                      >
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state ks-q-empty">
            <span className="ks-empty-icon">
              <FileText size={34} />
            </span>
            <h3>
              {search
                ? "Chưa tìm thấy báo giá phù hợp"
                : "Báo giá đầu tiên bắt đầu từ một phương án tốt"}
            </h3>
            <p>
              {search
                ? "Thử tìm tên khách, số điện thoại hoặc mã báo giá khác."
                : "Tính cấu hình thiết bị rồi chuyển sang báo giá, hoặc tạo một báo giá nhập tay."}
            </p>
            <div>
              <button
                className="btn btn-primary"
                onClick={() => onNavigate?.("calculator")}
              >
                Tính phương án <ChevronRight size={16} />
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setDraft(createDraft(null, settings));
                  setReadOnly(false);
                }}
              >
                Nhập báo giá thủ công
              </button>
            </div>
          </div>
        )}
      </section>
      <p className="ks-small-note">
        Báo giá hiện lưu trên thiết bị này. Mã báo giá được sinh cục bộ, chưa
        phải bộ cấp số chung cho nhiều nhân viên. Tải sao lưu trong Cài đặt để
        giữ hồ sơ.
      </p>
      {draft && (
        <Editor
          key={draft.id || draft.number}
          draft={draft}
          setDraft={setDraft}
          readOnly={readOnly}
          settings={settings}
          customers={db.customers || []}
          products={db.products || []}
          onClose={() => setDraft(null)}
          onSave={save}
          onDuplicate={(source) => {
            setDraft(createDraft(null, settings, source));
            setReadOnly(false);
          }}
          notify={notify}
        />
      )}
    </section>
  );
}
