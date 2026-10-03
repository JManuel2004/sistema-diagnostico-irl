import { useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { DimensionCode, QuestionnaireStructure } from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { DimensionPanel } from './DimensionPanel';
import { DimensionNav } from './DimensionNav';
import { QuestionnaireProgress } from './QuestionnaireProgress';
import {
  selectActiveTab,
  isStatementComplete,
  selectAnswers,
  selectSetActiveTab,
  useQuestionnaireDraftStore,
} from '../store/questionnaire-draft.store';

/**
 * Tabs of the IRL dimensions.
 *
 * Layout (`DESIGN.md`):
 *  - Desktop: a 6-column grid (one trigger per dimension).
 *  - Mobile: the list falls back to horizontal scroll — Tailwind
 *    `overflow-x-auto` on the wrapper keeps the height and allows
 *    `scroll-snap` while swiping.
 *
 * Dimension codes (TRL, CRL, BRL, IPRL, TmRL, FRL) always in `overline`
 * (uppercase, 8% letter-spacing), never translated or abbreviated, per
 * `DESIGN.md`.
 *
 * The active tab lives in the store (`activeTab`) instead of `useState` or
 * `defaultValue`, so an F5 keeps it.
 *
 * Also:
 *  - A completion tick when the dimension's 8 statements are complete.
 *  - Auto-scroll on tab change: the user always lands at the top of the
 *    panel, not at the previous scroll height.
 *  - Previous/next navigation at the bottom (`<DimensionNav>`) to complete
 *    the questionnaire linearly without going back to the tab bar.
 */
interface Props {
  dimensions: QuestionnaireStructure['dimensions'];
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export function DimensionTabs({ dimensions }: Props) {
  const activeTab = useQuestionnaireDraftStore(selectActiveTab);
  const setActiveTab = useQuestionnaireDraftStore(selectSetActiveTab);
  const answers = useQuestionnaireDraftStore(selectAnswers);

  const panelTopRef = useRef<HTMLDivElement | null>(null);
  // Tab that was already in view: the effect only scrolls when the tab
  // changes from it, not on mount (there the page must load from the top).
  const shownTab = useRef(activeTab);

  // Auto-scroll: when the user changes dimension, take them to the
  // panel's header so they do not land mid-scroll. The typeof guard is
  // there because jsdom (the test environment) does not implement
  // `scrollIntoView`; a real browser always has it.
  //
  // Comparing with `shownTab` (and not a "first render" flag) is what
  // prevents the scroll on mount also under StrictMode, which runs the
  // effect twice in development.
  useEffect(() => {
    if (shownTab.current === activeTab) return;
    shownTab.current = activeTab;

    const node = panelTopRef.current;
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeTab]);

  const activeIndex = dimensions.findIndex((d) => d.code === activeTab);
  const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;
  const prevDimension = safeActiveIndex > 0 ? dimensions[safeActiveIndex - 1] : null;
  const nextDimension =
    safeActiveIndex < dimensions.length - 1 ? dimensions[safeActiveIndex + 1] : null;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as DimensionCode)}
      className="w-full"
    >
      <QuestionnaireProgress dimensions={dimensions} />

      <div ref={panelTopRef} className="scroll-mt-36">
        <TabsList
          aria-label="Dimensiones IRL"
          className="grid h-auto w-full grid-cols-3 gap-2 border-0 bg-transparent p-0 sm:grid-cols-6"
        >
          {dimensions.map((d) => {
            const answered = d.statements.filter((st) =>
              isStatementComplete(answers, st.id),
            ).length;
            const total = d.statements.length;
            const isComplete = answered === total && total > 0;
            const visual = getDimensionVisual(d.code);

            return (
              <TabsTrigger
                key={d.code}
                value={d.code}
                className="border-border bg-background data-[state=active]:border-primary data-[state=active]:bg-surface-emphasis flex h-16 flex-col items-start justify-center gap-1 rounded-xl border px-3 py-2 data-[state=active]:border-[1.5px] data-[state=active]:shadow-none"
                title={d.name}
              >
                <span
                  className={`${visual.textInk} flex items-center gap-1.5 text-[0.8125rem] font-extrabold tracking-normal`}
                >
                  <visual.icon className="size-4 shrink-0" aria-hidden="true" />
                  {d.code}
                </span>
                <span
                  aria-hidden="true"
                  className="text-muted-foreground inline-flex items-center gap-1 text-[0.8125rem] font-semibold tracking-normal"
                >
                  {isComplete ? (
                    <span
                      className="text-acceptable inline-flex items-center gap-1"
                      // `data-state=active` styling already conveys selection;
                      // the check is a redundant signal for completion only.
                    >
                      <CheckIcon />
                      <span>Completa</span>
                    </span>
                  ) : (
                    <span>
                      {answered} de {total}
                    </span>
                  )}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {dimensions.map((d) => (
        <TabsContent key={d.code} value={d.code}>
          <DimensionPanel dimension={d} />
        </TabsContent>
      ))}

      <DimensionNav
        previousDimension={prevDimension ?? null}
        nextDimension={nextDimension ?? null}
        onNavigate={(code: DimensionCode) => setActiveTab(code)}
      />
    </Tabs>
  );
}
