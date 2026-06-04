/*
 * Guild “coming soon” gates + Void patent prototype tester
 *
 * Skill tree: only Silicon Covenant is locked (`isGuildComingSoonForUser`). Void Navigators
 * shows all DB tiles for every student (see docs/developer-handoff-recent-work.md).
 *
 * `canAccessVoidTile1Proto` — still used for PatentLedger test bypass only (env
 * `VITE_VOID_TILE1_PROTO_EMAIL`). Does not control skill-tree visibility anymore.
 *
 * History of Preview-only Void unlock: docs/void-tile1-prototype.md
 */

type ProtoUser = { email?: string | null } | null | undefined

/**
 * Temporary prototype gate — not real auth. Vite inlines `VITE_VOID_TILE1_PROTO_EMAIL` at
 * build time, so Preview deploys need that var + a redeploy; Production builds without it
 * always return false here (Void stays locked for students on the live site).
 */
export function canAccessVoidTile1Proto(user: ProtoUser): boolean {
  const allowed = import.meta.env.VITE_VOID_TILE1_PROTO_EMAIL?.trim().toLowerCase()
  if (!allowed) return false
  const email = (user?.email ?? '').trim().toLowerCase()
  return email.length > 0 && email === allowed
}

/**
 * Replaces `isComingSoonGuildSection` for user-aware pages.
 * Silicon Covenant stays locked; Void Navigators shows quests from the database for everyone.
 */
export function isGuildComingSoonForUser(_guildKey: string, _user: ProtoUser): boolean {
  const k = _guildKey.trim().toLowerCase()
  return k === 'silicon covenant'
}
