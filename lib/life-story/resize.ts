/**
 * Photos are shrunk before they are saved: a phone photo can be 5 MB, but a
 * game card needs about 100 KB. Smaller files also load faster on slow
 * connections and keep your Supabase storage small.
 */

export const MAX_PHOTO_SIDE = 800;
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/** The size an image should be so its longest side is at most `max`. Never enlarges. */
export function fitWithin(
  width: number,
  height: number,
  max: number = MAX_PHOTO_SIDE,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 1, height: 1 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Turns any photo the browser can open into a smaller JPEG. */
export async function resizeToJpeg(file: File, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo (a JPG or PNG picture).");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That photo is too large. Please choose one under 20 MB.");

  let bitmap: ImageBitmap;
  try {
    // "from-image" turns phone photos the right way up.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("That photo could not be opened. Try a JPG or PNG picture.");
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare photos.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("That photo could not be prepared. Please try another.");
  return blob;
}
