import { Document, Image, Link, Page, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { formatMonthYear, formatRange } from "@/cv/dates";
import { SECTION_LABELS, type SectionKey } from "@/cv/types";
import { mixWithWhite } from "@/lib/palette";
import { baseStyles, BulletList, MetaText, PageFooter, Row, SectionTitle } from "./shared";
import { visibleSections, type TemplateProps } from "./index";

/** Sidebar owns these keys; the main column must skip them. */
const SIDEBAR_KEYS: readonly SectionKey[] = ["skills", "languages"];

const SIDEBAR_WIDTH = 176;

function Paragraph({ children }: { children: string }) {
  return <Text style={{ marginTop: 2 }}>{children}</Text>;
}

/** Small uppercase heading used inside the sidebar. */
function SidebarHeading({ children, accent }: { children: string; accent: string }) {
  return (
    <Text
      style={{
        fontWeight: 700,
        fontSize: 9.5,
        letterSpacing: 0.8,
        textTransform: "uppercase",
        color: accent,
        marginTop: 14,
        marginBottom: 4,
      }}
    >
      {children}
    </Text>
  );
}

export function ModernTemplate({ content, accent, accentSoft, photoUrl, ...rest }: TemplateProps) {
  const c = content;
  const keys = visibleSections({ content, accent, accentSoft, photoUrl, ...rest });

  const sidebarBg = mixWithWhite(accentSoft, 0.25);

  const mainKeys = keys.filter((k) => !SIDEBAR_KEYS.includes(k));
  const showSkills = keys.includes("skills");
  const showLanguages = keys.includes("languages");

  const links = c.links.filter((l) => l.url.trim());

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

      // skills + languages live in the sidebar; never rendered in the main column.
      case "skills":
      case "languages":
        return null;
    }
  }

  return (
    <Document title={c.fullName || "CV"} author={c.fullName || undefined}>
      <Page size="A4" style={{ ...baseStyles.page, padding: 0, flexDirection: "row" }}>
        {/* Sidebar — flows with the content; on overflow it simply continues on the
            next page rather than painting a fixed full-height band (react-pdf cannot
            reliably repaint an absolutely-positioned background across page breaks). */}
        <View
          style={{
            width: SIDEBAR_WIDTH,
            backgroundColor: sidebarBg,
            paddingTop: 36,
            paddingBottom: 42,
            paddingHorizontal: 20,
            color: "#1a1a1a",
          }}
        >
          {photoUrl ? (
            <Image
              src={photoUrl}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                marginBottom: 14,
                alignSelf: "flex-start",
              }}
            />
          ) : null}

          {(c.email || c.phone || c.location) ? (
            <View>
              <SidebarHeading accent={accent}>Contact</SidebarHeading>
              {c.email ? <Text style={{ marginBottom: 2 }}>{c.email}</Text> : null}
              {c.phone ? <Text style={{ marginBottom: 2 }}>{c.phone}</Text> : null}
              {c.location ? <Text style={{ marginBottom: 2 }}>{c.location}</Text> : null}
            </View>
          ) : null}

          {links.length > 0 ? (
            <View>
              <SidebarHeading accent={accent}>Links</SidebarHeading>
              {links.map((l) => (
                <Link
                  key={l.id}
                  src={l.url}
                  style={{ color: "#1a1a1a", textDecoration: "none", marginBottom: 2 }}
                >
                  {l.label.trim() || l.url}
                </Link>
              ))}
            </View>
          ) : null}

          {showSkills ? (
            <View>
              <SidebarHeading accent={accent}>Skills</SidebarHeading>
              {c.skills.map((g) => (
                <View key={g.id} style={{ marginBottom: 5 }}>
                  {g.name ? <Text style={{ fontWeight: 700 }}>{g.name}</Text> : null}
                  <Text>{g.skills.filter(Boolean).join(", ")}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {showLanguages ? (
            <View>
              <SidebarHeading accent={accent}>Languages</SidebarHeading>
              {c.languages.map((l) => (
                <Text key={l.id} style={{ marginBottom: 2 }}>
                  {l.level ? `${l.name} (${l.level})` : l.name}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {/* Main column */}
        <View
          style={{
            flex: 1,
            paddingTop: 36,
            paddingBottom: 42,
            paddingHorizontal: 28,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 700 }}>{c.fullName || "Your Name"}</Text>
          {c.headline ? (
            <Text style={{ fontSize: 11, color: "#555555", marginTop: 2 }}>{c.headline}</Text>
          ) : null}

          {mainKeys.map((key) => (
            <View key={key}>
              <SectionTitle accent={accent} rule={accentSoft}>
                {SECTION_LABELS[key]}
              </SectionTitle>
              {renderSection(key)}
            </View>
          ))}
        </View>

        <PageFooter />
      </Page>
    </Document>
  );
}
