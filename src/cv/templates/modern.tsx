import { Document, Image, Link, Page, Text, View } from "@react-pdf/renderer";
import { SECTION_LABELS, type SectionKey } from "@/cv/types";
import { mixWithWhite } from "@/lib/palette";
import { baseStyles, PageFooter, SectionTitle } from "./shared";
import { renderMainSection } from "./sections";
import { visibleSections, type TemplateProps } from "./index";

/** Sidebar owns these keys; the main column must skip them. */
const SIDEBAR_KEYS: readonly SectionKey[] = ["skills", "languages"];

const SIDEBAR_WIDTH = 176;

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

        {/* Main column — skills/languages live in the sidebar, so the shared
            renderer's null for those keys never comes into play here. */}
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
              {renderMainSection(key, c)}
            </View>
          ))}
        </View>

        <PageFooter />
      </Page>
    </Document>
  );
}
