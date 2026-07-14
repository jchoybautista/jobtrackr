import { Link, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { formatMonthYear, formatRange } from "@/cv/dates";
import type { CvContent, SectionKey } from "@/cv/types";
import { baseStyles, BulletList, MetaText, Row, safeHref } from "./shared";

/** A short block of body copy with a little breathing room above it. */
export function Paragraph({ children }: { children: string }) {
  return <Text style={{ marginTop: 2 }}>{children}</Text>;
}

export interface MainSectionOpts {
  /**
   * Extra bottom margin added to each entry. Airier templates (e.g. Elegant)
   * pass a positive value; default 0 keeps the compact spacing of Classic/Modern.
   */
  entryGap?: number;
}

/**
 * Renders the body of a section shared by every template — summary, experience,
 * education, projects, certifications, awards, volunteer, interests, references.
 *
 * Per-template divergences (Classic's inline skills, Modern's sidebar
 * skills/languages, Elegant's inline skills/languages) are NOT handled here and
 * return `null`; each template owns its own layout for those keys.
 */
export function renderMainSection(
  key: SectionKey,
  c: CvContent,
  opts: MainSectionOpts = {},
): ReactNode {
  const gap = opts.entryGap ?? 0;

  switch (key) {
    case "summary":
      return <Paragraph>{c.summary!.trim()}</Paragraph>;

    case "experience":
      return c.experience.map((e) => (
        <View key={e.id} style={{ marginBottom: 7 + gap }} wrap={false}>
          <Row
            left={[e.role, e.company].filter(Boolean).join(" — ")}
            right={formatRange(e.startDate, e.endDate)}
          />
          {e.location ? <MetaText>{e.location}</MetaText> : null}
          <BulletList items={e.bullets} />
        </View>
      ));

    case "education":
      return c.education.map((e) => (
        <View key={e.id} style={{ marginBottom: 6 + gap }} wrap={false}>
          <Row left={e.school} right={formatRange(e.startDate, e.endDate)} />
          {[e.degree, e.field].filter(Boolean).length > 0 ? (
            <MetaText>{[e.degree, e.field].filter(Boolean).join(", ")}</MetaText>
          ) : null}
          {e.notes ? <Paragraph>{e.notes}</Paragraph> : null}
        </View>
      ));

    case "projects":
      return c.projects.map((p) => {
        const href = safeHref(p.url);
        return (
        <View key={p.id} style={{ marginBottom: 6 + gap }} wrap={false}>
          <Row left={p.name} right={undefined} />
          {p.url ? (
            href ? (
              <Link src={href} style={{ ...baseStyles.meta, textDecoration: "none" }}>
                {p.url}
              </Link>
            ) : (
              <Text style={{ ...baseStyles.meta, textDecoration: "none" }}>{p.url}</Text>
            )
          ) : null}
          {p.description ? <Paragraph>{p.description}</Paragraph> : null}
          <BulletList items={p.bullets} />
        </View>
        );
      });

    case "certifications":
      return c.certifications.map((e) => (
        <View key={e.id} style={{ marginBottom: 3 + gap }}>
          <Row left={e.name} right={formatMonthYear(e.date)} />
          {e.issuer ? <MetaText>{e.issuer}</MetaText> : null}
        </View>
      ));

    case "awards":
      return c.awards.map((e) => (
        <View key={e.id} style={{ marginBottom: 3 + gap }}>
          <Row left={e.name} right={formatMonthYear(e.date)} />
          {e.issuer ? <MetaText>{e.issuer}</MetaText> : null}
        </View>
      ));

    case "volunteer":
      return c.volunteer.map((e) => (
        <View key={e.id} style={{ marginBottom: 6 + gap }} wrap={false}>
          <Row
            left={[e.role, e.org].filter(Boolean).join(" — ")}
            right={formatRange(e.startDate, e.endDate)}
          />
          {e.description ? <Paragraph>{e.description}</Paragraph> : null}
        </View>
      ));

    case "interests":
      return <Paragraph>{c.interests!.trim()}</Paragraph>;

    case "references":
      if (c.referencesOnRequest && c.references.length === 0) {
        return <Paragraph>References available on request.</Paragraph>;
      }
      return c.references.map((r) => (
        <View key={r.id} style={{ marginBottom: 3 + gap }}>
          <Row left={[r.name, r.role].filter(Boolean).join(" — ")} right={r.company} />
          {[r.email, r.phone].filter(Boolean).length > 0 ? (
            <MetaText>{[r.email, r.phone].filter(Boolean).join(" · ")}</MetaText>
          ) : null}
        </View>
      ));

    // skills + languages are template-specific; each template renders them itself.
    case "skills":
    case "languages":
      return null;
  }
}
