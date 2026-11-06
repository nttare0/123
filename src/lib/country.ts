import { getCountryForTimezone } from "countries-and-timezones"

/** An offline estimate, not device geolocation. Never requests permissions. */
export function suggestedCountry(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return getCountryForTimezone(zone)?.id ?? ""
  } catch {
    return ""
  }
}
