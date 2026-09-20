# Fase 8a — Propuesta de diseño: explicabilidad y consistencia visual

Documento de opciones para la categoría 10 de `backlog-deuda-tecnica.md`. No contiene decisiones: cada sección presenta alternativas con su costo, y las decisiones se registran en la Fase 8b. No se modificó ningún componente de interfaz ni el backlog.

**Método.** Cada hallazgo se contrastó con el código vigente (no con el de `67c8140`, que es el que describe el backlog), y con `DESIGN.md` (raíz del proyecto), que ya fija la identidad visual. Donde una opción depende de una preferencia visual que el código no permite inferir, se formula como pregunta abierta (§6) y no como propuesta.

---

## 0. Estado de la categoría 10 hoy

| # | Estado verificado | Cambio respecto al backlog |
|---|---|---|
| 10.1 | **Vigente, parcial.** El roadmap ya explica el orden entre fases y lo que cada dimensión desbloquea (`enables`). Sigue sin explicar por qué una dimensión está en el plan ni por qué su nivel objetivo es ese. | `enables` y el texto de cabecera son posteriores al backlog. |
| 10.2 | **Vigente, con un matiz nuevo.** El aviso de recálculo automático ya no existe. Aparece un problema distinto: la promesa de guardado del cuestionario es más amplia que lo que ocurre (ver 10.2). | La regeneración en `409` se retiró en la Fase 7 (backlog 4.6). |
| 10.3 | **Vigente y agravado.** Además de las tres presentaciones distintas, el roadmap se recalcula en cada lectura: su `generatedAt` es la hora de la consulta, no la de un cálculo previo. | — |
| 10.4 | **Vigente, parcial.** `Card` ya lo usan el resumen del perfil, la recomendación y la lista del roadmap. Siguen ad hoc: la tarjeta de fase del roadmap, el panel de traza, el bloque de progreso y 7 alertas de error. | Mejora parcial de la Fase 5. |
| 10.5 | **Vigente.** Sin cambios en `QuestionnairePage.tsx`. | — |
| 10.6 | **Vigente.** Sin cambios. | — |
| 10.7 | **Resuelto** por la Fase 7 (backlog 4.6): la página ya no envía nada al entrar; hay un botón explícito. Queda un residuo de nomenclatura (ver 10.7). | Estado del backlog desactualizado. |

## 1. Hechos verificados que condicionan las opciones

1. **Qué es una instantánea y qué se recalcula.**
   - Perfil de madurez: persistido; `computedAt` es el momento del cálculo.
   - Recomendación: persistida; `generatedAt` es el momento del cálculo. La traza reutiliza ese mismo valor como `evaluatedAt`, por lo que la misma fecha aparece dos veces en la pantalla.
   - Roadmap: no se persiste. `GenerateScalingRoadmapUseCase` calcula en cada `GET` y asigna `generatedAt = new Date()`.
2. **No existe el concepto de audiencia en el código.**
   - El contrato de sesión del frontend (`CoreSession`) solo lleva `token` y `accessToken`.
   - El backend conoce `UserContext.companyRole`, pero ningún endpoint lo usa: no hay guard ni decorador de roles.
   - `GET /diagnostics/:id/recommendation/trace` responde a cualquier usuario autenticado. La etiqueta «Equipo INNLAB» del panel de traza es solo texto.
3. **Datos que el backend ya entrega y ninguna pantalla muestra:** `averageLikert` por dimensión (el radar lo recibe y no lo dibuja) y, dentro de la traza, todo el desglose por capa.
4. **El backend sabe por qué una dimensión está en el roadmap y por qué su meta es esa**, pero no lo expone. `RoadmapClosureService` decide la pertenencia (por debajo del mínimo esperado, o requerida como habilitadora de otra); `TargetLevelCalculatorService` fija `meta = max(mínimo esperado, mayor exigencia de sus sucesoras en el plan)`. El contrato solo lleva `currentLevel`, `targetLevel` y `enables`.
5. **La identidad visual ya está establecida** en `DESIGN.md` (manual Icesi, Febrero 2026): Azul Icesi, Plus Jakarta Sans, descriptor INNLAB, paleta funcional, escala de espaciado de 4 puntos, «bordes antes que sombras». Nada de lo que sigue propone marca, paleta o estilo nuevo; lo que sí aparece son divergencias entre `DESIGN.md` y el código (§6, preguntas 1 a 3).
6. **Palabras en inglés dentro de texto en español**, visibles para el usuario (ver §4, N1).

