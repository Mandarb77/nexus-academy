/** Calendar date in America/Chicago — must match `buy_shop_item` in migration 036. */
export function calendarDateInChicago(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

export function isSameChicagoSchoolDay(a: Date, b: Date): boolean {
  return calendarDateInChicago(a) === calendarDateInChicago(b)
}
