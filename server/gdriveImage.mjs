import { googleDriveDirectCandidates } from "./richHtmlImages.mjs";

const FILE_ID_RE = /^[a-zA-Z0-9_-]{10,64}$/;
const FETCH_TIMEOUT_MS = 12_000;

/**
 * Proxy Google Drive images for &lt;img&gt; embeds.
 * Drive's uc?export=view often returns HTML in browsers; thumbnail API + server fetch is more reliable.
 */
export function registerGdriveImageRoutes(app) {
  app.get("/api/gdrive-image/:fileId", async (req, res) => {
    const fileId = String(req.params.fileId ?? "").trim();
    if (!FILE_ID_RE.test(fileId)) {
      return res.status(400).json({ error: "Invalid Google Drive file id" });
    }

    const sources = googleDriveDirectCandidates(fileId);
    for (const url of sources) {
      try {
        const upstream = await fetch(url, {
          redirect: "follow",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; TextToBox/1.0; +gdrive-image-proxy)",
            Accept: "image/*,*/*",
          },
        });
        if (!upstream.ok) continue;

        const contentType = upstream.headers.get("content-type") ?? "";
        if (!contentType.startsWith("image/")) continue;

        const buf = Buffer.from(await upstream.arrayBuffer());
        if (buf.length < 128) continue;

        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(buf);
      } catch {
        /* try next source */
      }
    }

    return res.status(404).json({
      error:
        "Could not load image. Share the Drive file as “Anyone with the link” (Viewer) and use an image file (PNG/JPG/WebP).",
    });
  });
}
