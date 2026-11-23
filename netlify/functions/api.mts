import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

/* ---------- storage ----------
   shop/menu      the menu (drinks, sizes, milks, add-ons)
   shop/texts     published text changes { key: [english, arabic] }
   shop/brand     the store's name and logo { name, ar, logo, done }
   admin/auth     { user, salt, hash, ver }
   admin/ntfy     where phone notifications go { server, topic, token, orders, outside } (never sent to the shop)
   admin/secret   random key used to sign the admin cookie
   shop/settings  how the store takes orders: pickup/delivery, fee, payment methods, location, logo size
   orders/o/<id>  one order per key; ids start with the time so they sort newest-last
   orders/k/<cid> the customer's own order id (made in their browser) -> the saved order. A retry of the
                  same order finds this and gets the first order back instead of making a second one.
   orders/pulse   changes whenever any order changes, so the admin only reloads the list when needed
   loyalty/c/<phone>  one stamp card per customer phone number
   coupons/c/<CODE>   one discount code: % or SAR off the drinks, with optional limits; counts its own uses
   coupons/p/<CODE>/<phone>  this customer used this code (only for "once per customer" codes)
   coupons/meta   { on: how many codes are switched on }, so the shop only shows the code box when there are any
   images/<key>   drink photos (served by img.mts)

   Many stores live on one site. An owner makes an account at /admin; the store gets its link (/<link name>) the
   first time they log in and give it a name. The admin is always /admin: the login cookie says which store.
   Every store keeps all of the above in its own set of storage: the first store (made before there were many)
   in the plain names ("orders"), each newer one in names ending with its id ("orders-<id>"). Photos are shared:
   every photo key is random, so stores can't clash.
   stores/u/<hex of username>   { id } which store a username logs into (usernames are unique across the site)
   stores/i/<id>                { slug } a store that exists, and its link name ("" until it has one)
   stores/s/<hex of link name>  { id, slug } which store a link name belongs to (claimed once, never reused) */
const raw = (name: string) => getStore({ name, consistency: "strong" });
type Tenant = { id: string; slug: string };
const TENANT = new AsyncLocalStorage<Tenant>();
const MAIN = "main";
const tenant = () => {
  const t = TENANT.getStore();
  if (!t) throw new Error("no store");
  return t;
};
/* this store's own storage, for the store the request is for */
const store = (name: string) => {
  const t = tenant();
  return raw(t.id === MAIN ? name : `${name}-${t.id}`);
};
const MAX_AGE = 60 * 60 * 24 * 30;

const DEF_MENU = {
  drinks: [
    { id: "straw", name: "Strawberry Matcha", ar: "ماتشا فراولة", desc: "Fresh berry base, matcha clouds on top", descAr: "قاعدة فراولة طازجة وغيوم ماتشا فوقها", price: 22, color: "#86bb4a", under: "#f58fa0", img: "" },
    { id: "classic", name: "Classic Matcha Latte", ar: "ماتشا لاتيه كلاسيك", desc: "Ceremonial matcha, silky milk", descAr: "ماتشا سيريمونيال وحليب ناعم", price: 18, color: "#8cc152", img: "" },
    { id: "mango", name: "Mango Matcha", ar: "ماتشا مانجو", desc: "Sunny mango under green clouds", descAr: "مانجو مشمس تحت غيوم خضراء", price: 22, color: "#8cc152", under: "#ffc04d", img: "" },
    { id: "sakura", name: "Sakura Cloud", ar: "غيمة ساكورا", desc: "Cherry blossom milk with a matcha swirl", descAr: "حليب زهر الكرز مع لفّة ماتشا", price: 23, color: "#9ccf5e", under: "#ffc2d4", img: "" },
    { id: "coco", name: "Coconut Cloud", ar: "غيمة جوز الهند", desc: "Light, nutty and dreamy", descAr: "خفيف وناعم وحالم", price: 21, color: "#a6d46a", img: "" },
    { id: "hoji", name: "Hojicha Latte", ar: "هوجيتشا لاتيه", desc: "Roasted green tea, cosy and toasty", descAr: "شاي أخضر محمّص، دافي ولذيذ", price: 19, color: "#b07a4f", img: "" },
  ],
  sizes: [
    { id: "s", name: "Small", ar: "صغير", add: 0 },
    { id: "m", name: "Medium", ar: "وسط", add: 3 },
    { id: "l", name: "Large", ar: "كبير", add: 6 },
  ],
  milks: [
    { id: "whole", name: "Whole milk", ar: "حليب كامل الدسم", add: 0, color: "#fdf8ef" },
    { id: "oat", name: "Oat", ar: "شوفان", add: 2, color: "#f1e2c6" },
    { id: "almond", name: "Almond", ar: "لوز", add: 2, color: "#efdcc3" },
    { id: "coconut", name: "Coconut", ar: "جوز هند", add: 2, color: "#fbfbf4" },
    { id: "none", name: "No milk", ar: "بدون حليب", add: 0, color: "" },
  ],
  addons: [
    { id: "strawb", name: "Strawberry purée", ar: "بيوريه فراولة", price: 3, color: "#f47a8c", kind: "syrup" },
    { id: "vanilla", name: "Vanilla syrup", ar: "سيرب فانيلا", price: 2, color: "#f7e2a6", kind: "syrup" },
    { id: "honey", name: "Wildflower honey", ar: "عسل زهور برية", price: 2, color: "#f2b33d", kind: "syrup" },
    { id: "boba", name: "Brown sugar boba", ar: "بوبا سكر بني", price: 4, color: "#6b4226", kind: "pearls" },
    { id: "sakuraj", name: "Sakura jelly", ar: "جيلي ساكورا", price: 4, color: "#f9b8c9", kind: "pearls" },
    { id: "foam", name: "Cream cheese foam", ar: "رغوة كريم تشيز", price: 5, color: "#fff4e2", kind: "foam" },
    { id: "mochi", name: "Mochi bits", ar: "قطع موتشي", price: 4, color: "#ffd6e3", kind: "topping" },
    { id: "shot", name: "Extra matcha shot", ar: "شوت ماتشا إضافي", price: 4, color: "#4f7f26", kind: "syrup" },
  ],
};

/* ---------- helpers ---------- */
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
const fail = (code: string, status = 400) => json({ error: code }, status);

const ID = /^[a-z0-9_-]{1,40}$/i;
const COLOR = /^#[0-9a-f]{3,8}$/i;
const IMG = /^\/img\/[a-z0-9-]{8,80}$/;
const KINDS = ["syrup", "pearls", "foam", "topping"];
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, max = 10000) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(max, Math.round(n * 100) / 100) : 0;
};
const b64u = (s: string | Buffer) => Buffer.from(s).toString("base64url");

