import * as React from "react"
import { ArrowUpRight, Compass, Heart, House, MapPin, Search, Settings2, TvMinimal, X } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { useCatalog } from "@/lib/catalog"
import { countryInfo } from "@/lib/collections"
import { useDetectedCountry } from "@/lib/country"
import { cn } from "@/lib/utils"
import { useLibrary } from "@/stores/library"
import { useSettings } from "@/stores/settings"

const NAV = [
  { to: "/", label: "Home", icon: House },
  { to: "/browse", label: "Explore channels", icon: Compass },
  { to: "/favourites", label: "Favourites", icon: Heart },
]

export function AppSidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { pathname, search } = useLocation()
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  const favourites = useLibrary((s) => s.favorites.length)
  const homeCountry = useSettings((s) => s.homeCountry)
  const detectedCountry = useDetectedCountry(!homeCountry)
  const { meta } = useCatalog()
  const code = homeCountry || detectedCountry
  const country = code ? countryInfo(code, meta) : null
  const closeMobile = React.useCallback(() => {
    setOpenMobile(false)
    setOpen(false)
  }, [setOpenMobile, setOpen])
  const previousRoute = React.useRef(pathname + search)

  React.useEffect(() => {
    const route = pathname + search
    if (previousRoute.current === route) return
    previousRoute.current = route
    closeMobile()
  }, [pathname, search, closeMobile])

  const openSettings = () => {
    closeMobile()
    onOpenSettings()
  }

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border/60">
      <SidebarHeader className="gap-5 px-4 pt-6 pb-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            onClick={closeMobile}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg group-data-[collapsible=icon]:justify-center"
            aria-label="Zepvi home"
            data-tv-item=""
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <TvMinimal className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="block text-sm font-semibold tracking-tight">Zepvi</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                <span className="size-1.5 rounded-full bg-primary" /> On air
              </span>
            </span>
          </Link>
          {isMobile ? (
            <Button variant="ghost" size="icon" className="size-7" onClick={closeMobile} aria-label="Close navigation">
              <X className="size-4" />
            </Button>
          ) : (
            <SidebarTrigger className="size-7 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          )}
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Search channels"
              onClick={() => {
                closeMobile()
                window.dispatchEvent(new CustomEvent("lth:open-palette"))
              }}
              className="h-10 rounded-xl border border-sidebar-border/70 bg-background/50 text-muted-foreground shadow-xs"
            >
              <Search className="size-4" />
              <span className="text-xs">Search channels</span>
              <span className="ml-auto rounded border border-sidebar-border px-1 text-[10px] group-data-[collapsible=icon]:hidden">⌘ K</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-5 px-2 group-data-[collapsible=icon]:px-0">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 text-[10px] font-medium tracking-widest uppercase">Discover</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {NAV.map((item) => {
                const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(`${item.to}/`))
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        "h-11 rounded-xl px-3 text-muted-foreground transition-colors",
                        "data-[active=true]:bg-primary/10 data-[active=true]:font-semibold data-[active=true]:text-primary",
                      )}
                    >
                      <Link to={item.to} onClick={closeMobile} aria-current={active ? "page" : undefined} data-tv-item="">
                        <item.icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.7} aria-hidden />
                        <span>{item.label}</span>
                        {item.to === "/favourites" && favourites > 0 ? (
                          <span className="ml-auto min-w-5 rounded-md bg-sidebar-accent px-1.5 py-0.5 text-center text-[10px] text-muted-foreground tabular-nums group-data-[collapsible=icon]:hidden">
                            {favourites}
                          </span>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {country ? (
          <div className="mx-2 rounded-xl border border-sidebar-border/70 bg-background/40 p-3 group-data-[collapsible=icon]:hidden">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              <MapPin className="size-3" /> {homeCountry ? "Your country" : "Suggested country"}
            </p>
            <Link
              to={`/browse?country=${code}`}
              onClick={closeMobile}
              className="flex items-center gap-2 rounded-md text-sm font-medium transition-colors hover:text-primary"
            >
              <span aria-hidden>{country.flag}</span>
              <span className="min-w-0 flex-1 truncate">{country.name}</span>
              <ArrowUpRight className="size-3.5 text-muted-foreground" />
            </Link>
          </div>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="gap-3 px-4 pt-3 pb-5 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings" onClick={openSettings} className="h-10 rounded-xl text-muted-foreground" data-tv-item="">
              <Settings2 className="size-4" strokeWidth={1.7} />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="border-t border-sidebar-border/70 px-2 pt-3 group-data-[collapsible=icon]:hidden">
          <nav aria-label="Legal" className="mb-3 flex flex-wrap gap-x-3 gap-y-2 text-[11px] text-muted-foreground">
            <a href="/terms.html" className="hover:text-foreground">Terms</a>
            <a href="/privacy.html" className="hover:text-foreground">Privacy</a>
            <a href="/cookies.html" className="hover:text-foreground">Cookies</a>
          </nav>
          <a
            href="https://github.com/iptv-org/iptv"
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center justify-between text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Powered by iptv-org</span>
            <ArrowUpRight className="size-3" />
          </a>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
