export function googleAccountLinkUpdate(emailVerified: boolean): {
  email_verified: true
  password_hash?: null
} {
  if (emailVerified) return { email_verified: true }
  // The password was chosen before anyone proved they own this inbox.
  return { email_verified: true, password_hash: null }
}
