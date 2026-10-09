# c3nsor: instructions for Claude Code

c3nsor is a Chrome extension and website that reads a site's privacy policy and shows five plain-English findings with citations. Rules-based, not AI. The team playbook is https://michael-peterson.com/c3nsor-playbook/.

## Architecture

- `extension/`: Chrome Manifest V3 extension, plain JavaScript ES modules. The analyzer lives in `extension/lib/` and is the source of truth.
- `docs/`: static website on GitHub Pages (https://michael-peterson.com/IS-581/). `docs/try/engine/` is generated from `extension/lib/` by `npm --prefix extension run build:web`; never edit it by hand.
- `proxy/`: Cloudflare Worker that fetches policies for the Try it page. Keep its URL validation, private-address blocking, redirect checks, 1.5 MB cap, and 12 s timeout.
- No frameworks, no TypeScript, no database. Ask before adding a dependency.

## Commands

- `npm run ci`: lint, format check, all tests, and dependency audit. Run before every commit.
- `npm test`: extension rules check plus 41 extension tests and 16 proxy tests.
- `npm run lint` / `npm run format`.
- `npm --prefix proxy run dev`: run the Worker locally with Wrangler.

## Workflow

- Work on one Trello card at a time (https://trello.com/b/SpwkYnNw/c3nsor) on a branch named `type/<card-id>-short-description`.
- Commit messages: `type(scope): description`, for example `fix(extension): handle missing policy links`.
- For substantial changes, propose a plan and wait for approval before editing.
- Add or update tests for every behavior change; add a regression test for every bug fix.
- Run `/review-data-safety local` after each completed edit and before committing.

## Guardrails

- Never read, print, or commit secrets. `.env`, `.dev.vars`, and credential folders are denied in `.claude/settings.json`.
- Render untrusted policy text with `textContent` or DOM builders, never `innerHTML`.
- Do not add telemetry or send browsing data anywhere.
- Do not push, deploy, or install packages without asking; the settings file enforces a prompt.
