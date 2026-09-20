/**
 * Texto del consentimiento para el tratamiento de datos personales
 * (RF-03 / HU-05, Ley 1581 de 2012).
 *
 * `CONSENT_TERMS_VERSION` debe coincidir con `CURRENT_TERMS_VERSION` del
 * backend: el backend rechaza con 409 una versión distinta, y así queda
 * registrado exactamente qué texto aceptó el usuario. Cambiar el texto exige
 * subir la versión en los dos lados.
 *
 * **Texto provisional, pendiente de revisión legal** (backlog 16): no
 * incluye datos institucionales que no constan en el repositorio, como el
 * NIT o el canal de atención de habeas data.
 */
export const CONSENT_TERMS_VERSION = 'v1';

export interface ConsentSection {
  readonly heading: string;
  readonly body: string;
}

export const CONSENT_TITLE = 'Autorización para el tratamiento de datos personales';

export const CONSENT_SECTIONS: readonly ConsentSection[] = [
  {
    heading: 'Responsable del tratamiento',
    body: 'La Universidad Icesi, a través de INNLAB Centro de Innovación, es la responsable del tratamiento de los datos que se recogen en este diagnóstico, conforme a la Ley 1581 de 2012.',
  },
  {
    heading: 'Datos que se tratan',
    body: 'Los datos de tu cuenta INNLAB, la información de tu iniciativa que registres (nombre, sector, etapa, equipo, mercado objetivo y financiamiento), tus respuestas a las 48 afirmaciones con sus justificaciones y los resultados que el sistema calcula a partir de ellas.',
  },
  {
    heading: 'Finalidad',
    body: 'Calcular el perfil de madurez IRL de tu iniciativa, generar el análisis, la recomendación de portafolio y la ruta de escalamiento, y orientar los servicios de INNLAB que mejor se ajusten a tu iniciativa.',
  },
  {
    heading: 'Tus derechos como titular',
    body: 'Puedes conocer, actualizar y rectificar tus datos, solicitar prueba de esta autorización, ser informado del uso que se les da, revocar la autorización y solicitar la supresión de tus datos, y presentar quejas ante la Superintendencia de Industria y Comercio. Para ejercerlos, comunícate con INNLAB por sus canales institucionales.',
  },
  {
    heading: 'Carácter voluntario',
    body: 'Aceptar es voluntario. Sin tu autorización no es posible registrar datos ni continuar con el diagnóstico.',
  },
  {
    heading: 'Registro de la aceptación',
    body: 'Al aceptar, el sistema registra la aceptación con la fecha y la hora exactas y la versión de este texto.',
  },
];

export const CONSENT_CHECKBOX_LABEL =
  'He leído y acepto el tratamiento de mis datos personales según este texto.';
