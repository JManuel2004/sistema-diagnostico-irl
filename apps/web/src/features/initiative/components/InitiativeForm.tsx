import { Suspense, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import { Controller, useForm, useWatch, type Control, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CUSTOM_SECTOR_MAX,
  INITIATIVE_TEXT_MAX,
  type InitiativeStage,
  type SectorOption,
} from '@innlab/contracts';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, Input, Textarea } from '@/shared/ui/field';
import { notify } from '@/shared/ui/notify';
import { InitiativeAutofill } from '@/dev/dev-autofill';
import {
  EMPTY_INITIATIVE_FORM,
  initiativeFormSchemaFor,
  type InitiativeFormValues,
  type InitiativeProfileFields,
} from '../lib/form-values';
import { SectorCombobox } from './SectorCombobox';
import { StageSelect } from './StageSelect';

type Values = InitiativeFormValues;

type FormControl = Control<Values, unknown, InitiativeProfileFields>;

export interface InitiativeFormProps {
  readonly sectors: readonly SectorOption[];
  readonly stages: readonly InitiativeStage[];
  /** Values of an already registered initiative, to edit it. */
  readonly initial?: Values;
  readonly onSubmit: (command: InitiativeProfileFields) => void;
  readonly isSubmitting: boolean;
  readonly submitLabel?: string;
  /**
   * A secondary action shown at the other end of the submit row (the
   * wizard's «Atrás»), so the form's footer reads like every other step's.
   */
  readonly secondaryAction?: ReactNode;
  /** Called with the current field values, so leaving the step keeps the draft. */
  readonly onDraftChange?: (values: Values) => void;
}

/**
 * Form of the initiative profile (HU-06 / RF-04).
 *
 * Every field is mandatory. It is a `react-hook-form` form validated by
 * `initiativeFormSchemaFor`, which is the contract's `registerInitiativeSchema`
 * — the same one the backend applies — so the message shown is the
 * contract's. The fields hold text and `teamSize` becomes a number on
 * validation; `onSubmit` receives the profile fields ready to send.
 *
 * The nine fields are grouped in three blocks (the initiative, the team,
 * market and funding). The sector is searched in a combobox
 * (`SectorCombobox`) over the 22 sections of the DANE's CIIU Rev. 5 A.C.;
 * with «Otro sector (especificar)» a text field asks for the user's own
 * sector, and leaving «Otro» empties and hides it, so no stale text is sent.
 * The stage is a list whose options say what each stage means
 * (`StageSelect`). Each label is the question the field answers, so the
 * answer is precise (client validation of RF-04): the team is asked as how
 * many people (digits only, with an example) and what role each one plays.
 * Every free text says what to write and gives an example in its grey
 * placeholder; under it, only how many characters it has of the maximum.
 * Submitting with errors announces it in a toast and moves the focus to the
 * first field to correct.
 */
