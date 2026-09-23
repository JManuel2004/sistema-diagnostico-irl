import type { JSX } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { CONSENT_SECTIONS, CONSENT_TITLE } from '../lib/consent-terms';

/** The consent text (RF-03), exactly as it is accepted. */
export function ConsentTerms(): JSX.Element {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-foreground text-lg font-semibold">{CONSENT_TITLE}</h2>
        <div className="mt-4 flex flex-col gap-4">
          {CONSENT_SECTIONS.map((section) => (
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
