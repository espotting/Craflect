import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import logoTransparent from "@/assets/logo-transparent.png";
import logoLight from "@/assets/logo-light.png";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

type LegalPageType = "terms" | "billing" | "privacy" | "cookies" | "dpa" | "security" | "contact";

function LegalPage({ page }: { page: LegalPageType }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const pageData = t.legal[page] as any;
  const sections: { title: string; text: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const sTitle = pageData["s" + i + "Title"];
    const sText = pageData["s" + i + "Text"];
    if (sTitle) sections.push({ title: sTitle, text: sText });
    else break;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex justify-between items-center gap-4 px-4 py-4">
        <Link href="/" data-testid="link-logo-home">
          <img
            src={isDark ? logoTransparent : logoLight}
            alt="Craflect"
            className="h-10"
          />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover-elevate rounded-md px-2 py-1"
          data-testid="link-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.legal.backToHome}
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-legal-title">
          {pageData.title}
        </h1>
        <p className="text-sm text-muted-foreground mb-10" data-testid="text-legal-updated">
          {t.legal.lastUpdated}
        </p>

        {sections.length > 0 ? (
          <div className="space-y-8">
            {sections.map((section, index) => (
              <section key={index}>
                <h2 className="text-xl font-semibold mb-3" data-testid={`text-section-title-${index}`}>
                  {section.title}
                </h2>
                <p
                  className="text-muted-foreground whitespace-pre-line"
                  data-testid={`text-section-content-${index}`}
                >
                  {section.text}
                </p>
              </section>
            ))}
          </div>
        ) : (
          <p
            className="text-muted-foreground whitespace-pre-line"
            data-testid="text-legal-content"
          >
            {pageData.text}
          </p>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        {t.landing.copyright.replace("{year}", new Date().getFullYear().toString())}
      </footer>
    </div>
  );
}

export function TermsPage() { return <LegalPage page="terms" />; }
export function BillingPage() { return <LegalPage page="billing" />; }
export function PrivacyPage() { return <LegalPage page="privacy" />; }
export function CookiesPage() { return <LegalPage page="cookies" />; }
export function DpaPage() { return <LegalPage page="dpa" />; }
export function SecurityPage() { return <LegalPage page="security" />; }
export function ContactPage() { return <LegalPage page="contact" />; }
export default LegalPage;
