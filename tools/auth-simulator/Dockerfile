# Sign-in simulator: Node built-ins only, nothing to install.
FROM node:24-alpine
WORKDIR /app
COPY server.mjs users.json ./
USER node
EXPOSE 8090
HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8090/health || exit 1
CMD ["node", "server.mjs"]
