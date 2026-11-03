import { Suspense, useEffect, useMemo, useRef, type JSX, type ReactNode } from 'react';
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
import { Field, Input, Select, Textarea } from '@/shared/ui/field';
import { InitiativeAutofill } from '@/dev/dev-autofill';
import {
  EMPTY_INITIATIVE_FORM,
  initiativeFormSchemaFor,
  type InitiativeFormValues,
  type InitiativeProfileFields,
} from '../lib/form-values';
import { SectorCombobox } from './SectorCombobox';

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
 * The stage is a native `<select>`. Each label
 * is the question the field answers, so the answer is precise (client
 * validation of RF-04): the team is asked as how many people and what role
 * each one plays, and the free texts carry an example as a grey
 * placeholder.
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

  const limit = `Máximo ${String(INITIATIVE_TEXT_MAX)} caracteres`;

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
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
          error={errors.name?.message}
          maxLength={120}
        />

        <div className="flex flex-col gap-3">
          <Field
            label="¿A qué sector económico pertenece tu iniciativa?"
            hint="Selecciona el sector económico que mejor represente la actividad principal de tu iniciativa."
            error={errors.sectorId?.message}
          >
            {(c) => (
              <Controller<Values, 'sectorId', InitiativeProfileFields>
                control={control}
                name="sectorId"
                render={({ field }) => (
                  <SectorCombobox
                    {...c}
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
            hint={`Por ejemplo: biotecnología aplicada a la agricultura, industria aeroespacial o economía circular. Máximo ${String(CUSTOM_SECTOR_MAX)} caracteres`}
            placeholder="Describe brevemente el sector económico…"
            error={errors.customSector?.message}
            maxLength={CUSTOM_SECTOR_MAX}
          />
        )}

        <SelectField
          control={control}
          name="stageId"
          label="¿En qué etapa está tu iniciativa?"
          hint="Idea: todavía es un concepto. Validación: la estás probando con usuarios o clientes. Crecimiento: ya opera y busca escalar."
          error={errors.stageId?.message}
          placeholder="Selecciona una etapa"
          options={stages}
          className="sm:max-w-md"
        />

        <TextField
          control={control}
          name="productType"
          label="¿En qué consiste tu iniciativa? ¿Es un producto o un servicio?"
          hint={limit}
          placeholder="Describe qué ofrece y a quién. Por ejemplo: una aplicación web que ayuda a pequeños productores a registrar la trazabilidad de sus cosechas."
          error={errors.productType?.message}
          multiline
        />
        <TextField
          control={control}
          name="declaredStage"
          label="Cuéntanos con tus palabras en qué punto está"
          hint={`Si es una idea, qué tan desarrollada está. Si ya está en desarrollo, qué has construido o probado. ${limit}`}
          placeholder="Por ejemplo: tenemos un prototipo funcional que probamos con 10 productores durante un mes."
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
          label="¿Cuántas personas conforman el equipo?"
          error={errors.teamSize?.message}
          type="number"
          className="sm:max-w-sm"
        />
        <TextField
          control={control}
          name="teamDescription"
          label="¿Qué hace cada persona del equipo?"
          hint={`Indica el rol de cada una. ${limit}`}
          placeholder="Por ejemplo: una fundadora a cargo del negocio, un desarrollador y una agrónoma que asesora el producto."
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
          hint={`A quién le vendes o a quién atiendes, y dónde están. ${limit}`}
          placeholder="Por ejemplo: pequeños productores de café del Valle del Cauca y las cooperativas que les compran."
          error={errors.targetMarket?.message}
          multiline
        />
        <TextField
          control={control}
          name="currentFunding"
          label="¿Cómo se financia hoy tu iniciativa?"
          hint={`Si todavía no tiene financiación, cuéntalo también. ${limit}`}
          placeholder="Por ejemplo: recursos propios de los fundadores y una convocatoria de innovación ganada este año."
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
  readonly hint?: string;
  readonly error?: string;
  readonly className?: string;
}

/**
 * A text field bound to the form. Controlled on purpose: `Textarea` grows
 * with its value, so it has to receive it, also when the form is reset.
 */
function TextField({
  control,
  name,
  label,
  hint,
  error,
  className,
  placeholder,
  multiline = false,
  type,
  maxLength = INITIATIVE_TEXT_MAX,
}: FieldBaseProps & {
  /** An example answer, in grey while the field is empty. */
  readonly placeholder?: string;
  readonly multiline?: boolean;
  readonly type?: 'number';
  readonly maxLength?: number;
}): JSX.Element {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
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
            ) : type === 'number' ? (
              <Input {...c} {...field} type="number" min={1} inputMode="numeric" />
            ) : (
              <Input {...c} {...field} maxLength={maxLength} placeholder={placeholder} />
            )
          }
        />
      )}
    </Field>
  );
}

function SelectField({
  control,
  name,
  label,
  hint,
  error,
  className,
  placeholder,
  options,
}: FieldBaseProps & {
  readonly placeholder: string;
  readonly options: readonly { readonly id: string; readonly name: string }[];
}): JSX.Element {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(c) => (
        <Controller<Values, FieldPath<Values>, InitiativeProfileFields>
          control={control}
          name={name}
          render={({ field }) => (
            <Select {...c} {...field}>
              <option value="">{placeholder}</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          )}
        />
      )}
    </Field>
  );
}

/**
 * How to choose the sector when the initiative uses technology: by its main
 * economic activity, not by the technology it uses nor by the industry it
 * serves. Folded, so it is there for whoever doubts and costs nothing to
 * whoever does not.
 */
function SectorGuide(): JSX.Element {
  return (
    <details className="border-border bg-surface-muted rounded-control border px-4 py-3 text-sm leading-relaxed">
      <summary className="text-azul-icesi cursor-pointer font-semibold">
        ¿Tu iniciativa usa tecnología? Así eliges el sector
      </summary>
      <div className="text-muted-foreground mt-3 flex flex-col gap-2">
        <p>
          Elige el sector por la{' '}
          <span className="text-foreground font-semibold">actividad principal</span> de tu
          iniciativa, no por la tecnología que usa ni por la industria a la que atiende. Desarrollar
          y vender software es la sección K; usarlo como herramienta, no.
        </p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
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
            Tienda virtual: si vendes productos, G; si construyes la infraestructura para que otros
            vendan, K.
          </li>
        </ul>
      </div>
    </details>
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
