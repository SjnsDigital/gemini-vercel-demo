import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  BatteryCharging,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  Download,
  House,
  Info,
  Layers3,
  Leaf,
  Link2,
  MapPin,
  MoveUpRight,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TrendingUp,
  Zap,
} from "lucide-react";
import { calculate, defaults, REGIONS } from "../lib/calculator";
import "./calculator.css";

const number = (n, digits = 1) =>
  Number(n || 0).toLocaleString("vi-VN", { maximumFractionDigits: digits });
const currency = (n) => number(n, 0) + " ₫";
const shortMoney = (n) =>
  n >= 1000000 ? number(n / 1000000, 2) + " triệu" : currency(n);
const categories = {
  panel: ["panel", "solar_panel"],
  inv: ["inv", "inverter"],
  bat: ["bat", "battery"],
};
const active = (products, key) =>
  (products || []).filter(
    (p) =>
      categories[key].includes(p.category) &&
      p.active !== false &&
      (p.price > 0 || p.model),
  );
const modelLabel = (p) => `${p.brand} · ${p.model || "Chưa có model"}`;

function Field({ label, hint, children, wide = false }) {
  return (
    <label className={"field calc-field" + (wide ? " field-wide" : "")}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function RoofDiagram({ result, input }) {
  const cols = Math.max(1, Math.min(result.roofLayout.columns, 24)),
    physicalRows = result.roofLayout.rows;
  const shownCapacity = Math.min(result.roofLayout.capacity, 144),
    shownRows = Math.ceil(shownCapacity / cols);
  const width = 600,
    cellW = (width - 72) / cols,
    cellH = Math.min(
      65,
      Math.max(
        24,
        cellW * (result.roofLayout.orientation === "portrait" ? 1.8 : 0.62),
      ),
    );
  const height = Math.max(168, Math.min(500, shownRows * (cellH + 5) + 78));
  const actualH = Math.min(cellH, (height - 78) / Math.max(shownRows, 1) - 5);
  const slots = Array.from({ length: shownCapacity }, (_, i) => ({
    x: 36 + (i % cols) * cellW,
    y: 36 + Math.floor(i / cols) * (actualH + 5),
    selected: i < result.panelCount,
  }));
  return (
    <div className="calc-roof">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Mái ${input.roofLength} nhân ${input.roofWidth} m, ${result.panelCount} tấm đề xuất, sức chứa ${result.roofLayout.capacity} tấm. Sơ đồ hiển thị tối đa 144 ô.`}
      >
        <defs>
          <linearGradient id="solar-panel-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#355d6f" />
            <stop offset="1" stopColor="#172d3b" />
          </linearGradient>
          <pattern
            id="solar-panel-grid"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="#abc2cd"
              strokeWidth=".45"
              opacity=".5"
            />
          </pattern>
        </defs>
        <rect
          x="17"
          y="17"
          width="566"
          height={height - 34}
          rx="12"
          fill="#e8e7df"
          stroke="#d9d9ce"
        />
        <rect
          x="29"
          y="29"
          width="542"
          height={height - 58}
          rx="4"
          fill="none"
          stroke="#c5c8bc"
          strokeDasharray="4 5"
        />
        {slots.map((s, i) => (
          <g key={i}>
            <rect
              x={s.x}
              y={s.y}
              width={Math.max(3, cellW - 5)}
              height={Math.max(4, actualH)}
              rx="2"
              fill={s.selected ? "url(#solar-panel-gradient)" : "#f1f1e9"}
              stroke={s.selected ? "#fff" : "#c7cabe"}
              strokeWidth="1"
              strokeDasharray={s.selected ? undefined : "3 3"}
            />
            {s.selected && (
              <rect
                x={s.x}
                y={s.y}
                width={Math.max(3, cellW - 5)}
                height={Math.max(4, actualH)}
                rx="2"
                fill="url(#solar-panel-grid)"
              />
            )}
          </g>
        ))}
        <text
          x="300"
          y={height - 11}
          textAnchor="middle"
          fill="#8b9183"
          fontSize="10"
        >
          {number(input.roofLength)} m × {number(input.roofWidth)} m · Lề 0,10 m
          · Khe 0,02 m
        </text>
        {!shownCapacity && (
          <text x="300" y="96" textAnchor="middle" fill="#b45f43" fontSize="13">
            Mái không đủ chỗ cho một tấm
          </text>
        )}
      </svg>
      <div className="calc-roof-legend">
        <span>
          <i className="panel-dot" />
          {Math.min(result.panelCount, result.roofLayout.capacity)} ô bố trí
        </span>
        <span>
          <i className="empty-dot" />
          {Math.max(0, result.roofLayout.capacity - result.panelCount)} ô trống
        </span>
        <span>
          {result.roofLayout.orientation === "portrait"
            ? "Xếp dọc"
            : "Xếp ngang"}{" "}
          · {result.roofLayout.columns} × {physicalRows}
        </span>
      </div>
    </div>
  );
}

function EnergyChart({ result }) {
  const max = Math.max(result.dailyKwh, result.dailyGeneration, 1);
  return (
    <div className="calc-energy-chart">
      <div className="energy-chart-row">
        <div>
          <span>Điện đang dùng</span>
          <strong>
            {number(result.dailyKwh)} <small>kWh/ngày</small>
          </strong>
        </div>
        <div className="energy-track">
          <i
            className="load-day"
            style={{ width: (result.daytimeKwh / max) * 100 + "%" }}
          />
          <i
            className="load-night"
            style={{ width: (result.nighttimeKwh / max) * 100 + "%" }}
          />
        </div>
      </div>
      <div className="energy-chart-row">
        <div>
          <span>Điện mặt trời</span>
          <strong>
            {number(result.dailyGeneration)} <small>kWh/ngày</small>
          </strong>
        </div>
        <div className="energy-track">
          <i
            className="pv-direct"
            style={{ width: (result.directEnergy / max) * 100 + "%" }}
          />
          <i
            className="pv-charge"
            style={{ width: (result.chargeEnergy / max) * 100 + "%" }}
          />
          <i
            className="pv-surplus"
            style={{ width: (result.surplusEnergy / max) * 100 + "%" }}
          />
        </div>
      </div>
      <div className="energy-chart-legend">
        <span>
          <i className="load-day" />
          Tải ngày
        </span>
        <span>
          <i className="load-night" />
          Tải đêm
        </span>
        <span>
          <i className="pv-direct" />
          Dùng trực tiếp
        </span>
        <span>
          <i className="pv-charge" />
          Nạp pin
        </span>
        <span>
          <i className="pv-surplus" />
          Dư
        </span>
      </div>
      <p>
        <BatteryCharging size={14} />
        <span>
          Pin cấp khoảng <strong>{number(result.dischargeEnergy)} kWh</strong>{" "}
          cho tải đêm. Điện dư: {number(result.surplusEnergy)} kWh/ngày.
        </span>
      </p>
    </div>
  );
}

function ReturnChart({ result }) {
  const width = 620,
    height = 190,
    pad = 30,
    max = Math.max(result.cashflow[25].savings, result.total * 1.1, 1);
  const point = (d) =>
    `${pad + (d.year / 25) * (width - pad * 2)},${height - pad - (d.savings / max) * (height - pad * 2)}`;
  const path = result.cashflow
    .map((d, i) => `${i ? "L" : "M"}${point(d)}`)
    .join(" ");
  const baseline = height - pad - (result.total / max) * (height - pad * 2);
  const breakEven = result.cashflow.find((p) => p.savings >= result.total);
  return (
    <div className="calc-return-chart">
      <div className="return-chart-meta">
        <strong>
          {breakEven ? `Khoảng năm ${breakEven.year}` : "Trên 25 năm"}
          <small>vượt vốn đầu tư với giả định tăng giá điện</small>
        </strong>
        <span>+{number(result.input.growth * 100)}% / năm</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Biểu đồ tiết kiệm lũy kế theo giả định 25 năm, chưa trừ bảo trì hoặc thay thế pin."
      >
        <defs>
          <linearGradient id="return-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#ef6a37" stopOpacity=".23" />
            <stop offset="1" stopColor="#ef6a37" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={pad}
            x2={width - pad}
            y1={height - pad - f * (height - pad * 2)}
            y2={height - pad - f * (height - pad * 2)}
            stroke="#e9e5df"
            strokeDasharray="3 5"
          />
        ))}
        <path
          d={`${path} L${width - pad},${height - pad} L${pad},${height - pad} Z`}
          fill="url(#return-fill)"
        />
        <path d={path} fill="none" stroke="#ef6a37" strokeWidth="3" />
        <line
          x1={pad}
          x2={width - pad}
          y1={baseline}
          y2={baseline}
          stroke="#65756e"
          strokeDasharray="5 5"
        />
        <text
          x={width - pad}
          y={Math.max(14, baseline - 8)}
          textAnchor="end"
          fontSize="10"
          fill="#65756e"
        >
          Vốn đầu tư {shortMoney(result.total)}
        </text>
        {[0, 5, 10, 15, 20, 25].map((year) => (
          <text
            key={year}
            x={pad + (year / 25) * (width - pad * 2)}
            y={height - 7}
            textAnchor="middle"
            fontSize="10"
            fill="#8e8b83"
          >
            {year === 0 ? "Hôm nay" : `${year} năm`}
          </text>
        ))}
      </svg>
      <p>
        Ước tính tài chính; chưa tính suy giảm, bảo trì, lãi vay hoặc thay pin.
      </p>
    </div>
  );
}

export default function Calculator({
  db,
  onSavePlan,
  onCreateQuote,
  onShare,
  initialPlan,
  onConsumedPlan,
}) {
  const [input, setInput] = useState({
    ...defaults,
    ...(initialPlan?.input || {}),
  });
  const [planName, setPlanName] = useState(
    initialPlan?.name || "Phương án điện mặt trời",
  );
  const [resultTab, setResultTab] = useState("overview");
  const [showAssumptions, setShowAssumptions] = useState(false);
  const consumed = useRef(initialPlan);
  const products = db?.products || [];
  const panels = useMemo(() => active(products, "panel"), [products]);
  const inverters = useMemo(() => active(products, "inv"), [products]);
  const batteries = useMemo(() => active(products, "bat"), [products]);
  useEffect(() => {
    if (initialPlan && initialPlan !== consumed.current) {
      consumed.current = initialPlan;
      setInput({ ...defaults, ...initialPlan.input });
      setPlanName(initialPlan.name || "Phương án điện mặt trời");
      onConsumedPlan?.();
    }
  }, [initialPlan, onConsumedPlan]);
  useEffect(() => {
    if (!input.panelId && panels.length) {
      const p = panels.find((p) => p.price > 0) || panels[0];
      setInput((i) => ({
        ...i,
        panelId: p.id,
        panelWp: p.wp || i.panelWp,
        panelLength: p.length || i.panelLength,
        panelWidth: p.width || i.panelWidth,
      }));
    }
  }, [panels, input.panelId]);
  const result = useMemo(
    () => calculate(input, products, db?.settings || {}),
    [input, products, db?.settings],
  );
  const update = (key, value) => setInput((old) => ({ ...old, [key]: value }));
  const numInput = (key, opts = {}) => (
    <input
      className="input"
      type="number"
      inputMode="decimal"
      {...opts}
      value={input[key]}
      onChange={(e) =>
        update(key, e.target.value === "" ? "" : Number(e.target.value))
      }
    />
  );
  const plan = () => ({
    id: initialPlan?.id,
    name: planName.trim() || "Phương án điện mặt trời",
    input: { ...input },
    result,
    createdAt: new Date().toISOString(),
  });
  const choosePanel = (id) => {
    const p = panels.find((p) => p.id === id);
    setInput((i) => ({
      ...i,
      panelId: id,
      ...(p
        ? {
            panelWp: p.wp || i.panelWp,
            panelLength: p.length || i.panelLength,
            panelWidth: p.width || i.panelWidth,
          }
        : {}),
    }));
  };
  const serious = result.warnings.filter((w) => w.level === "error");

  return (
    <div className="calculator-workspace">
      <div className="page-heading calc-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            SOLAR DESIGN STUDIO
          </div>
          <h1>
            Thiết kế một tương lai <em>nhiều nắng.</em>
          </h1>
          <p>Từ một hóa đơn điện đến một phương án có đủ cơ sở để tư vấn.</p>
        </div>
        <div className="calc-heading-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setInput({ ...defaults });
              setPlanName("Phương án điện mặt trời");
            }}
          >
            <RotateCcw size={15} />
            Đặt lại
          </button>
          <button
            className="btn btn-primary"
            disabled={!result.valid}
            onClick={() => onSavePlan?.(plan())}
          >
            <Save size={16} />
            Lưu phương án
          </button>
        </div>
      </div>
      <div className="calc-flow">
        <span className="done">
          <i>
            <Check size={11} />
          </i>
          Nhu cầu
        </span>
        <span className="flow-line" />
        <span className="current">
          <i>02</i>Thiết kế hệ thống
        </span>
        <span className="flow-line" />
        <button
          disabled={!result.valid}
          onClick={() => onCreateQuote?.(plan())}
        >
          <i>03</i>Báo giá & chia sẻ
          <ArrowRight size={13} />
        </button>
        <span className="calc-flow-note">
          <ShieldCheck size={13} />
          Dữ liệu nguồn có thể kiểm tra
        </span>
      </div>
      <div className="calc-workbench">
        <form
          className="calc-input-panel card"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="calc-form-header">
            <span className="calc-icon-square">
              <SlidersHorizontal size={19} />
            </span>
            <div>
              <h2>Cấu hình phương án</h2>
              <p>Thay đổi thông số. Kết quả cập nhật ngay.</p>
            </div>
          </div>
          <Field label="Tên phương án">
            <input
              className="input"
              maxLength="140"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="VD: Nhà phố gia đình Anh Minh"
            />
          </Field>
          <details className="calc-section" open>
            <summary>
              <span>
                <i>01</i>Điện đang sử dụng
              </span>
              <ChevronDown size={15} />
            </summary>
            <div className="calc-section-body">
              <div className="segmented calc-mode-selector">
                {[
                  ["bill", "Tiền điện"],
                  ["kwh", "Số kWh"],
                ].map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    className={input.inputMode === key ? "active" : ""}
                    aria-pressed={input.inputMode === key}
                    onClick={() => update("inputMode", key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {input.inputMode === "bill" ? (
                <Field
                  label="Hóa đơn trung bình / tháng"
                  hint="Giá đã gồm VAT điện. Nhập số VNĐ đầy đủ."
                >
                  <div className="calc-money-input">
                    <input
                      aria-label="Hóa đơn trung bình tháng"
                      className="input"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="500000000"
                      value={input.monthlyBill}
                      onChange={(e) =>
                        update(
                          "monthlyBill",
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    />
                    <span>VNĐ</span>
                  </div>
                </Field>
              ) : (
                <Field
                  label="Điện tiêu thụ / tháng"
                  hint="Nhập kWh thực tế trên hóa đơn."
                >
                  {numInput("monthlyKwh", { min: 1, max: 100000 })}
                </Field>
              )}
              {input.inputMode === "bill" && (
                <div className="calc-bill-presets">
                  {[1500000, 2500000, 5000000, 10000000].map((n) => (
                    <button
                      type="button"
                      key={n}
                      className={input.monthlyBill === n ? "active" : ""}
                      onClick={() => update("monthlyBill", n)}
                    >
                      {number(n / 1e6)}tr
                    </button>
                  ))}
                </div>
              )}
              <Field label="Loại biểu giá">
                <select
                  className="select"
                  value={input.tariff}
                  onChange={(e) => update("tariff", e.target.value)}
                >
                  <option value="residential">Sinh hoạt · 6 bậc</option>
                  <option value="business">Kinh doanh · 3 khung giờ</option>
                  <option value="production">Sản xuất · 3 khung giờ</option>
                </select>
              </Field>
              {input.tariff !== "residential" && (
                <>
                  <Field label="Cấp điện áp">
                    <select
                      className="select"
                      value={input.voltage}
                      onChange={(e) => update("voltage", e.target.value)}
                    >
                      <option value="low">Dưới 6 kV</option>
                      <option value="mid">6 đến dưới 22 kV</option>
                      <option value="high">22 đến dưới 110 kV</option>
                      <option value="veryhigh">Từ 110 kV trở lên</option>
                    </select>
                  </Field>
                  <div className="form-grid">
                    <Field label="Tỷ trọng cao điểm (%)">
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(input.peakRatio * 10000) / 100}
                        onChange={(e) =>
                          update("peakRatio", Number(e.target.value) / 100)
                        }
                      />
                    </Field>
                    <Field label="Tỷ trọng thấp điểm (%)">
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(input.offPeakRatio * 10000) / 100}
                        onChange={(e) =>
                          update("offPeakRatio", Number(e.target.value) / 100)
                        }
                      />
                    </Field>
                  </div>
                  <p className="calc-tiny-note">
                    Phần còn lại là giờ bình thường. Chỉnh theo tỷ trọng trên
                    hóa đơn thực tế; không tự suy ra từ thời gian có nắng.
                  </p>
                </>
              )}
              <Field label="Tỷ lệ sử dụng ban ngày">
                <div className="segmented">
                  {[0.3, 0.5, 0.75].map((n) => (
                    <button
                      type="button"
                      key={n}
                      aria-pressed={input.dayRatio === n}
                      className={input.dayRatio === n ? "active" : ""}
                      onClick={() => update("dayRatio", n)}
                    >
                      <Sun size={12} />
                      {n * 100}%
                    </button>
                  ))}
                </div>
                <div className="calc-slider">
                  <input
                    aria-label="Tỷ lệ dùng điện ban ngày"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={input.dayRatio * 100}
                    onChange={(e) =>
                      update("dayRatio", Number(e.target.value) / 100)
                    }
                  />
                  <output>{number(input.dayRatio * 100, 0)}%</output>
                </div>
                <div className="calc-range-labels">
                  <span>Nhiều tải ban đêm</span>
                  <span>Nhiều tải ban ngày</span>
                </div>
              </Field>
            </div>
          </details>
          <details className="calc-section" open>
            <summary>
              <span>
                <i>02</i>Mái nhà & khu vực
              </span>
              <ChevronDown size={15} />
            </summary>
            <div className="calc-section-body">
              <div className="form-grid">
                <Field label="Chiều dài mái (m)">
                  {numInput("roofLength", { min: 0.1, max: 100, step: 0.1 })}
                </Field>
                <Field label="Chiều rộng mái (m)">
                  {numInput("roofWidth", { min: 0.1, max: 100, step: 0.1 })}
                </Field>
              </div>
              <div className="form-grid">
                <Field label="Khu vực">
                  <select
                    className="select"
                    value={input.region}
                    onChange={(e) => {
                      const r = REGIONS.find((r) => r.id === e.target.value);
                      setInput((i) => ({
                        ...i,
                        region: r.id,
                        specificYield: r.yield,
                      }));
                    }}
                  >
                    {REGIONS.map((r) => (
                      <option value={r.id} key={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Số tầng">
                  {numInput("floors", { min: 1, max: 20, step: 1 })}
                </Field>
              </div>
              <Field label="Kiểu bố trí tấm">
                <select
                  className="select"
                  value={input.layout}
                  onChange={(e) => update("layout", e.target.value)}
                >
                  <option value="auto">Tự động · nhiều ô nhất</option>
                  <option value="portrait">Xếp dọc</option>
                  <option value="landscape">Xếp ngang</option>
                </select>
              </Field>
              <label className="calc-checkbox">
                <input
                  type="checkbox"
                  checked={input.surveyConfirmed}
                  onChange={(e) => update("surveyConfirmed", e.target.checked)}
                />
                <span>Thông số đã được khảo sát thực tế</span>
              </label>
            </div>
          </details>
          <details className="calc-section" open>
            <summary>
              <span>
                <i>03</i>Hệ thống & lưu trữ
              </span>
              <ChevronDown size={15} />
            </summary>
            <div className="calc-section-body">
              <Field label="Điện lưới">
                <div className="segmented">
                  {[1, 3].map((n) => (
                    <button
                      type="button"
                      className={Number(input.phase) === n ? "active" : ""}
                      key={n}
                      onClick={() => update("phase", n)}
                    >
                      {n} pha
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Loại hệ thống">
                <div className="segmented calc-system-type">
                  <button
                    type="button"
                    className={input.mode === "hybrid" ? "active" : ""}
                    onClick={() => update("mode", "hybrid")}
                  >
                    <BatteryCharging size={15} />
                    Hybrid có pin
                  </button>
                  <button
                    type="button"
                    className={input.mode === "grid_tied" ? "active" : ""}
                    onClick={() => update("mode", "grid_tied")}
                  >
                    <Zap size={14} />
                    Hòa lưới
                  </button>
                </div>
              </Field>
              {input.mode === "hybrid" && (
                <div className="calc-battery-config">
                  <Field label="Dung lượng mỗi bộ">
                    <div className="segmented">
                      {[5, 10, 16].map((n) => (
                        <button
                          type="button"
                          className={
                            Number(input.batteryCapacity) === n ? "active" : ""
                          }
                          key={n}
                          onClick={() =>
                            setInput((i) => ({
                              ...i,
                              batteryCapacity: n,
                              batteryId: "",
                            }))
                          }
                        >
                          {n} kWh
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field
                    label={`Mục tiêu bù điện đêm · ${number(input.nightCoverage * 100, 0)}%`}
                  >
                    <input
                      aria-label="Mục tiêu bù điện ban đêm"
                      className="calc-range"
                      type="range"
                      min="0"
                      max="100"
                      value={input.nightCoverage * 100}
                      onChange={(e) =>
                        update("nightCoverage", Number(e.target.value) / 100)
                      }
                    />
                  </Field>
                  <label className="calc-checkbox">
                    <input
                      type="checkbox"
                      checked={input.batteryAuto}
                      onChange={(e) => update("batteryAuto", e.target.checked)}
                    />
                    <span>Tự chọn số bộ pin vừa nhu cầu</span>
                  </label>
                  {!input.batteryAuto && (
                    <Field label="Số bộ pin muốn lắp">
                      {numInput("batteryCount", { min: 0, max: 20, step: 1 })}
                    </Field>
                  )}
                  <Field
                    label="Tải dự phòng đồng thời (kW)"
                    hint="Thời gian dự phòng chỉ là ước tính theo công suất tải."
                  >
                    {numInput("backupLoadKw", {
                      min: 0.1,
                      max: 100,
                      step: 0.1,
                    })}
                  </Field>
                </div>
              )}
            </div>
          </details>
          <details className="calc-section">
            <summary>
              <span>
                <i>04</i>Thiết bị & giả định nâng cao
              </span>
              <Settings2 size={15} />
            </summary>
            <div className="calc-section-body">
              <Field label="Model tấm pin">
                <select
                  className="select"
                  value={input.panelId}
                  onChange={(e) => choosePanel(e.target.value)}
                >
                  {panels.length ? (
                    panels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {modelLabel(p)}
                      </option>
                    ))
                  ) : (
                    <option value="">Chưa có model</option>
                  )}
                </select>
              </Field>
              <div className="form-grid">
                <Field label="Công suất mỗi tấm (Wp)">
                  {numInput("panelWp", { min: 100, max: 1000, step: 5 })}
                </Field>
                <Field
                  label="Sản lượng riêng / ngày"
                  hint="kWh/kWp/ngày, giả định khu vực."
                >
                  {numInput("specificYield", { min: 1, max: 8, step: 0.1 })}
                </Field>
                <Field label="Dài tấm (m)">
                  {numInput("panelLength", { min: 0.5, max: 3, step: 0.001 })}
                </Field>
                <Field label="Rộng tấm (m)">
                  {numInput("panelWidth", { min: 0.5, max: 2, step: 0.001 })}
                </Field>
              </div>
              <Field label="Biến tần">
                <select
                  className="select"
                  value={input.inverterId}
                  onChange={(e) => update("inverterId", e.target.value)}
                >
                  <option value="">Tự đề xuất theo công suất & pha</option>
                  {inverters.map((p) => (
                    <option key={p.id} value={p.id}>
                      {modelLabel(p)}
                      {p.kw ? ` · ${p.kw} kW` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {input.mode === "hybrid" && (
                <Field label="Model pin lưu trữ">
                  <select
                    className="select"
                    value={input.batteryId}
                    onChange={(e) => update("batteryId", e.target.value)}
                  >
                    <option value="">Tự đề xuất theo dung lượng</option>
                    {batteries
                      .filter(
                        (p) =>
                          Number(p.capacity ?? p.capacityKwh) ===
                          Number(input.batteryCapacity),
                      )
                      .map((p) => (
                        <option value={p.id} key={p.id}>
                          {modelLabel(p)}
                        </option>
                      ))}
                  </select>
                </Field>
              )}
              <div className="form-grid">
                <Field label="Mục tiêu bù ngày (%)">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round(input.dayCoverage * 10000) / 100}
                    onChange={(e) =>
                      update("dayCoverage", Number(e.target.value) / 100)
                    }
                  />
                </Field>
                <Field label="Tăng giá điện / năm (%)">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="30"
                    step=".5"
                    value={Math.round(input.growth * 10000) / 100}
                    onChange={(e) =>
                      update("growth", Number(e.target.value) / 100)
                    }
                  />
                </Field>
              </div>
              <Field
                label="Số tấm nhập tay"
                hint="Để trống = tính tự động. Thay số tấm sẽ tính lại sản lượng."
              >
                {numInput("panelCountOverride", {
                  min: 1,
                  max: 5000,
                  placeholder: "Tự động",
                })}
              </Field>
              <Field label="Kiểu thi công">
                <select
                  className="select"
                  value={input.mount}
                  onChange={(e) => update("mount", e.target.value)}
                >
                  <option value="tin">Áp mái tôn · rail + kẹp</option>
                  <option value="frame">
                    Dàn khung · cần giá vật tư riêng
                  </option>
                </select>
              </Field>
              <Field
                label="Giá bán điện dư (đ/kWh)"
                hint="Mặc định 0. Chỉ nhập khi có cơ chế mua điện được xác nhận."
              >
                {numInput("exportPrice", { min: 0, max: 20000 })}
              </Field>
            </div>
          </details>
          <div className="calc-form-note">
            <Info size={15} />
            <p>
              Không cần nhập lại ở bước báo giá. Toàn bộ phương án sẽ được giữ
              cùng hồ sơ.
            </p>
          </div>
        </form>
        <div className="calc-results" aria-live="polite">
          {!result.valid ? (
            <div className="card calc-invalid">
              <CircleAlert size={35} />
              <h2>Hoàn thiện thông số để bắt đầu</h2>
              <p>
                Hệ thống giữ nguyên dữ liệu đang nhập. Kiểm tra những mục sau:
              </p>
              <ul>
                {result.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <section className="calc-hero">
                <div className="calc-hero-pattern" />
                <div className="calc-hero-top">
                  <span className="calc-status-pill">
                    <span />
                    {serious.length
                      ? "Cần kiểm tra thêm"
                      : "Phương án sơ bộ sẵn sàng"}
                  </span>
                  <span className="calc-hero-sun">
                    <Sun size={44} strokeWidth={1} />
                  </span>
                </div>
                <div className="calc-hero-title">
                  <div>
                    <p>CÔNG SUẤT ĐỀ XUẤT</p>
                    <h2>
                      {number(result.systemKwp, 2)}
                      <span>kWp</span>
                      <ArrowUpRight size={32} />
                    </h2>
                  </div>
                  <div className="calc-hero-detail">
                    <strong>
                      {result.panelCount} tấm pin {input.panelWp} Wp
                    </strong>
                    <span>
                      {input.mode === "hybrid"
                        ? "Hệ hybrid có lưu trữ"
                        : "Hòa lưới tự tiêu thụ"}{" "}
                      · {input.phase} pha
                    </span>
                  </div>
                </div>
                <div className="calc-hero-metrics">
                  <div>
                    <span>Tiết kiệm / tháng</span>
                    <strong>
                      {number(result.monthlySavings / 1e6, 2)}{" "}
                      <small>triệu ₫</small>
                    </strong>
                    <em>
                      Giảm {number(result.savingsPercent, 0)}% hóa đơn dự kiến
                    </em>
                  </div>
                  <div>
                    <span>Vốn đầu tư sơ bộ</span>
                    <strong>
                      {number(result.total / 1e6, 1)} <small>triệu ₫</small>
                    </strong>
                    <em>Giá từ danh mục đang chọn</em>
                  </div>
                  <div>
                    <span>Hoàn vốn đơn giản</span>
                    <strong>
                      {result.roiYears == null
                        ? "—"
                        : number(result.roiYears, 1)}{" "}
                      <small>năm</small>
                    </strong>
                    <em>Chưa tính tăng giá điện</em>
                  </div>
                </div>
                <div className="calc-hero-bottom">
                  <span>
                    <Leaf size={14} />
                    Năng lượng tự dùng, giá trị dài hạn.
                  </span>
                  <button onClick={() => setShowAssumptions((v) => !v)}>
                    Xem giả định
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </section>
              <div className="calc-result-tabs">
                <button
                  className={resultTab === "overview" ? "active" : ""}
                  onClick={() => setResultTab("overview")}
                >
                  Tổng quan hệ thống
                </button>
                <button
                  className={resultTab === "financial" ? "active" : ""}
                  onClick={() => setResultTab("financial")}
                >
                  Hiệu quả đầu tư
                </button>
                <button
                  className={resultTab === "materials" ? "active" : ""}
                  onClick={() => setResultTab("materials")}
                >
                  Thiết bị & vật tư <span>{result.rows.length}</span>
                </button>
              </div>
              {resultTab === "overview" && (
                <>
                  <div className="calc-equipment-metrics">
                    <div className="card">
                      <span className="eq-metric-icon">
                        <Layers3 size={19} />
                      </span>
                      <div>
                        <small>Tấm pin mặt trời</small>
                        <strong>
                          {result.panelCount}
                          <em>tấm</em>
                        </strong>
                        <span>
                          {number(result.roofAreaRequired)} m² diện tích tấm
                        </span>
                      </div>
                    </div>
                    <div className="card">
                      <span className="eq-metric-icon">
                        <Zap size={20} />
                      </span>
                      <div>
                        <small>Biến tần đề xuất</small>
                        <strong>
                          {number(result.inverterKw)}
                          <em>kW</em>
                        </strong>
                        <span>
                          PV / inverter{" "}
                          {number(result.systemKwp / result.inverterKw, 2)}
                        </span>
                      </div>
                    </div>
                    <div className="card">
                      <span className="eq-metric-icon">
                        <BatteryCharging size={20} />
                      </span>
                      <div>
                        <small>Pin lưu trữ</small>
                        <strong>
                          {number(result.batteryKwh)}
                          <em>kWh</em>
                        </strong>
                        <span>
                          {result.batteryCount} bộ ·{" "}
                          {number(result.batteryUsableKwh)} kWh dùng được
                        </span>
                      </div>
                    </div>
                  </div>
                  <section className="card calc-diagram-card">
                    <div className="card-head">
                      <div>
                        <span className="eyebrow">ROOFTOP VISUALIZER</span>
                        <h2>Đặt phương án lên mái nhà.</h2>
                      </div>
                      <span
                        className={
                          "calc-roof-badge " +
                          (result.roofSufficient ? "good" : "bad")
                        }
                      >
                        <House size={13} />
                        {result.roofSufficient
                          ? "Đủ chỗ bố trí"
                          : "Thiếu diện tích"}
                      </span>
                    </div>
                    <RoofDiagram result={result} input={input} />
                    <div className="calc-roof-foot">
                      <span>
                        Mái {number(result.roofAreaAvailable)} m² · tối đa{" "}
                        {result.roofLayout.capacity} tấm sau khi chừa lề
                      </span>
                      {!result.roofSufficient &&
                        result.roofLayout.capacity > 0 && (
                          <button
                            className="calc-text-button"
                            onClick={() =>
                              update(
                                "panelCountOverride",
                                result.roofLayout.capacity,
                              )
                            }
                          >
                            Giảm về {result.roofLayout.capacity} tấm
                            <ArrowRight size={13} />
                          </button>
                        )}
                    </div>
                  </section>
                  <section className="card">
                    <div className="card-head">
                      <div>
                        <span className="eyebrow">ENERGY BALANCE</span>
                        <h2>Mỗi ngày, năng lượng đi đâu?</h2>
                      </div>
                      <span className="calc-soft-icon">
                        <Sun size={20} />
                      </span>
                    </div>
                    <EnergyChart result={result} />
                    {input.mode === "hybrid" && (
                      <div className="calc-backup-info">
                        <BatteryCharging size={18} />
                        <span>
                          Với tải dự phòng {number(input.backupLoadKw)} kW, pin
                          đủ năng lượng khoảng{" "}
                          <b>{number(result.backupRuntimeHours)} giờ</b> khi
                          đầy. Thời gian thực tế phụ thuộc giới hạn xả và tải
                          khởi động.
                        </span>
                      </div>
                    )}
                  </section>
                </>
              )}
              {resultTab === "financial" && (
                <>
                  <section className="card">
                    <div className="card-head">
                      <div>
                        <span className="eyebrow">LONG-TERM VALUE</span>
                        <h2>Giá trị tích lũy theo thời gian.</h2>
                      </div>
                      <TrendingUp size={22} />
                    </div>
                    <ReturnChart result={result} />
                  </section>
                  <section className="card">
                    <div className="card-head">
                      <h2>Trước & sau khi lắp</h2>
                      <span className="badge">Ước tính</span>
                    </div>
                    <div className="calc-comparison-table">
                      <div className="comparison-row head">
                        <span>Hạng mục</span>
                        <span>Hiện tại</span>
                        <span>Sau khi lắp</span>
                      </div>
                      {[
                        [
                          "Điện lưới / tháng",
                          number(result.monthlyKwh) + " kWh",
                          number(result.monthlyRemainingKwh) + " kWh",
                        ],
                        [
                          "Hóa đơn / tháng",
                          currency(result.monthlyBill),
                          currency(result.monthlyBillAfter),
                        ],
                        [
                          "Chi phí điện / năm",
                          shortMoney(result.monthlyBill * 12) + " ₫",
                          shortMoney(result.monthlyBillAfter * 12) + " ₫",
                        ],
                        [
                          "Tiết kiệm / năm",
                          "—",
                          currency(result.yearlySavings),
                        ],
                        [
                          "Sản lượng PV / năm",
                          "—",
                          number(result.yearlyGeneration, 0) + " kWh",
                        ],
                      ].map(([label, before, after]) => (
                        <div className="comparison-row" key={label}>
                          <span>{label}</span>
                          <span>{before}</span>
                          <strong>{after}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
              {resultTab === "materials" && (
                <section className="card calc-materials-card">
                  <div className="card-head">
                    <div>
                      <span className="eyebrow">BILL OF MATERIALS</span>
                      <h2>Đi từ cấu hình đến chi phí.</h2>
                    </div>
                    <span className="badge">{result.rows.length} hạng mục</span>
                  </div>
                  <div className="calc-materials-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Thiết bị / vật tư</th>
                          <th>Số lượng</th>
                          <th>Đơn giá</th>
                          <th>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <strong>{row.name}</strong>
                              <small>{row.model || "Chưa chọn model"}</small>
                              <span
                                className={
                                  row.verified
                                    ? "price-status verified"
                                    : "price-status"
                                }
                              >
                                {row.verified ? "Đã xác minh" : "Chờ xác minh"}
                              </span>
                            </td>
                            <td>
                              {row.qty} {row.unit}
                            </td>
                            <td>{currency(row.price)}</td>
                            <td>{currency(row.qty * row.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="3">
                            Tổng phương án
                            {result.vatAmount ? " (gồm VAT báo giá)" : ""}
                          </td>
                          <td>{currency(result.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="calc-tiny-note">
                    Số chuỗi: {result.strings} · Dây DC mỗi màu:{" "}
                    {result.wireMeters} m. Định mức vật tư sơ bộ, chưa bao gồm
                    phát sinh ngoài phạm vi.
                  </p>
                </section>
              )}
              <section className="calc-checks card">
                <div className="card-head">
                  <h2>
                    <ShieldCheck size={17} />
                    Kiểm tra trước khi gửi khách
                  </h2>
                  <span className="badge">{result.warnings.length} lưu ý</span>
                </div>
                {result.warnings
                  .slice(0, showAssumptions ? undefined : 4)
                  .map((w, i) => (
                    <div
                      className={"calc-check-item " + w.level}
                      key={w.code + i}
                    >
                      {w.level === "error" ? (
                        <CircleAlert size={16} />
                      ) : w.level === "warning" ? (
                        <CircleAlert size={16} />
                      ) : (
                        <Info size={16} />
                      )}
                      <p>{w.message}</p>
                    </div>
                  ))}
                {result.warnings.length > 4 && (
                  <button
                    className="calc-text-button"
                    onClick={() => setShowAssumptions((v) => !v)}
                  >
                    {showAssumptions
                      ? "Thu gọn"
                      : `Xem thêm ${result.warnings.length - 4} lưu ý`}
                    <ChevronDown size={14} />
                  </button>
                )}
                {showAssumptions && (
                  <div className="calc-assumptions">
                    <h3>Cơ sở tính toán</h3>
                    {result.assumptions.map((t) => (
                      <p key={t}>• {t}</p>
                    ))}
                  </div>
                )}
              </section>
              <div className="calc-action-panel">
                <div>
                  <span className="eyebrow">BƯỚC TIẾP THEO</span>
                  <h3>Biến phương án thành cuộc trao đổi.</h3>
                  <p>Báo giá nháp giữ đầy đủ cấu hình, model và giả định.</p>
                </div>
                <div className="calc-action-buttons">
                  <button
                    className="btn btn-secondary"
                    onClick={() => onShare?.(plan())}
                  >
                    <Link2 size={16} />
                    Link / QR / ảnh
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => onCreateQuote?.(plan())}
                  >
                    Tạo báo giá
                    <ArrowUpRight size={17} />
                  </button>
                </div>
              </div>
              <div className="calc-bottom-disclaimer">
                <ShieldCheck size={13} />
                <span>
                  Công cụ tư vấn sơ bộ. Kết quả không thay thế khảo sát, hồ sơ
                  kỹ thuật hoặc cam kết sản lượng.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
