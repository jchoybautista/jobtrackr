/**
 * Supabase error strings → copy a person can act on.
 *
 * The credentials case is deliberately vague: saying "no account with that
 * email" would turn the sign-in form into an account-existence oracle.
 */
const RULES: { match: RegExp; message: string }[] = [
  { match: /invalid login credentials/i,
    message: "That email or password isn't right. Check both and try again." },
  { match: /email not confirmed/i,
    message: "Confirm your email first — check your inbox for the link we sent when you signed up." },
  { match: /rate limit|only request this after|too many requests/i,
    message: "Too many attempts. Wait a minute or two, then try again." },
  { match: /password should be at least/i,
    message: "Password must be at least 8 characters." },
  { match: /user already registered/i,
    message: "That email is already registered. Try signing in instead." },
  { match: /token has expired|invalid.*token/i,
    message: "That link has expired. Request a new one." },
];

export function authErrorMessage(raw: string | null | undefined): string {
  if (raw) {
    for (const { match, message } of RULES) if (match.test(raw)) return message;
  }
  return "Something went wrong. Try again in a moment.";
}
