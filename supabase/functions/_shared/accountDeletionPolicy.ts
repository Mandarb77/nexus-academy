export const CONFIRMATION_PHRASE = 'Husky'
export const PROTECTED_EMAIL = 'ccookmaker@gmail.com'

export type PolicyFailure = {
  error: string
  status: number
}

export function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? ''
}

export function validateTeacher(role: unknown): PolicyFailure | null {
  return role === 'teacher' ? null : { error: 'Teachers only', status: 403 }
}

export function validateConfirmation(confirmation: unknown): PolicyFailure | null {
  return confirmation === CONFIRMATION_PHRASE
    ? null
    : { error: `Type ${CONFIRMATION_PHRASE} exactly to confirm`, status: 400 }
}

export function validateDeletionTarget(input: {
  callerId: string
  studentId: string
  studentRole: unknown
  studentEmail: string | null | undefined
}): PolicyFailure | null {
  if (input.studentId === input.callerId) {
    return { error: 'You cannot delete your own account', status: 400 }
  }
  if (input.studentRole !== 'student') {
    return { error: 'Student account not found', status: 404 }
  }
  if (normalizeEmail(input.studentEmail) === PROTECTED_EMAIL) {
    return { error: 'This test account is protected and cannot be deleted', status: 403 }
  }
  return null
}
