"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Briefcase,
    Globe,
    Heart,
    Home,
    Shield,
    Users,
} from "lucide-react";

// Icons statiques — pas de DynamicIcon, pas de bundle géant
const icons = [Users, Briefcase, Home, Heart, Globe, Shield] as const;

type FAQItem = { question: string; answer: string };

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {items.map((item, index) => {
        const Icon = icons[index % icons.length];
        return (
          <AccordionItem
            key={index}
            value={`item-${index + 1}`}
            className="bg-background shadow-xs rounded-lg border px-4 last:border-b"
          >
            <AccordionTrigger className="cursor-pointer items-center py-5 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex size-6">
                  <Icon className="m-auto size-4" />
                </div>
                <span className="text-base">{item.question}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <div className="px-9">
                <p className="text-base">{item.answer}</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
