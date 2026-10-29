export function localDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function taskRows(db, filter = "due", today = localDay()) {
  const tasks = (db.tasks || []).map((task) => ({ ...task, kind: "task" }));
  const contacts = (db.customers || [])
    .filter(
      (customer) =>
        customer.nextContact &&
        !["Không tiếp tục", "Đã bàn giao"].includes(customer.status),
    )
    .map((customer) => ({
      id: customer.id,
      title: "Liên hệ " + customer.name,
      date: customer.nextContact,
      kind: "customer",
      done: false,
    }));
  return [...tasks, ...contacts]
    .filter((row) =>
      filter === "done"
        ? row.done
        : !row.done && (filter === "all" || !row.date || row.date <= today),
    )
    .sort(
      (a, b) =>
        (a.date || today).localeCompare(b.date || today) ||
        a.title.localeCompare(b.title, "vi"),
    );
}

export function searchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}
