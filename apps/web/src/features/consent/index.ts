// Superficie pública de la feature. Lo que no se reexporta aquí es
// interno — regla de aislamiento por feature del proyecto.
export { ConsentTerms } from './components/ConsentTerms';
export { CONSENT_CHECKBOX_LABEL } from './lib/consent-terms';
export { useConsent, useRecordConsent } from './hooks/useConsent';
