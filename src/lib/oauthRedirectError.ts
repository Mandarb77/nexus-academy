/*
 * Google OAuth can fail after the round-trip (expired/missing PKCE state).
 * Classroom pattern: click Sign in twice, switch tabs, or spend too long on
 * Google's account picker. Surface a retry message instead of a raw query string.
 */

export function oauthRedirectErrorMessage(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const code = params.get('error_code')?.trim() ?? ''
  const error = params.get('error')?.trim() ?? ''
  const description = (params.get('error_description') ?? '').replace(/\+/g, ' ').trim()
  if (!code && !error && !description) return null

  if (
    code === 'bad_oauth_state' ||
    /oauth state/i.test(description) ||
    /state not found/i.test(description)
  ) {
    return 'Sign-in did not finish. Stay in this tab, click Google once, and pick your school account. Do not click twice or use the back button.'
  }

  return description || 'Sign-in did not finish. Try Google again.'
}
