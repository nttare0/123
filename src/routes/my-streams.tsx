import * as React from "react"
import { Plus, Radio, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ChannelGrid } from "@/components/channel/channel-grid"
import { CountryPicker } from "@/components/country-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCatalog } from "@/lib/catalog"
import type { Channel } from "@/lib/iptv/types"
import { useLibrary } from "@/stores/library"

const EMPTY_FORM = { name: "", url: "", logo: "", country: "" }

export function MyStreamsPage() {
  const { index } = useCatalog()
  const custom = useLibrary((s) => s.custom)
  const addCustom = useLibrary((s) => s.addCustom)
  const removeCustom = useLibrary((s) => s.removeCustom)

  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [error, setError] = React.useState<string | null>(null)

  const channels = React.useMemo(
    () => custom.map((entry) => index.byId.get(entry.id)).filter((c): c is Channel => Boolean(c)),
    [custom, index.byId],
  )

  const submit = () => {
    let parsed: URL
    try {
      parsed = new URL(form.url.trim())
    } catch {
      setError("That does not look like a valid URL.")
      return
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      setError("Only http(s) playlists can be played in a browser.")
      return
    }
    if (!/\.m3u8?($|\?)/i.test(parsed.pathname) && !parsed.pathname.includes("m3u")) {
      setError(null)
      toast.warning("That URL does not look like an HLS playlist — it may not play.")
    }
    const name = form.name.trim() || parsed.hostname.replace(/^www\./, "")
    addCustom({
      name,
      url: parsed.toString(),
      logo: form.logo.trim() || undefined,
      country: form.country || undefined,
    })
    toast.success(`Added “${name}” to My streams`)
    setForm(EMPTY_FORM)
    setError(null)
    setOpen(false)
  }

  return (
    <div className="mx-auto max-w-[110rem] px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <Radio className="size-5 text-muted-foreground" /> My streams
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Add any HLS playlist you have the right to watch — a municipal channel, your own OBS
            output, a church or school stream. They are stored in this browser and play through the
            same player as the iptv-org catalog.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus /> Add a stream
        </Button>
      </header>

      {custom.length ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge variant="secondary">{custom.length} saved</Badge>
          <Badge variant="outline">Stored locally</Badge>
        </div>
      ) : null}

      <ChannelGrid
        channels={channels}
        emptyTitle="No custom streams yet"
        emptyDescription="Paste an .m3u8 URL to build your own channel list alongside the iptv-org catalog."
        emptyAction={
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus /> Add your first stream
          </Button>
        }
      />

      {custom.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Manage</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border">
            {custom.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.name}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{entry.url}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${entry.name}`}
                  onClick={() => {
                    removeCustom(entry.id)
                    toast.success(`Removed “${entry.name}”`)
                  }}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a stream</DialogTitle>
            <DialogDescription>
              Only add streams you are allowed to watch and redistribute. Nothing is uploaded —
              playback happens directly between your browser and the broadcaster.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="stream-url">Playlist URL</Label>
              <Input
                id="stream-url"
                autoFocus
                placeholder="https://example.com/live/index.m3u8"
                value={form.url}
                onChange={(e) => {
                  setForm((f) => ({ ...f, url: e.target.value }))
                  setError(null)
                }}
                className="font-mono text-xs"
              />
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stream-name">Name</Label>
              <Input
                id="stream-name"
                placeholder="Kigali Community TV"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stream-logo">Logo URL (optional)</Label>
              <Input
                id="stream-logo"
                placeholder="https://example.com/logo.png"
                value={form.logo}
                onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label>Country (optional)</Label>
              <CountryPicker
                allowAll
                allLabel="No country"
                placeholder="Pick a country"
                withChannelsOnly={false}
                value={form.country}
                onChange={(country) => setForm((f) => ({ ...f, country }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!form.url.trim()}>
              Add stream
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
