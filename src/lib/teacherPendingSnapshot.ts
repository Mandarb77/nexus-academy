/*
 * Compares successive pending-queue snapshots so we only alert on genuinely new rows.
 */

import {
  formatTeacherAlertMessage,
  queueTeacherSubmissionAlert,
  shouldQueueTeacherAlert,
  type TeacherSubmissionAlert,
} from './teacherSubmissionAlert'

let initialized = false
let previousIds = new Set<string>()
let batchTimer: ReturnType<typeof setTimeout> | null = null
let pendingBatch: TeacherSubmissionAlert[] = []

function flushBatch() {
  batchTimer = null
  const unique = pendingBatch.filter((i) => shouldQueueTeacherAlert(i.alertId))
  pendingBatch = []
  if (unique.length === 0) return
  queueTeacherSubmissionAlert({
    message: formatTeacherAlertMessage(unique),
    alertIds: unique.map((i) => i.alertId),
  })
}

/** Call after each refresh of all four teacher pending queues. Skips the first snapshot (page load). */
export function applyTeacherPendingSnapshot(items: TeacherSubmissionAlert[]) {
  const nextIds = new Set(items.map((i) => i.alertId))

  if (!initialized) {
    initialized = true
    previousIds = nextIds
    return
  }

  const newOnes = items.filter((i) => !previousIds.has(i.alertId))
  previousIds = nextIds

  if (newOnes.length === 0) return

  pendingBatch.push(...newOnes)
  if (batchTimer) clearTimeout(batchTimer)
  batchTimer = setTimeout(flushBatch, 400)
}
