"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Activity,
  TrendingDown,
  Repeat,
  DoorOpen,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortfolioVitality } from "@/components/analysis/portfolio-vitality";
import { StressTestSection } from "@/components/analysis/stress-test-section";
import { SpecialRepaymentSection } from "@/components/analysis/special-repayment-section";
import { RefinancingSection } from "@/components/analysis/refinancing-section";
import { ExitStrategySection } from "@/components/analysis/exit-strategy-section";

const SECTIONS = [
  { id: "vitality", icon: Activity },
  { id: "stressTest", icon: BarChart3 },
  { id: "specialRepayment", icon: TrendingDown },
  { id: "refinancing", icon: Repeat },
  { id: "exitStrategy", icon: DoorOpen },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function AnalysisPage() {
  const t = useTranslations("analysis");
  const [activeSection, setActiveSection] = useState<SectionId>("vitality");
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  const registerRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) sectionRefs.current.set(id, el);
    },
    [],
  );

  // Intersection observer for active section highlighting
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );

    for (const [, el] of sectionRefs.current) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex gap-6">
      {/* Sticky sidebar navigation (desktop) */}
      <nav className="sticky top-20 hidden h-fit w-48 shrink-0 space-y-1 lg:block">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                activeSection === section.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(`nav.${section.id}`)}
            </button>
          );
        })}
        <div className="pt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              // PDF export placeholder
            }}
            disabled
          >
            <FileDown className="mr-2 h-4 w-4" />
            {t("pdfExport")}
          </Button>
        </div>
      </nav>

      {/* Mobile top tabs */}
      <div className="fixed inset-x-0 top-14 z-30 overflow-x-auto border-b bg-background px-4 py-2 lg:hidden">
        <div className="flex gap-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`nav.${section.id}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-8 pt-12 lg:pt-0">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

        <section id="vitality" ref={registerRef("vitality")}>
          <PortfolioVitality />
        </section>

        <section id="stressTest" ref={registerRef("stressTest")}>
          <StressTestSection />
        </section>

        <section id="specialRepayment" ref={registerRef("specialRepayment")}>
          <SpecialRepaymentSection />
        </section>

        <section id="refinancing" ref={registerRef("refinancing")}>
          <RefinancingSection />
        </section>

        <section id="exitStrategy" ref={registerRef("exitStrategy")}>
          <ExitStrategySection />
        </section>
      </div>
    </div>
  );
}
