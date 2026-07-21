/** Utilities for Appearance color pickers — HSL theme tokens vs CSS hex/rgb. */

export function isHslToken(value: string): boolean {
  return /^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%(\s*\/\s*[\d.]+%?)?$/.test(value.trim());
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  if (h.length === 6) {
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function parseRgbString(value: string): { r: number; g: number; b: number } | null {
  const m = value.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (!m) return null;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}

function parseHslString(value: string): { h: number; s: number; l: number } | null {
  const m = value.trim().match(/^hsla?\(\s*([\d.]+)\s*,?\s*([\d.]+)%\s*,?\s*([\d.]+)%/i);
  if (!m) return null;
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

export function hexToHslToken(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "0 0% 0%";
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

export function hslTokenToHex(token: string): string {
  const parsed = parseHslString(`hsl(${token.trim()})`);
  if (!parsed) return "#000000";
  const { h, s, l } = parsed;
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Normalize any stored color to #rrggbb for the native color picker. */
export function appearanceColorToHex(value: string): string {
  const v = value.trim();
  if (!v) return "#000000";
  if (v.startsWith("#")) {
    const parsed = parseHex(v);
    return parsed ? rgbToHex(parsed.r, parsed.g, parsed.b) : "#000000";
  }
  if (isHslToken(v)) return hslTokenToHex(v);
  const hsl = parseHslString(v);
  if (hsl) {
    const { h, s, l } = hsl;
    const sNorm = s / 100;
    const lNorm = l / 100;
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lNorm - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }
    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }
  const rgb = parseRgbString(v);
  if (rgb) return rgbToHex(rgb.r, rgb.g, rgb.b);
  return "#000000";
}

/** Theme tokens (shadcn H S% L%) — picker returns this format. */
export function themeColorFromPicker(hex: string): string {
  return hexToHslToken(hex);
}

/** CSS colors (#hex) — picker returns hex; typing hsl token converts to hex. */
export function cssColorFromPicker(hex: string): string {
  return appearanceColorToHex(hex);
}

export function normalizeCssColorInput(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (v.startsWith("#")) return appearanceColorToHex(v);
  if (isHslToken(v)) return hslTokenToHex(v);
  return v;
}

export function normalizeThemeColorInput(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (isHslToken(v)) return v;
  if (v.startsWith("#")) return hexToHslToken(v);
  const hex = appearanceColorToHex(v);
  if (hex !== "#000000" || v === "#000000" || v === "black") return hexToHslToken(hex);
  return v;
}

/** Apply-time: wrap HSL tokens as hsl(), pass through hex/rgb/hsl(). */
export function toCssColor(value: string): string {
  const v = value.trim();
  if (!v) return "transparent";
  if (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl(")) return v;
  if (isHslToken(v)) return `hsl(${v})`;
  return v;
}
