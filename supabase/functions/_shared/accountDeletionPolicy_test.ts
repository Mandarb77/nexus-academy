import { assertEquals } from 'jsr:@std/assert@1'
import {
  CONFIRMATION_PHRASE,
  validateConfirmation,
  validateDeletionTarget,
  validateTeacher,
} from './accountDeletionPolicy.ts'

Deno.test('requires a teacher caller', () => {
  assertEquals(validateTeacher('student'), { error: 'Teachers only', status: 403 })
  assertEquals(validateTeacher('teacher'), null)
})

Deno.test('requires the exact confirmation phrase', () => {
  assertEquals(validateConfirmation('husky'), {
    error: `Type ${CONFIRMATION_PHRASE} exactly to confirm`,
    status: 400,
  })
  assertEquals(validateConfirmation(CONFIRMATION_PHRASE), null)
})

Deno.test('rejects self-deletion and non-student targets', () => {
  assertEquals(
    validateDeletionTarget({
      callerId: 'same-id',
      studentId: 'same-id',
      studentRole: 'student',
      studentEmail: 'student@example.com',
    }),
    { error: 'You cannot delete your own account', status: 400 },
  )
  assertEquals(
    validateDeletionTarget({
      callerId: 'teacher-id',
      studentId: 'other-teacher-id',
      studentRole: 'teacher',
      studentEmail: 'teacher@example.com',
    }),
    { error: 'Student account not found', status: 404 },
  )
})

Deno.test('protects ccookmaker regardless of email casing', () => {
  assertEquals(
    validateDeletionTarget({
      callerId: 'teacher-id',
      studentId: 'test-id',
      studentRole: 'student',
      studentEmail: ' CCOOKMAKER@GMAIL.COM ',
    }),
    { error: 'This test account is protected and cannot be deleted', status: 403 },
  )
})

Deno.test('allows another student account', () => {
  assertEquals(
    validateDeletionTarget({
      callerId: 'teacher-id',
      studentId: 'student-id',
      studentRole: 'student',
      studentEmail: 'student@example.com',
    }),
    null,
  )
})
