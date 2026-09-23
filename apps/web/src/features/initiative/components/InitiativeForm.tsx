import { Suspense, useState, type FormEvent, type JSX, type ReactNode } from 'react';
import {
  INITIATIVE_TEXT_MAX,
  registerInitiativeSchema,
  type InitiativeStage,
  type RegisterInitiativeCommand,
  type Sector,
} from '@innlab/contracts';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, Input, Select, Textarea } from '@/shared/ui/field';
import { InitiativeAutofill, type InitiativeAutofillValues } from '@/dev/dev-autofill';

/**
 * Form of the initiative profile (HU-06 / RF-04).
 *
 * Every field is mandatory. The validation is the contract's
 * (`registerInitiativeSchema`), the same one the backend applies: the
 * message shown is the contract's, not one of the form's own.
 *
 * The fields are kept as text and `teamSize` is turned into a number on
 * validation. They are grouped in three blocks (the initiative, the team,
 * market and funding); sector and stage are still native `<select>`s.
 */
type Values = InitiativeAutofillValues;
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = {
  name: '',
  sectorId: '',
  productType: '',
  stageId: '',
  declaredStage: '',
  teamSize: '',
  teamDescription: '',
  targetMarket: '',
  currentFunding: '',
};

interface Props {
  readonly sectors: readonly Sector[];
  readonly stages: readonly InitiativeStage[];
  /** Values of an already registered initiative, to edit it. */
  readonly initial?: Values;
  readonly onSubmit: (command: RegisterInitiativeCommand) => void;
  readonly isSubmitting: boolean;
  readonly submitError?: string;
  readonly submitLabel?: string;
}

function toCommand(values: Values): unknown {
  return {
    ...values,
    teamSize: values.teamSize.trim() === '' ? undefined : Number(values.teamSize),
  };
}

export function InitiativeForm({
  sectors,
  stages,
  initial,
  onSubmit,
  isSubmitting,
  submitError,
  submitLabel = 'Guardar y continuar',
}: Props): JSX.Element {
  const [values, setValues] = useState<Values>(initial ?? EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  function set<K extends keyof Values>(key: K, value: Values[K]): void {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const parsed = registerInitiativeSchema.safeParse(toCommand(values));
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Values;
        next[key] ??=
          key === 'teamSize' && values.teamSize.trim() === ''
            ? 'El tamaño del equipo es obligatorio'
            : issue.message;
      }
      // Empty selections do not carry the contract's message («String must contain…»).
      if (values.sectorId === '') next.sectorId = 'Elige un sector';
      if (values.stageId === '') next.stageId = 'Elige una etapa';
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  const limit = `Máximo ${String(INITIATIVE_TEXT_MAX)} caracteres`;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10">
      {InitiativeAutofill && (
        <Suspense fallback={null}>
          <div>
            <InitiativeAutofill
              sectors={sectors}
              stages={stages}
              onFill={(filled) => {
                setValues(filled);
                setErrors({});
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
        <Field label="Nombre de la iniciativa" error={errors.name}>
          {(c) => (
            <Input
              {...c}
              name="name"
              value={values.name}
              maxLength={120}
              onChange={(e) => {
                set('name', e.target.value);
              }}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
          <Field label="Sector" error={errors.sectorId}>
            {(c) => (
              <Select
                {...c}
                name="sectorId"
                value={values.sectorId}
                onChange={(e) => {
                  set('sectorId', e.target.value);
                }}
              >
                <option value="">Selecciona un sector</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="Etapa"
            hint="La etapa del catálogo de INNLAB más cercana a la tuya."
            error={errors.stageId}
          >
            {(c) => (
              <Select
                {...c}
                name="stageId"
                value={values.stageId}
                onChange={(e) => {
                  set('stageId', e.target.value);
                }}
              >
                <option value="">Selecciona una etapa</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Tipo de producto o servicio" hint={limit} error={errors.productType}>
          {(c) => (
            <Textarea
              {...c}
              name="productType"
              rows={2}
              maxLength={INITIATIVE_TEXT_MAX}
              value={values.productType}
              onChange={(e) => {
                set('productType', e.target.value);
              }}
            />
          )}
        </Field>

        <Field
          label="Etapa declarada"
          hint={`Cuéntala con tus palabras. ${limit}`}
          error={errors.declaredStage}
        >
          {(c) => (
            <Textarea
              {...c}
              name="declaredStage"
              rows={2}
              maxLength={INITIATIVE_TEXT_MAX}
              value={values.declaredStage}
              onChange={(e) => {
                set('declaredStage', e.target.value);
              }}
            />
          )}
        </Field>
      </FormSection>

      <FormSection
        id="initiative-group-team"
        title="El equipo"
        description="Quiénes la impulsan hoy y con qué dedicación."
      >
        <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
          <Field label="Personas en el equipo" error={errors.teamSize}>
            {(c) => (
              <Input
                {...c}
                name="teamSize"
                type="number"
                min={1}
                inputMode="numeric"
                value={values.teamSize}
                onChange={(e) => {
                  set('teamSize', e.target.value);
                }}
              />
            )}
          </Field>
          <Field
            label="Equipo"
            hint={`Quiénes son y qué dedicación tienen. ${limit}`}
            error={errors.teamDescription}
          >
            {(c) => (
              <Textarea
                {...c}
                name="teamDescription"
                rows={2}
                maxLength={INITIATIVE_TEXT_MAX}
                value={values.teamDescription}
                onChange={(e) => {
                  set('teamDescription', e.target.value);
                }}
              />
            )}
          </Field>
        </div>
      </FormSection>

      <FormSection
        id="initiative-group-market"
        title="Mercado y financiamiento"
        description="A quién se dirige y con qué recursos cuenta."
      >
        <Field label="Mercado objetivo" hint={limit} error={errors.targetMarket}>
          {(c) => (
            <Textarea
              {...c}
              name="targetMarket"
              rows={2}
              maxLength={INITIATIVE_TEXT_MAX}
              value={values.targetMarket}
              onChange={(e) => {
                set('targetMarket', e.target.value);
              }}
            />
          )}
        </Field>

        <Field label="Financiamiento actual" hint={limit} error={errors.currentFunding}>
          {(c) => (
            <Textarea
              {...c}
              name="currentFunding"
              rows={2}
              maxLength={INITIATIVE_TEXT_MAX}
              value={values.currentFunding}
              onChange={(e) => {
                set('currentFunding', e.target.value);
              }}
            />
          )}
        </Field>
      </FormSection>

      {Object.keys(errors).length > 0 && (
        <Alert tone="critical" title="Revisa los campos marcados antes de continuar." />
      )}
      {submitError && <Alert tone="critical" title={submitError} />}

      <div className="border-border border-t pt-8">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/**
 * A block of the form with its title. On desktop the title and its
 * description sit in a column to the left of the fields; on mobile, above.
 * It groups the nine fields so they do not read as a single list.
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
