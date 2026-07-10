import { describe, it, expect } from "vitest";
import { parseQuickAdd } from "@/lib/quickadd";

describe("parseQuickAdd", () => {
  it("parses 'Role at Company' with salary, mode, and URL", () => {
    const p = parseQuickAdd(
      "Senior Product Designer at Stripe\nRemote · $120k–$140k\nhttps://www.linkedin.com/jobs/view/123",
    );
    expect(p.role).toBe("Senior Product Designer");
    expect(p.company).toBe("Stripe");
    expect(p.workMode).toBe("remote");
    expect(p.salaryMin).toBe(120000);
    expect(p.salaryMax).toBe(140000);
    expect(p.url).toBe("https://www.linkedin.com/jobs/view/123");
    expect(p.source).toBe("LinkedIn");
    expect(p.jdSnapshot).toContain("Senior Product Designer");
  });

  it("detects source from known job-board hostnames", () => {
    expect(parseQuickAdd("https://ph.indeed.com/viewjob?jk=1").source).toBe("Indeed");
    expect(parseQuickAdd("https://boards.greenhouse.io/acme/jobs/1").source).toBe("Company site");
  });

  it("handles a bare URL only", () => {
    const p = parseQuickAdd("https://jobs.example.com/postings/42");
    expect(p.url).toBe("https://jobs.example.com/postings/42");
    expect(p.role).toBeUndefined();
    expect(p.jdSnapshot).toBeUndefined();
  });

  it("parses full-number salaries", () => {
    const p = parseQuickAdd("Engineer at Acme\n$120,000 - $150,000 a year");
    expect(p.salaryMin).toBe(120000);
    expect(p.salaryMax).toBe(150000);
  });
});
