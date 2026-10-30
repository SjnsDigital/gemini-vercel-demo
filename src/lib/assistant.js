import { parseMoney, formatVnd } from "./money.js";
import { localDay, searchText, taskRows } from "./workflow.js";

export const assistantSkills = {
  overview: {
    name: "Điều phối công việc",
    prompt: "Ưu tiên việc đến hạn, nối tiếp đúng hồ sơ.",
    examples: [
      "Việc nào cần làm trước?",
      "Nhắc gọi khách ngày mai",
      "Sao lưu ngay",
    ],
  },
  calculator: {
    name: "Chuyên viên phương án",
    prompt: "Đọc nhu cầu, điền thông số và mở kết quả tính.",
    examples: [
      "Tính hóa đơn 2.2tr mái 12x8 1 pha",
      "Tính 3tr hòa lưới",
      "Kiểm tra giá thiết bị",
    ],
  },
  lookup: {
    name: "Chuyên viên tra nhanh",
    prompt: "Gõ mức tiền điện hoặc tên thiết bị để đi thẳng tới dữ liệu.",
    examples: ["Tra 2.2", "Tìm pin lưu trữ", "Tìm Deye"],
  },
  plans: {
    name: "Chuyên viên phương án đã lưu",
    prompt: "Đối chiếu bản lưu trước khi lập đề xuất tiếp theo.",
    examples: [
      "Tóm tắt phương án mới nhất",
      "So sánh phương án",
      "Báo giá từ phương án mới nhất",
    ],
  },
  quotes: {
    name: "Chuyên viên báo giá",
    prompt: "Chuẩn bị đề xuất, rà soát thông tin trước khi gửi.",
    examples: [
      "Tạo báo giá mới",
      "Báo giá từ phương án mới nhất",
      "Báo giá nào còn nháp?",
      "Rà soát báo giá",
    ],
  },
  customers: {
    name: "Chuyên viên khách hàng",
    prompt: "Dán thông tin để điền hồ sơ; tìm đúng khách để tiếp tục tư vấn.",
    examples: [
      "Khách cần liên hệ",
      "Thêm Anh Nam 0901234567 tiền điện 2.2tr",
      "Tìm khách Nam",
    ],
  },
  care: {
    name: "Chuyên viên chăm sóc",
    prompt: "Xử lý yêu cầu quá hạn và ưu tiên cao trước.",
    examples: ["Phiếu quá hạn", "Phiếu ưu tiên cao", "Tạo yêu cầu bảo trì"],
  },
  catalog: {
    name: "Chuyên viên thiết bị",
    prompt: "Tra model, kiểm tra giá và thông tin còn thiếu.",
    examples: ["Tìm Deye", "Thiết bị thiếu giá", "Thiết bị chưa xác minh"],
  },
  knowledge: {
    name: "Chuyên viên tư vấn",
    prompt: "Chọn cách giải thích ngắn, có căn cứ để trao đổi với khách.",
    examples: [
      "Giải thích hoàn vốn",
      "Tư vấn dùng điện ban đêm",
      "Tư vấn bảo hành",
    ],
  },
  settings: {
    name: "Chuyên viên dữ liệu",
    prompt: "Giữ thông tin thống nhất và chủ động một bản sao.",
    examples: ["Sao lưu ngay", "Kiểm tra dữ liệu", "Mở thông tin công ty"],
  },
};

const result = (title, summary, details = [], action = null) => ({
  title,
  summary,
  details,
  action,
});
const action = (type, title, extras = {}) => ({ type, title, ...extras });
const nav = (route, title, payload) =>
  action("navigate", title, { route, ...(payload ? { payload } : {}) });
const closedTicket = (ticket) =>
  ["Đã đóng", "Đã giải quyết"].includes(ticket.status);
const shortDate = (value) =>
  value ? value.split("-").reverse().join("/") : "Chưa có ngày";
const formatNumber = (value) =>
  Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 });

