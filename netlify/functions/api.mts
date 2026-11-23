import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/* ---------- storage ----------
   shop/menu      the menu (drinks, sizes, milks, add-ons)
   shop/texts     published text changes { key: [english, arabic] }
   shop/brand     the store's name and logo { name, ar, logo, done }
   admin/auth     { user, salt, hash, ver }
   admin/secret   random key used to sign the admin cookie
   orders/o/<id>  one order per key; ids start with the time so they sort newest-last
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
async function createOrder(b: any) {
  const menu = await getMenu();
  const name = str(b.name, 60), phone = str(b.phone, 30).replace(/[^\d+\s-]/g, "");
  const mode = b.mode === "delivery" ? "delivery" : "pickup";
  const addr = mode === "delivery" ? str(b.addr, 200) : "";
  const notes = str(b.notes, 500);
  const method = ["cash", "card"].includes(b.method) ? b.method : "cash";
  const lang = b.lang === "en" ? "en" : "ar";
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
  const total = Math.round(items.reduce((s, i) => s + i.line, 0) * 100) / 100;
  const no = String(1000 + Math.floor(Math.random() * 9000));
  const id = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const order = { id, no, createdAt: new Date().toISOString(), name, phone, mode, addr, notes, method, lang, items, total, paid: false, status: "new" };
  await store("orders").setJSON(`o/${id}`, order, { onlyIfNew: true });
  return json({ id, no, total, createdAt: order.createdAt });
}

async function listOrders() {
  const s = store("orders");
  const { blobs } = await s.list({ prefix: "o/" });
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 200);
  const orders = await Promise.all(keys.map((k) => s.get(k, { type: "json" })));
  return json({ orders: orders.filter(Boolean) });
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
      const [menu, texts, brand] = await Promise.all([getMenu(), store("shop").get("texts", { type: "json" }), getBrand()]);
      return json({ menu, texts: cleanTexts(texts), brand });
    }
    if (route === "POST orders" && parts.length === 1) {
      if (!isJson) return fail("type", 415);
      return await createOrder(await body());
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
    if (route === "GET orders") return await listOrders();
    if (route === "POST orders" && parts[1]) {
      if (!isJson || !/^[0-9]+-[a-f0-9]+$/.test(parts[1])) return fail("bad");
      const s = store("orders"), key = `o/${parts[1]}`;
      const o: any = await s.get(key, { type: "json" });
      if (!o) return fail("missing", 404);
      const b = await body();
      if (b.status === "new" || b.status === "done") o.status = b.status;
      if (typeof b.paid === "boolean") o.paid = b.paid;
      if (o.status === "done" && !o.doneAt) o.doneAt = new Date().toISOString();
      if (o.status === "new") delete o.doneAt;
      await s.setJSON(key, o);
      return json({ order: o });
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
