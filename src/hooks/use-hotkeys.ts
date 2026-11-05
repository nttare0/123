import * as React from "react"

export type HotkeyHandler = (event: KeyboardEvent) => void

export interface HotkeyOptions {
  enabled?: boolean
  /** Let the combo fire even when a text field has focus (default: false). */
  allowInInputs?: boolean
  /** Listen in the capture phase so these win over other window key handlers. */
  capture?: boolean
}

const INPUT_SELECTOR = 'input, textarea, select, [contenteditable="true"]'
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"], [cmdk-root]'

interface Combo {
  key: string
  mod: boolean
  shift: boolean
  alt: boolean
}

function parse(combo: string): Combo {
  const parts = combo.toLowerCase().split("+")
  return {
    key: parts[parts.length - 1],
    mod: parts.includes("mod") || parts.includes("ctrl") || parts.includes("meta"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
  }
}

function matches(event: KeyboardEvent, combo: Combo): boolean {
  const isMod = event.metaKey || event.ctrlKey
  if (combo.mod !== isMod) return false
  if (combo.shift !== event.shiftKey) return false
  if (combo.alt !== event.altKey) return false

  const key = event.key.toLowerCase()
  if (combo.key === key) return true
  if (combo.key === "space" && key === " ") return true
  if (combo.key === "escape" && (key === "esc" || key === "escape")) return true
  return false
}

/**
 * Tiny global hotkey registry:
 * `useHotkeys({ "mod+k": openPalette, "?": showHelp, "f": toggleFullscreen })`
 */
export function useHotkeys(
  map: Record<string, HotkeyHandler>,
  { enabled = true, allowInInputs = false, capture = false }: HotkeyOptions = {},
) {
  const signature = Object.keys(map).join("|")

  const combos = React.useMemo(
    () => signature.split("|").filter(Boolean).map((raw) => ({ raw, combo: parse(raw) })),
    [signature],
  )

  const handlersRef = React.useRef(map)
  handlersRef.current = map

  React.useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const inInput = Boolean(target?.closest(INPUT_SELECTOR))
      if (inInput && !allowInInputs && !event.metaKey && !event.ctrlKey) return
      // Radix traps focus inside open dialogs; single-key app shortcuts must not
      // fire on top of them (⌘K still does).
      if (!event.metaKey && !event.ctrlKey && target?.closest(DIALOG_SELECTOR)) return

      for (const entry of combos) {
        if (!matches(event, entry.combo)) continue
        handlersRef.current[entry.raw]?.(event)
        if (event.defaultPrevented) return
      }
    }

    window.addEventListener("keydown", onKeyDown, capture)
    return () => window.removeEventListener("keydown", onKeyDown, capture)
  }, [allowInInputs, capture, combos, enabled])
}
