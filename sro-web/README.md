# SRO Web

Portal web do servidor Silkroad Online, construido com Next.js (App Router), React e TypeScript.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- SQL Server (via pacote `mssql`)

## Requisitos

- Node.js 20+
- npm 10+
- Acesso a um SQL Server com os bancos configurados

## Variaveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto com:

```env
DB_SERVER=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=your_password

DB_ACCOUNT_DATABASE=SRO_ACCOUNT
DB_LOG_DATABASE=SRO_LOG
DB_SHARD_DATABASE=SRO_SHARD

# Opcionais
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=false
```

Notas:

- `DB_SERVER` aceita formatos como `host`, `host,1433` ou `host\\INSTANCIA`.
- Se usar instancia nomeada e nao definir `DB_PORT`, a conexao usa `instanceName`.

## Como rodar

Instalar dependencias:

```bash
npm install
```

Desenvolvimento:

```bash
npm run dev
```

Build de producao:

```bash
npm run build
npm run start
```

Lint:

```bash
npm run lint
```

## Estrutura principal

- `app/`: rotas e paginas (App Router)
- `app/home-client.tsx`: layout principal da home
- `app/api/`: endpoints internos (billing, member, captcha)
- `lib/db.ts`: configuracao de conexao SQL Server e pool
- `lib/server-info.ts`: dados de status/config do servidor
- `lib/rankings.ts`: ranking de players e guilds
- `components/site/`: header, footer e container base
- `components/providers/i18n-provider.tsx`: internacionalizacao
- `public/legacy/`: assets visuais do tema legado

## Internacionalizacao

O locale e definido por cookie e consumido via provider de i18n. A home resolve os dados no servidor e passa para o cliente em `app/page.tsx` + `app/home-client.tsx`.

## Observacoes

- A home usa revalidacao incremental (`revalidate = 60`).
- Em caso de falha de pool SQL, a conexao e descartada e recriada automaticamente na proxima chamada.
