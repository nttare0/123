import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export interface RecentEntry {
  id: string
  at: number
}

interface LibraryState {
  /** Channel ids, most recently added first. */
  favorites: string[]
  /** Last watched, most recent first. */
  recents: RecentEntry[]
  toggleFavorite: (id: string) => void
  clearFavorites: () => void
  addRecent: (id: string) => void
  clearRecents: () => void
}

const MAX_RECENTS = 40

export const useLibrary = create<LibraryState>()(
  persist(
    (set) => ({
      favorites: [],
      recents: [],
      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((f) => f !== id)
            : [id, ...state.favorites],
        })),
      clearFavorites: () => set({ favorites: [] }),
      addRecent: (id) =>
        set((state) => ({
          recents: [
            { id, at: Date.now() },
            ...state.recents.filter((r) => r.id !== id),
          ].slice(0, MAX_RECENTS),
        })),
      clearRecents: () => set({ recents: [] }),
    }),
    {
      name: "live-tv-hub:library",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ favorites: state.favorites, recents: state.recents }),
      migrate: (persisted) => {
        const raw = (persisted ?? {}) as Record<string, unknown>
        return { favorites: raw.favorites ?? [], recents: raw.recents ?? [] }
      },
    },
  ),
)
