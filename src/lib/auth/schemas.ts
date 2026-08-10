import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(
  z.string().min(1, "Enter your email address").email("Enter a valid email address"),
);

/** Sign-up and reset only. Sign-in deliberately has no length rule — it would
 *  leak the policy and lock out anyone whose password predates it. */
const newPassword = z.string().min(8, "Password must be at least 8 characters");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z.object({ email, password: newPassword });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ password: newPassword });

/** One message per field, which is all a form can show at once. */
export function firstErrors(result: z.ZodSafeParseResult<unknown>): Record<string, string> {
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
