import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  LifeBuoy,
  Clock3,
  CheckCircle2,
  ArrowUpRight,
  Save,
  Trash2,
  ShieldCheck,
  CalendarDays,
  Phone,
  MessageSquare,
  UserRound,
  X,
  AlertTriangle,
} from "lucide-react";
import { RecordDialog, cleanContactPhone, zaloContact } from "./Customers";
import "./records.css";
import { searchText } from "../lib/workflow.js";

const statuses = [
  "Mới tiếp nhận",
  "Đang xử lý",
  "Chờ khách",
  "Chờ kỹ thuật",
  "Đã giải quyết",
  "Đã đóng",
];
const kinds = [
  "Tư vấn sử dụng",
  "Sản lượng / ứng dụng",
  "Cảnh báo / mất điện",
  "Bảo trì / vệ sinh",
  "Bảo hành thiết bị",
  "Chứng từ / thanh toán",
];
const uid = () => crypto.randomUUID();
const dayNow = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const blank = () => ({
  title: "",
  customerId: "",
  type: kinds[0],
  priority: "Bình thường",
  status: statuses[0],
  description: "",
  assignedTo: "",
  dueDate: "",
  serial: "",
  installedAt: "",
  warrantyUntil: "",
  resolution: "",
  history: [],
});
export default function Care({
  db,
  updateDb,
  notify,
  assistantAction = null,
  onConsumedAssistantAction,
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("Đang mở"),
    [draft, setDraft] = useState(null),
    [error, setError] = useState("");
  const consumedAssistant = useRef(null);
  useEffect(() => {
    if (!assistantAction || consumedAssistant.current === assistantAction)
      return;
    consumedAssistant.current = assistantAction;
    if (assistantAction.type === "new-ticket") {
      setDraft({
        ...blank(),
        ...(assistantAction.ticket || {}),
        id: undefined,
      });
      setError("");
    } else if (assistantAction.type === "filter") {
      setSearch(String(assistantAction.query || ""));
      setFilter(
        [
          "Tất cả",
          "Đang mở",
          "Quá hạn",
          "Hôm nay",
          "Ưu tiên cao",
          ...statuses,
        ].includes(assistantAction.filter)
          ? assistantAction.filter
          : "Đang mở",
      );
    }
    onConsumedAssistantAction?.();
  }, [assistantAction, onConsumedAssistantAction]);
  const tickets = db.tickets || [],
    customers = db.customers || [],
    closed = (t) => ["Đã giải quyết", "Đã đóng"].includes(t.status),
    customer = (id) => customers.find((c) => c.id === id);
  const overdue = (t) =>
    !closed(t) && Boolean(t.dueDate && t.dueDate < dayNow());
  const dueToday = (t) => !closed(t) && t.dueDate === dayNow();
  const urgent = (t) => !closed(t) && ["Cao", "Khẩn cấp"].includes(t.priority);
  const list = tickets.filter(
    (t) =>
      (filter === "Tất cả" ||
        (filter === "Đang mở"
          ? !closed(t)
          : filter === "Quá hạn"
            ? overdue(t)
            : filter === "Hôm nay"
              ? dueToday(t)
              : filter === "Ưu tiên cao"
                ? urgent(t)
                : t.status === filter)) &&
      [
        t.title,
        t.description,
        t.serial,
        t.assignedTo,
        customer(t.customerId)?.name,
        customer(t.customerId)?.phone,
      ].some((v) => searchText(v).includes(searchText(search))),
  );
  const change = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const save = (e) => {
    e.preventDefault();
    if (!draft.title.trim()) {
      setError("Nhập tiêu đề yêu cầu để lưu.");
      return;
    }
    if (
      draft.warrantyUntil &&
      draft.installedAt &&
      draft.warrantyUntil < draft.installedAt
    ) {
      setError("Ngày hết bảo hành không thể trước ngày lắp đặt.");
      return;
    }
    const id = draft.id || uid(),
      time = new Date().toISOString(),
      old = tickets.find((t) => t.id === id),
      history =
        old && old.status !== draft.status
          ? [
              {
                id: uid(),
                text: `Trạng thái: ${old.status} → ${draft.status}`,
                createdAt: time,
              },
              ...(draft.history || []),
            ]
          : draft.history || [];
    const value = {
      ...draft,
      id,
      title: draft.title.trim(),
      createdAt: draft.createdAt || time,
      updatedAt: time,
      history,
    };
    updateDb((p) => ({
      ...p,
      tickets: draft.id
        ? p.tickets.map((t) => (t.id === id ? value : t))
        : [value, ...p.tickets],
      activities: [
        {
          id: uid(),
          type: "ticket",
          text:
            (draft.id ? "Cập nhật hỗ trợ: " : "Tiếp nhận hỗ trợ: ") +
            value.title,
          createdAt: time,
        },
        ...(p.activities || []),
      ].slice(0, 200),
    }));
    setDraft(null);
    setError("");
    notify("Đã lưu phiếu hỗ trợ.");
  };
  const remove = (t) => {
    if (!window.confirm("Xóa phiếu hỗ trợ “" + t.title + "”?")) return;
    updateDb((p) => ({
      ...p,
      tickets: p.tickets.filter((x) => x.id !== t.id),
    }));
    setDraft(null);
    notify("Đã xóa phiếu hỗ trợ.");
  };
  const quickStatus = (t, status) => {
    if (t.status === status) return;
    const time = new Date().toISOString();
    updateDb((p) => ({
      ...p,
      tickets: p.tickets.map((x) =>
        x.id === t.id
          ? {
              ...x,
              status,
              updatedAt: time,
              history: [
                { id: uid(), text: "Chuyển sang " + status, createdAt: time },
                ...(x.history || []),
              ],
            }
          : x,
      ),
    }));
    notify("Đã cập nhật trạng thái.");
  };
  return (
    <div className="record-page care-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">AFTERCARE / ĐỒNG HÀNH SAU LẮP ĐẶT</span>
          <h1>Chăm sóc & bảo hành</h1>
          <p>Mọi yêu cầu được tiếp nhận. Mỗi lời hẹn đều có người theo sát.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setDraft(blank());
            setError("");
          }}
        >
          <Plus size={17} />
          Tiếp nhận yêu cầu
        </button>
      </div>
      <div className="record-statrow">
        <div>
          <span>
            <LifeBuoy size={14} /> Đang mở
          </span>
          <strong>
            {tickets
              .filter((t) => !closed(t))
              .length.toString()
              .padStart(2, "0")}
          </strong>
        </div>
        <div>
          <span>
            <Clock3 size={14} /> Quá hạn
          </span>
          <strong>
            {tickets
              .filter((t) => !closed(t) && t.dueDate && t.dueDate < dayNow())
              .length.toString()
              .padStart(2, "0")}
          </strong>
        </div>
        <div>
          <span>
            <CheckCircle2 size={14} /> Đã giải quyết
          </span>
          <strong>
            {tickets.filter(closed).length.toString().padStart(2, "0")}
          </strong>
        </div>
        <div>
          <span>
            <ShieldCheck size={14} /> Phiếu còn bảo hành
          </span>
          <strong>
            {tickets
              .filter((t) => t.warrantyUntil >= dayNow())
              .length.toString()
              .padStart(2, "0")}
          </strong>
        </div>
      </div>
      <section className="card record-caresection">
        <div className="record-toolbar">
          <label className="record-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm yêu cầu, khách hàng, serial..."
              aria-label="Tìm yêu cầu hỗ trợ"
            />
          </label>
          <select
            className="select"
            aria-label="Lọc phiếu hỗ trợ"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>Đang mở</option>
            <option>Tất cả</option>
            <option>Quá hạn</option>
            <option>Hôm nay</option>
            <option>Ưu tiên cao</option>
            {statuses.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div
          className="record-quickfilters"
          aria-label="Chọn nhanh phiếu cần xử lý"
        >
          {[
            ["Đang mở", LifeBuoy, tickets.filter((t) => !closed(t)).length],
            ["Quá hạn", AlertTriangle, tickets.filter(overdue).length],
            ["Hôm nay", CalendarDays, tickets.filter(dueToday).length],
            ["Ưu tiên cao", Clock3, tickets.filter(urgent).length],
          ].map(([value, Icon, count]) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              <Icon size={14} />
              {value}
              <span>{count}</span>
            </button>
          ))}
        </div>
        <div className="record-resultsbar" role="status">
          <span>
            {list.length} / {tickets.length} phiếu hỗ trợ
          </span>
          {(search || filter !== "Đang mở") && (
            <button
              onClick={() => {
                setSearch("");
                setFilter("Đang mở");
              }}
            >
              Đặt lại <X size={13} />
            </button>
          )}
        </div>
        {list.length ? (
          <div className="record-ticketgrid">
            {list.map((t) => (
              <article className="record-ticket" key={t.id}>
                <div className="record-tickethead">
                  <span
                    className={
                      "badge " + (t.priority === "Khẩn cấp" ? "danger" : "")
                    }
                  >
                    {t.priority}
                  </span>
                  <button
                    className="record-icon"
                    onClick={() => {
                      setDraft(structuredClone(t));
                      setError("");
                    }}
                    aria-label={"Mở " + t.title}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </div>
                <span className="record-tickettype">{t.type}</span>
                <button
                  className="record-tickettitle"
                  onClick={() => setDraft(structuredClone(t))}
                >
                  {t.title}
                </button>
                <p>{t.description || "Chưa bổ sung mô tả."}</p>
                <div className="record-ticketcustomer">
                  <span>
                    <UserRound size={14} />
                    {customer(t.customerId)?.name || "Khách chưa liên kết"}
                  </span>
                  <small>{t.assignedTo || "Chưa phân công"}</small>
                </div>
                {cleanContactPhone(customer(t.customerId)?.phone) && (
                  <div className="record-ticketcontact">
                    <a
                      href={
                        "tel:" + cleanContactPhone(customer(t.customerId).phone)
                      }
                    >
                      <Phone size={15} />
                      Gọi khách
                    </a>
                    <a
                      href={
                        "https://zalo.me/" +
                        zaloContact(customer(t.customerId).phone)
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageSquare size={15} />
                      Nhắn Zalo
                      <ArrowUpRight size={13} />
                    </a>
                  </div>
                )}
                <div className="record-ticketfoot">
                  <select
                    aria-label={"Trạng thái " + t.title}
                    className="select"
                    value={t.status}
                    onChange={(e) => quickStatus(t, e.target.value)}
                  >
                    {statuses.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                  <span
                    className={
                      t.dueDate && t.dueDate < dayNow() && !closed(t)
                        ? "record-due"
                        : ""
                    }
                  >
                    <CalendarDays size={13} />
                    {t.dueDate
                      ? new Date(t.dueDate + "T00:00:00").toLocaleDateString(
                          "vi-VN",
                        )
                      : "Chưa hẹn"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="record-empty">
            <LifeBuoy size={36} />
            <h3>
              {tickets.length
                ? "Không có yêu cầu phù hợp"
                : "Chăm sóc bắt đầu từ sự lắng nghe"}
            </h3>
            <p>
              Tiếp nhận phản hồi, hẹn bảo trì, theo dõi thiết bị và giữ đầy đủ
              lịch sử xử lý trong một hồ sơ.
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => setDraft(blank())}
            >
              <Plus size={16} />
              Tạo phiếu hỗ trợ
            </button>
          </div>
        )}
      </section>
      {draft && (
        <RecordDialog
          title={draft.id ? "Chi tiết yêu cầu" : "Tiếp nhận yêu cầu mới"}
          onClose={() => {
            setDraft(null);
            setError("");
          }}
          wide
        >
          <form onSubmit={save}>
            <div className="record-dialogbody">
              <label className="field">
                <span>Tiêu đề yêu cầu *</span>
                <input
                  className="input"
                  required
                  value={draft.title}
                  onChange={(e) => change("title", e.target.value)}
                  placeholder="Ví dụ: Hẹn kiểm tra sản lượng sau 30 ngày"
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>Khách hàng</span>
                  <select
                    aria-label="Khách hàng"
                    className="select"
                    value={draft.customerId}
                    onChange={(e) => change("customerId", e.target.value)}
                  >
                    <option value="">Chưa liên kết</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.phone}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Loại yêu cầu</span>
                  <select
                    aria-label="Loại yêu cầu"
                    className="select"
                    value={draft.type}
                    onChange={(e) => change("type", e.target.value)}
                  >
                    {kinds.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Mức ưu tiên</span>
                  <select
                    aria-label="Mức ưu tiên"
                    className="select"
                    value={draft.priority}
                    onChange={(e) => change("priority", e.target.value)}
                  >
                    {["Bình thường", "Cao", "Khẩn cấp"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Trạng thái</span>
                  <select
                    aria-label="Trạng thái"
                    className="select"
                    value={draft.status}
                    onChange={(e) => change("status", e.target.value)}
                  >
                    {statuses.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Người xử lý</span>
                  <input
                    className="input"
                    value={draft.assignedTo}
                    onChange={(e) => change("assignedTo", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Lịch xử lý / bảo trì</span>
                  <input
                    className="input"
                    type="date"
                    value={draft.dueDate}
                    onChange={(e) => change("dueDate", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Serial / mã hệ thống</span>
                  <input
                    className="input"
                    value={draft.serial}
                    onChange={(e) => change("serial", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Ngày lắp đặt / nghiệm thu</span>
                  <input
                    className="input"
                    type="date"
                    value={draft.installedAt}
                    onChange={(e) => change("installedAt", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Ngày hết bảo hành đã xác nhận</span>
                  <input
                    className="input"
                    type="date"
                    value={draft.warrantyUntil}
                    onChange={(e) => change("warrantyUntil", e.target.value)}
                  />
                </label>
              </div>
              <label className="field">
                <span>Mô tả / hiện trạng</span>
                <textarea
                  className="input"
                  rows={4}
                  value={draft.description}
                  onChange={(e) => change("description", e.target.value)}
                />
              </label>
              <label className="field">
                <span>Kết quả xử lý / hướng dẫn cho khách</span>
                <textarea
                  className="input"
                  rows={3}
                  value={draft.resolution}
                  onChange={(e) => change("resolution", e.target.value)}
                />
              </label>
              {(draft.history || []).length > 0 && (
                <div className="record-timeline">
                  <h3>Lịch sử trạng thái</h3>
                  {draft.history.map((h) => (
                    <article key={h.id}>
                      <i />
                      <div>
                        <p>{h.text}</p>
                        <small>
                          {new Date(h.createdAt).toLocaleString("vi-VN")}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              )}
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
                  Xóa
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
                Lưu yêu cầu
              </button>
            </footer>
          </form>
        </RecordDialog>
      )}
    </div>
  );
}
