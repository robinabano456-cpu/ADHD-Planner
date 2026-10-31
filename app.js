"use strict";

/* ============================================================
   DEMO SWITCHES — change these two lines for the paid version.
   ============================================================ */
const DEMO_MODE = true;                 // set to false for the paid, unlimited version
const DEMO_CHANGE_LIMIT = 10;           // free saves allowed in demo mode
const ETSY_LISTING_URL = "https://www.etsy.com/listing/000000000/replace-with-your-listing-url";
const PRODUCT_NAME = "ADHD Planner";    // change to your own product name if you like

const STORAGE_KEY = "adhd-planner-state-v1";
const DEMO_KEY = "adhd-planner-demo-v1";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));

const CURRENCIES = [
  { code: "USD", label: "USD — US dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British pound" },
  { code: "JPY", label: "JPY — Japanese yen" },
  { code: "CAD", label: "CAD — Canadian dollar" },
  { code: "AUD", label: "AUD — Australian dollar" },
  { code: "INR", label: "INR — Indian rupee" },
  { code: "PKR", label: "PKR — Pakistani rupee" },
  { code: "NZD", label: "NZD — New Zealand dollar" },
  { code: "CHF", label: "CHF — Swiss franc" },
  { code: "SEK", label: "SEK — Swedish krona" },
  { code: "ZAR", label: "ZAR — South African rand" },
  { code: "BRL", label: "BRL — Brazilian real" },
  { code: "MXN", label: "MXN — Mexican peso" },
  { code: "SGD", label: "SGD — Singapore dollar" },
  { code: "AED", label: "AED — UAE dirham" }
];

const THEMES = {
  "calm-teal": { label: "Calm Teal", primary: "#14565A", accent: "#2A9D8F" },
  "soft-sage": { label: "Soft Sage", primary: "#3D5A45", accent: "#7FA98C" },
  "warm-sand": { label: "Warm Sand", primary: "#6B4F35", accent: "#C99A5B" },
  "slate-blue": { label: "Slate Blue", primary: "#2E4A6B", accent: "#6C8FB5" },
  "coral-light": { label: "Coral Light", primary: "#8A3F36", accent: "#E86A5A" },
  "custom": { label: "My own accent", primary: "#14565A", accent: "#2A9D8F" }
};

const PALETTE = ["#2A9D8F", "#14565A", "#C99A5B", "#8AB17D", "#6C8FB5", "#E86A5A", "#A5798C", "#7F9A9C", "#D4A373", "#5F7A61"];

const STORAGE_NOTE = "Your data stays in this browser on this device. Nothing is sent anywhere.";
const ADVICE_NOTE = "For personal budgeting only. This is not financial, tax, legal, or investment advice.";
const LOCKED_MESSAGE = `You have used all ${DEMO_CHANGE_LIMIT} demo changes. To keep using the full planner with unlimited changes, get it from the Etsy listing.`;

/* ============================================================
   Small utilities
   ============================================================ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function sum(list) {
  return list.reduce((total, n) => total + (Number(n) || 0), 0);
}

function num(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function nonNeg(value) {
  return Math.max(0, num(value));
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

let idCounter = 0;
function uid(prefix = "id") {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function pad2(n) { return String(n).padStart(2, "0"); }

function isoOf(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function isoToday() { return isoOf(new Date()); }
function ymNow() { return isoToday().slice(0, 7); }
function ymOf(dateStr) { return String(dateStr || "").slice(0, 7); }

function parseISO(value) {
  const parts = String(value || "").split("-").map(Number);
  if (parts.length < 3 || parts.some(n => !Number.isFinite(n))) return new Date(NaN);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function fmtDate(value) {
  const d = parseISO(value);
  if (isNaN(d.getTime())) return "No date";
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function fmtMonth(ym) {
  const [y, m] = String(ym || "").split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return "No month";
  return `${MONTHS[m - 1]} ${y}`;
}

function fmtMonthShort(ym) {
  const m = Number(String(ym || "").split("-")[1]);
  return MONTHS_SHORT[m - 1] || "";
}

function addMonthsYM(ym, delta) {
  const [y, m] = String(ym).split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function addDaysISO(iso, days) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return isoOf(d);
}

function monthDiff(fromISO, toISO) {
  const a = parseISO(fromISO);
  const b = parseISO(toISO);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  const dayAdjust = b.getDate() >= a.getDate() ? 0 : -1;
  return months + dayAdjust;
}

function fmtMoney(value, code) {
  const currency = code || (typeof state !== "undefined" && state.settings.currency) || "USD";
  const zero = currency === "JPY";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: zero ? 0 : 2,
      maximumFractionDigits: zero ? 0 : 2
    }).format(Number(value) || 0);
  } catch (err) {
    return `$${(Number(value) || 0).toFixed(2)}`;
  }
}

function money(value) { return fmtMoney(value); }

function pct(value, max) {
  if (!max || max <= 0) return 0;
  const p = (value / max) * 100;
  return Math.max(0, Math.min(100, p));
}

function progressHTML(percent, label, extraClass = "") {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return `<div class="progress ${extraClass}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p)}" aria-label="${esc(label)}"><span style="width:${p}%"></span></div>`;
}

function hexToRgb(hex) {
  const clean = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return [42, 157, 143];
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function mixColor(hex, targetHex, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(targetHex);
  const mixed = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return "#" + mixed.map(v => v.toString(16).padStart(2, "0")).join("");
}

/* ============================================================
   Defaults and state
   ============================================================ */
function defaultCategories() {
  return [
    { id: uid("cat"), name: "Home base" },
    { id: uid("cat"), name: "Power & water" },
    { id: uid("cat"), name: "Groceries" },
    { id: uid("cat"), name: "Getting around" },
    { id: uid("cat"), name: "Food out" },
    { id: uid("cat"), name: "Health" },
    { id: uid("cat"), name: "Fun & hobbies" },
    { id: uid("cat"), name: "Memberships" },
    { id: uid("cat"), name: "Everything else" }
  ];
}

function emptyMonth() {
  return {
    expectedIncome: 0,
    notes: "",
    cats: {},
    debt: { budget: 0, entries: [] },
    savings: { budget: 0, entries: [] },
    incomes: []
  };
}

function defaultState() {
  return {
    version: 1,
    settings: {
      displayName: "",
      currency: "USD",
      theme: "calm-teal",
      customAccent: "#2A9D8F",
      night: false,
      rollover: false,
      startingBalance: 0,
      startMonth: ymNow(),
      focusOrder: "avalanche",
      sampleLoaded: false
    },
    categories: defaultCategories(),
    months: {},
    goals: [],
    funds: [],
    debts: [],
    calendar: [],
    archives: []
  };
}

function normalizeEntries(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(e => e && e.id).map(e => {
    const out = {
      id: String(e.id),
      date: /^\d{4}-\d{2}-\d{2}$/.test(e.date || "") ? e.date : isoToday(),
      amount: nonNeg(e.amount),
      name: typeof e.name === "string" ? e.name.slice(0, 120) : "",
      notes: typeof e.notes === "string" ? e.notes.slice(0, 2000) : ""
    };
    if (e.debtId) out.debtId = String(e.debtId);
    if (e.fundId) out.fundId = String(e.fundId);
    return out;
  });
}

function normalizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== "object") return base;

  const rs = raw.settings && typeof raw.settings === "object" ? raw.settings : {};
  const settings = {
    displayName: typeof rs.displayName === "string" ? rs.displayName.slice(0, 60) : "",
    currency: CURRENCIES.some(c => c.code === rs.currency) ? rs.currency : "USD",
    theme: THEMES[rs.theme] ? rs.theme : "calm-teal",
    customAccent: /^#[0-9a-fA-F]{6}$/.test(rs.customAccent || "") ? rs.customAccent : "#2A9D8F",
    night: !!rs.night,
    rollover: !!rs.rollover,
    startingBalance: nonNeg(rs.startingBalance),
    startMonth: /^\d{4}-\d{2}$/.test(rs.startMonth || "") ? rs.startMonth : ymNow(),
    focusOrder: rs.focusOrder === "snowball" ? "snowball" : "avalanche",
    sampleLoaded: !!rs.sampleLoaded
  };

  const categories = Array.isArray(raw.categories)
    ? raw.categories.filter(c => c && c.id && c.name).map(c => ({ id: String(c.id), name: String(c.name).slice(0, 50) }))
    : base.categories;

  const months = {};
  if (raw.months && typeof raw.months === "object") {
    for (const [ym, m] of Object.entries(raw.months)) {
      if (!/^\d{4}-\d{2}$/.test(ym) || !m || typeof m !== "object") continue;
      const mm = emptyMonth();
      mm.expectedIncome = nonNeg(m.expectedIncome);
      mm.notes = typeof m.notes === "string" ? m.notes.slice(0, 5000) : "";
      if (m.cats && typeof m.cats === "object") {
        for (const [catId, c] of Object.entries(m.cats)) {
          if (!c || typeof c !== "object") continue;
          mm.cats[catId] = { budget: nonNeg(c.budget), entries: normalizeEntries(c.entries) };
        }
      }
      mm.debt = { budget: nonNeg(m.debt && m.debt.budget), entries: normalizeEntries(m.debt && m.debt.entries) };
      mm.savings = { budget: nonNeg(m.savings && m.savings.budget), entries: normalizeEntries(m.savings && m.savings.entries) };
      mm.incomes = normalizeEntries(m.incomes).map(e => {
        const source = Array.isArray(m.incomes) ? m.incomes.find(x => x && String(x.id) === e.id) : null;
        return {
          ...e,
          isPaycheck: !!(source && source.isPaycheck),
          allocations: source && Array.isArray(source.allocations)
            ? source.allocations.filter(a => a && a.kind && a.id).map(a => ({ kind: String(a.kind), id: String(a.id), amount: nonNeg(a.amount) }))
            : []
        };
      });
      months[ym] = mm;
    }
  }

  const debts = Array.isArray(raw.debts) ? raw.debts.filter(d => d && d.id).map(d => ({
    id: String(d.id),
    name: String(d.name || "Debt").slice(0, 80),
    balance: nonNeg(d.balance),
    apr: nonNeg(d.apr),
    monthlyPayment: nonNeg(d.monthlyPayment)
  })) : [];

  const funds = Array.isArray(raw.funds) ? raw.funds.filter(f => f && f.id).map(f => ({
    id: String(f.id),
    purpose: String(f.purpose || "Savings fund").slice(0, 80),
    target: nonNeg(f.target),
    saved: nonNeg(f.saved),
    targetDate: /^\d{4}-\d{2}-\d{2}$/.test(f.targetDate || "") ? f.targetDate : ""
  })) : [];

  const goals = Array.isArray(raw.goals) ? raw.goals.filter(g => g && g.id).map(g => ({
    id: String(g.id),
    name: String(g.name || "Goal").slice(0, 80),
    target: nonNeg(g.target),
    saved: nonNeg(g.saved),
    targetDate: /^\d{4}-\d{2}-\d{2}$/.test(g.targetDate || "") ? g.targetDate : "",
    status: ["not-started", "in-progress", "done"].includes(g.status) ? g.status : "not-started",
    notes: typeof g.notes === "string" ? g.notes.slice(0, 2000) : ""
  })) : [];

  const calendar = Array.isArray(raw.calendar) ? raw.calendar.filter(c => c && c.id).map(c => ({
    id: String(c.id),
    name: String(c.name || "Entry").slice(0, 120),
    type: ["note", "bill", "payday", "debt", "savings"].includes(c.type) ? c.type : "note",
    amount: nonNeg(c.amount),
    date: /^\d{4}-\d{2}-\d{2}$/.test(c.date || "") ? c.date : isoToday(),
    repeat: ["none", "daily", "weekly", "biweekly", "twice-monthly", "monthly"].includes(c.repeat) ? c.repeat : "none",
    countsAsKind: ["income", "envelope", "debt", "savings"].includes(c.countsAsKind) ? c.countsAsKind : "income",
    countsAsId: c.countsAsId ? String(c.countsAsId) : "",
    notes: typeof c.notes === "string" ? c.notes.slice(0, 2000) : "",
    seriesId: c.seriesId ? String(c.seriesId) : "",
    doneDates: Array.isArray(c.doneDates) ? c.doneDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)) : [],
    skipDates: Array.isArray(c.skipDates) ? c.skipDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)) : []
  })) : [];

  const archives = Array.isArray(raw.archives) ? raw.archives.filter(a => a && a.id && a.data).map(a => ({
    id: String(a.id),
    label: String(a.label || "Archive").slice(0, 80),
    year: Number(a.year) || new Date().getFullYear(),
    createdAt: String(a.createdAt || new Date().toISOString()),
    data: a.data
  })) : [];

  return { version: 1, settings, categories, months, goals, funds, debts, calendar, archives };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw));
  } catch (err) {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    setStatus("The browser could not save your data. Check that this page is not in a private window with storage blocked.", "warn");
  }
}

let state = loadState() || defaultState();
if (!state.settings.startMonth) state.settings.startMonth = ymNow();
let isFirstRun = true;
try { isFirstRun = !localStorage.getItem(STORAGE_KEY); } catch (err) { isFirstRun = true; }

const ui = {
  view: isFirstRun ? "setup" : "home",
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  envTab: "month",
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth() + 1
};

/* ---------- Demo counter ---------- */
function loadDemo() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const used = parsed && Number.isFinite(Number(parsed.used)) ? Number(parsed.used) : 0;
    return { used: Math.max(0, Math.min(DEMO_CHANGE_LIMIT, used)) };
  } catch (err) {
    return { used: 0 };
  }
}

let demo = loadDemo();

function saveDemo() {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(demo)); } catch (err) { /* storage may be blocked */ }
}

function remainingChanges() {
  return Math.max(0, DEMO_CHANGE_LIMIT - demo.used);
}

function isLocked() {
  return DEMO_MODE && remainingChanges() <= 0;
}

function registerChange() {
  if (!DEMO_MODE) return true;
  if (remainingChanges() <= 0) return false;
  demo.used = Math.min(DEMO_CHANGE_LIMIT, demo.used + 1);
  saveDemo();
  return true;
}

function mutate(changeFn, message) {
  if (isLocked()) {
    setStatus(LOCKED_MESSAGE, "warn");
    render();
    return false;
  }
  const result = changeFn();
  if (result === false) return false;
  if (!registerChange()) return false;
  saveState();
  render();
  if (isLocked()) setStatus(LOCKED_MESSAGE, "warn");
  else if (message) setStatus(message);
  return true;
}

/* ---------- Theme ---------- */
function applyTheme() {
  const s = state.settings;
  const theme = THEMES[s.theme] || THEMES["calm-teal"];
  const accent = s.theme === "custom" ? s.customAccent : theme.accent;
  const primary = s.theme === "custom" ? mixColor(accent, "#000000", 0.45) : theme.primary;
  const root = document.documentElement;
  const night = !!s.night;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--btn-bg", night ? accent : primary);
  root.style.setProperty("--btn-ink", night ? mixColor(accent, "#000000", 0.86) : "#FFFFFF");
  root.style.setProperty("--link", night ? mixColor(accent, "#FFFFFF", 0.35) : primary);
  root.dataset.theme = s.theme;
  document.body.dataset.theme = s.theme;
  document.body.dataset.night = night ? "true" : "false";
}

/* ============================================================
   Month data and calculations
   ============================================================ */
function monthOr(ym) { return state.months[ym] || emptyMonth(); }

function ensureMonth(ym) {
  if (!state.months[ym]) state.months[ym] = emptyMonth();
  const m = state.months[ym];
  if (!m.cats) m.cats = {};
  if (!m.debt) m.debt = { budget: 0, entries: [] };
  if (!m.savings) m.savings = { budget: 0, entries: [] };
  if (!Array.isArray(m.incomes)) m.incomes = [];
  return m;
}

function getCategory(id) { return state.categories.find(c => c.id === id) || null; }
function getDebt(id) { return state.debts.find(d => d.id === id) || null; }
function getFund(id) { return state.funds.find(f => f.id === id) || null; }

function incomeCounted(ym) {
  const list = monthOr(ym).incomes;
  if (list.length) {
    return { amount: sum(list.map(e => nonNeg(e.amount))), source: "logged", count: list.length };
  }
  return { amount: nonNeg(monthOr(ym).expectedIncome), source: "expected", count: 0 };
}

function monthOutParts(ym) {
  const m = monthOr(ym);
  const envelopes = sum(Object.values(m.cats).map(c => sum((c.entries || []).map(e => nonNeg(e.amount)))));
  const debt = sum((m.debt.entries || []).map(e => nonNeg(e.amount)));
  const savings = sum((m.savings.entries || []).map(e => nonNeg(e.amount)));
  return { envelopes, debt, savings, total: envelopes + debt + savings };
}

function startingBalanceFor(ym) {
  return ym === state.settings.startMonth ? nonNeg(state.settings.startingBalance) : 0;
}

function rolloverFor(ym) {
  if (!state.settings.rollover) return 0;
  const start = state.settings.startMonth;
  if (!start || ym <= start) return 0;
  let carry = 0;
  let cur = start;
  let guard = 0;
  while (cur < ym && guard < 600) {
    const income = incomeCounted(cur).amount + carry + startingBalanceFor(cur);
    const out = monthOutParts(cur).total;
    carry = Math.max(0, income - out);
    cur = addMonthsYM(cur, 1);
    guard += 1;
  }
  return carry;
}

function moneyInParts(ym) {
  const income = incomeCounted(ym);
  const rollover = rolloverFor(ym);
  const starting = startingBalanceFor(ym);
  return {
    income: income.amount,
    incomeSource: income.source,
    incomeCount: income.count,
    rollover,
    starting,
    total: income.amount + rollover + starting
  };
}

function isDone(entry, date) {
  return Array.isArray(entry.doneDates) && entry.doneDates.includes(date);
}

function occurrencesInMonth(entry, year, month) {
  const out = [];
  if (!entry || !entry.date) return out;
  const start = parseISO(entry.date);
  if (isNaN(start.getTime())) return out;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  if (start > monthEnd) return out;

  const repeat = entry.repeat || "none";
  const push = d => {
    if (d < monthStart || d > monthEnd || d < start) return;
    out.push(isoOf(d));
  };

  if (repeat === "none") {
    if (start.getFullYear() === year && start.getMonth() === month - 1) out.push(isoOf(start));
  } else if (repeat === "daily") {
    const d = new Date(Math.max(start.getTime(), monthStart.getTime()));
    while (d <= monthEnd) {
      push(d);
      d.setDate(d.getDate() + 1);
    }
  } else if (repeat === "weekly" || repeat === "biweekly") {
    const step = repeat === "weekly" ? 7 : 14;
    const d = new Date(start);
    let guard = 0;
    while (d < monthStart && guard < 5000) {
      d.setDate(d.getDate() + step);
      guard += 1;
    }
    while (d <= monthEnd) {
      push(d);
      d.setDate(d.getDate() + step);
    }
  } else if (repeat === "twice-monthly") {
    const day = start.getDate();
    for (const rawDay of [day, day + 15]) {
      const clamped = Math.min(rawDay, daysInMonth(year, month));
      push(new Date(year, month - 1, clamped));
    }
  } else if (repeat === "monthly") {
    const day = Math.min(start.getDate(), daysInMonth(year, month));
    push(new Date(year, month - 1, day));
  }

  const skip = Array.isArray(entry.skipDates) ? entry.skipDates : [];
  return Array.from(new Set(out)).filter(d => !skip.includes(d)).sort();
}

