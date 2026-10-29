import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Users,
  Phone,
  MapPin,
  CalendarDays,
  ArrowUpRight,
  ClipboardList,
  Trash2,
  X,
  Save,
  MessageSquare,
  Camera,
  CheckCircle2,
  PencilLine,
  BadgeCheck,
} from "lucide-react";
import "./records.css";

const stages = [
  "Mới tiếp nhận",
  "Đang tư vấn",
  "Hẹn khảo sát",
  "Đã khảo sát",
  "Đã gửi báo giá",
  "Đang thương lượng",
  "Đã chốt",
  "Đã bàn giao",
  "Không tiếp tục",
];
// Keep call and Zalo links valid for both local and +84 phone formats.
export const cleanContactPhone = (value) => {
  const compact = String(value || "")
    .trim()
    .replace(/[\s().-]/g, "")
    .replace(/^00/, "+");
  return /^\+?\d{8,15}$/.test(compact) ? compact : "";
};
export const contactIdentity = (value) => {
  const phone = cleanContactPhone(value);
  return phone.replace(/^(?:\+84|84)(\d{9})$/, "0$1");
};
export const zaloContact = (value) => {
  const phone = contactIdentity(value);
  return phone.startsWith("0")
    ? "84" + phone.slice(1)
    : phone.replace(/^\+/, "");
};
const uid = () => crypto.randomUUID();
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const emptyCustomer = () => ({
  name: "",
  phone: "",
  email: "",
  address: "",
  type: "Hộ gia đình",
  status: "Mới tiếp nhận",
  assignedTo: "",
  nextContact: "",
  notes: "",
  survey: {},
  history: [],
});
const fieldGroups = [
  [
    "Lịch & đầu mối",
    [
      ["sdate", "Ngày khảo sát", "date"],
      ["guide", "Người hướng dẫn"],
      ["who", "Người khảo sát"],
      ["chk", "Người kiểm tra"],
      ["own", "Quyền sử dụng mặt bằng"],
      ["time", "Lịch lắp dự kiến", "datetime-local"],
    ],
  ],
  [
    "Nhu cầu điện",
    [
      ["bill", "Tiền điện trung bình (đ)", "number"],
      ["kwh", "Điện tiêu thụ (kWh/tháng)", "number"],
      ["day", "Tỷ lệ dùng ban ngày (%)", "number"],
      ["pha", "Điện lưới", "select", ["1 pha", "3 pha"]],
      ["htype", "Loại hộ", "select", ["Sinh hoạt", "Kinh doanh", "Sản xuất"]],
      ["peak", "Tải đỉnh dự kiến (kW)", "number"],
    ],
  ],
  [
    "Mái & tiếp cận",
    [
      ["roof", "Loại mái", "select", ["Tôn", "Ngói", "Bê tông", "Khác"]],
      ["rl", "Chiều dài mái (m)", "number"],
      ["rw", "Chiều rộng mái (m)", "number"],
      ["height", "Chiều cao (m)", "number"],
      ["floors", "Số tầng", "number"],
      ["dir", "Hướng mái", "select", ["Nam", "Đông", "Tây", "Bắc", "Mái bằng"]],
      ["tilt", "Độ nghiêng (°)", "number"],
      ["access", "Đường lên mái"],
      ["haul", "Đường vận chuyển"],
      ["pmat", "Vật liệu xà gồ"],
      ["pgap", "Khoảng cách xà gồ (m)", "number"],
      ["wave", "Sóng tôn"],
      ["cond", "Tình trạng mái"],
      ["obst", "Vật cản & bóng che"],
    ],
  ],
  [
    "Điện & phương án thi công",
    [
      ["meters", "Số công tơ", "number"],
      ["plo", "Vị trí tủ điện"],
      ["cb", "CB hiện hữu (A)", "number"],
      ["acs", "Tiết diện AC (mm²)", "number"],
      ["earth", "Tiếp địa", "select", ["Chưa kiểm tra", "Có", "Chưa có"]],
      ["invloc", "Vị trí biến tần/pin"],
      ["dPV", "PV → biến tần (m)", "number"],
      ["dInv", "Biến tần → tủ điện (m)", "number"],
      ["dEarth", "Chiều dài tiếp địa (m)", "number"],
      ["earthpl", "Vị trí cọc tiếp địa"],
      ["cpath", "Tuyến đi cáp"],
      ["drill", "Vị trí khoan/bắt mái"],
      ["pipe", "Ống luồn dây"],
      ["cpass", "Vị trí xuyên cáp"],
    ],
  ],
  [
    "Kết luận",
    [
      [
        "concl",
        "Kết luận khảo sát",
        "select",
        ["Chưa kết luận", "Đạt sơ bộ", "Cần bổ sung", "Chưa phù hợp"],
      ],
      ["v1", "Điểm cần lưu ý"],
      ["v2", "Việc cần xử lý"],
    ],
  ],
];
const dateLabel = (value) =>
  value
    ? new Date(
        value.length === 10 ? value + "T00:00:00" : value,
      ).toLocaleDateString("vi-VN")
    : "Chưa hẹn";

