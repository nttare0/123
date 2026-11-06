import * as React from "react"
import { useLocation } from "react-router-dom"
import { useCatalog } from "@/lib/catalog"

/** Route metadata for JS-capable crawlers. Legal pages are static HTML. */
export function Seo() {
  const { pathname, search } = useLocation()
  const { getChannel } = useCatalog()
  React.useEffect(() => {
    const watch = pathname.startsWith("/watch/")
    let id = ""
    try { id = decodeURIComponent(pathname.slice(7)) } catch { /* unknown URL */ }
    const channel = watch ? getChannel(id) : undefined
    const title = pathname === "/" ? "Zepvi — Free live TV from around the world"
      : pathname === "/browse" ? "Browse live TV channels | Zepvi"
      : channel ? `${channel.name} — Watch live | Zepvi`
      : pathname === "/favourites" ? "Your favourites | Zepvi" : "Page not found | Zepvi"
    const description = channel ? `Watch ${channel.name} live on Zepvi. Stream availability depends on the broadcaster.`
      : "Live TV. Less noise. Your channels, worldwide."
    document.title = title
    const set = (selector: string, attribute: string, value: string) => document.querySelector(selector)?.setAttribute(attribute, value)
    set('meta[name="description"]', 'content', description)
    set('meta[name="twitter:title"]', 'content', title)
    set('meta[name="twitter:description"]', 'content', description)
    set('meta[property="og:title"]', 'content', title)
    set('meta[property="og:description"]', 'content', description)
    const canonical = `https://droptv.vercel.app${pathname === "/browse" ? "/browse" : pathname}`
    set('link[rel="canonical"]', 'href', canonical)
    set('meta[property="og:url"]', 'content', canonical)
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots) }
    robots.content = pathname === "/" || (pathname === "/browse" && !search) ? "index,follow" : "noindex,follow"
  }, [pathname, search, getChannel])
  return null
}
