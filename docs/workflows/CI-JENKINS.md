# CI and local deployment with Jenkins

The pipeline is the [`Jenkinsfile`](../../Jenkinsfile) at the root. Jenkins
itself runs in a container defined in [`infra/jenkins/`](../../infra/jenkins),
configured as code (an administrator and the pipeline job), so it starts
ready to build.

## Start Jenkins

From the repository root, with Docker running:

```bash
DOCKER_GID=$(stat -c %g /var/run/docker.sock) \
JENKINS_ADMIN_PASSWORD=<choose one> \
JENKINS_DEFAULT_BRANCH=$(git branch --show-current) \
  docker compose -f infra/jenkins/docker-compose.yml up -d --build
```

- Open <http://localhost:8088> and sign in as `admin` with that password.
- The job **sistema-diagnostico-irl** builds the branch given in its `BRANCH`
  parameter. «Build with Parameters» runs it.
- The job clones the repository mounted read-only at `/repo`. **It builds
  what is committed**, never uncommitted changes.
- The first image build takes several minutes: it installs Node, the Docker
  CLI and the three browsers (Chromium, Firefox and Microsoft Edge).

Stop it with `docker compose -f infra/jenkins/docker-compose.yml down`. Add
`-v` to also delete Jenkins' data.

## What the pipeline does

| Stage | What runs |
| --- | --- |
| Instalar | `pnpm install --frozen-lockfile` (the lockfile is never rewritten) |
| Typecheck y lint | `pnpm typecheck`, `pnpm lint` |
| Servicios de prueba | `infra/ci/docker-compose.yml`: Postgres, the test inbox and the sign-in simulator, on ports of their own; migration and seed |
| Pruebas de la API | Unit, integration (Testcontainers) and end-to-end, with coverage and its thresholds |
| Pruebas del frontend | Vitest with coverage; the simulator's contract |
| Pruebas en navegador | Playwright in Chromium, Firefox and Edge: the flow with the API faked, and the flows against the real stack |
| Compilar | `pnpm build` |
| Publicar en GitHub | Only when the built branch is `dev`. Merges that commit into GitHub `dev` and pushes it. Render and Vercel are deployed by the GitHub workflow, not by this stage |

### Evidence of each run

The evidence is archived with the build:

- `reports/`:
  - the JSON and JUnit reports of every level;
  - `matriz-aceptacion.md`, the acceptance matrix of that run, built by
    `scripts/test-reports.mjs`.
- `apps/api/coverage/` and `apps/web/coverage/`: the coverage, also
  published as HTML pages of the build.
- `apps/web/playwright-report/` and `apps/web/test-results/`: the browser
  tests' HTML reports, and the trace and screenshots of every test.

The «Test Result» page of each build shows the JUnit results.

## The local deployment

`infra/deploy/docker-compose.yml` (compose project `irl-deploy`) deploys the
whole system on the Docker host:

| Address | Service |
| --- | --- |
| <http://localhost:8080> | The application (nginx serves the SPA and forwards `/api` to the API) |
| <http://localhost:8091> | Simulated sign-in: pick one of the test users |
| <http://localhost:8026> | Test inbox: the report mail arrives here |

It uses the simulated sign-in of [LOCAL-SETUP.md](./LOCAL-SETUP.md#5c-simulated-sign-in--when-core-and-cognito-are-not-available).
The API container applies the migration and the seed when it starts. Without
Jenkins, deploy it by hand:

```bash
AUTH_SIMULATOR_CONFIRM=simulated-sign-in-only \
  docker compose -f infra/deploy/docker-compose.yml up -d --build
```

## How Jenkins runs the test containers, and its risks

Three kinds of test need containers:

- Testcontainers starts Postgres for the integration tests.
- The end-to-end tests need Postgres, the test inbox and the sign-in
  simulator.

**Decision: Jenkins uses the host's Docker through its socket**
(`/var/run/docker.sock` mounted in the container, the Jenkins user added to
the socket's group). The containers it starts are siblings of Jenkins on the
host. Jenkins reaches their published ports through `host.docker.internal`.
For Testcontainers that is `TESTCONTAINERS_HOST_OVERRIDE`.

Why this way:

- It is the simplest setup that works on a developer machine.
- The test containers run on the same Docker the developer sees, and Jenkins
  reaches them through `host.docker.internal`.
- Images and layers are cached between builds.

**Risks, and how they are contained:**

- **Access to the socket is root on the host.** Anyone who can change the
  pipeline, or a dependency that runs code during the tests, can start a
  privileged container and read or change the host.
  - Containment: Jenkins listens only on this machine, and only builds
    branches of this repository.
  - Containment: sign-up is disabled and anonymous users see nothing.
  - Containment: `.npmrc` sets `ignore-scripts=true`, so installing
    dependencies runs no install scripts.
  - Do not expose port 8088 outside the machine. Change the administrator
    password.
- **Builds share the host's Docker.** One build can see or stop another
  build's containers.
  - Containment: one executor, so builds never run at the same time.
  - Containment: fixed compose project names (`irl-ci`, `irl-deploy`).
  - Containment: ports that do not collide with the development stack.
- **Coverage HTML pages can run scripts.** Jenkins' content security policy
  is relaxed (`hudson.model.DirectoryBrowserSupport.CSP`) so the coverage
  HTML pages render. They are reports of this repository, but on a shared
  Jenkins this should be restored.
- **Local checkout from `file:///repo`.** It is enabled with
  `hudson.plugins.git.GitSCM.ALLOW_LOCAL_CHECKOUT`. The repository is mounted
  read-only.

**The alternative**, Docker-in-Docker (a `docker:dind` service), isolates
builds from the host's Docker:

- It runs privileged, which is no safer for the host.
- It is slower, because every build starts with an empty image cache.
- The deployment would live inside it, out of the developer's sight unless
  its ports are forwarded again.

On a server shared by several people, the right setup is a separate agent
(a virtual machine or a rootless Docker) instead of the controller with the
host's socket.
