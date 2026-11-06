import * as React from "react"

import { CountryPicker } from "@/components/country-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useCatalog } from "@/lib/catalog"
import { formatDate } from "@/lib/format"
import { useSettings } from "@/stores/settings"

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
  const { index, generatedAt } = useCatalog()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Stored on this device only.</DialogDescription>
        </DialogHeader>

        <div className="px-5 py-1">
          <Row title="Home country" description="Automatic estimates your country from your network, not GPS. VPNs may affect this; override it here.">
            <CountryPicker
              className="w-44"
              allowAll
              allLabel="Automatic (network)"
              value={settings.homeCountry}
              onChange={(homeCountry) => set({ homeCountry })}
            />
          </Row>
          <Separator />
          <Row title="Autoplay" description="Start the stream as soon as a channel is opened." htmlFor="autoplay">
            <Switch
              id="autoplay"
              checked={settings.autoplay}
              onCheckedChange={(autoplay) => set({ autoplay })}
            />
          </Row>
          <Separator />
          <Row
            title="Auto-failover"
            description="If a source dies, try the next mirror of the same channel."
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
            title="Hide streams needing custom headers"
            description="Sources that only work with a Referer or User-Agent a browser cannot set."
            htmlFor="headers"
          >
            <Switch
              id="headers"
              checked={settings.hideHeaderOnly}
              onCheckedChange={(hideHeaderOnly) => set({ hideHeaderOnly })}
            />
          </Row>
        </div>

        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          {index.channels.length.toLocaleString()} channels · {index.totalSources.toLocaleString()}{" "}
          sources · {index.countryCounts.size} countries
          {generatedAt ? ` · snapshot ${formatDate(generatedAt)}` : ""}
        </p>
      </DialogContent>
    </Dialog>
  )
}