---

## 2. Hallazgos de la categoría 10

### 10.1 El roadmap no explica por qué

**El problema.** Quien abre el roadmap ve «Nivel 3 → Nivel 6» en una dimensión y no sabe por qué esa dimensión está en el plan ni por qué la meta es 6 y no 5; la pantalla de recomendación, en cambio, sí ofrece un «Cómo se llegó a esta recomendación».

**Opciones.**

- **A. Frase de justificación por dimensión.** El backend expone en cada dimensión del roadmap el motivo de su inclusión (`BELOW_EXPECTED_MINIMUM` o `REQUIRED_ENABLER`) y la base de su meta (mínimo esperado, o exigencia de una dimensión concreta). La tarjeta muestra una línea, p. ej. «Meta 6: lo exige Negocio para poder avanzar».
  - Ventaja: la explicación está donde se lee la duda; visible para todos sin acción.
  - Costo: cambio de contrato y de mapper; aumenta la densidad de cada tarjeta; un texto por caso que hay que redactar y mantener.
- **B. Panel colapsable «Cómo se construyó este roadmap».** Mismo dato que A, pero agrupado al pie en un panel plegado, con el mismo patrón que `LayerTracePanel`.
  - Ventaja: paridad de transparencia con la recomendación; las tarjetas quedan limpias; admite más detalle (grafo, reglas) para quien lo quiera.
  - Costo: la explicación queda a un clic, y quien no lo abre no la ve; más superficie de interfaz; conviene extraer un patrón compartido de «panel de explicación» para no duplicar el de la traza.
- **C. Texto estático de reglas en la cabecera, sin cambio de contrato.** Se explican las reglas generales («una dimensión entra si está por debajo del mínimo esperado o si otra la necesita…»).
  - Ventaja: sin backend, inmediato.
  - Costo: no explica el caso concreto del usuario y reintroduce en el frontend una descripción de reglas de negocio que vive en el backend (el patrón que la Fase 7 retiró en la categoría 4); puede desalinearse si el grafo cambia.

**Audiencia.** El líder necesita la frase (A) o un resumen corto; quien audita necesita el grafo de dependencias y las reglas (B). Un mismo diseño con detalle expandible cubre ambos (A visible + B expandible no son excluyentes); no hay contenido que solo deba ver una audiencia, porque el roadmap no expone datos internos de calibración.

### 10.2 El usuario no sabe si lo que ve es definitivo ni si su trabajo está guardado

**El problema.** Solo el cuestionario dice «Guardado automático»; en las otras tres pantallas no hay ninguna señal de si el resultado es una foto fija o algo que se recalcula. Además, la promesa del cuestionario es más amplia que la realidad: el borrador vive en `sessionStorage` (muere al cerrar la pestaña) y no llega al servidor hasta pulsar «Procesar diagnóstico», mientras la portada dice «Conserva tu progreso entre sesiones».

**Opciones.**

- **A. Estado explícito en cada pantalla, con vocabulario único.** Una línea por pantalla que diga qué es lo que se ve («Resultado guardado el …» en perfil y recomendación; «Se recalcula cada vez que abres esta pantalla» en roadmap) y, en el cuestionario, un texto exacto («Se conserva mientras no cierres esta pestaña»). Se acopla naturalmente con 10.3.
  - Ventaja: honesto sin tocar el modelo de datos.
  - Costo: el mensaje del roadmap («se recalcula») es una explicación de una limitación técnica; hay que decidir el tono.
- **B. Solo alinear la promesa del cuestionario con la realidad.** Corregir el chip y el texto de la portada; las pantallas de resultado no añaden indicadores.
  - Ventaja: mínimo esfuerzo; corrige el único texto que hoy es inexacto.
  - Costo: las pantallas de resultado siguen sin decir qué son; depende de que la fecha (10.3) baste como señal.
