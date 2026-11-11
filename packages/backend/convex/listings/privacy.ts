const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/gi;
const PHONE_PATTERN = /\+?\d(?:[\s().-]*\d){5,}/g;
const COORDINATE_PATTERN = /[-+]?\d{1,2}\.\d{3,}\s*,\s*[-+]?\d{1,3}\.\d{3,}/g;
const ADDRESS_PATTERN = /\b(?:\d{1,4}[a-z]?\s+(?:[a-zà-ÿ'-]+\s+){0,4}(?:straße|strasse|str\.?|street|rue|avenue|avenida|weg|allee|platz)|[a-zà-ÿ'-]*?(?:straße|strasse|str\.?|street|rue|avenue|avenida|weg|allee|platz)\s+\d{1,4}[a-z]?)\b/gi;

const SENSITIVE_PUBLIC_TEXT_PATTERNS = [
  EMAIL_PATTERN,
  PHONE_PATTERN,
  COORDINATE_PATTERN,
  ADDRESS_PATTERN,
];

export function containsSensitivePublicListingText(values: Array<string | undefined>) {
  const text = values.filter(Boolean).join(" ");
  return SENSITIVE_PUBLIC_TEXT_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    const matches = pattern.test(text);
    pattern.lastIndex = 0;
    return matches;
  });
}

export function redactSensitivePublicListingText(value: string) {
  return SENSITIVE_PUBLIC_TEXT_PATTERNS.reduce(
    (redacted, pattern) => redacted.replace(pattern, "[information privée masquée]"),
    value,
  );
}
