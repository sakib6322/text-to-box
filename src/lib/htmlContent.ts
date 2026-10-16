/** Walk HTML and keep list markers so plain-text consumers (AI extract, etc.) retain structure. */
function serializeNode(node: Node, listStack: Array<"ul" | "ol"> = []): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === "br") return "\n";
  if (tag === "ul" || tag === "ol") {
    const next = [...listStack, tag as "ul" | "ol"];
    let out = "";
    for (const child of Array.from(el.childNodes)) {
      out += serializeNode(child, next);
    }
    return out.endsWith("\n") ? out : `${out}\n`;
  }
  if (tag === "li") {
    const depth = Math.max(0, listStack.length - 1);
    const indent = "  ".repeat(depth);
    const parent = listStack[listStack.length - 1] ?? "ul";
    let marker = "•";
    if (parent === "ol") {
      const index = Array.from(el.parentElement?.children ?? [])
        .filter((c) => c.tagName.toLowerCase() === "li")
        .indexOf(el);
      marker = `${Math.max(1, index + 1)}.`;
    } else if (depth === 1) {
      marker = "○";
    } else if (depth >= 2) {
      marker = "■";
    }
    let inner = "";
    for (const child of Array.from(el.childNodes)) {
      if ((child as HTMLElement).tagName?.toLowerCase() === "ul" || (child as HTMLElement).tagName?.toLowerCase() === "ol") {
        continue;
      }
      inner += serializeNode(child, listStack);
    }
    inner = inner.replace(/\s+/g, " ").trim();
    let out = `${indent}${marker} ${inner}\n`;
    for (const child of Array.from(el.childNodes)) {
      const childTag = (child as HTMLElement).tagName?.toLowerCase();
      if (childTag === "ul" || childTag === "ol") {
        out += serializeNode(child, listStack);
      }
    }
    return out;
  }
  if (tag === "p" || tag === "div" || /^h[1-6]$/.test(tag)) {
    let inner = "";
    for (const child of Array.from(el.childNodes)) {
      inner += serializeNode(child, listStack);
    }
    const trimmed = inner.replace(/[ \t]+\n/g, "\n").trim();
    return trimmed ? `${trimmed}\n` : "";
  }

  let out = "";
  for (const child of Array.from(el.childNodes)) {
    out += serializeNode(child, listStack);
  }
  return out;
}

export function htmlToPlainText(html: string): string {
  if (!html.trim()) return "";
  if (typeof document === "undefined") {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[^\S\n]+/g, " ")
      .trim();
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return serializeNode(doc.body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isHtmlEmpty(html: string): boolean {
  const plain = htmlToPlainText(html)
    .replace(/^[•○■]\s*/gm, "")
    .replace(/^\d+\.\s*/gm, "")
    .replace(/\s+/g, "");
  return plain.length === 0;
}

export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}
