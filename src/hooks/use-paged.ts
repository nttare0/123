import * as React from "react"

/**
 * Progressive rendering for very long lists (the catalog has 10k+ channels).
 * Renders a page at a time and appends more when the sentinel scrolls into view.
 */
export function usePaged<T>(items: T[], pageSize = 60) {
  const [count, setCount] = React.useState(pageSize)
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)

  const signature = items.length
  React.useEffect(() => {
    setCount(pageSize)
    // Reset when the underlying result set changes (new filter, new search…).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, pageSize, items])

  const visible = React.useMemo(() => items.slice(0, count), [items, count])
  const hasMore = count < items.length

  React.useEffect(() => {
    if (!hasMore) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setCount((c) => Math.min(items.length, c + pageSize))
        }
      },
      { rootMargin: "800px 0px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, items.length, pageSize])

  return {
    visible,
    hasMore,
    sentinelRef,
    shown: visible.length,
    total: items.length,
    loadMore: () => setCount((c) => Math.min(items.length, c + pageSize)),
    showAll: () => setCount(items.length),
  }
}
