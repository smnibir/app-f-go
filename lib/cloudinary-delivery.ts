/**
 * Cloudinary delivery helpers — download filename hints for browser saves.
 */

/**
 * Inserts `fl_attachment` after `/upload/` so Cloudinary sets Content-Disposition with a
 * proper filename (including extension). Use stored `Asset.filename` when possible.
 */
export function cloudinaryAttachmentDeliveryUrl(secureUrl: string, downloadFilename: string): string {
  const name =
    downloadFilename.trim().replace(/[^\w.\- ()[\]]+/g, "_").replace(/\s{2,}/g, " ").trim() ||
    "download";

  try {
    const u = new URL(secureUrl);
    const path = u.pathname;
    if (path.includes("fl_attachment")) return secureUrl;

    const marker = "/upload/";
    const i = path.indexOf(marker);
    if (i === -1) return secureUrl;

    const tail = path.slice(i + marker.length);
    const safe =
      name
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "")
        .slice(0, 120) || "document.pdf";
    u.pathname = `${path.slice(0, i + marker.length)}fl_attachment:${safe}/${tail}`;
    return u.toString();
  } catch {
    return secureUrl;
  }
}
