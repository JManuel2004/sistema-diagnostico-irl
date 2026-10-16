# The API for the local deployment (infra/deploy/docker-compose.yml).
# Built from the repository root. It keeps the workspace's development
# dependencies: on start it applies the migration and the catalog seed with
# the same commands a developer uses, then serves the compiled API.
FROM node:24-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/
RUN pnpm install --frozen-lockfile --filter @innlab/api...
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @innlab/api build
WORKDIR /app/apps/api
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=10 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health/live || exit 1
CMD ["sh", "-c", "pnpm db:migration:run && pnpm db:seed && node dist/main.js"]
