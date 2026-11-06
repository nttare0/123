import { Command, Menu, Moon, Search, Sun } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const { setOpenMobile } = useSidebar()

  const submit = (value: string) => {
    const query = value.trim()
    navigate(query ? `/browse?q=${encodeURIComponent(query)}` : "/browse")
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 md:hidden"
          onClick={() => setOpenMobile(true)}
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </Button>

        <form
          className="relative hidden min-w-0 flex-1 items-center sm:flex sm:max-w-md"
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            submit((event.currentTarget.elements.namedItem("q") as HTMLInputElement)?.value ?? "")
          }}
        >
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            name="q"
            type="search"
            placeholder="Search channels"
            className="h-9 rounded-lg pr-16 pl-8"
            data-tv-item=""
          />
          <span className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 text-muted-foreground lg:flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </form>

        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-muted-foreground sm:hidden"
          onClick={() => navigate("/browse")}
        >
          <Search className="size-4" />
          Search
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-9"
          onClick={() => window.dispatchEvent(new CustomEvent("lth:open-palette"))}
          aria-label="Open command menu"
        >
          <Command className="size-4" />
        </Button>

        <Separator orientation="vertical" className="mr-0.5 h-5" />

        <Button
          variant="ghost"
          size="icon"
          className={cn("size-9", !resolvedTheme && "opacity-60")}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          data-tv-item=""
        >
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
        </Button>
      </div>
    </header>
  )
}
