import * as React from "react"

let lookup: Promise<string> | undefined

/** One same-origin, country-only lookup per page load; no GPS or timezone guessing. */
export function detectCountry(): Promise<string> {
  return lookup ??= fetch("/api/country", {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
    headers: { accept: "application/json" },
  }).then(async (response) => {
    if (!response.ok) return ""
    const data: unknown = await response.json()
    const value = (data as { country?: unknown } | null)?.country
    return typeof value === "string" && /^[A-Z]{2}$/.test(value) && !["XX", "ZZ"].includes(value) ? value : ""
  }).catch(() => "")
}

export function useDetectedCountry(enabled = true): string {
  const [country, setCountry] = React.useState("")
  React.useEffect(() => {
    if (!enabled) return
    let active = true
    void detectCountry().then((value) => { if (active) setCountry(value) })
    return () => { active = false }
  }, [enabled])
  return country
}
