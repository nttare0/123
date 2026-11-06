import * as React from "react"
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react"
import { loadSpotlight, type SpotlightItem } from "@/lib/spotlight"

/** A single cinematic feature with responsive artwork and manual navigation. */
export function Spotlight() {
  const [items, setItems] = React.useState<SpotlightItem[]>([])
  const [index, setIndex] = React.useState(0)
  const [failedImage, setFailedImage] = React.useState<string | null>(null)
  React.useEffect(() => {
    let active = true
    void loadSpotlight().then((results) => {
      if (active) setItems(results.filter((item) => item.image))
    }).catch(() => { /* The home heading remains usable without the external API. */ })
    return () => { active = false }
  }, [])
  const item = items[index]
  const move = (direction: number) => setIndex((current) => (current + direction + items.length) % items.length)

  return (
    <section aria-label="Featured entertainment" className="overflow-hidden rounded-2xl bg-zinc-950 text-white">
      <div className="relative isolate flex min-h-[480px] items-end bg-zinc-950 sm:min-h-[540px]">
        {item?.image && failedImage !== item.image ? (
          <img key={item.image} src={item.image} alt={`${item.title} poster`} fetchPriority="high"
            onError={() => setFailedImage(item.image)} className="absolute inset-0 -z-20 size-full object-cover object-[center_25%] sm:left-auto sm:w-3/4 sm:object-[center_30%]" />
        ) : <p className="px-6 text-sm text-zinc-400">Featured artwork is currently unavailable.</p>}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-zinc-950 via-zinc-950/75 to-transparent" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
      <div className="w-full px-6 pt-36 pb-10 sm:px-10 sm:pb-14">
        {item ? (
          <div className="max-w-lg space-y-4" aria-live="polite" aria-atomic="true">
            <p className="text-[10px] font-medium tracking-[0.2em] text-white/60 uppercase">
              Coming up · {item.kind} · <time dateTime={item.date}>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(item.date))}</time>
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
      {item ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-3 sm:px-10">
          <p className="text-[10px] text-white/60">
            <a href="https://www.tvmaze.com/api" target="_blank" rel="noreferrer" className="hover:text-white">TVmaze · CC BY-SA</a> · Discovery only, not playback
          </p>
          {items.length > 1 ? (
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/60 tabular-nums">{index + 1} / {items.length}</span>
              <button type="button" onClick={() => move(-1)} aria-label="Previous featured title" className="flex size-8 items-center justify-center rounded-full border border-white/10 transition-colors hover:bg-white/10"><ChevronLeft className="size-4" /></button>
              <button type="button" onClick={() => move(1)} aria-label="Next featured title" className="flex size-8 items-center justify-center rounded-full border border-white/10 transition-colors hover:bg-white/10"><ChevronRight className="size-4" /></button>
            </div>
          ) : null}
        </footer>
      ) : null}
    </section>
  )
}
