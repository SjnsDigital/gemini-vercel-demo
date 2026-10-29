import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Download,
  Copy,
  Share2,
  QrCode,
  Image,
  Check,
  Link,
  LoaderCircle,
  ExternalLink,
} from "lucide-react";
import { encodeShare, renderSummaryImage, downloadBlob } from "../lib/share.js";
import "../views/quotes.css";

export default function ShareDialog({
  plan,
  settings = {},
  onClose,
  notify = () => {},
}) {
  const ref = useRef(),
    [days, setDays] = useState(90),
    [url, setUrl] = useState(""),
    [qr, setQr] = useState(""),
    [image, setImage] = useState(""),
    [imageBlob, setImageBlob] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [copied, setCopied] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  useEffect(() => {
    let alive = true,
      preview = "";
    setLoading(true);
    setError("");
    setUrl("");
    setQr("");
    (async () => {
      try {
        const token = await encodeShare(plan, settings, Number(days));
        const value = `${location.origin}${location.pathname}#share=${token}`;
        if (!alive) return;
        setUrl(value);
        try {
          const { default: QRCode } = await import("qrcode");
          const data = await QRCode.toDataURL(value, {
            width: 310,
            margin: 2,
            errorCorrectionLevel: "L",
            color: { dark: "#163538", light: "#ffffff" },
          });
          if (alive) setQr(data);
        } catch (e) {
          if (alive)
            setError(
              "Liên kết quá dài để tạo QR. Bạn vẫn có thể sao chép liên kết hoặc tải ảnh.",
            );
        }
        const blob = await renderSummaryImage(plan, settings);
        preview = URL.createObjectURL(blob);
        if (alive) {
          setImage(preview);
          setImageBlob(blob);
        }
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [plan, settings, days]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      notify("Đã sao chép liên kết xem phương án.");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError(
        "Trình duyệt chưa cho phép clipboard. Hãy chọn và sao chép liên kết bên dưới.",
      );
    }
  }
  async function nativeShare() {
    setBusy(true);
    try {
      const file = imageBlob
        ? new File([imageBlob], "Phuong-an-Kim-Solar.png", {
            type: "image/png",
          })
        : null;
      const data = {
        title: "Phương án điện mặt trời Kim Solar",
        text: "Phương án tham khảo · " + (settings.salesPhone || "0987000783"),
        url,
      };
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ ...data, files: [file] });
      } else if (navigator.share) {
        await navigator.share(data);
      } else await copy();
    } catch (e) {
      if (e.name !== "AbortError")
        setError(
          "Chưa chia sẻ được qua ứng dụng. Bạn có thể tải ảnh và gửi bằng Zalo.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="ks-dialog ks-share-dialog"
      onCancel={onClose}
      aria-labelledby="share-title"
    >
      <header className="ks-modal-head">
        <div>
          <span className="eyebrow">KẾT NỐI VỚI KHÁCH HÀNG</span>
          <h2 id="share-title">Một phương án. Nhiều cách gửi.</h2>
        </div>
        <button
          className="ks-icon-btn"
          onClick={onClose}
          aria-label="Đóng chia sẻ"
        >
          <X size={21} />
        </button>
      </header>
      <div className="ks-share-body">
        <div className="ks-share-preview">
          {image ? (
            <img
              src={image}
              alt="Ảnh tóm tắt phương án điện mặt trời 1080 pixel"
            />
          ) : (
            <div className="ks-share-loading">
              <LoaderCircle className="spin" />
              Đang dựng ảnh xem nhanh…
            </div>
          )}
          <span className="ks-image-label">
            <Image size={14} /> Ảnh tư vấn · rộng 1080 px
          </span>
        </div>
        <div className="ks-share-options">
          <div className="ks-share-caption">
            <span className="badge">
              <Check size={13} /> Chỉ xem, không sửa bản gốc
            </span>
            <h3>Gửi ngay khi đang tư vấn</h3>
            <p>
              Link chứa cấu hình và kết quả phương án. Thông tin riêng của khách
              và ghi chú nội bộ không được đưa vào link.
            </p>
          </div>
          <label className="field">
            <span>Hiệu lực hiển thị</span>
            <select
              className="input"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            >
              <option value={7}>7 ngày</option>
              <option value={30}>30 ngày</option>
              <option value={90}>90 ngày</option>
            </select>
          </label>
          <div className="ks-qr-row">
            {qr ? (
              <img src={qr} alt="QR code mở phương án" />
            ) : (
              <div className="ks-qr-empty">
                <QrCode size={42} />
                {loading ? "Đang tạo QR…" : "Chưa tạo được QR"}
              </div>
            )}
            <div>
              <b>Quét để xem phương án</b>
              <p>Khách xem trên điện thoại, không cần tài khoản.</p>
              {qr && (
                <button
                  className="ks-text-button"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = qr;
                    a.download = "Kim-Solar-QR.png";
                    a.click();
                  }}
                >
                  Tải QR <Download size={13} />
                </button>
              )}
            </div>
          </div>
          <div className="ks-link-box">
            <Link size={16} />
            <input
              readOnly
              value={url}
              aria-label="Liên kết chia sẻ phương án"
              placeholder="Đang tạo liên kết…"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={copy}
              disabled={!url}
              aria-label="Sao chép liên kết"
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}
            </button>
          </div>
          {url.length > 2000 && (
            <p className="ks-small-note">
              Link dài hơn 2.000 ký tự. Nếu ứng dụng nhắn tin cắt link, hãy gửi
              ảnh hoặc QR (nếu tạo được).
            </p>
          )}
          <div className="ks-share-actions">
            <button
              className="btn btn-primary"
              disabled={loading || busy || !url}
              onClick={nativeShare}
            >
              <Share2 size={16} />
              {busy ? "Đang mở chia sẻ…" : "Chia sẻ qua ứng dụng"}
            </button>
            <button
              className="btn btn-secondary"
              disabled={!imageBlob}
              onClick={() =>
                downloadBlob(imageBlob, "Phuong-an-Kim-Solar-1080.png")
              }
            >
              <Download size={16} />
              Tải ảnh 1080px
            </button>
          </div>
          {url && (
            <a
              className="ks-text-button"
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              Mở thử bản dành cho khách <ExternalLink size={13} />
            </a>
          )}
          {error && (
            <div className="warning" role="alert">
              {error}
            </div>
          )}
          <p className="ks-small-note">
            Liên kết tự chứa có thời hạn hiển thị, không có máy chủ để thu hồi
            hoặc theo dõi lượt xem. Dữ liệu có thể được sao chép; đây không phải
            tài liệu đã xác thực chữ ký.
          </p>
        </div>
      </div>
    </dialog>
  );
}
