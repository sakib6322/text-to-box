export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type HeadingSlide = {
  id: string;
  headingText: string;
  headingTag: HeadingLevel | "intro";
  html: string;
};

export type SplitHtmlByHeadingsOptions = {
  levels: HeadingLevel[];
  /** Content before the first split heading */
  preHeadingMode?: "intro" | "mergeFirst";
  /** Soft-merge slides shorter than this (0 = off) */
  minCharsPerSlide?: number;
};

const LEVEL_RANK: Record<string, number> = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };

export type HeadingSplitFlags = {
  splitH1?: boolean;
  splitH2?: boolean;
  splitH3?: boolean;
  splitH4?: boolean;
  splitH5?: boolean;
  splitH6?: boolean;
};

export function levelsFromFlags(flags: HeadingSplitFlags): HeadingLevel[] {
  const levels: HeadingLevel[] = [];
  if (flags.splitH1) levels.push("h1");
  if (flags.splitH2) levels.push("h2");
  if (flags.splitH3) levels.push("h3");
  if (flags.splitH4) levels.push("h4");
  if (flags.splitH5) levels.push("h5");
  if (flags.splitH6) levels.push("h6");
  return levels.length ? levels : ["h1"];
}

export function extractHeadingText(htmlOrText: string): string {
  if (typeof document === "undefined") {
    return htmlOrText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = htmlOrText;
  return (tmp.textContent ?? "").replace(/\s+/g, " ").trim();
}

function serializeNodes(nodes: Node[]): string {
  const wrap = document.createElement("div");
  for (const n of nodes) wrap.appendChild(n.cloneNode(true));
  return wrap.innerHTML;
}

function unwrapBlocks(body: HTMLElement): ChildNode[] {
  let el: HTMLElement = body;
  // CKEditor / Word sometimes wrap everything in a single div
  while (
    el.children.length === 1 &&
    el.children[0] instanceof HTMLElement &&
    el.children[0].tagName === "DIV" &&
    !/^H[1-6]$/i.test(el.children[0].tagName)
  ) {
    el = el.children[0];
  }
  return [...el.childNodes];
}

function isSplitHeading(node: Node, levelSet: Set<string>): node is HTMLElement {
  return node.nodeType === 1 && levelSet.has((node as HTMLElement).tagName.toLowerCase());
}

function plainLen(html: string): number {
  return extractHeadingText(html).length;
}

function mergeTinySlides(slides: HeadingSlide[], minChars: number): HeadingSlide[] {
  if (minChars <= 0 || slides.length <= 1) return slides;
  const out: HeadingSlide[] = [];
  for (const s of slides) {
    if (out.length && plainLen(s.html) < minChars && s.headingTag !== "intro") {
      const prev = out[out.length - 1];
      out[out.length - 1] = {
        ...prev,
        html: `${prev.html}${s.html}`,
      };
    } else {
      out.push(s);
    }
  }
  return out;
}

/**
 * Split HTML into slides at selected heading levels.
 * Each matching heading starts a new slide until the next matching heading.
 */
export function splitHtmlByHeadings(html: string, options: SplitHtmlByHeadingsOptions): HeadingSlide[] {
  const raw = String(html ?? "").trim();
  if (!raw) return [];

  const levels = options.levels.length ? options.levels : (["h1"] as HeadingLevel[]);
  const levelSet = new Set(levels.map((l) => l.toLowerCase()));
  const preMode = options.preHeadingMode ?? "intro";
  const minChars = options.minCharsPerSlide ?? 0;

  if (typeof DOMParser === "undefined") {
    return [{ id: "slide-0", headingText: "", headingTag: "intro", html: raw }];
  }

  const doc = new DOMParser().parseFromString(`<div id="hs-root">${raw}</div>`, "text/html");
  const root = doc.getElementById("hs-root") ?? doc.body;
  const blocks = unwrapBlocks(root as HTMLElement);

  type Acc = { headingEl: HTMLElement | null; nodes: ChildNode[] };
  const groups: Acc[] = [];
  let current: Acc | null = null;

  for (const node of blocks) {
    if (isSplitHeading(node, levelSet)) {
      if (current) groups.push(current);
      current = { headingEl: node, nodes: [node] };
    } else if (!current) {
      current = { headingEl: null, nodes: [node] };
    } else {
      current.nodes.push(node);
    }
  }
  if (current) groups.push(current);

  if (!groups.length) {
    return [{ id: "slide-0", headingText: "", headingTag: "intro", html: raw }];
  }

  // No split headings found — single slide
  if (groups.every((g) => !g.headingEl)) {
    return [{ id: "slide-0", headingText: "", headingTag: "intro", html: serializeNodes(groups.flatMap((g) => g.nodes)) || raw }];
  }

  let slides: HeadingSlide[] = [];
  let introNodes: ChildNode[] = [];

  for (const g of groups) {
    if (!g.headingEl) {
      introNodes.push(...g.nodes);
      continue;
    }
    const headingText = extractHeadingText(g.headingEl.textContent ?? "");
    const tag = g.headingEl.tagName.toLowerCase() as HeadingLevel;
    let nodes = g.nodes;
    if (introNodes.length && preMode === "mergeFirst" && slides.length === 0) {
      nodes = [...introNodes, ...g.nodes];
      introNodes = [];
    }
    slides.push({
      id: `slide-${slides.length}`,
      headingText,
      headingTag: tag,
      html: serializeNodes(nodes),
    });
  }

  if (introNodes.length) {
    const introHtml = serializeNodes(introNodes);
    if (preMode === "intro" || slides.length === 0) {
      slides.unshift({
        id: "slide-intro",
        headingText: "Intro",
        headingTag: "intro",
        html: introHtml,
      });
    } else if (preMode === "mergeFirst" && slides[0]) {
      slides[0] = { ...slides[0], html: `${introHtml}${slides[0].html}` };
    }
  }

  // Re-id sequentially
  slides = slides.map((s, i) => ({ ...s, id: `slide-${i}` }));
  slides = mergeTinySlides(slides, minChars);
  slides = slides.map((s, i) => ({ ...s, id: `slide-${i}` }));

  return slides.length ? slides : [{ id: "slide-0", headingText: "", headingTag: "intro", html: raw }];
}

export function formatSlideTemplate(
  template: string,
  vars: { next?: string; heading?: string; current?: number | string; total?: number | string },
): string {
  return template
    .replaceAll("{next}", vars.next ?? "")
    .replaceAll("{heading}", vars.heading ?? "")
    .replaceAll("{current}", String(vars.current ?? ""))
    .replaceAll("{total}", String(vars.total ?? ""))
    .trim();
}

/** Rank helper for tests / future nested splits */
export function headingRank(tag: string): number {
  return LEVEL_RANK[tag.toLowerCase()] ?? 99;
}
