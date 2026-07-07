@AGENTS.md

# Projeto SRO Web

Resumo rapido para agentes e manutencao:

- Framework: Next.js 16 (App Router) + React 19 + TypeScript.
- Banco: SQL Server via `mssql`, com pools em `lib/db.ts`.
- Home: `app/page.tsx` (server) + `app/home-client.tsx` (client).
- Tema visual: estilo legacy dark/gold com variaveis CSS globais.

## Regras de alteracao

- Preservar o padrao visual existente (legacy dark/gold) na home.
- Preferir mudancas pequenas e localizadas.
- Evitar quebrar contratos dos endpoints em `app/api/*`.
- Ao mexer na home, validar que Event Schedule e Game Ranking permanecem consistentes entre si.

## Checklist rapido

1. Rodar `npm run lint` quando houver alteracao de codigo.
2. Rodar `npm run build` antes de publicar mudancas maiores.
3. Validar variaveis de ambiente de banco em `.env.local`.
