// Pipeline of the IRL Diagnostic System (Jenkins in infra/jenkins).
//
// Install with the frozen lockfile, typecheck and lint, test every level
// with coverage, test in the browsers, build, and deploy locally with
// docker compose in the simulated sign-in mode. Every run keeps its
// evidence: test reports, coverage, browser traces and screenshots, and the
// acceptance matrix built from the results.
//
// The test services run in containers of their own (infra/ci) started
// through the host's Docker socket; see docs/workflows/CI-JENKINS.md.
pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 90, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    CI = 'true'
    PLAYWRIGHT_BROWSERS_PATH = '/ms-playwright'
    // The services of infra/ci, published on the host.
    DATABASE_URL = 'postgresql://irl_user:irl_dev_password@host.docker.internal:5434/irl_ci'
    TESTCONTAINERS_HOST_OVERRIDE = 'host.docker.internal'
    MAILPIT_SMTP_HOST = 'host.docker.internal'
    MAILPIT_SMTP_PORT = '1125'
    MAILPIT_API = 'http://host.docker.internal:8125'
    AUTH_SIMULATOR_CONFIRM = 'simulated-sign-in-only'
    // The API's configuration for its test suites: there is no .env in CI.
    // The e2e suites mint their own tokens and fake the JWKS, so the
    // Cognito values only need to be well formed.
    WEB_ORIGIN = 'http://localhost:4174'
    COGNITO_JWKS_URI = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ci/.well-known/jwks.json'
    COGNITO_ISSUER = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ci'
    INNLAB_API_BASE_URL = 'http://host.docker.internal:8190/api'
    CORE_INTERNAL_KEY = 'simulated-internal-key'
    REPORT_NOTIFY_TO = ''
    SMTP_HOST = ''
    E2E_BROWSERS = 'chromium,firefox,msedge'
  }

  stages {
    stage('Instalar') {
      steps {
        sh 'node --version && pnpm --version'
        sh 'pnpm install --frozen-lockfile'
        sh 'rm -rf reports && mkdir -p reports'
      }
    }

    stage('Typecheck y lint') {
      steps {
        sh 'pnpm typecheck'
        sh 'pnpm lint'
      }
    }

    stage('Servicios de prueba') {
      steps {
        sh 'docker compose -f infra/ci/docker-compose.yml up -d --build --wait'
        sh 'pnpm --filter @innlab/api db:migration:run'
        sh 'pnpm --filter @innlab/api db:seed'
      }
    }

    stage('Pruebas de la API') {
      steps {
        // Unit, integration (Testcontainers) and end-to-end, with coverage
        // and its thresholds.
        dir('apps/api') {
          sh 'pnpm contracts:build'
          sh 'node --experimental-vm-modules --no-warnings node_modules/jest/bin/jest.js --coverage --json --outputFile=../../reports/api.json'
        }
      }
      post {
        always {
          sh 'test -f reports/api.json && node scripts/test-reports.mjs junit reports/api.json reports/api-junit.xml api || true'
        }
      }
    }

    stage('Pruebas del frontend') {
      steps {
        dir('apps/web') {
          sh 'pnpm exec vitest run --coverage --reporter=default --reporter=json --outputFile.json=../../reports/web.json --reporter=junit --outputFile.junit=../../reports/web-junit.xml'
        }
        sh 'node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=junit --test-reporter-destination=reports/simulator-junit.xml tools/auth-simulator/server.test.mjs'
      }
    }

    stage('Pruebas en navegador') {
      steps {
        // The full-stack tests serve the API built from this commit.
        sh 'pnpm --filter @innlab/api build'
        dir('apps/web') {
          sh 'pnpm test:e2e'
          sh '''
            E2E_DATABASE_URL="$DATABASE_URL" \
            E2E_SIMULATOR_URL=http://host.docker.internal:8190 \
            E2E_SIMULATOR_ISSUER=http://host.docker.internal:8190 \
            E2E_SMTP_HOST=host.docker.internal E2E_SMTP_PORT=1125 \
            pnpm test:full-stack
          '''
        }
      }
      post {
        always {
          sh 'cp apps/web/test-results/mocked/results.json reports/browser-mocked.json || true'
          sh 'cp apps/web/test-results/full-stack/results.json reports/browser-full-stack.json || true'
        }
      }
    }

    stage('Compilar') {
      steps {
        sh 'pnpm build'
      }
    }

    stage('Desplegar en local (inicio de sesión simulado)') {
      steps {
        sh 'docker compose -f infra/deploy/docker-compose.yml up -d --build --wait'
        sh 'curl -fsS http://host.docker.internal:8080/api/v1/health/live'
        sh 'curl -fsS -o /dev/null http://host.docker.internal:8080/'
        echo 'Desplegado: aplicación en http://localhost:8080, inicio de sesión simulado en http://localhost:8091, buzón en http://localhost:8026'
      }
    }
  }

  post {
    always {
      // The acceptance matrix of this run, from whatever reports exist.
      sh "node scripts/test-reports.mjs matrix reports reports/matriz-aceptacion.md 'Jenkins, ejecución ${env.BUILD_NUMBER} de la rama ${params.BRANCH ?: env.GIT_BRANCH}' || true"
      junit allowEmptyResults: true,
        testResults: 'reports/*-junit.xml, apps/web/test-results/*/junit.xml'
      archiveArtifacts allowEmptyArchive: true, artifacts: [
        'reports/**',
        'apps/api/coverage/**',
        'apps/web/coverage/**',
        'apps/web/playwright-report/**',
        'apps/web/test-results/**',
      ].join(', ')
      publishHTML(target: [reportName: 'Cobertura API', reportDir: 'apps/api/coverage/lcov-report',
        reportFiles: 'index.html', allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true])
      publishHTML(target: [reportName: 'Cobertura frontend', reportDir: 'apps/web/coverage',
        reportFiles: 'index.html', allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true])
      publishHTML(target: [reportName: 'Navegador (stack real)', reportDir: 'apps/web/playwright-report/full-stack',
        reportFiles: 'index.html', allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true])
      publishHTML(target: [reportName: 'Navegador (API simulada)', reportDir: 'apps/web/playwright-report/mocked',
        reportFiles: 'index.html', allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true])
      sh 'docker compose -f infra/ci/docker-compose.yml down -v || true'
    }
  }
}
