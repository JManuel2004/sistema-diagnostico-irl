import { useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { DimensionCode, QuestionnaireStructure } from '@innlab/contracts';
import { DimensionPanel } from './DimensionPanel';
import { DimensionNav } from './DimensionNav';
import { QuestionnaireProgress } from './QuestionnaireProgress';
import {
  selectActiveTab,
  selectAnswers,
  selectSetActiveTab,
  useQuestionnaireDraftStore,
} from '../store/questionnaire-draft.store';

/**
 * Tabs de dimensiones IRL.
 *
 * Layout (`DESIGN.md`):
 *  - Desktop: grid de 6 columnas (un trigger por dimensión).
 *  - Mobile: la lista cae a scroll horizontal — Tailwind `overflow-x-auto`
 *    sobre el wrapper conserva la altura y permite `scroll-snap` al
 *    deslizar.
 *
 * Códigos de dimensión (TRL, CRL, BRL, IPRL, TmRL, FRL) siempre en
 * `overline` (uppercase, 8% letter-spacing), nunca traducidos ni
 * abreviados según `DESIGN.md`.
 *
 * La pestaña activa vive en el store (`activeTab`) en lugar de
 * `useState` o `defaultValue`, de modo que el F5 la conserva
 * (SPEC-STORY3 §5.6).
 *
 * Mejoras heredadas del prototipo cliente:
 *  - Tick de completitud cuando los 8 ítems de la dimensión están
 *    respondidos.
 *  - Auto-scroll al cambiar de pestaña: el usuario entra siempre al
 *    inicio del panel, no a la altura previa del scroll.
 *  - Navegación inferior previa/siguiente (`<DimensionNav>`) para
 *    completar el cuestionario en orden lineal sin obligar al
 *    usuario a volver a la barra de pestañas.
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

  // Auto-scroll: cuando el usuario cambia de dimensión, llevarlo a la
  // cabecera del panel para que no entre a mitad de scroll. Se usa
  // typeof-guard porque jsdom (entorno de tests) no implementa
  // `scrollIntoView`; en un navegador real está siempre disponible.
  useEffect(() => {
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

      <div ref={panelTopRef} className="overflow-x-auto">
        <TabsList
          aria-label="Dimensiones IRL"
          className="grid h-auto w-full min-w-max grid-cols-6 gap-1 p-1"
        >
          {dimensions.map((d) => {
            const answered = d.statements.filter((st) => answers[st.id] !== undefined).length;
            const total = d.statements.length;
            const isComplete = answered === total && total > 0;

            return (
              <TabsTrigger
                key={d.code}
                value={d.code}
                className="flex h-12 flex-col items-center justify-center gap-0.5 px-3 py-2"
                title={d.name}
              >
                <span className="text-overline">{d.code}</span>
                <span
                  aria-hidden="true"
                  className="text-muted-foreground inline-flex items-center gap-1 text-[0.6875rem] font-normal tracking-normal"
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
                      {answered}/{total}
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
