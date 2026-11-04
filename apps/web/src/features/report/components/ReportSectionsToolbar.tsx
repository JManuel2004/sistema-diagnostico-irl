import type { JSX } from 'react';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { ReportSections } from '../hooks/useReportSections';

/** «Expandir todas» and «Contraer todas», above the sections. */
export function ReportSectionsToolbar({
  sections,
}: {
  readonly sections: ReportSections;
}): JSX.Element {
  return (
    <div
      role="group"
      aria-label="Mostrar u ocultar las secciones del reporte"
      className="flex flex-wrap justify-end gap-2"
    >
      <Button variant="ghost" size="sm" onClick={sections.expandAll} disabled={sections.allOpen}>
        <ChevronsUpDown className="size-4" aria-hidden="true" />
        Expandir todas
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={sections.collapseAll}
        disabled={sections.allClosed}
      >
        <ChevronsDownUp className="size-4" aria-hidden="true" />
        Contraer todas
      </Button>
    </div>
  );
}
