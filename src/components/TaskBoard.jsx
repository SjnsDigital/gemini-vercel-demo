import React, { useState } from "react";
import {
  Plus,
  Check,
  CalendarDays,
  ArrowUpRight,
  Pencil,
  Trash2,
  Undo2,
  X,
  Clock3,
} from "lucide-react";
import { localDay, taskRows } from "../lib/workflow.js";
import "./workspace-tools.css";

export default function TaskBoard({ db, updateDb, navigate, notify }) {
  const [filter, setFilter] = useState("due");
  const [draft, setDraft] = useState(null);
  const [undo, setUndo] = useState(null);
  const [limit, setLimit] = useState(5);
  const today = localDay();
  const rows = taskRows(db, filter, today);
  const counts = {
    due: taskRows(db, "due", today).length,
    all: taskRows(db, "all", today).length,
    done: taskRows(db, "done", today).length,
  };
  const start = () => setDraft({ title: "", date: today });
  const change = (id, patch) =>
    updateDb((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  function save(event) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const task = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      title: draft.title.trim(),
      done: Boolean(draft.done),
    };
    updateDb((d) => ({
      ...d,
      tasks: draft.id
        ? d.tasks.map((t) => (t.id === draft.id ? task : t))
        : [task, ...d.tasks],
    }));
    setDraft(null);
    setUndo(null);
    notify(draft.id ? "Đã cập nhật công việc." : "Đã thêm việc cần làm.");
  }
  function complete(task) {
    change(task.id, { done: !task.done });
    setUndo({ type: "status", task });
    notify(task.done ? "Đã mở lại công việc." : "Đã hoàn thành công việc.");
  }
  function remove(task) {
    updateDb((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== task.id) }));
    setUndo({ type: "delete", task });
    notify("Đã xóa việc. Có thể hoàn tác ngay trong bảng việc.");
  }
  function restore() {
    if (undo.type === "delete")
      updateDb((d) => ({
        ...d,
        tasks: d.tasks.some((t) => t.id === undo.task.id)
          ? d.tasks
          : [undo.task, ...d.tasks],
      }));
    else change(undo.task.id, { done: Boolean(undo.task.done) });
    setUndo(null);
  }
  return (
    <section id="today-tasks" className="card task-card interactive-tasks">
      <div className="card-head">
        <div>
          <span className="eyebrow">ĐÚNG HẸN, TRỌN CƠ HỘI</span>
          <h2>
            Việc cần làm<span className="count-dot">{counts.due}</span>
          </h2>
        </div>
        <button
          className="icon-btn light"
          aria-label="Thêm công việc"
          onClick={start}
        >
          <Plus size={19} />
        </button>
      </div>
      <div className="task-tabs" aria-label="Lọc công việc">
        {[
          ["due", "Đến hạn"],
          ["all", "Tất cả"],
          ["done", "Đã xong"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={filter === key}
            onClick={() => {
              setFilter(key);
              setLimit(5);
            }}
            className={filter === key ? "active" : ""}
          >
            {label}
            <span>{counts[key]}</span>
          </button>
        ))}
      </div>
      {draft && (
        <form className="task-edit-form" onSubmit={save}>
          <div className="task-edit-head">
            <b>{draft.id ? "Sửa công việc" : "Lên lịch công việc"}</b>
            <button
              type="button"
              className="icon-btn"
              aria-label="Hủy sửa công việc"
              onClick={() => setDraft(null)}
            >
              <X size={17} />
            </button>
          </div>
          <label>
            Nội dung công việc
            <input
              className="input"
              aria-label="Nội dung công việc"
              placeholder="Gọi khách, hẹn khảo sát…"
              autoFocus
              maxLength={200}
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <div className="task-edit-bottom">
            <label>
              Ngày thực hiện
              <input
                type="date"
                className="input"
                aria-label="Ngày thực hiện công việc"
                value={draft.date || today}
                required
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </label>
            <button className="btn btn-primary btn-sm">
              {draft.id ? "Lưu thay đổi" : "Thêm"}
            </button>
          </div>
        </form>
      )}
      {undo && (
        <div className="task-undo" role="status">
          <span>
            {undo.type === "delete" ? "Đã xóa việc" : "Đã đổi trạng thái"}
          </span>
          <button onClick={restore}>
            <Undo2 size={15} />
            Hoàn tác
          </button>
        </div>
      )}
      {rows.length ? (
        <div className="task-list">
          {rows.slice(0, limit).map((row) => (
            <div
              className={"task-row " + (row.done ? "is-done" : "")}
              key={row.kind + row.id}
            >
              {row.kind === "task" ? (
                <button
                  className="task-check"
                  aria-label={
                    (row.done ? "Mở lại " : "Hoàn thành ") + row.title
                  }
                  onClick={() => complete(row)}
                >
                  <Check size={15} />
                </button>
              ) : (
                <span className="task-contact-icon">
                  <CalendarDays size={18} />
                </span>
              )}
              <div className="task-row-main">
                <button
                  className="task-title"
                  onClick={() =>
                    row.kind === "customer"
                      ? navigate("customers", { customerId: row.id })
                      : setDraft({ ...row })
                  }
                >
                  {row.title}
                  {row.kind === "customer" && <ArrowUpRight size={13} />}
                </button>
                <small
                  className={row.date < today && !row.done ? "is-overdue" : ""}
                >
                  {row.date < today && !row.done ? "Quá hạn · " : ""}
                  {row.date
                    ? new Date(row.date + "T12:00:00").toLocaleDateString(
                        "vi-VN",
                      )
                    : "Chưa hẹn ngày"}{" "}
                  · {row.kind === "customer" ? "Lịch gọi lại" : "Việc của bạn"}
                </small>
              </div>
              {row.kind === "task" && (
                <div className="task-row-actions">
                  <button
                    className="icon-btn"
                    aria-label={"Sửa " + row.title}
                    onClick={() => setDraft({ ...row })}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-btn danger"
                    aria-label={"Xóa việc " + row.title}
                    onClick={() => remove(row)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="task-empty">
          <span>
            <Check size={25} />
          </span>
          <h3>
            {filter === "done"
              ? "Chưa có việc hoàn thành."
              : filter === "all"
                ? "Một khởi đầu gọn gàng."
                : "Hôm nay đã gọn gàng."}
          </h3>
          <p>
            {filter === "due"
              ? "Các lịch hẹn sắp tới nằm trong mục Tất cả."
              : "Lên lịch gọi lại hoặc khảo sát để tiếp tục tư vấn."}
          </p>
          <button className="btn btn-secondary btn-sm" onClick={start}>
            <Plus size={15} />
            Thêm việc mới
          </button>
        </div>
      )}
      {rows.length > limit && (
        <button
          className="text-action task-show-more"
          onClick={() => setLimit((n) => n + 10)}
        >
          Xem thêm {Math.min(10, rows.length - limit)} việc
          <ArrowUpRight size={15} />
        </button>
      )}
      <div className="task-board-note">
        <Clock3 size={15} />
        <span>
          Lịch hiển thị theo giờ Việt Nam. Lịch gọi lại mở đúng hồ sơ khách.
        </span>
      </div>
    </section>
  );
}
