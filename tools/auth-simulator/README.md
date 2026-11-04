# Sign-in simulator

Stands in for the INNLAB Hub, INNLAB Core and the Cognito keys when they are
not available (a demo, CI). Node built-ins only: nothing to install.

| What the system uses                | Real service | Simulator route                          |
| ----------------------------------- | ------------ | ---------------------------------------- |
| Sign-in page (`VITE_CORE_URL`)      | Hub          | `GET /auth/sso?redirect=`                |
| Code exchange (`VITE_CORE_API_URL`) | Core API     | `GET /api/auth/sso/exchange?code=`       |
| Session check                       | Core API     | `GET /api/auth/introspect`               |
| Logout                              | Core API     | `POST /api/auth/logout`                  |
| User context (`INNLAB_API_BASE_URL`)| Core API     | `GET /api/internal/users/:id/context`    |
| Token keys (`COGNITO_JWKS_URI`)     | Cognito      | `GET /.well-known/jwks.json`             |
| Token issuer (`COGNITO_ISSUER`)     | Cognito      | `AUTH_SIMULATOR_ISSUER`                  |

Test users: `users.json`. Settings (environment):

| Variable                          | Default                    | Meaning                                              |
| --------------------------------- | -------------------------- | ---------------------------------------------------- |
| `AUTH_SIMULATOR_CONFIRM`          | (none)                     | Must be `simulated-sign-in-only` or it does not start |
| `PORT`                            | `8090`                     | Listening port                                       |
| `AUTH_SIMULATOR_ISSUER`           | `http://localhost:<PORT>`  | `iss` of every token; the API's `COGNITO_ISSUER`     |
| `AUTH_SIMULATOR_INTERNAL_KEY`     | `simulated-internal-key`   | The API's `CORE_INTERNAL_KEY`                        |
| `AUTH_SIMULATOR_REDIRECT_ORIGINS` | `http://localhost:5173`    | Origins the sign-in code may be sent back to         |
| `AUTH_SIMULATOR_TOKEN_TTL`        | `3600`                     | Token lifetime, in seconds                           |
| `AUTH_SIMULATOR_USERS`            | `./users.json`             | Test users file                                      |

How to switch the system between the real and the simulated mode:
[`docs/workflows/LOCAL-SETUP.md`](../../docs/workflows/LOCAL-SETUP.md), step 5c.
Tests: `pnpm test:simulator`.
