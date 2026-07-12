/** Shared source input helpers — API-ready for future native mobile clients */

export const ACCEPTED_SOURCE_TYPES = "image/*,application/pdf,.pdf";

export function isAcceptedSourceFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (file.type === "application/pdf") return true;
  return file.name.toLowerCase().endsWith(".pdf");
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function readFilePreview(file: File): Promise<string> {
  if (isPdfFile(file)) return "";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function fileFromClipboardItem(item: DataTransferItem): File | null {
  if (item.kind !== "file") return null;
  const f = item.getAsFile();
  if (!f) return null;
  return isAcceptedSourceFile(f) ? f : null;
}

export async function fileFromPasteEvent(event: ClipboardEvent): Promise<File | null> {
  const items = event.clipboardData?.items;
  if (!items) return null;
  for (const item of Array.from(items)) {
    const f = fileFromClipboardItem(item);
    if (f) return f;
  }
  return null;
}

export async function compressImage(file: File, maxWidth = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(src);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(src);
      reject(err);
    };
    img.src = src;
  });

  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

export async function prepareSourceFileForUpload(file: File): Promise<File> {
  if (isPdfFile(file)) return file;
  return compressImage(file);
}
