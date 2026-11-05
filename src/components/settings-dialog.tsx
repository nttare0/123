import * as React from "react"
import { Database, ExternalLink, Heart, History, Monitor, Moon, RefreshCw, Sun, Trash2 } from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { CountryPicker } from "@/components/country-picker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCatalog } from "@/lib/catalog"
import { compactNumber, formatDate, pluralize } from "@/lib/format"
import { useLibrary } from "@/stores/library"
import { useSettings, type StreamProtocolPolicy } from "@/stores/settings"

function Row({
  title,
  description,
  children,
  htmlFor,
}: {
  title: string
  description?: string
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {title}
        </Label>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const settings = useSettings()
  const set = useSettings((s) => s.set)
  const reset = useSettings((s) => s.reset)
  const { index, generatedAt, source, live, syncing, syncProgress, sync, refresh } = useCatalog()
  const favorites = useLibrary((s) => s.favorites)
  const recents = useLibrary((s) => s.recents)
  const custom = useLibrary((s) => s.custom)
  const clearFavorites = useLibrary((s) => s.clearFavorites)
  const clearRecents = useLibrary((s) => s.clearRecents)

  const [tab, setTab] = React.useState("playback")

  React.useEffect(() => {
    if (open) setTab("playback")
  }, [open])

  const runSync = async () => {
    try {
      const count = await sync()
      toast.success(`Catalog synced — ${count.toLocaleString()} channels`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Playback rules, appearance and the iptv-org catalog snapshot. Saved on this device.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="gap-0 overflow-hidden">
          <div className="border-b bg-muted/30 px-5">
            <TabsList className="h-11 bg-transparent p-0">
              <TabsTrigger value="playback">Playback</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
            </TabsList>
          </div>

          <div className="max-h-[62vh] overflow-y-auto px-5 py-1">
            <TabsContent value="playback" className="mt-0">
              <Row
                title="Home country"
                description="Drives the home screen rows and the default browse filter."
              >
                <CountryPicker
                  className="w-48"
                  value={settings.homeCountry}
                  onChange={(homeCountry) => set({ homeCountry })}
                />
              </Row>
              <Separator />
              <Row
                title="Autoplay"
                description="Start the stream as soon as a channel is opened."
                htmlFor="autoplay"
              >
                <Switch
                  id="autoplay"
                  checked={settings.autoplay}
                  onCheckedChange={(autoplay) => set({ autoplay })}
                />
              </Row>
              <Separator />
              <Row
                title="Auto-failover"
                description="When a source dies, automatically try the next mirror of the same channel."
                htmlFor="failover"
              >
                <Switch
                  id="failover"
                  checked={settings.autoFailover}
                  onCheckedChange={(autoFailover) => set({ autoFailover })}
                />
              </Row>
              <Separator />
              <Row
                title="Insecure (http) streams"
                description="Browsers block plain-http media on https pages. “Automatic” hides them only when this page is https."
              >
                <RadioGroup
                  className="flex gap-3"
                  value={settings.protocol}
                  onValueChange={(protocol) => set({ protocol: protocol as StreamProtocolPolicy })}
                >
                  {(["auto", "https", "any"] as const).map((option) => (
                    <div key={option} className="flex items-center gap-1.5">
                      <RadioGroupItem value={option} id={`protocol-${option}`} />
                      <Label htmlFor={`protocol-${option}`} className="text-xs font-normal capitalize">
                        {option === "any" ? "show all" : option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </Row>
              <Separator />
              <Row
                title="Hide streams needing custom headers"
                description="Some sources only work with a Referer or User-Agent a browser cannot set. Hiding them keeps the list honest."
                htmlFor="headers"
              >
                <Switch
                  id="headers"
                  checked={settings.hideHeaderOnly}
                  onCheckedChange={(hideHeaderOnly) => set({ hideHeaderOnly })}
                />
              </Row>
              <Separator />
              <Row
                title="Hide geo-blocked streams"
                description="Flagged by iptv-org as restricted to some territories."
                htmlFor="geo"
              >
                <Switch
                  id="geo"
                  checked={settings.hideGeoBlocked}
                  onCheckedChange={(hideGeoBlocked) => set({ hideGeoBlocked })}
                />
              </Row>
              <Separator />
              <Row
                title="Hide “not 24/7” streams"
                description="Channels that only broadcast part of the day."
                htmlFor="not247"
              >
                <Switch
                  id="not247"
                  checked={settings.hideNot247}
                  onCheckedChange={(hideNot247) => set({ hideNot247 })}
                />
              </Row>
              <Separator />
              <div className="py-4">
                <Button variant="outline" size="sm" onClick={reset} className="gap-2">
                  <RefreshCw /> Reset playback settings
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="mt-0">
              <Row title="Theme" description="Dark is easier on the eyes in a dim living room.">
                <ThemeControls />
              </Row>
              <Separator />
              <Row title="Default channel layout" description="Grid shows artwork, list shows more detail.">
                <RadioGroup
                  className="flex gap-3"
                  value={settings.view}
                  onValueChange={(view) => set({ view: view as "grid" | "list" })}
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="grid" id="view-grid" />
                    <Label htmlFor="view-grid" className="text-xs font-normal">
                      Grid
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="list" id="view-list" />
                    <Label htmlFor="view-list" className="text-xs font-normal">
                      List
                    </Label>
                  </div>
                </RadioGroup>
              </Row>
              <Separator />
              <Row
                title="Playback stats"
                description="Overlay bitrate, resolution, buffer and dropped frames on the player."
                htmlFor="stats"
              >
                <Switch
                  id="stats"
                  checked={settings.showStats}
                  onCheckedChange={(showStats) => set({ showStats })}
                />
              </Row>
              <Separator />
              <div className="space-y-3 py-4">
                <div>
                  <Label className="text-sm font-medium">Your data</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Favourites, history and custom streams live in this browser only.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!favorites.length}
                    onClick={() => {
                      clearFavorites()
                      toast.success("Favourites cleared")
                    }}
                  >
                    <Heart /> Clear {pluralize(favorites.length, "favourite")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!recents.length}
                    onClick={() => {
                      clearRecents()
                      toast.success("Watch history cleared")
                    }}
                  >
                    <History /> Clear {pluralize(recents.length, "entry", "entries")}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="data" className="mt-0 space-y-4 py-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {live ? "Live catalog" : "Bundled snapshot"}
                  </p>
                  {generatedAt ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(generatedAt, true)}
                    </span>
                  ) : null}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Channels</dt>
                    <dd className="font-semibold">{index.channels.length.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Stream sources</dt>
                    <dd className="font-semibold">{index.totalSources.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Countries</dt>
                    <dd className="font-semibold">{index.countryCounts.size}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Custom streams</dt>
                    <dd className="font-semibold">{compactNumber(custom.length)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs break-all text-muted-foreground">Source: {source}</p>
              </div>

              <div className="space-y-2">
                <Button onClick={runSync} disabled={syncing} className="w-full gap-2">
                  <RefreshCw className={syncing ? "animate-spin" : undefined} />
                  {syncing ? "Syncing…" : "Sync latest catalog"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Downloads the current iptv-org datasets (~18 MB) and rebuilds the catalog in this
                  tab. The bundled snapshot stays untouched; reload to go back to it. For a
                  permanent update run <code className="font-mono text-[11px]">npm run data:sync</code>.
                </p>
                {syncProgress ? (
                  <div className="space-y-1">
                    <Progress
                      value={((syncProgress.index + syncProgress.ratio) / syncProgress.count) * 100}
                    />
                    <p className="text-xs text-muted-foreground">
                      {syncProgress.file}.json · {Math.round(syncProgress.ratio * 100)}% ·{" "}
                      {syncProgress.source}
                    </p>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={refresh}>
                    <RefreshCw /> Reload snapshot
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2" asChild>
                    <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noreferrer noopener">
                      <ExternalLink /> iptv-org
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-dashed p-3">
                <Trash2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Live TV Hub only indexes publicly listed, free-to-air streams from the iptv-org
                  project. Channels that are geo-blocked, NSFW or DMCA-blocklisted upstream are
                  filtered out at build time.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function ThemeControls() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
      {(
        [
          { value: "light", icon: Sun, label: "Light" },
          { value: "dark", icon: Moon, label: "Dark" },
          { value: "system", icon: Monitor, label: "System" },
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setTheme(option.value)}
          aria-pressed={theme === option.value}
          className={
            "flex size-8 items-center justify-center rounded-md transition-colors " +
            (theme === option.value
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground")
          }
          title={option.label}
        >
          <option.icon className="size-4" />
          <span className="sr-only">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
