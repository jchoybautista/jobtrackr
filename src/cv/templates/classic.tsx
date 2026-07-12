import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { formatMonthYear, formatRange } from "@/cv/dates";
import { SECTION_LABELS, type SectionKey } from "@/cv/types";
import { baseStyles, BulletList, MetaText, PageFooter, Row, SectionTitle } from "./shared";
import { visibleSections, type TemplateProps } from "./index";

/** Join contact/meta segments with a middot, dropping empties. */
function joinParts(parts: ReactNode[]): ReactNode[] {
  return parts
    .filter((p) => p !== null && p !== undefined && p !== "")
    .flatMap((p, i) => (i === 0 ? [p] : [<Text key={`sep${i}`}> · </Text>, p]));
}

function Paragraph({ children }: { children: string }) {
  return <Text style={{ marginTop: 2 }}>{children}</Text>;
}

export function ClassicTemplate({ content, accent, ...rest }: TemplateProps) {
  const c = content;
  const keys = visibleSections({ content, accent, ...rest });

  // Contact line: email · phone · location · <link labels>
  const contact: ReactNode[] = [
    c.email ? <Text key="email">{c.email}</Text> : null,
    c.phone ? <Text key="phone">{c.phone}</Text> : null,
    c.location ? <Text key="loc">{c.location}</Text> : null,
    ...c.links
      .filter((l) => l.url.trim())
      .map((l) => (
        <Link key={l.id} src={l.url} style={{ color: "#1a1a1a", textDecoration: "none" }}>
          {l.label.trim() || l.url}
        </Link>
      )),
  ];

  function renderSection(key: SectionKey): ReactNode {
    switch (key) {
      case "summary":
        return <Paragraph>{c.summary!.trim()}</Paragraph>;

      case "experience":
        return c.experience.map((e) => (
          <View key={e.id} style={{ marginBottom: 7 }} wrap={false}>
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
          <View key={e.id} style={{ marginBottom: 6 }} wrap={false}>
            <Row left={e.school} right={formatRange(e.startDate, e.endDate)} />
            {[e.degree, e.field].filter(Boolean).length > 0 ? (
              <MetaText>{[e.degree, e.field].filter(Boolean).join(", ")}</MetaText>
            ) : null}
            {e.notes ? <Paragraph>{e.notes}</Paragraph> : null}
          </View>
        ));

      case "skills":
        return c.skills.map((g) => (
          <View key={g.id} style={{ flexDirection: "row", marginBottom: 2 }}>
            <Text style={{ fontWeight: 700 }}>{g.name}: </Text>
            <Text style={{ flex: 1 }}>{g.skills.filter(Boolean).join(", ")}</Text>
          </View>
        ));

      case "projects":
        return c.projects.map((p) => (
          <View key={p.id} style={{ marginBottom: 6 }} wrap={false}>
            <Row left={p.name} right={undefined} />
            {p.url ? (
              <Link src={p.url} style={{ ...baseStyles.meta, textDecoration: "none" }}>
                {p.url}
              </Link>
            ) : null}
            {p.description ? <Paragraph>{p.description}</Paragraph> : null}
            <BulletList items={p.bullets} />
          </View>
        ));

      case "certifications":
        return c.certifications.map((e) => (
          <View key={e.id} style={{ marginBottom: 3 }}>
            <Row left={e.name} right={formatMonthYear(e.date)} />
            {e.issuer ? <MetaText>{e.issuer}</MetaText> : null}
          </View>
        ));

      case "languages":
        return (
          <Text style={{ marginTop: 2 }}>
            {c.languages
              .map((l) => (l.level ? `${l.name} (${l.level})` : l.name))
              .filter(Boolean)
              .join(" · ")}
          </Text>
        );

      case "awards":
        return c.awards.map((e) => (
          <View key={e.id} style={{ marginBottom: 3 }}>
            <Row left={e.name} right={formatMonthYear(e.date)} />
            {e.issuer ? <MetaText>{e.issuer}</MetaText> : null}
          </View>
        ));

      case "volunteer":
        return c.volunteer.map((e) => (
          <View key={e.id} style={{ marginBottom: 6 }} wrap={false}>
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
          <View key={r.id} style={{ marginBottom: 3 }}>
            <Row left={[r.name, r.role].filter(Boolean).join(" — ")} right={r.company} />
            {[r.email, r.phone].filter(Boolean).length > 0 ? (
              <MetaText>{[r.email, r.phone].filter(Boolean).join(" · ")}</MetaText>
            ) : null}
          </View>
        ));
    }
  }

  return (
    <Document title={c.fullName || "CV"} author={c.fullName || undefined}>
      <Page size="A4" style={baseStyles.page}>
        <View style={{ textAlign: "center", marginBottom: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: 700 }}>{c.fullName || "Your Name"}</Text>
          {c.headline ? (
            <Text style={{ fontSize: 11, color: "#555555", marginTop: 2 }}>{c.headline}</Text>
          ) : null}
          {contact.filter(Boolean).length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                fontSize: 9,
                color: "#444444",
                marginTop: 4,
              }}
            >
              {joinParts(contact)}
            </View>
          ) : null}
        </View>

        {keys.map((key) => (
          <View key={key}>
            <SectionTitle accent={accent}>{SECTION_LABELS[key]}</SectionTitle>
            {renderSection(key)}
          </View>
        ))}

        <PageFooter />
      </Page>
    </Document>
  );
}