/* a menu saved by the admin, cleaned so the shop can trust it */
function cleanMenu(m: any) {
  if (!m || typeof m !== "object") return null;
  const sizes = (Array.isArray(m.sizes) ? m.sizes : []).slice(0, 6).filter((s: any) => ID.test(s?.id)).map((s: any) => ({
    id: s.id, name: str(s.name, 40), ar: str(s.ar, 40), add: num(s.add),
  }));
  const milks = (Array.isArray(m.milks) ? m.milks : []).slice(0, 20).filter((x: any) => ID.test(x?.id)).map((x: any) => ({
    id: x.id, name: str(x.name, 60), ar: str(x.ar, 60), add: num(x.add), color: COLOR.test(x.color) ? x.color : "",
  }));
  const addons = (Array.isArray(m.addons) ? m.addons : []).slice(0, 40).filter((x: any) => ID.test(x?.id)).map((x: any) => ({
    id: x.id, name: str(x.name, 60), ar: str(x.ar, 60), price: num(x.price), color: COLOR.test(x.color) ? x.color : "#c9b3ff",
    kind: KINDS.includes(x.kind) ? x.kind : "topping",
  }));
  const sizeIds = sizes.map((s: any) => s.id), addonIds = addons.map((a: any) => a.id);
  const drinks = (Array.isArray(m.drinks) ? m.drinks : []).slice(0, 60).filter((d: any) => ID.test(d?.id)).map((d: any) => {
    let ds = Array.isArray(d.sizes) ? d.sizes.filter((x: string) => sizeIds.includes(x)) : sizeIds;
    if (!ds.length) ds = sizeIds.slice();
    const mode = d.addonMode === "some" ? "some" : "all";
    return {
      id: d.id, name: str(d.name, 60), ar: str(d.ar, 60), desc: str(d.desc, 160), descAr: str(d.descAr, 160),
      price: num(d.price), color: COLOR.test(d.color) ? d.color : "#8cc152",
      ...(COLOR.test(d.under) ? { under: d.under } : {}),
      img: IMG.test(d.img) ? d.img : "",
      sizes: ds, addonMode: mode,
      addons: mode === "some" && Array.isArray(d.addons) ? d.addons.filter((x: string) => addonIds.includes(x)) : [],
    };
  });
  if (!drinks.length || !sizes.length) return null;
  return { drinks, sizes, milks, addons };
}

/* the store's own name and logo. Empty names mean the template's default name is shown.
   done = the owner finished the first-time setup in the admin. */
function cleanBrand(b: any) {
  return {
    name: str(b?.name, 40), ar: str(b?.ar, 40),
    logo: IMG.test(b?.logo) ? b.logo : "",
    done: b?.done === true,
  };
}
async function getBrand() {
  return cleanBrand(await store("shop").get("brand", { type: "json" }));
}

/* how the store takes orders. With nothing saved yet, it behaves like before: pickup and delivery, cash or card, no fee. */
const PAYS = ["cash", "card", "transfer", "applepay"];
function cleanSettings(s: any) {
  let pickup = s?.pickup !== false, delivery = s?.delivery !== false;
  if (!pickup && !delivery) pickup = true;
  let pay = PAYS.filter((k) => (Array.isArray(s?.pay) ? s.pay.includes(k) : k === "cash" || k === "card"));
  if (!pay.length) pay = ["cash"];
  const lat = Number(s?.loc?.lat), lng = Number(s?.loc?.lng);
  const loc = s?.loc && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat || lng)
    ? { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, note: str(s.loc.note, 160) }
    : null;
  const size = Number(s?.logoSize);
  return {
    pickup, delivery, fee: delivery ? num(s?.fee, 1000) : 0, pay,
    transfer: pay.includes("transfer") ? str(s?.transfer, 400) : "",
    loc, logoSize: Number.isFinite(size) ? Math.min(1.6, Math.max(0.7, Math.round(size * 100) / 100)) : 1,
  };
}
async function getSettings() {
  return cleanSettings(await store("shop").get("settings", { type: "json" }));
}

/* ---------- stamp cards ---------- */
const CARD = 8;
/* one key per customer: Saudi numbers like 05x… and 9665x… are the same person */
const phoneKey = (p: string) => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("05")) d = "966" + d.slice(1);
  else if (d.length === 9 && d.startsWith("5")) d = "966" + d;
  return d.slice(0, 20);
};
type Card = { key: string; phone: string; name: string; stamps: number; earned: number; redeemed: number; orders: number; updatedAt: string };
/* read, change, write; if someone else wrote in between, try again with their version */
async function updateCard(key: string, change: (c: Card) => Card | null): Promise<Card | null> {
  const s = store("loyalty");
  for (let i = 0; i < 6; i++) {
    const r: any = await s.getWithMetadata(`c/${key}`, { type: "json" });
    const base: Card = r?.data || { key, phone: key, name: "", stamps: 0, earned: 0, redeemed: 0, orders: 0, updatedAt: "" };
    const next = change({ ...base });
    if (!next) return r?.data || null;
    next.stamps = Math.max(0, Math.min(CARD, Math.floor(next.stamps)));
    next.updatedAt = new Date().toISOString();
    const w = r ? await s.setJSON(`c/${key}`, next, { onlyIfMatch: r.etag }) : await s.setJSON(`c/${key}`, next, { onlyIfNew: true });
    if (w.modified) return next;
    await wait(40 + Math.random() * 120);
  }
  throw new Error("busy");
}
async function getCard(key: string) {
  return key ? ((await store("loyalty").get(`c/${key}`, { type: "json" })) as Card | null) : null;
}
/* orders from before stamp cards lived on the server: count them once, so old customers keep their stamps */
async function backfillCards() {
  const s = store("loyalty");
  const { modified } = await s.setJSON("meta", { backfilled: new Date().toISOString() }, { onlyIfNew: true });
  if (!modified) return;
  const os = store("orders");
  const { blobs } = await os.list({ prefix: "o/" });
  const orders: any[] = (await Promise.all(blobs.map((b) => os.get(b.key, { type: "json" })))).filter(Boolean);
  const by = new Map<string, { n: number; name: string; phone: string }>();
  for (const o of orders.sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    if (o.stamped) continue;
    const k = phoneKey(o.phone);
    if (k.length < 8) continue;
    const x = by.get(k) || { n: 0, name: "", phone: o.phone };
    x.n++; x.name = o.name || x.name; x.phone = o.phone || x.phone;
    by.set(k, x);
  }
  for (const [k, x] of by) {
    await updateCard(k, (c) => {
      const was = c.stamps;
      c.stamps = Math.min(CARD, c.stamps + x.n);
      if (was < CARD && c.stamps >= CARD) c.earned++;
      c.orders += x.n; c.name = c.name || x.name; c.phone = c.phone === k ? x.phone : c.phone;
      return c;
    });
  }
}