function moneyToken(text) {
  const normalized = searchText(text);
  const token =
    "([0-9]+(?:[.,][0-9]+)*(?:\\s*(?:trieu|tr|ty|ti|nghin|ngan|k|m|vnd|d)\\s*[0-9]*)?)";
  const labeled = normalized.match(
    new RegExp(
      "(?:hoa don(?: dien)?|tien dien|ngan sach|tinh|tra)\\s*(?:khoang\\s*)?" +
        token,
    ),
  );
  if (labeled) return labeled[1];
  if (new RegExp("^" + token + "$").test(normalized)) return normalized;
  return null;
}

function parseCalculation(text, route) {
  const normalized = searchText(text),
    token = moneyToken(text);
  if (!token) return null;
  const amount = parseMoney(token, { max: 1e9 });
  if (!amount.valid || !amount.value)
    return result(
      "Chưa đọc được mức tiền điện",
      "Nhập một số tiền lớn hơn 0, ví dụ 2.2, 2tr2 hoặc 2.200.000đ.",
    );
  const input = { inputMode: "bill", monthlyBill: amount.value };
  const roof = normalized.match(
    /(?:mai\s*)?(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/,
  );
  if (roof) {
    const length = Number(roof[1].replace(",", ".")),
      width = Number(roof[2].replace(",", "."));
    if (!(length > 0 && width > 0 && length <= 500 && width <= 500))
      return result(
        "Kích thước mái chưa hợp lệ",
        "Chiều dài và chiều rộng mái cần lớn hơn 0, tối đa 500 m mỗi chiều.",
      );
    input.roofLength = length;
    input.roofWidth = width;
  }
  const phase = normalized.match(/([13])\s*pha/);
  if (phase) input.phase = Number(phase[1]);
  if (/hoa luoi/.test(normalized)) input.mode = "grid_tied";
  if (/hybrid|co (?:pin|luu tru)|luu tru/.test(normalized))
    input.mode = "hybrid";
  const daytime = normalized.match(
    /(?:ban ngay|tai ngay)\s*(\d+(?:[.,]\d+)?)\s*%/,
  );
  if (daytime) {
    const ratio = Number(daytime[1].replace(",", "."));
    if (ratio < 0 || ratio > 100)
      return result(
        "Tỷ lệ ngày chưa hợp lệ",
        "Tỷ lệ điện dùng ban ngày cần từ 0 đến 100%.",
      );
    input.dayRatio = ratio / 100;
  }
  const details = ["Tiền điện: " + formatVnd(amount.value) + "/tháng"];
  if (roof)
    details.push(
      `Mái: ${formatNumber(input.roofLength)} × ${formatNumber(input.roofWidth)} m`,
    );
  if (input.phase) details.push(`Nguồn điện: ${input.phase} pha`);
  if (input.mode)
    details.push(input.mode === "hybrid" ? "Hệ có lưu trữ" : "Hệ hòa lưới");
  if (input.dayRatio != null)
    details.push(`Dùng ban ngày: ${formatNumber(input.dayRatio * 100)}%`);
  details.push(
    "Thông số chưa nêu tiếp tục dùng mặc định của máy tính; cần kiểm tra trước khi báo khách.",
  );
  return result(
    route === "lookup" ? "Đã đọc mức tra nhanh" : "Đã chuẩn bị thông số",
    "Mở máy tính với nhu cầu đã đọc, rồi kiểm tra mái và thiết bị.",
    details,
    action("calculate", "Mở kết quả tính", { input }),
  );
}

function reminderDate(text, today) {
  const normalized = searchText(text);
  const iso = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const slash = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (iso || slash) {
    const date = iso
      ? iso[1]
      : `${slash[3] || today.slice(0, 4)}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
    const parsed = new Date(date + "T12:00:00+07:00");
    return !Number.isNaN(parsed.getTime()) && localDay(parsed) === date
      ? date
      : null;
  }
  const shift = /ngay kia/.test(normalized)
    ? 2
    : /ngay mai/.test(normalized)
      ? 1
      : 0;
  const date = new Date(today + "T12:00:00+07:00");
  date.setUTCDate(date.getUTCDate() + shift);
  return localDay(date);
}

function parseReminder(text, today) {
  const date = reminderDate(text, today);
  if (!date)
    return result(
      "Ngày hẹn chưa hợp lệ",
      "Dùng hôm nay, ngày mai hoặc ngày dạng 25/12/2026.",
    );
  const title = text
    .replace(
      /^(?:nhắc(?: việc)?|nhac(?: viec)?|lên lịch|len lich|thêm việc|them viec|hẹn|hen)\s*[:,-]?\s*/i,
      "",
    )
    .replace(
      /(?:hôm nay|hom nay|ngày mai|ngay mai|ngày kia|ngay kia|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b)/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
  if (!title || title.length > 200)
    return result(
      "Cần thêm nội dung công việc",
      "Ví dụ: Nhắc gọi khách Nam ngày mai.",
    );
  return result(
    "Đã soạn việc cần làm",
    "Kiểm tra nội dung và ngày hẹn trước khi thêm.",
    [title, "Ngày thực hiện: " + shortDate(date)],
    action("create-task", "Thêm vào lịch việc", { task: { title, date } }),
  );
}

function parseCustomer(text) {
  const phoneMatch = text.match(/(?:\+84|0084|0)[\d\s().-]{8,20}\d/);
  if (!phoneMatch)
    return result(
      "Cần số điện thoại để điền hồ sơ",
      "Dán dạng: Thêm Anh Nam 0901234567 tiền điện 2.2tr.",
    );
  const phone = phoneMatch[0]
    .trim()
    .replace(/[\s().-]/g, "")
    .replace(/^0084/, "+84");
  if (!/^\+?\d{8,15}$/.test(phone))
    return result(
      "Chưa đọc được số điện thoại",
      "Tách số điện thoại khỏi địa chỉ và tiền điện để điền chính xác hơn.",
    );
  const name = text
    .slice(0, phoneMatch.index)
    .replace(
      /^(?:thêm(?: khách(?: hàng)?)?|them(?: khach(?: hang)?)?|tạo khách(?: hàng)?|tao khach(?: hang)?|khách(?: hàng)?|khach(?: hang)?)\s*[:,-]?\s*/i,
      "",
    )
    .trim()
    .replace(/[,;:-]+$/, "")
    .trim();
  if (!name)
    return result(
      "Cần thêm tên khách hàng",
      "Đặt tên trước số điện thoại, ví dụ: Anh Nam 0901234567.",
    );
  const address =
    text
      .match(
        /(?:địa chỉ|dia chi)\s*[:=-]?\s*(.+?)(?:(?:tiền điện|tien dien|hóa đơn|hoa don)\b|$)/i,
      )?.[1]
      ?.trim()
      .replace(/[,;]+$/, "") || "";
  const customer = { name, phone, address };
  const token = moneyToken(text);
  if (token) {
    const amount = parseMoney(token, { max: 1e9 });
    if (!amount.valid)
      return result(
        "Mức tiền điện chưa rõ",
        "Dùng 2.2, 2tr2 hoặc số tiền đầy đủ để điền chính xác.",
      );
    customer.monthlyBill = amount.value;
  }
  return result(
    "Đã tách thông tin khách",
    "Mở hồ sơ đã điền sẵn để kiểm tra và lưu. Chưa tạo dữ liệu ở bước này.",
    [
      name,
      "Điện thoại: " + phone,
      ...(address ? ["Địa chỉ: " + address] : []),
      ...(customer.monthlyBill != null
        ? ["Tiền điện: " + formatVnd(customer.monthlyBill) + "/tháng"]
        : []),
    ],
    action("create-customer", "Điền hồ sơ khách", { customer }),
  );
}

function catalogAudit(db, unverified = false) {
  const products = (db.products || []).filter(
    (product) => product.active !== false,
  );
  const rows = products.filter((product) =>
    unverified ? !product.verified : !(Number(product.price) > 0),
  );
  return result(
    unverified ? "Thiết bị cần xác minh" : "Thiết bị đang thiếu giá",
    `${rows.length}/${products.length} thiết bị đang dùng ${unverified ? "chưa được xác minh" : "chưa có giá bán lớn hơn 0"}.`,
    rows
      .slice(0, 6)
      .map((product) =>
        `${product.brand || ""} ${product.model || "(chưa có model)"}`.trim(),
      ),
    action("filter", "Mở danh mục cần kiểm tra", {
      route: "catalog",
      filter: unverified ? "unverified" : "all",
      ...(unverified ? {} : { query: "", onlyMissingPrice: true }),
    }),
  );
}

function workspaceAudit(db, today) {
  const pending = taskRows(db, "due", today);
  const overdue = (db.tickets || []).filter(
    (ticket) =>
      !closedTicket(ticket) && ticket.dueDate && ticket.dueDate < today,
  );
  const products = (db.products || []).filter(
    (product) => product.active !== false,
  );
  const missing = products.filter((product) => !(Number(product.price) > 0));
  const drafts = (db.quotes || []).filter((quote) => quote.status === "draft");
  const details = [
    `${pending.length} lịch việc/liên hệ đến hạn`,
    `${overdue.length} phiếu CSKH quá hạn`,
    `${missing.length} thiết bị đang dùng thiếu giá`,
    `${drafts.length} báo giá nháp`,
  ];
  const next = overdue.length
    ? action("filter", "Xử lý phiếu quá hạn", {
        route: "care",
        filter: "Quá hạn",
      })
    : pending.length
      ? nav("overview", "Mở lịch việc đến hạn", { taskFocus: true })
      : missing.length
        ? action("filter", "Kiểm tra giá còn thiếu", {
            route: "catalog",
            filter: "all",
            onlyMissingPrice: true,
          })
        : drafts.length
          ? action("filter", "Tiếp tục báo giá nháp", {
              route: "quotes",
              filter: "draft",
            })
          : nav("calculator", "Bắt đầu phương án mới");
  return result(
    "Ưu tiên việc tiếp theo",
    overdue.length
      ? "Nên xử lý yêu cầu dịch vụ quá hạn trước, rồi liên hệ khách và hoàn thiện báo giá."
      : pending.length
        ? "Bắt đầu từ lịch việc/liên hệ đến hạn, rồi kiểm tra thông tin trước khi báo giá."
        : missing.length
          ? "Chưa có việc đến hạn. Bổ sung giá còn thiếu để lập báo giá rõ ràng hơn."
          : "Chưa có việc đến hạn. Có thể tiếp tục bản nháp hoặc tạo phương án mới.",
    details,
    next,
  );
}

const knowledge = [
  {
    match: /hoan von|thu hoi von/,
    query: "hoàn vốn",
    title: "Giải thích hoàn vốn dễ hiểu",
    body: "Hoàn vốn đơn giản = tổng đầu tư ÷ số tiền tiết kiệm dự kiến mỗi năm. Kết quả phụ thuộc nắng, tỷ lệ dùng điện, biểu giá và chi phí. Hãy cho khách xem các giả định; chưa cam kết một mốc cố định khi chưa khảo sát.",
  },
  {
    match: /ban dem|dien dem|luu tru|pin/,
    query: "ban đêm",
    title: "Tư vấn nhu cầu dùng điện ban đêm",
    body: "Hòa lưới ưu tiên dùng điện lúc có nắng. Hybrid có pin chuyển một phần điện dư sang ban đêm, còn phụ thuộc điện nạp, dung lượng hữu dụng và công suất xả. Cần xem hóa đơn, tải ngày/đêm và tải dự phòng trước khi chọn.",
  },
  {
    match: /bao hanh|bao tri/,
    query: "bảo hành",
    title: "Trao đổi về bảo hành",
    body: "Ghi rõ model, serial, ngày nghiệm thu và đầu mối bảo hành. Tách bảo hành sản phẩm, hiệu suất và thi công theo chính sách từng thiết bị. Chưa có thông tin xác minh thì cần đối chiếu tài liệu trước khi cam kết.",
  },
  {
    match: /mai|tham dot|ket cau/,
    query: "mái",
    title: "Tư vấn khảo sát mái",
    body: "Ghi nhận loại mái, kích thước, xà gồ, vị trí vít, lối đi và hiện trạng thấm dột. Chuyển kỹ thuật kiểm tra kết cấu và biện pháp chống thấm trước khi chốt thi công.",
  },
  {
    match: /dien du|ban dien/,
    query: "điện dư",
    title: "Trao đổi về điện dư",
    body: "Phương án mặc định không tính doanh thu bán điện dư. Chỉ đưa khoản này vào sau khi xác nhận cơ chế, điều kiện đấu nối và giá mua áp dụng cho đúng công trình.",
  },
  {
    match: /kwp|kwh|phan biet kw/,
    query: "kWh",
    title: "Phân biệt kW, kWp và kWh",
    body: "kWp là công suất danh định của dàn pin, kW là công suất tức thời hoặc giới hạn thiết bị, kWh là điện năng hoặc dung lượng lưu trữ. Dung lượng pin kWh không thay thế kiểm tra công suất xả kW.",
  },
];

export function interpretAssistant(
  text,
  { route = "overview", db = {}, now = new Date() } = {},
) {
  const raw = String(text || "").trim(),
    normalized = searchText(raw),
    today = localDay(now);
  if (!normalized)
    return result(
      "Bạn muốn làm gì tiếp?",
      "Chọn một tác vụ gợi ý hoặc nhập yêu cầu ngắn.",
    );
  if (raw.length > 1000)
    return result(
      "Yêu cầu hơi dài",
      "Giữ một tác vụ mỗi lần, tối đa 1.000 ký tự để đọc thông tin rõ hơn.",
    );
  if (/^(?:nhac|len lich|them viec|hen)\b/.test(normalized))
    return parseReminder(raw, today);
  if (/sao luu|backup/.test(normalized))
    return result(
      "Chủ động giữ một bản sao",
      "Tải file sao lưu đầy đủ dữ liệu hiện tại trên trình duyệt này.",
      [],
      action("backup", "Tải bản sao lưu"),
    );
  if (
    /kiem tra du lieu|viec nao|lam gi truoc|uu tien|hom nay can|dieu phoi/.test(
      normalized,
    ) &&
    !/phieu|cskh|yeu cau/.test(normalized)
  )
    return workspaceAudit(db, today);
  if (/thieu gia|kiem tra gia/.test(normalized)) return catalogAudit(db);
  if (/chua xac minh|can xac minh/.test(normalized))
    return catalogAudit(db, true);
  if (/so sanh/.test(normalized) && /phuong an|ban luu/.test(normalized))
    return result(
      "Đối chiếu trước khi đề xuất",
      `${(db.plans || []).length} phương án đang có. Chọn 2–3 bản lưu trong bảng so sánh.`,
      [
        "So sánh theo bản chụp; cần thống nhất nhu cầu và giả định nắng khi đánh giá.",
      ],
      nav("plans", "Mở bảng so sánh", { compare: true }),
    );
  if (
    /bao gia/.test(normalized) &&
    /phuong an|moi nhat|gan nhat/.test(normalized)
  ) {
    const plan = db.plans?.[0];
    if (!plan)
      return result(
        "Cần một phương án trước",
        "Chưa có bản lưu để lập báo giá. Tính và lưu cấu hình, rồi tiếp tục từ bản đó.",
        [],
        nav("calculator", "Tạo phương án"),
      );
    return result(
      "Chuẩn bị báo giá từ bản lưu",
      plan.name || "Phương án mới nhất",
      [
        "Giữ cấu hình đã lưu để đối chiếu. Kiểm tra lại giá và thông tin khách trước khi phát hành.",
      ],
      action("quote-from-plan", "Soạn báo giá", { planId: plan.id }),
    );
  }
  if (/bao gia/.test(normalized) && /kiem tra|ra soat/.test(normalized)) {
    const quote =
      (db.quotes || []).find((item) => item.status === "draft") ||
      db.quotes?.[0];
    if (!quote)
      return result(
        "Chưa có báo giá để rà soát",
        "Lập bản nháp từ phương án đã tính hoặc mở một báo giá mới.",
        [],
        action("new-quote", "Mở báo giá mới"),
      );
    const rows = Array.isArray(quote.rows) ? quote.rows : [];
    const missingPrices = rows.filter((row) => !(Number(row.price) > 0));
    const unverified = rows.filter((row) => !row.verified);
    const details = [
      `Bản kiểm tra: ${quote.number || "Chưa đánh số"}`,
      quote.customer?.name?.trim() && quote.customer?.phone?.trim()
        ? "Đã có tên và số điện thoại khách"
        : "Cần bổ sung tên hoặc số điện thoại khách",
      `${rows.length} hạng mục; ${missingPrices.length} hạng mục thiếu giá, ${unverified.length} hạng mục chưa xác minh`,
      quote.validUntil && quote.validUntil >= today
        ? `Hiệu lực đến ${shortDate(quote.validUntil)}`
        : "Hiệu lực chưa có hoặc đã hết hạn",
      quote.plan
        ? quote.plan.input?.surveyConfirmed === true
          ? "Có xác nhận khảo sát trong phương án"
          : "Phương án chưa xác nhận khảo sát"
        : "Bản nháp chưa gắn phương án tính toán",
      "Mở báo giá để xử lý danh sách kiểm tra và xem trước trước khi phát hành.",
    ];
    return result(
      "Rà soát báo giá đã lưu",
      "Kiểm tra nhanh các thông tin chính; điều kiện phát hành vẫn được kiểm tra tại màn báo giá.",
      details,
      nav("quotes", "Mở báo giá để kiểm tra"),
    );
  }
  if (/bao gia/.test(normalized) && /nhap|dang soan/.test(normalized)) {
    const rows = (db.quotes || []).filter((quote) => quote.status === "draft");
    return result(
      "Báo giá cần hoàn thiện",
      `${rows.length} bản nháp đang có.`,
      rows
        .slice(0, 5)
        .map(
          (quote) =>
            `${quote.number || "Bản nháp"} · ${quote.customer?.name || "Chưa có tên khách"}`,
        ),
      action("filter", "Mở báo giá nháp", { route: "quotes", filter: "draft" }),
    );
  }
  if (/^(?:tao|them|mo) bao gia(?: moi)?$/.test(normalized))
    return result(
      "Soạn báo giá mới",
      "Mở bản nháp để chọn khách và thiết bị. Chưa phát hành hoặc gửi tài liệu.",
      [],
      action("new-quote", "Mở báo giá mới"),
    );
  if (/tom tat/.test(normalized) && /phuong an/.test(normalized)) {
    const plan = db.plans?.[0];
    if (!plan)
      return result(
        "Chưa có bản lưu",
        "Tính và lưu phương án đầu tiên để có bản chụp đối chiếu.",
        [],
        nav("calculator", "Tạo phương án"),
      );
    return result(
      plan.name || "Phương án mới nhất",
      "Số liệu tại thời điểm lưu; mở máy tính để đối chiếu lại danh mục hiện tại.",
      [
        `Công suất: ${formatNumber(plan.result?.systemKwp)} kWp`,
        `Đầu tư trong bản lưu: ${Number.isFinite(Number(plan.result?.total)) && plan.result?.total != null ? formatVnd(plan.result.total) : "Chưa có dữ liệu"}`,
        `Tiết kiệm dự kiến: ${Number.isFinite(Number(plan.result?.monthlySavings)) && plan.result?.monthlySavings != null ? formatVnd(plan.result.monthlySavings) + "/tháng" : "Chưa có dữ liệu"}`,
      ],
      nav("calculator", "Mở phương án", plan),
    );
  }
  if (/^(?:them|tao) (?:yeu cau|phieu)(?:\s|$)/.test(normalized)) {
    const title = raw
      .replace(
        /^(?:tạo|tao|thêm|them)\s+(?:yêu cầu|yeu cau|phiếu|phieu)\s*/i,
        "",
      )
      .trim();
    return result(
      "Tiếp nhận yêu cầu",
      "Mở phiếu để chọn khách, ghi hiện tượng và lịch xử lý.",
      title ? [title] : [],
      action("new-ticket", "Điền phiếu hỗ trợ", { ticket: { title } }),
    );
  }
  if (
    /phieu|cskh|yeu cau/.test(normalized) &&
    /qua han|hom nay|uu tien cao|khan cap|dang mo/.test(normalized)
  ) {
    const filter = /qua han/.test(normalized)
      ? "Quá hạn"
      : /hom nay/.test(normalized)
        ? "Hôm nay"
        : /uu tien cao|khan cap/.test(normalized)
          ? "Ưu tiên cao"
          : "Đang mở";
    const rows = (db.tickets || []).filter(
      (ticket) =>
        !closedTicket(ticket) &&
        (filter === "Quá hạn"
          ? ticket.dueDate && ticket.dueDate < today
          : filter === "Hôm nay"
            ? ticket.dueDate === today
            : filter === "Ưu tiên cao"
              ? ["Cao", "Khẩn cấp"].includes(ticket.priority)
              : true),
    );
    return result(
      "Hàng đợi CSKH · " + filter,
      `${rows.length} yêu cầu phù hợp.`,
      rows
        .slice(0, 5)
        .map((ticket) => `${ticket.title} · ${shortDate(ticket.dueDate)}`),
      action("filter", "Mở hàng đợi này", { route: "care", filter }),
    );
  }
  if (
    /khach/.test(normalized) &&
    /can lien he|den han|goi lai/.test(normalized)
  ) {
    const rows = (db.customers || []).filter(
      (customer) =>
        customer.nextContact &&
        customer.nextContact <= today &&
        !["Không tiếp tục", "Đã bàn giao"].includes(customer.status),
    );
    return result(
      "Khách hàng đến hạn liên hệ",
      `${rows.length} khách cần tiếp tục trao đổi.`,
      rows
        .slice(0, 5)
        .map(
          (customer) => `${customer.name} · ${shortDate(customer.nextContact)}`,
        ),
      action("filter", "Mở khách cần liên hệ", {
        route: "customers",
        filter: "Cần liên hệ",
      }),
    );
  }
  if (
    (/^(?:them|tao) (?:khach|anh|chi|co|chu|cong ty)\b/.test(normalized) ||
      (route === "customers" &&
        /(?:\+84|0084|0)[\d\s().-]{8,20}\d/.test(raw))) &&
    !/^tim/.test(normalized)
  )
    return parseCustomer(raw);
  if (/^tim khach\b/.test(normalized)) {
    const query = raw
      .replace(/^tìm khách(?: hàng)?\s*/i, "")
      .replace(/^tim khach(?: hang)?\s*/i, "")
      .trim();
    if (!query)
      return result(
        "Bạn muốn tìm khách nào?",
        "Nhập tên, số điện thoại hoặc địa chỉ sau từ “tìm khách”.",
      );
    const rows = (db.customers || []).filter((customer) =>
      searchText(
        `${customer.name} ${customer.phone} ${customer.address}`,
      ).includes(searchText(query)),
    );
    return result(
      "Tìm hồ sơ khách",
      `${rows.length} hồ sơ phù hợp với “${query}”.`,
      rows
        .slice(0, 5)
        .map(
          (customer) => `${customer.name} · ${customer.phone || "Chưa có số"}`,
        ),
      action("filter", "Mở kết quả tìm", {
        route: "customers",
        filter: "Tất cả",
        query,
      }),
    );
  }
  if (/^(?:them|tao) thiet bi/.test(normalized))
    return result(
      "Bổ sung thiết bị",
      "Mở form để nhập model, thông số và giá. Chỉ xác minh khi có nguồn đã kiểm tra.",
      [],
      action("new-product", "Mở form thiết bị", { product: {} }),
    );
  const calc = parseCalculation(raw, route);
  if (
    calc &&
    (/^(?:tinh|tra)\b/.test(normalized) ||
      /hoa don|tien dien/.test(normalized) ||
      ["calculator", "lookup"].includes(route))
  )
    return calc;
  if (
    (/^(?:tim|tra|gia)\b/.test(normalized) ||
      (route === "catalog" &&
        (db.products || []).some((product) =>
          [product.brand, product.model].some(
            (value) => searchText(value) === normalized,
          ),
        ))) &&
    (route === "catalog" ||
      route === "lookup" ||
      /thiet bi|pin|deye|inverter|bien tan|model/.test(normalized))
  ) {
    const query = raw
      .replace(
        /^(?:tìm|tim|tra|giá|gia)\s*(?:giá|gia)?\s*(?:thiết bị|thiet bi)?\s*/i,
        "",
      )
      .trim();
    const category = /pin luu tru/.test(normalized)
      ? "bat"
      : /tam pin/.test(normalized)
        ? "panel"
        : /bien tan|inverter/.test(normalized)
          ? "inv"
          : undefined;
    const rows = (db.products || []).filter(
      (product) =>
        product.active !== false &&
        (category
          ? product.category === category
          : searchText(
              `${product.brand} ${product.model} ${product.description}`,
            ).includes(searchText(query))),
    );
    return result(
      "Tra thiết bị",
      `${rows.length} thiết bị đang dùng phù hợp.`,
      rows
        .slice(0, 5)
        .map((product) =>
          `${product.brand || ""} ${product.model || ""} · ${Number(product.price) > 0 ? formatVnd(product.price) : "Chưa có giá"}`.trim(),
        ),
      action("filter", "Mở danh mục tìm thấy", {
        route: "catalog",
        filter: "active",
        query: category ? "" : query,
        ...(category ? { category } : {}),
      }),
    );
  }
  const answer = knowledge.find((item) => item.match.test(normalized));
  if (
    answer &&
    (route === "knowledge" || /tu van|giai thich|hoi|la gi/.test(normalized))
  )
    return {
      ...result(
        answer.title,
        answer.body,
        [
          "Gợi ý tham khảo; đối chiếu khảo sát và tài liệu thiết bị trước khi cam kết.",
        ],
        action("knowledge", "Mở cẩm nang liên quan", { query: answer.query }),
      ),
      copyText: answer.body,
    };
  if (/thong tin cong ty|cai dat cong ty/.test(normalized))
    return result(
      "Kiểm tra thông tin thương hiệu",
      "Thông tin này được dùng trên báo giá và tài liệu chia sẻ.",
      [],
      nav("settings", "Mở thông tin công ty", { tab: "company" }),
    );
  return result(
    "Chưa nhận ra tác vụ cụ thể",
    "Thử một yêu cầu trong các mẫu dưới đây. Trợ lý đang hỗ trợ các kỹ năng nghiệp vụ có sẵn, chưa xử lý mọi câu hỏi tự do.",
    (assistantSkills[route] || assistantSkills.overview).examples,
  );
}
