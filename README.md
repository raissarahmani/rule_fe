This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Copy `.env.example` to `.env` and configure the server-side Keycloak client and backend API.

```dotenv
OIDC_ISSUER=https://your-portal.example/auth/realms/remittance
OIDC_REDIRECT_URI=https://your-portal.example/rule/callback
OIDC_CLIENT_ID=rule
OIDC_CLIENT_SECRET=replace-with-the-Keycloak-client-secret
SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters
RULE_API_URL=http://your-treasury-backend:8080
RULE_API_PREFIX=/api/v1/
```

The backend root is `RULE_API_URL` plus `RULE_API_PREFIX`. The server appends paths
such as `/limits`, `/underly-docs`, `/margins`, and `/log` and attaches the user's
access token. Browser calls use `/rule/api/backend`, with HttpOnly encrypted session
cookies. `NEXT_PUBLIC_BASE_URL` is a server-side fallback for older deployments.

Server-side OIDC is required; `NEXT_PUBLIC_SSO_ENABLED` no longer controls login.
Configure the public HTTPS callback in Keycloak. Use an HTTPS reverse proxy for
interactive development and restart the server after changing environment settings.
See [Keycloak deployment](docs/keycloak.md) for exact routes and client settings.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

The development server listens on port 3000. Access it through your configured
HTTPS origin so the callback URL and Secure cookies match that origin.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses `next/font/local` with bundled Poppins fonts in
`src/app/fonts` (including their SIL Open Font License), so compilation does
not need to download fonts from Google.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Docker

Set the server-side OIDC and API settings in `.env`, then build
the production image and pass the environment file when starting it:

```bash
docker build -t rule-fe .
docker run --rm --env-file .env --network remit-shared -p 3002:3002 --name rule-fe rule-fe
```

The production container listens on port 3002; the development server still uses
port 3000. Use the public HTTPS `/rule/home` URL for authenticated access.

The image uses a multi-stage build and Next.js standalone output, includes
the public logo/watermark and static assets, and runs as a non-root user.
The server performs the Keycloak authorization-code flow with PKCE, state, nonce,
issuer/audience checks, and ID-token signature verification.

The backend and internal Keycloak URLs need to be reachable from the application
container. The public issuer, login, callback, and logout URLs must be reachable
from the browser. Join the Podman `remit-shared` network for `keycloak:8080` DNS.

All `.env*` files are excluded from the Docker build context and image. OIDC secrets
and backend settings are read on the server at runtime. `/rule/runtime-config`
returns only the same-origin proxy path. To change runtime settings, recreate the
container with the updated environment file and reload the browser page. Docker env
files should use plain `KEY=value` entries without surrounding quotes.

Missing OIDC settings fail closed at runtime without preventing image builds.
`/rule/health` checks required runtime configuration and is used by deployment
health checks. Sessions expire with the access token and then return through the
Keycloak SSO login flow; refresh-token rotation is not implemented.

The build needs internet access for npm dependencies and the Node base image.
Poppins fonts are bundled locally to avoid font-download failures in Docker.

Dependency installation uses `npm ci --legacy-peer-deps`, matching the Jenkins
pipeline's existing installation flags. `eslint-config-next` is aligned with
Next.js at version 16.4.0 and supports the project's ESLint 9 flat configuration.
