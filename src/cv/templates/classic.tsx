import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { SECTION_LABELS, type SectionKey } from "@/cv/types";
import { baseStyles, PageFooter, safeHref, SectionTitle } from "./shared";
import { renderMainSection } from "./sections";
import { visibleSections, type TemplateProps } from "./index";

/** Join contact/meta segments with a middot, dropping empties. */
function joinParts(parts: ReactNode[]): ReactNode[] {
  return parts
    .filter((p) => p !== null && p !== undefined && p !== "")
    .flatMap((p, i) => (i === 0 ? [p] : [<Text key={`sep${i}`}> · </Text>, p]));
}

export function ClassicTemplate({ content, accent, accentSoft, ...rest }: TemplateProps) {
  const c = content;
  const keys = visibleSections({ content, accent, accentSoft, ...rest });

  // Contact line: email · phone · location · <link labels>
  const contact: ReactNode[] = [
    c.email ? <Text key="email">{c.email}</Text> : null,
    c.phone ? <Text key="phone">{c.phone}</Text> : null,
    c.location ? <Text key="loc">{c.location}</Text> : null,
    ...c.links
      .filter((l) => l.url.trim())
      .map((l) => {
        const href = safeHref(l.url);
        const text = l.label.trim() || l.url;
        return href ? (
          <Link key={l.id} src={href} style={{ color: "#1a1a1a", textDecoration: "none" }}>
            {text}
          </Link>
        ) : (
          <Text key={l.id} style={{ color: "#1a1a1a", textDecoration: "none" }}>{text}</Text>
        );
      }),
  ];

  /** Classic-specific bodies (inline skills/languages); everything else is shared. */
  function renderSection(key: SectionKey): ReactNode {
    switch (key) {
      case "skills":
        return c.skills.map((g) => (
          <View key={g.id} style={{ flexDirection: "row", marginBottom: 2 }}>
            <Text style={{ fontWeight: 700 }}>{g.name}: </Text>
            <Text style={{ flex: 1 }}>{g.skills.filter(Boolean).join(", ")}</Text>
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

      default:
        return renderMainSection(key, c);
    }
  }

  return (
    <Document title={c.fullName || "CV"} author={c.fullName || undefined}>
      <Page size="A4" style={baseStyles.page}>
        <View style={{ textAlign: "center", marginBottom: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: 700 }}>{c.fullName || "Your Name"}</Text>
          {c.headline ? (
            <Text style={{ fontSize: 11, color: "#555555", marginTop: 6 }}>{c.headline}</Text>
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
            <SectionTitle accent={accent} rule={accentSoft}>{SECTION_LABELS[key]}</SectionTitle>
            {renderSection(key)}
          </View>
        ))}

        <PageFooter />
      </Page>
    </Document>
  );
}
