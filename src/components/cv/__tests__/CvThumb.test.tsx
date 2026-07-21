import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { clearAll } from "@/lib/repo";
import { CvThumb } from "@/components/cv/CvThumb";

beforeEach(async () => {
  await clearAll();
});

// Real repo + fake-indexeddb: no row is ever written for this id, so
// getCvThumb legitimately resolves undefined — not a mocked stand-in. This
// is the state every CV starts in and the one every user sees first, so it
// is the highest-value assertion available under jsdom (see the module doc
// in src/lib/__tests__/cvthumb.test.ts for why the cached-image path can't
// round-trip a real Blob under this environment).
describe("CvThumb — fallback path (no cached thumbnail)", () => {
  it("renders the MiniMock wireframe, not a broken <img>, when no thumb row exists", async () => {
    const { container } = render(
      <CvThumb cvId="never-opened" templateId="classic" accent="#000000" />
    );

    await waitFor(() => {
      // MiniMock's root div is aria-hidden; its presence (and no <img>) is
      // the observable fallback behavior.
      expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    });
    expect(container.querySelector("img")).toBeNull();
  });
});
