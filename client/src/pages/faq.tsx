import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import logoTransparent from "@/assets/logo-transparent.png";
import logoLight from "@/assets/logo-light.png";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FaqPage() {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const items = [
    { value: "q1", trigger: t.faq.q1, content: t.faq.a1 },
    { value: "q2", trigger: t.faq.q2, content: t.faq.a2 },
    { value: "q3", trigger: t.faq.q3, content: t.faq.a3 },
    { value: "q4", trigger: t.faq.q4, content: t.faq.a4 },
    { value: "q5", trigger: t.faq.q5, content: t.faq.a5 },
    { value: "q6", trigger: t.faq.q6, content: t.faq.a6 },
    { value: "q7", trigger: t.faq.q7, content: t.faq.a7 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex justify-between items-center px-6 py-4 gap-4">
        <Link href="/" data-testid="link-logo-home">
          <img
            src={isDark ? logoTransparent : logoLight}
            alt="Craflect"
            className="h-10"
            data-testid="img-logo"
          />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-muted-foreground hover-elevate"
          data-testid="link-back-home"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.legal.backToHome}
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-faq-title">
          {t.faq.title}
        </h1>
        <p className="text-muted-foreground mb-10" data-testid="text-faq-subtitle">
          {t.faq.subtitle}
        </p>

        <Accordion type="single" collapsible data-testid="accordion-faq">
          {items.map((item) => (
            <AccordionItem
              key={item.value}
              value={item.value}
              className="border-b border-border"
              data-testid={`accordion-item-${item.value}`}
            >
              <AccordionTrigger
                className="text-left font-medium"
                data-testid={`accordion-trigger-${item.value}`}
              >
                {item.trigger}
              </AccordionTrigger>
              <AccordionContent
                className="text-muted-foreground"
                data-testid={`accordion-content-${item.value}`}
              >
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
    </div>
  );
}
