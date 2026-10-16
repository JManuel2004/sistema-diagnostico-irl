# Jenkins for this repository: the controller runs the pipeline itself
# (one executor), with what the Jenkinsfile needs installed in the image.
FROM jenkins/jenkins:2.516.3-lts-jdk21

USER root

# Node (the version of .nvmrc's major) with corepack, so pnpm comes from
# the repository's `packageManager`.
ARG NODE_VERSION=24.19.0
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg xz-utils \
 && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    | tar -xJ -C /usr/local --strip-components=1 \
 && corepack enable \
 && rm -rf /var/lib/apt/lists/*

# Docker CLI and the compose plugin: the pipeline starts the test services,
# Testcontainers starts Postgres, and the deploy stage runs docker compose,
# all against the host's Docker through the mounted socket.
RUN install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" \
    > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
 && rm -rf /var/lib/apt/lists/*

# The browsers of the end-to-end tests, with their system libraries, at the
# version of @playwright/test in the lockfile. Microsoft Edge is installed
# from Microsoft's package (it needs root, which is why it is done here).
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx -y playwright@1.63.0 install --with-deps chromium firefox msedge \
 && chmod -R a+rX /ms-playwright \
 && rm -rf /var/lib/apt/lists/* /root/.npm

# The repository is mounted from the host and cloned from there.
RUN git config --system --add safe.directory '*'

USER jenkins

RUN jenkins-plugin-cli --plugins \
    workflow-aggregator \
    pipeline-stage-view \
    git \
    junit \
    htmlpublisher \
    timestamper \
    configuration-as-code \
    job-dsl

COPY --chown=jenkins:jenkins casc.yaml /usr/share/jenkins/ref/casc.yaml
ENV CASC_JENKINS_CONFIG=/usr/share/jenkins/ref/casc.yaml
