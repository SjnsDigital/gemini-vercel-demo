import React, { useId, useState } from "react";
import { ChevronDown, Lightbulb, Pause, Play } from "lucide-react";
import "./page-agent.css";

const guides = {
  overview: {
    name: "Điều phối ngày mới",
    short: "Một điểm chạm, bắt nhịp mọi cơ hội.",
    detail:
      "Bắt đầu từ việc cần làm hôm nay. Chọn thẻ khách hàng, phương án hoặc báo giá để mở ngay dữ liệu đang có trên máy.",
    symbol: "overview",
    accent: "blue",
  },
  calculator: {
    name: "Trợ lý phương án",
    short: "Từ hóa đơn điện đến cấu hình phù hợp.",
    detail:
      "Nhập nhu cầu điện, kiểm tra diện tích mái và thiết bị. Lưu phương án trước khi tạo báo giá để có bản cấu hình đối chiếu khi tư vấn.",
    symbol: "calculator",
    accent: "orange",
  },
  lookup: {
    name: "Chuyên viên tra cứu",
    short: "Tìm mức tham khảo, mở rộng đúng lúc.",
    detail:
      "Chọn khoảng tiền điện để xem gợi ý ban đầu. Chuyển sang tính chi tiết khi có thông tin về mái, vùng nắng và nhu cầu lưu trữ của khách.",
    symbol: "lookup",
    accent: "blue",
  },
  plans: {
    name: "Quản lý phương án",
    short: "Giữ cấu hình rõ ràng, tư vấn liền mạch.",
    detail:
      "Đặt tên gắn với nhu cầu khách để dễ tìm lại. Phương án đã lưu giữ kết quả tại thời điểm tính; hãy mở tính lại khi giá hoặc nhu cầu thay đổi.",
    symbol: "plans",
    accent: "blue",
  },
  quotes: {
    name: "Chuyên viên báo giá",
    short: "Rõ từng hạng mục, chỉn chu từng lần gửi.",
    detail:
      "Kiểm tra khách hàng, thiết bị, đơn giá, thuế và điều khoản trước khi xuất PDF. Lưu phiên bản mới khi điều chỉnh để giữ lịch sử trao đổi.",
    symbol: "quotes",
    accent: "orange",
  },
  customers: {
    name: "Kết nối khách hàng",
    short: "Nhớ nhu cầu, tiếp nối đúng câu chuyện.",
    detail:
      "Lưu số điện thoại, nhu cầu và nhật ký trao đổi trong cùng hồ sơ. Bổ sung kết quả khảo sát để lần tư vấn tiếp theo có đủ thông tin.",
    symbol: "customers",
    accent: "blue",
  },
  care: {
    name: "Đồng hành dịch vụ",
    short: "Theo sát yêu cầu, chăm sóc kịp thời.",
    detail:
      "Ghi rõ thiết bị, hiện tượng và mức ưu tiên. Cập nhật trạng thái sau mỗi lần xử lý để đồng nghiệp biết yêu cầu nào còn cần theo dõi.",
    symbol: "care",
    accent: "orange",
  },
  catalog: {
    name: "Chuyên viên thiết bị",
    short: "Đúng thông số, đúng giá, dễ lựa chọn.",
    detail:
      "Lọc theo loại thiết bị và tìm bằng tên model. Xác nhận nguồn giá cùng thông số kỹ thuật trước khi dùng sản phẩm trong báo giá chính thức.",
    symbol: "catalog",
    accent: "blue",
  },
  knowledge: {
    name: "Bạn đồng hành tư vấn",
    short: "Giải thích dễ hiểu, trao đổi tự tin.",
    detail:
      "Chọn chủ đề phù hợp với câu hỏi của khách. Đối chiếu khuyến nghị với điều kiện khảo sát và tài liệu của thiết bị trước khi cam kết.",
    symbol: "knowledge",
    accent: "orange",
  },
  settings: {
    name: "Quản gia dữ liệu",
    short: "Giữ thông tin nhất quán, sao lưu chủ động.",
    detail:
      "Kiểm tra thông tin công ty trước khi xuất tài liệu. Tải bản sao lưu định kỳ; xem trước nội dung file trước khi khôi phục dữ liệu.",
    symbol: "settings",
    accent: "blue",
  },
};

