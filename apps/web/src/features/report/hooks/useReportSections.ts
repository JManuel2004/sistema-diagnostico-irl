import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Which sections of the on-screen report are open.
 *
 * The page owns the state and hands it down through a context, so every
 * `ReportSection` (including the ones other components compose) folds the
 * same way without threading props. Without a provider a section is simply
 * open and not collapsible.
 *
 * Folding is only on screen: the PDF is rendered by the server from the
 * whole report, whatever is folded here.
 */
export interface ReportSections {
  readonly isOpen: (id: string) => boolean;
  readonly toggle: (id: string) => void;
  readonly open: (id: string) => void;
  readonly expandAll: () => void;
  readonly collapseAll: () => void;
  readonly allOpen: boolean;
  readonly allClosed: boolean;
}

const ReportSectionsContext = createContext<ReportSections | null>(null);

export const ReportSectionsProvider = ReportSectionsContext.Provider;

/** The folding state of the section `id`, or `null` outside a provider. */
export function useReportSection(
  id: string,
): { readonly open: boolean; readonly toggle: () => void } | null {
  const sections = useContext(ReportSectionsContext);
  if (sections === null) return null;
  return { open: sections.isOpen(id), toggle: () => sections.toggle(id) };
}

/**
 * The folding state of the report's sections. `initiallyOpen` are open at
 * first; a section named in the URL hash (`#report-answers`) opens too, so
 * a link to it shows it.
 */
export function useReportSections(
  ids: readonly string[],
  initiallyOpen: readonly string[],
): ReportSections {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => {
    const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1);
    return new Set(ids.includes(hash) ? [...initiallyOpen, hash] : initiallyOpen);
  });

  const toggle = useCallback((id: string) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const open = useCallback((id: string) => {
    setOpenIds((current) => (current.has(id) ? current : new Set([...current, id])));
  }, []);
  const expandAll = useCallback(() => {
    setOpenIds(new Set(ids));
  }, [ids]);
  const collapseAll = useCallback(() => {
    setOpenIds(new Set());
  }, []);

  return useMemo(
    () => ({
      isOpen: (id: string) => openIds.has(id),
      toggle,
      open,
      expandAll,
      collapseAll,
      allOpen: ids.every((id) => openIds.has(id)),
      allClosed: ids.every((id) => !openIds.has(id)),
    }),
    [openIds, ids, toggle, open, expandAll, collapseAll],
  );
}
