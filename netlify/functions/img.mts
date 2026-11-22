import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

/* serves drink photos the admin uploaded; each key is unique, so browsers may keep them forever */
export default async (req: Request, ctx: Context) => {
  const key = ctx.params.key;
  if (!/^[a-z0-9-]{8,80}$/.test(key || "")) return new Response("Not found", { status: 404 });
  const entry = await getStore("images").getWithMetadata(key, { type: "arrayBuffer" });
  if (entry === null) return new Response("Not found", { status: 404 });
  return new Response(entry.data as ArrayBuffer, {
    headers: {
      "content-type": String(entry.metadata?.type || "image/jpeg"),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config: Config = { path: "/img/:key", method: "GET" };