function billsDue(ym) {
  const [y, m] = ym.split("-").map(Number);
  const list = [];
  for (const entry of state.calendar) {
    if (entry.type !== "bill") continue;
    for (const date of occurrencesInMonth(entry, y, m)) {
      if (!isDone(entry, date)) {
        list.push({ entry, date, amount: nonNeg(entry.amount) });
      }
    }
  }
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

function safeToSpend(ym) {
  const inParts = moneyInParts(ym);
  const outParts = monthOutParts(ym);
  const bills = billsDue(ym);
  const billTotal = sum(bills.map(b => b.amount));
  const raw = inParts.total - outParts.total - billTotal;
  return {
    in: inParts.total,
    out: outParts.total,
    bills: billTotal,
    billList: bills,
    raw,
    safe: Math.max(0, raw),
    shortfall: Math.max(0, -raw),
    inParts,
    outParts
  };
}

function categoryStats(ym, catId) {
  const c = monthOr(ym).cats[catId];
  const budget = nonNeg(c && c.budget);
  const entries = (c && c.entries) || [];
  const spent = sum(entries.map(e => nonNeg(e.amount)));
  return { budget, spent, left: budget - spent, over: spent > budget, entries };
}

function upcomingOccurrences(fromISO, days, types) {
  const endISO = addDaysISO(fromISO, days);
  const out = [];
  let ym = ymOf(fromISO);
  const endYM = ymOf(endISO);
  let guard = 0;
  while (ym <= endYM && guard < 24) {
    const [y, m] = ym.split("-").map(Number);
    for (const entry of state.calendar) {
      if (types && !types.includes(entry.type)) continue;
      for (const date of occurrencesInMonth(entry, y, m)) {
        if (date >= fromISO && date <= endISO) out.push({ entry, date, done: isDone(entry, date) });
      }
    }
    ym = addMonthsYM(ym, 1);
    guard += 1;
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function paycheckPosition(ym) {
  const list = monthOr(ym).incomes.filter(e => e.isPaycheck).slice().sort((a, b) => a.date.localeCompare(b.date));
  if (!list.length) return null;
  let pick;
  if (ym === ymNow()) {
    const past = list.filter(e => e.date <= isoToday());
    pick = past.length ? past[past.length - 1] : list[0];
  } else {
    pick = list[list.length - 1];
  }
  const assigned = sum((pick.allocations || []).map(a => nonNeg(a.amount)));
  return { entry: pick, assigned, left: nonNeg(pick.amount) - assigned };
}

function allocationLabel(a) {
  if (a.kind === "envelope") return (getCategory(a.id) || {}).name || "Removed envelope";
  if (a.kind === "debt") return (getDebt(a.id) || {}).name || "Removed debt";
  if (a.kind === "savings") return (getFund(a.id) || {}).purpose || "Removed savings fund";
  if (a.kind === "bill") {
    const e = state.calendar.find(c => c.id === a.id);
    return e ? e.name : "Removed bill";
  }
  return "Other";
}

function debtPaidTotal(debtId) {
  let total = 0;
  for (const m of Object.values(state.months)) {
    for (const e of m.debt.entries) {
      if (e.debtId === debtId) total += nonNeg(e.amount);
    }
  }
  return total;
}

function payoffEstimate(debt) {
  const balance = nonNeg(debt.balance);
  const apr = nonNeg(debt.apr);
  const payment = nonNeg(debt.monthlyPayment);
  if (balance <= 0.005) return { label: "Paid off", months: 0, interest: 0 };
  if (payment <= 0) return { label: "Add a monthly payment to estimate", months: null, interest: null };
  const monthlyRate = apr / 100 / 12;
  if (monthlyRate > 0 && payment <= balance * monthlyRate) {
    return { label: "Payment does not cover monthly interest", months: null, interest: null };
  }
  let bal = balance;
  let months = 0;
  let interest = 0;
  while (bal > 0.005 && months < 1200) {
    const charge = bal * monthlyRate;
    interest += charge;
    bal = bal + charge - payment;
    months += 1;
  }
  if (bal > 0.005) return { label: "More than 100 years at this payment", months: null, interest: null };
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return { label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, months, interest, date: isoOf(new Date(d.getFullYear(), d.getMonth(), 1)) };
}

function fundMonthlyNeeded(fund) {
  if (!fund.targetDate) return null;
  const remaining = Math.max(0, nonNeg(fund.target) - nonNeg(fund.saved));
  const months = monthDiff(isoToday(), fund.targetDate);
  if (months === null || months <= 0) return { months: 0, amount: remaining };
  return { months, amount: remaining / months };
}

/* ============================================================
   Entry lookup and side effects
   ============================================================ */
function findEntry(kind, id) {
  for (const [ym, m] of Object.entries(state.months)) {
    if (kind === "income") {
      const index = m.incomes.findIndex(e => e.id === id);
      if (index > -1) return { ym, m, e: m.incomes[index], list: m.incomes, index };
    }
    if (kind === "debt") {
      const index = m.debt.entries.findIndex(e => e.id === id);
      if (index > -1) return { ym, m, e: m.debt.entries[index], list: m.debt.entries, index };
    }
    if (kind === "savings") {
      const index = m.savings.entries.findIndex(e => e.id === id);
      if (index > -1) return { ym, m, e: m.savings.entries[index], list: m.savings.entries, index };
    }
    if (kind === "spending") {
      for (const [catId, c] of Object.entries(m.cats)) {
        const index = (c.entries || []).findIndex(e => e.id === id);
        if (index > -1) return { ym, m, e: c.entries[index], list: c.entries, index, catId };
      }
    }
  }
  return null;
}

function adjustDebt(debtId, delta) {
  const debt = getDebt(debtId);
  if (debt) debt.balance = Math.max(0, round2(nonNeg(debt.balance) + delta));
}

function adjustFund(fundId, delta) {
  const fund = getFund(fundId);
  if (fund) fund.saved = Math.max(0, round2(nonNeg(fund.saved) + delta));
}

function addSpending(ym, catId, entry) {
  const m = ensureMonth(ym);
  if (!m.cats[catId]) m.cats[catId] = { budget: 0, entries: [] };
  m.cats[catId].entries.push({ id: uid("spend"), notes: "", name: "", ...entry });
}

function addDebtPayment(ym, entry) {
  ensureMonth(ym).debt.entries.push({ id: uid("dp"), notes: "", name: "", ...entry });
  if (entry.debtId) adjustDebt(entry.debtId, -nonNeg(entry.amount));
}

function addSavingsContribution(ym, entry) {
  ensureMonth(ym).savings.entries.push({ id: uid("sc"), notes: "", name: "", ...entry });
  if (entry.fundId) adjustFund(entry.fundId, nonNeg(entry.amount));
}

function addIncome(ym, entry) {
  ensureMonth(ym).incomes.push({
    id: uid("inc"), notes: "", name: "", isPaycheck: false, allocations: [], ...entry
  });
}

/* ============================================================
   Status, navigation, and the app frame
   ============================================================ */
function setStatus(message, tone) {
  const el = $("#status-region");
  if (!el) return;
  el.textContent = message || "";
  el.className = "status-region" + (tone === "warn" ? " warn" : "");
}

const NAV_ITEMS = [
  { id: "setup", label: "Setup" },
  { id: "home", label: "Home" },
  { id: "today", label: "Today" },
  { id: "calendar", label: "Calendar" },
  { id: "goals", label: "Goals" },
  { id: "savings", label: "Savings" },
  { id: "debt", label: "Debt" },
  { id: "envelopes", label: "Envelopes" },
  { id: "settings", label: "Settings" }
];

const VIEW_META = {
  setup: ["Setup", "Getting started"],
  home: ["Home", "Your month at a glance"],
  today: ["Today", "Right now, without the noise"],
  calendar: ["Calendar", "Bills, paydays, and notes"],
  goals: ["Goals", "What you are working toward"],
  savings: ["Savings", "Money set aside on purpose"],
  debt: ["Debt", "A clear payoff view"],
  envelopes: ["Envelopes", "Your monthly plan"],
  settings: ["Settings", "Make it yours"]
};

const ICON_PATHS = {
  setup: '<path d="M4 7h8M16 7h4M4 17h4M12 17h8"/><circle cx="14" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  goals: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  savings: '<path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M7 10V8a5 5 0 0 1 10 0v2M12 13v4M10 15h4"/>',
  debt: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
  envelopes: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>'
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.home}</svg>`;
}

function navButtonHTML(item) {
  const active = ui.view === item.id;
  return `<button type="button" class="nav-item" data-action="nav" data-view="${item.id}" ${active ? 'aria-current="page"' : ""} title="${esc(item.label)}">
    <span class="nav-icon" aria-hidden="true">${icon(item.id)}</span>
    <span class="nav-label">${esc(item.label)}</span>
  </button>`;
}

function renderNav() {
  const main = $("#main-nav");
  const drawer = $("#drawer-nav");
  if (main) main.innerHTML = NAV_ITEMS.map(navButtonHTML).join("");
  if (drawer) drawer.innerHTML = NAV_ITEMS.map(navButtonHTML).join("");
  const meta = VIEW_META[ui.view] || VIEW_META.home;
  const title = $("#view-title");
  const eyebrow = $("#view-eyebrow");
  if (title) title.textContent = meta[0];
  if (eyebrow) eyebrow.textContent = meta[1];
  const brand = $("#brand-name");
  if (brand) brand.textContent = PRODUCT_NAME;
  const mobile = $("#mobile-title");
  if (mobile) mobile.textContent = PRODUCT_NAME;
  document.title = `${PRODUCT_NAME} — ${meta[0]}`;
}

function showView() {
  for (const item of NAV_ITEMS) {
    const el = $("#view-" + item.id);
    if (el) el.hidden = item.id !== ui.view;
  }
}

function renderDemoBanner() {
  const el = $("#demo-banner");
  if (!el) return;
  if (!DEMO_MODE) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  if (isLocked()) {
    el.className = "demo-banner locked";
    el.innerHTML = `<div class="demo-banner-inner">
      <p><strong>Demo complete.</strong> ${esc(LOCKED_MESSAGE)}</p>
      <a class="btn btn-light" href="${esc(ETSY_LISTING_URL)}" target="_blank" rel="noopener noreferrer">Get the full planner on Etsy</a>
    </div>`;
  } else {
    el.className = "demo-banner";
    el.innerHTML = `<div class="demo-banner-inner">
      <p><strong>Demo mode.</strong> <span class="demo-count">${remainingChanges()} of ${DEMO_CHANGE_LIMIT}</span> free changes left. Saving, editing, deleting, and marking things done use one change.</p>
    </div>`;
  }
}

function applyLock() {
  const locked = isLocked();
  $$("[data-change]").forEach(el => {
    if ("disabled" in el) el.disabled = locked;
    else el.setAttribute("aria-disabled", String(locked));
  });
}

function render() {
  applyTheme();
  renderDemoBanner();
  renderNav();
  renderSetup();
  renderHome();
  renderToday();
  renderCalendar();
  renderGoals();
  renderSavings();
  renderDebt();
  renderEnvelopes();
  renderSettings();
  showView();
  applyLock();
}

function setView(view) {
  if (!VIEW_META[view]) view = "home";
  ui.view = view;
  setStatus("");
  closeDrawer();
  render();
  const main = $("#main-content");
  if (main) {
    window.scrollTo({ top: 0, behavior: "auto" });
    try { main.focus({ preventScroll: true }); } catch (err) { /* older browsers */ }
  }
}

/* ============================================================
   Modal dialogs
   ============================================================ */
let modalSubmit = null;
let lastFocused = null;

function openModal(opts) {
  const {
    title, body, submitLabel = "Save", onSubmit = null, wide = false,
    mutating = true, hideSubmit = false, actionsHtml = "", danger = false
  } = opts;
  closeModal(true);
  lastFocused = document.activeElement;
  const root = $("#modal-root");
  root.innerHTML = `<div class="modal-overlay" data-action="backdrop">
    <div class="modal ${wide ? "modal-wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-head">
        <h2 id="modal-title">${esc(title)}</h2>
        <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close dialog">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <form data-form="modal" novalidate>
        <div class="modal-body">${body}</div>
        <div class="form-error" id="modal-error" role="alert" hidden></div>
        ${actionsHtml ? `<div class="modal-actions">${actionsHtml}</div>` : ""}
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
          ${hideSubmit ? "" : `<button type="submit" class="btn ${danger ? "btn-danger" : "btn-primary"}" ${mutating ? "data-change" : ""}>${esc(submitLabel)}</button>`}
        </div>
      </form>
    </div>
  </div>`;
  modalSubmit = onSubmit;
  document.body.classList.add("no-scroll");
  const target = root.querySelector(".modal-body input:not([type=hidden]), .modal-body select, .modal-body textarea")
    || root.querySelector(".modal-body button")
    || root.querySelector(".modal-actions .btn-primary");
  if (target) {
    try { target.focus(); } catch (err) { /* ignore */ }
  }
  applyLock();
}

function closeModal(silent = false) {
  const root = $("#modal-root");
  const hadModal = !!(root && root.innerHTML.trim());
  if (root) root.innerHTML = "";
  modalSubmit = null;
  document.body.classList.remove("no-scroll");
  if (!silent && hadModal) {
    if (lastFocused && document.contains(lastFocused)) {
      try { lastFocused.focus(); } catch (err) { /* ignore */ }
    } else {
      const main = $("#main-content");
      if (main) { try { main.focus({ preventScroll: true }); } catch (err) { /* ignore */ } }
    }
  }
  lastFocused = null;
}

function showModalError(message) {
  const el = $("#modal-error");
  if (!el) return;
  el.textContent = message || "";
  el.hidden = !message;
}

function showFormError(form, message) {
  const el = form.querySelector("[data-form-error]");
  if (el) {
    el.textContent = message;
    el.hidden = false;
  } else {
    setStatus(message, "warn");
  }
}

function clearFormError(form) {
  const el = form.querySelector("[data-form-error]");
  if (el) {
    el.textContent = "";
    el.hidden = true;
  }
}

function confirmAction(opts) {
  const { title, message, confirmLabel = "Delete", onConfirm } = opts;
  openModal({
    title,
    body: `<p>${message}</p>`,
    submitLabel: confirmLabel,
    danger: true,
    onSubmit: () => {
      onConfirm();
    }
  });
}

function openDrawer() {
  const drawer = $("#nav-drawer");
  if (!drawer) return;
  drawer.hidden = false;
  document.body.classList.add("no-scroll");
  const btn = $("#menu-btn");
  if (btn) btn.setAttribute("aria-expanded", "true");
  const first = drawer.querySelector("button");
  if (first) { try { first.focus(); } catch (err) { /* ignore */ } }
}

function closeDrawer() {
  const drawer = $("#nav-drawer");
  if (!drawer || drawer.hidden) return;
  drawer.hidden = true;
  document.body.classList.remove("no-scroll");
  const btn = $("#menu-btn");
  if (btn) btn.setAttribute("aria-expanded", "false");
}

/* ============================================================
   Shared render helpers
   ============================================================ */
function monthPillsHTML() {
  return `<div class="month-pills" role="group" aria-label="Choose a month">` +
    MONTHS.map((name, i) => `<button type="button" class="pill" data-action="home-month" data-month="${i + 1}" aria-pressed="${ui.month === i + 1}">${MONTHS_SHORT[i]}</button>`).join("") +
    `</div>`;
}

function donutHTML(items, emptyText) {
  const total = sum(items.map(i => i.value));
  if (!total) return `<div class="empty">${esc(emptyText)}</div>`;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const circles = items.map((item, i) => {
    const fraction = item.value / total;
    const dash = fraction * circumference;
    const circle = `<circle cx="90" cy="90" r="${radius}" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="26" stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 90 90)"></circle>`;
    offset += dash;
    return circle;
  }).join("");
  const legend = items.map((item, i) => `<div class="donut-legend-row">
    <span class="swatch" style="background:${PALETTE[i % PALETTE.length]}"></span>
    <span class="name">${esc(item.name)}</span>
    <span class="val">${money(item.value)} · ${Math.round((item.value / total) * 100)}%</span>
  </div>`).join("");
  return `<div class="donut-wrap">
    <svg viewBox="0 0 180 180" role="img" aria-label="Spending by category">
      ${circles}
      <text x="90" y="86" text-anchor="middle" class="donut-center">Spent</text>
      <text x="90" y="104" text-anchor="middle" class="donut-center" style="font-size:12px;fill:var(--ink)">${esc(money(total))}</text>
    </svg>
    <div class="donut-legend">${legend}</div>
  </div>`;
}

function categoryDetailHTML(c) {
  const entries = c.entries.slice().sort((a, b) => b.date.localeCompare(a.date));
  const rows = entries.length ? entries.map(e => `<div class="list-row">
    <div class="list-main">
      <div class="list-title">${esc(e.name || "Spending")}</div>
      <div class="list-meta">${fmtDate(e.date)}${e.notes ? " · " + esc(e.notes) : ""}</div>
    </div>
    <div class="list-amount">${money(e.amount)}</div>
  </div>`).join("") : `<div class="empty">No entries in this category for the month.</div>`;
  return `<details class="cat-detail">
    <summary>
      <span><strong>${esc(c.name)}</strong> <span class="hint">${c.entries.length} ${c.entries.length === 1 ? "entry" : "entries"}</span></span>
      <span class="badge ${c.over ? "over" : "left"}">${c.over ? money(-c.left) + " over" : money(c.left) + " left"}</span>
    </summary>
    <div class="cat-detail-body">
      <p class="hint">Budget ${money(c.budget)} · Spent ${money(c.spent)} · ${c.over ? "Over budget" : "Within budget"}</p>
      <div class="item-list">${rows}</div>
    </div>
  </details>`;
}

/* ============================================================
   Home
   ============================================================ */
