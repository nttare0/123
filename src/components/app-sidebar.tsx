import * as React from "react"
import {
  Compass,
  Github,
  Heart,
  Home,
  Keyboard,
  Monitor,
  Moon,
  Radio,
  Settings,
  Sun,
  Tv,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Link, useLocation } from "react-router-dom"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useCatalog } from "@/lib/catalog"
import { categoryIcon, countryInfo, EAST_AFRICA, FEATURED_CATEGORIES } from "@/lib/collections"
import { compactNumber, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useLibrary } from "@/stores/library"
import { useSettings } from "@/stores/settings"

interface NavItemProps {
  to: string
  icon: React.ElementType
  label: string
  badge?: React.ReactNode
  match?: (pathname: string) => boolean
  onSelect?: () => void
}

function NavItem({ to, icon, label, badge, match, onSelect }: NavItemProps) {
  const location = useLocation()
  const active = match
    ? match(location.pathname + location.search)
    : location.pathname === to || (to !== "/" && location.pathname.startsWith(to))

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={label} onClick={onSelect}>
        <Link to={to} data-tv-item="">
          <IconComponent icon={icon} />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
      {badge ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  )
}

function IconComponent({ icon: Icon }: { icon: React.ElementType }) {
  return <Icon />
}

export function AppSidebar({ onOpenSettings, onOpenShortcuts }: { onOpenSettings: () => void; onOpenShortcuts: () => void }) {
  const { index, meta, generatedAt, live, channels } = useCatalog()
  const { setTheme } = useTheme()
  const homeCountry = useSettings((s) => s.homeCountry)
  const search = useLocationSearch()
  const favorites = useLibrary((s) => s.favorites)
  const custom = useLibrary((s) => s.custom)

  const topCountries = React.useMemo(() => {
    const counts = [...index.countryCounts.entries()]
      .filter(([code]) => code !== "CUSTOM")
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    const home = homeCountry ? [[homeCountry, index.countryCounts.get(homeCountry) ?? 0] as [string, number]] : []
    const rest = counts.filter(([code]) => code !== homeCountry).slice(0, 9)
    return [...home, ...rest]
  }, [homeCountry, index.countryCounts])

  const eastAfricaCount = React.useMemo(
    () => channels.filter((c) => EAST_AFRICA.includes(c.country)).length,
    [channels],
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/" data-tv-item="">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Tv className="size-4" />
                </span>
                <span className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Live TV Hub</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {compactNumber(index.channels.length)} channels · {compactNumber(index.totalSources)} streams
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem to="/" icon={Home} label="Home" />
              <NavItem to="/browse" icon={Compass} label="Browse all" />
              <NavItem
                to="/favourites"
                icon={Heart}
                label="Favourites"
                badge={favorites.length ? compactNumber(favorites.length) : undefined}
              />
              <NavItem
                to="/my-streams"
                icon={Radio}
                label="My streams"
                badge={custom.length ? String(custom.length) : undefined}
              />
              <NavItem
                to={`/browse?region=${EAST_AFRICA.length ? "EAST" : ""}`}
                icon={Tv}
                label="East Africa"
                badge={eastAfricaCount ? compactNumber(eastAfricaCount) : undefined}
                match={(path) => path.includes("region=EAST")}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Countries</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {topCountries.map(([code, count]) => {
                const info = countryInfo(code, meta)
                return (
                  <SidebarMenuItem key={code}>
                    <SidebarMenuButton
                      asChild
                      tooltip={`${info.flag} ${info.name}`}
                      isActive={search.includes(`country=${code}`)}
                    >
                      <Link to={`/browse?country=${code}`} data-tv-item="">
                        <span className="grid size-4 place-items-center text-base leading-none">
                          {info.flag}
                        </span>
                        <span className="truncate">{info.name}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{compactNumber(count)}</SidebarMenuBadge>
                  </SidebarMenuItem>
                )
              })}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="All countries">
                  <Link to="/browse?group=country" data-tv-item="">
                    <Compass />
                    <span>All countries</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {FEATURED_CATEGORIES.map((id) => {
                const Icon = categoryIcon(id)
                const count = index.categoryCounts.get(id) ?? 0
                const name = meta.categories.find((c) => c.id === id)?.name ?? id
                return (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      asChild
                      tooltip={name}
                      isActive={search.includes(`category=${id}`)}
                    >
                      <Link to={`/browse?category=${id}`} data-tv-item="">
                        <Icon />
                        <span>{name}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{compactNumber(count)}</SidebarMenuBadge>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-0" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings" onClick={onOpenSettings}>
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Keyboard & remote" onClick={onOpenShortcuts}>
                  <Keyboard />
                  <span>Keyboard &amp; remote</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip="Theme" className={cn("data-[state=open]:bg-sidebar-accent")}>
                  <Sun className="dark:hidden" />
                  <Moon className="hidden dark:block" />
                  <span>Theme</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-32">
                <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">
                    <Sun /> Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon /> Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <Monitor /> System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="iptv-org on GitHub" className="text-muted-foreground">
              <a
                href="https://github.com/iptv-org/iptv"
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs"
              >
                <Github />
                <span className="truncate">
                  Data: iptv-org{live ? " · live" : generatedAt ? ` · ${formatDate(generatedAt)}` : ""}
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

/** Local helper: the current query string, without subscribing to the router. */
function useLocationSearch(): string {
  const location = useLocation()
  return location.search
}
