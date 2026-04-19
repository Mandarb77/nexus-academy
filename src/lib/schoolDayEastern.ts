/** Calendar date in America/New_York — used for shop daily purchase limits. */
export function calendarDateInEastern(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

export function isSameEasternCalendarDay(a: Date, b: Date): boolean {
  return calendarDateInEastern(a) === calendarDateInEastern(b)
}
