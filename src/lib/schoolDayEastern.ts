/*
 * “School day” boundaries in US Eastern time
 *
 * The gold shop enforces per-calendar-day purchase limits for certain items. Students on
 * laptops may cross midnight in local time while still being the same instructional day;
 * anchoring to `America/New_York` matches how this high school runs bell schedules and
 * teacher expectations for “one purchase per day”.
 */

export function calendarDateInEastern(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

export function isSameEasternCalendarDay(a: Date, b: Date): boolean {
  return calendarDateInEastern(a) === calendarDateInEastern(b)
}
