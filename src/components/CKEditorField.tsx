import { useEffect, useMemo, useRef, useState } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import { ImagePlus, ChevronDown } from "lucide-react";
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
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { resolveImageInsertUrl } from "@/lib/richHtmlImages";
import { compressImage } from "@/lib/sourceInput";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  variant?: "default" | "compact";
  /** Appearance-driven textbox shape from Concept details / Story tabs */
  appearanceScope?: "concept" | "story";
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
  fontFamily: { options: FONT_FAMILIES, supportAllValues: true },
  fontSize: { options: FONT_SIZES, supportAllValues: true },
  fontColor: { colors: COLOR_PALETTE, columns: 5, colorPicker: { format: "hsla" as const } },
  fontBackgroundColor: { colors: COLOR_PALETTE, columns: 5, colorPicker: { format: "hsla" as const } },
};

const DEFAULT_TOOLBAR_ITEMS = [
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
] as const;

const DEFAULT_PLUGINS = [
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
];

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
  heading: {
    options: [
      { model: "paragraph", title: "Normal", class: "ck-heading_paragraph" },
      { model: "heading1", view: "h1", title: "Heading 1", class: "ck-heading_heading1" },
      { model: "heading2", view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
      { model: "heading3", view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
    ],
  },
  ...fontConfig,
  link: { addTargetToExternalLinks: true },
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

function buildDefaultConfig(
  placeholder: string | undefined,
  directImageUpload: boolean,
) {
  const plugins = directImageUpload
    ? DEFAULT_PLUGINS
    : DEFAULT_PLUGINS.filter((p) => p !== ImageUpload && p !== Base64UploadAdapter);
  const items = DEFAULT_TOOLBAR_ITEMS.filter((item) => item !== "uploadImage" || directImageUpload);

  return {
    licenseKey: "GPL" as const,
    plugins,
    toolbar: {
      items: [...items],
      shouldNotGroupWhenFull: true,
    },
    placeholder,
    heading: compactConfig.heading,
    ...fontConfig,
    highlight: {
      options: [
        { model: "yellowMarker", class: "marker-yellow", title: "Yellow marker", color: "var(--ck-highlight-marker-yellow)", type: "marker" },
        { model: "greenMarker", class: "marker-green", title: "Green marker", color: "var(--ck-highlight-marker-green)", type: "marker" },
        { model: "pinkMarker", class: "marker-pink", title: "Pink marker", color: "var(--ck-highlight-marker-pink)", type: "marker" },
        { model: "blueMarker", class: "marker-blue", title: "Blue marker", color: "var(--ck-highlight-marker-blue)", type: "marker" },
      ],
    },
    table: { contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"] },
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
    link: { addTargetToExternalLinks: true },
  };
}

export function CKEditorField({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "180px",
  variant = "default",
  appearanceScope,
}: Props) {
  const { appearance } = useUiAppearance();
  const re = appearance.richEditor;
  const editorRef = useRef<ClassicEditor | null>(null);
  const lastEmitted = useRef(value);
  const [imageLink, setImageLink] = useState("");
  const [imageLinkError, setImageLinkError] = useState("");
  const [insertingImage, setInsertingImage] = useState(false);
  const [imageMenuOpen, setImageMenuOpen] = useState(false);

  const config = useMemo(() => {
    if (variant === "compact") {
      return { ...compactConfig, placeholder };
    }
    return buildDefaultConfig(placeholder, re.directImageUpload);
  }, [placeholder, variant, re.directImageUpload]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value === lastEmitted.current) return;
    if (editor.getData() === value) return;
    editor.setData(value || "");
    lastEmitted.current = value;
  }, [value]);

  const insertImageFromLink = async () => {
    const editor = editorRef.current;
    const imageUrl = resolveImageInsertUrl(imageLink);
    if (!editor) {
      setImageLinkError("Editor is not ready yet.");
      return;
    }
    if (!imageUrl) {
      setImageLinkError("Paste a public image URL or Google Drive image share link.");
      return;
    }

    setImageLinkError("");
    setInsertingImage(true);
    try {
      editor.model.change((writer) => {
        const image = writer.createElement("imageBlock", { src: imageUrl });
        editor.model.insertContent(image, editor.model.document.selection);
      });
      editor.editing.view.focus();
      setImageLink("");
      setImageMenuOpen(false);
    } finally {
      setInsertingImage(false);
    }
  };

  return (
    <div
      className={cn(
        "ckeditor-field",
        !appearanceScope && "rounded-md border bg-background",
        appearanceScope === "concept" && "ckeditor-field--concept",
        appearanceScope === "story" && "ckeditor-field--story",
        variant === "compact" && "ckeditor-field--compact",
        className,
      )}
      style={
        {
          "--ck-editor-min-height":
            appearanceScope === "concept"
              ? "var(--cd-textbox-min-height, 360px)"
              : appearanceScope === "story"
                ? "var(--sbl-textbox-min-height, 280px)"
                : minHeight,
        } as React.CSSProperties
      }
    >
      {re.googleDriveEmbeds ? (
        <div className="flex justify-end border-b bg-muted/20 px-2 py-1">
          <Popover open={imageMenuOpen} onOpenChange={setImageMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 gap-0.5 px-1.5 text-[10px] font-medium"
              >
                <ImagePlus className="h-3 w-3" />
                Image
                <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", imageMenuOpen && "rotate-180")} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end" sideOffset={4}>
              <div className="space-y-2">
                <p className="text-xs font-medium">Insert image from link</p>
                <Input
                  value={imageLink}
                  onChange={(e) => {
                    setImageLink(e.target.value);
                    if (imageLinkError) setImageLinkError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void insertImageFromLink();
                    }
                  }}
                  placeholder="Public image or Drive link"
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-7 w-full text-xs"
                  onClick={() => void insertImageFromLink()}
                  disabled={insertingImage}
                >
                  {insertingImage ? "Inserting…" : "Insert"}
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  Drive files must be shared as Anyone with the link.
                </p>
                {imageLinkError ? <p className="text-[10px] text-destructive">{imageLinkError}</p> : null}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}
      <CKEditor
        editor={ClassicEditor}
        config={config}
        data={value || ""}
        onReady={(editor) => {
          editorRef.current = editor;
          lastEmitted.current = editor.getData();

          if (re.directImageUpload && re.imageCompression) {
            editor.plugins.get("FileRepository").createUploadAdapter = (loader) => ({
              upload: () =>
                loader.file.then(async (file: File | null) => {
                  if (!file) throw new Error("No file");
                  const compressed = await compressImage(
                    file,
                    re.imageCompressionMaxWidthPx,
                    re.imageCompressionQuality,
                  );
                  return { default: await readFileAsDataUrl(compressed) };
                }),
              abort: () => {},
            });
          }
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
