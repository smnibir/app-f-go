/**
 * Safe `public_id` fragment (single segment, under folder) from original filename.
 * For **raw** assets Cloudinary expects the extension in `public_id` so URLs keep `.pdf`, `.mp3`, etc.
 */
export function cloudinaryPublicIdBaseFromFilename(filename: string): string {
  const leaf = filename.trim().split(/[/\\]/).pop() || "file";
  const safe = leaf.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return safe.slice(0, 200) || "file";
}