- **C. Cambiar el comportamiento, no el texto.** Persistir el borrador del cuestionario en el servidor y guardar el roadmap como instantánea (tabla nueva, editando el script único de migración).
  - Ventaja: las cuatro pantallas pasan a tener la misma semántica y la promesa de la portada se vuelve cierta.
  - Costo: es trabajo de backend y de modelo de datos (endpoints de borrador, tabla, decisión de cuándo se invalida un roadmap guardado), fuera del alcance de una fase de interfaz; introduce la pregunta de qué pasa con un roadmap guardado si cambia el perfil.

**Audiencia.** Ambas necesitan lo mismo en el cuestionario. Para quien audita importa la inmutabilidad de la recomendación (ya es una instantánea persistida); el líder, sobre todo, saber que no perdió sus respuestas. Un mismo diseño sirve.

### 10.3 El «cuándo se calculó» aparece distinto en cada pantalla

**El problema.** La fecha del perfil está en letra pequeña al pie, la de la recomendación dentro de la tarjeta y repetida en el panel de traza, y el roadmap no tiene ninguna; el usuario no sabe dónde buscar ni si falta.

**Opciones.**

- **A. Componente compartido de metadato de cálculo, en ubicación fija.** Un único componente bajo el título de cada pantalla de resultado, con etiqueta y fecha con el mismo formato.
  - Ventaja: patrón único, fácil de encontrar y de probar; se extrae a `shared/ui`.
  - Costo: en el roadmap la fecha sería la de la consulta (hecho 1), así que solo es honesta si se resuelve 10.2-A o 10.2-C; obliga a decidir qué se hace con la fecha duplicada de la traza.
- **B. Integrar la fecha en la narrativa de cada pantalla.** P. ej. «Tu perfil, calculado el 19 de septiembre, muestra…»; la fecha deja de ser un elemento aislado.
  - Ventaja: se lee de corrido; no añade elementos a la interfaz.
  - Costo: no hay lugar fijo donde buscarla; más copy por pantalla y más probabilidad de que vuelva a divergir; más difícil de compartir y de probar.
- **C. La fecha solo en la vista de auditoría.** El líder ve el resultado sin fecha; la traza conserva «Evaluado el…» y se añade una equivalente al panel de explicación del roadmap (10.1-B).
  - Ventaja: pantalla del líder más limpia; el metadato queda donde tiene uso (auditar).
  - Costo: se pierde la señal de «esto puede estar desactualizado» para quien no abre el panel; contradice la intención de 10.2-A.

**Audiencia.** La fecha le sirve al líder para saber si su resultado es reciente y a quien audita para atribuir una decisión; A y B lo dan a ambos, C solo al segundo.

### 10.4 Tres estilos de «cuadro con borde»

**El problema.** Pantallas contiguas del mismo flujo usan esquinas, márgenes y colores de borde ligeramente distintos, y las alertas de error se ven distintas según la pantalla.

**Estado.** 7 alertas con `border-critical/30 bg-critical-bg` (2 con `Card`, 5 con `div`), tarjeta de fase, panel de traza y bloque de progreso con su propio borde. Los estilos por tono del perfil (`TONE_STYLES`) referencian variables `--color-critical`, `--color-moderate`, `--color-acceptable` que no existen en ningún CSS (hay 25 usos de `var(--color-…, #hex)` en total): en la práctica siempre se aplica el valor de respaldo.

**Opciones.**

- **A. `Card` como único contenedor, con variantes de tono.** `Card` gana una prop (`neutral`, `critical`, `moderate`, `acceptable`) y absorbe `TONE_STYLES` y las alertas.
  - Ventaja: un solo primitivo, un solo lugar donde cambiar radio, borde y padding.
  - Costo: `Card` deja de ser un contenedor neutro; una alerta y una tarjeta de contenido comparten semántica aunque no la tengan (rol `alert` frente a `group`).
- **B. Dos primitivos: `Card` (contenido) y `Alert` (mensaje de estado con icono y rol).** Coincide con `DESIGN.md`, que trata el indicador de desequilibrio como un componente aparte de la tarjeta.
  - Ventaja: separa contenido de estado; el rol ARIA y el icono viajan con el componente.
  - Costo: un primitivo más que mantener y migrar 7 alertas más el resumen del perfil.
