import { ThemeProvider } from "next-themes"
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"

import { Seo } from "@/components/seo"
import { AppLayout } from "@/components/app-layout"
import { CatalogSplash } from "@/components/catalog-splash"
import { PlayerProvider } from "@/components/player/player-context"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CatalogProvider, useCatalog } from "@/lib/catalog"
import { BrowsePage } from "@/routes/browse"
import { FavouritesPage } from "@/routes/favourites"
import { HomePage } from "@/routes/home"
import { NotFoundPage } from "@/routes/not-found"
import { WatchPage } from "@/routes/watch"

function Shell() {
  const { status, progress, error } = useCatalog()
  const { pathname } = useLocation()
  // Invalid routes should not depend on a successful catalog download.
  if (!["/", "/browse", "/favourites"].includes(pathname) && !/^\/watch\/[^/]+$/.test(pathname)) {
    return <><Seo /><NotFoundPage /></>
  }

  if (status === "loading") return <CatalogSplash progress={progress} />
  if (status === "error")
    return <CatalogSplash progress={0} error={error} onRetry={() => window.location.reload()} />

  return (
    <>
    <Seo />
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="browse" element={<BrowsePage />} />
        <Route path="watch/:channelId" element={<WatchPage />} />
        <Route path="favourites" element={<FavouritesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="live-tv-hub:theme">
      <TooltipProvider delayDuration={200}>
        <CatalogProvider>
          <BrowserRouter>
            <PlayerProvider>
              <Shell />
            </PlayerProvider>
          </BrowserRouter>
        </CatalogProvider>
        <Toaster position="bottom-center" richColors />
      </TooltipProvider>
    </ThemeProvider>
  )
}