export function RecordDialog({ title, children, onClose, wide = false }) {
  const root = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const nodes = [
          ...root.current.querySelectorAll(
            "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]",
          ),
        ].filter((n) => n.offsetParent !== null);
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current.querySelector("button")?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = old;
      opener?.focus();
    };
  }, []);
  return (
    <div className="record-overlay">
      <section
        ref={root}
        className={"record-dialog " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <span className="eyebrow">KIM SOLAR / QUẢN LÝ KHÁCH HÀNG</span>
            <h2>{title}</h2>
          </div>
          <button className="record-icon" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  children,
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {children ? (
        React.cloneElement(children, { "aria-label": label })
      ) : (
        <input
          className="input"
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
    </label>
  );
}

export default function Customers({
  db,
  updateDb,
  notify,
  onNavigate,
  initialCustomerId = null,
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("Tất cả"),
    [modal, setModal] = useState(null),
    [draft, setDraft] = useState(null),
    [selected, setSelected] = useState(initialCustomerId),
    [log, setLog] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (initialCustomerId) setSelected(initialCustomerId);
  }, [initialCustomerId]);
  const detailRef = useRef(null);
  useEffect(() => {
    if (selected && window.matchMedia("(max-width: 980px)").matches) {
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "start",
        }),
      );
    }
  }, [selected]);
  const customers = db.customers || [],
    selectedCustomer = customers.find((x) => x.id === selected),
    money = (n) => Number(n || 0).toLocaleString("vi-VN") + " đ";
  const needsContact = (c) =>
    Boolean(
      c.nextContact &&
        c.nextContact <= today() &&
        !["Không tiếp tục", "Đã bàn giao"].includes(c.status),
    );
  const list = customers.filter(
    (c) =>
      (filter === "Tất cả" ||
        (filter === "Cần liên hệ" ? needsContact(c) : c.status === filter)) &&
      [c.name, c.phone, c.address, c.assignedTo].some((v) =>
        String(v || "")
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi")),
      ),
  );
  const close = () => {
    setModal(null);
    setDraft(null);
    setError("");
  };
  const startEdit = (c) => {
    setDraft(structuredClone(c || emptyCustomer()));
    setError("");
    setModal("edit");
  };
  const change = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const saveCustomer = (e) => {
    e.preventDefault();
    const name = draft.name.trim(),
      phone = cleanContactPhone(draft.phone);
    if (!name) {
      setError("Vui lòng nhập tên khách hàng.");
      return;
    }
    if (draft.phone.trim() && !phone) {
      setError("Số điện thoại cần có 8–15 chữ số.");
      return;
    }
    const duplicate = customers.find(
      (c) =>
        c.id !== draft.id &&
        phone &&
        contactIdentity(c.phone) === contactIdentity(phone),
    );
    if (duplicate) {
      setError(
        "Số điện thoại đã thuộc khách " +
          duplicate.name +
          ". Hãy kiểm tra trước khi tạo trùng.",
      );
      return;
    }
    const time = new Date().toISOString(),
      id = draft.id || uid();
    const record = {
      ...draft,
      id,
      name,
      phone,
      createdAt: draft.createdAt || time,
      updatedAt: time,
      history: draft.history || [],
    };
    updateDb((prev) => ({
      ...prev,
      customers: draft.id
        ? prev.customers.map((c) => (c.id === id ? record : c))
        : [record, ...prev.customers],
      activities: [
        {
          id: uid(),
          type: "customer",
          text:
            (draft.id ? "Cập nhật khách hàng " : "Tiếp nhận khách hàng ") +
            name,
          createdAt: time,
        },
        ...(prev.activities || []),
      ].slice(0, 200),
    }));
    setSelected(id);
    close();
    notify("Đã lưu hồ sơ khách hàng.");
  };
  const removeCustomer = (c) => {
    const linked =
      (db.plans || []).some((p) => p.customerId === c.id) ||
      (db.quotes || []).some((q) => q.customerId === c.id) ||
      (db.tickets || []).some((t) => t.customerId === c.id);
    if (linked) {
      notify(
        "Khách đang có hồ sơ liên quan. Chuyển trạng thái Không tiếp tục để giữ lịch sử.",
      );
      return;
    }
    if (
      !window.confirm("Xóa hồ sơ " + c.name + "? Thao tác không thể hoàn tác.")
    )
      return;
    updateDb((p) => ({
      ...p,
      customers: p.customers.filter((x) => x.id !== c.id),
    }));
    setSelected(null);
    close();
    notify("Đã xóa khách hàng.");
  };
  const saveSurvey = (e) => {
    e.preventDefault();
    const survey = draft.survey || {};
    for (const k of [
      "rl",
      "rw",
      "height",
      "floors",
      "dPV",
      "dInv",
      "dEarth",
      "bill",
      "kwh",
      "peak",
    ]) {
      if (
        survey[k] !== "" &&
        survey[k] != null &&
        (!Number.isFinite(Number(survey[k])) || Number(survey[k]) < 0)
      ) {
        setError("Thông số khảo sát phải là số không âm.");
        return;
      }
    }
    if (
      survey.day !== "" &&
      survey.day != null &&
      (!Number.isFinite(Number(survey.day)) ||
        Number(survey.day) < 0 ||
        Number(survey.day) > 100)
    ) {
      setError("Tỷ lệ dùng ban ngày cần nằm trong khoảng 0–100%.");
      return;
    }
    const time = new Date().toISOString();
    updateDb((p) => ({
      ...p,
      customers: p.customers.map((c) =>
        c.id === draft.id
          ? {
              ...c,
              survey,
              status: survey.concl === "Đạt sơ bộ" ? "Đã khảo sát" : c.status,
              updatedAt: time,
              history: [
                {
                  id: uid(),
                  text:
                    "Cập nhật khảo sát: " + (survey.concl || "Chưa kết luận"),
                  createdAt: time,
                },
                ...(c.history || []),
              ],
            }
          : c,
      ),
    }));
    close();
    notify("Đã lưu khảo sát vào hồ sơ khách.");
  };
  const addPhoto = async (e) => {
    const remaining = Math.max(0, 6 - (draft.survey?.photos?.length || 0));
    if (!remaining) {
      notify("Phiếu đã có 6 ảnh. Xóa một ảnh trước khi thêm ảnh mới.");
      e.target.value = "";
      return;
    }
    const files = [...e.target.files];
    if (files.length > remaining)
      notify(`Thêm ${remaining} ảnh đầu tiên; mỗi phiếu lưu tối đa 6 ảnh.`);
    for (const f of files.slice(0, remaining)) {
      if (!f.type.startsWith("image/") || f.size > 8e6) {
        notify("Chọn ảnh nhỏ hơn 8 MB.");
        continue;
      }
      const data = await new Promise((resolve) => {
        const image = new Image(),
          url = URL.createObjectURL(f);
        image.onload = () => {
          const scale = Math.min(1, 1000 / Math.max(image.width, image.height)),
            canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas
            .getContext("2d")
            .drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
          URL.revokeObjectURL(url);
        };
        image.onerror = () => {
          resolve(null);
          URL.revokeObjectURL(url);
        };
        image.src = url;
      });
      if (data)
        setDraft((d) =>
          d && d.id === draft.id
            ? {
                ...d,
                survey: {
                  ...d.survey,
                  photos: [
                    ...(d.survey?.photos || []),
                    { id: uid(), name: f.name, src: data },
                  ].slice(0, 6),
                },
              }
            : d,
        );
    }
    e.target.value = "";
  };
  const addLog = (e) => {
    e.preventDefault();
    if (!log.trim()) return;
    const time = new Date().toISOString();
    updateDb((p) => ({
      ...p,
      customers: p.customers.map((c) =>
        c.id === selected
          ? {
              ...c,
              history: [
                { id: uid(), text: log.trim(), createdAt: time },
                ...(c.history || []),
              ],
              updatedAt: time,
            }
          : c,
      ),
    }));
    setLog("");
    notify("Đã thêm nhật ký liên hệ.");
  };
  return (
    <div className="record-page customer-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">RELATIONSHIP / CHĂM SÓC TỪ LẦN ĐẦU</span>
          <h1>Khách hàng & cơ hội</h1>
          <p>Mỗi nhu cầu là khởi đầu của một mối quan hệ lâu dài.</p>
        </div>
        <button className="btn btn-primary" onClick={() => startEdit()}>
          <Plus size={17} /> Thêm khách hàng
        </button>
      </div>
      <div className="record-statrow">
        <div>
          <span>
            <Users size={16} />
            Khách hàng
          </span>
          <strong>{customers.length.toString().padStart(2, "0")}</strong>
        </div>
        <div>
          <span>
            <MessageSquare size={16} />
            Đang tư vấn
          </span>
          <strong>
            {customers
              .filter((x) =>
                ["Đang tư vấn", "Hẹn khảo sát", "Đang thương lượng"].includes(
                  x.status,
                ),
              )
              .length.toString()
              .padStart(2, "0")}
          </strong>
        </div>
        <div>
          <span>
            <CalendarDays size={16} />
            Đến hạn liên hệ
          </span>
          <strong>
            {customers.filter(needsContact).length.toString().padStart(2, "0")}
          </strong>
        </div>
        <div>
          <span>
            <BadgeCheck size={16} />
            Đã chốt
          </span>
          <strong>
            {customers
              .filter((x) => ["Đã chốt", "Đã bàn giao"].includes(x.status))
              .length.toString()
              .padStart(2, "0")}
          </strong>
        </div>
      </div>
      <div
        className={"record-columns " + (selectedCustomer ? "with-detail" : "")}
      >
        <section className="card record-list">
          <div className="record-toolbar">
            <label className="record-search">
              <Search size={17} />
              <input
                aria-label="Tìm khách hàng"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tên, số điện thoại, địa chỉ..."
              />
            </label>
            <select
              className="select"
              aria-label="Lọc trạng thái khách"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>Tất cả</option>
              <option>Cần liên hệ</option>
              {stages.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div
            className="record-quickfilters"
            aria-label="Chọn nhanh nhóm khách"
          >
            {[
              ["Tất cả", Users, customers.length],
              ["Cần liên hệ", Phone, customers.filter(needsContact).length],
              [
                "Hẹn khảo sát",
                ClipboardList,
                customers.filter((c) => c.status === "Hẹn khảo sát").length,
              ],
              [
                "Đã chốt",
                BadgeCheck,
                customers.filter((c) => c.status === "Đã chốt").length,
              ],
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
              {list.length} / {customers.length} hồ sơ
            </span>
            {(search || filter !== "Tất cả") && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilter("Tất cả");
                }}
              >
                Xóa bộ lọc <X size={13} />
              </button>
            )}
          </div>
          {list.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Giai đoạn</th>
                    <th>Liên hệ tiếp theo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr
                      key={c.id}
                      className={selected === c.id ? "record-selected" : ""}
                    >
                      <td>
                        <button
                          className="record-name"
                          onClick={() => setSelected(c.id)}
                        >
                          <span className="record-avatar">
                            {c.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span>
                            <b>{c.name}</b>
                            <small>
                              {c.phone || "Chưa có số điện thoại"} · {c.type}
                            </small>
                          </span>
                        </button>
                      </td>
                      <td data-label="Giai đoạn">
                        <span
                          className={
                            "badge " +
                            (["Đã chốt", "Đã bàn giao"].includes(c.status)
                              ? "success"
                              : "")
                          }
                        >
                          {c.status}
                        </span>
                      </td>
                      <td data-label="Liên hệ tiếp theo">
                        <span className={needsContact(c) ? "record-due" : ""}>
                          {dateLabel(c.nextContact)}
                        </span>
                        <small className="record-sub">
                          {c.assignedTo || "Chưa phân công"}
                        </small>
                      </td>
                      <td className="record-rowactions">
                        {cleanContactPhone(c.phone) && (
                          <a
                            className="record-quickcall"
                            href={"tel:" + cleanContactPhone(c.phone)}
                            aria-label={"Gọi " + c.name}
                          >
                            <Phone size={16} />
                            <span>Gọi khách</span>
                          </a>
                        )}
                        <button
                          className="record-icon"
                          onClick={() => setSelected(c.id)}
                          aria-label={"Xem " + c.name}
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
            <div className="record-empty">
              <Users size={34} />
              <h3>
                {search || filter !== "Tất cả"
                  ? "Chưa tìm thấy khách phù hợp"
                  : "Mở đầu một cuộc tư vấn tốt"}
              </h3>
              <p>
                {search || filter !== "Tất cả"
                  ? "Thử tìm bằng tên, số điện thoại hoặc đổi bộ lọc."
                  : "Thêm khách đầu tiên để lưu nhu cầu, lịch khảo sát và theo dõi các lần liên hệ."}
              </p>
              <button className="btn btn-secondary" onClick={() => startEdit()}>
                <Plus size={16} />
                Thêm hồ sơ đầu tiên
              </button>
            </div>
          )}
        </section>
        {selectedCustomer && (
          <aside
            ref={detailRef}
            className="card record-detail"
            tabIndex={-1}
            aria-label="Hồ sơ khách đang chọn"
          >
            <div className="card-head">
              <span className="eyebrow">HỒ SƠ KHÁCH HÀNG</span>
              <button
                className="record-icon"
                onClick={() => setSelected(null)}
                aria-label="Đóng hồ sơ"
              >
                <X size={17} />
              </button>
            </div>
            <div className="record-largeavatar">
              {selectedCustomer.name.slice(0, 2).toUpperCase()}
            </div>
            <h2>{selectedCustomer.name}</h2>
            <span className="badge">{selectedCustomer.status}</span>
            <div className="record-contact">
              <p>
                <Phone size={15} />
                {selectedCustomer.phone || "Chưa có điện thoại"}
              </p>
              <p>
                <MapPin size={15} />
                {selectedCustomer.address || "Chưa bổ sung địa chỉ"}
              </p>
              <p>
                <CalendarDays size={15} />
                {dateLabel(selectedCustomer.nextContact)}
              </p>
            </div>
            <div className="record-actions">
              {cleanContactPhone(selectedCustomer.phone) && (
                <>
                  <a
                    className="btn btn-secondary"
                    href={"tel:" + cleanContactPhone(selectedCustomer.phone)}
                  >
                    <Phone size={15} />
                    Gọi
                  </a>
                  <a
                    className="btn btn-secondary"
                    href={
                      "https://zalo.me/" + zaloContact(selectedCustomer.phone)
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageSquare size={15} /> Zalo <ArrowUpRight size={15} />
                  </a>
                </>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => startEdit(selectedCustomer)}
              >
                <PencilLine size={15} />
                Sửa hồ sơ
              </button>
            </div>
            <p className="record-detailnote">
              {selectedCustomer.notes ||
                "Chưa ghi nhận nhu cầu. Bổ sung ghi chú để lần tư vấn tiếp theo luôn có đủ ngữ cảnh."}
            </p>
            <button
              className="btn btn-primary record-full"
              onClick={() => {
                setDraft(structuredClone(selectedCustomer));
                setModal("survey");
              }}
            >
              <ClipboardList size={16} />
              {selectedCustomer.survey?.sdate
                ? "Mở phiếu khảo sát"
                : "Tạo phiếu khảo sát"}
            </button>
            <section className="record-timeline">
              <h3>
                <MessageSquare size={16} /> Nhật ký liên hệ
              </h3>
              <form onSubmit={addLog}>
                <textarea
                  className="input"
                  aria-label="Nội dung nhật ký"
                  value={log}
                  onChange={(e) => setLog(e.target.value)}
                  placeholder="Khách phản hồi gì? Bước tiếp theo..."
                  rows={3}
                />
                <button
                  className="btn btn-secondary"
                  type="submit"
                  disabled={!log.trim()}
                >
                  Lưu trao đổi
                </button>
              </form>
              {(selectedCustomer.history || []).slice(0, 20).map((item) => (
                <article key={item.id}>
                  <i />
                  <div>
                    <p>{item.text}</p>
                    <small>
                      {new Date(item.createdAt).toLocaleString("vi-VN")}
                    </small>
                  </div>
                </article>
              ))}
            </section>
            <button
              className="record-textdanger"
              onClick={() => removeCustomer(selectedCustomer)}
            >
              <Trash2 size={14} />
              Xóa hồ sơ không có liên kết
            </button>
          </aside>
        )}
      </div>
      {modal === "edit" && draft && (
        <RecordDialog
          title={draft.id ? "Chỉnh sửa hồ sơ" : "Thêm khách hàng"}
          onClose={close}
        >
          <form onSubmit={saveCustomer}>
            <div className="record-dialogbody">
              <div className="form-grid">
                <Input
                  label="Tên khách hàng / công ty"
                  value={draft.name}
                  onChange={(v) => change("name", v)}
                  required
                />
                <Input
                  label="Số điện thoại"
                  type="tel"
                  value={draft.phone}
                  onChange={(v) => change("phone", v)}
                />
                <Input
                  label="Email"
                  type="email"
                  value={draft.email}
                  onChange={(v) => change("email", v)}
                />
                <Input label="Nhóm khách">
                  <select
                    className="select"
                    value={draft.type}
                    onChange={(e) => change("type", e.target.value)}
                  >
                    {[
                      "Hộ gia đình",
                      "Cửa hàng",
                      "Nhà xưởng",
                      "Đơn vị khác",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Input>
                <Input label="Giai đoạn">
                  <select
                    className="select"
                    value={draft.status}
                    onChange={(e) => change("status", e.target.value)}
                  >
                    {stages.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Input>
                <Input
                  label="Nhân viên phụ trách"
                  value={draft.assignedTo}
                  onChange={(v) => change("assignedTo", v)}
                />
                <Input
                  label="Hẹn liên hệ tiếp theo"
                  type="date"
                  value={draft.nextContact}
                  onChange={(v) => change("nextContact", v)}
                />
              </div>
              <Input
                label="Địa chỉ lắp đặt"
                value={draft.address}
                onChange={(v) => change("address", v)}
              />
              <label className="field">
                <span>Nhu cầu & ghi chú</span>
                <textarea
                  className="input"
                  rows={4}
                  value={draft.notes}
                  onChange={(e) => change("notes", e.target.value)}
                />
              </label>
              {error && (
                <p className="record-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <footer>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={close}
              >
                Hủy
              </button>
              <button className="btn btn-primary" type="submit">
                <Save size={16} />
                Lưu hồ sơ
              </button>
            </footer>
          </form>
        </RecordDialog>
      )}
      {modal === "survey" && draft && (
        <RecordDialog title={"Khảo sát · " + draft.name} onClose={close} wide>
          <form onSubmit={saveSurvey}>
            <div className="record-dialogbody">
              <p className="record-helper">
                Phiếu khảo sát được lưu cùng hồ sơ khách. Kết luận sơ bộ chưa
                thay thế thẩm định kỹ thuật và kết cấu.
              </p>
              {fieldGroups.map(([name, fields], i) => (
                <details
                  className="record-surveygroup"
                  key={name}
                  open={i === 0}
                >
                  <summary>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {name}
                  </summary>
                  <div className="form-grid">
                    {fields.map(([key, label, type = "text", opts]) => (
                      <Input
                        key={key}
                        label={label}
                        type={type}
                        value={draft.survey?.[key] || ""}
                        onChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            survey: { ...d.survey, [key]: v },
                          }))
                        }
                      >
                        {type === "select" ? (
                          <select
                            className="select"
                            value={draft.survey?.[key] || ""}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                survey: { ...d.survey, [key]: e.target.value },
                              }))
                            }
                          >
                            <option value="">Chọn...</option>
                            {opts.map((x) => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                        ) : null}
                      </Input>
                    ))}
                  </div>
                </details>
              ))}
              <div className="record-surveygroup">
                <h3>
                  <Camera size={17} /> Ảnh công trình
                </h3>
                <label className="btn btn-secondary record-upload">
                  <Camera size={16} />
                  Thêm ảnh (tối đa 6)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={addPhoto}
                  />
                </label>
                <div className="record-photos">
                  {(draft.survey?.photos || []).map((p) => (
                    <div key={p.id}>
                      <img src={p.src} alt={p.name} />
                      <button
                        type="button"
                        className="record-icon"
                        aria-label={"Xóa ảnh " + p.name}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            survey: {
                              ...d.survey,
                              photos: d.survey.photos.filter(
                                (x) => x.id !== p.id,
                              ),
                            },
                          }))
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {error && (
                <p className="record-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <footer>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={close}
              >
                Hủy
              </button>
              <button className="btn btn-primary" type="submit">
                <CheckCircle2 size={16} />
                Lưu khảo sát
              </button>
            </footer>
          </form>
        </RecordDialog>
      )}
    </div>
  );
}