function renderHome() {
  const el = $("#view-home");
  if (!el) return;
  const ym = `${ui.year}-${pad2(ui.month)}`;
  const st = safeToSpend(ym);
  const pay = paycheckPosition(ym);
  const cats = state.categories.map(c => ({ id: c.id, name: c.name, ...categoryStats(ym, c.id) }));
  const distribution = cats.filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent);
  const envBudget = sum(cats.map(c => c.budget));
  const debtBudget = nonNeg(monthOr(ym).debt.budget);
  const savingsBudget = nonNeg(monthOr(ym).savings.budget);
  const allocTotal = envBudget + debtBudget + savingsBudget + st.safe;
  const allocMax = Math.max(1, st.in, allocTotal);
  const maxBar = Math.max(1, ...cats.map(c => Math.max(c.budget, c.spent)));

  const incomeNote = st.inParts.incomeSource === "logged"
    ? `from ${st.inParts.incomeCount} logged ${st.inParts.incomeCount === 1 ? "entry" : "entries"}`
    : "expected figure — no income logged yet";

  const chartRows = cats.length ? cats.map(c => `<div class="bar-group">
    <div class="bar-group-label">${esc(c.name)}</div>
    <div class="bar-pair">
      <div class="bar-line">
        <div class="bar-track"><div class="bar-fill planned" style="width:${pct(c.budget, maxBar)}%"></div></div>
        <span class="bar-value">Plan ${money(c.budget)}</span>
      </div>
      <div class="bar-line">
        <div class="bar-track"><div class="bar-fill ${c.over ? "over" : ""}" style="width:${pct(c.spent, maxBar)}%"></div></div>
        <span class="bar-value">Actual ${money(c.spent)}</span>
      </div>
    </div>
  </div>`).join("") : `<div class="empty">Add a category in Envelopes to see planned and actual spending.</div>`;

  const allocationItems = [
    { name: "Envelope budgets", value: envBudget, color: "var(--primary)" },
    { name: "Debt payments budgeted", value: debtBudget, color: "var(--accent)" },
    { name: "Savings budgeted", value: savingsBudget, color: "#C99A5B" },
    { name: "Safe to spend", value: st.safe, color: "#8AB17D" }
  ];
  const stack = allocationItems.map(item => `<span style="width:${(item.value / allocMax) * 100}%;background:${item.color}" title="${esc(item.name)}: ${esc(money(item.value))}"></span>`).join("");
  const allocList = allocationItems.map(item => `<div class="alloc-row">
    <span class="swatch" style="background:${item.color}"></span>
    <span class="name">${esc(item.name)}</span>
    <span class="val">${money(item.value)}</span>
  </div>`).join("");

  const payCard = pay ? `<section class="card">
    <div class="card-head">
      <h2>Current paycheck</h2>
      <button type="button" class="btn btn-secondary btn-small" data-action="assign-paycheck" data-id="${pay.entry.id}" data-change>Assign money</button>
    </div>
    <p class="list-meta">${esc(pay.entry.name || "Paycheck")} · ${fmtDate(pay.entry.date)}</p>
    <div class="grid grid-3" style="margin-top:10px">
      <div class="stat"><span class="stat-label">Paycheck</span><span class="stat-value">${money(pay.entry.amount)}</span></div>
      <div class="stat"><span class="stat-label">Assigned</span><span class="stat-value">${money(pay.assigned)}</span></div>
      <div class="stat"><span class="stat-label">Left from it</span><span class="stat-value">${money(pay.left)}</span></div>
    </div>
    ${(pay.entry.allocations || []).length ? `<div class="alloc-list" style="margin-top:12px">${pay.entry.allocations.map(a => `<div class="alloc-row"><span class="name">${esc(allocationLabel(a))}</span><span class="val">${money(a.amount)}</span></div>`).join("")}</div>` : `<p class="hint" style="margin-top:10px">No money assigned from this paycheck yet. Assigning is a plan; it does not move money or change your totals.</p>`}
    ${pay.left < 0 ? `<p class="notice warn" style="margin-top:10px">This paycheck is over-assigned by ${money(-pay.left)}. Lower an assignment or raise the paycheck amount.</p>` : ""}
  </section>` : `<section class="card">
    <div class="card-head"><h2>Current paycheck</h2><button type="button" class="btn btn-secondary btn-small" data-action="new-paycheck" data-change>Add a paycheck</button></div>
    <p class="muted">No paycheck is logged for ${esc(fmtMonth(ym))} yet. Add one to see what is left after you assign it.</p>
  </section>`;

  el.innerHTML = `<section class="card">
    <div class="card-head">
      <div class="month-nav">
        <button type="button" class="icon-btn" data-action="home-year" data-delta="-1" aria-label="Previous year">‹</button>
        <span class="year-label">${ui.year}</span>
        <button type="button" class="icon-btn" data-action="home-year" data-delta="1" aria-label="Next year">›</button>
      </div>
      <button type="button" class="btn btn-secondary btn-small" data-action="print-month">Print monthly summary</button>
    </div>
    ${monthPillsHTML()}
  </section>

  <div class="grid grid-3">
    <article class="card stat income"><span class="stat-label">Money in</span><span class="stat-value">${money(st.in)}</span><span class="stat-note">Income, rollover, and starting balance</span></article>
    <article class="card stat spend"><span class="stat-label">Total spending</span><span class="stat-value">${money(st.out)}</span><span class="stat-note">Envelopes, debt, and savings</span></article>
    <article class="card stat safe"><span class="stat-label">Safe to spend</span><span class="stat-value">${money(st.safe)}</span><span class="stat-note">${st.shortfall > 0 ? "Shortfall shown below" : "After bills still due"}</span></article>
  </div>

  <section class="card">
    <h2>How safe to spend is worked out</h2>
    <dl class="breakdown">
      <div class="breakdown-row"><dt>Income counted <span class="breakdown-sub">${esc(incomeNote)}</span></dt><dd>${money(st.inParts.income)}</dd></div>
      <div class="breakdown-row"><dt>Rollover from last month <span class="breakdown-sub">${state.settings.rollover ? "Rollover is on" : "Rollover is off"}</span></dt><dd>${money(st.inParts.rollover)}</dd></div>
      <div class="breakdown-row"><dt>Starting balance <span class="breakdown-sub">${ym === state.settings.startMonth ? "Added once, in your first month" : "Only added in your first month"}</span></dt><dd>${money(st.inParts.starting)}</dd></div>
      <div class="breakdown-row total"><dt>Money in</dt><dd>${money(st.in)}</dd></div>
      <div class="breakdown-row"><dt>Envelope spending</dt><dd>−${money(st.outParts.envelopes)}</dd></div>
      <div class="breakdown-row"><dt>Debt payments made</dt><dd>−${money(st.outParts.debt)}</dd></div>
      <div class="breakdown-row"><dt>Savings contributions</dt><dd>−${money(st.outParts.savings)}</dd></div>
      <div class="breakdown-row"><dt>Bills due this month, not done</dt><dd>−${money(st.bills)}</dd></div>
      <div class="breakdown-row total"><dt>Safe to spend</dt><dd>${money(st.safe)}</dd></div>
    </dl>
    <p class="hint">Safe to spend = money in − money out − bills due this month that are not marked done.</p>
    ${st.shortfall > 0 ? `<p class="notice warn">Your plan is ${money(st.shortfall)} short this month. Safe to spend is shown as ${money(0)} instead of a negative number. The shortfall is the amount to trim or cover.</p>` : ""}
  </section>

  ${payCard}

  <section class="card">
    <div class="card-head"><h2>Planned vs. actual spending</h2><div class="legend"><span class="legend-item"><span class="swatch" style="background:var(--muted);opacity:.55"></span>Planned</span><span class="legend-item"><span class="swatch" style="background:var(--accent)"></span>Actual</span></div></div>
    <div class="bar-chart">${chartRows}</div>
  </section>

  <div class="grid grid-2">
    <section class="card">
      <h2>Where the spending went</h2>
      ${donutHTML(distribution, "No spending tracked for this month yet.")}
    </section>
    <section class="card">
      <h2>Where the money is allocated</h2>
      ${allocTotal > 0 ? `<div class="stack" aria-hidden="true">${stack}</div><div class="alloc-list">${allocList}</div>` : `<div class="empty">Set envelope budgets in Envelopes to see this breakdown.</div>`}
    </section>
  </div>

  <section class="card">
    <div class="card-head">
      <h2>Category detail</h2>
      <button type="button" class="btn btn-secondary btn-small" data-action="edit-plan" data-ym="${ym}" data-change>Edit monthly plan</button>
    </div>
    <div class="item-list">${cats.length ? cats.map(categoryDetailHTML).join("") : `<div class="empty">No categories yet. Add one in Envelopes.</div>`}</div>
  </section>

  <section class="card">
    <h2>Monthly notes</h2>
    <form data-form="notes" data-ym="${ym}">
      <label class="field">Anything you want to remember about ${esc(fmtMonth(ym))}
        <textarea name="notes" rows="4" placeholder="A short note is enough.">${esc(monthOr(ym).notes)}</textarea>
      </label>
      <div class="form-actions"><button type="submit" class="btn btn-primary" data-change>Save notes</button></div>
    </form>
  </section>`;
}

/* ============================================================
   Today
   ============================================================ */
function renderToday() {
  const el = $("#view-today");
  if (!el) return;
  const ym = ymNow();
  const st = safeToSpend(ym);
  const savedTotal = sum(state.funds.map(f => nonNeg(f.saved)));
  const debtTotal = sum(state.debts.map(d => nonNeg(d.balance)));
  const minimums = sum(state.debts.map(d => nonNeg(d.monthlyPayment)));
  const activeGoals = state.goals.filter(g => g.status !== "done");
  const inProgress = state.goals.filter(g => g.status === "in-progress");
  const pay = paycheckPosition(ym);
  const upcoming = upcomingOccurrences(isoToday(), 30, ["bill", "payday", "debt", "savings"]);
  const shown = upcoming.slice(0, 12);
  const notes = monthOr(ym).notes;

  const upcomingRows = shown.length ? shown.map(o => `<div class="list-row ${o.done ? "done" : ""}">
    <label class="list-check">
      <input type="checkbox" data-done data-entry="${o.entry.id}" data-date="${o.date}" ${o.done ? "checked" : ""} data-change>
      <span class="sr-only">Mark ${esc(o.entry.name)} on ${fmtDate(o.date)} as done</span>
    </label>
    <div class="list-main">
      <div class="list-title">${esc(o.entry.name)}</div>
      <div class="list-meta">${esc(calendarTypeLabel(o.entry.type))} · ${fmtDate(o.date)} · ${esc(calendarCountsLabel(o.entry))}</div>
    </div>
    <div class="list-amount">${money(o.entry.amount)}</div>
  </div>`).join("") : `<div class="empty">Nothing due in the next 30 days. That is allowed.</div>`;

  const goalRows = activeGoals.length ? activeGoals.map(g => {
    const progress = g.target > 0 ? Math.min(100, (nonNeg(g.saved) / nonNeg(g.target)) * 100) : 0;
    return `<div class="list-row">
      <div class="list-main">
        <div class="list-title">${esc(g.name)}</div>
        <div class="list-meta">${goalStatusLabel(g.status)}${g.targetDate ? " · target " + fmtDate(g.targetDate) : ""}</div>
      </div>
      <div style="flex:1 1 120px;min-width:100px">${progressHTML(progress, `Progress for ${g.name}`)}</div>
      <div class="list-amount">${money(g.saved)} / ${money(g.target)}</div>
    </div>`;
  }).join("") : `<div class="empty">No goals in motion yet. Add one on the Goals screen.</div>`;

  el.innerHTML = `<div class="grid grid-3">
    <article class="card stat"><span class="stat-label">Total saved</span><span class="stat-value">${money(savedTotal)}</span><span class="stat-note">Across ${state.funds.length} ${state.funds.length === 1 ? "fund" : "funds"}</span></article>
    <article class="card stat"><span class="stat-label">Debt still owed</span><span class="stat-value">${money(debtTotal)}</span><span class="stat-note">Across ${state.debts.length} ${state.debts.length === 1 ? "debt" : "debts"}</span></article>
    <article class="card stat safe"><span class="stat-label">Safe to spend this month</span><span class="stat-value">${money(st.safe)}</span><span class="stat-note">${esc(fmtMonth(ym))}</span></article>
    <article class="card stat"><span class="stat-label">Debt minimums</span><span class="stat-value">${money(minimums)}</span><span class="stat-note">Total monthly payments</span></article>
    <article class="card stat"><span class="stat-label">Goals in progress</span><span class="stat-value">${inProgress.length}</span><span class="stat-note">${activeGoals.length} still open in total</span></article>
    <article class="card stat"><span class="stat-label">Latest paycheck</span><span class="stat-value" style="font-size:1.25rem">${pay ? esc(pay.entry.name || "Paycheck") : "Not logged"}</span><span class="stat-note">${pay ? fmtDate(pay.entry.date) + " · " + money(pay.left) + " left" : "Add one from Home"}</span></article>
  </div>

  <section class="card">
    <div class="card-head"><h2>Upcoming, next 30 days</h2><button type="button" class="btn btn-secondary btn-small" data-action="nav" data-view="calendar">Open calendar</button></div>
    <div class="item-list">${upcomingRows}</div>
    ${upcoming.length > shown.length ? `<p class="hint" style="margin-top:10px">${upcoming.length - shown.length} more in the Calendar.</p>` : ""}
  </section>

  <section class="card">
    <div class="card-head"><h2>Goals in motion</h2><button type="button" class="btn btn-secondary btn-small" data-action="nav" data-view="goals">Open goals</button></div>
    <div class="item-list">${goalRows}</div>
  </section>

  <section class="card">
    <div class="card-head"><h2>This month's notes</h2><button type="button" class="btn btn-secondary btn-small" data-action="nav" data-view="home">Edit on Home</button></div>
    ${notes ? `<p class="notice" style="white-space:pre-wrap">${esc(notes)}</p>` : `<div class="empty">No notes for this month yet.</div>`}
  </section>`;
}

function calendarTypeLabel(type) {
  return ({
    note: "Note",
    bill: "Bill due",
    payday: "Payday",
    debt: "Debt payment",
    savings: "Savings"
  }[type] || "Entry");
}

function calendarCountsLabel(entry) {
  if (entry.countsAsKind === "envelope") return "Envelope: " + ((getCategory(entry.countsAsId) || {}).name || "removed");
  if (entry.countsAsKind === "debt") return "Debt: " + ((getDebt(entry.countsAsId) || {}).name || "removed");
  if (entry.countsAsKind === "savings") return "Savings: " + ((getFund(entry.countsAsId) || {}).purpose || "removed");
  return "Income";
}

function goalStatusLabel(status) {
  return ({ "not-started": "Not started", "in-progress": "In progress", "done": "Done" }[status] || "Not started");
}

/* ============================================================
   Calendar
   ============================================================ */
function repeatLabel(repeat) {
  return ({
    none: "Does not repeat",
    daily: "Repeats daily",
    weekly: "Repeats weekly",
    biweekly: "Repeats every two weeks",
    "twice-monthly": "Repeats twice a month",
    monthly: "Repeats monthly"
  }[repeat] || "Does not repeat");
}

