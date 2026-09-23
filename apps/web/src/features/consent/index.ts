// Public surface of the feature. Whatever is not re-exported here is
// internal — the project's feature isolation rule.
export { ConsentTerms } from './components/ConsentTerms';
export { CONSENT_CHECKBOX_LABEL } from './lib/consent-terms';
export { useConsent, useRecordConsent } from './hooks/useConsent';
