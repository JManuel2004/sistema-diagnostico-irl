// Public surface of the `maturity-profile` feature.
//
// Only what callers outside the feature need is exported here. Internal
// helpers (the API client, internal sub-components) stay private.

export { useComputeMaturityProfile } from './hooks/useComputeMaturityProfile';
export { MaturityRadarChart } from './components/MaturityRadarChart';
