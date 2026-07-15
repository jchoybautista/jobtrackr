/** Absent values are interchangeable: clearing an already-empty optional
 *  field is not an edit. */
const norm = (v: unknown) => (v === "" || v === null ? undefined : v);

const sameSet = (a: unknown[], b: unknown[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

function equal(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return sameSet(a, b);
  return norm(a) === norm(b);
}

/** True when any key of `draft` differs from `source`. */
export function isDirty<T extends object>(draft: T, source: T): boolean {
  return (Object.keys(draft) as (keyof T)[]).some((k) => !equal(draft[k], source[k]));
}

/** The minimal patch carrying every changed key. Cleared fields are present
 *  with an `undefined` value so the store can unset them. */
export function changedFields<T extends object>(draft: T, source: T): Partial<T> {
  const patch: Partial<T> = {};
  for (const k of Object.keys(draft) as (keyof T)[]) {
    if (!equal(draft[k], source[k])) patch[k] = norm(draft[k]) as T[keyof T];
  }
  return patch;
}
