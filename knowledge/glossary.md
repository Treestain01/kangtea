# Glossary

- **Kang Tea (康緹)**: the bubble tea shop the product is for. Its logo is the navy monoline mark in `webapp/src/components/brand/`.
- **BBT**: the repo and workspace codename (bubble tea). Package names, the iOS target and the API service id use it; user facing copy says Kang Tea.
- **Shell**: the native `iosapp`. It contains no product UI of its own; it hosts the webapp in a WKWebView.
- **Webapp**: the React site in `webapp/`. Usable in any browser and inside the shell.
- **Contract**: the Zod schemas in `packages/shared` that define what `api` returns and what `webapp` expects.
- **User agent token**: the `BBTiOS/<version>` suffix the shell appends to the WKWebView user agent so the webapp can detect it.
- **WEBAPP_URL**: the build setting in `iosapp/Config/*.xcconfig` that tells the shell which site to load.
- **ADR**: Architecture Decision Record, stored in `knowledge/decisions/`.
- **Knowledge base**: a `knowledge/` folder with an `INDEX.md`. Exists at the root and in each project.
