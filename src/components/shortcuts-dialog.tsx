import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"

const GROUPS: { title: string; hint?: string; items: [string[], string][] }[] = [
  {
    title: "Everywhere",
    items: [
      [["Ctrl", "K"], "Search every channel"],
      [["/"], "Search (when not typing)"],
      [["H"], "Home"],
      [["B"], "Browse all channels"],
      [["F"], "Favourites"],
      [["?"], "This dialog"],
      [["Esc"], "Back / close"],
    ],
  },
  {
    title: "Player",
    hint: "Active on the watch page",
    items: [
      [["Space"], "Play / pause"],
      [["K"], "Play / pause"],
      [["M"], "Mute"],
      [["↑", "↓"], "Volume"],
      [["←", "→"], "Previous / next channel"],
      [["N"], "Next stream source"],
      [["R"], "Reload the stream"],
      [["F"], "Fullscreen"],
      [["P"], "Picture in picture"],
      [["S"], "Playback stats"],
    ],
  },
  {
    title: "TV remote",
    hint: "Spatial navigation — works on any list or grid",
    items: [
      [["▲", "▼", "◀", "▶"], "Move to the nearest channel"],
      [["OK", "Enter"], "Open and play"],
      [["PgUp", "PgDn"], "Jump a screenful"],
      [["Home", "End"], "First / last channel"],
      [["Esc"], "Back"],
    ],
  },
]

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard &amp; remote</DialogTitle>
          <DialogDescription>
            Live TV Hub is built to be driven from a couch: everything works with a D-pad, and every
            list supports spatial navigation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {GROUPS.map((group, i) => (
            <div key={group.title}>
              {i > 0 ? <Separator className="mb-4" /> : null}
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="text-sm font-semibold">{group.title}</h3>
                {group.hint ? (
                  <span className="text-xs text-muted-foreground">{group.hint}</span>
                ) : null}
              </div>
              <ul className="space-y-1.5">
                {group.items.map(([keys, label]) => (
                  <li key={label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
