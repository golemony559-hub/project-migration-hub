import { getRequest } from "@tanstack/react-start/server";

/** The site address used for links in emails; never taken from arbitrary caller input. */
export function siteOrigin() {
  const request = getRequest();
  const own = new URL(request.url);
  if (own.hostname !== "localhost" && own.hostname !== "127.0.0.1") return own.origin;
  const header = request.headers.get("origin") ?? "";
  return /^https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com)$/i.test(header) ? header : own.origin;
}
