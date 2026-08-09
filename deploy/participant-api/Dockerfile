FROM denoland/deno:alpine

WORKDIR /app

COPY edge ./edge
COPY shared ./shared
COPY deploy/participant-api/server.ts ./deploy/participant-api/server.ts

RUN deno cache deploy/participant-api/server.ts

EXPOSE 8080

CMD ["run", "--allow-net", "--allow-env", "deploy/participant-api/server.ts"]