function renderCalendar() {
  const el = $("#view-calendar");
  if (!el) return;
  const y = ui.calYear;
  const m = ui.calMonth;
  const dim = daysInMonth(y, m);
  const offset = new Date(y, m - 1, 1).getDay();
  const today = isoToday();
  const byDay = {};
  const upcoming = [];

  for (const entry of state.calendar) {
    for (const date of occurrencesInMonth(entry, y, m)) {
      (byDay[date] = byDay[date] || []).push(entry);
      if (entry.type !== "note") upcoming.push({ entry, date, done: isDone(entry, date) });
    }
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  let cells = "";
  for (let i = 0; i < offset; i++) cells += `<div class="cal-day other" aria-hidden="true"></div>`;
  for (let d = 1; d <= dim; d++) {
    const iso = `${y}-${pad2(m)}-${pad2(d)}`;
    const list = byDay[iso] || [];
    const dots = list.slice(0, 3).map(() => `<span class="cal-dot"></span>`).join("");
    cells += `<button type="button" class="cal-day ${list.length ? "has-entries" : ""} ${iso === today ? "today" : ""}" data-action="open-day" data-date="${iso}" aria-label="${fmtDate(iso)}${list.length ? ", " + list.length + " entries" : ""}">
      <span class="cal-num">${d}</span>
      ${list.length ? `<span class="cal-dots">${dots}</span>` : ""}
      ${list.length ? `<span class="cal-count">${list.length}</span>` : ""}
    </button>`;
  }

  const upcomingRows = upcoming.length ? upcoming.map(o => `<div class="list-row ${o.done ? "done" : ""}">
    <label class="list-check">
      <input type="checkbox" data-done data-entry="${o.entry.id}" data-date="${o.date}" ${o.done ? "checked" : ""} data-change>
      <span class="sr-only">Mark ${esc(o.entry.name)} on ${fmtDate(o.date)} as done</span>
    </label>
    <div class="list-main">
      <div class="list-title">${esc(o.entry.name)}</div>
      <div class="list-meta">${esc(calendarTypeLabel(o.entry.type))} · ${fmtDate(o.date)} · ${esc(calendarCountsLabel(o.entry))}${o.entry.repeat !== "none" ? " · " + repeatLabel(o.entry.repeat) : ""}</div>
    </div>
    <div class="list-amount">${money(o.entry.amount)}</div>
    <div class="row-actions">
      ${o.entry.type === "payday" && !o.done ? `<button type="button" class="btn btn-secondary" data-action="log-payday" data-id="${o.entry.id}" data-date="${o.date}" data-change>Add as income</button>` : ""}
      <button type="button" class="btn btn-secondary" data-action="edit-entry" data-id="${o.entry.id}" data-date="${o.date}" data-change>Edit</button>
      <button type="button" class="btn btn-secondary" data-action="delete-entry" data-id="${o.entry.id}" data-date="${o.date}" data-change>Delete</button>
    </div>
  </div>`).join("") : `<div class="empty">No bills, paydays, debt payments, or savings entries in ${esc(fmtMonth(`${y}-${pad2(m)}`))}. Click any day to add one.</div>`;

  el.innerHTML = `<section class="card">
    <div class="card-head">
      <div class="month-nav">
        <button type="button" class="icon-btn" data-action="cal-prev" aria-label="Previous month">‹</button>
        <span class="year-label" style="min-width:150px">${MONTHS[m - 1]} ${y}</span>
        <button type="button" class="icon-btn" data-action="cal-next" aria-label="Next month">›</button>
      </div>
      <button type="button" class="btn btn-secondary btn-small" data-action="cal-today">Today</button>
    </div>
    <div class="cal-grid" role="grid" aria-label="Calendar for ${MONTHS[m - 1]} ${y}">
      ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => `<div class="cal-dow" role="columnheader">${d}</div>`).join("")}
      ${cells}
    </div>
    <p class="hint" style="margin-top:10px">Days with entries are outlined. Click a day to add, edit, or delete an entry.</p>
  </section>

  <section class="card">
    <div class="card-head"><h2>This month's entries</h2><button type="button" class="btn btn-primary btn-small" data-action="new-entry" data-date="${y}-${pad2(m)}-01" data-change>Add entry</button></div>
    <div class="item-list">${upcomingRows}</div>
  </section>`;
}

function openDayModal(date) {
  const [y, m] = date.split("-").map(Number);
  const entries = state.calendar.filter(e => occurrencesInMonth(e, y, m).includes(date));
  const rows = entries.length ? entries.map(entry => `<div class="list-row">
    <div class="list-main">
      <div class="list-title">${esc(entry.name)}</div>
      <div class="list-meta">${esc(calendarTypeLabel(entry.type))} · ${esc(calendarCountsLabel(entry))} · ${repeatLabel(entry.repeat)}${isDone(entry, date) ? " · Done" : ""}</div>
      ${entry.notes ? `<div class="list-meta">${esc(entry.notes)}</div>` : ""}
    </div>
    <div class="list-amount">${money(entry.amount)}</div>
    <div class="row-actions">
      <button type="button" class="btn btn-secondary" data-action="edit-entry" data-id="${entry.id}" data-date="${date}" data-change>Edit</button>
      <button type="button" class="btn btn-secondary" data-action="delete-entry" data-id="${entry.id}" data-date="${date}" data-change>Delete</button>
    </div>
  </div>`).join("") : `<div class="empty">Nothing on this day yet.</div>`;

  openModal({
    title: fmtDate(date),
    body: `<div class="item-list">${rows}</div>`,
    hideSubmit: true,
    actionsHtml: `<button type="button" class="btn btn-primary" data-action="new-entry" data-date="${date}" data-change>Add entry for this day</button>`
  });
}

/* ============================================================
   Goals
   ============================================================ */
function renderGoals() {
  const el = $("#view-goals");
  if (!el) return;
  const counts = {
    "not-started": state.goals.filter(g => g.status === "not-started").length,
    "in-progress": state.goals.filter(g => g.status === "in-progress").length,
    "done": state.goals.filter(g => g.status === "done").length
  };
  const tiles = state.goals.length ? state.goals.map(g => {
    const target = nonNeg(g.target);
    const saved = nonNeg(g.saved);
    const progress = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
    const cycleLabel = g.status === "not-started" ? "Mark in progress" : g.status === "in-progress" ? "Mark done" : "Reopen goal";
    return `<article class="tile">
      <div class="tile-top">
        <h3>${esc(g.name)}</h3>
        <span class="badge ${g.status === "done" ? "done" : g.status === "in-progress" ? "progress" : "not-started"}">${goalStatusLabel(g.status)}</span>
      </div>
      <div class="tile-amounts"><span>Set aside <strong>${money(saved)}</strong></span><span>Target <strong>${money(target)}</strong></span></div>
      <div class="progress-line">${progressHTML(progress, `Progress for ${g.name}`)}<span class="progress-pct">${Math.round(progress)}%</span></div>
      <div class="tile-amounts"><span>${target > saved ? money(target - saved) + " to go" : "Target reached"}</span><span>${g.targetDate ? "Target " + fmtDate(g.targetDate) : "No target date"}</span></div>
      ${g.notes ? `<p class="tile-notes">${esc(g.notes)}</p>` : ""}
      <div class="row-actions">
        <button type="button" class="btn btn-secondary btn-small" data-action="cycle-goal" data-id="${g.id}" data-change>${cycleLabel}</button>
        <button type="button" class="btn btn-secondary btn-small" data-action="edit-goal" data-id="${g.id}" data-change>Edit</button>
        <button type="button" class="btn btn-secondary btn-small" data-action="delete-goal" data-id="${g.id}" data-change>Delete</button>
      </div>
    </article>`;
  }).join("") : `<div class="empty"><strong>No goals yet.</strong> Add a money target so progress has somewhere to go.</div>`;

  el.innerHTML = `<div class="grid grid-3">
    <article class="card stat"><span class="stat-label">Not started</span><span class="stat-value">${counts["not-started"]}</span></article>
    <article class="card stat"><span class="stat-label">In progress</span><span class="stat-value">${counts["in-progress"]}</span></article>
    <article class="card stat"><span class="stat-label">Done</span><span class="stat-value">${counts.done}</span></article>
  </div>

  <section class="card">
    <div class="card-head">
      <h2>Your goals</h2>
      <button type="button" class="btn btn-primary btn-small" data-action="new-goal" data-change>New goal</button>
    </div>
    <div class="tile-grid">${tiles}</div>
  </section>`;
}

/* ============================================================
   Savings
   ============================================================ */
function renderSavings() {
  const el = $("#view-savings");
  if (!el) return;
  const totalSaved = sum(state.funds.map(f => nonNeg(f.saved)));
  const totalTarget = sum(state.funds.map(f => nonNeg(f.target)));
  const overall = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;

  const tiles = state.funds.length ? state.funds.map(f => {
    const target = nonNeg(f.target);
    const saved = nonNeg(f.saved);
    const progress = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
    const remaining = Math.max(0, target - saved);
    const needed = fundMonthlyNeeded(f);
    let neededText = "Add a target date to see a monthly amount.";
    if (needed) {
      if (needed.months <= 0) neededText = "The target date has passed. Set a new date or keep saving.";
      else if (needed.amount <= 0) neededText = "Target reached. Nothing more is needed.";
      else neededText = `${money(needed.amount)} a month for ${needed.months} ${needed.months === 1 ? "month" : "months"} to reach the target date.`;
    }
    return `<article class="tile">
      <div class="tile-top"><h3>${esc(f.purpose)}</h3><span class="badge ${progress >= 100 ? "done" : "left"}">${Math.round(progress)}% reached</span></div>
      <div class="tile-amounts"><span>Saved <strong>${money(saved)}</strong></span><span>Target <strong>${money(target)}</strong></span></div>
      <div class="progress-line">${progressHTML(progress, `Progress for ${f.purpose}`)}<span class="progress-pct">${Math.round(progress)}%</span></div>
      <div class="tile-amounts"><span>${remaining > 0 ? money(remaining) + " remaining" : "Target reached"}</span><span>${f.targetDate ? "By " + fmtDate(f.targetDate) : "No target date"}</span></div>
      <p class="tile-notes">${esc(neededText)}</p>
      <div class="row-actions">
        <button type="button" class="btn btn-primary btn-small" data-action="add-money" data-id="${f.id}" data-change>Add money</button>
        <button type="button" class="btn btn-secondary btn-small" data-action="edit-fund" data-id="${f.id}" data-change>Edit</button>
        <button type="button" class="btn btn-secondary btn-small" data-action="delete-fund" data-id="${f.id}" data-change>Delete</button>
      </div>
    </article>`;
  }).join("") : `<div class="empty"><strong>No savings funds yet.</strong> Add one for something you are setting money aside for.</div>`;

  el.innerHTML = `<div class="grid grid-3">
    <article class="card stat"><span class="stat-label">Total saved</span><span class="stat-value">${money(totalSaved)}</span><span class="stat-note">All funds together</span></article>
    <article class="card stat"><span class="stat-label">Combined target</span><span class="stat-value">${money(totalTarget)}</span><span class="stat-note">All fund targets</span></article>
    <article class="card stat safe"><span class="stat-label">Overall progress</span><span class="stat-value">${Math.round(overall)}%</span><div style="margin-top:6px">${progressHTML(overall, "Overall savings progress")}</div></article>
  </div>

  <section class="card">
    <div class="card-head">
      <h2>Savings funds</h2>
      <button type="button" class="btn btn-primary btn-small" data-action="new-fund" data-change>New fund</button>
    </div>
    <div class="tile-grid">${tiles}</div>
  </section>

  <section class="card">
    <h2>How the monthly amount is worked out</h2>
    <p class="hint">When a fund has a target date, the planner divides the money still needed by the months left until that date. It is a simple estimate, not a promise or advice.</p>
  </section>`;
}

/* ============================================================
   Debt
   ============================================================ */
function renderDebt() {
  const el = $("#view-debt");
  if (!el) return;
  const totalOwed = sum(state.debts.map(d => nonNeg(d.balance)));
  const minimums = sum(state.debts.map(d => nonNeg(d.monthlyPayment)));
  const weighted = totalOwed > 0
    ? sum(state.debts.map(d => nonNeg(d.apr) * nonNeg(d.balance))) / totalOwed
    : 0;

  const sorted = state.debts.slice().sort((a, b) => {
    if (state.settings.focusOrder === "snowball") return nonNeg(a.balance) - nonNeg(b.balance);
    return nonNeg(b.apr) - nonNeg(a.apr);
  });

  const focusList = sorted.length ? sorted.map((d, i) => `<div class="list-row">
    <div class="list-main"><div class="list-title">${i + 1}. ${esc(d.name)}</div><div class="list-meta">${money(d.balance)} owed · ${nonNeg(d.apr).toFixed(2)}% APR</div></div>
    <div class="list-amount">${money(d.monthlyPayment)}/mo</div>
  </div>`).join("") : `<div class="empty">Add a debt to see a suggested focus order.</div>`;

  const tiles = state.debts.length ? state.debts.map(d => {
    const balance = nonNeg(d.balance);
    const paid = debtPaidTotal(d.id);
    const original = balance + paid;
    const paidPct = original > 0 ? Math.min(100, (paid / original) * 100) : 0;
    const estimate = payoffEstimate(d);
    return `<article class="tile">
      <div class="tile-top"><h3>${esc(d.name)}</h3><span class="badge ${paidPct >= 100 ? "done" : "progress"}">${Math.round(paidPct)}% paid off</span></div>
      <div class="tile-amounts"><span>Balance <strong>${money(balance)}</strong></span><span>APR <strong>${nonNeg(d.apr).toFixed(2)}%</strong></span></div>
      <div class="progress-line">${progressHTML(paidPct, `Payoff progress for ${d.name}`)}<span class="progress-pct">${Math.round(paidPct)}%</span></div>
      <div class="tile-amounts"><span>Monthly payment <strong>${money(d.monthlyPayment)}</strong></span><span>Estimate: ${esc(estimate.label)}</span></div>
      <p class="tile-notes">${paid > 0 ? `${money(paid)} of payments logged since you started. ` : ""}Payoff is an estimate based on the current balance, APR, and payment.</p>
      <div class="row-actions">
        <button type="button" class="btn btn-primary btn-small" data-action="record-payment" data-id="${d.id}" data-change>Record payment</button>
        <button type="button" class="btn btn-secondary btn-small" data-action="edit-debt" data-id="${d.id}" data-change>Edit</button>
        <button type="button" class="btn btn-secondary btn-small" data-action="delete-debt" data-id="${d.id}" data-change>Delete</button>
      </div>
    </article>`;
  }).join("") : `<div class="empty"><strong>No debts tracked yet.</strong> Add one to see a payoff estimate.</div>`;

  el.innerHTML = `<div class="grid grid-3">
    <article class="card stat"><span class="stat-label">Total still owed</span><span class="stat-value">${money(totalOwed)}</span><span class="stat-note">All debts</span></article>
    <article class="card stat"><span class="stat-label">Monthly minimums</span><span class="stat-value">${money(minimums)}</span><span class="stat-note">Total of monthly payments</span></article>
    <article class="card stat"><span class="stat-label">Average interest rate</span><span class="stat-value">${weighted.toFixed(2)}%</span><span class="stat-note">Weighted by balance</span></article>
  </div>

  <section class="card">
    <h2>Which debt to focus on</h2>
    <div class="grid grid-2">
      <label class="check-field">
        <input type="radio" name="focus-order" value="avalanche" data-setting="focus-order" ${state.settings.focusOrder === "avalanche" ? "checked" : ""}>
        <span><strong>Highest interest first (avalanche)</strong><span class="hint">Put any extra money toward the debt with the highest APR first, which usually costs less in interest over time.</span></span>
      </label>
      <label class="check-field">
        <input type="radio" name="focus-order" value="snowball" data-setting="focus-order" ${state.settings.focusOrder === "snowball" ? "checked" : ""}>
        <span><strong>Smallest balance first (snowball)</strong><span class="hint">Put any extra money toward the smallest balance first, which can give you a quick win and fewer accounts to track.</span></span>
      </label>
    </div>
    <h3 style="margin-top:16px">Suggested order</h3>
    <div class="item-list">${focusList}</div>
  </section>

  <section class="card">
    <div class="card-head">
      <h2>Your debts</h2>
      <button type="button" class="btn btn-primary btn-small" data-action="new-debt" data-change>New debt</button>
    </div>
    <div class="tile-grid">${tiles}</div>
  </section>

  <section class="card">
    <h2>About these estimates</h2>
    <p class="hint">Payoff months are a rough estimate from the balance, APR, and monthly payment you entered. They assume the rate and payment stay the same and that no new charges are added. They are not a promise or financial advice.</p>
  </section>`;
}

/* ============================================================
   Envelopes — monthly page
   ============================================================ */
function envelopeTabsHTML() {
  const monthTabs = MONTHS.map((name, i) => `<button type="button" role="tab" class="tab" aria-selected="${ui.envTab === "month" && ui.month === i + 1}" data-action="env-tab" data-tab="month" data-month="${i + 1}">${MONTHS_SHORT[i]}</button>`).join("");
  return `<div class="tab-scroll" role="tablist" aria-label="Budget pages">
    ${monthTabs}
    <button type="button" role="tab" class="tab" aria-selected="${ui.envTab === "year"}" data-action="env-tab" data-tab="year">Yearly review</button>
    <button type="button" role="tab" class="tab" aria-selected="${ui.envTab === "log"}" data-action="env-tab" data-tab="log">Transaction log</button>
  </div>`;
}

function renderEnvelopes() {
  const el = $("#view-envelopes");
  if (!el) return;
  const ym = `${ui.year}-${pad2(ui.month)}`;
  const tabsCard = `<section class="card">
    <div class="card-head">
      <div class="month-nav">
        <button type="button" class="icon-btn" data-action="env-year" data-delta="-1" aria-label="Previous year">‹</button>
        <span class="year-label">${ui.year}</span>
        <button type="button" class="icon-btn" data-action="env-year" data-delta="1" aria-label="Next year">›</button>
      </div>
      <span class="hint">${esc(fmtMonth(ym))}</span>
    </div>
    ${envelopeTabsHTML()}
  </section>`;

  let content = "";
  if (ui.envTab === "year") content = yearlyReviewHTML(ui.year);
  else if (ui.envTab === "log") content = transactionLogHTML(ym);
  else content = envelopeMonthHTML(ym);

  el.innerHTML = tabsCard + content;
}

function budgetEntryRow(kind, entry, fallbackName) {
  const actionBase = kind === "spending" ? "spending" : kind === "debt" ? "debt-payment" : kind === "savings" ? "savings-entry" : "income";
  return `<div class="list-row">
    <div class="list-main">
      <div class="list-title">${esc(entry.name || fallbackName)}</div>
      <div class="list-meta">${fmtDate(entry.date)}${entry.notes ? " · " + esc(entry.notes) : ""}</div>
    </div>
    <div class="list-amount">${money(entry.amount)}</div>
    <div class="row-actions">
      <button type="button" class="btn btn-secondary" data-action="edit-${actionBase}" data-id="${entry.id}" data-change>Edit</button>
      <button type="button" class="btn btn-secondary" data-action="delete-${actionBase}" data-id="${entry.id}" data-change>Delete</button>
    </div>
  </div>`;
}

function envelopeMonthHTML(ym) {
  const st = safeToSpend(ym);
  const m = monthOr(ym);
  const cats = state.categories.map(c => ({ id: c.id, name: c.name, ...categoryStats(ym, c.id) }));
  const expected = nonNeg(m.expectedIncome);
  const incomeRows = m.incomes.length ? m.incomes.slice().sort((a, b) => a.date.localeCompare(b.date)).map(e => `<div class="list-row">
    <div class="list-main">
      <div class="list-title">${esc(e.name || "Income")} ${e.isPaycheck ? '<span class="badge progress">Paycheck</span>' : ""}</div>
      <div class="list-meta">${fmtDate(e.date)}${(e.allocations || []).length ? " · " + e.allocations.length + " assignments" : ""}</div>
    </div>
    <div class="list-amount">${money(e.amount)}</div>
    <div class="row-actions">
      ${e.isPaycheck ? `<button type="button" class="btn btn-secondary" data-action="assign-paycheck" data-id="${e.id}" data-change>Assign money</button>` : ""}
      <button type="button" class="btn btn-secondary" data-action="edit-income" data-id="${e.id}" data-change>Edit</button>
      <button type="button" class="btn btn-secondary" data-action="delete-income" data-id="${e.id}" data-change>Delete</button>
    </div>
  </div>`).join("") : `<div class="empty">No income logged yet. Add a paycheck or an income entry.</div>`;

  const categoryTiles = cats.length ? cats.map(c => {
    const entries = c.entries.slice().sort((a, b) => a.date.localeCompare(b.date));
    const rows = entries.length ? entries.map(e => budgetEntryRow("spending", e, c.name)).join("") : `<div class="empty">No spending in ${esc(c.name)} this month.</div>`;
    return `<article class="tile">
      <div class="tile-top">
        <h3>${esc(c.name)}</h3>
        <span class="badge ${c.over ? "over" : "left"}">${c.over ? money(-c.left) + " over" : money(c.left) + " left"}</span>
      </div>
      <div class="tile-amounts"><span>Budget <strong>${money(c.budget)}</strong></span><span>Spent <strong>${money(c.spent)}</strong></span></div>
      <div class="progress-line">${progressHTML(c.budget > 0 ? (c.spent / c.budget) * 100 : c.spent > 0 ? 100 : 0, `Budget use for ${c.name}`, c.over ? "over" : "")}<span class="progress-pct">${c.over ? "Over" : "Left"}</span></div>
      <div class="row-actions">
        <button type="button" class="btn btn-secondary btn-small" data-action="rename-category" data-id="${c.id}" data-change>Rename</button>
        <button type="button" class="btn btn-secondary btn-small" data-action="delete-category" data-id="${c.id}" data-change>Delete</button>
      </div>
      <details class="cat-detail">
        <summary><span>Entries <span class="hint">(${entries.length})</span></span><span class="hint">Edit or delete below</span></summary>
        <div class="cat-detail-body"><div class="item-list">${rows}</div></div>
      </details>
    </article>`;
  }).join("") : `<div class="empty">No spending categories yet. Add one below.</div>`;

  const debtRows = m.debt.entries.length ? m.debt.entries.slice().sort((a, b) => a.date.localeCompare(b.date)).map(e => {
    const debt = getDebt(e.debtId);
    return budgetEntryRow("debt", e, debt ? debt.name : "Debt payment");
  }).join("") : `<div class="empty">No debt payments logged this month.</div>`;

  const savingsRows = m.savings.entries.length ? m.savings.entries.slice().sort((a, b) => a.date.localeCompare(b.date)).map(e => {
    const fund = getFund(e.fundId);
    return budgetEntryRow("savings", e, fund ? fund.purpose : "Savings contribution");
  }).join("") : `<div class="empty">No savings contributions logged this month.</div>`;

  const debtPaid = sum(m.debt.entries.map(e => nonNeg(e.amount)));
  const savingsSaved = sum(m.savings.entries.map(e => nonNeg(e.amount)));
  const catOptions = state.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");

  return `<div class="grid grid-3">
    <article class="card stat income"><span class="stat-label">Income</span><span class="stat-value">${money(st.in)}</span><span class="stat-note">Expected ${money(expected)}</span></article>
    <article class="card stat spend"><span class="stat-label">Total spending</span><span class="stat-value">${money(st.out)}</span><span class="stat-note">Envelopes, debt, savings</span></article>
    <article class="card stat safe"><span class="stat-label">Safe to spend</span><span class="stat-value">${money(st.safe)}</span><span class="stat-note">${st.shortfall > 0 ? money(st.shortfall) + " short" : "Bills still due are subtracted"}</span></article>
  </div>

  <section class="card">
    <div class="card-head">
      <h2>Monthly plan</h2>
      <button type="button" class="btn btn-secondary btn-small" data-action="edit-plan" data-ym="${ym}" data-change>Edit monthly plan</button>
    </div>
    <div class="grid grid-3">
      <div class="stat"><span class="stat-label">Expected income</span><span class="stat-value" style="font-size:1.3rem">${money(expected)}</span><span class="stat-note">Used only until you log income</span></div>
      <div class="stat"><span class="stat-label">Envelope budgets</span><span class="stat-value" style="font-size:1.3rem">${money(sum(cats.map(c => c.budget)))}</span><span class="stat-note">Planned across categories</span></div>
      <div class="stat"><span class="stat-label">Debt + savings budgets</span><span class="stat-value" style="font-size:1.3rem">${money(nonNeg(m.debt.budget) + nonNeg(m.savings.budget))}</span><span class="stat-note">Planned for this month</span></div>
    </div>
  </section>

  <section class="card">
    <h2>Quick add</h2>
    <form class="quick-add" data-form="quick-add" data-ym="${ym}">
      <label class="field">What is it?
        <select name="type" data-quick-type>
          <option value="spending">Spending</option>
          <option value="income">Income</option>
        </select>
      </label>
      <label class="field">Amount
        <input type="number" name="amount" min="0.01" step="0.01" inputmode="decimal" required>
      </label>
      <label class="field">Name (optional)
        <input type="text" name="name" maxlength="80" placeholder="Short description">
      </label>
      <label class="field">Date
        <input type="date" name="date" value="${ym === ymNow() ? isoToday() : ym + "-01"}" required>
      </label>
      <label class="field field-wide" data-when="spending">Category
        <select name="catId">${catOptions || `<option value="">Add a category first</option>`}</select>
      </label>
      <label class="check-field field-wide" data-when="income" hidden>
        <input type="checkbox" name="isPaycheck">
        <span>This is a paycheck I want to assign<span class="hint">Assigning is a plan. It does not change the totals.</span></span>
      </label>
      <div class="form-actions field-wide"><button type="submit" class="btn btn-primary" data-change>Add entry</button></div>
      <div class="form-error inline" data-form-error hidden></div>
    </form>
  </section>

  <section class="card">
    <div class="card-head">
      <h2>Income</h2>
      <button type="button" class="btn btn-primary btn-small" data-action="new-income" data-change>Add income</button>
    </div>
    <div class="item-list">${incomeRows}</div>
  </section>

  <section class="card">
    <div class="card-head">
      <h2>Spending envelopes</h2>
      <button type="button" class="btn btn-primary btn-small" data-action="new-category" data-change>New category</button>
    </div>
    <div class="tile-grid">${categoryTiles}</div>
  </section>

  <section class="card">
    <div class="card-head">
      <h2>Debt payments</h2>
      <button type="button" class="btn btn-primary btn-small" data-action="add-debt-payment" data-change>Add payment</button>
    </div>
    <div class="tile-amounts" style="margin-bottom:10px">
      <span>Budgeted <strong>${money(m.debt.budget)}</strong></span>
      <span>Paid <strong>${money(debtPaid)}</strong></span>
      <span>${debtPaid > nonNeg(m.debt.budget) ? `<span class="badge over">${money(debtPaid - nonNeg(m.debt.budget))} over budget</span>` : `<span class="badge left">${money(Math.max(0, nonNeg(m.debt.budget) - debtPaid))} left in budget</span>`}</span>
    </div>
    <div class="item-list">${debtRows}</div>
  </section>

  <section class="card">
    <div class="card-head">
      <h2>Savings contributions</h2>
      <button type="button" class="btn btn-primary btn-small" data-action="add-savings-contribution" data-change>Add contribution</button>
    </div>
    <div class="tile-amounts" style="margin-bottom:10px">
      <span>Budgeted <strong>${money(m.savings.budget)}</strong></span>
      <span>Saved <strong>${money(savingsSaved)}</strong></span>
      <span>${savingsSaved > nonNeg(m.savings.budget) ? `<span class="badge over">${money(savingsSaved - nonNeg(m.savings.budget))} over budget</span>` : `<span class="badge left">${money(Math.max(0, nonNeg(m.savings.budget) - savingsSaved))} left in budget</span>`}</span>
    </div>
    <div class="item-list">${savingsRows}</div>
  </section>

  <section class="card">
    <h2>Monthly notes</h2>
    <form data-form="notes" data-ym="${ym}">
      <label class="field">Anything you want to remember about ${esc(fmtMonth(ym))}
        <textarea name="notes" rows="4" placeholder="A short note is enough.">${esc(m.notes)}</textarea>
      </label>
      <div class="form-actions"><button type="submit" class="btn btn-primary" data-change>Save notes</button></div>
      <div class="form-error inline" data-form-error hidden></div>
    </form>
  </section>`;
}

/* ============================================================
   Envelopes — yearly review
   ============================================================ */
function yearlyReviewHTML(year) {
  const rows = MONTHS.map((name, i) => {
    const ym = `${year}-${pad2(i + 1)}`;
    const st = safeToSpend(ym);
    return { ym, name, income: st.in, out: st.out, net: st.in - st.out };
  });
  const totalIn = sum(rows.map(r => r.income));
  const totalOut = sum(rows.map(r => r.out));
  const net = totalIn - totalOut;
  const maxBar = Math.max(1, ...rows.map(r => Math.max(r.income, r.out)));
  const hasData = rows.some(r => r.income > 0 || r.out > 0);

  const chart = rows.map(r => `<div class="year-col" title="${esc(r.name)}: in ${esc(money(r.income))}, out ${esc(money(r.out))}">
    <div class="year-bars">
      <span class="year-bar income" style="height:${pct(r.income, maxBar)}%"></span>
      <span class="year-bar spend" style="height:${pct(r.out, maxBar)}%"></span>
    </div>
    <span class="year-month">${r.name.slice(0, 1)}</span>
  </div>`).join("");

  const tableRows = rows.map(r => `<tr>
    <td data-label="Month">${r.name}</td>
    <td data-label="Money in" class="num">${money(r.income)}</td>
    <td data-label="Money out" class="num">${money(r.out)}</td>
    <td data-label="Net" class="num">${money(r.net)}</td>
  </tr>`).join("");

  const savingsContributions = sum(rows.map(r => sum(monthOr(r.ym).savings.entries.map(e => nonNeg(e.amount)))));
  const savedNow = sum(state.funds.map(f => nonNeg(f.saved)));
  const combinedTarget = sum(state.funds.map(f => nonNeg(f.target)));
  const savingsProgress = combinedTarget > 0 ? Math.min(100, (savedNow / combinedTarget) * 100) : 0;

  const debtPayments = sum(rows.map(r => sum(monthOr(r.ym).debt.entries.map(e => nonNeg(e.amount)))));
  const debtTotal = sum(state.debts.map(d => nonNeg(d.balance)));
  const avgApr = debtTotal > 0 ? sum(state.debts.map(d => nonNeg(d.apr) * nonNeg(d.balance))) / debtTotal : 0;
  const roughInterest = sum(state.debts.map(d => nonNeg(d.balance) * (nonNeg(d.apr) / 100)));

  return `<div class="grid grid-3">
    <article class="card stat income"><span class="stat-label">Yearly income</span><span class="stat-value">${money(totalIn)}</span><span class="stat-note">Sum of the twelve monthly figures</span></article>
    <article class="card stat spend"><span class="stat-label">Yearly money out</span><span class="stat-value">${money(totalOut)}</span><span class="stat-note">Envelopes, debt, savings</span></article>
    <article class="card stat safe"><span class="stat-label">Net for the year</span><span class="stat-value">${money(net)}</span><span class="stat-note">${net >= 0 ? "Money in is higher" : "Money out is higher"}</span></article>
  </div>

  <section class="card">
    <div class="card-head">
      <h2>Income vs. spending by month</h2>
      <div class="legend"><span class="legend-item"><span class="swatch" style="background:var(--muted);opacity:.55"></span>Income</span><span class="legend-item"><span class="swatch" style="background:var(--accent)"></span>Spending</span></div>
    </div>
    ${hasData ? `<div class="year-chart" role="img" aria-label="Monthly income and spending for ${year}">${chart}</div>` : `<div class="empty">No income or spending recorded for ${year} yet.</div>`}
    <p class="hint" style="margin-top:12px">Yearly totals are the sum of the twelve monthly tabs. Rollover, when it is on, is included in each monthly figure exactly as it appears on that month.</p>
  </section>

  <section class="card">
    <h2>Month by month</h2>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Month</th><th class="num">Money in</th><th class="num">Money out</th><th class="num">Net</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  </section>

  <div class="grid grid-2">
    <section class="card">
      <h2>Savings this year</h2>
      <dl class="breakdown">
        <div class="breakdown-row"><dt>Contributions logged this year</dt><dd>${money(savingsContributions)}</dd></div>
        <div class="breakdown-row"><dt>Total saved across all funds now</dt><dd>${money(savedNow)}</dd></div>
        <div class="breakdown-row"><dt>Combined target</dt><dd>${money(combinedTarget)}</dd></div>
        <div class="breakdown-row total"><dt>Overall progress</dt><dd>${Math.round(savingsProgress)}%</dd></div>
      </dl>
      ${progressHTML(savingsProgress, "Overall savings progress")}
    </section>
    <section class="card">
      <h2>Debt this year</h2>
      <dl class="breakdown">
        <div class="breakdown-row"><dt>Debt payments logged this year</dt><dd>${money(debtPayments)}</dd></div>
        <div class="breakdown-row"><dt>Total still owed now</dt><dd>${money(debtTotal)}</dd></div>
        <div class="breakdown-row"><dt>Average interest rate</dt><dd>${avgApr.toFixed(2)}%</dd></div>
        <div class="breakdown-row"><dt>Rough yearly interest estimate</dt><dd>${money(roughInterest)}</dd></div>
      </dl>
      <p class="hint">The interest figure is a rough estimate only: current balances × current APR, before any new charges or rate changes. It is not exact and not financial advice.</p>
    </section>
  </div>`;
}

/* ============================================================
   Envelopes — transaction log
   ============================================================ */
function transactionLogHTML(ym) {
  const m = monthOr(ym);
  const rows = [];
  for (const e of m.incomes) {
    rows.push({ date: e.date, type: "Income", description: e.name || "Income", amount: nonNeg(e.amount), direction: "in" });
  }
  for (const [catId, c] of Object.entries(m.cats)) {
    const name = (getCategory(catId) || {}).name || "Removed category";
    for (const e of c.entries) rows.push({ date: e.date, type: name, description: e.name || "Spending", amount: nonNeg(e.amount), direction: "out" });
  }
  for (const e of m.debt.entries) {
    const debt = getDebt(e.debtId);
    rows.push({ date: e.date, type: "Debt payment", description: (debt ? debt.name : "Debt") + (e.name ? " — " + e.name : ""), amount: nonNeg(e.amount), direction: "out" });
  }
  for (const e of m.savings.entries) {
    const fund = getFund(e.fundId);
    rows.push({ date: e.date, type: "Savings", description: (fund ? fund.purpose : "Savings") + (e.name ? " — " + e.name : ""), amount: nonNeg(e.amount), direction: "out" });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));

  const outRows = rows.filter(r => r.direction === "out");
  const totalOut = sum(outRows.map(r => r.amount));
  const totalIn = sum(rows.filter(r => r.direction === "in").map(r => r.amount));
  const average = outRows.length ? totalOut / outRows.length : 0;

  const body = rows.length ? rows.map(r => `<tr>
    <td data-label="Date">${fmtDate(r.date)}</td>
    <td data-label="Type">${esc(r.type)}</td>
    <td data-label="Description">${esc(r.description)}</td>
    <td data-label="Amount" class="num">${r.direction === "in" ? "+" : "−"}${money(r.amount)}</td>
  </tr>`).join("") : `<tr><td colspan="4"><div class="empty">Nothing tracked in ${esc(fmtMonth(ym))} yet.</div></td></tr>`;

  return `<div class="grid grid-3">
    <article class="card stat spend"><span class="stat-label">Total money out</span><span class="stat-value">${money(totalOut)}</span><span class="stat-note">${outRows.length} tracked ${outRows.length === 1 ? "entry" : "entries"}</span></article>
    <article class="card stat"><span class="stat-label">Average transaction</span><span class="stat-value">${money(average)}</span><span class="stat-note">Average money-out entry</span></article>
    <article class="card stat income"><span class="stat-label">Income logged</span><span class="stat-value">${money(totalIn)}</span><span class="stat-note">Listed in the same log</span></article>
  </div>

  <section class="card">
    <div class="card-head">
      <h2>Everything tracked in ${esc(fmtMonth(ym))}</h2>
      <span class="hint">Edit entries in the monthly Envelopes tab.</span>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Date</th><th>Type</th><th>Description</th><th class="num">Amount</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  </section>`;
}

