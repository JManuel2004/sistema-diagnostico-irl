import { Suspense, useEffect, useRef, type JSX, type ReactNode } from 'react';
import { Controller, useForm, type Control, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { INITIATIVE_TEXT_MAX, type InitiativeStage, type Sector } from '@innlab/contracts';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, Input, Select, Textarea } from '@/shared/ui/field';
import { InitiativeAutofill } from '@/dev/dev-autofill';
import {
  EMPTY_INITIATIVE_FORM,
  initiativeFormSchema,
  type InitiativeFormValues,
  type InitiativeProfileFields,
} from '../lib/form-values';

type Values = InitiativeFormValues;

type FormControl = Control<Values, unknown, InitiativeProfileFields>;

export interface InitiativeFormProps {
  readonly sectors: readonly Sector[];
  readonly stages: readonly InitiativeStage[];
  /** Values of an already registered initiative, to edit it. */
  readonly initial?: Values;
  readonly onSubmit: (command: InitiativeProfileFields) => void;
  readonly isSubmitting: boolean;
  readonly submitLabel?: string;
  /** Called with the current field values, so leaving the step keeps the draft. */
  readonly onDraftChange?: (values: Values) => void;
}

/**
 * Form of the initiative profile (HU-06 / RF-04).
 *
 * Every field is mandatory. It is a `react-hook-form` form validated by
 * `initiativeFormSchema`, which is the contract's `registerInitiativeSchema`
 * — the same one the backend applies — so the message shown is the
 * contract's. The fields hold text and `teamSize` becomes a number on
 * validation; `onSubmit` receives the profile fields ready to send.
 *
 * The nine fields are grouped in three blocks (the initiative, the team,
 * market and funding); sector and stage are native `<select>`s.
 */
export function InitiativeForm({
  sectors,
  stages,
  initial,
  onSubmit,
  isSubmitting,
  submitLabel = 'Guardar y continuar',
  onDraftChange,
}: InitiativeFormProps): JSX.Element {
  const {
    control,
    handleSubmit,
    reset,
    subscribe,
    formState: { errors },
  } = useForm<Values, unknown, InitiativeProfileFields>({
    resolver: zodResolver(initiativeFormSchema),
    defaultValues: initial ?? EMPTY_INITIATIVE_FORM,
  });
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

        <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
          <SelectField
            control={control}
            name="sectorId"
            label="Sector"
            error={errors.sectorId?.message}
            placeholder="Selecciona un sector"
            options={sectors}
          />
          <SelectField
            control={control}
            name="stageId"
            label="Etapa"
            hint="La etapa del catálogo de INNLAB más cercana a la tuya."
            error={errors.stageId?.message}
            placeholder="Selecciona una etapa"
            options={stages}
          />
        </div>

        <TextField
          control={control}
          name="productType"
          label="Tipo de producto o servicio"
          hint={limit}
          error={errors.productType?.message}
          multiline
        />
        <TextField
          control={control}
          name="declaredStage"
          label="Etapa declarada"
          hint={`Cuéntala con tus palabras. ${limit}`}
          error={errors.declaredStage?.message}
          multiline
        />
      </FormSection>

      <FormSection
        id="initiative-group-team"
        title="El equipo"
        description="Quiénes la impulsan hoy y con qué dedicación."
      >
        <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
          <TextField
            control={control}
            name="teamSize"
            label="Personas en el equipo"
            error={errors.teamSize?.message}
            type="number"
          />
          <TextField
            control={control}
            name="teamDescription"
            label="Equipo"
            hint={`Quiénes son y qué dedicación tienen. ${limit}`}
            error={errors.teamDescription?.message}
            multiline
          />
        </div>
      </FormSection>

      <FormSection
        id="initiative-group-market"
        title="Mercado y financiamiento"
        description="A quién se dirige y con qué recursos cuenta."
      >
        <TextField
          control={control}
          name="targetMarket"
          label="Mercado objetivo"
          hint={limit}
          error={errors.targetMarket?.message}
          multiline
        />
        <TextField
          control={control}
          name="currentFunding"
          label="Financiamiento actual"
          hint={limit}
          error={errors.currentFunding?.message}
          multiline
        />
      </FormSection>

      {Object.keys(errors).length > 0 && (
        <Alert tone="critical" title="Revisa los campos marcados antes de continuar." />
      )}

      <div className="border-border border-t pt-8">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
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
  multiline = false,
  type,
  maxLength = INITIATIVE_TEXT_MAX,
}: FieldBaseProps & {
  readonly multiline?: boolean;
  readonly type?: 'number';
  readonly maxLength?: number;
}): JSX.Element {
  return (
    <Field label={label} hint={hint} error={error}>
      {(c) => (
        <Controller<Values, FieldPath<Values>, InitiativeProfileFields>
          control={control}
          name={name}
          render={({ field }) =>
            multiline ? (
              <Textarea {...c} {...field} rows={2} maxLength={maxLength} />
            ) : type === 'number' ? (
              <Input {...c} {...field} type="number" min={1} inputMode="numeric" />
            ) : (
              <Input {...c} {...field} maxLength={maxLength} />
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
  placeholder,
  options,
}: FieldBaseProps & {
  readonly placeholder: string;
  readonly options: readonly { readonly id: string; readonly name: string }[];
}): JSX.Element {
  return (
    <Field label={label} hint={hint} error={error}>
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
