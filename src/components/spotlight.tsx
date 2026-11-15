import * as React from "react"
import { ArrowUpRight } from "lucide-react"
import { FALLBACK_MOVIES, loadSpotlight, type SpotlightItem } from "@/lib/spotlight"

/** A single cinematic feature with responsive artwork. */
export function Spotlight() {
  const [items, setItems] = React.useState<SpotlightItem[]>(FALLBACK_MOVIES)
  const [index, setIndex] = React.useState(0)
  const [failedImage, setFailedImage] = React.useState<string | null>(null)
  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [visible, setVisible] = React.useState(true)
  const [reducedMotion, setReducedMotion] = React.useState(false)
  React.useEffect(() => {
    let active = true
    const refresh = () => {
      void loadSpotlight().then((results) => {
        if (active && results.length) {
          setItems(results)
          setIndex((current) => current % results.length)
        }
      }).catch(() => { /* Keep bundled artwork or the last successful feed. */ })
    }
    refresh()
    const timer = window.setInterval(refresh, 30 * 60 * 1000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])
  React.useEffect(() => {
    const update = () => setVisible(!document.hidden)
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  React.useEffect(() => {
    if (reducedMotion || hovered || focused || !visible || items.length < 2) return
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), 5000)
    return () => window.clearInterval(timer)
  }, [reducedMotion, hovered, focused, visible, items.length, index])
  const item = items[index]

  return (
    <section aria-label="Featured entertainment"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }} className="w-full overflow-hidden bg-zinc-950 text-white">
      <div className="relative isolate flex min-h-[420px] items-end bg-zinc-950 sm:min-h-[540px] lg:min-h-[min(72vh,780px)]">
        {item?.image && failedImage !== item.image ? (
          <img key={item.image} src={item.image} alt={`${item.title}${item.curated ? " — original title artwork" : " poster"}`} fetchPriority="high"
            onError={() => setFailedImage(item.image)} className="absolute inset-0 -z-20 size-full object-cover object-[center_25%] sm:object-[center_30%]" />
        ) : <img src={FALLBACK_MOVIES[index % FALLBACK_MOVIES.length].image} alt="Zepvi curated title artwork" className="absolute inset-0 -z-20 size-full object-cover" />}
      <div className="w-full px-6 pt-36 pb-10 sm:px-10 sm:pb-14">
        {item ? (
          <div className="max-w-lg space-y-4" aria-live="off" aria-atomic="true">
            <p className="text-[0.625rem] font-medium tracking-[0.2em] text-white/60 uppercase">
              {item.curated ? "Curated movie pick" : `Movie picks${item.year ? ` · ${item.year}` : ""}`}
            </p>
            <h2 className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl">{item.title}</h2>
            {item.description ? <p className="line-clamp-2 max-w-md text-sm leading-relaxed text-white/60">{item.description}</p> : null}
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/85">
              View details <ArrowUpRight className="size-3.5" /><span className="sr-only"> (opens a new tab)</span>
            </a>
          </div>
        ) : null}
      </div>
      </div>
    </section>
  )
}
