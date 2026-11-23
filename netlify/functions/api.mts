import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/* ---------- storage ----------
   shop/menu      the menu (drinks, sizes, milks, add-ons)
   shop/texts     published text changes { key: [english, arabic] }
   shop/brand     the store's name and logo { name, ar, logo, done }
   admin/auth     { user, salt, hash, ver }
   admin/secret   random key used to sign the admin cookie
   shop/settings  how the store takes orders: pickup/delivery, fee, payment methods, location, logo size
   orders/o/<id>  one order per key; ids start with the time so they sort newest-last
   orders/k/<cid> the customer's own order id (made in their browser) -> the saved order. A retry of the
                  same order finds this and gets the first order back instead of making a second one.
   orders/pulse   changes whenever any order changes, so the admin only reloads the list when needed
   loyalty/c/<phone>  one stamp card per customer phone number
   images/<key>   drink photos (served by img.mts) */
const store = (name: string) => getStore({ name, consistency: "strong" });

const COOKIE = "mm_admin";
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
async function makeCookie(ver: number) {
  const body = b64u(JSON.stringify({ v: ver, exp: Date.now() + MAX_AGE * 1000 }));
  const sig = createHmac("sha256", await secret()).update(body).digest("base64url");
  return `${COOKIE}=${body}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}
const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
async function isAdmin(ctx: Context) {
  const c = ctx.cookies.get(COOKIE);
  if (!c || !c.includes(".")) return false;
  const [body, sig] = c.split(".");
  const want = createHmac("sha256", await secret()).update(body).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return false;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
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
  json({ id: o.id, no: o.no, total: o.total, subtotal: o.subtotal ?? o.total, fee: o.fee || 0, mode: o.mode, createdAt: o.createdAt, stamps, dup });

async function createOrder(b: any) {
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
  const round = (n: number) => Math.round(n * 100) / 100;
  const subtotal = round(items.reduce((s, i) => s + i.line, 0));
  const fee = mode === "delivery" ? round(set.fee) : 0;
  const total = round(subtotal + fee);

  /* The saved order's id and number come from the customer's cid (and the time their browser made it), so
     copies of the same order that arrive at the same moment all land on the same record and can't become two.
     The cid claim below is a second lock for browsers whose clock is far off. */
  const h = createHash("sha256").update(cid).digest("hex");
  const at = Math.floor(Number(b.at));
  const ts = Number.isFinite(at) && Math.abs(Date.now() - at) < 15 * 60_000 ? at : Date.now();
  let claim = claimed || { id: `${ts}-${h.slice(0, 6)}`, no: String(1000 + (parseInt(h.slice(6, 14), 16) % 9000)), createdAt: new Date(ts).toISOString() };
  if (!claimed) {
    const r = await os.setJSON(`k/${cid}`, claim, { onlyIfNew: true });
    if (!r.modified) claim = ((await os.get(`k/${cid}`, { type: "json" })) as any) || claim;
  }
  const key = phoneKey(phone);
  const before = (await getCard(key))?.stamps ?? 0;
  const order: any = {
    id: claim.id, no: claim.no, createdAt: claim.createdAt, cid, name, phone, mode, addr, notes, method, lang,
    items, subtotal, fee, total, paid: false, status: "new", stamped: true, cardBefore: before,
  };
  const w = await os.setJSON(`o/${claim.id}`, order, { onlyIfNew: true });
  if (!w.modified) {
    const saved: any = await os.get(`o/${claim.id}`, { type: "json" });
    return orderReply(saved || order, (await getCard(key))?.stamps ?? null, true);
  }
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
  await bumpPulse();
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
async function trackOrder(id: string, b: any, outside: boolean) {
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
      await bumpPulse();
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

/* ---------- router ---------- */
export default async (req: Request, ctx: Context) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const route = `${req.method} ${parts[0] || ""}`;
  const body = async () => { try { return await req.json(); } catch { return {}; } };
  const isJson = (req.headers.get("content-type") || "").includes("application/json");

  try {
    /* public */
    if (route === "GET shop") {
      const [menu, texts, brand, settings] = await Promise.all([getMenu(), store("shop").get("texts", { type: "json" }), getBrand(), getSettings()]);
      return json({ menu, texts: cleanTexts(texts), brand, settings });
    }
    if (route === "POST orders" && parts.length === 1) {
      if (!isJson) return fail("type", 415);
      return await createOrder(await body());
    }
    if (route === "GET track" && parts[1]) return await trackOrder(parts[1], { k: url.searchParams.get("k") }, false);
    if (route === "POST track" && parts[1]) {
      if (!isJson) return fail("type", 415);
      const b = await body();
      return await trackOrder(parts[1], b, b.outside === true);
    }
    if (route === "GET me") {
      const auth = await getAuth();
      return json({ setup: !auth, admin: auth ? await isAdmin(ctx) : false, user: auth && (await isAdmin(ctx)) ? auth.user : null });
    }
    if (route === "POST setup") {
      if (!isJson) return fail("type", 415);
      const b = await body();
      const user = str(b.user, 40), pass = b.pass;
      if (!goodUser(user) || !goodPass(pass)) return fail("weak");
      const salt = randomBytes(16).toString("hex");
      const { modified } = await store("admin").setJSON("auth", { user, salt, hash: hashPass(pass, salt), ver: 1 }, { onlyIfNew: true });
      if (!modified) return fail("exists", 409);
      return json({ ok: true }, 200, { "set-cookie": await makeCookie(1) });
    }
    if (route === "POST login") {
      if (!isJson) return fail("type", 415);
      const b = await body();
      const auth = await getAuth();
      const user = str(b.user, 40);
      const ok = !!auth && typeof b.pass === "string" && user.toLowerCase() === auth.user.toLowerCase() &&
        timingSafeEqual(Buffer.from(hashPass(b.pass, auth.salt), "hex"), Buffer.from(auth.hash, "hex"));
      if (!ok) { await wait(700); return fail("login", 401); }
      return json({ ok: true }, 200, { "set-cookie": await makeCookie(auth!.ver) });
    }
    if (route === "POST logout") return json({ ok: true }, 200, { "set-cookie": clearCookie });

    /* everything below is for the admin only */
    if (!(await isAdmin(ctx))) return fail("auth", 401);

    if (route === "POST password") {
      if (!isJson) return fail("type", 415);
      const b = await body();
      const auth = (await getAuth())!;
      if (hashPass(String(b.current || ""), auth.salt) !== auth.hash) { await wait(700); return fail("login", 401); }
      if (!goodPass(b.next)) return fail("weak");
      const user = goodUser(str(b.user, 40)) ? str(b.user, 40) : auth.user;
      const salt = randomBytes(16).toString("hex"), ver = auth.ver + 1;
      await store("admin").setJSON("auth", { user, salt, hash: hashPass(b.next, salt), ver });
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
      return json({ brand: b });
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
      await store("images").set(key, buf, { metadata: { type } });
      return json({ url: `/img/${key}` });
    }
    return fail("route", 404);
  } catch (e) {
    console.error(e);
    return fail("server", 500);
  }
};

export const config: Config = { path: "/api/*" };
