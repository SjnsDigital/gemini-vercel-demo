import React, { useEffect, useRef, useState } from "react";
import {
  Cloud,
  CloudOff,
  LockKeyhole,
  LogOut,
  Download,
  Upload,
  RefreshCw,
  X,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Check,
} from "lucide-react";
import "./cloud.css";

const CONFIG_KEY = "kimsolar.cloud.config.v1";
const SESSION_KEY = "kimsolar.cloud.session.v1";
const ARRAYS = ["customers", "products", "plans", "quotes", "tickets", "tasks"];
const ROLE_NAMES = {
  admin: "Quản trị viên",
  sales: "Kinh doanh",
  technician: "Kỹ thuật",
  viewer: "Chỉ xem",
};
const COUNT_NAMES = {
  customers: "khách hàng",
  products: "thiết bị",
  plans: "phương án",
  quotes: "báo giá",
  tickets: "phiếu CSKH",
  tasks: "công việc",
};
function readJson(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
function counts(data) {
  return ARRAYS.map(
    (key) =>
      `${Array.isArray(data?.[key]) ? data[key].length : 0} ${COUNT_NAMES[key]}`,
  ).join(" · ");
}
function isWorkspaceData(data) {
  return (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    ARRAYS.every((key) => Array.isArray(data[key])) &&
    data.settings &&
    typeof data.settings === "object" &&
    !Array.isArray(data.settings)
  );
}
function validateConfig(config) {
  let url;
  try {
    url = new URL(config.url);
  } catch {
    throw new Error("Nhập URL dự án Supabase hợp lệ.");
  }
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  )
    throw new Error(
      "Dùng Project URL HTTPS dạng https://ten-du-an.supabase.co.",
    );
  const key = config.key.trim();
  if (!key || key.startsWith("sb_secret_"))
    throw new Error(
      "Chỉ dùng publishable key hoặc anon public key, không dùng secret/service_role key.",
    );
  if (key.split(".").length === 3) {
    try {
      const part = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(part));
      if (payload.role === "service_role") throw new Error("service-role");
    } catch (error) {
      if (error.message === "service-role")
        throw new Error("Không được đưa service_role key vào trình duyệt.");
    }
  }
  return { url: url.origin, key };
}

