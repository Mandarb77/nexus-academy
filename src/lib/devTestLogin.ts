/**
 * Local dev-only test accounts (see migration `040_dev_test_auth_users.sql`).
 * Only referenced from UI guarded by `import.meta.env.DEV`.
 */
export const DEV_TEST_LOGIN = {
  student: {
    email: 'test-student@nexus.local',
    password: 'testpass123',
  },
  teacher: {
    email: 'test-teacher@nexus.local',
    password: 'testpass123',
  },
} as const
