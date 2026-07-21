import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  appearanceColorToHex,
  cssColorFromPicker,
  normalizeCssColorInput,
  normalizeThemeColorInput,
  themeColorFromPicker,
} from "@/lib/appearanceColors";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Shadcn theme token — stored as `222 47% 11%`, picker shows RGB/hex. */
export function ThemeColorField(props: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const pickerHex = appearanceColorToHex(props.value);
  return (
    <Field label={props.label} hint={props.hint ?? "রঙ সিলেক্ট করুন — অটো সেভ"}>
      <div className="flex gap-2">
        <Input
          type="color"
          className="h-10 w-14 shrink-0 cursor-pointer p-1"
          value={pickerHex}
          onChange={(e) => props.onChange(themeColorFromPicker(e.target.value))}
          aria-label={`${props.label} color picker`}
        />
        <Input
          value={pickerHex}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (v.startsWith("#")) props.onChange(themeColorFromPicker(v));
            else props.onChange(normalizeThemeColorInput(v));
          }}
          onBlur={(e) => props.onChange(normalizeThemeColorInput(e.target.value))}
          placeholder="#2563eb"
        />
      </div>
    </Field>
  );
}

/** Full CSS color — stored as #hex (or legacy hsl/rgb string). */
export function ColorField(props: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const pickerHex = appearanceColorToHex(props.value);
  return (
    <Field label={props.label} hint={props.hint ?? "রঙ সিলেক্ট করুন"}>
      <div className="flex gap-2">
        <Input
          type="color"
          className="h-10 w-14 shrink-0 cursor-pointer p-1"
          value={pickerHex}
          onChange={(e) => props.onChange(cssColorFromPicker(e.target.value))}
          aria-label={`${props.label} color picker`}
        />
        <Input
          value={props.value.startsWith("#") ? pickerHex : props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onBlur={(e) => props.onChange(normalizeCssColorInput(e.target.value))}
          placeholder="#2563eb"
        />
      </div>
    </Field>
  );
}

/** Progress / mixed HSL-token-or-hex fields. */
export function FlexibleColorField(props: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const pickerHex = appearanceColorToHex(props.value);
  const isToken = !props.value.trim().startsWith("#") && !props.value.trim().startsWith("rgb");
  return (
    <Field label={props.label} hint={props.hint ?? "রঙ সিলেক্ট করুন"}>
      <div className="flex gap-2">
        <Input
          type="color"
          className="h-10 w-14 shrink-0 cursor-pointer p-1"
          value={pickerHex}
          onChange={(e) => props.onChange(isToken ? themeColorFromPicker(e.target.value) : cssColorFromPicker(e.target.value))}
          aria-label={`${props.label} color picker`}
        />
        <Input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v.startsWith("#")) props.onChange(v);
            else if (isToken) props.onChange(normalizeThemeColorInput(v));
            else props.onChange(normalizeCssColorInput(v));
          }}
          placeholder="#2563eb"
        />
      </div>
    </Field>
  );
}
