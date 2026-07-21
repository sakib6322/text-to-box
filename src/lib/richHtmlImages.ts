/** Google Drive share links → embeddable image URLs (concept details, story, etc.) */

import type { RichEditorAppearance } from "@/lib/uiAppearance";

const DRIVE_FILE_ID_RE = /\/file\/d\/([a-zA-Z0-9_-]+)/;
const DRIVE_OPEN_ID_RE = /[?&]id=([a-zA-Z0-9_-]+)/;
const DRIVE_PROXY_RE = /^\/api\/gdrive-image\/([a-zA-Z0-9_-]+)$/;
const LH3_DRIVE_RE = /googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i;

export type RichHtmlImageOptions = {
  lazyLoading?: boolean;
  googleDriveEmbeds?: boolean;
  convertPlainDriveUrls?: boolean;
};

export function richHtmlImageOptionsFromEditor(re: RichEditorAppearance): RichHtmlImageOptions {
  return {
    lazyLoading: re.imageLazyLoading,
    googleDriveEmbeds: re.googleDriveEmbeds,
  };
}

export function isGoogleDriveUrl(url: string): boolean {
  const t = url.trim();
  return (
    /(?:drive|docs)\.google\.com/i.test(t) ||
    DRIVE_PROXY_RE.test(t) ||
    LH3_DRIVE_RE.test(t)
  );
}

export function extractGoogleDriveFileId(url: string): string | null {
  const trimmed = url.trim();
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

/** Same-origin proxy — reliable in &lt;img&gt;, PDF export, and CKEditor preview. */
export function googleDriveImageUrl(fileId: string): string {
  return `/api/gdrive-image/${fileId}`;
}

/** Direct Google URLs tried by the server proxy and client onerror fallback. */
export function googleDriveDirectCandidates(fileId: string): string[] {
  return [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://lh3.googleusercontent.com/d/${fileId}=w1920`,
  ];
}

export function resolveImageSrc(url: string): string {
  const id = extractGoogleDriveFileId(url);
  return id ? googleDriveImageUrl(id) : url.trim();
}

/** Resolve a pasted link for editor insert (Drive share link or direct public image URL). */
export function resolveImageInsertUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) return googleDriveImageUrl(driveId);

  if (!/^https?:\/\/.+/i.test(trimmed)) return null;
  if (/(?:drive|docs)\.google\.com/i.test(trimmed)) return null;
  return trimmed;
}

function loadingAttrs(lazyLoading: boolean): string {
  return lazyLoading ? ' loading="lazy" decoding="async"' : ' loading="eager" decoding="async"';
}

function imgTag(src: string, alt = "", lazyLoading = true): string {
  const fileId = extractGoogleDriveFileId(src);
  const safeSrc = fileId ? googleDriveImageUrl(fileId) : resolveImageSrc(src);
  const safeAlt = alt.replace(/"/g, "&quot;");
  const dataAttr = fileId ? ` data-gdrive-id="${fileId}"` : "";
  return `<img${loadingAttrs(lazyLoading)} referrerpolicy="no-referrer"${dataAttr} src="${safeSrc}" alt="${safeAlt}" class="rich-html-image rich-html-gdrive" />`;
}

function applyImgLoadingAttrs(attrs: string, lazyLoading: boolean): string {
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

/** Replace Drive anchors / plain URLs / img src with lazy-loaded embeddable images. */
export function transformRichHtmlImages(html: string, options: RichHtmlImageOptions = {}): string {
  const lazyLoading = options.lazyLoading !== false;
  const googleDriveEmbeds = options.googleDriveEmbeds !== false;
  const convertPlainDriveUrls = options.convertPlainDriveUrls !== false;
  let out = String(html ?? "");
  if (!out.trim()) return out;

  if (googleDriveEmbeds) {
    out = out.replace(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/gi, (match, href: string) => {
      const id = extractGoogleDriveFileId(href);
      return id ? imgTag(href, "", lazyLoading) : match;
    });

    if (convertPlainDriveUrls) {
      out = out.replace(
        /(?:^|>|[^"'=])(https?:\/\/(?:drive|docs)\.google\.com\/[^\s<"']+)/gi,
        (match, url: string) => {
          const id = extractGoogleDriveFileId(url);
          if (!id) return match;
          const prefix = match.slice(0, match.length - url.length);
          return `${prefix}${imgTag(url, "", lazyLoading)}`;
        },
      );
    }
  }

  out = out.replace(/<img\b([^>]*?)>/gi, (_match, attrs: string) => {
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

export function prepareRichHtmlForDisplay(html: string, options: RichHtmlImageOptions = {}): string {
  return transformRichHtmlImages(html, options);
}

/** Client-only: if proxy fails, try direct Google thumbnail URLs. */
export function attachGoogleDriveImageFallbacks(root: HTMLElement | null): () => void {
  if (!root) return () => {};
  const cleanups: Array<() => void> = [];

  for (const img of root.querySelectorAll<HTMLImageElement>("img[data-gdrive-id]")) {
    const fileId = img.dataset.gdriveId?.trim();
    if (!fileId) continue;

    const candidates = googleDriveDirectCandidates(fileId);
    let index = 0;

    const onError = () => {
      while (index < candidates.length) {
        const next = candidates[index++];
        if (img.src !== next) {
          img.src = next;
          return;
        }
      }
      img.classList.add("rich-html-gdrive-failed");
      if (!img.alt) img.alt = "Google Drive image — file must be shared: Anyone with the link";
    };

    img.addEventListener("error", onError);
    cleanups.push(() => img.removeEventListener("error", onError));
  }

  return () => {
    for (const off of cleanups) off();
  };
}
