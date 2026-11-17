# Portfolio

React + Vite portfolio for zaorski.co.uk. The entry page currently displays
"Website under construction" and preserves the previous landing page design.

## Local development

Use Node.js 22.12+ (Docker uses Node.js 24).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. React components live in `src/`.

## Production

```sh
npm run build
npm start
```

Vite builds into `dist/`. `server.js` serves that directory on port 3000
(`PORT` overrides it) and retains the `/health` JSON endpoint. Missing files
return 404; there is no catch-all React routing yet.

## Deploy with Docker

On the server, from `/var/www/zaorski.co.uk/html`, after pulling the changes:

```sh
docker compose up -d --build
docker compose ps
docker compose logs --tail=100
```

The multi-stage Docker build installs dependencies and builds the frontend.
The runtime image contains the Node server, production dependencies, and built
files, and runs as an unprivileged user. The existing Compose service
`landingpage` still listens on `127.0.0.1:3000`, so the current Nginx proxy and
HTTPS configuration require no changes. Vite's development/preview server is
not used in production.

## Separate games

Static files in `public/` are copied into `dist/` during the build. A standalone
game can go in `public/games/<game>/`, with its `index.html` and assets, and will
be served at `/games/<game>/`. For a separately built Vite game, set its base
to `/games/<game>/` and copy the contents of its build output there before
building the portfolio. Keep original game source outside `public/`.

Each folder is served independently; missing game files do not fall back to
the portfolio homepage. No games are included yet.
