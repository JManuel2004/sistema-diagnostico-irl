import type { JSX } from 'react';
import type { ConsentTerms as Terms } from '@innlab/contracts';
import { Card, CardContent } from '@/shared/ui/card';

interface Props {
  readonly terms: Terms;
}

/** The consent text (RF-03), exactly as it is accepted: the version the backend serves. */
export function ConsentTerms({ terms }: Props): JSX.Element {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-foreground text-lg font-semibold">{terms.title}</h2>
        <div className="mt-4 flex flex-col gap-4">
          {terms.sections.map((section) => (
            <section key={section.heading}>
              <h3 className="text-foreground text-sm font-semibold">{section.heading}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