/* ============================================================
   Setup
   ============================================================ */
function renderSetup() {
  const el = $("#view-setup");
  if (!el) return;
  const s = state.settings;
  const tour = [
    ["Home", "See the month as a whole: what came in, what went out, and what is safe to spend."],
    ["Today", "A quick snapshot of savings, debt, upcoming items, and goals in motion."],
    ["Calendar", "Put bills, paydays, debt payments, savings, and notes on a day. Repeats are allowed."],
    ["Goals", "Name what you are working toward, give it a money target, and watch the progress bar move."],
    ["Savings", "Set money aside in funds. A target date gives you a simple monthly amount to aim for."],
    ["Debt", "See balances, minimums, and a rough payoff month. Choose which debt to focus on."],
    ["Envelopes", "The monthly budget: income, categories, debt payments, savings, and notes."],
    ["Settings", "Your name, colour theme, night mode, backups, and starting over."]
  ];
  const tourHTML = tour.map(([title, text]) => `<div class="tour-item"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`).join("");
  const currencyOptions = CURRENCIES.map(c => `<option value="${c.code}" ${s.currency === c.code ? "selected" : ""}>${esc(c.label)}</option>`).join("");

  el.innerHTML = `<section class="card">
    <h2>Getting started</h2>
    <p class="lead">This is a calm place to plan by paycheck and by month. Nothing connects to a bank, and there is no account to create. Start empty, or load the fictional sample if you want to look around first.</p>
    <div class="tour-grid">${tourHTML}</div>
  </section>

  <section class="card">
    <h2>Your money basics</h2>
    <div class="form-grid">
      <label class="field">Currency
        <select data-setting="currency">${currencyOptions}</select>
        <span class="hint">Changes how amounts look. It does not convert money.</span>
      </label>
      <div class="field">Starting balance month
        <p class="notice" style="margin:0">${esc(fmtMonth(s.startMonth))} — the starting balance is added once, to this first month only.</p>
      </div>
    </div>
    <form data-form="setup" style="margin-top:16px">
      <div class="form-grid">
        <label class="field">Starting balance
          <input type="number" name="startingBalance" min="0" step="0.01" inputmode="decimal" value="${nonNeg(s.startingBalance)}">
          <span class="hint">Money you already have before you start. Added once, never to every month.</span>
        </label>
        <label class="check-field">
          <input type="checkbox" name="rollover" ${s.rollover ? "checked" : ""}>
          <span>Carry unspent money into the next month<span class="hint">When this is on, money left after spending is added to the next month's income. It is shown separately so you can check it.</span></span>
        </label>
      </div>
      <div class="form-actions"><button type="submit" class="btn btn-primary" data-change>Save money basics</button></div>
      <div class="form-error inline" data-form-error hidden></div>
    </form>
  </section>

  <section class="card">
    <h2>Sample data</h2>
    <p>The planner starts empty. The sample is fictional, uses made-up names and amounts, and can be removed in one confirmed step.</p>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" data-action="load-sample" data-change>Load sample data</button>
      ${s.sampleLoaded ? `<button type="button" class="btn btn-secondary" data-action="clear-sample" data-change>Clear sample data</button>` : ""}
    </div>
    <p class="hint" style="margin-top:10px">Loading the sample does not use a demo change. Saving or deleting anything inside it does.</p>
  </section>

  <section class="card">
    <h2>Where your data lives</h2>
    <p>${esc(STORAGE_NOTE)} There is no bank connection, no login, and no server. If you clear this browser's site data, your planner data is removed too, so download a backup from Settings now and then.</p>
    <p class="hint">${esc(ADVICE_NOTE)}</p>
  </section>`;
}

/* ============================================================
   Settings
   ============================================================ */
function renderSettings() {
  const el = $("#view-settings");
  if (!el) return;
  const s = state.settings;
  const themes = Object.entries(THEMES).map(([id, theme]) => {
    const dotOne = id === "custom" ? s.customAccent : theme.primary;
    const dotTwo = id === "custom" ? s.customAccent : theme.accent;
    return `<button type="button" class="theme-option" data-action="set-theme" data-theme="${id}" aria-pressed="${s.theme === id}">
      <span class="theme-dots" aria-hidden="true"><span class="theme-dot" style="background:${dotOne}"></span><span class="theme-dot" style="background:${dotTwo}"></span></span>
      ${esc(theme.label)}
    </button>`;
  }).join("");

  const archives = state.archives.length ? state.archives.slice().reverse().map(a => `<div class="archive-row">
    <div class="list-main">
      <div class="list-title">${esc(a.label)}</div>
      <div class="list-meta">${a.year} · saved ${fmtDate(String(a.createdAt).slice(0, 10))}</div>
    </div>
    <div class="row-actions">
      <button type="button" class="btn btn-secondary btn-small" data-action="view-archive" data-id="${a.id}">View</button>
      <button type="button" class="btn btn-secondary btn-small" data-action="delete-archive" data-id="${a.id}" data-change>Delete</button>
    </div>
  </div>`).join("") : `<div class="empty">No archives yet. An archive keeps a labelled snapshot of the current year, then starts the planner fresh.</div>`;

  el.innerHTML = `<section class="card">
    <h2>Your display name</h2>
    <form data-form="display-name">
      <div class="form-grid">
        <label class="field">Display name
          <input type="text" name="displayName" maxlength="60" value="${esc(s.displayName)}" placeholder="Leave blank to keep it anonymous">
          <span class="hint">This is the only personal name in the app. It starts blank.</span>
        </label>
      </div>
      <div class="form-actions"><button type="submit" class="btn btn-primary">Save name</button></div>
    </form>
  </section>

  <section class="card">
    <h2>Colour theme</h2>
    <div class="theme-grid">${themes}</div>
    <div class="form-grid" style="margin-top:14px">
      <label class="field">Custom accent colour
        <input type="color" data-setting="custom-accent" value="${esc(s.customAccent)}">
        <span class="hint">Choosing a colour switches to “My own accent”. Theme changes never use a demo change.</span>
      </label>
      <label class="check-field">
        <input type="checkbox" data-setting="night" ${s.night ? "checked" : ""}>
        <span>Night mode<span class="hint">A dark theme with the same layout and readable contrast.</span></span>
      </label>
    </div>
  </section>

  <section class="card">
    <h2>Data controls</h2>
    <div class="data-actions">
      <div class="data-action">
        <h3>Download a backup</h3>
        <p>Save a JSON file of your planner data to this device.</p>
        <button type="button" class="btn btn-secondary" data-action="download-backup">Download backup</button>
      </div>
      <div class="data-action">
        <h3>Restore from a backup</h3>
        <p>Choose a JSON backup you downloaded from this planner. It replaces the current data.</p>
        <button type="button" class="btn btn-secondary" data-action="restore-backup" data-change>Restore backup</button>
        <input type="file" id="restore-file" data-restore-file accept=".json,application/json" hidden>
      </div>
      <div class="data-action">
        <h3>Erase everything</h3>
        <p>Clear the planner and start over. You will be asked to confirm first.</p>
        <button type="button" class="btn btn-danger" data-action="erase-all" data-change>Erase everything</button>
      </div>
      <div class="data-action">
        <h3>Yearly archive</h3>
        <p>Label a snapshot of the current year, keep it to look back at, then start the planner fresh.</p>
        <button type="button" class="btn btn-secondary" data-action="archive-year" data-change>Archive this year</button>
      </div>
    </div>
    <h3 style="margin-top:18px">Saved archives</h3>
    <div class="archive-list">${archives}</div>
  </section>

  <section class="card">
    <h2>Where your data lives</h2>
    <p>${esc(STORAGE_NOTE)} There is no bank connection, no login, no payment processing, and no tracking. A backup is the only way data leaves this browser, and you start that yourself.</p>
    <p class="hint">${esc(ADVICE_NOTE)}</p>
  </section>

  ${DEMO_MODE ? `<section class="card">
    <h2>About this demo</h2>
    <p>This copy is in demo mode. You have ${remainingChanges()} of ${DEMO_CHANGE_LIMIT} free changes left. Saving a new entry, saving an edit, deleting something, or marking an item done uses one change. Viewing, moving between months, and changing the theme do not.</p>
    <p class="hint">When the free changes run out, data-changing controls lock and the demo banner shows where to get the full version.</p>
  </section>` : ""}`;
}

/* ============================================================
   Form values and shared form behaviour
   ============================================================ */
function formValues(form) {
  const data = {};
  for (const el of Array.from(form.elements)) {
    if (!el.name) continue;
    if (el.type === "checkbox") data[el.name] = el.checked;
    else if (el.type === "radio") { if (el.checked) data[el.name] = el.value; }
    else data[el.name] = el.value;
  }
  return data;
}

function syncWhen(form) {
  const typeEl = form.querySelector("[data-quick-type]") || form.querySelector("[data-track-type]");
  if (!typeEl) return;
  const type = typeEl.value;
  form.querySelectorAll("[data-when]").forEach(el => { el.hidden = el.dataset.when !== type; });
}

function blockedByDemo() {
  if (!isLocked()) return false;
  setStatus(LOCKED_MESSAGE, "warn");
  return true;
}

/* ============================================================
   Event: submit
   ============================================================ */
function onSubmit(e) {
  const form = e.target.closest("form[data-form]");
  if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  clearFormError(form);

  if (kind === "modal") {
    if (!modalSubmit) return;
    showModalError("");
    if (isLocked()) { showModalError(LOCKED_MESSAGE); return; }
    const data = formValues(form);
    const error = modalSubmit(data, form);
    if (typeof error === "string" && error) {
      showModalError(error);
      return;
    }
    closeModal();
    return;
  }

  if (kind === "display-name") {
    const data = formValues(form);
    state.settings.displayName = String(data.displayName || "").trim().slice(0, 60);
    saveState();
    render();
    setStatus("Display name saved.");
    return;
  }

  if (isLocked()) {
    showFormError(form, LOCKED_MESSAGE);
    setStatus(LOCKED_MESSAGE, "warn");
    return;
  }

  if (kind === "setup") {
    const data = formValues(form);
    mutate(() => {
      state.settings.startingBalance = nonNeg(data.startingBalance);
      state.settings.rollover = !!data.rollover;
    }, "Money basics saved.");
    return;
  }

  if (kind === "notes") {
    const ym = form.dataset.ym;
    const data = formValues(form);
    mutate(() => {
      ensureMonth(ym).notes = String(data.notes || "").slice(0, 5000);
    }, "Notes saved.");
    return;
  }

  if (kind === "quick-add") {
    const data = formValues(form);
    const amount = num(data.amount);
    if (!(amount > 0)) { showFormError(form, "Enter an amount greater than zero."); return; }
    if (!data.date) { showFormError(form, "Choose a date for this entry."); return; }
    const targetYM = ymOf(data.date);
    if (data.type === "income") {
      const name = String(data.name || "").trim() || "Income";
      mutate(() => addIncome(targetYM, {
        date: data.date, amount, name, notes: "", isPaycheck: !!data.isPaycheck
      }), `Income saved to ${fmtMonth(targetYM)}.`);
    } else {
      if (!data.catId) { showFormError(form, "Add a spending category first, then try again."); return; }
      const name = String(data.name || "").trim() || ((getCategory(data.catId) || {}).name || "Spending");
      mutate(() => addSpending(targetYM, data.catId, {
        date: data.date, amount, name, notes: ""
      }), `Spending saved to ${fmtMonth(targetYM)}.`);
    }
  }
}

/* ============================================================
   Event: change
   ============================================================ */
function onChange(e) {
  const target = e.target;

  if (target.id === "restore-file") {
    const file = target.files && target.files[0];
    if (file) handleRestoreFile(file);
    target.value = "";
    return;
  }

  if (target.hasAttribute("data-done")) {
    if (isLocked()) {
      target.checked = !target.checked;
      setStatus(LOCKED_MESSAGE, "warn");
      return;
    }
    const entryId = target.dataset.entry;
    const date = target.dataset.date;
    mutate(() => {
      const entry = state.calendar.find(x => x.id === entryId);
      if (!entry) return false;
      entry.doneDates = entry.doneDates || [];
      if (target.checked) {
        if (!entry.doneDates.includes(date)) entry.doneDates.push(date);
      } else {
        entry.doneDates = entry.doneDates.filter(d => d !== date);
      }
    }, target.checked ? "Marked done." : "Marked not done.");
    return;
  }

  if (target.dataset.setting === "currency") {
    state.settings.currency = target.value;
    saveState();
    render();
    setStatus(`Currency changed to ${target.value}. Amounts are not converted.`);
    return;
  }

  if (target.dataset.setting === "night") {
    state.settings.night = target.checked;
    saveState();
    render();
    setStatus(target.checked ? "Night mode on." : "Night mode off.");
    return;
  }

  if (target.dataset.setting === "focus-order") {
    state.settings.focusOrder = target.value === "snowball" ? "snowball" : "avalanche";
    saveState();
    render();
    setStatus(state.settings.focusOrder === "snowball" ? "Focus order: smallest balance first." : "Focus order: highest interest first.");
    return;
  }

  if (target.dataset.setting === "custom-accent") {
    state.settings.customAccent = target.value;
    state.settings.theme = "custom";
    saveState();
    render();
    setStatus("Custom accent colour applied.");
    return;
  }

  if (target.hasAttribute("data-quick-type") || target.hasAttribute("data-track-type")) {
    const form = target.form;
    if (form) syncWhen(form);
    return;
  }

  if (target.hasAttribute("data-entry-type")) {
    const form = target.form;
    const sel = form && form.querySelector('[name="countsAs"]');
    if (sel) {
      if (target.value === "payday") sel.value = "income:";
      else if (target.value === "bill" && state.categories[0]) sel.value = "envelope:" + state.categories[0].id;
      else if (target.value === "debt" && state.debts[0]) sel.value = "debt:" + state.debts[0].id;
      else if (target.value === "savings" && state.funds[0]) sel.value = "savings:" + state.funds[0].id;
    }
  }
}

