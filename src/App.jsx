import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import {
  Sun,
  LayoutDashboard,
  Calculator as CalculatorIcon,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  CalendarCheck2,
  Phone,
  DatabaseBackup,
  BatteryCharging,
  Share2,
  Users,
  Package,
  FileText,
  HeartHandshake,
  House,
  Settings as SettingsIcon,
  Cloud,
  ChevronRight,
  Menu,
  X,
  Check,
  Download,
  Copy,
  FolderOpen,
  BookOpen,
  Zap,
  Grid2X2,
  AlertTriangle,
  Trash2,
  CalendarDays,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Brand from "./components/Brand.jsx";
import PageAgent from "./components/PageAgent.jsx";
import TaskBoard from "./components/TaskBoard.jsx";
import PlanComparison from "./components/PlanComparison.jsx";
import QuickActions from "./components/QuickActions.jsx";
import { searchText } from "./lib/workflow.js";
import heroPhoto from "./assets/solar-residence.webp";
import heroPhotoMobile from "./assets/solar-residence-mobile.webp";
import { normalizeAssetPaths } from "./lib/assets.js";
import { initialDb } from "./lib/seed.js";
import { calculate, defaults } from "./lib/calculator.js";
const Calculator = lazy(() => import("./views/Calculator.jsx")),
  Customers = lazy(() => import("./views/Customers.jsx")),
  Catalog = lazy(() => import("./views/Catalog.jsx")),
  Care = lazy(() => import("./views/Care.jsx")),
  Settings = lazy(() => import("./views/Settings.jsx")),
  Quotes = lazy(() => import("./views/Quotes.jsx")),
  ShareDialog = lazy(() => import("./components/ShareDialog.jsx")),
  CloudSync = lazy(() => import("./components/CloudSync.jsx"));
const KEY = "kimsolar.workspace.v2",
  uid = () => crypto.randomUUID();
const currency = (n) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number(n) || 0),
  number = (n) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
      Number(n) || 0,
    );
const date = (iso) =>
  new Date(iso || Date.now()).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