export default function CloudSync({
  db,
  replaceDb,
  notify = () => {},
  onClose,
  onSessionChange = () => {},
}) {
  const [config, setConfig] = useState(() =>
    readJson(localStorage, CONFIG_KEY, { url: "", key: "" }),
  );
  const [session, setSession] = useState(() =>
    readJson(sessionStorage, SESSION_KEY, null),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memberships, setMemberships] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [remote, setRemote] = useState(null);
  const [workspaceName, setWorkspaceName] = useState("Không gian Kim Solar");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [verifiedSession, setVerifiedSession] = useState(false);
  const didRestore = useRef(false);
  const boundProject = useRef(session?.projectUrl || "");
  const dialogRef = useRef(null);
  const busyRef = useRef("");
  busyRef.current = busy;
  const current = memberships.find(
    (member) => member.workspace_id === workspaceId,
  );
  const role = current?.role;

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("input, button")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        onClose?.();
      }
      if (event.key !== "Tab") return;
      const items = [
        ...(dialogRef.current?.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]',
        ) || []),
      ].filter((item) => item.getClientRects().length);
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0],
        last = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialogRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialogRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  function saveSession(value) {
    boundProject.current = value?.projectUrl || "";
    setSession(value);
    try {
      if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* Memory-only session still works. */
    }
  }
  async function request(
    path,
    { method = "GET", body, access, auth = true } = {},
  ) {
    const c = validateConfig(config);
    if ((auth || body?.refresh_token) && boundProject.current !== c.url)
      throw new Error(
        "Phiên đăng nhập thuộc dự án Supabase khác hoặc chưa gắn dự án. Hãy đăng nhập lại; chưa gửi token đi.",
      );
    const token = access || session?.accessToken;
    if (auth && !token) throw new Error("Vui lòng đăng nhập trước.");
    let response;
    try {
      response = await fetch(c.url + path, {
        method,
        headers: {
          apikey: c.key,
          Authorization: `Bearer ${auth ? token : c.key}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(25000),
      });
    } catch {
      throw new Error(
        "Không kết nối được Supabase. Kiểm tra mạng, Project URL và quyền truy cập tên miền. Dữ liệu trên máy vẫn được giữ.",
      );
    }
    const text = await response.text();
    let value;
    try {
      value = text ? JSON.parse(text) : null;
    } catch {
      value = null;
    }
    if (!response.ok) {
      const message = String(
        value?.message ||
          value?.msg ||
          value?.error_description ||
          value?.error ||
          response.statusText,
      );
      if (message.includes("KS_REVISION_CONFLICT"))
        throw new Error(
          "Có người đã cập nhật không gian này. Dữ liệu trên máy chưa bị thay đổi. Hãy đọc bản đám mây mới nhất, đối chiếu rồi chọn phiên bản cần giữ.",
        );
      if (response.status === 401 || response.status === 403)
        throw new Error(
          "Đăng nhập hết hạn hoặc tài khoản không có quyền thực hiện. Hãy đăng nhập lại và kiểm tra quyền thành viên.",
        );
      if (message.includes("KS_FORBIDDEN"))
        throw new Error(
          "Vai trò này không được sửa dữ liệu được yêu cầu. Giá và cài đặt chỉ quản trị viên được thay đổi.",
        );
      if (message.includes("KS_INVALID_DATA"))
        throw new Error(
          "Cấu trúc dữ liệu không hợp lệ. Chưa ghi dữ liệu lên máy chủ.",
        );
      if (
        response.status === 404 ||
        message.includes("schema cache") ||
        message.includes("does not exist")
      )
        throw new Error(
          "Chưa tìm thấy các bảng/RPC Kim Solar. Chạy supabase/schema.sql trong SQL Editor của dự án trước.",
        );
      throw new Error(
        "Supabase từ chối thao tác. Kiểm tra cấu hình, schema và tài khoản. Dữ liệu trên máy chưa bị thay đổi.",
      );
    }
    return value;
  }
  async function loadMemberships(access, userId) {
    const data = await request(
      `/rest/v1/ks_members?user_id=eq.${encodeURIComponent(userId)}&select=workspace_id,role,ks_workspaces(id,name)&order=created_at.asc`,
      { access },
    );
    if (!Array.isArray(data))
      throw new Error("Phản hồi danh sách không gian không hợp lệ.");
    setMemberships(data);
    setVerifiedSession(true);
    if (!data.length) {
      setWorkspaceId("");
      setRemote(null);
      onSessionChange(null);
    }
    return data;
  }
  async function verifyRestoredSession() {
    if (!session) return;
    setBusy("Đang xác thực phiên đăng nhập…");
    setError("");
    try {
      const projectUrl = validateConfig(config).url;
      if (session.projectUrl !== projectUrl)
        throw new Error(
          "Cấu hình dự án đã thay đổi. Hãy đăng nhập lại; phiên cũ chưa được gửi tới dự án mới.",
        );
      let active = session;
      if (Date.now() >= session.expiresAt - 30000) {
        const value = await request("/auth/v1/token?grant_type=refresh_token", {
          method: "POST",
          body: { refresh_token: session.refreshToken },
          auth: false,
        });
        active = {
          projectUrl,
          accessToken: value.access_token,
          refreshToken: value.refresh_token,
          expiresAt: Date.now() + value.expires_in * 1000,
          user: value.user,
        };
        saveSession(active);
      }
      const user = await request("/auth/v1/user", {
        access: active.accessToken,
      });
      if (!user?.id) throw new Error("Phiên đăng nhập không hợp lệ.");
      await loadMemberships(active.accessToken, user.id);
    } catch (failure) {
      saveSession(null);
      setVerifiedSession(false);
      onSessionChange(null);
      setError(failure.message);
    } finally {
      setBusy("");
    }
  }
  useEffect(() => {
    if (!didRestore.current) {
      didRestore.current = true;
      verifyRestoredSession();
    }
  }, []);
  async function login(event) {
    event.preventDefault();
    setBusy("Đang đăng nhập…");
    setError("");
    setPending(null);
    try {
      const c = validateConfig(config);
      localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
      const value = await request("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: { email: email.trim(), password },
        auth: false,
      });
      if (!value?.access_token || !value.user?.id)
        throw new Error("Phản hồi đăng nhập không hợp lệ.");
      const active = {
        projectUrl: c.url,
        accessToken: value.access_token,
        refreshToken: value.refresh_token,
        expiresAt: Date.now() + value.expires_in * 1000,
        user: value.user,
      };
      saveSession(active);
      await loadMemberships(active.accessToken, value.user.id);
      notify("Đã xác thực tài khoản Supabase. Chọn không gian để làm việc.");
    } catch (failure) {
      setError(failure.message);
      saveSession(null);
      setVerifiedSession(false);
      onSessionChange(null);
    } finally {
      setPassword("");
      setBusy("");
    }
  }
  async function selectWorkspace(id) {
    setWorkspaceId(id);
    setRemote(null);
    setPending(null);
    setError("");
    if (!id) {
      onSessionChange(null);
      return;
    }
    setBusy("Đang đọc phiên bản đám mây…");
    try {
      const values = await request(
        `/rest/v1/ks_workspace_state?workspace_id=eq.${encodeURIComponent(id)}&select=workspace_id,revision,data,updated_at`,
      );
      if (!Array.isArray(values) || values.length !== 1)
        throw new Error(
          "Không có dữ liệu hoặc không đủ quyền đọc không gian này.",
        );
      setRemote(values[0]);
      const member = memberships.find((item) => item.workspace_id === id);
      onSessionChange({
        role: member?.role || "viewer",
        workspaceId: id,
        userEmail: session.user.email,
      });
    } catch (failure) {
      setError(failure.message);
      onSessionChange(null);
    } finally {
      setBusy("");
    }
  }
  async function createWorkspace() {
    if (!workspaceName.trim()) {
      setError("Nhập tên không gian.");
      return;
    }
    setBusy("Đang tạo không gian…");
    setError("");
    try {
      await request("/rest/v1/rpc/ks_create_workspace", {
        method: "POST",
        body: { p_name: workspaceName.trim() },
      });
      await loadMemberships(session.accessToken, session.user.id);
      notify("Đã tạo không gian. Chọn không gian rồi tải dữ liệu lên lần đầu.");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy("");
    }
  }
  async function previewPull() {
    setBusy("Đang tải bản mới nhất để đối chiếu…");
    setError("");
    try {
      const values = await request(
        `/rest/v1/ks_workspace_state?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=workspace_id,revision,data,updated_at`,
      );
      const latest = values?.[0];
      if (!latest) throw new Error("Chưa tìm thấy dữ liệu trong không gian.");
      setRemote(latest);
      if (!isWorkspaceData(latest.data))
        throw new Error(
          "Không gian chưa có bộ dữ liệu Kim Solar. Quản trị viên cần tải dữ liệu lên lần đầu.",
        );
      setPending({ kind: "pull", value: latest });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy("");
    }
  }
  async function applySync() {
    const action = pending;
    if (!action || !remote) return;
    setBusy(
      action.kind === "pull"
        ? "Đang khôi phục vào máy…"
        : "Đang ghi phiên bản lên đám mây…",
    );
    setError("");
    try {
      if (action.kind === "pull") {
        if (!isWorkspaceData(action.value.data))
          throw new Error("Dữ liệu nhận được không hợp lệ.");
        localStorage.setItem(
          "kimsolar.backup.before-cloud." + Date.now(),
          JSON.stringify(db),
        );
        replaceDb(structuredClone(action.value.data));
        setRemote(action.value);
      } else {
        if (!isWorkspaceData(db))
          throw new Error(
            "Dữ liệu trên máy không có cấu trúc Kim Solar hợp lệ.",
          );
        const result = await request("/rest/v1/rpc/ks_save_workspace", {
          method: "POST",
          body: {
            p_workspace: workspaceId,
            p_expected: remote.revision,
            p_data: db,
          },
        });
        const saved = Array.isArray(result) ? result[0] : result;
        if (!saved || saved.revision === undefined)
          throw new Error(
            "Chưa xác nhận được phiên bản lưu từ máy chủ. Hãy đọc lại bản đám mây trước khi thử ghi tiếp.",
          );
        setRemote({
          workspace_id: workspaceId,
          revision: saved.revision,
          data: structuredClone(db),
          updated_at: saved.updated_at,
        });
      }
      const at = new Date().toISOString();
      setLastSync(at);
      setPending(null);
      onSessionChange({
        role,
        workspaceId,
        userEmail: session.user.email,
        lastSyncedAt: at,
      });
      notify(
        action.kind === "pull"
          ? "Đã nhận dữ liệu đám mây; bản trước khôi phục được giữ trên máy."
          : "Máy chủ đã xác nhận lưu phiên bản mới.",
      );
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy("");
    }
  }
  async function logout() {
    setBusy("Đang đăng xuất…");
    let revokeFailed = false;
    try {
      await request("/auth/v1/logout", { method: "POST" });
    } catch {
      revokeFailed = true;
    }
    saveSession(null);
    setVerifiedSession(false);
    setMemberships([]);
    setWorkspaceId("");
    setRemote(null);
    setPending(null);
    onSessionChange(null);
    setBusy("");
    setError(
      revokeFailed
        ? "Đã xóa phiên trên trình duyệt; chưa xác nhận thu hồi phiên tại máy chủ do lỗi kết nối."
        : "",
    );
    notify("Đã đăng xuất khỏi trình duyệt này.");
  }

  return (
    <div
      className="cloud-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose?.();
      }}
    >
      <section
        className="cloud-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-title"
      >
        <header className="cloud-header">
          <div className="cloud-title-icon">
            <Cloud size={23} />
          </div>
          <div>
            <p className="eyebrow">KIM SOLAR CONNECT</p>
            <h2 id="cloud-title">Không gian dữ liệu chung</h2>
          </div>
          <button
            className="cloud-close"
            onClick={onClose}
            disabled={Boolean(busy)}
            aria-label="Đóng đồng bộ"
          >
            <X size={20} />
          </button>
        </header>
        <div className="cloud-body">
          <div
            className={"cloud-status " + (verifiedSession ? "connected" : "")}
          >
            <span>
              {verifiedSession ? (
                <ShieldCheck size={20} />
              ) : (
                <CloudOff size={20} />
              )}
            </span>
            <div>
              <strong>
                {verifiedSession
                  ? "Tài khoản đã được xác thực"
                  : "Dữ liệu hiện được lưu trên máy"}
              </strong>
              <p>
                {verifiedSession
                  ? "Đọc và ghi là hai thao tác có xác nhận riêng. Chưa có tự động đồng bộ nền."
                  : "Đăng nhập Supabase để kết nối nhiều thiết bị. Không cần kết nối để tiếp tục làm việc cục bộ."}
              </p>
            </div>
          </div>
          {!verifiedSession ? (
            <form onSubmit={login} className="cloud-form">
              <details className="cloud-help" open={!config.url}>
                <summary>Thiết lập lần đầu</summary>
                <p>
                  Tạo dự án Supabase miễn phí, chạy{" "}
                  <code>supabase/schema.sql</code> từ bộ mã nguồn, bật Email
                  Auth và tạo tài khoản nhân viên. Dùng Project URL và
                  publishable/anon key bên dưới. Chưa có backend nào được cấu
                  hình sẵn.
                </p>
                <p>
                  Không nhập service_role key. Mật khẩu chỉ gửi trực tiếp tới dự
                  án Supabase của bạn và không được lưu trên máy.
                </p>
              </details>
              <label className="field">
                Project URL
                <input
                  className="input"
                  type="url"
                  required
                  value={config.url}
                  placeholder="https://your-project.supabase.co"
                  onChange={(e) =>
                    setConfig({ ...config, url: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Publishable key / anon public key
                <input
                  className="input"
                  required
                  value={config.key}
                  placeholder="sb_publishable_… hoặc anon JWT"
                  onChange={(e) =>
                    setConfig({ ...config, key: e.target.value })
                  }
                  autoComplete="off"
                  spellCheck="false"
                />
              </label>
              <div className="cloud-form-grid">
                <label className="field">
                  Email nhân viên
                  <input
                    className="input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                  />
                </label>
                <label className="field">
                  Mật khẩu
                  <input
                    className="input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
              </div>
              <button className="btn btn-primary" disabled={Boolean(busy)}>
                <LockKeyhole size={16} />
                {busy || "Đăng nhập & kiểm tra kết nối"}
              </button>
            </form>
          ) : (
            <>
              <div className="cloud-account">
                <div>
                  <strong>{session?.user?.email}</strong>
                  <span>Phiên chỉ lưu trong phiên trình duyệt này.</span>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={logout}
                  disabled={Boolean(busy)}
                >
                  <LogOut size={15} />
                  Đăng xuất
                </button>
              </div>
              <label className="field">
                Không gian làm việc
                <select
                  aria-label="Không gian làm việc"
                  className="select"
                  value={workspaceId}
                  onChange={(e) => selectWorkspace(e.target.value)}
                  disabled={Boolean(busy)}
                >
                  <option value="">Chọn không gian…</option>
                  {memberships.map((member) => (
                    <option
                      key={member.workspace_id}
                      value={member.workspace_id}
                    >
                      {member.ks_workspaces?.name || member.workspace_id} ·{" "}
                      {ROLE_NAMES[member.role] || member.role}
                    </option>
                  ))}
                </select>
              </label>
              {remote && (
                <div className="cloud-revision">
                  <div>
                    <span>Vai trò</span>
                    <strong>{ROLE_NAMES[role] || "Chưa xác định"}</strong>
                  </div>
                  <div>
                    <span>Phiên bản máy chủ</span>
                    <strong>v{remote.revision}</strong>
                  </div>
                  <div>
                    <span>Cập nhật trên máy chủ</span>
                    <strong>
                      {new Date(remote.updated_at).toLocaleString("vi-VN")}
                    </strong>
                  </div>
                </div>
              )}
              {workspaceId && remote && (
                <div className="cloud-transfer">
                  <article>
                    <h3>Trên máy này</h3>
                    <p>{counts(db)}</p>
                    <button
                      className="btn btn-primary"
                      disabled={Boolean(busy) || role === "viewer"}
                      onClick={() => {
                        setError("");
                        setPending({ kind: "push" });
                      }}
                    >
                      <Upload size={16} />
                      Tải dữ liệu lên đám mây
                    </button>
                  </article>
                  <article>
                    <h3>Bản đám mây</h3>
                    <p>
                      {isWorkspaceData(remote.data)
                        ? counts(remote.data)
                        : "Chưa có dữ liệu Kim Solar."}
                    </p>
                    <button
                      className="btn btn-secondary"
                      disabled={Boolean(busy)}
                      onClick={previewPull}
                    >
                      <Download size={16} />
                      Đọc bản mới nhất về máy
                    </button>
                  </article>
                </div>
              )}
              {lastSync && (
                <p className="cloud-footnote">
                  <Check size={14} />
                  Thao tác đồng bộ đã xác nhận lúc{" "}
                  {new Date(lastSync).toLocaleString("vi-VN")}.
                </p>
              )}
              <details className="cloud-help">
                <summary>
                  <Plus size={14} /> Tạo không gian riêng
                </summary>
                <div className="cloud-inline">
                  <input
                    className="input"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    maxLength={120}
                    aria-label="Tên không gian mới"
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={createWorkspace}
                    disabled={Boolean(busy)}
                  >
                    Tạo
                  </button>
                </div>
                <p>
                  Người tạo là quản trị viên. Thêm nhân viên và gán quyền qua
                  SQL Editor theo hướng dẫn; ứng dụng không tạo quyền giả trong
                  trình duyệt.
                </p>
              </details>
            </>
          )}
          {pending && (
            <div className="cloud-confirm">
              <strong>
                <AlertTriangle size={17} />
                {pending.kind === "pull"
                  ? "Thay dữ liệu trên máy bằng bản đám mây?"
                  : "Thay bản đám mây bằng dữ liệu trên máy?"}
              </strong>
              <p>
                {pending.kind === "pull"
                  ? `Bản v${pending.value.revision}: ${counts(pending.value.data)}. Dữ liệu hiện tại được giữ thành bản sao trước khi thay thế.`
                  : `Ghi dựa trên phiên bản v${remote.revision}. Nếu có người vừa sửa, máy chủ sẽ từ chối để tránh ghi đè. Quản trị viên có thể sửa toàn bộ; nhân viên giữ nguyên bảng giá và cài đặt chung.`}
              </p>
              <div>
                <button
                  className="btn btn-primary"
                  onClick={applySync}
                  disabled={Boolean(busy)}
                >
                  {busy || "Xác nhận đồng bộ"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPending(null)}
                  disabled={Boolean(busy)}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
          {busy && !pending && (
            <p className="cloud-busy" aria-live="polite">
              <RefreshCw size={15} />
              {busy}
            </p>
          )}
          {error && (
            <p className="cloud-error" role="alert">
              <AlertTriangle size={17} />
              {error}
            </p>
          )}
          <p className="cloud-footnote">
            Đồng bộ không thay thế sao lưu. Hãy xuất JSON trước khi đổi thiết bị
            hoặc nhập một bộ dữ liệu khác. Máy chủ cần được triển khai và kiểm
            tra bằng tài khoản thật trước khi dùng chung.
          </p>
        </div>
      </section>
    </div>
  );
}
