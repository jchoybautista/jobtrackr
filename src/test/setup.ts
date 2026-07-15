import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest is configured without `globals`, so Testing Library's automatic
// cleanup never registers. Without this, renders leak between tests and
// queries match elements left behind by earlier cases.
afterEach(cleanup);
