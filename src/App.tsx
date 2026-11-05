import { ThemeProvider } from "next-themes"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import { AppLayout } from "@/components/app-layout"
import { CatalogSplash } from "@/components/catalog-splash"
import { PlayerProvider } from "@/components/player/player-context"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CatalogProvider, useCatalog } from "@/lib/catalog"
import { BrowsePage } from "@/routes/browse"
import { FavouritesPage } from "@/routes/favourites"
import { HomePage } from "@/routes/home"
import { MyStreamsPage } from "@/routes/my-streams"
import { NotFoundPage } from "@/routes/not-found"
import { WatchPage } from "@/routes/watch"

function Shell() {
  const { status, progress, error, refresh } = useCatalog()

  if (status === "loading") return <CatalogSplash progress={progress} />
  if (status === "error") return <CatalogSplash progress={0} error={error} onRetry={refresh} />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="browse" element={<BrowsePage />} />
        <Route path="watch/:channelId" element={<WatchPage />} />
        <Route path="favourites" element={<FavouritesPage />} />
        <Route path="my-streams" element={<MyStreamsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="live-tv-hub:theme">
      <TooltipProvider delayDuration={200}>
        <CatalogProvider>
          <BrowserRouter>
            <PlayerProvider>
              <Shell />
            </PlayerProvider>
          </BrowserRouter>
        </CatalogProvider>
        <Toaster position="bottom-center" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  )
}
