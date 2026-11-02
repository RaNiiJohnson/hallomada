import type { ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

export const SITE_URL = "https://hallomada.de";
export const EMAIL_FROM = "Hallomada <noreply@hallomada.de>";

const colors = {
  page: "#f4f4f5",
  card: "#ffffff",
  border: "#e4e4e7",
  text: "#18181b",
  muted: "#52525b",
  subtle: "#a1a1aa",
  brand: "#16a34a",
  quote: "#f4f4f5",
};

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function EmailLayout({
  lang,
  preview,
  footer,
  children,
}: {
  lang: string;
  preview: string;
  footer: string;
  children: ReactNode;
}) {
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "32px 12px",
          backgroundColor: colors.page,
          fontFamily,
        }}
      >
        <Container
          style={{
            maxWidth: "520px",
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: "12px",
            padding: "32px",
          }}
        >
          <Section style={{ marginBottom: "28px" }}>
            <Link href={SITE_URL} style={{ textDecoration: "none" }}>
              <Img
                src={`${SITE_URL}/email-logo.png`}
                width="36"
                height="36"
                alt="Hallomada"
                style={{ display: "inline-block", verticalAlign: "middle" }}
              />
              <span
                style={{
                  display: "inline-block",
                  verticalAlign: "middle",
                  marginLeft: "10px",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: colors.text,
                  letterSpacing: "-0.3px",
                }}
              >
                Hallomada
              </span>
            </Link>
          </Section>
          {children}
        </Container>
        <Container style={{ maxWidth: "520px", padding: "20px 32px 0" }}>
          <Text
            style={{
              margin: 0,
              fontSize: "12px",
              lineHeight: "18px",
              color: colors.subtle,
            }}
          >
            {footer}
            <br />
            <Link href={SITE_URL} style={{ color: colors.subtle }}>
              hallomada.de
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Heading
      as="h1"
      style={{
        margin: "0 0 16px",
        fontSize: "22px",
        lineHeight: "30px",
        fontWeight: 700,
        color: colors.text,
      }}
    >
      {children}
    </Heading>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 16px",
        fontSize: "15px",
        lineHeight: "24px",
        color: colors.muted,
      }}
    >
      {children}
    </Text>
  );
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong style={{ color: colors.text }}>{children}</strong>;
}

export function CtaButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Section style={{ margin: "8px 0 24px" }}>
      <Button
        href={href}
        style={{
          backgroundColor: colors.brand,
          color: "#ffffff",
          borderRadius: "8px",
          padding: "12px 22px",
          fontSize: "15px",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 8px",
        fontSize: "13px",
        lineHeight: "20px",
        color: colors.subtle,
      }}
    >
      {children}
    </Text>
  );
}

/** Raw link shown under the button, for clients where the button fails. */
export function FallbackLink({ label, href }: { label: string; href: string }) {
  return (
    <Note>
      {label}
      <br />
      <Link
        href={href}
        style={{ color: colors.muted, wordBreak: "break-all" }}
      >
        {href}
      </Link>
    </Note>
  );
}

export function Quote({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 20px",
        padding: "14px 16px",
        backgroundColor: colors.quote,
        borderRadius: "8px",
        fontSize: "14px",
        lineHeight: "22px",
        color: colors.text,
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </Text>
  );
}
