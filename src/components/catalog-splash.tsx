import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

/** First-paint screen while the catalog snapshot downloads. */
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background px-6">
      {error ? (
        <>
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            The catalog could not be loaded.
          </p>
          <p className="max-w-md break-all text-center font-mono text-[11px] text-muted-foreground/70">
            {error}
          </p>
          {onRetry ? (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </>
      ) : (
        <>
          <Spinner className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading channels…</p>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  )
}
