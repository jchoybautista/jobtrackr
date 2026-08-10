// Must run before `@/lib/db` is imported below: Dexie captures `indexedDB`
// as a static dependency at module-load time. This setup file is loaded as
// part of vitest's setupFiles phase, before any test file's own top-level
// imports run — so a Dexie-touching test file's own `import
// "fake-indexeddb/auto"` is too late to matter once this file imports
// `@/lib/db` and forces `dexie` to load first.
import "fake-indexeddb/auto";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { setScope } from "@/lib/db";

// Vitest is configured without `globals`, so Testing Library's automatic
// cleanup never registers. Without this, renders leak between tests and
// queries match elements left behind by earlier cases.
afterEach(cleanup);

// Repo calls now resolve a scoped database. Tests get their own so they never
// depend on which account happened to be active.
beforeEach(() => { setScope({ kind: "user", userId: "test-user" }); });
