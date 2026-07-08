# Contributing to SRO Web

Thanks for your interest in contributing.

## Development setup

1. Fork the repository.
2. Create a branch from `main`.
3. Install dependencies:

```bash
npm ci
```

4. Create your local environment file:

```bash
cp .env.example .env.local
```

5. Start the app:

```bash
npm run dev
```

## Pull request process

1. Keep PRs focused and small.
2. Use clear commit messages.
3. Ensure CI passes (`lint`, `typecheck`, `build`).
4. For UI changes, include screenshots.
5. Update docs if behavior changes.

## Coding guidelines

- Follow existing project patterns and naming.
- Prefer localized changes over large refactors.
- Do not commit secrets (`.env.local`, API keys, tokens).
- Preserve API contracts in `app/api/*` unless discussed first.

## Reporting issues

- Use the bug template and include repro steps.
- For questions, use GitHub Discussions.