function onInput(e) {
  const target = e.target;
  if (target.form) clearFormError(target.form);
  if (!target.hasAttribute("data-alloc-input")) return;
  const form = target.form;
  if (!form) return;
  const total = sum($$("[data-alloc-input]", form).map(i => nonNeg(i.value)));
  const amount = nonNeg(form.dataset.paycheckAmount);
  const left = amount - total;
  const el = $("#alloc-left", form);
  if (el) {
    el.textContent = `Left from this paycheck: ${money(left)}`;
    el.className = left < 0 ? "notice warn" : "notice";
  }
}

function onKeydown(e) {
  if (e.key === "Escape") {
    if ($("#modal-root") && $("#modal-root").innerHTML.trim()) {
      closeModal();
      return;
    }
    const drawer = $("#nav-drawer");
    if (drawer && !drawer.hidden) closeDrawer();
    return;
  }
  if (e.key === "Tab") {
    const modal = $("#modal-root .modal");
    if (!modal) return;
    const focusable = $$('button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', modal)
      .filter(el => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

/* ============================================================
   Event: click actions
   ============================================================ */
function onClick(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  if (action === "backdrop") {
    if (e.target === el) closeModal();
    return;
  }

  switch (action) {
    case "nav":
      setView(el.dataset.view);
      return;
    case "close-modal":
      closeModal();
      return;
    case "close-drawer":
      closeDrawer();
      return;
    case "open-track":
      openTrackDialog();
      return;
    case "home-year":
      ui.year += Number(el.dataset.delta) || 0;
      render();
      return;
    case "home-month":
      ui.month = Number(el.dataset.month) || ui.month;
      render();
      return;
    case "cal-prev":
      ui.calMonth -= 1;
      if (ui.calMonth < 1) { ui.calMonth = 12; ui.calYear -= 1; }
      render();
      return;
    case "cal-next":
      ui.calMonth += 1;
      if (ui.calMonth > 12) { ui.calMonth = 1; ui.calYear += 1; }
      render();
      return;
    case "cal-today": {
      const now = new Date();
      ui.calYear = now.getFullYear();
      ui.calMonth = now.getMonth() + 1;
      render();
      return;
    }
    case "open-day":
      openDayModal(el.dataset.date);
      return;
    case "new-entry":
      openEntryForm(null, el.dataset.date);
      return;
    case "edit-entry":
      openEntryForm(el.dataset.id, el.dataset.date);
      return;
    case "delete-entry":
      requestDeleteEntry(el.dataset.id, el.dataset.date);
      return;
    case "delete-occurrence":
      if (deleteOccurrence(el.dataset.id, el.dataset.date)) closeModal();
      return;
    case "delete-series":
      if (deleteSeries(el.dataset.id)) closeModal();
      return;
    case "log-payday":
      logPayday(el.dataset.id, el.dataset.date);
      return;
    case "assign-paycheck":
      openAssignModal(el.dataset.id);
      return;
    case "new-goal":
      openGoalForm(null);
      return;
    case "edit-goal":
      openGoalForm(el.dataset.id);
      return;
    case "delete-goal":
      requestDeleteGoal(el.dataset.id);
      return;
    case "cycle-goal":
      cycleGoal(el.dataset.id);
      return;
    case "new-fund":
      openFundForm(null);
      return;
    case "edit-fund":
      openFundForm(el.dataset.id);
      return;
    case "delete-fund":
      requestDeleteFund(el.dataset.id);
      return;
    case "add-money":
      openAddMoney(el.dataset.id);
      return;
    case "new-debt":
      openDebtForm(null);
      return;
    case "edit-debt":
      openDebtForm(el.dataset.id);
      return;
    case "delete-debt":
      requestDeleteDebt(el.dataset.id);
      return;
    case "record-payment":
      openDebtPaymentForm(null, el.dataset.id);
      return;
    case "env-tab":
      if (el.dataset.tab === "month") {
        ui.envTab = "month";
        ui.month = Number(el.dataset.month) || ui.month;
      } else {
        ui.envTab = el.dataset.tab;
      }
      render();
      return;
    case "env-year":
      ui.year += Number(el.dataset.delta) || 0;
      render();
      return;
    case "edit-plan":
      openPlanForm(el.dataset.ym || `${ui.year}-${pad2(ui.month)}`);
      return;
    case "new-category":
      openCategoryForm(null);
      return;
    case "rename-category":
      openCategoryForm(el.dataset.id);
      return;
    case "delete-category":
      requestDeleteCategory(el.dataset.id);
      return;
    case "add-debt-payment":
      openDebtPaymentForm(null, null);
      return;
    case "add-savings-contribution":
      openSavingsContributionForm(null);
      return;
    case "new-income":
      openIncomeForm(null, false);
      return;
    case "new-paycheck":
      openIncomeForm(null, true);
      return;
    case "edit-income":
      openIncomeForm(el.dataset.id, false);
      return;
    case "delete-income":
      requestDeleteBudgetEntry("income", el.dataset.id);
      return;
    case "edit-spending":
      openSpendingForm(el.dataset.id);
      return;
    case "delete-spending":
      requestDeleteBudgetEntry("spending", el.dataset.id);
      return;
    case "edit-debt-payment":
      openDebtPaymentForm(el.dataset.id, null);
      return;
    case "delete-debt-payment":
      requestDeleteBudgetEntry("debt", el.dataset.id);
      return;
    case "edit-savings-entry":
      openSavingsContributionForm(el.dataset.id);
      return;
    case "delete-savings-entry":
      requestDeleteBudgetEntry("savings", el.dataset.id);
      return;
    case "print-month":
      printMonthly(`${ui.year}-${pad2(ui.month)}`);
      return;
    case "set-theme":
      if (THEMES[el.dataset.theme]) {
        state.settings.theme = el.dataset.theme;
        saveState();
        render();
        setStatus(`Theme changed to ${THEMES[el.dataset.theme].label}. Theme changes do not use a demo change.`);
      }
      return;
    case "load-sample":
      requestLoadSample();
      return;
    case "clear-sample":
      requestClearSample();
      return;
    case "download-backup":
      downloadBackup();
      return;
    case "restore-backup":
      if (blockedByDemo()) return;
      { const input = $("#restore-file"); if (input) input.click(); }
      return;
    case "erase-all":
      requestEraseAll();
      return;
    case "archive-year":
      openArchiveForm();
      return;
    case "view-archive":
      viewArchive(el.dataset.id);
      return;
    case "delete-archive":
      requestDeleteArchive(el.dataset.id);
      return;
    default:
      return;
  }
}

/* ============================================================
   Calendar entry form
   ============================================================ */
function countsAsOptionsHTML(selected) {
  const options = [`<option value="income:" ${selected === "income:" ? "selected" : ""}>Income</option>`];
  for (const c of state.categories) {
    const value = `envelope:${c.id}`;
    options.push(`<option value="${esc(value)}" ${selected === value ? "selected" : ""}>Spending envelope — ${esc(c.name)}</option>`);
  }
  for (const d of state.debts) {
    const value = `debt:${d.id}`;
    options.push(`<option value="${esc(value)}" ${selected === value ? "selected" : ""}>Debt — ${esc(d.name)}</option>`);
  }
  for (const f of state.funds) {
    const value = `savings:${f.id}`;
    options.push(`<option value="${esc(value)}" ${selected === value ? "selected" : ""}>Savings — ${esc(f.purpose)}</option>`);
  }
  return options.join("");
}

function openEntryForm(id, date) {
  if (blockedByDemo()) return;
  const entry = id ? state.calendar.find(e => e.id === id) : null;
  const chosenDate = date || (entry ? entry.date : isoToday());
  const selected = entry ? `${entry.countsAsKind}:${entry.countsAsId}` : "income:";
  const body = `<div class="form-grid">
    <label class="field full">Name
      <input type="text" name="name" maxlength="120" required value="${esc(entry ? entry.name : "")}" placeholder="For example: rent, power bill, payday">
    </label>
    <label class="field">Date
      <input type="date" name="date" required value="${esc(chosenDate)}">
    </label>
    <label class="field">Type
      <select name="type" data-entry-type>
        ${["note", "bill", "payday", "debt", "savings"].map(t => `<option value="${t}" ${(entry ? entry.type : "bill") === t ? "selected" : ""}>${esc(calendarTypeLabel(t))}</option>`).join("")}
      </select>
    </label>
    <label class="field">Amount (optional)
      <input type="number" name="amount" min="0" step="0.01" inputmode="decimal" value="${entry ? nonNeg(entry.amount) : ""}" placeholder="0.00">
    </label>
    <label class="field">Counts as
      <select name="countsAs">${countsAsOptionsHTML(selected)}</select>
    </label>
    <label class="field full">Repeat
      <select name="repeat">
        ${["none", "daily", "weekly", "biweekly", "twice-monthly", "monthly"].map(r => `<option value="${r}" ${(entry ? entry.repeat : "none") === r ? "selected" : ""}>${repeatLabel(r)}</option>`).join("")}
      </select>
    </label>
    <label class="field full">Notes (optional)
      <textarea name="notes" rows="3" maxlength="2000">${esc(entry ? entry.notes : "")}</textarea>
    </label>
  </div>
  ${entry && entry.repeat !== "none" ? `<p class="hint">This entry repeats. Editing changes the whole series, not just one day.</p>` : ""}`;

  openModal({
    title: entry ? "Edit calendar entry" : "Add calendar entry",
    body,
    submitLabel: entry ? "Save changes" : "Add entry",
    onSubmit: data => {
      const name = String(data.name || "").trim();
      if (!name) return "Add a name so you can recognize this entry.";
      if (!data.date) return "Choose a date for this entry.";
      const parts = String(data.countsAs || "income:").split(":");
      const countsAsKind = parts[0] || "income";
      const countsAsId = parts[1] || "";
      const repeat = data.repeat || "none";
      const payload = {
        name, type: data.type, amount: nonNeg(data.amount), date: data.date,
        countsAsKind, countsAsId, repeat, notes: String(data.notes || "").slice(0, 2000)
      };
      if (entry) {
        mutate(() => {
          Object.assign(entry, payload);
          if (repeat === "none") entry.seriesId = "";
          else if (!entry.seriesId) entry.seriesId = uid("ser");
        }, "Calendar entry updated.");
      } else {
        mutate(() => {
          state.calendar.push({
            id: uid("cal"), doneDates: [], skipDates: [],
            seriesId: repeat === "none" ? "" : uid("ser"), ...payload
          });
        }, "Calendar entry added.");
      }
    }
  });
}

function requestDeleteEntry(id, date) {
  if (blockedByDemo()) return;
  const entry = state.calendar.find(e => e.id === id);
  if (!entry) return;
  if (entry.repeat === "none") {
    confirmAction({
      title: "Delete entry?",
      message: `“${esc(entry.name)}” on ${fmtDate(entry.date)} will be removed. This cannot be undone.`,
      onConfirm: () => mutate(() => {
        state.calendar = state.calendar.filter(e => e.id !== id);
      }, "Entry deleted.")
    });
  } else {
    openModal({
      title: "Delete repeating entry",
      body: `<p>“${esc(entry.name)}” ${repeatLabel(entry.repeat).toLowerCase()}. You can remove only ${fmtDate(date)} or remove every occurrence in the series.</p>`,
      hideSubmit: true,
      actionsHtml: `<button type="button" class="btn btn-danger" data-action="delete-occurrence" data-id="${entry.id}" data-date="${date}" data-change>Delete this day only</button>
        <button type="button" class="btn btn-danger" data-action="delete-series" data-id="${entry.id}" data-change>Delete the whole series</button>`
    });
  }
}

function deleteOccurrence(id, date) {
  return mutate(() => {
    const entry = state.calendar.find(e => e.id === id);
    if (!entry) return false;
    if (entry.repeat === "none") {
      state.calendar = state.calendar.filter(e => e.id !== id);
    } else {
      entry.skipDates = entry.skipDates || [];
      if (!entry.skipDates.includes(date)) entry.skipDates.push(date);
    }
  }, "This day's entry deleted.");
}

function deleteSeries(id) {
  return mutate(() => {
    state.calendar = state.calendar.filter(e => e.id !== id);
  }, "Repeating entry deleted.");
}

function logPayday(id, date) {
  if (blockedByDemo()) return;
  const entry = state.calendar.find(e => e.id === id);
  if (!entry) return;
  if (!(nonNeg(entry.amount) > 0)) {
    setStatus("This payday has no amount. Edit the calendar entry and add one first.", "warn");
    return;
  }
  const ym = ymOf(date);
  mutate(() => {
    addIncome(ym, {
      date, amount: nonNeg(entry.amount), name: entry.name || "Payday",
      notes: "Added from the calendar.", isPaycheck: true
    });
    entry.doneDates = entry.doneDates || [];
    if (!entry.doneDates.includes(date)) entry.doneDates.push(date);
  }, `Payday added to ${fmtMonth(ym)} as income.`);
}

/* ============================================================
   Paycheck assignments
   ============================================================ */
function openAssignModal(id) {
  if (blockedByDemo()) return;
  const loc = findEntry("income", id);
  if (!loc) return;
  const entry = loc.e;
  const ym = loc.ym;
  const existing = new Map((entry.allocations || []).map(a => [`${a.kind}:${a.id}`, a.amount]));
  const targetMap = new Map();
  for (const c of state.categories) targetMap.set(`envelope:${c.id}`, { kind: "envelope", id: c.id, label: `Envelope — ${c.name}` });
  for (const d of state.debts) targetMap.set(`debt:${d.id}`, { kind: "debt", id: d.id, label: `Debt — ${d.name}` });
  for (const f of state.funds) targetMap.set(`savings:${f.id}`, { kind: "savings", id: f.id, label: `Savings — ${f.purpose}` });
  for (const b of billsDue(ym)) targetMap.set(`bill:${b.entry.id}`, { kind: "bill", id: b.entry.id, label: `Bill — ${b.entry.name} (${fmtDate(b.date)})` });
  const targets = Array.from(targetMap.values());
  const fields = targets.length ? targets.map(t => {
    const key = `${t.kind}:${t.id}`;
    return `<label class="field">${esc(t.label)}
      <input type="number" name="alloc_${t.kind}_${t.id}" min="0" step="0.01" inputmode="decimal" data-alloc-input value="${existing.get(key) || ""}" placeholder="0.00">
    </label>`;
  }).join("") : `<div class="empty">Add an envelope, debt, savings fund, or bill first, then come back to assign this paycheck.</div>`;
  const initialTotal = sum(Array.from(existing.values()));
  const left = nonNeg(entry.amount) - initialTotal;

  openModal({
    title: "Assign this paycheck",
    wide: true,
    body: `<p class="hint">Paycheck: <strong>${money(entry.amount)}</strong> on ${fmtDate(entry.date)}. Assigning is a plan; it does not move money or change your totals.</p>
      <div class="form-grid">${fields}</div>
      <div class="notice" id="alloc-left" style="margin-top:14px">Left from this paycheck: ${money(left)}</div>`,
    submitLabel: "Save assignments",
    onSubmit: data => {
      const allocations = [];
      for (const t of targets) {
        const amount = nonNeg(data[`alloc_${t.kind}_${t.id}`]);
        if (amount > 0) allocations.push({ kind: t.kind, id: t.id, amount });
      }
      mutate(() => { entry.allocations = allocations; }, "Paycheck assignments saved.");
    }
  });
  const form = $("#modal-root form");
  if (form) form.dataset.paycheckAmount = String(nonNeg(entry.amount));
}

/* ============================================================
   Monthly plan
   ============================================================ */
function openPlanForm(ym) {
  if (blockedByDemo()) return;
  const m = monthOr(ym);
  const body = `<p class="hint">Set the plan for ${esc(fmtMonth(ym))}. Expected income is used only until you log an income entry for the month.</p>
    <div class="form-grid">
      <label class="field full">Expected monthly income
        <input type="number" name="expectedIncome" min="0" step="0.01" inputmode="decimal" value="${nonNeg(m.expectedIncome)}">
      </label>
      ${state.categories.map(c => `<label class="field">${esc(c.name)} budget
        <input type="number" name="cat_${c.id}" min="0" step="0.01" inputmode="decimal" value="${nonNeg((m.cats[c.id] || {}).budget)}">
      </label>`).join("")}
      <label class="field">Debt payments budget
        <input type="number" name="debtBudget" min="0" step="0.01" inputmode="decimal" value="${nonNeg(m.debt.budget)}">
      </label>
      <label class="field">Savings budget
        <input type="number" name="savingsBudget" min="0" step="0.01" inputmode="decimal" value="${nonNeg(m.savings.budget)}">
      </label>
    </div>`;
  openModal({
    title: "Edit monthly plan",
    body,
    wide: true,
    submitLabel: "Save monthly plan",
    onSubmit: data => {
      mutate(() => {
        const mm = ensureMonth(ym);
        mm.expectedIncome = nonNeg(data.expectedIncome);
        for (const c of state.categories) {
          if (!mm.cats[c.id]) mm.cats[c.id] = { budget: 0, entries: [] };
          mm.cats[c.id].budget = nonNeg(data[`cat_${c.id}`]);
        }
        mm.debt.budget = nonNeg(data.debtBudget);
        mm.savings.budget = nonNeg(data.savingsBudget);
      }, "Monthly plan saved.");
    }
  });
}

/* ============================================================
   Track spending dialog
   ============================================================ */
function openTrackDialog() {
  if (blockedByDemo()) return;
  const catOptions = state.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  const debtOptions = state.debts.map(d => `<option value="${d.id}">${esc(d.name)} — ${money(d.balance)} owed</option>`).join("");
  const fundOptions = state.funds.map(f => `<option value="${f.id}">${esc(f.purpose)} — ${money(f.saved)} saved</option>`).join("");
  const body = `<div class="form-grid">
    <label class="field full">What are you tracking?
      <select name="type" data-track-type>
        <option value="spending">Spending from an envelope</option>
        <option value="debt">Debt payment</option>
        <option value="savings">Savings contribution</option>
        <option value="income">Income</option>
      </select>
    </label>
    <label class="field full" data-when="spending">Envelope
      <select name="catId">${catOptions || `<option value="">No categories yet</option>`}</select>
    </label>
    <label class="field full" data-when="debt" hidden>Debt
      <select name="debtId">${debtOptions || `<option value="">No debts yet</option>`}</select>
    </label>
    <label class="field full" data-when="savings" hidden>Savings fund
      <select name="fundId">${fundOptions || `<option value="">No savings funds yet</option>`}</select>
    </label>
    <label class="field">Amount
      <input type="number" name="amount" min="0.01" step="0.01" inputmode="decimal" required>
    </label>
    <label class="field">Date
      <input type="date" name="date" value="${isoToday()}" required>
    </label>
    <label class="field full">Name (optional)
      <input type="text" name="name" maxlength="80" placeholder="Short description">
    </label>
    <label class="field full">Notes (optional)
      <textarea name="notes" rows="2" maxlength="2000"></textarea>
    </label>
  </div>`;
  openModal({
    title: "Track spending",
    body,
    submitLabel: "Save entry",
    onSubmit: data => {
      const type = data.type;
      const amount = num(data.amount);
      if (!(amount > 0)) return "Enter an amount greater than zero.";
      if (!data.date) return "Choose a date for this entry.";
      const ym = ymOf(data.date);
      const name = String(data.name || "").trim();
      const notes = String(data.notes || "").slice(0, 2000);
      if (type === "spending") {
        if (!data.catId) return "Choose an envelope, or add a spending category first.";
        const cat = getCategory(data.catId);
        mutate(() => addSpending(ym, data.catId, { date: data.date, amount, name: name || (cat ? cat.name : "Spending"), notes }), `Spending saved to ${fmtMonth(ym)}.`);
      } else if (type === "debt") {
        if (!data.debtId) return "Choose a debt, or add one on the Debt screen first.";
        const debt = getDebt(data.debtId);
        mutate(() => addDebtPayment(ym, { date: data.date, amount, name: name || (debt ? debt.name : "Debt payment"), notes, debtId: data.debtId }), `Debt payment saved to ${fmtMonth(ym)}.`);
      } else if (type === "savings") {
        if (!data.fundId) return "Choose a savings fund, or add one on the Savings screen first.";
        const fund = getFund(data.fundId);
        mutate(() => addSavingsContribution(ym, { date: data.date, amount, name: name || (fund ? fund.purpose : "Savings contribution"), notes, fundId: data.fundId }), `Savings contribution saved to ${fmtMonth(ym)}.`);
      } else {
        mutate(() => addIncome(ym, { date: data.date, amount, name: name || "Income", notes, isPaycheck: false }), `Income saved to ${fmtMonth(ym)}.`);
      }
    }
  });
}

/* ============================================================
   Income and spending forms
   ============================================================ */
function openIncomeForm(id, forcePaycheck) {
  if (blockedByDemo()) return;
  const loc = id ? findEntry("income", id) : null;
  const entry = loc ? loc.e : null;
  const isPaycheck = forcePaycheck || !!(entry && entry.isPaycheck);
  const body = `<div class="form-grid">
    <label class="field full">Name
      <input type="text" name="name" maxlength="80" value="${esc(entry ? entry.name : "")}" placeholder="${isPaycheck ? "For example: paycheck (1st)" : "For example: side work"}">
    </label>
    <label class="field">Amount
      <input type="number" name="amount" min="0.01" step="0.01" inputmode="decimal" required value="${entry ? nonNeg(entry.amount) : ""}">
    </label>
    <label class="field">Date
      <input type="date" name="date" required value="${entry ? entry.date : isoToday()}">
    </label>
    <label class="field full">Notes (optional)
      <textarea name="notes" rows="2" maxlength="2000">${esc(entry ? entry.notes : "")}</textarea>
    </label>
    ${forcePaycheck ? `<p class="hint full">This will be saved as a paycheck. You can assign parts of it on the Home or Envelopes screen.</p>` : `<label class="check-field full"><input type="checkbox" name="isPaycheck" ${isPaycheck ? "checked" : ""}><span>This is a paycheck I want to assign</span></label>`}
  </div>`;
  openModal({
    title: entry ? "Edit income" : (forcePaycheck ? "Add a paycheck" : "Add income"),
    body,
    submitLabel: entry ? "Save changes" : "Add income",
    onSubmit: data => {
      const amount = num(data.amount);
      if (!(amount > 0)) return "Enter an amount greater than zero.";
      if (!data.date) return "Choose a date for this income.";
      const name = String(data.name || "").trim() || (isPaycheck ? "Paycheck" : "Income");
      const payload = {
        date: data.date, amount, name,
        notes: String(data.notes || "").slice(0, 2000),
        isPaycheck: forcePaycheck ? true : !!data.isPaycheck
      };
      if (entry) {
        mutate(() => {
          const newYM = ymOf(data.date);
          if (newYM !== loc.ym) {
            loc.list.splice(loc.index, 1);
            ensureMonth(newYM).incomes.push({ ...entry, ...payload });
          } else {
            Object.assign(entry, payload);
          }
        }, "Income updated.");
      } else {
        mutate(() => addIncome(ymOf(data.date), payload), `Income saved to ${fmtMonth(ymOf(data.date))}.`);
      }
    }
  });
}

function openSpendingForm(id) {
  if (blockedByDemo()) return;
  const loc = findEntry("spending", id);
  if (!loc) return;
  const entry = loc.e;
  const body = `<div class="form-grid">
    <label class="field full">Category
      <select name="catId">${state.categories.map(c => `<option value="${c.id}" ${c.id === loc.catId ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
    </label>
    <label class="field">Amount
      <input type="number" name="amount" min="0.01" step="0.01" inputmode="decimal" required value="${nonNeg(entry.amount)}">
    </label>
    <label class="field">Date
      <input type="date" name="date" required value="${entry.date}">
    </label>
    <label class="field full">Name (optional)
      <input type="text" name="name" maxlength="80" value="${esc(entry.name)}">
    </label>
    <label class="field full">Notes (optional)
      <textarea name="notes" rows="2" maxlength="2000">${esc(entry.notes)}</textarea>
    </label>
  </div>`;
  openModal({
    title: "Edit spending entry",
    body,
    submitLabel: "Save changes",
    onSubmit: data => {
      const amount = num(data.amount);
      if (!(amount > 0)) return "Enter an amount greater than zero.";
      if (!data.date) return "Choose a date for this entry.";
      if (!data.catId) return "Choose a category.";
      mutate(() => {
        const updated = { ...entry, date: data.date, amount, name: String(data.name || "").trim(), notes: String(data.notes || "").slice(0, 2000) };
        const newYM = ymOf(data.date);
        if (newYM !== loc.ym || data.catId !== loc.catId) {
          loc.list.splice(loc.index, 1);
          const m = ensureMonth(newYM);
          if (!m.cats[data.catId]) m.cats[data.catId] = { budget: 0, entries: [] };
          m.cats[data.catId].entries.push(updated);
        } else {
          Object.assign(entry, updated);
        }
      }, "Spending entry updated.");
    }
  });
}

/* ============================================================
   Goals
   ============================================================ */
function openGoalForm(id) {
  if (blockedByDemo()) return;
  const goal = id ? state.goals.find(g => g.id === id) : null;
  const body = `<div class="form-grid">
    <label class="field full">Goal name
      <input type="text" name="name" maxlength="80" required value="${esc(goal ? goal.name : "")}" placeholder="For example: replace the fridge">
    </label>
    <label class="field">Money target
      <input type="number" name="target" min="0.01" step="0.01" inputmode="decimal" required value="${goal ? nonNeg(goal.target) : ""}">
    </label>
    <label class="field">Already set aside
      <input type="number" name="saved" min="0" step="0.01" inputmode="decimal" value="${goal ? nonNeg(goal.saved) : 0}">
    </label>
    <label class="field">Target date (optional)
      <input type="date" name="targetDate" value="${goal ? goal.targetDate : ""}">
    </label>
    <label class="field">Status
      <select name="status">
        ${["not-started", "in-progress", "done"].map(s => `<option value="${s}" ${(goal ? goal.status : "not-started") === s ? "selected" : ""}>${goalStatusLabel(s)}</option>`).join("")}
      </select>
    </label>
    <label class="field full">Notes (optional)
      <textarea name="notes" rows="3" maxlength="2000">${esc(goal ? goal.notes : "")}</textarea>
    </label>
  </div>`;
  openModal({
    title: goal ? "Edit goal" : "New goal",
    body,
    submitLabel: goal ? "Save changes" : "Add goal",
    onSubmit: data => {
      const name = String(data.name || "").trim();
      const target = num(data.target);
      if (!name) return "Add a name for this goal.";
      if (!(target > 0)) return "Enter a money target greater than zero.";
      const payload = {
        name, target, saved: nonNeg(data.saved), targetDate: data.targetDate || "",
        status: data.status, notes: String(data.notes || "").slice(0, 2000)
      };
      if (goal) {
        mutate(() => Object.assign(goal, payload), "Goal updated.");
      } else {
        mutate(() => { state.goals.push({ id: uid("goal"), ...payload }); }, "Goal added.");
      }
    }
  });
}

function requestDeleteGoal(id) {
  if (blockedByDemo()) return;
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  confirmAction({
    title: "Delete goal?",
    message: `“${esc(goal.name)}” will be removed. This cannot be undone.`,
    onConfirm: () => mutate(() => {
      state.goals = state.goals.filter(g => g.id !== id);
    }, "Goal deleted.")
  });
}

function cycleGoal(id) {
  mutate(() => {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return false;
    goal.status = goal.status === "not-started" ? "in-progress" : goal.status === "in-progress" ? "done" : "not-started";
  }, "Goal status updated.");
}

/* ============================================================
   Savings
   ============================================================ */
function openFundForm(id) {
  if (blockedByDemo()) return;
  const fund = id ? state.funds.find(f => f.id === id) : null;
  const body = `<div class="form-grid">
    <label class="field full">What is this fund for?
      <input type="text" name="purpose" maxlength="80" required value="${esc(fund ? fund.purpose : "")}" placeholder="For example: emergency cushion">
    </label>
    <label class="field">Target amount
      <input type="number" name="target" min="0.01" step="0.01" inputmode="decimal" required value="${fund ? nonNeg(fund.target) : ""}">
    </label>
    <label class="field">Already saved
      <input type="number" name="saved" min="0" step="0.01" inputmode="decimal" value="${fund ? nonNeg(fund.saved) : 0}">
    </label>
    <label class="field">Target date (optional)
      <input type="date" name="targetDate" value="${fund ? fund.targetDate : ""}">
      <span class="hint">A target date lets the planner show a simple monthly amount.</span>
    </label>
  </div>`;
  openModal({
    title: fund ? "Edit savings fund" : "New savings fund",
    body,
    submitLabel: fund ? "Save changes" : "Add fund",
    onSubmit: data => {
      const purpose = String(data.purpose || "").trim();
      const target = num(data.target);
      if (!purpose) return "Add a purpose for this fund.";
      if (!(target > 0)) return "Enter a target amount greater than zero.";
      const payload = { purpose, target, saved: nonNeg(data.saved), targetDate: data.targetDate || "" };
      if (fund) {
        mutate(() => Object.assign(fund, payload), "Savings fund updated.");
      } else {
        mutate(() => { state.funds.push({ id: uid("fund"), ...payload }); }, "Savings fund added.");
      }
    }
  });
}

function requestDeleteFund(id) {
  if (blockedByDemo()) return;
  const fund = state.funds.find(f => f.id === id);
  if (!fund) return;
  confirmAction({
    title: "Delete savings fund?",
    message: `“${esc(fund.purpose)}” will be removed. Contributions already logged in your months stay in the records.`,
    onConfirm: () => mutate(() => {
      state.funds = state.funds.filter(f => f.id !== id);
    }, "Savings fund deleted.")
  });
}

function openAddMoney(fundId) {
  if (blockedByDemo()) return;
  const fund = getFund(fundId);
  if (!fund) return;
  const body = `<p class="hint">Add money to ${esc(fund.purpose)}. This also creates a savings contribution in the month of the date you choose.</p>
    <div class="form-grid">
      <label class="field">Amount
        <input type="number" name="amount" min="0.01" step="0.01" inputmode="decimal" required>
      </label>
      <label class="field">Date
        <input type="date" name="date" value="${isoToday()}" required>
      </label>
      <label class="field full">Notes (optional)
        <input type="text" name="notes" maxlength="120" placeholder="For example: extra from this paycheck">
      </label>
    </div>`;
  openModal({
    title: "Add money",
    body,
    submitLabel: "Add to fund",
    onSubmit: data => {
      const amount = num(data.amount);
      if (!(amount > 0)) return "Enter an amount greater than zero.";
      if (!data.date) return "Choose a date.";
      mutate(() => {
        addSavingsContribution(ymOf(data.date), {
          date: data.date, amount, name: fund.purpose,
          notes: String(data.notes || "").slice(0, 120), fundId: fund.id
        });
      }, `${money(amount)} added to ${fund.purpose}.`);
    }
  });
}

/* ============================================================
   Debt
   ============================================================ */
function openDebtForm(id) {
  if (blockedByDemo()) return;
  const debt = id ? state.debts.find(d => d.id === id) : null;
  const body = `<div class="form-grid">
    <label class="field full">Debt name
      <input type="text" name="name" maxlength="80" required value="${esc(debt ? debt.name : "")}" placeholder="For example: student card">
    </label>
    <label class="field">Balance owed
      <input type="number" name="balance" min="0" step="0.01" inputmode="decimal" required value="${debt ? nonNeg(debt.balance) : ""}">
    </label>
    <label class="field">APR (%)
      <input type="number" name="apr" min="0" step="0.01" inputmode="decimal" value="${debt ? nonNeg(debt.apr) : ""}" placeholder="0">
    </label>
    <label class="field">Monthly payment
      <input type="number" name="monthlyPayment" min="0" step="0.01" inputmode="decimal" value="${debt ? nonNeg(debt.monthlyPayment) : ""}" placeholder="0">
    </label>
  </div>`;
  openModal({
    title: debt ? "Edit debt" : "New debt",
    body,
    submitLabel: debt ? "Save changes" : "Add debt",
    onSubmit: data => {
      const name = String(data.name || "").trim();
      if (!name) return "Add a name for this debt.";
      const payload = {
        name, balance: nonNeg(data.balance), apr: nonNeg(data.apr), monthlyPayment: nonNeg(data.monthlyPayment)
      };
      if (debt) {
        mutate(() => Object.assign(debt, payload), "Debt updated.");
      } else {
        mutate(() => { state.debts.push({ id: uid("debt"), ...payload }); }, "Debt added.");
      }
    }
  });
}

function requestDeleteDebt(id) {
  if (blockedByDemo()) return;
  const debt = state.debts.find(d => d.id === id);
  if (!debt) return;
  confirmAction({
    title: "Delete debt?",
    message: `“${esc(debt.name)}” will be removed. Payments already logged in your months stay in the records.`,
    onConfirm: () => mutate(() => {
      state.debts = state.debts.filter(d => d.id !== id);
    }, "Debt deleted.")
  });
}

function openDebtPaymentForm(id, presetDebtId) {
  if (blockedByDemo()) return;
  if (!state.debts.length) {
    setStatus("Add a debt on the Debt screen first, then record a payment.", "warn");
    return;
  }
  const loc = id ? findEntry("debt", id) : null;
  const entry = loc ? loc.e : null;
  const chosenDebt = presetDebtId || (entry ? entry.debtId : state.debts[0].id);
  const body = `<div class="form-grid">
    <label class="field full">Debt
      <select name="debtId">${state.debts.map(d => `<option value="${d.id}" ${d.id === chosenDebt ? "selected" : ""}>${esc(d.name)} — ${money(d.balance)} owed</option>`).join("")}</select>
    </label>
    <label class="field">Amount
      <input type="number" name="amount" min="0.01" step="0.01" inputmode="decimal" required value="${entry ? nonNeg(entry.amount) : ""}">
    </label>
    <label class="field">Date
      <input type="date" name="date" required value="${entry ? entry.date : isoToday()}">
    </label>
    <label class="field full">Name (optional)
      <input type="text" name="name" maxlength="80" value="${esc(entry ? entry.name : "")}" placeholder="For example: extra payment">
    </label>
    <label class="field full">Notes (optional)
      <textarea name="notes" rows="2" maxlength="2000">${esc(entry ? entry.notes : "")}</textarea>
    </label>
  </div>
  <p class="hint">Saving a payment lowers the debt balance by the amount you enter.</p>`;
  openModal({
    title: entry ? "Edit debt payment" : "Record debt payment",
    body,
    submitLabel: entry ? "Save changes" : "Save payment",
    onSubmit: data => {
      const amount = num(data.amount);
      if (!(amount > 0)) return "Enter an amount greater than zero.";
      if (!data.date) return "Choose a date for this payment.";
      if (!data.debtId) return "Choose a debt.";
      const debt = getDebt(data.debtId);
      const name = String(data.name || "").trim() || (debt ? debt.name : "Debt payment");
      const notes = String(data.notes || "").slice(0, 2000);
      if (entry) {
        mutate(() => {
          adjustDebt(entry.debtId, nonNeg(entry.amount));
          adjustDebt(data.debtId, -amount);
          const updated = { ...entry, debtId: data.debtId, amount, date: data.date, name, notes };
          const newYM = ymOf(data.date);
          if (newYM !== loc.ym) {
            loc.list.splice(loc.index, 1);
            ensureMonth(newYM).debt.entries.push(updated);
          } else {
            Object.assign(entry, updated);
          }
        }, "Debt payment updated.");
      } else {
        mutate(() => addDebtPayment(ymOf(data.date), {
          date: data.date, amount, name, notes, debtId: data.debtId
        }), `Debt payment saved to ${fmtMonth(ymOf(data.date))}.`);
      }
    }
  });
}

/* ============================================================
   Savings contribution form
   ============================================================ */
function openSavingsContributionForm(id) {
  if (blockedByDemo()) return;
  if (!state.funds.length) {
    setStatus("Add a savings fund on the Savings screen first, then add a contribution.", "warn");
    return;
  }
  const loc = id ? findEntry("savings", id) : null;
  const entry = loc ? loc.e : null;
  const chosenFund = entry ? entry.fundId : state.funds[0].id;
  const body = `<div class="form-grid">
    <label class="field full">Savings fund
      <select name="fundId">${state.funds.map(f => `<option value="${f.id}" ${f.id === chosenFund ? "selected" : ""}>${esc(f.purpose)} — ${money(f.saved)} saved</option>`).join("")}</select>
    </label>
    <label class="field">Amount
      <input type="number" name="amount" min="0.01" step="0.01" inputmode="decimal" required value="${entry ? nonNeg(entry.amount) : ""}">
    </label>
    <label class="field">Date
      <input type="date" name="date" required value="${entry ? entry.date : isoToday()}">
    </label>
    <label class="field full">Name (optional)
      <input type="text" name="name" maxlength="80" value="${esc(entry ? entry.name : "")}">
    </label>
    <label class="field full">Notes (optional)
      <textarea name="notes" rows="2" maxlength="2000">${esc(entry ? entry.notes : "")}</textarea>
    </label>
  </div>
  <p class="hint">Saving a contribution adds the amount to the fund's saved total.</p>`;
  openModal({
    title: entry ? "Edit savings contribution" : "Add savings contribution",
    body,
    submitLabel: entry ? "Save changes" : "Save contribution",
    onSubmit: data => {
      const amount = num(data.amount);
      if (!(amount > 0)) return "Enter an amount greater than zero.";
      if (!data.date) return "Choose a date for this contribution.";
      if (!data.fundId) return "Choose a savings fund.";
      const fund = getFund(data.fundId);
      const name = String(data.name || "").trim() || (fund ? fund.purpose : "Savings contribution");
      const notes = String(data.notes || "").slice(0, 2000);
      if (entry) {
        mutate(() => {
          adjustFund(entry.fundId, -nonNeg(entry.amount));
          adjustFund(data.fundId, amount);
          const updated = { ...entry, fundId: data.fundId, amount, date: data.date, name, notes };
          const newYM = ymOf(data.date);
          if (newYM !== loc.ym) {
            loc.list.splice(loc.index, 1);
            ensureMonth(newYM).savings.entries.push(updated);
          } else {
            Object.assign(entry, updated);
          }
        }, "Savings contribution updated.");
      } else {
        mutate(() => addSavingsContribution(ymOf(data.date), {
          date: data.date, amount, name, notes, fundId: data.fundId
        }), `Savings contribution saved to ${fmtMonth(ymOf(data.date))}.`);
      }
    }
  });
}

/* ============================================================
   Categories
   ============================================================ */
function openCategoryForm(id) {
  if (blockedByDemo()) return;
  const cat = id ? getCategory(id) : null;
  openModal({
    title: cat ? "Rename category" : "New spending category",
    body: `<label class="field">Category name
      <input type="text" name="name" maxlength="50" required value="${esc(cat ? cat.name : "")}" placeholder="For example: pet care">
    </label>`,
    submitLabel: cat ? "Save name" : "Add category",
    onSubmit: data => {
      const name = String(data.name || "").trim();
      if (!name) return "Add a name for this category.";
      if (cat) {
        mutate(() => { cat.name = name; }, "Category renamed.");
      } else {
        mutate(() => { state.categories.push({ id: uid("cat"), name }); }, "Category added.");
      }
    }
  });
}

function requestDeleteCategory(id) {
  if (blockedByDemo()) return;
  const cat = getCategory(id);
  if (!cat) return;
  let count = 0;
  for (const m of Object.values(state.months)) {
    if (m.cats[id]) count += m.cats[id].entries.length;
  }
  confirmAction({
    title: "Delete category?",
    message: `“${esc(cat.name)}” will be removed, along with ${count} logged ${count === 1 ? "entry" : "entries"} in that category across all months. This cannot be undone.`,
    onConfirm: () => mutate(() => {
      state.categories = state.categories.filter(c => c.id !== id);
      for (const m of Object.values(state.months)) delete m.cats[id];
    }, "Category deleted.")
  });
}

/* ============================================================
   Delete a monthly budget entry
   ============================================================ */
function requestDeleteBudgetEntry(kind, id) {
  if (blockedByDemo()) return;
  const loc = findEntry(kind, id);
  if (!loc) return;
  const entry = loc.e;
  const label = entry.name || (kind === "debt" ? "Debt payment" : kind === "savings" ? "Savings contribution" : kind === "income" ? "Income" : "Spending entry");
  confirmAction({
    title: "Delete entry?",
    message: `“${esc(label)}” (${money(entry.amount)} on ${fmtDate(entry.date)}) will be removed. This cannot be undone.`,
    onConfirm: () => mutate(() => {
      if (kind === "debt") adjustDebt(entry.debtId, nonNeg(entry.amount));
      if (kind === "savings") adjustFund(entry.fundId, -nonNeg(entry.amount));
      loc.list.splice(loc.index, 1);
    }, "Entry deleted.")
  });
}

/* ============================================================
   Sample data (fictional)
   ============================================================ */
function buildSample() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const s = defaultState();
  const cats = defaultCategories();
  s.categories = cats;
  s.settings = {
    ...s.settings,
    displayName: "Jordan",
    rollover: false,
    startingBalance: 420,
    startMonth: `${y}-01`,
    sampleLoaded: true
  };
  const catIds = cats.map(c => c.id);
  const budgets = [880, 150, 430, 150, 110, 90, 100, 45, 90];
  const student = { id: uid("debt"), name: "Student card", balance: 0, apr: 21.9, monthlyPayment: 85 };
  const car = { id: uid("debt"), name: "Car loan", balance: 0, apr: 6.4, monthlyPayment: 295 };
  s.debts = [student, car];
  const cushion = { id: uid("fund"), purpose: "Emergency cushion", target: 3000, saved: 600, targetDate: "" };
  const laptop = { id: uid("fund"), purpose: "New laptop", target: 1200, saved: 300, targetDate: `${y + 1}-03-01` };
  s.funds = [cushion, laptop];
  s.goals = [
    { id: uid("goal"), name: "Replace the fridge", target: 900, saved: 300, targetDate: `${y}-12-15`, status: "in-progress", notes: "The ice maker is getting noisy." },
    { id: uid("goal"), name: "Coast trip", target: 1400, saved: 0, targetDate: `${y + 1}-07-01`, status: "not-started", notes: "Two nights by the water." },
    { id: uid("goal"), name: "Dentist visit", target: 600, saved: 600, targetDate: "", status: "done", notes: "Paid in full." }
  ];

  for (let mo = 1; mo <= m; mo++) {
    const ym = `${y}-${pad2(mo)}`;
    const mm = emptyMonth();
    mm.expectedIncome = 3200;
    mm.notes = mo === m ? "Sample note: the car service is coming up. Put a little aside from each paycheck." : "";
    catIds.forEach((id, i) => { mm.cats[id] = { budget: budgets[i], entries: [] }; });
    mm.debt = { budget: 380, entries: [] };
    mm.savings = { budget: 250, entries: [] };
    mm.incomes.push({ id: uid("inc"), date: `${y}-${pad2(mo)}-01`, amount: 1600, name: "Paycheck (1st)", notes: "", isPaycheck: true, allocations: [] });
    mm.incomes.push({ id: uid("inc"), date: `${y}-${pad2(mo)}-15`, amount: 1600, name: "Paycheck (15th)", notes: "", isPaycheck: true, allocations: [] });

    mm.cats[catIds[0]].entries.push({ id: uid("spend"), date: `${y}-${pad2(mo)}-03`, amount: 880, name: "Rent", notes: "" });
    mm.cats[catIds[1]].entries.push({ id: uid("spend"), date: `${y}-${pad2(mo)}-12`, amount: 95, name: "Power bill", notes: "" });
    mm.cats[catIds[2]].entries.push({ id: uid("spend"), date: `${y}-${pad2(mo)}-06`, amount: 132.40, name: "Weekly shop", notes: "" });
    mm.cats[catIds[2]].entries.push({ id: uid("spend"), date: `${y}-${pad2(mo)}-20`, amount: 118.75, name: "Weekly shop", notes: "" });
    mm.cats[catIds[3]].entries.push({ id: uid("spend"), date: `${y}-${pad2(mo)}-09`, amount: 60, name: "Fuel", notes: "" });
    mm.cats[catIds[4]].entries.push({ id: uid("spend"), date: `${y}-${pad2(mo)}-13`, amount: 38.50, name: "Lunch out", notes: "" });
    mm.cats[catIds[5]].entries.push({ id: uid("spend"), date: `${y}-${pad2(mo)}-18`, amount: 35, name: "Pharmacy", notes: "" });
    mm.cats[catIds[6]].entries.push({ id: uid("spend"), date: `${y}-${pad2(mo)}-22`, amount: 28, name: "Movie night", notes: "" });
    mm.cats[catIds[7]].entries.push({ id: uid("spend"), date: `${y}-${pad2(mo)}-18`, amount: 44, name: "Streaming and music", notes: "" });
    mm.cats[catIds[8]].entries.push({ id: uid("spend"), date: `${y}-${pad2(mo)}-24`, amount: 70, name: "Household odds and ends", notes: "" });

    mm.debt.entries.push({ id: uid("dp"), date: `${y}-${pad2(mo)}-05`, amount: 85, name: "Student card payment", notes: "", debtId: student.id });
    mm.debt.entries.push({ id: uid("dp"), date: `${y}-${pad2(mo)}-05`, amount: 295, name: "Car loan payment", notes: "", debtId: car.id });
    mm.savings.entries.push({ id: uid("sc"), date: `${y}-${pad2(mo)}-16`, amount: 250, name: "Monthly savings", notes: "", fundId: cushion.id });
    cushion.saved += 250;
    s.months[ym] = mm;
  }

  student.balance = Math.max(0, 2600 - 85 * m);
  car.balance = Math.max(0, 5000 - 295 * m);

  const current = s.months[`${y}-${pad2(m)}`];
  if (current && current.incomes[0]) {
    current.incomes[0].allocations = [
      { kind: "envelope", id: catIds[0], amount: 880 },
      { kind: "debt", id: student.id, amount: 85 },
      { kind: "debt", id: car.id, amount: 295 },
      { kind: "savings", id: cushion.id, amount: 250 }
    ];
  }
  if (current && current.incomes[1]) {
    current.incomes[1].allocations = [
      { kind: "envelope", id: catIds[2], amount: 430 },
      { kind: "envelope", id: catIds[4], amount: 110 },
      { kind: "envelope", id: catIds[6], amount: 100 }
    ];
  }

  const addCal = obj => s.calendar.push({
    id: uid("cal"), notes: "", doneDates: [], skipDates: [], seriesId: uid("ser"),
    repeat: "monthly", countsAsKind: "income", countsAsId: "", ...obj
  });
  addCal({ name: "Rent due", type: "bill", amount: 880, date: `${y}-01-01`, repeat: "monthly", countsAsKind: "envelope", countsAsId: catIds[0] });
  addCal({ name: "Power bill", type: "bill", amount: 95, date: `${y}-${pad2(m)}-12`, countsAsKind: "envelope", countsAsId: catIds[1] });
  addCal({ name: "Phone bill", type: "bill", amount: 45, date: `${y}-${pad2(m)}-20`, countsAsKind: "envelope", countsAsId: catIds[7] });
  addCal({ name: "Payday", type: "payday", amount: 1600, date: `${y}-01-01`, repeat: "twice-monthly", countsAsKind: "income", countsAsId: "" });
  addCal({ name: "Student card payment", type: "debt", amount: 85, date: `${y}-${pad2(m)}-05`, countsAsKind: "debt", countsAsId: student.id });
  addCal({ name: "Car loan payment", type: "debt", amount: 295, date: `${y}-${pad2(m)}-05`, countsAsKind: "debt", countsAsId: car.id });
  addCal({ name: "Savings transfer", type: "savings", amount: 250, date: `${y}-${pad2(m)}-16`, countsAsKind: "savings", countsAsId: cushion.id });
  addCal({ name: "Car service quote", type: "note", amount: 0, date: `${y}-${pad2(m)}-10`, repeat: "none", seriesId: "", countsAsKind: "income", countsAsId: "", notes: "Ask about the brake noise too." });

  for (const entry of s.calendar) {
    if (entry.type !== "bill") continue;
    const start = parseISO(entry.date);
    for (let mo = 1; mo <= m; mo++) {
      const day = Math.min(start.getDate(), daysInMonth(y, mo));
      const iso = `${y}-${pad2(mo)}-${pad2(day)}`;
      if (iso >= entry.date && iso < isoToday()) entry.doneDates.push(iso);
    }
  }

  return s;
}

function requestLoadSample() {
  if (blockedByDemo()) return;
  const hasData = Object.keys(state.months).length || state.goals.length || state.funds.length || state.debts.length || state.calendar.length;
  if (!hasData) {
    state = buildSample();
    saveState();
    render();
    setStatus("Sample data loaded. It is fictional and can be cleared on Setup.");
    return;
  }
  confirmAction({
    title: "Replace with sample data?",
    message: "This replaces everything currently saved with fictional sample data. Download a backup first if you want to keep what is here.",
    confirmLabel: "Load sample data",
    onConfirm: () => {
      state = buildSample();
      saveState();
      render();
      setStatus("Sample data loaded. It is fictional and can be cleared on Setup.");
    }
  });
}

function requestClearSample() {
  if (blockedByDemo()) return;
  confirmAction({
    title: "Clear sample data?",
    message: "The fictional sample will be removed and the planner will start empty. Your theme and currency are kept, and the sample display name is cleared.",
    confirmLabel: "Clear sample data",
    onConfirm: () => {
      const keep = { ...state.settings };
      const keepName = keep.sampleLoaded && keep.displayName === "Jordan" ? "" : keep.displayName;
      state = defaultState();
      state.settings = {
        ...state.settings,
        displayName: keepName,
        currency: keep.currency,
        theme: keep.theme,
        customAccent: keep.customAccent,
        night: keep.night,
        startMonth: ymNow()
      };
      saveState();
      render();
      setStatus("Sample data cleared. The planner is empty.");
    }
  });
}

/* ============================================================
   Backup, restore, erase, archives
   ============================================================ */
function downloadBackup() {
  const payload = {
    app: PRODUCT_NAME,
    version: 1,
    exportedAt: new Date().toISOString(),
    state
  };
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adhd-planner-backup-${isoToday()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Backup downloaded. Keep the JSON file somewhere safe.");
  } catch (err) {
    setStatus("The backup could not be created in this browser.", "warn");
  }
}

function handleRestoreFile(file) {
  if (blockedByDemo()) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const candidate = parsed && parsed.state ? parsed.state : parsed;
      if (!candidate || typeof candidate !== "object" || !candidate.settings) throw new Error("Not a planner backup");
      const next = normalizeState(candidate);
      openModal({
        title: "Restore this backup?",
        body: `<p>This replaces everything currently saved with the data in “${esc(file.name)}”. This cannot be undone.</p>`,
        submitLabel: "Restore backup",
        danger: true,
        onSubmit: () => {
          mutate(() => {
            state = next;
          }, "Backup restored. Your planner now shows the backup data.");
        }
      });
    } catch (err) {
      setStatus("That file could not be read as a planner backup. Choose the JSON file you downloaded from Settings.", "warn");
    }
  };
  reader.onerror = () => setStatus("The file could not be read. Try choosing it again.", "warn");
  reader.readAsText(file);
}

function requestEraseAll() {
  if (blockedByDemo()) return;
  confirmAction({
    title: "Erase everything?",
    message: "Every month, goal, fund, debt, calendar entry, and archive will be removed. Your display name, theme, currency, and other preferences will reset too. Your demo change count is not reset. This cannot be undone.",
    confirmLabel: "Erase everything",
    onConfirm: () => {
      mutate(() => {
        state = defaultState();
      }, "Everything erased. The planner is empty.");
    }
  });
}

function openArchiveForm() {
  if (blockedByDemo()) return;
  openModal({
    title: "Archive this year",
    body: `<p>Keep a labelled snapshot of ${new Date().getFullYear()} to look back at, then start the planner fresh. Your name, theme, and categories are kept.</p>
      <label class="field">Archive label
        <input type="text" name="label" maxlength="80" required placeholder="For example: 2026 in review">
      </label>`,
    submitLabel: "Archive and start fresh",
    onSubmit: data => {
      const label = String(data.label || "").trim();
      if (!label) return "Add a short label so you can find this archive later.";
      const year = new Date().getFullYear();
      const snapshot = JSON.parse(JSON.stringify({ ...state, archives: [] }));
      const existing = state.archives || [];
      const archive = { id: uid("arc"), label, year, createdAt: new Date().toISOString(), data: snapshot };
      const keep = { ...state.settings };
      const cats = state.categories;
      mutate(() => {
        state = defaultState();
        state.settings = {
          ...state.settings,
          displayName: keep.displayName,
          currency: keep.currency,
          theme: keep.theme,
          customAccent: keep.customAccent,
          night: keep.night,
          focusOrder: keep.focusOrder,
          startMonth: ymNow()
        };
        state.categories = cats;
        state.archives = [...existing, archive];
      }, `Archived “${label}”. The planner is fresh for a new year.`);
    }
  });
}

function archiveIncome(data, ym) {
  const m = data.months && data.months[ym];
  if (!m) return { amount: 0, source: "none" };
  const list = Array.isArray(m.incomes) ? m.incomes : [];
  if (list.length) return { amount: sum(list.map(e => nonNeg(e.amount))), source: "logged" };
  return { amount: nonNeg(m.expectedIncome), source: "expected" };
}

function archiveOut(data, ym) {
  const m = data.months && data.months[ym];
  if (!m) return { envelopes: 0, debt: 0, savings: 0, total: 0 };
  const envelopes = sum(Object.values(m.cats || {}).map(c => sum((c.entries || []).map(e => nonNeg(e.amount)))));
  const debt = sum(((m.debt && m.debt.entries) || []).map(e => nonNeg(e.amount)));
  const savings = sum(((m.savings && m.savings.entries) || []).map(e => nonNeg(e.amount)));
  return { envelopes, debt, savings, total: envelopes + debt + savings };
}

function archiveStarting(data, ym) {
  const settings = data.settings || {};
  return ym === settings.startMonth ? nonNeg(settings.startingBalance) : 0;
}

function archiveRollover(data, ym) {
  const settings = data.settings || {};
  if (!settings.rollover) return 0;
  const start = settings.startMonth;
  if (!start || ym <= start) return 0;
  let carry = 0;
  let cur = start;
  let guard = 0;
  while (cur < ym && guard < 600) {
    const income = archiveIncome(data, cur).amount + carry + archiveStarting(data, cur);
    const out = archiveOut(data, cur).total;
    carry = Math.max(0, income - out);
    cur = addMonthsYM(cur, 1);
    guard += 1;
  }
  return carry;
}

function archiveMoneyIn(data, ym) {
  return archiveIncome(data, ym).amount + archiveRollover(data, ym) + archiveStarting(data, ym);
}

function archiveTotals(data, year) {
  let income = 0;
  let out = 0;
  const prefix = year ? `${year}-` : "";
  const months = Object.keys((data && data.months) || {}).filter(ym => !prefix || ym.startsWith(prefix));
  for (const ym of months) {
    income += archiveMoneyIn(data, ym);
    out += archiveOut(data, ym).total;
  }
  return { income, out, net: income - out };
}

function viewArchive(id) {
  const archive = state.archives.find(a => a.id === id);
  if (!archive) return;
  const data = archive.data || {};
  const code = (data.settings && data.settings.currency) || state.settings.currency;
  const totals = archiveTotals(data, archive.year);
  const goals = Array.isArray(data.goals) ? data.goals.length : 0;
  const funds = Array.isArray(data.funds) ? data.funds.length : 0;
  const debts = Array.isArray(data.debts) ? data.debts.length : 0;
  const monthRows = MONTHS.map((name, i) => {
    const ym = `${archive.year}-${pad2(i + 1)}`;
    const m = data.months && data.months[ym];
    if (!m) return "";
    const inc = archiveMoneyIn(data, ym);
    const out = archiveOut(data, ym).total;
    return `<tr><td data-label="Month">${name}</td><td data-label="Money in" class="num">${fmtMoney(inc, code)}</td><td data-label="Money out" class="num">${fmtMoney(out, code)}</td><td data-label="Net" class="num">${fmtMoney(inc - out, code)}</td></tr>`;
  }).join("");

  openModal({
    title: archive.label,
    wide: true,
    hideSubmit: true,
    body: `<p class="hint">Archived ${fmtDate(String(archive.createdAt).slice(0, 10))} · ${archive.year}</p>
      <div class="grid grid-3">
        <div class="stat"><span class="stat-label">Money in</span><span class="stat-value" style="font-size:1.3rem">${fmtMoney(totals.income, code)}</span></div>
        <div class="stat"><span class="stat-label">Money out</span><span class="stat-value" style="font-size:1.3rem">${fmtMoney(totals.out, code)}</span></div>
        <div class="stat"><span class="stat-label">Net</span><span class="stat-value" style="font-size:1.3rem">${fmtMoney(totals.net, code)}</span></div>
      </div>
      <p class="hint" style="margin-top:12px">${goals} goals · ${funds} savings funds · ${debts} debts in this snapshot.</p>
      ${monthRows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Month</th><th class="num">Money in</th><th class="num">Money out</th><th class="num">Net</th></tr></thead><tbody>${monthRows}</tbody></table></div>` : `<div class="empty">No monthly data in this archive.</div>`}`
  });
}

function requestDeleteArchive(id) {
  if (blockedByDemo()) return;
  const archive = state.archives.find(a => a.id === id);
  if (!archive) return;
  confirmAction({
    title: "Delete archive?",
    message: `“${esc(archive.label)}” will be removed. This cannot be undone.`,
    onConfirm: () => mutate(() => {
      state.archives = state.archives.filter(a => a.id !== id);
    }, "Archive deleted.")
  });
}

/* ============================================================
   Print a monthly summary
   ============================================================ */
function printMonthly(ym) {
  const st = safeToSpend(ym);
  const cats = state.categories.map(c => ({ name: c.name, ...categoryStats(ym, c.id) }));
  const m = monthOr(ym);
  const rows = cats.map(c => `<tr><td>${esc(c.name)}</td><td>${money(c.budget)}</td><td>${money(c.spent)}</td><td>${c.over ? money(-c.left) + " over" : money(c.left) + " left"}</td></tr>`).join("");
  $("#print-area").innerHTML = `<h1>${esc(PRODUCT_NAME)} — monthly summary</h1>
    <p>${esc(fmtMonth(ym))}${state.settings.displayName ? " · " + esc(state.settings.displayName) : ""}</p>
    <h2>Month totals</h2>
    <table>
      <tr><th>Money in</th><td>${money(st.in)}</td></tr>
      <tr><th>Money out</th><td>${money(st.out)}</td></tr>
      <tr><th>Bills due, not done</th><td>${money(st.bills)}</td></tr>
      <tr><th>Safe to spend</th><td>${money(st.safe)}</td></tr>
    </table>
    <h2>Spending by category</h2>
    <table><thead><tr><th>Category</th><th>Budget</th><th>Spent</th><th>Left / over</th></tr></thead><tbody>${rows || `<tr><td colspan="4">No categories.</td></tr>`}</tbody></table>
    <h2>Notes</h2>
    <p>${m.notes ? esc(m.notes).replace(/\n/g, "<br>") : "No notes for this month."}</p>
    <p class="print-note">${esc(ADVICE_NOTE)}</p>`;
  window.print();
}

/* ============================================================
   Start the app
   ============================================================ */
function init() {
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("change", onChange);
  document.addEventListener("input", onInput);
  document.addEventListener("keydown", onKeydown);

  const menu = $("#menu-btn");
  if (menu) menu.addEventListener("click", openDrawer);
  const drawerClose = $("#drawer-close");
  if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
  const drawer = $("#nav-drawer");
  if (drawer) drawer.addEventListener("click", e => { if (e.target === drawer) closeDrawer(); });
  const drawerTrack = $("#drawer-track");
  if (drawerTrack) drawerTrack.addEventListener("click", () => { closeDrawer(); openTrackDialog(); });
  const track = $("#track-spending-btn");
  if (track) track.addEventListener("click", openTrackDialog);
  const mobileTrack = $("#mobile-track-btn");
  if (mobileTrack) mobileTrack.addEventListener("click", openTrackDialog);
  const fab = $("#fab-track");
  if (fab) fab.addEventListener("click", openTrackDialog);

  applyTheme();
  render();
}

init();