- **C. Sin componentes nuevos: solo una regla escrita.** Fijar en `DESIGN.md` qué radio, borde y padding usa cada tipo de caja, y ajustar las pantallas a mano.
  - Ventaja: no crea abstracciones.
  - Costo: la duplicación queda; nada impide que vuelva a divergir.

**Audiencia.** No aplica: es consistencia visual, igual para ambas.

### 10.5 La advertencia de «faltan respuestas» desaparece antes de tiempo

**El problema.** Tras intentar enviar con dimensiones incompletas, el usuario responde una sola pregunta y el aviso desaparece aunque sigan faltando otras; parece que el sistema olvidó el problema.

**Estado.** Vigente (`QuestionnairePage.tsx:44-46`: el aviso depende de que `answers` sea la misma referencia que en el intento). El texto inferior «Faltan respuestas en N dimensión(es)» sí es permanente, pero no dice cuáles.

**Opciones.**

- **A. Mantener el aviso mientras siga incompleto.** Tras el primer intento, la lista de dimensiones pendientes permanece y se va acortando conforme se completan; desaparece solo al completar todo.
  - Ventaja: el cambio más pequeño; elimina la comparación por referencia y el estado auxiliar.
  - Costo: un bloque de alerta persistente puede resultar insistente para quien avanza dimensión por dimensión.
- **B. Marcas persistentes en las pestañas de dimensiones incompletas después del intento.** El aviso es momentáneo; lo que queda es la señal sobre cada pestaña pendiente.
  - Ventaja: orienta hacia dónde ir sin ocupar espacio en la página.
  - Costo: más interfaz en un componente ya cargado (las pestañas ya muestran X/8); el color no puede ser la única señal.
- **C. Llevar al usuario a la primera dimensión incompleta al enviar, y mantener el aviso (A).**
  - Ventaja: recorta el camino al problema.
  - Costo: navegación automática que puede desorientar; toca el estado de pestaña activa del store.

**Audiencia.** Solo el líder; no hay variante para quien audita.

### 10.6 Identificadores de diagnóstico de relleno en la interfaz

**El problema.** «Iniciar diagnóstico» lleva a un diagnóstico ya creado y compartido (el del seed), y otros enlaces apuntan a `demo`, que ni siquiera es un identificador válido: el usuario nunca inicia un diagnóstico propio.

**Estado.** `HomePage.tsx:84` (UUID del seed, el mismo de los fixtures de prueba), `InProgressPage.tsx:71` y `NotFoundPage.tsx:30` (`demo`). Crear un diagnóstico es HU-04, cuyo endpoint no existe (backlog 11.4).

**Opciones.**

- **A. Construir el flujo real de creación (HU-04).** `POST /diagnostics` y un CTA que crea y navega.
  - Ventaja: resuelve la causa; el CTA hace lo que dice.
  - Costo: es una historia de usuario, no un ajuste de diseño; se puede ejecutar en su propia fase.
- **B. Retirar los CTA con identificador de relleno mientras no exista HU-04.** La portada apunta a la ruta `/diagnosticos/nuevo` (hoy un stub) o muestra el CTA deshabilitado con explicación; los enlaces «Abrir el cuestionario» de 404 y de la pantalla en construcción desaparecen.
  - Ventaja: la interfaz no promete lo que no existe.
  - Costo: el cuestionario deja de tener una entrada desde la interfaz, lo que afecta a quien lo prueba a mano; retirar enlaces exige confirmar que ninguno se usa como entrada de demostración.
- **C. Mantener un identificador de demostración, pero configurable y solo en desarrollo.** Una variable de entorno de compilación; en producción los CTA no se renderizan.
  - Ventaja: conserva el flujo de pruebas y de demostración.
  - Costo: sigue existiendo un placeholder; requiere definir qué ve el usuario en producción (pregunta 7).

**Audiencia.** No aplica.

### 10.7 Una acción de negocio se dispara al entrar a la pantalla — resuelto; queda un residuo

**El problema original.** Llegar a la URL disparaba silenciosamente la generación. **Resuelto** en la Fase 7: la página muestra «Aceptar análisis profundo» y no envía nada por sí sola.

