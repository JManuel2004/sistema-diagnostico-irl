# 0003 — Use cases return `Result<T, E>` for anticipable business outcomes

**Status:** accepted

## Context

Most failures of a use case are ordinary answers ("not found", "not in the right state", "the rule does not allow it"), not exceptional conditions. Throwing them made every caller depend on a `try/catch` and on the global exception filter to decide the HTTP status.

## Decision

- Use cases return `Result<T, DomainError>` (`shared/kernel/domain/result.ts`) when the failure is a legitimate business outcome.
- Invariant violations inside entities and value objects still throw a `DomainError`; infrastructure failures and bugs still throw.
- Controllers unwrap with `unwrapResult()`, which rethrows the `DomainError` so `DomainExceptionFilter` answers the same RFC 7807 document as before (status by error class or by stable `code`).

## Consequences

- A use case documents in its docblock when it is not converted and why (for example, `ComputeMaturityProfileUseCase`, whose failures are defects).
- The HTTP answer does not change with this pattern; only where the decision is made.
