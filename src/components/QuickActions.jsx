import React, { useEffect, useRef, useState } from "react";
import {
  Zap,
  Search,
  X,
  ArrowUpRight,
  Calculator,
  Grid2X2,
  FolderOpen,
  Users,
  FileText,
  HeartHandshake,
  Package,
  BookOpen,
  DatabaseBackup,
  CalendarCheck2,
} from "lucide-react";
import { searchText } from "../lib/workflow.js";
import "./workspace-tools.css";

const commands = [
  ["calculator", Calculator, "Tạo phương án", "Tính cấu hình từ nhu cầu điện"],
  ["lookup", Grid2X2, "Tra nhanh theo hóa đơn", "Chọn mức hóa đơn để bắt đầu"],
  [
    "plans",
    FolderOpen,
    "So sánh phương án đã lưu",
    "Đối chiếu đầu tư và hiệu quả dự kiến",
  ],
  ["quotes", FileText, "Mở báo giá", "Lập, sửa và xuất PDF"],
  ["customers", Users, "Hồ sơ khách hàng", "Liên hệ, khảo sát và nhật ký"],
  ["care", HeartHandshake, "Chăm sóc & bảo hành", "Theo dõi yêu cầu xử lý"],
  [
    "catalog",
    Package,
    "Kiểm tra thiết bị & giá",
    "Model, thông số và xác minh giá",
  ],
  ["knowledge", BookOpen, "Tra cẩm nang tư vấn", "Tìm và sao chép câu trả lời"],
  [
    "settings",
    DatabaseBackup,
    "Sao lưu dữ liệu",
    "Tải file JSON hoặc khôi phục",
    { tab: "data" },
  ],
  ["overview", CalendarCheck2, "Xem việc cần làm", "Lịch hẹn và việc đến hạn"],
];

export default function QuickActions({ onClose, navigate }) {
  const dialog = useRef(null),
    input = useRef(null);
  const [query, setQuery] = useState("");
  const matches = commands.filter((row) =>
    searchText(row[2] + " " + row[3]).includes(searchText(query)),
  );
  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement;
    node.showModal();
    input.current?.focus();
    return () => {
      node.close();
      if (previous && previous !== document.body && previous.isConnected)
        previous.focus();
      else document.querySelector(".quick-actions-trigger")?.focus();
    };
  }, []);
  function open(row) {
    onClose();
    navigate(row[0], row[4]);
  }
  return (
    <dialog
      ref={dialog}
      className="quick-actions-dialog"
      aria-labelledby="quick-actions-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) {
          const box = dialog.current.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <div className="quick-actions-heading">
        <span className="quick-actions-symbol">
          <Zap size={23} />
        </span>
        <div>
          <span className="eyebrow">ÍT CHẠM HƠN, LÀM NHANH HƠN</span>
          <h2 id="quick-actions-title">Thao tác nhanh</h2>
        </div>
        <button
          className="icon-btn"
          aria-label="Đóng thao tác nhanh"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="quick-actions-search">
        <Search size={18} />
        <input
          ref={input}
          aria-label="Tìm thao tác nhanh"
          placeholder="Tìm tính toán, khách hàng, sao lưu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches.length) {
              e.preventDefault();
              open(matches[0]);
            }
          }}
        />
        <kbd>Esc</kbd>
      </div>
      <div className="quick-actions-list">
        {matches.map((row) => {
          const Icon = row[1];
          return (
            <button key={row[0]} onClick={() => open(row)}>
              <span className="quick-action-icon">
                <Icon size={21} />
              </span>
              <span>
                <b>{row[2]}</b>
                <small>{row[3]}</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          );
        })}
        {!matches.length && (
          <p>Chưa tìm thấy. Thử “báo giá”, “khách” hoặc “sao lưu”.</p>
        )}
      </div>
      <div className="quick-actions-note">
        <span>Chọn thao tác hoặc nhấn Enter cho kết quả đầu.</span>
        <kbd>Ctrl / ⌘ K</kbd>
      </div>
    </dialog>
  );
}
