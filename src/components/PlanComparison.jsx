import React, { useEffect, useId, useState } from "react";
import {
  GitCompareArrows,
  ChevronDown,
  ArrowUpRight,
  FileText,
  Sun,
  Wallet,
  BatteryCharging,
  TrendingUp,
  CalendarClock,
  Gauge,
  Info,
} from "lucide-react";
import {
  comparisonSnapshot,
  comparisonHasDifferentAssumptions,
} from "../lib/planComparison.js";
import "./plan-comparison.css";

const number = (value) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
const currency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
const metrics = [
  ["systemKwp", "Công suất hệ", "kWp", Sun],
  ["total", "Đầu tư trong bản lưu", "", Wallet],
  ["monthlyGeneration", "Sản lượng / tháng", "kWh", Gauge],
  ["monthlySavings", "Tiết kiệm / tháng", "", TrendingUp],
  ["roiYears", "Hoàn vốn đơn giản", "năm", CalendarClock],
  ["batteryKwh", "Dung lượng lưu trữ", "kWh", BatteryCharging],
];
function showValue(key, value, unit) {
  return value === null
    ? "Chưa có dữ liệu"
    : ["total", "monthlySavings"].includes(key)
      ? currency(value)
      : `${number(value)} ${unit}`;
}
function savedDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Ngày lưu chưa rõ"
    : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

export default function PlanComparison({
  plans = [],
  onOpen,
  onQuote,
  initialOpen = false,
}) {
  const [open, setOpen] = useState(Boolean(initialOpen));
  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);
  const [selectedIds, setSelectedIds] = useState([]);
  const contentId = useId();
  const available = plans.filter((plan) => plan && typeof plan.id === "string");
  useEffect(() => {
    setSelectedIds((current) => {
      const next = current.filter((id) =>
        available.some((plan) => plan.id === id),
      );
      return next.length === current.length ? current : next;
    });
  }, [plans]);
  const selected = selectedIds
    .map((id) => available.find((plan) => plan.id === id))
    .filter(Boolean);
  const snapshots = selected.map(comparisonSnapshot);
  if (!available.length) return null;
  return (
    <section className="plan-comparison" aria-label="So sánh phương án đã lưu">
      <button
        type="button"
        className="plan-compare-toggle"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="plan-compare-icon">
          <GitCompareArrows size={23} />
        </span>
        <span>
          <strong>Đặt các phương án cạnh nhau</strong>
          <small>Chọn 2–3 bản lưu để tư vấn rõ hơn.</small>
        </span>
        <span className="plan-compare-toggle-label">
          {open ? "Thu gọn" : "So sánh"}
        </span>
        <ChevronDown size={18} className={open ? "is-open" : ""} />
      </button>
      {open && (
        <div id={contentId} className="plan-compare-content">
          <fieldset className="plan-compare-picker">
            <legend>
              Chọn phương án <span>({selected.length}/3)</span>
            </legend>
            <div className="plan-compare-choices">
              {available.map((plan) => {
                const checked = selectedIds.includes(plan.id);
                return (
                  <label key={plan.id} className={checked ? "selected" : ""}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && selectedIds.length >= 3}
                      onChange={() =>
                        setSelectedIds((current) =>
                          checked
                            ? current.filter((id) => id !== plan.id)
                            : [...current, plan.id].slice(0, 3),
                        )
                      }
                    />
                    <span>
                      <strong>{plan.name || "Phương án chưa đặt tên"}</strong>
                      <small>{savedDate(plan.createdAt)}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {selected.length < 2 ? (
            <p className="plan-compare-hint" role="status">
              <GitCompareArrows size={17} />
              {available.length < 2
                ? "Lưu thêm một phương án để bắt đầu so sánh."
                : "Chọn ít nhất 2 phương án trong danh sách phía trên."}
            </p>
          ) : (
            <>
              <div className="plan-compare-note">
                <Info size={17} />
                <p>
                  So sánh theo dữ liệu tại thời điểm lưu. Giá và hiệu quả là ước
                  tính; mở phương án để tính lại theo danh mục hiện tại.
                  {comparisonHasDifferentAssumptions(snapshots) && (
                    <strong>
                      {" "}
                      Các bản lưu có hóa đơn hoặc giả định nắng khác nhau; cần
                      thống nhất đầu vào khi đánh giá hiệu quả.
                    </strong>
                  )}
                </p>
              </div>
              <div
                className="plan-compare-grid"
                style={{ "--compare-count": selected.length }}
              >
                {selected.map((plan, index) => {
                  const snapshot = snapshots[index],
                    baseline = snapshots[0];
                  return (
                    <article className="plan-compare-card" key={plan.id}>
                      <div className="plan-compare-card-head">
                        <span>{String.fromCharCode(65 + index)}</span>
                        <div>
                          <h3>{plan.name || "Phương án chưa đặt tên"}</h3>
                          <small>{savedDate(plan.createdAt)}</small>
                        </div>
                      </div>
                      <span
                        className={
                          "plan-compare-status " +
                          (snapshot.valid &&
                          snapshot.verified &&
                          !snapshot.missingPrice
                            ? "verified"
                            : "draft")
                        }
                      >
                        {!snapshot.valid
                          ? "Cần tính lại cấu hình"
                          : snapshot.missingPrice
                            ? "Chưa đủ giá thiết bị"
                            : !snapshot.verified
                              ? "Giá / kỹ thuật cần xác minh"
                              : "Đã đủ kiểm tra tại thời điểm lưu"}
                      </span>
                      <dl>
                        {metrics.map(([key, label, unit, Icon]) => {
                          const value = snapshot[key],
                            baseValue = baseline[key];
                          const difference =
                            value !== null && baseValue !== null
                              ? value - baseValue
                              : null;
                          return (
                            <div key={key}>
                              <dt>
                                <Icon size={14} />
                                {label}
                              </dt>
                              <dd>{showValue(key, value, unit)}</dd>
                              {index > 0 && difference !== null && (
                                <small className="plan-compare-difference">
                                  {Math.abs(difference) < 0.0001
                                    ? "Bằng bản A"
                                    : `${difference > 0 ? "+" : "−"}${showValue(key, Math.abs(difference), unit)} so với A`}
                                </small>
                              )}
                            </div>
                          );
                        })}
                      </dl>
                      <div className="plan-compare-card-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpen?.(plan)}
                        >
                          Mở bản {String.fromCharCode(65 + index)}
                          <ArrowUpRight size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => onQuote?.(plan)}
                          aria-label={`Tạo báo giá từ bản ${String.fromCharCode(65 + index)} ${plan.name || ""}`}
                        >
                          <FileText size={14} />
                          Báo giá
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