/* ---------- coupons ---------- */
/* codes are kept in capital English letters and digits; Arabic digits typed by a customer count too */
const normCode = (v: unknown) =>
  String(v ?? "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .toUpperCase().replace(/[\s_-]+/g, "").slice(0, 30);
const CODE = /^[A-Z0-9]{3,20}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
type Coupon = {
  code: string; kind: "pct" | "amt"; value: number; min: number; limit: number; once: boolean; until: string; on: boolean;
  uses: number; given: number; recent: string[]; createdAt: string; updatedAt: string;
};
/* what the admin can set; uses and totals are only ever changed by orders */
function cleanCoupon(c: any) {
  const kind: "pct" | "amt" = c?.kind === "amt" ? "amt" : "pct";
  const value = kind === "pct" ? Math.min(100, Math.round(num(c?.value, 100))) : num(c?.value, 10000);
  return {
    code: normCode(c?.code), kind, value, min: num(c?.min, 100000), limit: Math.floor(num(c?.limit, 1e6)),
    once: c?.once === true, until: typeof c?.until === "string" && DAY.test(c.until) ? c.until : "", on: c?.on !== false,
  };
}
/* the store's days are Saudi days: a code "until 2026-12-31" works to the end of that day there */
const endOfDay = (d: string) => Date.parse(`${d}T23:59:59.999+03:00`);
const round2 = (n: number) => Math.round(n * 100) / 100;
const discountOf = (c: Pick<Coupon, "kind" | "value">, subtotal: number) =>
  round2(Math.min(subtotal, c.kind === "pct" ? (subtotal * c.value) / 100 : c.value));
/* why a code can't be used right now, or "" if it can */
function couponProblem(c: Coupon | null, subtotal: number | null) {
  if (!c) return "none";
  if (!c.on) return "off";
  if (c.until && Date.now() > endOfDay(c.until)) return "ended";
  if (c.limit && c.uses >= c.limit) return "used";
  if (subtotal !== null && c.min && subtotal < c.min) return "min";
  return "";
}
const couponPublic = (c: Coupon) => ({ code: c.code, kind: c.kind, value: c.value, min: c.min, once: c.once });
const getCoupon = async (code: string) =>
  CODE.test(code) ? ((await store("coupons").get(`c/${code}`, { type: "json" })) as Coupon | null) : null;
async function couponsMeta() {
  const s = store("coupons");
  const { blobs } = await s.list({ prefix: "c/" });
  const read = (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })))) as (Coupon | null)[];
  /* one entry per code, even if storage lists a leftover copy */
  const all = [...new Map(read.filter((c): c is Coupon => !!c && CODE.test(c.code)).map((c) => [c.code, c])).values()];
  await s.setJSON("meta", { on: all.filter((c) => c.on).length });
  return all;
}
/* read, change, write; if an order used the code in between, try again with the new count */
async function updateCoupon(code: string, change: (c: Coupon) => Coupon | null | "stop"): Promise<Coupon | null> {
  const s = store("coupons");
  for (let i = 0; i < 8; i++) {
    const r: any = await s.getWithMetadata(`c/${code}`, { type: "json" });
    if (!r?.data) return null;
    const next = change({ ...r.data, recent: [...(r.data.recent || [])] });
    if (next === "stop") return null;
    if (!next) return r.data;
    next.updatedAt = new Date().toISOString();
    const w = await s.setJSON(`c/${code}`, next, { onlyIfMatch: r.etag });
    if (w.modified) return next;
    await wait(30 + Math.random() * 120);
  }
  throw new Error("busy");
}
/* An order uses the code: one use per order (a retry of the same order isn't counted again),
   and for "once per customer" codes, one order per phone number. Returns a problem, or "" when it's used. */
async function useCoupon(code: string, cid: string, phone: string, subtotal: number, discount: number) {
  const s = store("coupons");
  let lock = "";
  const c0 = await getCoupon(code);
  if (c0?.once) {
    lock = `p/${code}/${phone}`;
    const w = await s.setJSON(lock, { cid, at: new Date().toISOString() }, { onlyIfNew: true });
    if (!w.modified) {
      const had: any = await s.get(lock, { type: "json" });
      if (had?.cid !== cid) return "once";
      lock = "";
    }
  }
  let why = "none";
  try {
    await updateCoupon(code, (c) => {
      why = "";
      if (c.recent.includes(cid)) return null;
      why = couponProblem(c, subtotal);
      if (why) return "stop";
      c.uses++; c.given = round2((c.given || 0) + discount); c.recent = [cid, ...c.recent].slice(0, 50);
      return c;
    });
  } catch (e) { why = "busy"; }
  if (why && lock) await s.delete(lock).catch(() => {});
  return why;
}

/* ---------- phone notifications through ntfy (https://ntfy.sh) ----------
   admin/ntfy holds where to send them. It stays on the server: anyone who knows the topic can read the
   notifications, and they carry customer names and phone numbers. */
type Ntfy = { server: string; topic: string; token: string; orders: boolean; outside: boolean };
const TOPIC = /^[A-Za-z0-9_-]{6,64}$/;
function cleanNtfy(n: any, had?: Ntfy | null): Ntfy {
  let server = str(n?.server, 200).replace(/\/+$/, "") || "https://ntfy.sh";
  try { const u = new URL(server); if (!/^https?:$/.test(u.protocol)) throw 0; server = u.origin + u.pathname.replace(/\/+$/, ""); } catch { server = "https://ntfy.sh"; }
  /* the token is never sent to the browser: "keep" leaves the saved one as it is */
  const token = n?.token === undefined ? had?.token || "" : str(n.token, 200);
  return { server, topic: TOPIC.test(n?.topic) ? n.topic : "", token, orders: n?.orders !== false, outside: n?.outside !== false };
}
const getNtfy = async () => {
  const n = await store("admin").get("ntfy", { type: "json" });
  return n ? cleanNtfy(n, n as Ntfy) : null;
};
const ntfyPublic = (n: Ntfy | null) =>
  n ? { server: n.server, topic: n.topic, hasToken: !!n.token, orders: n.orders, outside: n.outside } : null;
