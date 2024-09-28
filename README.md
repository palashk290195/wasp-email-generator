# <YOUR_APP_NAME>

This project is based on [OpenSaas](https://opensaas.sh) template and consists of three main dirs:
1. `app` - Your web app, built with [Wasp](https://wasp-lang.dev).
2. `e2e-tests` - [Playwright](https://playwright.dev/) tests for your Wasp web app.
3. `blog` - Your blog / docs, built with [Astro](https://docs.astro.build) based on [Starlight](https://starlight.astro.build/) template.

For more details, check READMEs of each respective directory!
1. curl -sSL https://get.wasp-lang.dev/installer.sh | sh
2. wasp version
3. cd app
4. wasp start db
5. wasp db migrate-dev
6. cp .env.server.example .env.server
7. wasp start
