import { currentDb } from "./db";
import {
  DEFAULT_SETTINGS, deleteApplication, deleteCvDoc, deleteCvThumb, deleteProfile,
  deleteReminder, importSnapshot, loadAll, putSettings,
} from "./repo";
import type {
  ActivityEvent, Application, Contact, Interview, NoteDoc, Reminder, Snapshot, Stage, Tag,
} from "./types";
import type { CvContent, CvDoc, Profile } from "@/cv/types";
import { DEFAULT_SECTIONS } from "@/cv/types";

export const DEFAULT_STAGES: Stage[] = [
  { id: "stage-saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
  { id: "stage-screening", name: "Screening", color: "sky", order: 1, kind: "pipeline", role: "screening" },
  { id: "stage-interview", name: "Interview", color: "yellow", order: 2, kind: "pipeline", role: "interview" },
  { id: "stage-technical", name: "Technical", color: "peach", order: 3, kind: "pipeline", role: "technical" },
  { id: "stage-final", name: "Final interview", color: "orchid", order: 4, kind: "pipeline", role: "final" },
  { id: "stage-rejected", name: "Rejected", color: "gray", order: 5, kind: "lost", role: "rejected" },
  { id: "stage-offer", name: "Offer", color: "mint", order: 6, kind: "won", role: "offer", pinned: true },
];

export const PRESET_TAGS: Tag[] = [
  { id: "tag-dream", name: "Dream job", preset: true },
  { id: "tag-high", name: "High priority", preset: true },
  { id: "tag-low", name: "Low priority", preset: true },
  { id: "tag-remote", name: "Remote", preset: true },
  { id: "tag-referral", name: "Referral", preset: true },
  { id: "tag-onsite", name: "Onsite", preset: true },
];

/** Full name on the seeded master profile — also the marker that lets
 *  "Clear demo data" tell an untouched demo profile from a real one. */
const DEMO_PROFILE_NAME = "Mika Reyes";

const daysAgo = (now: Date, n: number) =>
  new Date(now.getTime() - n * 86_400_000).toISOString();
const daysAhead = (now: Date, n: number) =>
  new Date(now.getTime() + n * 86_400_000).toISOString();

/** demo-prefixed id, so clearDemoData can find everything it seeded. */
const A = (key: string) => `demo-${key}`;

/**
 * One demo application, written in days-ago terms: `created` is when the card
 * was added, `applied` when it was sent (omitted while it sits in Saved), and
 * `silent` how long ago it last moved — which drives nudges and the ghosted count.
 */
interface DemoSpec extends Omit<Partial<Application>,
  "id" | "order" | "createdAt" | "updatedAt" | "appliedAt"> {
  key: string;
  company: string;
  role: string;
  stageId: string;
  created: number;
  applied?: number;
  silent: number;
}

const SPECS: DemoSpec[] = [
  // ── Saved: shortlisted, not sent yet ───────────────────────────────────────
  { key: "vercel", company: "Vercel", role: "UX Engineer", stageId: "stage-saved",
    created: 3, silent: 3, location: "Remote", workMode: "remote", source: "LinkedIn",
    salaryMin: 150000, salaryMax: 190000, currency: "USD", tagIds: ["tag-remote", "tag-high"],
    url: "https://vercel.com/careers", furthestStageId: "stage-saved",
    jdSnapshot: "Vercel is looking for a UX Engineer to craft polished product surfaces across the dashboard and marketing site. You'll work between design and engineering, owning component quality, motion, and accessibility end to end." },
  { key: "anthropic", company: "Anthropic", role: "Product Engineer", stageId: "stage-saved",
    created: 2, silent: 2, location: "Remote · US/EU", workMode: "remote", source: "Careers page",
    salaryMin: 200000, salaryMax: 260000, currency: "USD", tagIds: ["tag-dream", "tag-remote"],
    url: "https://www.anthropic.com/careers", furthestStageId: "stage-saved",
    jdSnapshot: "Build product surfaces on top of frontier models. We want engineers who prototype fast, care about latency, and can reason about how people actually use AI tools day to day." },
  { key: "gcash", company: "GCash", role: "Senior Frontend Engineer", stageId: "stage-saved",
    created: 4, silent: 4, location: "BGC, Taguig", workMode: "onsite", source: "JobStreet",
    salaryMin: 150000, salaryMax: 200000, currency: "PHP", tagIds: ["tag-onsite"],
    furthestStageId: "stage-saved" },
  { key: "kumu", company: "Kumu", role: "Frontend Lead", stageId: "stage-saved",
    created: 11, silent: 11, location: "Manila", workMode: "hybrid", source: "Referral",
    salaryMin: 180000, salaryMax: 240000, currency: "PHP", tagIds: ["tag-referral"],
    furthestStageId: "stage-saved" },

  // ── Screening: applied, first conversation ─────────────────────────────────
  { key: "stripe", company: "Stripe", role: "Product Designer", stageId: "stage-screening",
    created: 12, applied: 8, silent: 3, location: "Remote", workMode: "remote", source: "LinkedIn",
    salaryMin: 120000, salaryMax: 140000, currency: "USD", tagIds: ["tag-dream"],
    url: "https://stripe.com/jobs", furthestStageId: "stage-screening",
    jdSnapshot: "Design payment experiences used by millions of businesses. You'll partner with engineers on Checkout and Billing surfaces, from early exploration through shipped detail." },
  // Ghosted: silent past the 14-day window
  { key: "coinbase", company: "Coinbase", role: "Software Engineer II", stageId: "stage-screening",
    created: 30, applied: 27, silent: 17, location: "Remote", workMode: "remote", source: "Indeed",
    salaryMin: 170000, salaryMax: 200000, currency: "USD", furthestStageId: "stage-screening" },
  { key: "linear", company: "Linear", role: "Frontend Engineer", stageId: "stage-screening",
    created: 24, applied: 21, silent: 20, location: "Hybrid · SF", workMode: "hybrid",
    source: "Referral", salaryMin: 165000, salaryMax: 195000, currency: "USD",
    tagIds: ["tag-referral"], furthestStageId: "stage-screening" },

  // ── Interview ──────────────────────────────────────────────────────────────
  { key: "canva", company: "Canva", role: "Software Engineer", stageId: "stage-interview",
    created: 15, applied: 12, silent: 2, location: "Manila", workMode: "onsite", source: "JobStreet",
    salaryMin: 160000, salaryMax: 210000, currency: "PHP", tagIds: ["tag-high"],
    furthestStageId: "stage-interview" },
  // Ghosted after a promising panel
  { key: "cloudflare", company: "Cloudflare", role: "Systems Engineer", stageId: "stage-interview",
    created: 38, applied: 34, silent: 16, location: "Austin · Hybrid", workMode: "hybrid",
    source: "Indeed", salaryMin: 160000, salaryMax: 190000, currency: "USD",
    furthestStageId: "stage-interview" },

  // ── Technical ──────────────────────────────────────────────────────────────
  { key: "figma", company: "Figma", role: "Product Engineer", stageId: "stage-technical",
    created: 19, applied: 15, silent: 1, location: "Remote", workMode: "remote", source: "LinkedIn",
    salaryMin: 180000, salaryMax: 215000, currency: "USD", tagIds: ["tag-dream", "tag-remote"],
    url: "https://www.figma.com/careers/", furthestStageId: "stage-technical",
    jdSnapshot: "Product Engineers at Figma own features end to end — multiplayer editing, plugins, and the surfaces designers live in all day. Strong TypeScript and an eye for craft matter more than a specific framework." },
  { key: "datadog", company: "Datadog", role: "UI Platform Engineer", stageId: "stage-technical",
    created: 28, applied: 24, silent: 4, location: "New York", workMode: "hybrid", source: "LinkedIn",
    salaryMin: 175000, salaryMax: 205000, currency: "USD", furthestStageId: "stage-technical" },
  { key: "ramp", company: "Ramp", role: "Growth Engineer", stageId: "stage-technical",
    created: 35, applied: 31, silent: 4, location: "Remote · US", workMode: "remote",
    source: "Referral", salaryMin: 185000, salaryMax: 220000, currency: "USD",
    tagIds: ["tag-referral", "tag-high"], furthestStageId: "stage-technical" },

  // ── Final interview ────────────────────────────────────────────────────────
  { key: "notion", company: "Notion", role: "Full-stack Engineer", stageId: "stage-final",
    created: 22, applied: 18, silent: 2, location: "Remote", workMode: "remote", source: "Referral",
    salaryMin: 190000, salaryMax: 230000, currency: "USD", tagIds: ["tag-dream", "tag-referral"],
    furthestStageId: "stage-final",
    jdSnapshot: "Own features across the stack — from the block model in the editor down to the sync layer. We're a small team, so scope is wide and ownership is real." },
  { key: "netflix", company: "Netflix", role: "Senior UI Engineer", stageId: "stage-final",
    created: 45, applied: 41, silent: 3, location: "Los Gatos · Hybrid", workMode: "hybrid",
    source: "Recruiter email", salaryMin: 250000, salaryMax: 320000, currency: "USD",
    tagIds: ["tag-high"], furthestStageId: "stage-final" },
  { key: "discord", company: "Discord", role: "Client Engineer", stageId: "stage-final",
    created: 31, applied: 27, silent: 6, location: "Remote · US", workMode: "remote",
    source: "LinkedIn", salaryMin: 180000, salaryMax: 210000, currency: "USD",
    tagIds: ["tag-remote"], furthestStageId: "stage-final" },

  // ── Offers ─────────────────────────────────────────────────────────────────
  { key: "shopify", company: "Shopify", role: "Web Developer", stageId: "stage-offer",
    created: 24, applied: 20, silent: 1, location: "Remote", workMode: "remote",
    source: "Company site", salaryMin: 135000, currency: "USD", tagIds: ["tag-dream", "tag-remote"],
    furthestStageId: "stage-final" },
  { key: "xendit", company: "Xendit", role: "Senior Frontend Engineer", stageId: "stage-offer",
    created: 40, applied: 36, silent: 5, location: "Manila · Remote", workMode: "remote",
    source: "JobStreet", salaryMin: 210000, salaryMax: 250000, currency: "PHP",
    tagIds: ["tag-remote"], furthestStageId: "stage-final" },

  // ── Rejected: spread across how far each one got ───────────────────────────
  { key: "grab", company: "Grab", role: "iOS Developer", stageId: "stage-rejected",
    created: 28, applied: 25, silent: 12, location: "Singapore", workMode: "onsite",
    source: "LinkedIn", salaryMin: 7000, salaryMax: 9000, currency: "SGD",
    furthestStageId: "stage-technical" },
  { key: "meta", company: "Meta", role: "Front End Engineer", stageId: "stage-rejected",
    created: 50, applied: 46, silent: 22, location: "London", workMode: "onsite",
    source: "Recruiter email", salaryMin: 95000, salaryMax: 120000, currency: "GBP",
    furthestStageId: "stage-interview" },
  { key: "deel", company: "Deel", role: "Senior React Engineer", stageId: "stage-rejected",
    created: 39, applied: 35, silent: 15, location: "Remote", workMode: "remote", source: "Wellfound",
    salaryMin: 140000, salaryMax: 170000, currency: "USD", furthestStageId: "stage-interview" },
  { key: "google", company: "Google", role: "Software Engineer III", stageId: "stage-rejected",
    created: 34, applied: 30, silent: 14, location: "Mountain View", workMode: "onsite",
    source: "Company site", salaryMin: 190000, salaryMax: 240000, currency: "USD",
    furthestStageId: "stage-screening" },
  { key: "amazon", company: "Amazon", role: "SDE II", stageId: "stage-rejected",
    created: 44, applied: 40, silent: 19, location: "Vancouver", workMode: "onsite", source: "Indeed",
    salaryMin: 165000, salaryMax: 195000, currency: "CAD", furthestStageId: "stage-saved" },
];

function buildApplications(now: Date): Application[] {
  const perStage = new Map<string, number>();
  return SPECS.map((spec) => {
    const { key, created, applied, silent, tagIds, ...rest } = spec;
    const order = perStage.get(spec.stageId) ?? 0;
    perStage.set(spec.stageId, order + 1);
    return {
      ...rest,
      id: A(key),
      order,
      tagIds: tagIds ?? [],
      createdAt: daysAgo(now, created),
      updatedAt: daysAgo(now, silent),
      ...(applied != null ? { appliedAt: daysAgo(now, applied) } : {}),
    } as Application;
  });
}

/**
 * Every application gets a plausible trail: created, applied, then one move per
 * pipeline stage it reached, spaced evenly between its created and updated
 * timestamps. Keeps the detail panel's Activity list full without hand-writing
 * ~200 events.
 */
function buildEvents(apps: Application[], notes: NoteDoc[]): ActivityEvent[] {
  const byId = new Map(DEFAULT_STAGES.map((s) => [s.id, s]));
  const out: ActivityEvent[] = [];

  for (const a of apps) {
    const start = Date.parse(a.createdAt);
    const span = Date.parse(a.updatedAt) - start;
    out.push({
      id: `${a.id}-ev-0`, applicationId: a.id, kind: "created",
      message: "Application created", at: a.createdAt,
    });

    const furthest = byId.get(a.furthestStageId ?? a.stageId);
    const current = byId.get(a.stageId);
    const steps: { kind: ActivityEvent["kind"]; message: string }[] = [];
    if (a.appliedAt) steps.push({ kind: "manual", message: "Marked as applied" });
    for (const s of DEFAULT_STAGES) {
      if (s.kind !== "pipeline" || s.order === 0) continue;
      if (furthest && furthest.kind === "pipeline" && s.order <= furthest.order) {
        steps.push({ kind: "stage_move", message: `Moved to ${s.name}` });
      }
    }
    if (current && current.kind !== "pipeline") {
      steps.push({ kind: "stage_move", message: `Moved to ${current.name}` });
    }

    steps.forEach((step, i) => {
      const at = new Date(start + ((i + 1) / (steps.length + 1)) * span).toISOString();
      out.push({ id: `${a.id}-ev-${i + 1}`, applicationId: a.id, ...step, at });
    });
  }

  for (const n of notes) {
    out.push({
      id: `${n.id}-ev`, applicationId: n.applicationId, kind: "note",
      message: "Note added", at: n.createdAt,
    });
  }
  return out;
}

function buildInterviews(now: Date): Interview[] {
  const rows: [key: string, round: Interview["roundType"], inDays: number, where: string, notes?: string][] = [
    // Upcoming
    ["figma", "technical", 2, "CoderPad · live pairing", "Two-part: 45m pairing on a real bug, then system design."],
    ["canva", "technical", 3, "Google Meet", "Take-home walkthrough — bring the repo up on screen."],
    ["netflix", "final", 1, "Onsite · Los Gatos", "Four back-to-back sessions, lunch with the team in between."],
    ["datadog", "technical", 4, "Zoom", "Frontend performance deep-dive."],
    ["notion", "final", 5, "Zoom · with VP Engineering", "Values + scope conversation. Prepare questions about roadmap."],
    ["discord", "final", 8, "Zoom", "Final loop with the desktop client team."],
    ["ramp", "technical", 14, "CodeSignal", "Timed assessment, 90 minutes."],
    // Already happened
    ["stripe", "phone", -4, "Phone · recruiter screen"],
    ["notion", "panel", -6, "Zoom", "Went well — they asked about the sync layer at length."],
    ["canva", "phone", -8, "Google Meet"],
    ["netflix", "technical", -9, "CoderPad", "Rendering performance question, solved with time to spare."],
    ["figma", "phone", -10, "Zoom · recruiter screen"],
    ["shopify", "final", -12, "Zoom", "Offer conversation followed two days later."],
    ["cloudflare", "panel", -17, "Zoom", "No feedback since — chase the recruiter."],
  ];
  return rows.map(([key, roundType, inDays, locationOrLink, notes], i) => ({
    id: `demo-int-${i + 1}`,
    applicationId: A(key),
    roundType,
    scheduledAt: inDays >= 0 ? daysAhead(now, inDays) : daysAgo(now, -inDays),
    locationOrLink,
    ...(notes ? { notes } : {}),
  }));
}

const CONTACTS: [key: string, name: string, role: string, email: string, linkedin?: string][] = [
  ["stripe", "Alex Rivera", "Recruiter", "alex.rivera@example.com", "https://linkedin.com/in/alexrivera"],
  ["stripe", "Dana Whitfield", "Design Manager", "dana.w@example.com"],
  ["figma", "Priya Nair", "Technical Recruiter", "priya.nair@example.com", "https://linkedin.com/in/priyanair"],
  ["figma", "Tom Okafor", "Engineering Manager", "tom.okafor@example.com"],
  ["notion", "Sam Delacruz", "Hiring Manager", "sam.delacruz@example.com", "https://linkedin.com/in/samdelacruz"],
  ["notion", "Ivy Chen", "Referral · ex-colleague", "ivy.chen@example.com"],
  ["canva", "Marco Lim", "Talent Partner", "marco.lim@example.com"],
  ["netflix", "Rebecca Hale", "Senior Recruiter", "r.hale@example.com", "https://linkedin.com/in/rebeccahale"],
  ["shopify", "Jordan Fitz", "Recruiting Lead", "jordan.fitz@example.com"],
  ["linear", "Noah Berg", "Founding Engineer", "noah@example.com"],
  ["discord", "Elena Vasquez", "Engineering Manager", "elena.v@example.com"],
  ["datadog", "Chris Mbeki", "Recruiter", "chris.mbeki@example.com"],
  ["ramp", "Hannah Reyes", "Referral · college friend", "hannah.reyes@example.com"],
  ["xendit", "Bea Salonga", "People Partner", "bea.salonga@example.com"],
];

const NOTES: [key: string, ageDays: number, body: string][] = [
  ["stripe", 3, "Recruiter screen went well. They want a portfolio walkthrough next — lead with the checkout redesign, they kept coming back to payments UX."],
  ["figma", 1, "Pairing round is on a real plugin bug. Reviewed the plugin API docs and the multiplayer cursor implementation. Ask about the split between product and infra work."],
  ["figma", 6, "Recruiter said comp band is 180–215k plus equity refresh at 2 years. Negotiable if there's a competing offer."],
  ["notion", 2, "Panel loved the sync-layer answer. VP call next — prepare two questions: roadmap for the API, and how the team handles on-call."],
  ["canva", 2, "Take-home submitted: a virtualised table with keyboard nav. Kept it dependency-free. Be ready to defend the decision not to use TanStack."],
  ["netflix", 3, "Onsite confirmed. Four sessions: rendering perf, system design, culture (the memo!), and a manager 1:1. Re-read the culture deck the night before."],
  ["shopify", 1, "Offer in writing: $135k base, remote, RSUs vesting over 4 years, $2k home-office budget. Deadline is Friday — need a decision before the Notion final."],
  ["xendit", 5, "Verbal offer at ₱210–250k. Waiting on the written version. Strong team, but the scope is narrower than Notion's."],
  ["linear", 20, "Nothing since the intro call three weeks ago. Noah said they were 'finalising headcount'. One more nudge, then let it go."],
  ["cloudflare", 16, "Panel felt fine but silence since. Recruiter's out of office until next week."],
  ["ramp", 4, "Hannah referred me internally — the CodeSignal invite came the same day. Timed 90 minutes, mostly data structures."],
  ["discord", 6, "Client team works in TypeScript + Rust for the native shell. They asked how comfortable I'd be picking up Rust — said 'willing, not fluent'."],
  ["grab", 12, "Rejected after the technical. Feedback: strong on product thinking, thin on Swift specifics. Fair."],
  ["google", 14, "Rejected at screening — the req was closed and folded into another team. Recruiter offered to resurface me in Q4."],
  ["meta", 22, "Two rounds in, then a rejection email with no detail. Standard."],
];

function buildNotes(now: Date): NoteDoc[] {
  return NOTES.map(([key, ageDays, body], i) => ({
    id: `demo-note-${i + 1}`,
    applicationId: A(key),
    body,
    createdAt: daysAgo(now, ageDays),
    updatedAt: daysAgo(now, ageDays),
  }));
}

function buildReminders(now: Date): Reminder[] {
  return [
    { id: "demo-rem-1", applicationId: A("linear"), type: "follow_up",
      title: "Follow up with Linear", dueAt: daysAgo(now, 1), done: false },
    { id: "demo-rem-2", applicationId: A("coinbase"), type: "follow_up",
      title: "Nudge Coinbase recruiter — 2nd attempt", dueAt: daysAgo(now, 3), done: false },
    { id: "demo-rem-3", applicationId: A("cloudflare"), type: "follow_up",
      title: "Chase Cloudflare panel feedback", dueAt: daysAgo(now, 2), done: false },
    { id: "demo-rem-4", applicationId: A("shopify"), type: "custom",
      title: "Decide on the Shopify offer", dueAt: daysAhead(now, 2), done: false },
    { id: "demo-rem-5", applicationId: A("figma"), type: "interview",
      title: "Prep for Figma pairing round", dueAt: daysAhead(now, 1), done: false },
    { id: "demo-rem-6", applicationId: A("notion"), type: "interview",
      title: "Write questions for the Notion VP call", dueAt: daysAhead(now, 4), done: false },
    { id: "demo-rem-7", applicationId: A("netflix"), type: "custom",
      title: "Send thank-you notes to the Netflix panel", dueAt: daysAhead(now, 3), done: false },
    { id: "demo-rem-8", applicationId: A("xendit"), type: "follow_up",
      title: "Ask Xendit about the relocation package", dueAt: daysAhead(now, 6), done: false },
    // Snoozed out of the due list for now
    { id: "demo-rem-9", applicationId: A("linear"), type: "follow_up",
      title: "Nudge Linear again", dueAt: daysAgo(now, 5), done: false,
      snoozedUntil: daysAhead(now, 3) },
    { id: "demo-rem-10", type: "custom",
      title: "Refresh the portfolio case study", dueAt: daysAgo(now, 6), done: true },
    { id: "demo-rem-11", applicationId: A("canva"), type: "interview",
      title: "Re-read the Canva take-home before the walkthrough", dueAt: daysAhead(now, 2), done: false },
  ];
}

// ── Master profile + CV library ──────────────────────────────────────────────

function demoCvContent(): CvContent {
  return {
    fullName: DEMO_PROFILE_NAME,
    headline: "Senior Frontend Engineer · Design Systems & Developer Experience",
    email: "mika.reyes@example.com",
    phone: "+63 917 555 0148",
    location: "Manila, Philippines",
    links: [
      { id: "demo-link-1", label: "Portfolio", url: "https://mikareyes.example.com" },
      { id: "demo-link-2", label: "GitHub", url: "https://github.com/mikareyes" },
      { id: "demo-link-3", label: "LinkedIn", url: "https://linkedin.com/in/mikareyes" },
      { id: "demo-link-4", label: "Writing", url: "https://mikareyes.example.com/notes" },
    ],
    summary:
      "Senior frontend engineer with 8 years building product surfaces for consumer and B2B teams. I own design systems end to end — tokens, components, docs, and the migration work that gets everyone onto them — and I like the unglamorous parts: accessibility audits, bundle budgets, and making the second engineer's week faster than the first's. Most recently led a 40-component library rollout across four product teams without a feature freeze.",
    experience: [
      { id: "demo-exp-1", role: "Senior Frontend Engineer", company: "Kumu", location: "Manila (Hybrid)",
        startDate: "2023-02", bullets: [
          "Led the design-system rewrite: 40 components on a token layer shared by web and React Native, adopted by four product teams in two quarters with no feature freeze.",
          "Cut initial JS payload 42% (1.1MB → 640KB) by route-splitting the creator dashboard and replacing three chart libraries with one.",
          "Introduced visual-regression and axe CI gates; accessibility defects reported by QA dropped from ~9 to under 2 per release.",
          "Mentored three mid-level engineers, two of whom now own their own surfaces end to end.",
        ] },
      { id: "demo-exp-2", role: "Frontend Engineer", company: "Sprout Solutions", location: "Manila",
        startDate: "2020-06", endDate: "2023-01", bullets: [
          "Rebuilt the payroll run wizard used by 1,200+ HR teams, taking median completion time from 14 to 6 minutes.",
          "Migrated a 90k-line CRA codebase to Vite and TypeScript strict mode incrementally, keeping the release train running weekly.",
          "Built the internal component playground that became the company's first shared UI documentation.",
          "Ran the frontend guild: fortnightly reviews, a written style guide, and onboarding docs that halved ramp-up time.",
        ] },
      { id: "demo-exp-3", role: "Product Engineer (Contract)", company: "Independent", location: "Remote",
        startDate: "2019-01", endDate: "2020-05", bullets: [
          "Shipped six client products end to end — Next.js frontends, Node APIs, and the deploy pipelines behind them.",
          "Built a booking platform for a regional clinic group that still handles ~3,000 appointments a month.",
          "Handled scoping, estimates, and handover documentation directly with founders.",
        ] },
      { id: "demo-exp-4", role: "Junior Web Developer", company: "Symph", location: "Cebu City",
        startDate: "2017-08", endDate: "2018-12", bullets: [
          "Built marketing sites and internal tools in React and Rails for startup and enterprise clients.",
          "Automated the team's Lighthouse checks, making performance budgets part of code review.",
          "Won the company hack day with an offline-first field-survey app.",
        ] },
    ],
    education: [
      { id: "demo-edu-1", school: "University of the Philippines Diliman",
        degree: "BS", field: "Computer Science", startDate: "2013-06", endDate: "2017-05",
        notes: "Cum laude. Thesis on progressive rendering for low-bandwidth networks." },
      { id: "demo-edu-2", school: "Georgia Institute of Technology",
        degree: "MS", field: "Human–Computer Interaction (part-time)", startDate: "2024-08",
        notes: "In progress — coursework in interaction design and information visualisation." },
    ],
    skills: [
      { id: "demo-skill-1", name: "Languages",
        skills: ["TypeScript", "JavaScript (ES2023)", "HTML", "CSS", "SQL", "Python"] },
      { id: "demo-skill-2", name: "Frameworks",
        skills: ["React", "Next.js", "Remix", "React Native", "Node.js", "Astro"] },
      { id: "demo-skill-3", name: "Design systems & styling",
        skills: ["Tailwind CSS", "CSS Modules", "Radix UI", "Style Dictionary", "Figma", "Storybook"] },
      { id: "demo-skill-4", name: "Tooling & testing",
        skills: ["Vite", "Vitest", "Playwright", "Testing Library", "Turborepo", "GitHub Actions"] },
      { id: "demo-skill-5", name: "Practices",
        skills: ["WCAG 2.1 AA", "Core Web Vitals", "Design tokens", "Incremental migration", "Mentoring"] },
    ],
    projects: [
      { id: "demo-proj-1", name: "Tokenkit", url: "https://github.com/mikareyes/tokenkit",
        description: "Open-source design-token pipeline (Figma → CSS variables → native).",
        bullets: [
          "1.2k GitHub stars; used in production by three companies I know of.",
          "Ships a codemod that rewrote 6,000 hard-coded colour literals in one repo.",
        ] },
      { id: "demo-proj-2", name: "Sari — offline-first POS", url: "https://sari.example.com",
        description: "PWA point-of-sale for neighbourhood shops with no reliable connection.",
        bullets: [
          "IndexedDB-backed sync queue that survives days offline and reconciles on reconnect.",
          "Used by 40+ sari-sari stores in Metro Manila.",
        ] },
      { id: "demo-proj-3", name: "Perfwatch",
        description: "Lightweight Core Web Vitals dashboard for small teams.",
        bullets: [
          "Aggregates field data from the web-vitals library into weekly regression alerts.",
          "Deployed on a $5/month box; no vendor lock-in.",
        ] },
    ],
    certifications: [
      { id: "demo-cert-1", name: "IAAP Web Accessibility Specialist (WAS)", issuer: "IAAP", date: "2024-03" },
      { id: "demo-cert-2", name: "Professional Cloud Developer", issuer: "Google Cloud", date: "2023-09" },
      { id: "demo-cert-3", name: "Advanced React Performance", issuer: "Frontend Masters", date: "2022-11" },
    ],
    languages: [
      { id: "demo-lang-1", name: "English", level: "Native / bilingual" },
      { id: "demo-lang-2", name: "Filipino", level: "Native" },
      { id: "demo-lang-3", name: "Spanish", level: "Conversational (B1)" },
    ],
    awards: [
      { id: "demo-award-1", name: "Engineering Excellence Award", issuer: "Kumu", date: "2024-12" },
      { id: "demo-award-2", name: "Best Developer Tool", issuer: "PH Web Dev Awards", date: "2023-10" },
    ],
    volunteer: [
      { id: "demo-vol-1", role: "Mentor", org: "Women Who Code Manila",
        startDate: "2022-01", description: "Weekly mentoring for career-shifters moving into frontend roles; 14 mentees placed so far." },
      { id: "demo-vol-2", role: "Workshop Facilitator", org: "DevCon Philippines",
        startDate: "2021-03", endDate: "2023-11", description: "Ran free accessibility workshops for student developers across five campuses." },
    ],
    interests:
      "Long-distance running, film photography, and rebuilding mechanical keyboards I did not need to buy.",
    references: [
      { id: "demo-ref-1", name: "Tom Okafor", role: "Engineering Manager", company: "Kumu",
        email: "tom.okafor@example.com", phone: "+63 917 555 0102" },
      { id: "demo-ref-2", name: "Sam Delacruz", role: "Director of Engineering", company: "Sprout Solutions",
        email: "sam.delacruz@example.com", phone: "+63 917 555 0117" },
    ],
    referencesOnRequest: false,
  };
}

const visible = (keys: string[]) =>
  DEFAULT_SECTIONS.map((s) => ({ ...s, visible: keys.includes(s.key) }));

function buildCvDocs(now: Date, base: CvContent): CvDoc[] {
  return [
    { id: "demo-cv-1", name: "Master CV", templateId: "classic", accent: "sky", showPhoto: false,
      content: base,
      sections: visible(["summary", "skills", "experience", "education", "projects", "certifications"]),
      createdAt: daysAgo(now, 60), updatedAt: daysAgo(now, 4) },
    { id: "demo-cv-2", name: "Figma — Product Engineer", templateId: "modern", accent: "orchid", showPhoto: true,
      applicationId: A("figma"),
      content: {
        ...base,
        headline: "Product Engineer · Design Tools & Design Systems",
        summary:
          "Frontend engineer who lives in design tooling. Built and shipped a token pipeline that syncs Figma libraries to production CSS, and led a 40-component system rollout across four teams. Comfortable owning a feature from Figma file to shipped, measured, accessible surface.",
      },
      sections: visible(["summary", "skills", "experience", "projects", "education"]),
      createdAt: daysAgo(now, 18), updatedAt: daysAgo(now, 1) },
    { id: "demo-cv-3", name: "Notion — Full-stack", templateId: "elegant", accent: "mint", showPhoto: true,
      applicationId: A("notion"),
      content: {
        ...base,
        headline: "Full-stack Engineer · React, Node, and everything in between",
        summary:
          "Eight years shipping across the stack, most of it on the frontend but never only there. Rebuilt a payroll engine's UI and the API contracts behind it, and I've owned deploy pipelines on every contract I've taken. I like small teams and wide scope.",
      },
      sections: visible(["summary", "experience", "skills", "projects", "education", "languages"]),
      createdAt: daysAgo(now, 20), updatedAt: daysAgo(now, 2) },
    { id: "demo-cv-4", name: "ATS-safe — Big tech", templateId: "classic", accent: "gray", showPhoto: false,
      content: {
        ...base,
        headline: "Senior Frontend Engineer",
        summary:
          "Senior frontend engineer, 8 years' experience in React and TypeScript. Design systems, web performance, and accessibility. Led a component library adopted by four product teams and reduced initial bundle size by 42%.",
      },
      sections: visible(["summary", "skills", "experience", "education", "certifications"]),
      createdAt: daysAgo(now, 45), updatedAt: daysAgo(now, 12) },
    { id: "demo-cv-5", name: "Startup one-pager", templateId: "modern", accent: "peach", showPhoto: true,
      content: {
        ...base,
        headline: "Design Engineer · 0→1 product work",
        summary:
          "I build the first version and then make it good. Six client products shipped solo end to end, plus two open-source tools people actually use. Happiest in the messy early stretch where design and engineering are the same job.",
      },
      sections: visible(["summary", "projects", "experience", "skills", "awards", "interests"]),
      createdAt: daysAgo(now, 30), updatedAt: daysAgo(now, 8) },
    { id: "demo-cv-6", name: "Shopify — Web Developer", templateId: "classic", accent: "lavender", showPhoto: false,
      applicationId: A("shopify"),
      content: {
        ...base,
        headline: "Web Developer · Commerce & performance",
        summary:
          "Frontend engineer focused on fast, accessible commerce surfaces. Shipped storefront work on low-bandwidth networks, cut a dashboard's JS payload by 42%, and treat Core Web Vitals as a release gate rather than a report.",
      },
      sections: visible(["summary", "skills", "experience", "projects", "education", "references"]),
      createdAt: daysAgo(now, 26), updatedAt: daysAgo(now, 6) },
  ];
}

export function demoSnapshot(now: Date): Snapshot {
  const applications = buildApplications(now);
  const notes = buildNotes(now);
  const content = demoCvContent();
  const profile: Profile = { id: "singleton", content, updatedAt: daysAgo(now, 4) };
  const contacts: Contact[] = CONTACTS.map(([key, name, role, email, linkedin], i) => ({
    id: `demo-contact-${i + 1}`,
    applicationId: A(key),
    name, role, email,
    ...(linkedin ? { linkedin } : {}),
  }));

  return {
    stages: DEFAULT_STAGES,
    tags: PRESET_TAGS,
    applications,
    interviews: buildInterviews(now),
    contacts,
    events: buildEvents(applications, notes),
    notes,
    reminders: buildReminders(now),
    settings: { ...DEFAULT_SETTINGS, demo: true },
    profile,
    cvdocs: buildCvDocs(now, content),
  };
}

export async function seedIfEmpty(now: Date = new Date()): Promise<boolean> {
  const count = await currentDb().stages.count();
  if (count > 0) return false;
  await importSnapshot(demoSnapshot(now), "replace");
  return true;
}

export async function clearDemoData(): Promise<void> {
  const snap = await loadAll();
  for (const a of snap.applications.filter((a) => a.id.startsWith("demo-"))) {
    await deleteApplication(a.id);
  }
  // Reminders not tied to an application outlive deleteApplication.
  for (const r of snap.reminders.filter((r) => r.id.startsWith("demo-") && !r.applicationId)) {
    await deleteReminder(r.id);
  }
  for (const c of snap.cvdocs.filter((c) => c.id.startsWith("demo-"))) {
    await deleteCvDoc(c.id);
    await deleteCvThumb(c.id);
  }
  // Only the untouched demo profile goes — a renamed one is the user's now.
  if (snap.profile?.content.fullName === DEMO_PROFILE_NAME) await deleteProfile();
  await putSettings({ ...snap.settings, demo: false });
}
