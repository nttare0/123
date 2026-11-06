import * as React from "react"
import { Outlet } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { CommandMenu } from "@/components/command-menu"
import { VideoStage } from "@/components/player/video-stage"
import { SettingsDialog } from "@/components/settings-dialog"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useHotkeys } from "@/hooks/use-hotkeys"

export function AppLayout() {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  const openSearch = React.useCallback(() => setSearchOpen(true), [])
  const openSettings = React.useCallback(() => setSettingsOpen(true), [])

  React.useEffect(() => {
    window.addEventListener("lth:open-palette", openSearch)
    return () => window.removeEventListener("lth:open-palette", openSearch)
  }, [openSearch])

  useHotkeys({
    "mod+k": openSearch,
    "/": (event) => {
      event.preventDefault()
      openSearch()
    },
  })

  return (
    <SidebarProvider>
      <AppSidebar onOpenSettings={openSettings} />
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <Outlet />
      </SidebarInset>

      <VideoStage />

      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} onOpenSettings={openSettings} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </SidebarProvider>
  )
}
