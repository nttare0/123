import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type ChannelView = "grid" | "list"
export type StreamProtocolPolicy = "auto" | "https" | "any"

export interface SettingsState {
  /** Country the home screen is built around. */
  homeCountry: string
  /** Start playback as soon as a channel is opened. */
  autoplay: boolean
  /**
   * `auto` drops plain-http streams on https pages (they would be blocked as
   * mixed content), `https` always hides them, `any` shows everything.
   */
  protocol: StreamProtocolPolicy
  /** Hide channels whose streams only work with a custom Referer/User-Agent. */
  hideHeaderOnly: boolean
  /** Hide streams the project marks as geo-blocked. */
  hideGeoBlocked: boolean
  /** Hide streams the project marks as not broadcasting 24/7. */
  hideNot247: boolean
  /** Show the bitrate / dropped-frames readout on the player. */
  showStats: boolean
  /** Automatically try the next source when one fails. */
  autoFailover: boolean
  volume: number
  muted: boolean
  view: ChannelView
  set: (patch: Partial<SettingsState>) => void
  reset: () => void
}

export const DEFAULT_SETTINGS = {
  homeCountry: "RW",
  autoplay: true,
  protocol: "auto" as StreamProtocolPolicy,
  hideHeaderOnly: true,
  hideGeoBlocked: false,
  hideNot247: false,
  showStats: false,
  autoFailover: true,
  volume: 1,
  muted: false,
  view: "grid" as ChannelView,
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: "live-tv-hub:settings",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        homeCountry: state.homeCountry,
        autoplay: state.autoplay,
        protocol: state.protocol,
        hideHeaderOnly: state.hideHeaderOnly,
        hideGeoBlocked: state.hideGeoBlocked,
        hideNot247: state.hideNot247,
        showStats: state.showStats,
        autoFailover: state.autoFailover,
        volume: state.volume,
        muted: state.muted,
        view: state.view,
      }),
    },
  ),
)

/** Protocol filter resolved against the current page, used by the catalog filters. */
export function resolveProtocol(policy: StreamProtocolPolicy): "https" | "any" {
  if (policy === "https") return "https"
  if (policy === "any") return "any"
  return typeof window !== "undefined" && window.isSecureContext ? "https" : "any"
}
