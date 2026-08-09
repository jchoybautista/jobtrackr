import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll, loadAll } from "@/lib/repo";
import { useApp } from "@/lib/store";

beforeEach(async () => {
  await clearAll();
  useApp.setState({ ready: false, profile: null, cvdocs: [] });
  await useApp.getState().hydrate();
});

describe("cv persistence", () => {
  it("saveProfile upserts the singleton and loadAll returns it", async () => {
    const before = (await loadAll()).cvdocs.length;
    await useApp.getState().saveProfile({ ...profileContent() });
    const snap = await loadAll();
    expect(snap.profile?.content.fullName).toBe("Jon B");
    // editing the master profile must not spawn or touch CVs
    expect(snap.cvdocs).toHaveLength(before);
  });

  it("createCv snapshots the profile content independently", async () => {
    await useApp.getState().saveProfile({ ...profileContent() });
    const cv = await useApp.getState().createCv("Stripe CV", "modern");
    expect(cv.content.fullName).toBe("Jon B");
    expect(cv.showPhoto).toBe(true);
    // mutating the CV must not touch the profile
    await useApp.getState().updateCvContent(cv.id, { fullName: "Tailored Name" });
    const s = useApp.getState();
    expect(s.cvdocs.find((c) => c.id === cv.id)!.content.fullName).toBe("Tailored Name");
    expect(s.profile!.content.fullName).toBe("Jon B");
  });

  it("classic CVs default showPhoto false", async () => {
    const cv = await useApp.getState().createCv("Plain", "classic");
    expect(cv.showPhoto).toBe(false);
  });

  it("deleting a linked application nulls the cv link but keeps the cv", async () => {
    const app = await useApp.getState().addApplication({ company: "Acme", role: "Dev" });
    const cv = await useApp.getState().createCv("Acme CV", "classic");
    await useApp.getState().updateCv(cv.id, { applicationId: app.id });
    await useApp.getState().removeApplication(app.id);
    const snap = await loadAll();
    const kept = snap.cvdocs.find((c) => c.id === cv.id);
    expect(kept).toBeTruthy();
    expect(kept!.applicationId).toBeUndefined();
  });
});

function profileContent() {
  return {
    fullName: "Jon B", links: [], experience: [], education: [], skills: [],
    projects: [], certifications: [], languages: [], awards: [], volunteer: [],
    references: [], referencesOnRequest: false,
  };
}