/* send one notification. Never throws, and gives up after a few seconds so a slow ntfy can't hold up an order. */
async function ntfySend(n: Ntfy | null, msg: { title: string; message: string; tags?: string[]; priority?: number; click?: string }) {
  if (!n || !n.topic) return false;
  try {
    const r = await fetch(n.server + "/", {
      method: "POST",
      headers: { "content-type": "application/json", ...(n.token ? { authorization: `Bearer ${n.token}` } : {}) },
      body: JSON.stringify({ topic: n.topic, ...msg }),
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) console.error("ntfy", r.status, (await r.text()).slice(0, 200));
    return r.ok;
  } catch (e) { console.error("ntfy", e); return false; }
}
const arMoney = (v: number) => `${round2(v)} ر.س`;
function ntfyOrder(o: any, origin: string) {
  const lines = (o.items || []).map((it: any) => {
    const p = [it.size?.ar || it.size?.name];
    if (it.milk) p.push(it.milk.ar || it.milk.name);
    for (const a of it.addons || []) p.push((a.ar || a.name) + (a.q > 1 ? ` ×${a.q}` : ""));
    return `• ${it.qty}× ${it.ar || it.name} (${p.join("، ")})`;
  });
  const head = `${o.name} · ${o.mode === "delivery" ? "توصيل 🛵" : "استلام من المحل"} · ${arMoney(o.total)}`;
  const extra = [o.mode === "delivery" && o.addr ? `📍 ${o.addr}` : "", o.notes ? `📝 ${o.notes}` : "", `📞 ${o.phone}`].filter(Boolean);
  return {
    title: `طلب جديد ${o.no ? "#" + o.no : ""}`.trim(), message: [head, ...lines, ...extra].join("\n").slice(0, 3800),
    tags: ["tea"], priority: 4, click: adminLink(origin),
  };
}

/* where the owner's phone opens this store's orders */
const adminLink = (origin: string) => `${origin}/admin#orders`;

async function bumpPulse() {
  try { await store("orders").set("pulse", randomBytes(6).toString("hex")); } catch (e) { console.error(e); }
}

async function getMenu() {
  const m = await store("shop").get("menu", { type: "json" });
  return cleanMenu(m) || cleanMenu(DEF_MENU)!;
}

function cleanTexts(t: any) {
  const out: Record<string, [string, string]> = {};
  if (!t || typeof t !== "object") return out;
  for (const [k, v] of Object.entries(t).slice(0, 400)) {
    if (!/^[a-zA-Z0-9]{1,40}$/.test(k) || !Array.isArray(v)) continue;
    out[k] = [typeof v[0] === "string" ? v[0].slice(0, 800) : "", typeof v[1] === "string" ? v[1].slice(0, 800) : ""];
  }
  return out;
}

/* ---------- admin login ---------- */
async function secret() {
  const s = store("admin");
  let k = await s.get("secret");
  if (!k) {
    await s.set("secret", randomBytes(32).toString("hex"), { onlyIfNew: true });
    k = await s.get("secret");
  }
  return k as string;
}
const hashPass = (pass: string, salt: string) => scryptSync(pass, salt, 32).toString("hex");
async function getAuth() {
  return (await store("admin").get("auth", { type: "json" })) as null | { user: string; salt: string; hash: string; ver: number };
}
/* The login cookie names the store it's for (t). Cookies from before there were many stores have no t: they're
   for the first store. Each store signs its cookies with its own secret. */
const COOKIE = "mm_admin";
const TID = /^(main|[a-f0-9]{12})$/;
async function makeCookie(ver: number) {
  const body = b64u(JSON.stringify({ t: tenant().id, v: ver, exp: Date.now() + MAX_AGE * 1000 }));
  const sig = createHmac("sha256", await secret()).update(body).digest("base64url");
  return `${COOKIE}=${body}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}
const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
/* which store the browser says it's logged into; isAdmin checks that it really is */
function cookieStore(ctx: Context) {
  const c = ctx.cookies.get(COOKIE);
  if (!c || !c.includes(".")) return "";
  try {
    const t = JSON.parse(Buffer.from(c.split(".")[0], "base64url").toString()).t || MAIN;
    return TID.test(t) ? t : "";
  } catch { return ""; }
}
async function isAdmin(ctx: Context) {
  const c = ctx.cookies.get(COOKIE);
  if (!c || !c.includes(".")) return false;
  const [body, sig] = c.split(".");
  const want = createHmac("sha256", await secret()).update(body).digest();
  const got = Buffer.from(sig || "", "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return false;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if ((p.t || MAIN) !== tenant().id) return false;
    const auth = await getAuth();
    return !!auth && p.v === auth.ver && p.exp > Date.now();
  } catch { return false; }
}
const goodUser = (u: string) => u.length >= 3 && u.length <= 40;
const goodPass = (p: string) => typeof p === "string" && p.length >= 6 && p.length <= 200;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- orders ---------- */
const CID = /^[A-Za-z0-9-]{16,64}$/;
const OID = /^[0-9]+-[a-f0-9]+$/;
/* what the customer's browser gets back for a saved order (the same answer for the first try and any retry) */
const orderReply = (o: any, stamps: number | null, dup: boolean) =>
  json({ id: o.id, no: o.no, total: o.total, subtotal: o.subtotal ?? o.total, fee: o.fee || 0, discount: o.discount || 0, coupon: o.coupon?.code || "",
    mode: o.mode, createdAt: o.createdAt, stamps, dup });
const couponFail = (why: string, c?: Coupon | null) => json({ error: "coupon", why, min: c?.min || 0 }, 409);

async function createOrder(b: any, origin: string) {
  /* the order's own id, made once in the customer's browser and sent again on every retry.
     Old pages that don't send one still work, they just don't get the retry protection. */
  const cid = typeof b.cid === "string" && CID.test(b.cid) ? b.cid : randomBytes(12).toString("hex") + "-srv";
  const os = store("orders");
  const claimed: any = await os.get(`k/${cid}`, { type: "json" });
  if (claimed) {
    const saved: any = await os.get(`o/${claimed.id}`, { type: "json" });
    if (saved) return orderReply(saved, (await getCard(phoneKey(saved.phone)))?.stamps ?? null, true);
  }

  const [menu, set] = await Promise.all([getMenu(), getSettings()]);
  const name = str(b.name, 60), phone = str(b.phone, 30).replace(/[^\d+\s-]/g, "");
  const mode = b.mode === "delivery" ? "delivery" : "pickup";
  const addr = mode === "delivery" ? str(b.addr, 200) : "";
  const notes = str(b.notes, 500);
  const method = PAYS.includes(b.method) ? b.method : "";
  const lang = b.lang === "en" ? "en" : "ar";
  if (!set[mode]) return fail("mode", 409);
  if (!set.pay.includes(method)) return fail("method", 409);
  if (name.length < 2) return fail("name");
  if (phone.replace(/\D/g, "").length < 8) return fail("phone");
  if (mode === "delivery" && addr.length < 5) return fail("addr");
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30) return fail("items");

  const items = [];
  for (const it of b.items) {
    const d = menu.drinks.find((x) => x.id === it?.drink);
    if (!d || !d.sizes.includes(it.size)) return fail("menu", 409);
    const sz = menu.sizes.find((x) => x.id === it.size)!;
    const mk = it.milk ? menu.milks.find((x) => x.id === it.milk) : null;
    if (it.milk && !mk) return fail("menu", 409);
    const qty = Math.floor(Number(it.qty));
    if (!(qty >= 1 && qty <= 20)) return fail("items");
    const ads = [];
    for (const [aid, q0] of Object.entries(it.ad || {})) {
      const q = Math.floor(Number(q0));
      if (!q) continue;
      const a = menu.addons.find((x) => x.id === aid);
      if (!a || q < 0 || q > 3) return fail("menu", 409);
      if (d.addonMode === "some" && !d.addons.includes(aid)) return fail("menu", 409);
      ads.push({ id: a.id, name: a.name, ar: a.ar, q, price: a.price, color: a.color, kind: a.kind });
    }
    const unit = d.price + sz.add + (mk?.add || 0) + ads.reduce((s, a) => s + a.price * a.q, 0);
    items.push({
      drink: d.id, name: d.name, ar: d.ar, img: d.img, color: d.color, under: (d as any).under || "",
      size: { id: sz.id, name: sz.name, ar: sz.ar }, milk: mk ? { id: mk.id, name: mk.name, ar: mk.ar } : null,
      addons: ads, qty, unit, line: unit * qty,
    });
  }
  const round = round2;
  const subtotal = round(items.reduce((s, i) => s + i.line, 0));
  const fee = mode === "delivery" ? round(set.fee) : 0;
  /* a discount code takes money off the drinks only, never the delivery fee */
  let coupon: Coupon | null = null, discount = 0;
  const code = normCode(b.coupon);
  if (code) {
    coupon = await getCoupon(code);
    const why = couponProblem(coupon, subtotal);
    if (why) return couponFail(why, coupon);
    discount = discountOf(coupon!, subtotal);
  }
  const total = round(subtotal - discount + fee);

  /* The saved order's id and number come from the customer's cid (and the time their browser made it), so
     copies of the same order that arrive at the same moment all land on the same record and can't become two.
     The cid claim below is a second lock for browsers whose clock is far off. */
  const h = createHash("sha256").update(cid).digest("hex");
  const at = Math.floor(Number(b.at));
  const ts = Number.isFinite(at) && Math.abs(Date.now() - at) < 15 * 60_000 ? at : Date.now();
  let claim = claimed || { id: `${ts}-${h.slice(0, 6)}`, no: String(1000 + (parseInt(h.slice(6, 14), 16) % 9000)), createdAt: new Date(ts).toISOString() };
  /* count the code's use now, so the last use of a limited code can't go to two orders */
  if (coupon) {
    const why = await useCoupon(coupon.code, cid, phoneKey(phone), subtotal, discount);
    if (why) return couponFail(why, coupon);
  }
  if (!claimed) {
    const r = await os.setJSON(`k/${cid}`, claim, { onlyIfNew: true });
    if (!r.modified) claim = ((await os.get(`k/${cid}`, { type: "json" })) as any) || claim;
  }
  const key = phoneKey(phone);
  const before = (await getCard(key))?.stamps ?? 0;
  const order: any = {
    id: claim.id, no: claim.no, createdAt: claim.createdAt, cid, name, phone, mode, addr, notes, method, lang,
    items, subtotal, fee, discount, ...(coupon ? { coupon: { code: coupon.code, kind: coupon.kind, value: coupon.value } } : {}), total, paid: false, status: "new", stamped: true, cardBefore: before,
  };
  const w = await os.setJSON(`o/${claim.id}`, order, { onlyIfNew: true });
  if (!w.modified) {
    const saved: any = await os.get(`o/${claim.id}`, { type: "json" });
    return orderReply(saved || order, (await getCard(key))?.stamps ?? null, true);
  }
  /* tell the owner's phone, while the stamp is being added */
  const ping = getNtfy().then((n) => (n?.orders ? ntfySend(n, ntfyOrder(order, origin)) : false)).catch(() => false);
  /* a stamp for this order. The card stops at full until the free drink is used. */
  let stamps: number | null = null;
  try {
    const c = await updateCard(key, (c) => {
      /* one stamp per order, even if this order somehow arrives twice */
      const seen = Array.isArray((c as any).recent) ? (c as any).recent : [];
      if (seen.includes(order.id)) return null;
      (c as any).recent = [order.id, ...seen].slice(0, 20);
      const was = c.stamps;
      if (c.stamps < CARD) c.stamps++;
      if (was < CARD && c.stamps >= CARD) c.earned++;
      c.orders++; c.name = name; c.phone = phone;
      return c;
    });
    stamps = c?.stamps ?? null;
  } catch (e) { console.error(e); }
  await Promise.all([bumpPulse(), ping]);
  return orderReply(order, stamps, false);
}

/* v = the pulse the admin already has: if nothing changed, answer in one tiny read */
async function listOrders(v: string) {
  const s = store("orders");
  const pulse = ((await s.get("pulse")) as string | null) || "";
  if (v && pulse && v === pulse) return json({ v: pulse, same: true });
  const { blobs } = await s.list({ prefix: "o/" });
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 200);
  const orders = await Promise.all(keys.map((k) => s.get(k, { type: "json" })));
  /* one card per order, even if old data had a repeat */
  const seen = new Set<string>();
  const out = orders.filter((o: any) => {
    if (!o || !o.id) return false;
    const k = o.cid || o.id;
    if (seen.has(k) || seen.has(o.id)) return false;
    seen.add(k); seen.add(o.id);
    return true;
  });
  return json({ v: pulse, orders: out });
}

/* the customer's own order, opened with the id their browser made. Used for "I'm outside". */
const OUT_COOL = 30_000;
async function trackOrder(id: string, b: any, outside: boolean, origin = "") {
  if (!OID.test(id) || typeof b.k !== "string" || !CID.test(b.k)) return fail("bad");
  const s = store("orders"), key = `o/${id}`;
  const o: any = await s.get(key, { type: "json" });
  if (!o || o.cid !== b.k) return fail("missing", 404);
  if (outside) {
    if (o.mode !== "pickup") return fail("mode");
    if (Date.now() - Date.parse(o.createdAt) > 12 * 3600_000) return fail("old");
    const last = o.outsideAt ? Date.parse(o.outsideAt) : 0;
    if (Date.now() - last >= OUT_COOL) {
      o.outsideAt = new Date().toISOString();
      o.outsideCount = (o.outsideCount || 0) + 1;
      await s.setJSON(key, o);
      const n = await getNtfy().catch(() => null);
      await Promise.all([bumpPulse(), n?.outside ? ntfySend(n, {
        title: `🚗 ${o.name} برا المحل`,
        message: `طلب ${o.no ? "#" + o.no : ""} · ${arMoney(o.total)}
العميل ينتظر برا، طلّع له طلبه.${o.outsideCount > 1 ? `
(ضغط الزر ${o.outsideCount} مرات)` : ""}
📞 ${o.phone}`,
        tags: ["red_car"], priority: 5, click: adminLink(origin),
      }) : null]);
    }
  }
  const card = await getCard(phoneKey(o.phone));
  return json({ status: o.status, mode: o.mode, outsideAt: o.outsideAt || null, stamps: card ? card.stamps : null });
}

/* Google Maps links: the pin is in the link, or behind a short link we open to see where it goes */
const MAP_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|g\.co|maps\.google\.[a-z.]+|(www\.)?google\.[a-z.]+|consent\.google\.[a-z.]+|maps\.apple\.com)$/i;
function coordsIn(text: string): { lat: number; lng: number } | null {
  let t = text;
  try { t = decodeURIComponent(text); } catch {}
  const pats = [/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, /[?&](?:q|query|ll|sll|center|destination|daddr)=(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/, /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, /^\s*(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)\s*$/];
  for (const p of pats) {
    const m = t.match(p);
    if (m) { const lat = +m[1], lng = +m[2]; if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }; }
  }
  return null;
}
async function resolveMapLink(raw: string) {
  const direct = coordsIn(raw);
  if (direct) return direct;
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  for (let hop = 0; hop < 6; hop++) {
    if (url.protocol !== "https:" || !MAP_HOSTS.test(url.hostname)) return null;
    const cont = url.searchParams.get("continue");
    if (cont) { const c = coordsIn(cont); if (c) return c; try { url = new URL(cont); continue; } catch { return null; } }
    const r = await fetch(url, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) });
    const loc = r.headers.get("location");
    if (!loc) {
      const body = (await r.text()).slice(0, 400_000);
      return coordsIn(url.href) || coordsIn((body.match(/https:\/\/www\.google\.[a-z.]+\/maps[^"'\s<>]*/) || [""])[0]) || null;
    }
    url = new URL(loc, url);
    const c = coordsIn(url.href);
    if (c) return c;
  }
  return null;
}

/* ---------- stores and their links ---------- */
const reg = () => raw("stores");
/* names that are pages of the site itself, so no store can take them */
const RESERVED = new Set(["api", "img", "admin", "new", "index", "store", "stores", "shop", "app", "www", "login", "help", "static", "assets"]);
/* "Matcha Mochi" -> "matcha-mochi"; Arabic names keep their letters: "ماتشا موتشي" -> "ماتشا-موتشي" */
const slugify = (s: string) =>
  String(s || "").normalize("NFKC").toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
const SLUG = /^[\p{L}\p{N}][\p{L}\p{N}-]{0,48}$/u;
const slugKey = (s: string) => "s/" + Buffer.from(s).toString("hex");

/* Give a store the link made from its name. If another store already has it, the next free one:
   matcha-mochi, then matcha-mochi2, matcha-mochi3… Claiming is one write that only works if the name is
   free, so two stores made at the same moment with the same name still get different links. */
async function claimSlug(id: string, name: string) {
  const base = slugify(name) || "store";
  for (let n = 1; n < 500; n++) {
    const slug = n === 1 ? base : base + n;
    if (RESERVED.has(slug)) continue;
    const w = await reg().setJSON(slugKey(slug), { id, slug, at: new Date().toISOString() }, { onlyIfNew: true });
    if (w.modified) {
      await reg().setJSON(`i/${id}`, { slug });
      return slug;
    }
  }
  throw new Error("busy");
}
const userKey = (u: string) => "u/" + Buffer.from(u.normalize("NFKC").toLowerCase()).toString("hex");
/* The first store, made before there were many: the first time it's needed, its username is noted and, if it
   has a name, it gets its link. Its data stays where it was. Returns its link name ("" if none yet). */
async function ensureMain(): Promise<string> {
  const had: any = await reg().get(`i/${MAIN}`, { type: "json" });
  if (had?.u) return had.slug || "";
  const auth: any = await raw("admin").get("auth", { type: "json" });
  if (!auth) return had?.slug || "";
  await reg().setJSON(userKey(auth.user), { id: MAIN }, { onlyIfNew: true });
  let slug = had?.slug || "";
  if (!had) {
    const lock = await reg().setJSON(`i/${MAIN}`, { slug: "" }, { onlyIfNew: true });
    if (!lock.modified) return "";
    const b = cleanBrand(await raw("shop").get("brand", { type: "json" }));
    if (b.name || b.ar) slug = await claimSlug(MAIN, b.name || b.ar);
  }
  /* u: its username is noted */
  await reg().setJSON(`i/${MAIN}`, { slug, u: 1 });
  return slug;
}
async function findStore(part: string): Promise<Tenant | null> {
  let s = "";
  try { s = decodeURIComponent(part).normalize("NFKC").toLowerCase(); } catch { return null; }
  if (!SLUG.test(s)) return null;
  let r: any = await reg().get(slugKey(s), { type: "json" });
  if (!r && (await ensureMain()) === s) r = await reg().get(slugKey(s), { type: "json" });
  return r?.id ? { id: r.id, slug: r.slug } : null;
}
/* a store by its id, or null if there's no such store */
async function storeById(id: string): Promise<Tenant | null> {
  if (!TID.test(id)) return null;
  if (id === MAIN) await ensureMain();
  const r: any = await reg().get(`i/${id}`, { type: "json" });
  return r ? { id, slug: r.slug || "" } : null;
}

/* the site's own routes: /api/_/home, /api/_/signup, /api/_/login */
async function siteRoute(req: Request, part: string) {
  if (req.method === "GET" && part === "home") {
    const slug = await ensureMain();
    if (!slug) return json({ main: null });
    const b = await TENANT.run({ id: MAIN, slug }, getBrand);
    return json({ main: { slug, name: b.name, ar: b.ar } });
  }
  if (req.method !== "POST" || !["signup", "login"].includes(part)) return fail("route", 404);
  if (!(req.headers.get("content-type") || "").includes("application/json")) return fail("type", 415);
  let b: any = {};
  try { b = await req.json(); } catch {}
  const user = str(b.user, 40);
  /* the first store's owner keeps their username */
  await ensureMain();
  if (part === "signup") {
    /* a new account: no name and no link yet. Those come on the first login, in the setup. */
    if (!goodUser(user) || !goodPass(b.pass)) return fail("weak");
    const id = randomBytes(6).toString("hex");
    const w = await reg().setJSON(userKey(user), { id }, { onlyIfNew: true });
    if (!w.modified) return fail("taken", 409);
    await reg().setJSON(`i/${id}`, { slug: "" });
    return TENANT.run({ id, slug: "" }, async () => {
      const salt = randomBytes(16).toString("hex");
      await store("admin").setJSON("auth", { user, salt, hash: hashPass(b.pass, salt), ver: 1 });
      await store("shop").setJSON("brand", { name: "", ar: "", logo: "", done: false });
      return json({ ok: true }, 200, { "set-cookie": await makeCookie(1) });
    });
  }
  const u: any = goodUser(user) ? await reg().get(userKey(user), { type: "json" }) : null;
  const t = u ? await storeById(u.id) : null;
  const ok = t && typeof b.pass === "string" && (await TENANT.run(t, async () => {
    const auth = await getAuth();
    return !!auth && timingSafeEqual(Buffer.from(hashPass(b.pass, auth.salt), "hex"), Buffer.from(auth.hash, "hex")) ? auth : null;
  }));
  if (!t || !ok) { await wait(700); return fail("login", 401); }
  return TENANT.run(t, async () => json({ ok: true }, 200, { "set-cookie": await makeCookie(ok.ver) }));
}

/* ---------- router ---------- */
export default async (req: Request, ctx: Context) => {
  const url = new URL(req.url);
  const all = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  try {
    if (all[0] === "_") return await siteRoute(req, all[1] || "");
    /* /api/~/… is the store this browser is logged into (the admin, and the text editor's preview) */
    const t = all[0] === "~" ? await storeById(cookieStore(ctx)) : await findStore(all[0] || "");
    if (!t) {
      if (all[0] === "~") return all[1] === "me" ? json({ admin: false, user: null, slug: null }) : fail("auth", 401);
      return fail("nostore", 404);
    }
    return await TENANT.run(t, () => storeRoute(req, ctx, url, all.slice(1)));
  } catch (e) {
    console.error(e);
    return fail("server", 500);
  }
};

/* everything one store does: /api/<link name>/<route> */
async function storeRoute(req: Request, ctx: Context, url: URL, parts: string[]) {
  const route = `${req.method} ${parts[0] || ""}`;
  const body = async () => { try { return await req.json(); } catch { return {}; } };
  const isJson = (req.headers.get("content-type") || "").includes("application/json");

  try {
    /* public */
    if (route === "GET shop") {
      const [menu, texts, brand, settings, cm] = await Promise.all([getMenu(), store("shop").get("texts", { type: "json" }), getBrand(), getSettings(),
        store("coupons").get("meta", { type: "json" }) as Promise<any>]);
      return json({ menu, texts: cleanTexts(texts), brand, settings, coupons: (cm?.on || 0) > 0, slug: tenant().slug });
    }
    /* the customer checks a code before sending the order (the order checks it again) */
    if (route === "POST coupon") {
      if (!isJson) return fail("type", 415);
      const b = await body();
      const c = await getCoupon(normCode(b.code));
      const sub = Number(b.subtotal);
      let why = couponProblem(c, Number.isFinite(sub) && sub >= 0 ? sub : null);
      const pk = phoneKey(str(b.phone, 30));
      if (!why && c!.once && pk.length >= 8 && (await store("coupons").get(`p/${c!.code}/${pk}`))) why = "once";
      if (why) { await wait(why === "none" ? 400 : 0); return couponFail(why, c); }
      return json({ coupon: couponPublic(c!) });
    }
    if (route === "POST orders" && parts.length === 1) {
      if (!isJson) return fail("type", 415);
      return await createOrder(await body(), url.origin);
    }
    if (route === "GET track" && parts[1]) return await trackOrder(parts[1], { k: url.searchParams.get("k") }, false);
    if (route === "POST track" && parts[1]) {
      if (!isJson) return fail("type", 415);
      const b = await body();
      return await trackOrder(parts[1], b, b.outside === true, url.origin);
    }
    if (route === "GET me") {
      const auth = await getAuth();
      const admin = !!auth && (await isAdmin(ctx));
      return json({ admin, user: admin ? auth!.user : null, slug: admin ? tenant().slug : null });
    }
    if (route === "POST logout") return json({ ok: true }, 200, { "set-cookie": clearCookie() });

    /* everything below is for the admin only */
    if (!(await isAdmin(ctx))) return fail("auth", 401);

    if (route === "POST password") {
      if (!isJson) return fail("type", 415);
      const b = await body();
      const auth = (await getAuth())!;
      if (hashPass(String(b.current || ""), auth.salt) !== auth.hash) { await wait(700); return fail("login", 401); }
      if (!goodPass(b.next)) return fail("weak");
      const user = goodUser(str(b.user, 40)) ? str(b.user, 40) : auth.user;
      /* a new username must be free across the whole site */
      const oldK = userKey(auth.user), newK = userKey(user);
      if (newK !== oldK) {
        const w = await raw("stores").setJSON(newK, { id: tenant().id }, { onlyIfNew: true });
        if (!w.modified) return fail("taken", 409);
      }
      const salt = randomBytes(16).toString("hex"), ver = auth.ver + 1;
      await store("admin").setJSON("auth", { user, salt, hash: hashPass(b.next, salt), ver });
      if (newK !== oldK) await raw("stores").delete(oldK);
      return json({ ok: true }, 200, { "set-cookie": await makeCookie(ver) });
    }
    if (route === "GET orders") return await listOrders(str(url.searchParams.get("v"), 40));
    if (route === "POST orders" && parts[1]) {
      if (!isJson || !OID.test(parts[1])) return fail("bad");
      const s = store("orders"), key = `o/${parts[1]}`;
      const o: any = await s.get(key, { type: "json" });
      if (!o) return fail("missing", 404);
      const b = await body();
      if (b.status === "new" || b.status === "done") o.status = b.status;
      if (typeof b.paid === "boolean") o.paid = b.paid;
      if (o.status === "done" && !o.doneAt) o.doneAt = new Date().toISOString();
      if (o.status === "new") delete o.doneAt;
      /* staff saw the "I'm outside" alert */
      if (b.outsideAck === true && o.outsideAt) o.outsideAck = o.outsideAt;
      await s.setJSON(key, o);
      await bumpPulse();
      return json({ order: o });
    }
    /* phone notifications: where to send them, and a test message */
    if (route === "GET ntfy") return json({ ntfy: ntfyPublic(await getNtfy()) });
    if (route === "PUT ntfy" && !parts[1]) {
      if (!isJson) return fail("type", 415);
      const b = await body();
      if (b.off === true) { await store("admin").delete("ntfy"); return json({ ntfy: null }); }
      /* a new private topic: long and random, so nobody can guess it */
      if (b.topic === "new") b.topic = "mm-" + randomBytes(12).toString("base64url").replace(/[^A-Za-z0-9]/g, "x");
      const n = cleanNtfy(b, await getNtfy());
      if (!n.topic) return fail("topic");
      await store("admin").setJSON("ntfy", n);
      return json({ ntfy: ntfyPublic(n) });
    }
    if (route === "POST ntfy" && parts[1] === "test") {
      const n = await getNtfy();
      if (!n?.topic) return fail("topic");
      const ok = await ntfySend(n, { title: "تجربة ✓", message: "التنبيهات شغّالة! بيوصلك تنبيه هنا مع كل طلب جديد.", tags: ["white_check_mark"], priority: 4, click: adminLink(url.origin) });
      return ok ? json({ ok: true }) : fail("send", 502);
    }
    if (route === "PUT settings") {
      if (!isJson) return fail("type", 415);
      const set = cleanSettings(await body());
      await store("shop").setJSON("settings", set);
      return json({ settings: set });
    }
    if (route === "POST maplink") {
      if (!isJson) return fail("type", 415);
      const c = await resolveMapLink(str((await body()).url, 2000)).catch(() => null);
      return c ? json(c) : fail("nolink", 422);
    }
    if (route === "GET loyalty") {
      await backfillCards();
      const s = store("loyalty");
      const { blobs } = await s.list({ prefix: "c/" });
      const cards = (await Promise.all(blobs.slice(0, 3000).map((x) => s.get(x.key, { type: "json" })))).filter(Boolean) as Card[];
      cards.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return json({ cards, full: CARD });
    }
    if (route === "POST loyalty" && parts[1]) {
      if (!isJson || !/^\d{8,20}$/.test(parts[1])) return fail("bad");
      const b = await body();
      if (!(await getCard(parts[1]))) return fail("missing", 404);
      let used = false;
      const c = await updateCard(parts[1], (c) => {
        used = false;
        if (b.reset === true) c.stamps = 0;
        else if (b.redeem === true) {
          if (c.stamps < CARD) return null;
          c.stamps -= CARD; c.redeemed++; c.earned = Math.max(c.earned, c.redeemed); used = true;
        } else if (Number.isFinite(Number(b.stamps))) {
          const was = c.stamps;
          c.stamps = Math.max(0, Math.min(CARD, Math.floor(Number(b.stamps))));
          if (was < CARD && c.stamps >= CARD) c.earned++;
          else if (was >= CARD && c.stamps < CARD && c.earned > c.redeemed) c.earned--;
        } else return null;
        return c;
      });
      /* the free drink was used on this order: remember it so the order card says so */
      if (b.redeem === true && !used) return fail("notfull", 409);
      if (used && typeof b.order === "string" && OID.test(b.order)) {
        const s = store("orders"), k = `o/${b.order}`, o: any = await s.get(k, { type: "json" });
        if (o && phoneKey(o.phone) === parts[1]) { o.freeUsed = true; await s.setJSON(k, o); await bumpPulse(); }
      }
      return json({ card: c });
    }
    if (route === "GET coupons") {
      const all = await couponsMeta();
      all.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return json({ coupons: all.map(({ recent, ...c }) => c) });
    }
    if (route === "PUT coupons" && parts[1]) {
      if (!isJson) return fail("type", 415);
      const b = await body();
      const want = cleanCoupon({ ...b, code: parts[1] });
      if (!CODE.test(want.code)) return fail("code");
      if (!(want.value > 0)) return fail("value");
      const now = new Date().toISOString();
      let saved: Coupon | null;
      if (b.new === true) {
        saved = { ...want, uses: 0, given: 0, recent: [], createdAt: now, updatedAt: now };
        const w = await store("coupons").setJSON(`c/${want.code}`, saved, { onlyIfNew: true });
        if (!w.modified) return fail("exists", 409);
      } else {
        saved = await updateCoupon(want.code, (c) => ({ ...c, ...want }));
        if (!saved) return fail("missing", 404);
      }
      await couponsMeta();
      const { recent, ...out } = saved;
      return json({ coupon: out });
    }
    if (route === "DELETE coupons" && parts[1]) {
      const code = normCode(parts[1]);
      if (!CODE.test(code)) return fail("code");
      const s = store("coupons");
      await s.delete(`c/${code}`);
      const { blobs } = await s.list({ prefix: `p/${code}/` });
      await Promise.all(blobs.map((x) => s.delete(x.key)));
      await couponsMeta();
      return json({ ok: true });
    }
    if (route === "PUT menu") {
      if (!isJson) return fail("type", 415);
      const m = cleanMenu(await body());
      if (!m) return fail("menu");
      await store("shop").setJSON("menu", m);
      return json({ menu: m });
    }
    if (route === "PUT brand") {
      if (!isJson) return fail("type", 415);
      const b = cleanBrand(await body());
      await store("shop").setJSON("brand", b);
      /* the first time the store gets a name, it gets its link. After that the link stays, so links that
         customers already have keep working. */
      const t = tenant();
      if (!t.slug && (b.name || b.ar)) t.slug = await claimSlug(t.id, b.name || b.ar);
      return json({ brand: b, slug: t.slug });
    }
    if (route === "PUT texts") {
      if (!isJson) return fail("type", 415);
      const t = cleanTexts((await body()).texts);
      await store("shop").setJSON("texts", t);
      return json({ texts: t });
    }
    if (route === "POST images") {
      const type = req.headers.get("content-type") || "";
      if (!/^image\/(jpeg|png|webp)$/.test(type)) return fail("type", 415);
      const buf = await req.arrayBuffer();
      if (!buf.byteLength || buf.byteLength > 3_000_000) return fail("size", 413);
      const key = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
      await raw("images").set(key, buf, { metadata: { type } });
      return json({ url: `/img/${key}` });
    }
    return fail("route", 404);
  } catch (e) {
    console.error(e);
    return fail("server", 500);
  }
}

export const config: Config = { path: "/api/*" };
