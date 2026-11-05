import * as React from "react"
import { Outlet, useNavigate } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { CommandMenu } from "@/components/command-menu"
import { VideoStage } from "@/components/player/video-stage"
import { SettingsDialog } from "@/components/settings-dialog"
import { ShortcutsDialog } from "@/components/shortcuts-dialog"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useHotkeys } from "@/hooks/use-hotkeys"

export interface LayoutContext {
  openSearch: () => void
  openSettings: () => void
  openShortcuts: () => void
}

export function AppLayout() {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false)
  const navigate = useNavigate()

  const openSearch = React.useCallback(() => setSearchOpen(true), [])
  const openSettings = React.useCallback(() => setSettingsOpen(true), [])
  const openShortcuts = React.useCallback(() => setShortcutsOpen(true), [])

  useHotkeys({
    "mod+k": () => setSearchOpen(true),
    "/": (event) => {
      event.preventDefault()
      setSearchOpen(true)
    },
    "?": () => setShortcutsOpen(true),
    h: () => navigate("/"),
    b: () => navigate("/browse"),
    f: () => navigate("/favourites"),
  })

  const context = React.useMemo<LayoutContext>(
    () => ({ openSearch, openSettings, openShortcuts }),
    [openSearch, openSettings, openShortcuts],
  )

  return (
    <SidebarProvider>
      <AppSidebar onOpenSettings={openSettings} onOpenShortcuts={openShortcuts} />
      <SidebarInset className="min-w-0">
        <SiteHeader onOpenSearch={openSearch} onOpenSettings={openSettings} />
        <Outlet context={context} />
      </SidebarInset>

      <VideoStage />

      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} onOpenSettings={openSettings} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </SidebarProvider>
  )
}