**Residuo.** La acción tiene dos nombres: en el perfil el botón dice «Generar recomendación» (solo navega) y al llegar el botón dice «Aceptar análisis profundo» (ejecuta). Para el usuario son dos botones distintos del mismo paso.

**Opciones (menores).**

- **A. Un solo nombre en ambos sitios.** Se elige el vocabulario de una de las dos etiquetas y se usa en las dos.
  - Costo: si el botón del perfil pasa a llamarse «Aceptar análisis profundo» pero solo navega, promete una acción que no ejecuta.
- **B. Diferenciar navegar de ejecutar.** El del perfil pasa a ser un enlace de navegación («Ver recomendación de portafolio»); el botón de acción vive solo en la pantalla destino.
  - Costo: exige decidir la etiqueta de navegación; el botón primario del perfil pierde su carácter de «siguiente paso».

---

## 3. Audiencias: líder de iniciativa y futuro personal de INNLAB

Hoy ninguna pantalla distingue audiencia, y el código no tiene cómo hacerlo (hecho 2). Modelos posibles, aplicables por pantalla:

- **M1. Un mismo diseño con detalle expandible.** Todos ven la misma pantalla; el detalle para auditoría queda plegado. Es lo que hace hoy `LayerTracePanel`.
- **M2. Modo por audiencia en la misma ruta.** El contenido cambia según el rol. Exige llevar el rol a la sesión del frontend y proteger en el backend los endpoints de detalle.
- **M3. Superficie separada para el personal.** Rutas y vistas propias (p. ej. las del módulo `reporting/`, backlog 11.1); las pantallas del líder permanecen simples.

| Pantalla | Contenido que solo interesa al personal | Qué cubre M1 | Qué añadirían M2 / M3 |
|---|---|---|---|
| Cuestionario | Ninguno | Suficiente | Innecesario |
| Perfil de madurez | Promedios Likert por dimensión (ya en la respuesta, no mostrados), lista completa de pares incluidos los aceptables | Suficiente: un bloque plegado «Detalle del cálculo» | M2/M3 solo si el detalle no debe ser visible al líder (pregunta 4) |
| Recomendación | Traza completa, ajustes puntuales y su justificación declarada | Es lo que existe; **el endpoint no está restringido**, así que «Equipo INNLAB» no impide que el líder lo abra | M2 cierra ese acceso; M3 lo mueve fuera de la pantalla del líder |
| Roadmap | Grafo de dependencias, motivo de inclusión y de meta (10.1) | Suficiente: nada de esto es información interna de calibración | Innecesario, salvo que se decida lo contrario (pregunta 4) |

**Lectura.** Con los datos actuales, M1 cubre perfil y roadmap. La recomendación es la única pantalla con contenido de auditoría que hoy podría querer restringirse, y esa decisión depende de una pregunta de producto (§6, pregunta 4) que el código no permite inferir.

---

## 4. Hallazgos adicionales de la verificación

No están en el backlog. Se listan para que la Fase 8b decida si se incorporan.

- **N1. Palabras en inglés dentro de texto en español visible al usuario.** `RecommendationPage.tsx:63-64` («los services de INNLAB», «al state actual»), `RecommendationPage.tsx:99` («configuración de enrutamiento active»), `LayerTracePanel.tsx:63` («la trace»), `:93` («Ningún service»), `:130` («el order es el del cálculo»), `:224` («cubre gaps»), `:232` («imbalances»), y «encaja con la stage de la iniciativa». Es un defecto de copy, sin decisión de diseño de fondo: corregir o no.
- **N2. Texto que quedó desactualizado.** `MaturityProfilePanel.tsx:25` dice «Los puntos en rojo señalan dimensiones con prioridad de atención (nivel ≤ 3)», pero el color por nivel se retiró (backlog 4.1/4.2) y el radar ya no dibuja puntos rojos.
- **N3. La pantalla de perfil no usa `PageShell` cuando hay resultado.** Sin cabecera institucional ni descriptor INNLAB, con un contenedor propio (`max-w-6xl`, que no es ninguno de los anchos definidos: `3xl`, `5xl`, `7xl`), mientras que sus estados de carga y de error sí lo usan. `DESIGN.md` asigna el ancho estándar (`5xl`) al perfil.
- **N4. Cuatro tratamientos de carga.** Spinner con texto (perfil), texto «Cargando…» plano (recomendación, roadmap), esqueleto con brillo (cuestionario), texto dentro del panel (traza).

