import { useEffect, useMemo, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Alignment,
  Base64UploadAdapter,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  Font,
  Heading,
  Highlight,
  Image,
  ImageCaption,
  ImageResize,
  ImageStyle,
  ImageTextAlternative,
  ImageToolbar,
  ImageUpload,
  Indent,
  Italic,
  Link,
  List,
  Paragraph,
  PictureEditing,
  RemoveFormat,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TableToolbar,
  Underline,
  Undo,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  variant?: "default" | "compact";
};

const FONT_FAMILIES = [
  "default",
  "Arial, Helvetica, sans-serif",
  "Courier New, Courier, monospace",
  "Georgia, serif",
  "Lucida Sans Unicode, Lucida Grande, sans-serif",
  "Tahoma, Geneva, sans-serif",
  "Times New Roman, Times, serif",
  "Trebuchet MS, Helvetica, sans-serif",
  "Verdana, Geneva, sans-serif",
  "Noto Sans Bengali, Noto Sans, sans-serif",
  "SolaimanLipi, Noto Sans Bengali, sans-serif",
];

const FONT_SIZES = ["default", 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

/** Text + highlight colors including translucent backgrounds (opacity). */
const COLOR_PALETTE = [
  { color: "hsl(0, 0%, 0%)", label: "Black" },
  { color: "hsl(0, 0%, 30%)", label: "Dim grey" },
  { color: "hsl(0, 0%, 60%)", label: "Grey" },
  { color: "hsl(0, 0%, 90%)", label: "Light grey" },
  { color: "hsl(0, 0%, 100%)", label: "White", hasBorder: true },
  { color: "hsl(0, 75%, 60%)", label: "Red" },
  { color: "hsl(30, 75%, 60%)", label: "Orange" },
  { color: "hsl(60, 75%, 60%)", label: "Yellow" },
  { color: "hsl(90, 75%, 60%)", label: "Light green" },
  { color: "hsl(120, 75%, 60%)", label: "Green" },
  { color: "hsl(180, 75%, 60%)", label: "Aquamarine" },
  { color: "hsl(210, 75%, 60%)", label: "Turquoise" },
  { color: "hsl(240, 75%, 60%)", label: "Light blue" },
  { color: "hsl(270, 75%, 60%)", label: "Purple" },
  { color: "hsla(0, 75%, 60%, 0.25)", label: "Red 25%" },
  { color: "hsla(60, 75%, 60%, 0.35)", label: "Yellow 35%" },
  { color: "hsla(120, 75%, 60%, 0.3)", label: "Green 30%" },
  { color: "hsla(210, 75%, 60%, 0.3)", label: "Blue 30%" },
  { color: "hsla(270, 75%, 60%, 0.3)", label: "Purple 30%" },
  { color: "hsla(0, 0%, 0%, 0.15)", label: "Black 15%" },
  { color: "hsla(0, 0%, 0%, 0.35)", label: "Black 35%" },
];

const fontConfig = {
  fontFamily: {
    options: FONT_FAMILIES,
    supportAllValues: true,
  },
  fontSize: {
    options: FONT_SIZES,
    supportAllValues: true,
  },
  fontColor: {
    colors: COLOR_PALETTE,
    columns: 5,
    colorPicker: { format: "hsla" as const },
  },
  fontBackgroundColor: {
    colors: COLOR_PALETTE,
    columns: 5,
    colorPicker: { format: "hsla" as const },
  },
};

const baseConfig = {
  licenseKey: "GPL" as const,
  plugins: [
    Essentials,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Subscript,
    Superscript,
    Paragraph,
    Heading,
    Font,
    Highlight,
    RemoveFormat,
    Link,
    List,
    Alignment,
    BlockQuote,
    Table,
    TableToolbar,
    Image,
    ImageToolbar,
    ImageCaption,
    ImageStyle,
    ImageTextAlternative,
    ImageResize,
    ImageUpload,
    Base64UploadAdapter,
    PictureEditing,
    Indent,
    Undo,
  ],
  toolbar: {
    items: [
      "undo",
      "redo",
      "|",
      "heading",
      "|",
      "fontFamily",
      "fontSize",
      "|",
      "fontColor",
      "fontBackgroundColor",
      "highlight",
      "|",
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "subscript",
      "superscript",
      "removeFormat",
      "|",
      "bulletedList",
      "numberedList",
      "|",
      "alignment",
      "|",
      "outdent",
      "indent",
      "|",
      "link",
      "blockQuote",
      "insertTable",
      "uploadImage",
    ],
    shouldNotGroupWhenFull: false,
  },
  heading: {
    options: [
      { model: "paragraph", title: "Normal", class: "ck-heading_paragraph" },
      { model: "heading1", view: "h1", title: "Heading 1", class: "ck-heading_heading1" },
      { model: "heading2", view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
      { model: "heading3", view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
    ],
  },
  ...fontConfig,
  highlight: {
    options: [
      { model: "yellowMarker", class: "marker-yellow", title: "Yellow marker", color: "var(--ck-highlight-marker-yellow)", type: "marker" },
      { model: "greenMarker", class: "marker-green", title: "Green marker", color: "var(--ck-highlight-marker-green)", type: "marker" },
      { model: "pinkMarker", class: "marker-pink", title: "Pink marker", color: "var(--ck-highlight-marker-pink)", type: "marker" },
      { model: "blueMarker", class: "marker-blue", title: "Blue marker", color: "var(--ck-highlight-marker-blue)", type: "marker" },
    ],
  },
  table: {
    contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
  },
  image: {
    toolbar: [
      "imageTextAlternative",
      "toggleImageCaption",
      "imageStyle:inline",
      "imageStyle:block",
      "imageStyle:side",
      "|",
      "resizeImage",
    ],
  },
  link: {
    addTargetToExternalLinks: true,
  },
};

const compactConfig = {
  licenseKey: "GPL" as const,
  plugins: [
    Essentials,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Paragraph,
    Heading,
    Font,
    RemoveFormat,
    Link,
    List,
    Alignment,
    Undo,
  ],
  toolbar: {
    items: [
      "undo",
      "redo",
      "|",
      "heading",
      "|",
      "fontFamily",
      "fontSize",
      "fontColor",
      "fontBackgroundColor",
      "|",
      "bold",
      "italic",
      "underline",
      "removeFormat",
      "|",
      "bulletedList",
      "numberedList",
      "|",
      "alignment",
      "|",
      "link",
    ],
    shouldNotGroupWhenFull: true,
  },
  heading: baseConfig.heading,
  ...fontConfig,
  link: baseConfig.link,
};

export function CKEditorField({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "180px",
  variant = "default",
}: Props) {
  const editorRef = useRef<ClassicEditor | null>(null);
  const lastEmitted = useRef(value);

  const config = useMemo(
    () => ({
      ...(variant === "compact" ? compactConfig : baseConfig),
      placeholder,
    }),
    [placeholder, variant],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value === lastEmitted.current) return;
    if (editor.getData() === value) return;
    editor.setData(value || "");
    lastEmitted.current = value;
  }, [value]);

  return (
    <div
      className={cn(
        "ckeditor-field rounded-md border bg-background overflow-hidden",
        variant === "compact" && "ckeditor-field--compact",
        className,
      )}
      style={{ "--ck-editor-min-height": minHeight } as React.CSSProperties}
    >
      <CKEditor
        editor={ClassicEditor}
        config={config}
        data={value || ""}
        onReady={(editor) => {
          editorRef.current = editor;
          lastEmitted.current = editor.getData();
        }}
        onChange={(_event, editor) => {
          const data = editor.getData();
          lastEmitted.current = data;
          onChange(data);
        }}
      />
    </div>
  );
}
