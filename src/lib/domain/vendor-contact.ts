// Light validation and link-building for vendor contact details. Lenient on input (people paste
// "florist.com", "@lumenphoto" or a full Instagram link), strict about what becomes a link.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isLikelyEmail(input: string): boolean {
  return EMAIL.test(input.trim());
}

/**
 * "florist.com" → "https://florist.com/". Only http(s) links with a real-looking host.
 * Returns null for anything else (including other schemes like javascript: or ftp://).
 */
export function normalizeWebUrl(input: string): string | null {
  const s = input.trim();
  if (!s || /\s/.test(s)) return null;
  let candidate: string;
  if (/^https?:\/\//i.test(s)) candidate = s;
  else if (s.includes("://")) return null;
  else candidate = `https://${s}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return null;
  if (url.username || url.password) return null;
  return url.toString();
}

/** A link as people say it: "florist.com/weddings" (no scheme, no www, no trailing slash). */
export function displayUrl(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

/** "@lumenphoto", "lumenphoto" or "instagram.com/lumenphoto/" → "lumenphoto". */
export function normalizeInstagram(input: string): string | null {
  let s = input.trim();
  const fromUrl = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#\s]+)\/?(?:[?#].*)?$/i.exec(s);
  if (fromUrl) s = fromUrl[1];
  s = s.replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(s) ? s : null;
}

export function instagramUrl(handle: string): string {
  return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
}

/** Digits, spaces and the usual punctuation, with at least 7 digits, and an optional extension. */
export function isLikelyPhone(input: string): boolean {
  const s = input.trim();
  const m = /^(\+?[\d\s().\-–]+?)(?:\s*(?:x|ext\.?)\s*\d{1,6})?$/i.exec(s);
  if (!m) return false;
  const digits = m[1].replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/** tel: link for a phone number ("(201) 555-0142 ext 3" → "tel:2015550142,3"). */
export function telHref(phone: string): string {
  const s = phone.trim();
  const ext = /(?:x|ext\.?)\s*(\d{1,6})$/i.exec(s);
  const main = ext ? s.slice(0, ext.index) : s;
  const plus = main.trim().startsWith("+") ? "+" : "";
  return `tel:${plus}${main.replace(/\D/g, "")}${ext ? `,${ext[1]}` : ""}`;
}
