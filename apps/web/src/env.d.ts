/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Build-time switch of the development autofill. `true` only in
   * `.env.development`; absent in any production build.
   */
  readonly VITE_DEV_AUTOFILL?: string;
}