const navigation = [
  ["overview", LayoutDashboard, "Tổng quan"],
  ["calculator", CalculatorIcon, "Tạo phương án"],
  ["lookup", Grid2X2, "Tra nhanh"],
  ["plans", FolderOpen, "Phương án đã lưu"],
  ["quotes", FileText, "Báo giá"],
  ["customers", Users, "Khách hàng"],
  ["care", HeartHandshake, "Chăm sóc khách hàng"],
  ["catalog", Package, "Thiết bị & đơn giá"],
  ["knowledge", BookOpen, "Cẩm nang tư vấn"],
  ["settings", SettingsIcon, "Cài đặt & dữ liệu"],
];
function validateWorkspace(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Bộ dữ liệu không hợp lệ.");
  for (const key of [
    "customers",
    "products",
    "plans",
    "quotes",
    "tickets",
    "tasks",
  ])
    if (
      !Array.isArray(value[key]) ||
      value[key].length > 50000 ||
      value[key].some(
        (r) =>
          !r ||
          typeof r !== "object" ||
          Array.isArray(r) ||
          typeof r.id !== "string",
      )
    )
      throw new Error("Dữ liệu " + key + " không hợp lệ.");
  if (
    !value.settings ||
    typeof value.settings !== "object" ||
    Array.isArray(value.settings)
  )
    throw new Error("Cấu hình không hợp lệ.");
  if (
    value.products.some(
      (p) =>
        typeof p.brand !== "string" ||
        !Number.isFinite(Number(p.price)) ||
        Number(p.price) < 0,
    )
  )
    throw new Error("Danh mục sản phẩm không hợp lệ.");
  return {
    ...structuredClone(value),
    activities: Array.isArray(value.activities) ? value.activities : [],
    settings: { ...initialDb.settings, ...value.settings },
  };
}
function loadDb() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (
      p &&
      [
        "customers",
        "products",
        "plans",
        "quotes",
        "tickets",
        "tasks",
        "activities",
      ].every((k) => Array.isArray(p[k])) &&
      p.settings
    )
      return normalizeAssetPaths({
        ...structuredClone(initialDb),
        ...p,
        settings: { ...initialDb.settings, ...p.settings },
      });
  } catch {}
  return structuredClone(initialDb);
}
export default function App() {
  const [db, setDb] = useState(loadDb),
    [route, setRoute] = useState(location.hash.slice(1) || "overview"),
    [mobileMenu, setMobileMenu] = useState(false),
    [isPhone, setIsPhone] = useState(
      () => window.matchMedia("(max-width:780px)").matches,
    ),
    [mobileSearch, setMobileSearch] = useState(false),
    [quickOpen, setQuickOpen] = useState(false),
    [settingsTab, setSettingsTab] = useState("company"),
    [customerFocus, setCustomerFocus] = useState(null),
    [catalogQuery, setCatalogQuery] = useState(""),
    [toast, setToast] = useState(null),
    [query, setQuery] = useState(""),
    [share, setShare] = useState(null),
    [cloudOpen, setCloudOpen] = useState(false),
    [session, setSession] = useState(null),
    [saveError, setSaveError] = useState(""),
    [editPlan, setEditPlan] = useState(null),
    [incomingQuote, setIncomingQuote] = useState(null),
    [shared, setShared] = useState(null),
    [shareError, setShareError] = useState(""),
    [planDraft, setPlanDraft] = useState(null),
    [planName, setPlanName] = useState(""),
    [tabChange, setTabChange] = useState(null);
  const notify = useCallback((message) => setToast(String(message)), []);
  useEffect(() => {
    const handler = (e) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "k" &&
        !document.querySelector('[role="dialog"], dialog[open]')
      ) {
        e.preventDefault();
        setQuickOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (mobileSearch)
      requestAnimationFrame(() =>
        document.querySelector(".global-search input")?.focus(),
      );
  }, [mobileSearch]);
  useEffect(() => {
    const mq = window.matchMedia("(max-width:780px)");
    const listener = () => setIsPhone(mq.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);
  useEffect(() => {
    if (!mobileMenu) return;
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = document.querySelector(".sidebar");
    sidebar?.querySelector("a,button")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") setMobileMenu(false);
      if (e.key === "Tab") {
        const nodes = [...(sidebar?.querySelectorAll("a,button") || [])];
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [mobileMenu]);

  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(null), 4400);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    const onHash = () => {
      const h = location.hash.slice(1);
      if (!h.startsWith("share="))
        setRoute(navigation.some((x) => x[0] === h) ? h : "overview");
      setMobileMenu(false);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (location.hash.startsWith("#share="))
      import("./lib/share.js")
        .then((m) => m.getSharedPlan())
        .then(setShared)
        .catch((e) => setShareError(e.message));
  }, []);
  useEffect(() => {
    const f = (e) => {
      if (e.key === KEY && e.newValue)
        try {
          setTabChange(normalizeAssetPaths(JSON.parse(e.newValue)));
        } catch {}
    };
    window.addEventListener("storage", f);
    return () => window.removeEventListener("storage", f);
  }, []);
  const updateDb = useCallback(
    (fn) =>
      setDb((prev) => {
        const next = normalizeAssetPaths(
          typeof fn === "function" ? fn(prev) : fn,
        );
        if (session?.role === "viewer") {
          notify("Tài khoản đám mây chỉ có quyền xem.");
          return prev;
        }
        if (
          session &&
          session.role !== "admin" &&
          (JSON.stringify(next.products) !== JSON.stringify(prev.products) ||
            JSON.stringify(next.settings) !== JSON.stringify(prev.settings))
        ) {
          notify("Chỉ quản trị viên được thay đổi bảng giá và cấu hình chung.");
          return prev;
        }
        const stamped = { ...next, updatedAt: new Date().toISOString() };
        try {
          localStorage.setItem(KEY, JSON.stringify(stamped));
          setSaveError("");
        } catch {
          setSaveError(
            "Không ghi được bộ nhớ máy. Hãy xuất sao lưu trước khi đóng trang.",
          );
        }
        return stamped;
      }),
    [notify, session],
  );
  const navigate = (key, payload) => {
    if (key === "calculator" && payload) setEditPlan(payload);
    if (key === "quotes" && payload) setIncomingQuote(payload);
    if (key === "settings") setSettingsTab(payload?.tab || "company");
    if (key === "customers") setCustomerFocus(payload?.customerId || null);
    if (key === "catalog") setCatalogQuery(payload?.query || "");
    setMobileSearch(false);
    location.hash = key;
    setRoute(key);
    setMobileMenu(false);
    setQuery("");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const savePlan = (p) => {
    setPlanDraft(p);
    setPlanName(
      p.name || `Phương án ${number(p.result.systemKwp)} kWp · ${date()}`,
    );
  };
  const doSavePlan = (e) => {
    e.preventDefault();
    if (!planName.trim()) return;
    const p = {
      ...planDraft,
      id: uid(),
      name: planName.trim(),
      createdAt: new Date().toISOString(),
    };
    updateDb((d) => ({
      ...d,
      plans: [p, ...d.plans],
      activities: [
        {
          id: uid(),
          text: "Lưu " + p.name,
          type: "plan",
          createdAt: p.createdAt,
        },
        ...d.activities,
      ].slice(0, 200),
    }));
    setPlanDraft(null);
    notify("Đã lưu bản chụp phương án trên máy.");
  };
  useEffect(() => {
    if (!planDraft) return;
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPlanDraft(null);
      }
      if (e.key === "Tab") {
        const nodes = [
          ...document.querySelectorAll(
            "[data-plan-dialog] button,[data-plan-dialog] input",
          ),
        ].filter((n) => !n.disabled);
        const first = nodes[0],
          last = nodes.at(-1);
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
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handler);
      previous?.focus?.();
    };
  }, [planDraft]);
  const result = calculate(defaults, db.products, db.settings),
    activeRoute = navigation.find((x) => x[0] === route) || navigation[0];
  const matches = query.trim()
    ? db.customers
        .filter((c) =>
          searchText(`${c.name} ${c.phone}`).includes(searchText(query)),
        )
        .slice(0, 3)
        .map((c) => ({
          title: c.name,
          detail: "Khách hàng · " + (c.phone || ""),
          route: "customers",
          payload: { customerId: c.id },
        }))
        .concat(
          db.plans
            .filter((p) => searchText(p.name).includes(searchText(query)))
            .slice(0, 3)
            .map((p) => ({
              title: p.name,
              detail: "Phương án · " + number(p.result?.systemKwp) + " kWp",
              route: "calculator",
              payload: p,
            })),
          db.products
            .filter((p) =>
              searchText(`${p.brand} ${p.model}`).includes(searchText(query)),
            )
            .slice(0, 4)
            .map((p) => ({
              title: p.model || p.brand,
              detail: "Thiết bị · " + p.brand,
              route: "catalog",
              payload: { query: p.model || p.brand },
            })),
        )
    : [];
  if (shared || shareError)
    return (
      <GuestView
        envelope={shared}
        error={shareError}
        onShare={setShare}
        share={share}
        setShare={setShare}
        notify={notify}
      />
    );
  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-backdrop"
          aria-label="Đóng menu"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside
        className={"sidebar " + (mobileMenu ? "is-open" : "")}
        inert={isPhone && !mobileMenu}
        aria-hidden={isPhone && !mobileMenu}
      >
        <a
          className="logo-lockup official-sidebar-logo"
          href="#overview"
          aria-label="Kim Solar - Tổng quan"
        >
          <Brand />
        </a>
        <div className="workspace-switch">
          <span className="workspace-mark">K</span>
          <div>
            Kim Solar Workspace<small>Kinh doanh & khách hàng</small>
          </div>
        </div>
        <span className="nav-caption">KHÔNG GIAN LÀM VIỆC</span>
        <nav>
          {navigation.map(([key, Icon, title], i) => (
            <React.Fragment key={key}>
              {i === 7 && <div className="nav-separator" />}
              <button
                className={"nav-item " + (route === key ? "active" : "")}
                onClick={() => navigate(key)}
                aria-current={route === key ? "page" : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span>{title}</span>
                {key === "quotes" && db.quotes.length > 0 && (
                  <em>{db.quotes.length}</em>
                )}
              </button>
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="cloud-card backup-shortcut"
            onClick={() => navigate("settings", { tab: "data" })}
          >
            <DatabaseBackup size={23} />
            <span>
              Sao lưu dữ liệu<small>Tải file và khôi phục hồ sơ</small>
            </span>
            <ArrowUpRight size={17} />
          </button>
          <a className="staff-block" href={"tel:" + db.settings.salesPhone}>
            <span className="staff-avatar">KD</span>
            <span>
              {db.settings.salesName}
              <small>{db.settings.salesPhone}</small>
            </span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMobileMenu(true)}
              aria-label="Mở menu"
              aria-expanded={mobileMenu}
            >
              <Menu size={21} />
            </button>
            <a
              className="mobile-top-brand"
              href="#overview"
              aria-label="Kim Solar - Tổng quan"
            >
              <Brand />
            </a>
            <span className="bread-root">Không gian làm việc</span>
            <ChevronRight size={13} />
            <strong>{activeRoute[2]}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-btn mobile-search-toggle"
              aria-label="Mở tìm kiếm"
              onClick={() => setMobileSearch((v) => !v)}
            >
              <Search size={21} />
            </button>
            <div
              className={
                "global-search " + (mobileSearch ? "is-mobile-open" : "")
              }
            >
              <Search size={16} />
              <input
                aria-label="Tìm kiếm toàn bộ"
                placeholder="Tìm khách, model, phương án..."
                value={query}
                autoFocus={mobileSearch}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQuery("");
                    setMobileSearch(false);
                  }
                }}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                className="mobile-search-close icon-btn"
                aria-label="Đóng tìm kiếm"
                onClick={() => {
                  setMobileSearch(false);
                  setQuery("");
                }}
              >
                <X size={18} />
              </button>
              {query && (
                <div className="search-dropdown">
                  {matches.length ? (
                    matches.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => navigate(r.route, r.payload)}
                      >
                        <Search size={14} />
                        <span>
                          {r.title}
                          <small>{r.detail}</small>
                        </span>
                        <ArrowUpRight size={13} />
                      </button>
                    ))
                  ) : (
                    <p>Chưa tìm thấy dữ liệu phù hợp.</p>
                  )}
                </div>
              )}
            </div>
            <button
              className="icon-btn quick-actions-trigger"
              aria-label="Mở thao tác nhanh"
              title="Thao tác nhanh (Ctrl / ⌘ K)"
              onClick={() => setQuickOpen(true)}
            >
              <Zap size={19} />
            </button>
            <button
              className={"connection-pill " + (saveError ? "error" : "")}
              onClick={() =>
                session
                  ? setCloudOpen(true)
                  : navigate("settings", { tab: "data" })
              }
            >
              <span />
              {session ? "Cloud kết nối" : "Lưu trên máy"}
            </button>
            <button
              className="icon-btn"
              aria-label="Xem việc cần làm"
              onClick={() => {
                navigate("overview");
                setTimeout(
                  () =>
                    document
                      .getElementById("today-tasks")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  150,
                );
              }}
            >
              <CalendarCheck2 size={21} />
            </button>
            <a
              className="quick-call"
              href={"tel:" + db.settings.salesPhone}
              aria-label={"Gọi " + db.settings.salesName}
            >
              <Phone size={18} />
              <span>Liên hệ</span>
            </a>
          </div>
        </header>
        <main className="page-content">
          {saveError && (
            <div className="warning warning-error">
              <AlertTriangle size={18} />
              {saveError}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate("settings")}
              >
                Xuất dữ liệu
              </button>
            </div>
          )}
          {tabChange && (
            <div className="warning">
              <RefreshCw size={18} />
              Một tab khác đã thay đổi dữ liệu. Xuất bản hiện tại nếu cần giữ
              trước khi nạp.
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setDb(tabChange);
                  setTabChange(null);
                }}
              >
                Nạp thay đổi
              </button>
              <button
                className="icon-btn"
                aria-label="Giữ bản hiện tại"
                onClick={() => setTabChange(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <Suspense
            fallback={
              <div className="loading-state">
                <span className="loading-orbit" />
                <p>Đang chuẩn bị không gian làm việc...</p>
              </div>
            }
          >
            <PageAgent key={route} route={route} />
            {route === "overview" && (
              <Dashboard
                db={db}
                updateDb={updateDb}
                navigate={navigate}
                result={result}
                notify={notify}
              />
            )}
            {route === "calculator" && (
              <Calculator
                db={db}
                initialPlan={editPlan}
                onConsumedPlan={() => setEditPlan(null)}
                onSavePlan={savePlan}
                onCreateQuote={(p) => navigate("quotes", p)}
                onShare={setShare}
              />
            )}
            {route === "lookup" && <QuickLookup db={db} navigate={navigate} />}
            {route === "plans" && (
              <Plans
                db={db}
                updateDb={updateDb}
                navigate={navigate}
                onShare={setShare}
                notify={notify}
              />
            )}
            {route === "quotes" && (
              <Quotes
                db={db}
                updateDb={updateDb}
                notify={notify}
                onNavigate={navigate}
                initialPlan={incomingQuote}
                onConsumedPlan={() => setIncomingQuote(null)}
              />
            )}
            {route === "customers" && (
              <Customers
                initialCustomerId={customerFocus}
                db={db}
                updateDb={updateDb}
                notify={notify}
                onNavigate={navigate}
              />
            )}
            {route === "care" && (
              <Care
                db={db}
                updateDb={updateDb}
                notify={notify}
                onNavigate={navigate}
              />
            )}
            {route === "catalog" && (
              <Catalog
                initialQuery={catalogQuery}
                db={db}
                updateDb={updateDb}
                notify={notify}
                onNavigate={navigate}
              />
            )}
            {route === "knowledge" && <Knowledge />}
            {route === "settings" && (
              <>
                <Settings
                  initialTab={settingsTab}
                  onTabChange={setSettingsTab}
                  db={db}
                  updateDb={updateDb}
                  notify={notify}
                  onNavigate={navigate}
                />
                <details className="cloud-advanced-settings">
                  <summary>
                    <Cloud size={17} />
                    Kết nối dữ liệu đội nhóm (tùy chọn)
                  </summary>
                  <div className="card cloud-settings-callout">
                    <Cloud size={28} />
                    <div>
                      <h3>Kết nối không gian dữ liệu riêng của bạn</h3>
                      <p>
                        Kết nối Supabase để đăng nhập, phân quyền và đồng bộ có
                        kiểm tra phiên bản. Dữ liệu hiện tại lưu trên máy.
                      </p>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => setCloudOpen(true)}
                    >
                      Thiết lập đám mây
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </details>
              </>
            )}
          </Suspense>
          <footer className="app-footer">
            <span>
              © {new Date().getFullYear()} Kim Solar <i /> Năng lượng cho những
              cơ hội mới.
            </span>
            <a href={"tel:" + db.settings.salesPhone}>
              {db.settings.salesPhone} · {db.settings.salesName}
              <ArrowUpRight size={12} />
            </a>
          </footer>
        </main>
      </div>
      <nav
        className="mobile-quick-nav"
        aria-label="Thao tác nhanh trên điện thoại"
      >
        {[
          ["overview", LayoutDashboard, "Tổng quan"],
          ["calculator", CalculatorIcon, "Tính toán"],
          ["quotes", FileText, "Báo giá"],
          ["customers", Users, "Khách hàng"],
        ].map(([key, Icon, label]) => (
          <button
            key={key}
            className={route === key ? "active" : ""}
            onClick={() => navigate(key)}
            aria-current={route === key ? "page" : undefined}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
        <button
          onClick={() => setMobileMenu(true)}
          aria-label="Mở toàn bộ chức năng"
        >
          <Menu size={21} />
          <span>Thêm</span>
        </button>
      </nav>
      {quickOpen && (
        <QuickActions onClose={() => setQuickOpen(false)} navigate={navigate} />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button aria-label="Đóng thông báo" onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}
      {planDraft && (
        <div className="modal-backdrop" onClick={() => setPlanDraft(null)}>
          <form
            data-plan-dialog
            role="dialog"
            aria-modal="true"
            aria-label="Lưu phương án"
            className="modal modal-small"
            onClick={(e) => e.stopPropagation()}
            onSubmit={doSavePlan}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">THƯ VIỆN PHƯƠNG ÁN</span>
                <h2>Lưu để tiếp tục tư vấn.</h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPlanDraft(null)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <label className="field">
              <span>Tên phương án</span>
              <input
                className="input"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                required
                autoFocus
                maxLength={180}
              />
            </label>
            <p className="muted">
              Lưu bản chụp hiện tại. Thay đổi bảng giá sau này không sửa bản đã
              lưu.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPlanDraft(null)}
              >
                Hủy
              </button>
              <button className="btn btn-primary" type="submit">
                <FolderOpen size={16} />
                Lưu phương án
              </button>
            </div>
          </form>
        </div>
      )}
      <Suspense fallback={null}>
        {share && (
          <ShareDialog
            plan={share}
            settings={db.settings}
            onClose={() => setShare(null)}
            notify={notify}
          />
        )}
        {cloudOpen && (
          <CloudSync
            db={db}
            replaceDb={(incoming) => {
              const next = normalizeAssetPaths(validateWorkspace(incoming));
              try {
                localStorage.setItem(KEY + ".before-cloud", JSON.stringify(db));
              } catch {}
              setDb(next);
              try {
                localStorage.setItem(KEY, JSON.stringify(next));
              } catch {
                setSaveError(
                  "Không lưu được bản tải về trên máy. Hãy xuất sao lưu.",
                );
              }
            }}
            notify={notify}
            onClose={() => setCloudOpen(false)}
            onSessionChange={setSession}
          />
        )}
      </Suspense>
    </div>
  );
}

function Dashboard({ db, updateDb, navigate, result, notify }) {
  const won = db.customers.filter((x) =>
      ["Đã chốt", "Đã bàn giao"].includes(x.status),
    ).length,
    draftValue = db.quotes
      .filter((q) => q.status === "draft")
      .reduce((a, q) => a + (Number(q.total) || 0), 0);
  return (
    <div className="dashboard enter">
      <div className="page-heading">
        <div>
          <span className="eyebrow">KHỞI ĐẦU MỘT NGÀY NHIỀU CƠ HỘI</span>
          <h1>
            Chào bạn, cùng tạo năng lượng mới
            <Sun className="heading-sun" size={25} strokeWidth={1.7} />
          </h1>
          <p>Mọi khách hàng, phương án và cuộc hẹn. Trong một không gian.</p>
        </div>
        <span className="date-label">
          <CalendarDays size={15} />
          {new Date().toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Ho_Chi_Minh",
          })}
        </span>
      </div>
      <section className="welcome-hero">
        <div className="hero-copy">
          <span className="hero-label">
            <span />
            KIM SOLAR · NĂNG LƯỢNG CHO TƯƠNG LAI
          </span>
          <h2>
            Khởi đầu từ mái nhà.
            <br />
            Lan tỏa <em>giá trị xanh.</em>
          </h2>
          <p>
            Biến nhu cầu của khách thành phương án rõ ràng.
            <br />
            Tính chính xác hơn. Báo giá chuyên nghiệp hơn.
          </p>
          <div className="hero-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate("calculator")}
            >
              <Plus size={18} />
              Tạo phương án mới
              <ArrowUpRight size={17} />
            </button>
            <button className="hero-link" onClick={() => navigate("lookup")}>
              Khám phá tra nhanh
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="hero-proof">
            <ShieldCheck size={15} />
            <span>Dữ liệu có nguồn</span>
            <i />
            <span>Báo giá có phiên bản</span>
            <i />
            <span>Lưu & khôi phục</span>
          </div>
        </div>
        <div className="hero-visual">
          <picture>
            <source media="(max-width: 780px)" srcSet={heroPhotoMobile} />
            <img
              className="hero-photo"
              src={heroPhoto}
              width="1664"
              height="941"
              alt="Minh họa ngôi nhà hiện đại với hệ điện mặt trời trên mái"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <span className="hero-photo-caption">
            Ảnh minh họa · Không gian sống cùng năng lượng sạch
          </span>
          <div className="energy-orbit">
            <span className="energy-pulse" />
            <Sun size={22} />
            <span>
              Năng lượng sạch<small>Giá trị bền vững</small>
            </span>
          </div>
        </div>
      </section>
      <section className="dashboard-metrics">
        {[
          [
            Users,
            "Khách hàng",
            db.customers.length,
            "Hồ sơ đang quản lý",
            "orange",
            "customers",
          ],
          [
            FolderOpen,
            "Phương án",
            db.plans.length,
            "Bản cấu hình đã lưu",
            "green",
            "plans",
          ],
          [
            FileText,
            "Báo giá",
            db.quotes.length,
            draftValue
              ? currency(draftValue) + " tổng giá trị nháp"
              : "Sẵn sàng cho cơ hội đầu tiên",
            "purple",
            "quotes",
          ],
          [
            HeartHandshake,
            "Khách đã chốt",
            won,
            db.tickets.filter(
              (x) => !["Đã đóng", "Đã giải quyết"].includes(x.status),
            ).length + " yêu cầu CSKH đang mở",
            "blue",
            "care",
          ],
        ].map(([Icon, label, value, sub, color, key]) => (
          <button
            className="stat-card"
            key={label}
            onClick={() => navigate(key)}
          >
            <span className={"stat-icon " + color}>
              <Icon size={19} />
            </span>
            <div className="stat-label">
              {label}
              <ArrowUpRight size={14} />
            </div>
            <strong>{value.toString().padStart(2, "0")}</strong>
            <small>{sub}</small>
          </button>
        ))}
      </section>
      <div className="dashboard-columns">
        <section className="card potential-card">
          <div className="card-head">
            <div>
              <span className="eyebrow">GÓC NHÌN NĂNG LƯỢNG</span>
              <h2>Nhìn thấy giá trị trước khi đầu tư.</h2>
            </div>
            <span className="badge badge-soft">Kịch bản tham khảo</span>
          </div>
          <div className="potential-top">
            <div>
              <span className="muted">
                Với hóa đơn {currency(defaults.monthlyBill)}/tháng
              </span>
              <div className="potential-amount">
                {number(result.systemKwp)} <small>kWp</small>
                <span>đề xuất sơ bộ</span>
              </div>
            </div>
            <div className="potential-saving">
              <span>Tiết kiệm ước tính</span>
              <strong>
                {currency(result.monthlySavings)}
                <small>/ tháng</small>
              </strong>
            </div>
          </div>
          <EnergyChart result={result} />
          <div className="chart-legend">
            <span>
              <i style={{ background: "#ef793f" }} />
              Sản lượng dự kiến
            </span>
            <span>
              <i style={{ background: "#dbe2d4" }} />
              Nhu cầu tiêu thụ
            </span>
            <small>
              Giá trị tính theo giả định nắng {defaults.specificYield}{" "}
              kWh/kWp/ngày.
            </small>
          </div>
          <button
            className="text-action"
            onClick={() => navigate("calculator")}
          >
            Điều chỉnh theo nhu cầu khách
            <ArrowUpRight size={16} />
          </button>
        </section>
        <TaskBoard
          db={db}
          updateDb={updateDb}
          navigate={navigate}
          notify={notify}
        />
      </div>
      <div className="dashboard-columns bottom">
        <section className="card recent-card">
          <div className="card-head">
            <div>
              <span className="eyebrow">TIẾP TỤC CÔNG VIỆC</span>
              <h2>Phương án gần đây</h2>
            </div>
            <button className="text-action" onClick={() => navigate("plans")}>
              Xem tất cả
              <ArrowRight size={14} />
            </button>
          </div>
          {db.plans.length ? (
            <div className="compact-plans">
              {db.plans.slice(0, 3).map((p) => (
                <button key={p.id} onClick={() => navigate("calculator", p)}>
                  <span className="mini-solar">
                    <Grid2X2 size={20} />
                  </span>
                  <span>
                    <b>{p.name}</b>
                    <small>
                      {number(p.result?.systemKwp)} kWp · {date(p.createdAt)}
                    </small>
                  </span>
                  <strong>{currency(p.result?.total)}</strong>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
          ) : (
            <div className="inline-empty">
              <span>
                <FolderOpen size={26} />
              </span>
              <div>
                <h3>Phương án đầu tiên đang chờ bạn.</h3>
                <p>Tạo và lưu để tiếp tục tư vấn bất cứ lúc nào.</p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate("calculator")}
              >
                Bắt đầu
                <ArrowUpRight size={14} />
              </button>
            </div>
          )}
        </section>
        <section className="catalog-shortcut">
          <span className="eyebrow">TƯ VẤN TỪ DỮ LIỆU THỰC</span>
          <h2>
            Hiểu sản phẩm.
            <br />
            Tự tin báo giá.
          </h2>
          <p>
            {db.products.filter((x) => x.active !== false).length} sản phẩm có
            dữ liệu từ Kim Solar.
            <br />
            Model, bảo hành, ảnh và đơn giá.
          </p>
          <button className="text-action" onClick={() => navigate("catalog")}>
            Mở danh mục thiết bị
            <ArrowUpRight size={16} />
          </button>
          <Package size={90} className="catalog-decoration" />
        </section>
      </div>
    </div>
  );
}
function EnergyChart({ result }) {
  const generation = result.dailyGeneration || 0,
    load = (result.monthlyKwh || 0) / 30,
    max = Math.max(generation, load, 1);
  return (
    <div
      className="energy-comparison"
      role="img"
      aria-label={`Nhu cầu ${number(load)} và sản lượng dự kiến ${number(generation)} kWh mỗi ngày`}
    >
      {[
        [Sun, "Sản lượng điện mặt trời", generation, "production"],
        [Zap, "Nhu cầu tiêu thụ", load, "consumption"],
      ].map(([Icon, label, value, type]) => (
        <div className={"comparison-row " + type} key={type}>
          <div className="comparison-label">
            <span>
              <Icon size={17} />
              {label}
            </span>
            <strong>
              {number(value)} <small>kWh/ngày</small>
            </strong>
          </div>
          <div className="comparison-track">
            <i style={{ width: (value / max) * 100 + "%" }} />
          </div>
        </div>
      ))}
      <div className="comparison-insight">
        <BatteryCharging size={20} />
        <span>
          Hệ lưu trữ {number(result.batteryKwh)} kWh
          <small>Cân bằng tải ngày và đêm theo cấu hình tham khảo.</small>
        </span>
      </div>
    </div>
  );
}
function QuickLookup({ db, navigate }) {
  const [mode, setMode] = useState("hybrid");
  return (
    <div className="enter">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TƯ VẤN NHANH TẠI CHỖ</span>
          <h1>Một hóa đơn. Một điểm khởi đầu.</h1>
          <p>
            Giả định mái 20 × 15 m, dùng điện ngày 75%, nắng 4,2 giờ. Chưa thay
            thế khảo sát.
          </p>
        </div>
        <div className="segmented">
          <button
            className={mode === "hybrid" ? "active" : ""}
            onClick={() => setMode("hybrid")}
          >
            Có lưu trữ
          </button>
          <button
            className={mode === "grid_tied" ? "active" : ""}
            onClick={() => setMode("grid_tied")}
          >
            Hòa lưới
          </button>
        </div>
      </div>
      <div className="lookup-grid">
        {[
          1000000, 1500000, 2000000, 2500000, 3000000, 5000000, 7000000,
          10000000,
        ].map((bill) => {
          const input = {
              ...defaults,
              monthlyBill: bill,
              mode,
              roofLength: 20,
              roofWidth: 15,
            },
            r = calculate(input, db.products, db.settings);
          return (
            <article className="card lookup-card" key={bill}>
              <span className="eyebrow">HÓA ĐƠN / THÁNG</span>
              <h2>{currency(bill)}</h2>
              <div className="lookup-power">
                <Sun size={22} />
                <strong>{number(r.systemKwp)}</strong>kWp
              </div>
              <div className="lookup-spec">
                <span>{r.panelCount} tấm</span>
                <span>{number(r.inverterKw)} kW</span>
                <span>
                  {mode === "hybrid"
                    ? number(r.batteryKwh) + " kWh pin"
                    : "Không pin"}
                </span>
              </div>
              <p>
                Tiết kiệm ước tính
                <strong>{currency(r.monthlySavings)}/tháng</strong>
              </p>
              <button
                className="btn btn-secondary"
                onClick={() =>
                  navigate("calculator", {
                    input,
                    result: r,
                    name: "Tra nhanh " + currency(bill),
                  })
                }
              >
                Tùy chỉnh phương án
                <ArrowUpRight size={15} />
              </button>
            </article>
          );
        })}
      </div>
      <div className="warning">
        <AlertTriangle size={18} />
        Cần đối chiếu model, mái và giá thiết bị trước khi gửi khách. Thiết bị
        thiếu giá sẽ được ghi rõ trong bản nháp.
      </div>
    </div>
  );
}
function Plans({ db, updateDb, navigate, onShare, notify }) {
  const [q, setQ] = useState("");
  const rows = db.plans.filter((p) =>
    searchText(p.name).includes(searchText(q)),
  );
  return (
    <div className="enter">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THƯ VIỆN CÔNG VIỆC</span>
          <h1>Mỗi phương án. Một cơ hội.</h1>
          <p>Bản chụp cấu hình và kết quả để tiếp nối cuộc tư vấn.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("calculator")}
        >
          <Plus size={17} />
          Tạo phương án
        </button>
      </div>
      <div className="toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            className="input"
            aria-label="Tìm phương án"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên phương án..."
          />
        </div>
        <span className="muted">{rows.length} phương án</span>
      </div>
      <PlanComparison
        plans={db.plans}
        onOpen={(p) => navigate("calculator", p)}
        onQuote={(p) => navigate("quotes", p)}
      />
      {rows.length ? (
        <div className="plans-grid">
          {rows.map((p) => (
            <article key={p.id} className="card plan-card">
              <div className="plan-card-art">
                <Grid2X2 size={55} />
                <span>
                  {number(p.result?.systemKwp)}
                  <small>kWp</small>
                </span>
                <i className="badge">Đã lưu</i>
              </div>
              <span className="eyebrow">{date(p.createdAt)}</span>
              <h2>{p.name}</h2>
              <div className="plan-details">
                <span>{p.result?.panelCount} tấm pin</span>
                <span>{number(p.result?.batteryKwh)} kWh lưu trữ</span>
              </div>
              <strong className="plan-total">
                {currency(p.result?.total)}
              </strong>
              <div className="plan-card-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate("calculator", p)}
                >
                  Mở phương án
                  <ArrowUpRight size={14} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={"Chia sẻ " + p.name}
                  onClick={() => onShare(p)}
                >
                  <ExternalLink size={16} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={"Tạo báo giá " + p.name}
                  onClick={() => navigate("quotes", p)}
                >
                  <FileText size={16} />
                </button>
                <button
                  className="icon-btn danger"
                  aria-label={"Xóa " + p.name}
                  onClick={() => {
                    if (
                      confirm(
                        "Xóa phương án này? Báo giá đã lưu không bị ảnh hưởng.",
                      )
                    ) {
                      updateDb((s) => ({
                        ...s,
                        plans: s.plans.filter((x) => x.id !== p.id),
                      }));
                      notify("Đã xóa phương án.");
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <FolderOpen size={42} />
          <h2>Không gian cho những phương án tốt.</h2>
          <p>
            {q
              ? "Thử một từ khóa khác."
              : "Tính cấu hình đầu tiên và chọn Lưu phương án."}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("calculator")}
          >
            Tạo phương án đầu tiên
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
const articles = [
  [
    "Đầu tư & hoàn vốn",
    "Khách hỏi “Bao lâu thu hồi vốn?”",
    "Dùng tổng đầu tư chia cho số tiền tiết kiệm dự kiến mỗi năm để giải thích hoàn vốn đơn giản. Cho khách xem giả định về nắng, biểu giá và mức tự dùng; không hứa một mốc cố định cho mọi công trình.",
  ],
  [
    "Dùng điện ban đêm",
    "Nhà đi làm ban ngày có nên lắp?",
    "Hệ hòa lưới ưu tiên tự dùng lúc có nắng; hệ hybrid có pin có thể chuyển một phần điện dư sang ban đêm. Cần xác định tỷ lệ dùng điện và khả năng sạc/xả trước khi chọn.",
  ],
  [
    "An toàn & kỹ thuật",
    "Pin lưu trữ và phương án dự phòng",
    "Dung lượng kWh không đồng nghĩa công suất kW. Cần kiểm tra công suất xả liên tục, tải khởi động, bảo vệ điện, tiếp địa và hướng dẫn nhà sản xuất.",
  ],
  [
    "Thi công mái",
    "Khách lo mái yếu hoặc thấm dột",
    "Ghi lại hiện trạng mái, xà gồ, vị trí vít, lối đi và điều kiện tiếp cận. Chuyển kỹ thuật kiểm tra trước khi chốt, không cam kết chống thấm khi chưa có khảo sát và chính sách.",
  ],
  [
    "Thiết bị",
    "Phân biệt kW, kWp và kWh",
    "kWp là công suất danh định của dàn tấm pin; kW là công suất tức thời hay giới hạn thiết bị; kWh là điện năng theo thời gian hoặc dung lượng lưu trữ.",
  ],
  [
    "Chính sách",
    "Điện dư có bán lại được không?",
    "Mặc định không tính doanh thu điện dư. Chỉ thêm khi có cơ chế, điều kiện đấu nối và giá mua áp dụng đã được kiểm tra cho công trình cụ thể.",
  ],
  [
    "Bảo hành",
    "Yên tâm sau lắp đặt",
    "Lưu thiết bị/model, serial, ngày nghiệm thu và đầu mối bảo hành. Phân biệt bảo hành sản phẩm với bảo hành hiệu suất và thi công.",
  ],
  [
    "Tư vấn chuyên nghiệp",
    "Khách nói “Gửi qua Zalo giúp anh/chị”",
    "Gửi cấu hình, đầu tư, tiết kiệm dự kiến, giả định và việc cần khảo sát. Chốt thời điểm liên hệ lại. Chia sẻ sử dụng tính năng hệ điều hành; không tự gửi tin khi chưa có tích hợp.",
  ],
];
function Knowledge() {
  const [q, setQ] = useState(""),
    [topic, setTopic] = useState("Tất cả"),
    [copied, setCopied] = useState("");
  const visible = articles.filter(
    (a) =>
      (topic === "Tất cả" || a[0] === topic) &&
      searchText(a.join(" ")).includes(searchText(q)),
  );
  return (
    <div className="enter">
      <div className="page-heading">
        <div>
          <span className="eyebrow">HIỂU ĐỂ TƯ VẤN TỐT HƠN</span>
          <h1>Đúng thông tin. Đúng thời điểm.</h1>
          <p>Nội dung tham khảo, không thay thế thẩm định kỹ thuật.</p>
        </div>
      </div>
      <div className="search-field knowledge-search">
        <Search size={18} />
        <input
          className="input"
          aria-label="Tìm cẩm nang"
          placeholder="Tìm về hoàn vốn, ban đêm, mái, bảo hành..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="knowledge-topics" aria-label="Chủ đề tư vấn">
        {["Tất cả", ...articles.map((a) => a[0])].map((t) => (
          <button
            key={t}
            aria-pressed={topic === t}
            className={topic === t ? "active" : ""}
            onClick={() => setTopic(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <p className="knowledge-result-count">
        {visible.length} nội dung phù hợp
      </p>
      {!visible.length && (
        <div className="card knowledge-no-results">
          <BookOpen size={30} />
          <h2>Chưa tìm thấy nội dung.</h2>
          <p>Thử từ khóa khác hoặc xem tất cả chủ đề.</p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setTopic("Tất cả");
              setQ("");
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      )}
      <div className="knowledge-grid">
        {visible.map(([tag, title, body], i) => (
          <article className="card knowledge-card" key={title}>
            <div className="knowledge-topic-heading">
              <span className="knowledge-topic-icon">
                {React.createElement(
                  [
                    CalendarDays,
                    BatteryCharging,
                    ShieldCheck,
                    House,
                    Zap,
                    FileText,
                    HeartHandshake,
                    Share2,
                  ][articles.findIndex(([name]) => name === tag) % 8],
                  { size: 23, strokeWidth: 1.7 },
                )}
              </span>
              <span className="badge">{tag}</span>
            </div>
            <h2>{title}</h2>
            <details>
              <summary>Xem gợi ý tư vấn</summary>
              <p>{body}</p>
            </details>
            <button
              className="text-action"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(body);
                  setCopied(title);
                  setTimeout(() => setCopied(""), 2000);
                } catch {
                  alert(
                    "Trình duyệt không cho sao chép tự động. Hãy chọn đoạn văn để sao chép.",
                  );
                }
              }}
            >
              {copied === title ? <Check size={14} /> : <Copy size={14} />}
              {copied === title ? "Đã sao chép" : "Sao chép gợi ý"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
function GuestView({ envelope, error, onShare, share, setShare, notify }) {
  if (error)
    return (
      <div className="guest-wrap">
        <div className="card empty-state">
          <AlertTriangle size={40} />
          <h1>Không mở được phương án.</h1>
          <p>{error}</p>
          <a className="btn btn-primary" href={location.pathname}>
            Về Kim Solar
          </a>
        </div>
      </div>
    );
  const p = envelope.plan,
    r = p.result || {},
    c = envelope.company;
  return (
    <div className="guest-wrap">
      <header className="guest-header">
        <a className="logo-lockup official-guest-logo" href={location.pathname}>
          <Brand />
        </a>
        <a className="btn btn-secondary" href={"tel:" + c.phone}>
          {c.phone}
          <ArrowUpRight size={15} />
        </a>
      </header>
      <section className="guest-hero">
        <span className="eyebrow">PHƯƠNG ÁN ĐƯỢC CHIA SẺ</span>
        <h1>
          Một tương lai sáng hơn,
          <br />
          bắt đầu từ mái nhà bạn.
        </h1>
        <p>{p.name || "Phương án điện mặt trời Kim Solar"}</p>
        <div className="guest-metrics">
          {[
            [number(r.systemKwp), "kWp hệ thống"],
            [r.panelCount, "Tấm pin"],
            [number(r.batteryKwh), "kWh lưu trữ"],
            [currency(r.monthlySavings), "Tiết kiệm ước tính / tháng"],
          ].map(([v, l]) => (
            <div key={l}>
              <strong>{v}</strong>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="card">
        <div className="card-head">
          <h2>Đầu tư một lần. Giá trị dài lâu.</h2>
          <span className="badge">Bản xem · Không chỉnh sửa</span>
        </div>
        <div className="guest-cost">
          <span>Tổng đầu tư dự kiến</span>
          <strong>{currency(r.total)}</strong>
          <small>
            Đối chiếu thuế, giá và điều kiện thi công trước khi ký kết.
          </small>
        </div>
        <div className="warning">
          <AlertTriangle size={18} />
          Ước tính cần khảo sát và xác minh thiết bị. Link chứa dữ liệu tự mô
          tả, không phải chứng từ được ký xác thực.
        </div>
        <button className="btn btn-primary" onClick={() => onShare(p)}>
          <Download size={16} />
          Tải ảnh phương án
        </button>
        <a className="btn btn-secondary" href={"tel:" + c.phone}>
          Trao đổi với {c.salesName}
        </a>
      </div>
      <p className="guest-expiry">
        Có hiệu lực xem đến {date(envelope.expiresAt)} · Dữ liệu theo thời điểm
        chia sẻ.
      </p>
      <Suspense fallback={null}>
        {share && (
          <ShareDialog
            plan={share}
            settings={{
              salesName: c.salesName,
              salesPhone: c.phone,
              companyName: c.name,
              email: c.email,
            }}
            onClose={() => setShare(null)}
            notify={notify}
          />
        )}
      </Suspense>
    </div>
  );
}