export function InitiativeForm({
  sectors,
  stages,
  initial,
  onSubmit,
  isSubmitting,
  submitLabel = 'Guardar y continuar',
  onDraftChange,
  secondaryAction,
}: InitiativeFormProps): JSX.Element {
  const otherSectorIds = useMemo(
    () => new Set(sectors.filter((s) => s.isOther).map((s) => s.id)),
    [sectors],
  );
  const schema = useMemo(() => initiativeFormSchemaFor(otherSectorIds), [otherSectorIds]);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    subscribe,
    formState: { errors },
  } = useForm<Values, unknown, InitiativeProfileFields>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? EMPTY_INITIATIVE_FORM,
  });
  const sectorId = useWatch({ control, name: 'sectorId' });
  const isOtherSector = otherSectorIds.has(sectorId);
  const onDraftChangeRef = useRef(onDraftChange);
  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  });

  useEffect(() => {
    if (!onDraftChange) return;
    return subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        onDraftChangeRef.current?.(values);
      },
    });
  }, [onDraftChange, subscribe]);

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit, () => {
          notify.error('No pudimos continuar: revisa los campos marcados.');
        })(event);
      }}
      noValidate
      className="flex flex-col gap-10"
    >
      {InitiativeAutofill && (
        <Suspense fallback={null}>
          <div>
            <InitiativeAutofill
              sectors={sectors}
              stages={stages}
              onFill={(filled) => {
                reset(filled);
              }}
            />
          </div>
        </Suspense>
      )}

      <FormSection
        id="initiative-group-profile"
        title="La iniciativa"
        description="Qué es y en qué punto está. Contextualiza tu perfil de madurez."
      >
        <TextField
          control={control}
          name="name"
          label="Nombre de la iniciativa"
          placeholder="El nombre con el que se conoce. Por ejemplo: AgroConecta"
          error={errors.name?.message}
          maxLength={120}
        />

        <div className="flex flex-col gap-3">
          <Field
            label="¿A qué sector económico pertenece tu iniciativa?"
            hint="Selecciona el sector económico que mejor represente la actividad principal de tu iniciativa. Las letras de la A a la V no son un orden alfabético: son las secciones de la clasificación de actividades económicas (CIIU) del DANE."
            error={errors.sectorId?.message}
          >
            {(c) => (
              <Controller<Values, 'sectorId', InitiativeProfileFields>
                control={control}
                name="sectorId"
                render={({ field }) => (
                  <SectorCombobox
                    {...c}
                    ref={field.ref}
                    sectors={sectors}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(id) => {
                      field.onChange(id);
                      // Leaving «Otro» drops the text typed for it.
                      if (!otherSectorIds.has(id)) {
                        setValue('customSector', '');
                        clearErrors('customSector');
                      }
                    }}
                  />
                )}
              />
            )}
          </Field>
          <SectorGuide />
        </div>

        {isOtherSector && (
          <TextField
            control={control}
            name="customSector"
            label="¿A qué sector pertenece tu iniciativa?"
            placeholder="Describe brevemente el sector económico. Por ejemplo: biotecnología aplicada a la agricultura o economía circular."
            error={errors.customSector?.message}
            maxLength={CUSTOM_SECTOR_MAX}
            multiline
          />
        )}

        <Field
          label="¿En qué etapa está tu iniciativa?"
          hint="Elige la etapa que mejor describe a tu iniciativa hoy."
          error={errors.stageId?.message}
          className="sm:max-w-md"
        >
          {(c) => (
            <Controller<Values, 'stageId', InitiativeProfileFields>
              control={control}
              name="stageId"
              render={({ field }) => (
                <StageSelect
                  {...c}
                  ref={field.ref}
                  stages={stages}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          )}
        </Field>

        <TextField
          control={control}
          name="productType"
          label="¿En qué consiste tu iniciativa? ¿Es un producto o un servicio?"
          placeholder="Describe qué ofrece y a quién. Por ejemplo: una aplicación web que ayuda a pequeños productores a registrar la trazabilidad de sus cosechas."
          error={errors.productType?.message}
          multiline
        />
        <TextField
          control={control}
          name="declaredStage"
          label="Cuéntanos con tus palabras en qué punto está"
          placeholder="Si es una idea, qué tan desarrollada está; si ya está en desarrollo, qué has construido o probado. Por ejemplo: tenemos un prototipo funcional que probamos con 10 productores durante un mes."
          error={errors.declaredStage?.message}
          multiline
        />
      </FormSection>

      <FormSection
        id="initiative-group-team"
        title="El equipo"
        description="Cuántas personas la impulsan hoy y qué rol cumple cada una."
      >
        <TextField
          control={control}
          name="teamSize"
          label="Número de personas del equipo"
          hint="Solo números."
          placeholder="Ej. 4"
          error={errors.teamSize?.message}
          digitsOnly
          className="sm:max-w-sm"
        />
        <TextField
          control={control}
          name="teamDescription"
          label="¿Qué hace cada persona del equipo?"
          placeholder="Indica el rol de cada persona. Por ejemplo: una fundadora a cargo del negocio, un desarrollador y una agrónoma que asesora el producto."
          error={errors.teamDescription?.message}
          multiline
        />
      </FormSection>

      <FormSection
        id="initiative-group-market"
        title="Mercado y financiamiento"
        description="A quién se dirige y con qué recursos cuenta hoy."
      >
        <TextField
          control={control}
          name="targetMarket"
          label="¿Cuál es el mercado objetivo de tu iniciativa?"
          placeholder="A quién le vendes o a quién atiendes, y dónde están. Por ejemplo: pequeños productores de café del Valle del Cauca y las cooperativas que les compran."
          error={errors.targetMarket?.message}
          multiline
        />
        <TextField
          control={control}
          name="currentFunding"
          label="¿Cómo se financia hoy tu iniciativa?"
          placeholder="Si todavía no tiene financiación, cuéntalo también. Por ejemplo: recursos propios de los fundadores y una convocatoria de innovación ganada este año."
          error={errors.currentFunding?.message}
          multiline
        />
      </FormSection>

      {Object.keys(errors).length > 0 && (
        <Alert tone="critical" title="Revisa los campos marcados antes de continuar." />
      )}

      <div className="border-border flex flex-col-reverse gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
        {secondaryAction}
        <Button
          type="submit"
          size="lg"
          className="w-full sm:ml-auto sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

interface FieldBaseProps {
  readonly control: FormControl;
  readonly name: FieldPath<Values>;
  readonly label: string;
  readonly error?: string;
  readonly className?: string;
}

/**
 * A text field bound to the form. Controlled on purpose: `Textarea` grows
 * with its value, so it has to receive it, also when the form is reset.
 * Under a text field, the only line is how many characters it has of its
 * maximum; what to write goes in the placeholder.
 */
function TextField({
  control,
  name,
  label,
  error,
  className,
  placeholder,
  multiline = false,
  digitsOnly = false,
  hint,
  maxLength = INITIATIVE_TEXT_MAX,
}: FieldBaseProps & {
  /** An example answer, in grey while the field is empty. */
  readonly placeholder?: string;
  readonly multiline?: boolean;
  /** Digits only: letters are dropped as they are typed, and there is no character count. */
  readonly digitsOnly?: boolean;
  /** Replaces the character count when the field is not free text. */
  readonly hint?: string;
  readonly maxLength?: number;
}): JSX.Element {
  const value = useWatch<Values, FieldPath<Values>, InitiativeProfileFields>({ control, name });
  const counter = digitsOnly
    ? undefined
    : `${String(value.length)} de ${String(maxLength)} caracteres`;
  return (
    <Field label={label} hint={hint ?? counter} error={error} className={className}>
      {(c) => (
        <Controller<Values, FieldPath<Values>, InitiativeProfileFields>
          control={control}
          name={name}
          render={({ field }) =>
            multiline ? (
              <Textarea
                {...c}
                {...field}
                rows={2}
                maxLength={maxLength}
                placeholder={placeholder}
              />
            ) : digitsOnly ? (
              <Input
                {...c}
                {...field}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                placeholder={placeholder}
                onChange={(event) => {
                  field.onChange(event.target.value.replace(/\D/g, ''));
                }}
              />
            ) : (
              <Input {...c} {...field} maxLength={maxLength} placeholder={placeholder} />
            )
          }
        />
      )}
    </Field>
  );
}

/**
 * How to choose the sector when the initiative uses technology: by its main
 * economic activity, not by the technology it uses nor by the industry it
 * serves. A link under the field opens it in a modal, so it is there for
 * whoever doubts and does not push the form down for whoever does not.
 *
 * Built on the native `<dialog>` opened with `showModal()`: the browser makes
 * the rest of the page inert, keeps the focus inside and closes it with
 * Escape.
 */
function SectorGuide(): JSX.Element {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="text-azul-icesi self-start text-sm font-semibold underline-offset-4 hover:underline"
      >
        ¿Tu iniciativa usa tecnología? Así eliges el sector
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="sector-guide-title"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        className="bg-card text-foreground m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl border-0 p-0 shadow-xl backdrop:bg-black/45"
      >
        <div className="flex flex-col gap-4 p-6 text-sm leading-relaxed sm:p-8">
          <h2 id="sector-guide-title" className="text-foreground text-xl font-bold">
            Cómo elegir el sector si tu iniciativa usa tecnología
          </h2>
          <p className="text-muted-foreground">
            Elige el sector por la{' '}
            <span className="text-foreground font-semibold">actividad principal</span> de tu
            iniciativa, no por la tecnología que usa ni por la industria a la que atiende.
            Desarrollar y vender software es la sección K; usarlo como herramienta, no.
          </p>
          <ul className="text-muted-foreground flex list-disc flex-col gap-1.5 pl-5">
            <li>
              Software para cultivos: si lo desarrollas y lo vendes, K; si produces alimentos y lo
              usas, A.
            </li>
            <li>
              Plataforma de educación virtual: si prestas el servicio educativo, Q; si vendes el
              software educativo, K.
            </li>
            <li>
              Historias clínicas digitales: si prestas atención médica, R; si vendes la solución
              informática, K.
            </li>
            <li>
              Tienda virtual: si vendes productos, G; si construyes la infraestructura para que
              otros vendan, K.
            </li>
          </ul>
          <Button
            type="button"
            className="self-end"
            onClick={() => {
              setOpen(false);
            }}
          >
            Entendido
          </Button>
        </div>
      </dialog>
    </>
  );
}

/**
 * A block of the form with its title. On desktop the title and its
 * description sit in a column to the left of the fields; on mobile, above.
 * It groups the ten fields so they do not read as a single list.
 */
function FormSection({
  id,
  title,
  description,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <section
      aria-labelledby={id}
      className="border-border grid gap-5 border-t pt-8 first:border-t-0 first:pt-0 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id={id} className="text-foreground text-lg font-bold sm:text-[1.1875rem]">
          {title}
        </h2>
        <p className="text-muted-foreground hidden text-sm leading-relaxed md:block">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}
