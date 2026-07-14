import { Document, Image, Link, Page, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { SECTION_LABELS, type SectionKey } from "@/cv/types";
import { baseStyles, PageFooter, safeHref, SectionTitle } from "./shared";
import { renderMainSection } from "./sections";
import { visibleSections, type TemplateProps } from "./index";

/** Section titles are ink, not accent — the accent shows only in the thin rules. */
const INK = "#1a1a1a";

const PHOTO_SIZE = 56;

/** Join contact segments with a middot, dropping empties. */
function joinParts(parts: ReactNode[]): ReactNode[] {
  return parts
    .filter((p) => p !== null && p !== undefined && p !== "")
    .flatMap((p, i) => (i === 0 ? [p] : [<Text key={`sep${i}`}> · </Text>, p]));
}

export function ElegantTemplate({ content, accent, accentSoft, photoUrl, ...rest }: TemplateProps) {
  const c = content;
  const keys = visibleSections({ content, accent, accentSoft, photoUrl, ...rest });

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
          <Link key={l.id} src={href} style={{ color: INK, textDecoration: "none" }}>
            {text}
          </Link>
        ) : (
          <Text key={l.id} style={{ color: INK, textDecoration: "none" }}>{text}</Text>
        );
      }),
  ];

  /** Elegant-specific bodies (quiet inline skills/languages); the rest is shared. */
  function renderSection(key: SectionKey): ReactNode {
    switch (key) {
      case "skills":
        return c.skills.map((g) => (
          <View key={g.id} style={{ flexDirection: "row", marginBottom: 3 }}>
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
        // Entries like Classic, but with a touch more air between them.
        return renderMainSection(key, c, { entryGap: 2 });
    }
  }

  return (
    <Document title={c.fullName || "CV"} author={c.fullName || undefined}>
      <Page size="A4" style={baseStyles.page}>
        {/* Header: name + italic headline on the left, optional photo top-right,
            closed off by a hairline rule in the soft accent. */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottomWidth: 0.5,
            borderBottomColor: accentSoft,
            paddingBottom: 10,
            marginBottom: 4,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Lora", fontSize: 20, fontWeight: 700 }}>
              {c.fullName || "Your Name"}
            </Text>
            {c.headline ? (
              <Text style={{ fontSize: 11, fontStyle: "italic", color: "#555555", marginTop: 10 }}>
                {c.headline}
              </Text>
            ) : null}
            {contact.filter(Boolean).length > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  fontSize: 9,
                  color: "#444444",
                  marginTop: 6,
                }}
              >
                {joinParts(contact)}
              </View>
            ) : null}
          </View>

          {photoUrl ? (
            <Image
              src={photoUrl}
              style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, marginLeft: 16 }}
            />
          ) : null}
        </View>

        {keys.map((key) => (
          <View key={key}>
            <SectionTitle accent={INK} rule={accentSoft} serif>
              {SECTION_LABELS[key]}
            </SectionTitle>
            {renderSection(key)}
          </View>
        ))}

        <PageFooter />
      </Page>
    </Document>
  );
}
