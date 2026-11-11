import { Code2 } from "lucide-react";

interface MarkdownHintProps {
  label: string;
}

const examples = ["**…**", "*…*", "- …", "[…](url)"];

export function MarkdownHint({ label }: MarkdownHintProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <Code2 className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="mr-1">{label}</span>
      {examples.map((example) => (
        <code
          key={example}
          className="rounded border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground"
        >
          {example}
        </code>
      ))}
    </div>
  );
}
