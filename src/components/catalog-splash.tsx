import { AlertTriangle, RefreshCw, Tv } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

/** Branded first-paint screen while the 3.8 MB catalog snapshot streams in. */
export function CatalogSplash({
  progress,
  error,
  onRetry,
}: {
  progress: number
  error?: string | null
  onRetry?: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="relative flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Tv className="size-8" />
          <span className="absolute -top-1 -right-1 flex size-4">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex size-4 rounded-full bg-red-500" />
          </span>
        </span>

        <div>
          <h1 className="text-xl font-semibold tracking-tight">Live TV Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {error
              ? "The catalog could not be loaded"
              : "Loading the iptv-org catalog — 10,000+ free-to-air channels"}
          </p>
        </div>

        {error ? (
          <div className="w-full max-w-sm space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-xs break-all text-muted-foreground">{error}</p>
            </div>
            {onRetry ? (
              <Button onClick={onRetry} className="w-full gap-2">
                <RefreshCw /> Try again
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="w-full max-w-xs space-y-2">
            <Progress value={Math.round(progress * 100)} className="h-1.5" />
            <p className="font-mono text-[11px] text-muted-foreground">
              {Math.round(progress * 100)}%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
