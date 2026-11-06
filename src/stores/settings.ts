import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export interface SettingsState {
  /** Country the home screen is built around. */
  homeCountry: string
  /** Start playback as soon as a channel is opened. */
  autoplay: boolean
  /** Try the next mirror automatically when a source fails. */
  autoFailover: boolean
  /** Hide sources that need a Referer/User-Agent a browser cannot set. */
  hideHeaderOnly: boolean
  volume: number
  muted: boolean
  set: (patch: Partial<SettingsState>) => void
}

const DEFAULTS = {
  homeCountry: "",
  autoplay: true,
  autoFailover: true,
  hideHeaderOnly: true,
  volume: 1,
  muted: false,
}

const KEYS = Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
    }),
    {
      name: "live-tv-hub:settings",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => Object.fromEntries(KEYS.map((k) => [k, state[k]])),
      // Drop keys from older versions of the app.
      migrate: (persisted) => {
        const raw = (persisted ?? {}) as Record<string, unknown>
        // Rwanda was the old hard-coded default, not a detected location.
        if (raw.homeCountry === "RW") raw.homeCountry = ""
        return Object.fromEntries(KEYS.filter((k) => k in raw).map((k) => [k, raw[k]]))
      },
    },
  ),
)

/**
 * Plain-http media is blocked as mixed content on an https page, so those
 * sources are only worth listing when the page itself is http.
 */
export function httpsOnly(): boolean {
  return typeof window !== "undefined" && window.isSecureContext
}
