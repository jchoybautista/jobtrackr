import { StyleSheet, Text, View } from "@react-pdf/renderer";

export const baseStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 42,
    paddingHorizontal: 40,
    fontFamily: "Jakarta",
    fontSize: 10,
    lineHeight: 1.45,
    color: "#1a1a1a",
  },
  meta: { fontSize: 9, color: "#555555" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#999999",
  },
});

export function SectionTitle({
  children,
  accent,
  rule,
  serif = false,
}: {
  children: string;
  /** Text color — pass the darkened, text-safe accent (or ink for serif templates). */
  accent: string;
  /** Border (rule) color — pass the raw pastel accent. */
  rule: string;
  /** Serif variant: Lora with a wider, small-caps-feel tracking. */
  serif?: boolean;
}) {
  return (
    <Text
      style={{
        fontFamily: serif ? "Lora" : "Jakarta",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: serif ? 1.2 : 0.8,
        textTransform: "uppercase",
        color: accent,
        borderBottomWidth: 0.75,
        borderBottomColor: rule,
        paddingBottom: 2,
        marginBottom: 6,
        marginTop: serif ? 16 : 12,
      }}
    >
      {children}
    </Text>
  );
}

export function BulletList({ items }: { items: string[] }) {
  const list = items.map((b) => b.trim()).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <View style={{ marginTop: 2 }}>
      {list.map((b, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: 1.5 }}>
          <Text style={{ width: 10 }}>•</Text>
          <Text style={{ flex: 1 }}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

export function Row({ left, right }: { left: string; right?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
      <Text style={{ fontWeight: 700, fontSize: 10.5, flex: 1 }}>{left}</Text>
      {right ? <Text style={baseStyles.meta}>{right}</Text> : null}
    </View>
  );
}

export function MetaText({ children }: { children: string }) {
  return <Text style={baseStyles.meta}>{children}</Text>;
}

export function PageFooter() {
  return (
    <Text
      style={baseStyles.footer}
      render={({ pageNumber, totalPages }) => (totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : "")}
      fixed
    />
  );
}
