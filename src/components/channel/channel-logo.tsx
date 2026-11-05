import * as React from "react"

import { monogram, hueFromString } from "@/lib/format"
import type { Channel } from "@/lib/iptv/types"
import { cn } from "@/lib/utils"

interface ChannelLogoProps {
  channel: Channel
  className?: string
  /** Render the fallback monogram immediately (skip the network logo). */
  plain?: boolean
}

/**
 * Channel artwork.
 *
 * iptv-org logos come from every corner of the internet — white PNGs, tall
 * badges, dead imgur links. They are always laid on a light plate so dark logos
 * stay legible in dark mode, and any load failure degrades to a deterministic
 * monogram tile.
 */
export function ChannelLogo({ channel, className, plain }: ChannelLogoProps) {
  const [failed, setFailed] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)
  const hue = hueFromString(channel.id)
  const showImage = Boolean(channel.logo) && !failed && !plain

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-zinc-100 [container-type:inline-size] dark:bg-zinc-200/90",
        className,
      )}
    >
      {showImage ? (
        <>
          <img
            src={channel.logo}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              "max-h-full max-w-[86%] object-contain p-1.5 transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
          {!loaded ? (
            <span
              className="absolute inset-0 animate-pulse"
              style={{ background: `oklch(92% 0.01 ${hue})` }}
              aria-hidden
            />
          ) : null}
        </>
      ) : (
        <span
          className="absolute inset-0"
          style={{
            background: `linear-gradient(140deg, oklch(58% 0.14 ${hue}) 0%, oklch(42% 0.12 ${hue + 40}) 100%)`,
          }}
          aria-hidden
        />
      )}
      {!showImage ? (
        <span className="relative font-semibold tracking-tight text-white/95 drop-shadow-sm [font-size:clamp(0.65rem,12cqw,1.75rem)]">
          {monogram(channel.name)}
        </span>
      ) : null}
    </div>
  )
}