---

## 5. Sistema de diseño mínimo

**Punto de partida.** Existen `Button`, `Card`, `Tabs`, `RadioGroup`, `Dialog` y `PageShell`; hay tokens de color, radio, sombra y tipografía en `globals.css` y `tailwind.config.ts`, y la escala de espaciado de `DESIGN.md` es la de Tailwind. Es decir, los tokens de espaciado y de borde ya existen; lo que falta son **reglas de uso** y los **componentes de estado**: mensaje de error/alerta, estado de carga y estado vacío. Hay 7 alertas y 4 tratamientos de carga escritos a mano. Hay también valores sueltos (`text-[2.25rem]` en 4 títulos, `text-[10px]`) que `DESIGN.md` prohíbe («nunca valores de píxel sueltos»).

**Opciones.**

- **1. Sistema mínimo primero, luego pantallas.** Antes de tocar pantallas: reconciliar tokens entre `DESIGN.md`, `globals.css` y `tailwind.config.ts`; crear `Alert`, `LoadingState` y `EmptyState`; fijar la escala de títulos y los anchos de contenedor; y después migrar pantalla por pantalla al sistema.
  - Ventaja: cada pantalla se toca una sola vez; la consistencia queda garantizada por construcción.
  - Costo: se paga antes de ver resultado en pantalla; riesgo de diseñar componentes para casos que no llegan a existir; la reconciliación de tokens está bloqueada por las preguntas 1 a 3.
- **2. Pantalla por pantalla, extrayendo el sistema de lo que emerja.** Resolver cada hallazgo de §2 en su pantalla y extraer un componente compartido en cuanto aparece en una segunda.
  - Ventaja: los componentes nacen de necesidades reales; entrega visible desde la primera pantalla.
  - Costo: el orden de las pantallas condiciona el diseño de los componentes; hay que volver a pantallas ya migradas cuando el componente extraído difiera; la divergencia actual puede consolidarse en lugar de corregirse.
- **3. Reconciliar solo los tokens, y luego pantalla por pantalla.** Se hace primero únicamente lo que no admite duda (una sola fuente de verdad para colores, radios y anchos, y eliminar las 25 referencias a variables inexistentes); los componentes de estado se extraen de lo que emerja, como en la opción 2.
  - Ventaja: elimina la fuente de inconsistencias que afecta a todas las pantallas sin adelantar diseño de componentes.
  - Costo: es un paso previo que no produce ningún cambio visible por sí solo, y sigue bloqueado por las preguntas 1 a 3.

**Dependencia común.** Las tres opciones tocan color en algún momento. Sin respuesta a las preguntas 1 a 3, ninguna puede ejecutarse por completo.

---

## 6. Preguntas abiertas

Requieren una preferencia de producto o de marca que el código no permite inferir. No se propone respuesta.

