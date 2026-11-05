import * as React from "react"
import { Check, ChevronsUpDown, Globe2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCatalog } from "@/lib/catalog"
import { countryInfo } from "@/lib/collections"
import { compactNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

interface CountryPickerProps {
  value: string
  onChange: (code: string) => void
  /** "" clears the selection. */
  allowAll?: boolean
  allLabel?: string
  className?: string
  placeholder?: string
  /** Only list countries that actually have channels. */
  withChannelsOnly?: boolean
}

export function CountryPicker({
  value,
  onChange,
  allowAll = false,
  allLabel = "All countries",
  className,
  placeholder = "Pick a country",
  withChannelsOnly = true,
}: CountryPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const { index, meta } = useCatalog()

  const options = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return meta.countries
      .filter((country) => (withChannelsOnly ? (index.countryCounts.get(country.code) ?? 0) > 0 : true))
      .filter((country) => !q || country.name.toLowerCase().includes(q) || country.code.toLowerCase() === q)
      .sort((a, b) => {
        const countDiff = (index.countryCounts.get(b.code) ?? 0) - (index.countryCounts.get(a.code) ?? 0)
        return countDiff !== 0 ? countDiff : a.name.localeCompare(b.name)
      })
      .slice(0, 200)
  }, [index.countryCounts, meta.countries, query, withChannelsOnly])

  const selected = value ? countryInfo(value, meta) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected ? (
              <>
                <span aria-hidden>{selected.flag}</span>
                <span className="truncate">{selected.name}</span>
              </>
            ) : (
              <>
                <Globe2 className="size-4 text-muted-foreground" />
                <span className="truncate text-muted-foreground">{placeholder}</span>
              </>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search countries…" value={query} onValueChange={setQuery} />
          <CommandList className="max-h-72">
            <CommandEmpty>No country matches “{query}”.</CommandEmpty>
            <CommandGroup>
              {allowAll ? (
                <CommandItem
                  value="__all"
                  onSelect={() => {
                    onChange("")
                    setOpen(false)
                  }}
                >
                  <Globe2 className="size-4" />
                  {allLabel}
                  {!value ? <Check className="ml-auto size-4" /> : null}
                </CommandItem>
              ) : null}
              {options.map((country) => {
                const count = index.countryCounts.get(country.code) ?? 0
                return (
                  <CommandItem
                    key={country.code}
                    value={country.code}
                    onSelect={() => {
                      onChange(country.code)
                      setOpen(false)
                    }}
                  >
                    <span className="mr-1" aria-hidden>
                      {country.flag}
                    </span>
                    <span className="truncate">{country.name}</span>
                    {count ? (
                      <span className="ml-auto pl-2 text-xs text-muted-foreground">
                        {compactNumber(count)}
                      </span>
                    ) : null}
                    {value === country.code ? <Check className="ml-1 size-4" /> : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
