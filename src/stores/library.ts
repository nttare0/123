import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { Channel } from "@/lib/iptv/types"

export interface RecentEntry {
  id: string
  at: number
}

export interface CustomChannel {
  id: string
  name: string
  url: string
  logo?: string
  country?: string
  createdAt: number
}

interface LibraryState {
  /** Channel ids, most recently added first. */
  favorites: string[]
  /** Last watched, most recent first. */
  recents: RecentEntry[]
  /** Viewer-supplied streams (any .m3u8 they own or have permission to watch). */
  custom: CustomChannel[]

  toggleFavorite: (id: string) => void
  removeFavorite: (id: string) => void
  clearFavorites: () => void
  addRecent: (id: string) => void
  removeRecent: (id: string) => void
  clearRecents: () => void
  addCustom: (channel: Omit<CustomChannel, "id" | "createdAt">) => CustomChannel
  updateCustom: (id: string, patch: Partial<Omit<CustomChannel, "id">>) => void
  removeCustom: (id: string) => void
}

const MAX_RECENTS = 60

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recents: [],
      custom: [],

      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((f) => f !== id)
            : [id, ...state.favorites],
        })),

      removeFavorite: (id) =>
        set((state) => ({ favorites: state.favorites.filter((f) => f !== id) })),

      clearFavorites: () => set({ favorites: [] }),

      addRecent: (id) =>
        set((state) => ({
          recents: [
            { id, at: Date.now() },
            ...state.recents.filter((r) => r.id !== id),
          ].slice(0, MAX_RECENTS),
        })),

      removeRecent: (id) => set((state) => ({ recents: state.recents.filter((r) => r.id !== id) })),

      clearRecents: () => set({ recents: [] }),

      addCustom: (channel) => {
        const id = `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
        const entry: CustomChannel = { ...channel, id, createdAt: Date.now() }
        set((state) => ({ custom: [...state.custom, entry] }))
        return get().custom.at(-1) ?? entry
      },

      updateCustom: (id, patch) =>
        set((state) => ({
          custom: state.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      removeCustom: (id) => set((state) => ({ custom: state.custom.filter((c) => c.id !== id) })),
    }),
    {
      name: "live-tv-hub:library",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        recents: state.recents,
        custom: state.custom,
      }),
    },
  ),
)

/** Turn a viewer-supplied stream into a normal catalog channel. */
export function customToChannel(entry: CustomChannel): Channel {
  return {
    id: entry.id,
    name: entry.name || "Untitled stream",
    country: entry.country || "CUSTOM",
    categories: [],
    languages: [],
    logo: entry.logo,
    sources: [{ url: entry.url }],
  }
}
