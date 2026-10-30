import React, { useId, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  CornerDownLeft,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  Sparkles,
  X,
} from "lucide-react";
import { assistantSkills, interpretAssistant } from "../lib/assistant.js";
import "./agent-workbench.css";

export default function AgentWorkbench({
  route = "overview",
  db = {},
  onAction,
}) {
  const skill = assistantSkills[route] || assistantSkills.overview;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(null);
  const [executed, setExecuted] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const panelId = useId();

  function analyze(value = query) {
    const parsed = interpretAssistant(value, { route, db });
    setQuery(value);
    setAnswer(parsed);
    setExecuted(false);
    setNotice("");
  }

  async function execute(command = answer?.action) {
    if (!command || !onAction || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const outcome = await onAction(command);
      if (outcome === false) {
        setNotice(
          "Tác vụ chưa hoàn tất. Kiểm tra thông báo của ứng dụng trước khi thử lại.",
        );
        return;
      }
      setExecuted(true);
      setNotice(
        command.type === "create-task"
          ? "Đã chuyển yêu cầu thêm vào lịch việc."
          : [
                "create-customer",
                "new-ticket",
                "new-product",
                "new-quote",
                "quote-from-plan",
              ].includes(command.type)
            ? "Đã mở nội dung để bạn kiểm tra và hoàn thiện."
            : command.type === "backup"
              ? "Đã chuyển yêu cầu tải bản sao lưu."
              : "Đã mở tác vụ đã chọn.",
      );
    } catch (error) {
      setNotice(error?.message || "Chưa thực hiện được tác vụ. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText(answer.copyText);
      setNotice("Đã sao chép gợi ý tư vấn.");
    } catch {
      setNotice(
        "Trình duyệt chưa cho sao chép. Có thể chọn đoạn gợi ý để sao chép thủ công.",
      );
    }
  }

  return (
    <section
      className={"agent-workbench " + (open ? "is-open" : "")}
      aria-label={skill.name}
    >
      <button
        className="agent-workbench-toggle"
        aria-label={open ? "Thu gọn trợ lý nghiệp vụ" : "Mở trợ lý nghiệp vụ"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="agent-workbench-icon">
          <MessageSquareText size={18} />
        </span>
        <span>
          <b>Nhờ trợ lý thao tác</b>
          <small>{skill.prompt}</small>
        </span>
        <span className="agent-workbench-open-label">
          {open ? "Thu gọn" : "Thực hiện tác vụ"}
        </span>
        <ChevronDown className="agent-workbench-chevron" size={16} />
      </button>
      {open && (
        <div className="agent-workbench-panel" id={panelId}>
          <div className="agent-workbench-intro">
            <span>
              <ListChecks size={15} />
              {skill.name}
            </span>
            <small>Đọc yêu cầu → kiểm tra thông tin → mở tác vụ.</small>
          </div>
          <div className="agent-workbench-shortcuts" aria-label="Tác vụ gợi ý">
            {skill.examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => analyze(example)}
              >
                <Sparkles size={13} />
                <span>{example}</span>
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
          <form
            className="agent-workbench-form"
            onSubmit={(event) => {
              event.preventDefault();
              analyze();
            }}
          >
            <label htmlFor={panelId + "-request"}>Nhập một yêu cầu ngắn</label>
            <div className="agent-workbench-input-row">
              <input
                id={panelId + "-request"}
                aria-label="Yêu cầu trợ lý nghiệp vụ"
                value={query}
                maxLength={1000}
                placeholder={skill.examples[0]}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setAnswer(null);
                  setExecuted(false);
                  setNotice("");
                }}
              />
              <button
                className="btn btn-primary"
                disabled={!query.trim() || busy}
                aria-label="Phân tích yêu cầu"
              >
                <CornerDownLeft size={17} />
                <span>Đọc yêu cầu</span>
              </button>
            </div>
            <small>
              Tiền nhập gọn: 2.2 = 2,2 triệu; có thể thêm mái 12x8, 3 pha hoặc
              ngày mai.
            </small>
          </form>
          {answer && (
            <section
              className="agent-workbench-answer"
              aria-label="Kết quả trợ lý"
              aria-live="polite"
            >
              <div className="agent-workbench-answer-head">
                <span>
                  <Lightbulb size={17} />
                </span>
                <h3>{answer.title}</h3>
                <button
                  className="icon-btn"
                  aria-label="Xóa kết quả trợ lý"
                  onClick={() => {
                    setAnswer(null);
                    setNotice("");
                    setExecuted(false);
                  }}
                >
                  <X size={15} />
                </button>
              </div>
              <p>{answer.summary}</p>
              {answer.details?.length > 0 && (
                <ul>
                  {answer.details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              )}
              <div className="agent-workbench-result-actions">
                {answer.action && (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!onAction || busy || executed}
                    onClick={() => execute()}
                  >
                    {executed ? <Check size={15} /> : <ArrowRight size={15} />}
                    <span>
                      {executed
                        ? "Đã chuyển yêu cầu"
                        : answer.action.title || "Thực hiện"}
                    </span>
                  </button>
                )}
                {answer.copyText && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={copyAnswer}
                  >
                    <Copy size={15} />
                    Sao chép gợi ý
                  </button>
                )}
              </div>
            </section>
          )}
          {notice && (
            <p className="agent-workbench-notice" role="status">
              <Check size={14} />
              {notice}
            </p>
          )}
          <p className="agent-workbench-scope">
            Trợ lý hỗ trợ các kỹ năng theo từng mục. Hồ sơ, phiếu và báo giá
            được mở để kiểm tra trước khi lưu; chưa tự phát hành hoặc gửi tài
            liệu.
          </p>
        </div>
      )}
    </section>
  );
}