1. **Color de la acción primaria.** `DESIGN.md` define `accent` como `#A24317` (naranja oscurecido, para cumplir AA con texto blanco). El código (`--accent` en `globals.css`) usa `#E9683B`, el naranja Icesi sin oscurecer; el propio comentario de `globals.css` calcula 3,74:1 de contraste, `DESIGN.md` calcula 3,23:1 para ese mismo color, y ambos por debajo del 4,5:1 que `DESIGN.md` exige a texto de cuerpo. ¿Cuál es la referencia?
2. **Colores de dimensión.** `DESIGN.md` fija tonos oscurecidos (CRL `#5832B0`, BRL `#1F633D`, TmRL `#8C3811`, FRL `#5C4A1A`). `tailwind.config.ts` define los brillantes (`#865CF0`, `#4CB979`, `#E9683B`, `#E4EB60`) más una variante `-ink` oscura. El radar toma el valor de `DESIGN.md` (por el respaldo de `getDimensionVisual`) y los puntos de las tarjetas del roadmap toman el brillante: una misma dimensión tiene dos colores en dos pantallas. ¿Cuál es el valor canónico y para qué usos (relleno, texto, radar)?
3. **Radio y elevación de la tarjeta.** `DESIGN.md` se contradice: la tabla de componentes da `rounded.lg` (12 px) a `card` y la sección «Shapes» da `rounded.md` (8 px); y dice que `elevation.sm` es el valor por defecto de la tarjeta, mientras el código no usa sombra. ¿Cuál vale?
4. **Audiencia.** ¿Quién es el «personal de INNLAB» y cómo se identifica (un rol en Core, la pertenencia a una empresa concreta, otra)? ¿Puede el líder de iniciativa ver la traza de la recomendación, incluidos los motivos declarados de los ajustes puntuales? ¿El personal usará esta misma aplicación o una superficie propia (`reporting/`)?
5. **Alcance del roadmap como instantánea.** ¿Debe el roadmap conservarse como resultado fijo con fecha (implica 10.2-C) o seguir siendo un cálculo vivo? Determina si 10.3-A es aplicable al roadmap.
6. **Tono del texto de estado** (10.2-A): ¿se prefiere lenguaje de producto («Resultado guardado») o explícito sobre el cálculo («Se recalcula al abrir»)?
7. **Qué debe ver el usuario en producción en «Iniciar diagnóstico»** mientras no exista HU-04 (10.6).

---

## 7. Resumen de decisiones pendientes para la Fase 8b

| Hallazgo | Opciones | Depende de |
|---|---|---|
| 10.1 | A / B / C (A y B combinables) | — |
| 10.2 | A / B / C | Pregunta 5, 6 |
| 10.3 | A / B / C | 10.2, Pregunta 5 |
| 10.4 | A / B / C | Preguntas 1 a 3 |
| 10.5 | A / B / C | — |
| 10.6 | A / B / C | Pregunta 7; HU-04 |
| 10.7 | A / B (residuo) | — |
| Audiencias | M1 / M2 / M3 por pantalla | Pregunta 4 |
| Sistema de diseño | 1 / 2 / 3 | Preguntas 1 a 3 |
| N1 a N4 | Incorporar o no a la Fase 8b | — |

---

## 8. Decisiones tomadas (Fase 8b)

Registro de lo decidido sobre las opciones de este documento. La implementación y su verificación están en `backlog-deuda-tecnica.md` (10.1 a 10.11).

| Hallazgo | Decisión |
|---|---|
| 10.1 | A y B combinadas: frase por dimensión y panel plegable. |
| 10.2 | Texto de estado «Resultado guardado» en perfil, recomendación y roadmap; el roadmap se conserva como resultado fijo con fecha (pregunta 5); se corrige la promesa del cuestionario. El borrador sigue en `sessionStorage`. |
| 10.3 | A: componente compartido bajo el título. |
| 10.4 | B: `Card` y `Alert`. |
| 10.5 | A: el aviso se mantiene mientras siga incompleto. |
| 10.6 | A: crear un diagnóstico propio (HU-04). Por decisión de producto se saltan el consentimiento y la iniciativa (backlog 14.17). **Revertida el 2026-09-20:** el consentimiento y la iniciativa vuelven a ser parte obligatoria del recorrido (sección 10). |
| 10.7 | B: navegar y ejecutar se separan. |
| Audiencias | Sin personal de INNLAB por ahora: fuera de alcance; rige el modelo M1. La etiqueta «Equipo INNLAB» del panel de traza se conserva. |
| Sistema de diseño | Opción 1: base primero (paleta única, `Alert`, `LoadingState`, `PageHeader`, `ResultMeta`, `DisclosurePanel`) y luego pantallas. |
| N1 a N4 | Incorporados (backlog 10.8 a 10.11). |

**Respuestas a las preguntas abiertas.** (1) La acción primaria es `#E9683B`. (2) Los colores de dimensión son los de `tailwind.config.ts`; el texto y las etiquetas SVG usan la variante `-ink`. (3) Por el código, `Card` es `rounded-md`, con borde fino y sin sombra. (4) No existe personal de INNLAB todavía. (5) Resultado fijo. (6) «Resultado guardado». (7) El formulario de 48 afirmaciones. `DESIGN.md` se actualizó para coincidir con las decisiones 1 a 3.

