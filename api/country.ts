/** Vercel supplies this header from the visitor's network, not the server timezone. */
export default function handler(
  request: { headers: Record<string, string | string[] | undefined> },
  response: { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } },
) {
  const value = request.headers["x-vercel-ip-country"]
  const country = typeof value === "string" && /^[A-Z]{2}$/.test(value) && !["XX", "ZZ"].includes(value)
    ? value : null
  // Never share one visitor's location with another through a CDN cache.
  response.setHeader("Cache-Control", "private, no-store")
  response.setHeader("Vercel-CDN-Cache-Control", "no-store")
  response.status(200).json({ country })
}
