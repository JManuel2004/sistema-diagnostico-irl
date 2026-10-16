# The SPA for the local deployment: built with the addresses it is given,
# then served by nginx, which also forwards /api to the API (same origin).
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN pnpm install --frozen-lockfile --filter @innlab/web...
COPY packages/contracts packages/contracts
COPY apps/web apps/web
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_CORE_URL
ARG VITE_CORE_API_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_CORE_URL=$VITE_CORE_URL \
    VITE_CORE_API_URL=$VITE_CORE_API_URL
RUN pnpm --filter @innlab/web exec vite build

FROM nginx:alpine
COPY infra/deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