---

## 9. Fase 8c — decisiones y ejecución

Continuación de las decisiones de la sección 8; el detalle por oleada está en `backlog-deuda-tecnica.md`, sección 15.

**Decisiones de producto tomadas en esta fase**

| Tema | Decisión |
|---|---|
| Justificación de cada respuesta | Obligatoria (hasta 1000 caracteres). |
| Origen de los datos del panel de iniciativa | El registro de la iniciativa (HU-06) es un paso del flujo, entre iniciar el diagnóstico y el cuestionario. Se revierte solo la parte de iniciativa del salto de 14.17; el consentimiento sigue saltado. |
| Modelo de la iniciativa | Columnas propias para tipo de producto, etapa declarada (junto a la etapa del catálogo), descripción del equipo, mercado objetivo y financiamiento actual; el sector del caso se siembra en el catálogo. |

**Sobre lo decidido antes (sección 8)**

- **Audiencia (M1):** se mantiene. La página de resultados es una sola vista con detalle plegable (`DisclosurePanel`); no hay modo por audiencia.
- **Roadmap fijo, «Resultado guardado»:** se mantiene y se extiende: el perfil, el roadmap y la recomendación llevan cada uno su fecha bajo su título, en la misma página.
- **10.7:** se cierra del todo: ya no hay «Generar recomendación» en ninguna variante, porque perfil, recomendación y roadmap son una página y el botón de aceptar vive en ella.
- **Sistema de diseño:** se añadieron `Tooltip`, `GlossaryTerm`, `SectionHeader`, `Field` (con `Input`, `Textarea` y `Select`) y `AppNav`; ninguno introduce color, tamaño de fuente, radio ni sombra que no estén ya en `DESIGN.md` o `tailwind.config.ts` (el tooltip usa `popover`, `border` y la sombra `md`; los campos, el «Form input» de `DESIGN.md`).

---

## 10. Rediseño del flujo de diagnóstico (2026-09-20) — reversión de la decisión 10.6

**Reversión.** La decisión 10.6 (sección 8) dejaba que «Iniciar diagnóstico» creara el diagnóstico **saltando el consentimiento y la iniciativa** (backlog 14.17). Queda **revertida**: ambos pasos son parte obligatoria del recorrido. La parte de la iniciativa ya se había revertido en la Fase 8c (sección 9); esta tarea revierte también el salto del consentimiento.

**Motivo.** Mejora de la experiencia de usuario: un flujo guiado y en orden (portada, inicio de sesión si hace falta, asistente de pasos, resumen, resultados) en lugar de pantallas sueltas a las que se llega por navegación libre. Además, el salto del consentimiento trataba datos sin la aceptación que exigen la Ley 1581 de 2012, RF-03 y RNF-06.

**Decisiones de producto tomadas en esta tarea**

| Tema | Decisión |
|---|---|
| Orden del asistente frente a RF-03 y a la máquina de estados | Se conserva el orden pedido en pantalla (iniciativa, consentimiento, cuestionario), pero la iniciativa **no se guarda hasta que se acepta el consentimiento**: el paso 1 mantiene el formulario como borrador en el navegador y, al aceptar en el paso 2, se registra primero el consentimiento y luego la iniciativa. La máquina de estados no cambia (`STARTED → WITH_CONSENT → WITH_INITIATIVE`). |
| Texto del consentimiento | Texto provisional de la versión `v1`, redactado a partir de la Ley 1581 sin datos institucionales inventados; queda pendiente de revisión legal (backlog, sección 16). |
| Destino del descriptor institucional | Lleva al panel solo en las pantallas con navegación (resultados y panel); en la portada y en el asistente sigue llevando a la portada. |
| Reanudar un diagnóstico | `POST /diagnostics` es idempotente por usuario mientras haya un diagnóstico sin terminar: devuelve ese en lugar de crear otro. |
| Navegación | Solo existe en las pantallas posteriores al asistente (resultados y panel). No hay una regla de visibilidad aparte para «resultados sin cuestionario respondido»: sin cuestionario procesado no se llega a esas pantallas. |

La ejecución y su verificación están en `backlog-deuda-tecnica.md`, sección 16.

