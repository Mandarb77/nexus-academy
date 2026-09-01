/*
 * One production hostname for Google OAuth.
 *
 * PKCE stores the code verifier in localStorage on the origin where the student
 * clicked Sign in. If they start on nexus-academy-one.vercel.app and Supabase
 * returns them to mandarb77-nexus-academy.vercel.app (the Site URL), the verifier
 * is missing → `bad_oauth_state`. Send alias traffic to the canonical host before
 * the auth client starts — except when this load is already an OAuth return (`code=`).
 */

export const CANONICAL_HOST = 'mandarb77-nexus-academy.vercel.app'

const PRODUCTION_ALIASES = new Set(['nexus-academy-one.vercel.app'])

export function isOAuthReturnUrl(href: string = window.location.href): boolean {
  const url = new URL(href)
  if (url.searchParams.has('code')) return true
  if (url.hash.includes('access_token')) return true
  return false
}

export function shouldRedirectToCanonicalHost(): boolean {
  if (typeof window === 'undefined') return false
  if (!PRODUCTION_ALIASES.has(window.location.hostname)) return false
  if (isOAuthReturnUrl()) return false
  return true
}

export function canonicalUrlForCurrentLocation(): string {
  const url = new URL(window.location.href)
  url.hostname = CANONICAL_HOST
  url.port = ''
  url.protocol = 'https:'
  return url.toString()
}
