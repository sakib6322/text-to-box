/** Shared Google Drive image helpers (keep in sync with src/lib/richHtmlImages.ts) */

const DRIVE_FILE_ID_RE = /\/file\/d\/([a-zA-Z0-9_-]+)/;
const DRIVE_OPEN_ID_RE = /[?&]id=([a-zA-Z0-9_-]+)/;
const DRIVE_PROXY_RE = /^\/api\/gdrive-image\/([a-zA-Z0-9_-]+)$/;
const LH3_DRIVE_RE = /googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i;

export function isGoogleDriveUrl(url) {
  const t = String(url ?? "").trim();
  return (
    /(?:drive|docs)\.google\.com/i.test(t) ||
    DRIVE_PROXY_RE.test(t) ||
    LH3_DRIVE_RE.test(t)
  );
}

export function extractGoogleDriveFileId(url) {
  const trimmed = String(url ?? "").trim();
  const fromProxy = trimmed.match(DRIVE_PROXY_RE);
  if (fromProxy?.[1]) return fromProxy[1];
  const fromLh3 = trimmed.match(LH3_DRIVE_RE);
  if (fromLh3?.[1]) return fromLh3[1];
  if (!/(?:drive|docs)\.google\.com/i.test(trimmed)) return null;
  const fromPath = trimmed.match(DRIVE_FILE_ID_RE);
  if (fromPath?.[1]) return fromPath[1];
  const fromQuery = trimmed.match(DRIVE_OPEN_ID_RE);
  if (fromQuery?.[1]) return fromQuery[1];
  return null;
}

export function googleDriveImageUrl(fileId) {
  return `/api/gdrive-image/${fileId}`;
}

export function googleDriveDirectCandidates(fileId) {
  return [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://lh3.googleusercontent.com/d/${fileId}=w1920`,
  ];
}

export function resolveImageSrc(url) {
  const id = extractGoogleDriveFileId(url);
  return id ? googleDriveImageUrl(id) : String(url ?? "").trim();
}

function loadingAttrs(lazyLoading) {
  return lazyLoading ? ' loading="lazy" decoding="async"' : ' loading="eager" decoding="async"';
}

function imgTag(src, alt = "", lazyLoading = true) {
  const fileId = extractGoogleDriveFileId(src);
  const safeSrc = fileId ? googleDriveImageUrl(fileId) : resolveImageSrc(src);
  const safeAlt = String(alt).replace(/"/g, "&quot;");
  const dataAttr = fileId ? ` data-gdrive-id="${fileId}"` : "";
  return `<img${loadingAttrs(lazyLoading)} referrerpolicy="no-referrer"${dataAttr} src="${safeSrc}" alt="${safeAlt}" class="rich-html-image rich-html-gdrive" />`;
}

function applyImgLoadingAttrs(attrs, lazyLoading) {
  let next = attrs.replace(/\sloading=["'][^"']*["']/gi, "");
  const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
  const fileId = srcMatch ? extractGoogleDriveFileId(srcMatch[1]) : null;
  if (fileId) {
    next = next.replace(/\bsrc=["'][^"']*["']/i, `src="${googleDriveImageUrl(fileId)}"`);
    if (!/\bdata-gdrive-id=/.test(next)) next += ` data-gdrive-id="${fileId}"`;
    if (!/\brich-html-gdrive/.test(next)) next += ` class="rich-html-image rich-html-gdrive"`;
  } else if (srcMatch) {
    const fixed = resolveImageSrc(srcMatch[1]);
    if (fixed !== srcMatch[1]) {
      next = next.replace(/\bsrc=["'][^"']*["']/i, `src="${fixed}"`);
    }
  }
  return `<img${loadingAttrs(lazyLoading)}${next}>`;
}

export function transformRichHtmlImages(html, options = {}) {
  const lazyLoading = options.lazyLoading !== false;
  const googleDriveEmbeds = options.googleDriveEmbeds !== false;
  let out = String(html ?? "");
  if (!out.trim()) return out;

  if (googleDriveEmbeds) {
    out = out.replace(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/gi, (match, href) => {
      const id = extractGoogleDriveFileId(href);
      return id ? imgTag(href, "", lazyLoading) : match;
    });

    out = out.replace(
      /(?:^|>|[^"'=])(https?:\/\/(?:drive|docs)\.google\.com\/[^\s<"']+)/gi,
      (match, url) => {
        const id = extractGoogleDriveFileId(url);
        if (!id) return match;
        const prefix = match.slice(0, match.length - url.length);
        return `${prefix}${imgTag(url, "", lazyLoading)}`;
      },
    );
  }

  out = out.replace(/<img\b([^>]*?)>/gi, (_match, attrs) => {
    if (googleDriveEmbeds) {
      return applyImgLoadingAttrs(attrs, lazyLoading);
    }
    if (/loading\s*=/.test(attrs)) {
      if (lazyLoading) return `<img${attrs}>`;
      return `<img${attrs.replace(/\sloading=["'][^"']*["']/gi, "")} loading="eager">`;
    }
    return `<img${loadingAttrs(lazyLoading)}${attrs}>`;
  });

  return out;
}

export function googleDriveDirectCandidatesForServer(fileId) {
  return googleDriveDirectCandidates(fileId);
}
