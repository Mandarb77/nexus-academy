/*
 * Void Navigators Tile 1 prototype — who can see past the coming-soon gate
 *
 * Only the email in `VITE_VOID_TILE1_PROTO_EMAIL` gets Void unlocked (Tile 1 only in UI).
 * Everyone else still sees the locked guild.
 *
 * Deployment notes (Preview vs Production, OAuth, env scope): docs/void-tile1-prototype.md
 *
 * Local: set in `.env` and restart Vite. Vercel: set for Preview only; redeploy after changes.
 * Value must match Supabase Auth `user.email` exactly (case-insensitive).
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