function SolarPanel({ x = 145, y = 42, width = 58, height = 44 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={width}
        height={height}
        rx="5"
        fill="#164d7d"
        stroke="#fff"
        strokeWidth="3"
      />
      {[1, 2, 3].map((v) => (
        <path
          key={v}
          d={`M${(width * v) / 4} 3v${height - 6}`}
          stroke="#8dc5f3"
          strokeWidth="1"
        />
      ))}
      {[1, 2].map((v) => (
        <path
          key={v}
          d={`M3 ${(height * v) / 3}h${width - 6}`}
          stroke="#8dc5f3"
          strokeWidth="1"
        />
      ))}
      <path
        d={`M${width * 0.3} ${height + 8}h${width * 0.4}M${width * 0.5} ${height}v8`}
        stroke="#5b87ab"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  );
}

function Document({ quote = false }) {
  return (
    <g transform="translate(148 30) rotate(7 28 36)">
      <rect x="-5" y="5" width="54" height="72" rx="7" fill="#d2e5f7" />
      <path
        d="M6 0h29l16 16v50a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6V6a6 6 0 0 1 6-6Z"
        fill="#fff"
        stroke="#659ac4"
        strokeWidth="2"
      />
      <path
        d="M35 0v13a3 3 0 0 0 3 3h13"
        fill="#e7f2fc"
        stroke="#659ac4"
        strokeWidth="2"
      />
      <path
        d="M11 27h22M11 36h29M11 45h16"
        stroke="#8bb1d2"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {quote ? (
        <>
          <path
            d="M11 56h13"
            stroke="#f39735"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle
            cx="43"
            cy="62"
            r="13"
            fill="#f3932d"
            stroke="#fff"
            strokeWidth="3"
          />
          <path
            d="m37 62 4 4 8-8"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <path
          d="m31 56 5 5 10-11"
          fill="none"
          stroke="#f3932d"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

function RouteSymbol({ route }) {
  switch (route) {
    case "calculator":
      return (
        <g transform="translate(148 31) rotate(8 26 38)">
          <rect
            width="54"
            height="73"
            rx="9"
            fill="#fff"
            stroke="#6399c6"
            strokeWidth="2"
          />
          <rect x="8" y="9" width="38" height="18" rx="4" fill="#dceefa" />
          <path
            d="M27 15h13M32 21h8"
            stroke="#3573a4"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={8 + col * 14}
                y={35 + row * 11}
                width="9"
                height="7"
                rx="2"
                fill={col === 2 ? "#f5a34e" : "#abcde7"}
              />
            )),
          )}
        </g>
      );
    case "lookup":
      return (
        <g>
          <SolarPanel x={143} y={34} width={57} height={48} />
          <g className="page-agent-scan">
            <circle
              cx="177"
              cy="77"
              r="20"
              fill="#fff"
              fillOpacity=".88"
              stroke="#1670b8"
              strokeWidth="5"
            />
            <path
              d="m192 92 14 14"
              stroke="#f3912b"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M165 77h24M177 65v24"
              stroke="#84b9dc"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        </g>
      );
    case "plans":
      return (
        <g transform="translate(140 37)">
          <rect
            x="9"
            y="-7"
            width="54"
            height="60"
            rx="6"
            fill="#fff"
            stroke="#88b1d1"
            strokeWidth="2"
          />
          <path
            d="M20 7h29M20 16h23"
            stroke="#bdd5e9"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M0 19a6 6 0 0 1 6-6h17l8 8h33a6 6 0 0 1 6 6v33a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6Z"
            fill="#f5a142"
            stroke="#e88a26"
            strokeWidth="2"
          />
          <path
            d="M9 32h52a5 5 0 0 1 5 6l-5 25H4L0 38a5 5 0 0 1 5-6Z"
            fill="#ffbd69"
          />
          <path
            d="M25 46h17"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      );
    case "quotes":
      return <Document quote />;
    case "customers":
      return (
        <g transform="translate(137 31)">
          <rect
            x="4"
            y="0"
            width="69"
            height="72"
            rx="11"
            fill="#fff"
            stroke="#82acd0"
            strokeWidth="2"
          />
          <rect x="13" y="10" width="51" height="31" rx="7" fill="#eaf4ff" />
          <circle cx="38" cy="21" r="7" fill="#448bc0" />
          <path d="M25 38a13 13 0 0 1 26 0" fill="#75add5" />
          <path
            d="M18 51h40M18 59h24"
            stroke="#c0d8ea"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx="7"
            cy="58"
            r="16"
            fill="#f9a243"
            stroke="#fff"
            strokeWidth="3"
          />
          <path
            d="M1 58h12M7 52v12"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      );
    case "care":
      return (
        <g transform="translate(143 31)">
          <circle
            cx="32"
            cy="34"
            r="31"
            fill="#fff"
            stroke="#d9eafa"
            strokeWidth="2"
          />
          <path
            d="M9 35V25a23 23 0 0 1 46 0v10"
            fill="none"
            stroke="#1b6bad"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <rect x="1" y="27" width="12" height="23" rx="6" fill="#4d99cf" />
          <rect x="51" y="27" width="12" height="23" rx="6" fill="#4d99cf" />
          <path
            d="M56 49v7a9 9 0 0 1-9 9H35"
            fill="none"
            stroke="#1b6bad"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <rect x="29" y="61" width="13" height="7" rx="3.5" fill="#1b6bad" />
          <path
            className="page-agent-heart"
            d="M32 49 19 37c-9-9 3-19 13-9 10-10 22 0 13 9Z"
            fill="#f59b3e"
          />
        </g>
      );
    case "catalog":
      return (
        <g>
          <SolarPanel x={138} y={30} width={62} height={48} />
          <g transform="translate(173 62)">
            <rect
              x="-4"
              y="0"
              width="35"
              height="48"
              rx="7"
              fill="#fff"
              stroke="#76a4c8"
              strokeWidth="2"
            />
            <rect x="6" y="-4" width="15" height="5" rx="2" fill="#76a4c8" />
            <rect x="3" y="29" width="21" height="11" rx="3" fill="#f8b669" />
            <path d="m15 9-8 12h8l-4 9 11-14h-8Z" fill="#f3932d" />
          </g>
        </g>
      );
    case "knowledge":
      return (
        <g transform="translate(137 37)">
          <path
            d="M35 4C24-2 12-3 0 1v53c13-4 25-2 35 4 10-6 22-8 35-4V1C57-3 45-2 35 4Z"
            fill="#fff"
            stroke="#79a6c9"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M35 5v53" stroke="#a9c7df" strokeWidth="2" />
          <path
            d="M8 15h18M8 24h18M8 33h13M44 15h18M44 24h18M44 33h13"
            stroke="#bad3e7"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M49-8h10V17l-5-4-5 4Z" fill="#f5a244" />
          <path
            d="M-2 61c13-3 25 0 37 5 12-5 24-8 37-5"
            fill="none"
            stroke="#4b87b5"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      );
    case "settings":
      return (
        <g transform="translate(173 65)">
          <g className="page-agent-gear">
            <path
              d="m-8-33 16 0 3 9 6 3 9-2 8 14-6 7v7l6 7-8 14-9-2-6 3-3 9H-8l-3-9-6-3-9 2-8-14 6-7v-7l-6-7 8-14 9 2 6-3Z"
              fill="#e1effb"
              stroke="#6f9fc5"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle r="13" fill="#fff" stroke="#4182b4" strokeWidth="3" />
          </g>
          <circle
            cx="24"
            cy="26"
            r="15"
            fill="#f8a243"
            stroke="#fff"
            strokeWidth="3"
          />
          <path
            d="m18 26 4 4 8-9"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    default:
      return (
        <g>
          <SolarPanel x={142} y={39} width={66} height={47} />
          <circle cx="193" cy="28" r="13" fill="#ffb85b" />
          <g stroke="#f3a347" strokeWidth="2" strokeLinecap="round">
            <path d="M193 8V4M193 52v-4M213 28h4M169 28h4M207 14l3-3M176 45l3-3" />
          </g>
          <path
            d="m151 103 11-9 12 5 17-14"
            fill="none"
            stroke="#4084b9"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M183 85h9v9"
            fill="none"
            stroke="#4084b9"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
  }
}

function AgentArtwork({ route }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className="page-agent-art"
      viewBox="0 0 240 132"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#d7eafb" />
        </linearGradient>
        <linearGradient id={`${id}-visor`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#276d9f" />
          <stop offset="1" stopColor="#163f68" />
        </linearGradient>
      </defs>
      <ellipse cx="119" cy="119" rx="89" ry="7" fill="#194d7d" opacity=".07" />
      <circle cx="116" cy="65" r="60" fill="#e3f0fc" opacity=".7" />
      <path
        d="M33 76C10 16 133-5 204 23"
        fill="none"
        stroke="#9bc5e6"
        strokeWidth="1"
        strokeDasharray="3 6"
        opacity=".65"
      />
      <g className="page-agent-spark" fill="#f5a24b">
        <path d="m128 22 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
        <circle cx="27" cy="46" r="3" />
        <circle cx="218" cy="94" r="2.5" />
      </g>
      <g className="page-agent-companion">
        <path
          d="m48 99-6 13M98 99l6 13"
          stroke="#8cb2d0"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M40 115h13M99 115h12"
          stroke="#336e9b"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M38 76c-11 2-15 8-12 17M110 76l13-8"
          stroke="#83b0d3"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="26" cy="94" r="5" fill="#f6aa50" />
        <circle cx="126" cy="66" r="5" fill="#f6aa50" />
        <rect
          x="38"
          y="54"
          width="72"
          height="48"
          rx="19"
          fill={`url(#${id}-body)`}
          stroke="#77a7cb"
          strokeWidth="1.6"
        />
        <path
          d="M74 54V40"
          stroke="#6b9ec5"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          cx="74"
          cy="34"
          r="8"
          fill="#ffbc68"
          stroke="#fff"
          strokeWidth="3"
        />
        <rect
          x="47"
          y="63"
          width="54"
          height="24"
          rx="11"
          fill={`url(#${id}-visor)`}
        />
        <path
          d="M57 69v12M65 69v12M73 69v12M81 69v12M89 69v12M54 75h40"
          stroke="#8bc8e9"
          strokeWidth=".7"
          opacity=".8"
        />
        <path
          className="page-agent-visorglow"
          d="M59 70h28"
          stroke="#d5f2ff"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="65" y="92" width="18" height="4" rx="2" fill="#f2a048" />
      </g>
      <g className="page-agent-tool">
        <RouteSymbol route={route} />
      </g>
    </svg>
  );
}

export default function PageAgent({ route = "overview" }) {
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused] = useState(false);
  const guide = guides[route] || guides.overview;
  const detailsId = useId();
  return (
    <section
      className={`page-agent page-agent-${guide.accent}${paused ? " is-paused" : ""}`}
      aria-label={`Gợi ý thao tác: ${guide.name}`}
    >
      <div className="page-agent-picture">
        <AgentArtwork route={guide.symbol} />
      </div>
      <div className="page-agent-copy">
        <span className="page-agent-label">
          <span />
          {guide.name}
        </span>
        <p>{guide.short}</p>
        <div id={detailsId} className="page-agent-detail" hidden={!expanded}>
          {guide.detail}
        </div>
      </div>
      <div className="page-agent-controls">
        <button
          type="button"
          className="page-agent-tip"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((value) => !value)}
        >
          <Lightbulb size={16} />
          <span>{expanded ? "Thu gọn" : "Mẹo sử dụng"}</span>
          <ChevronDown size={14} />
        </button>
        <button
          type="button"
          className="page-agent-motion"
          aria-label={
            paused
              ? "Bật chuyển động biểu tượng"
              : "Tạm dừng chuyển động biểu tượng"
          }
          aria-pressed={paused}
          title={paused ? "Bật chuyển động" : "Tạm dừng chuyển động"}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
      </div>
    </section>
  );
}
