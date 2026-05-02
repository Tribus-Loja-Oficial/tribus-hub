# Deploy

## Infraestrutura

| Componente          | Serviço                 |
| ------------------- | ----------------------- |
| Aplicação           | Vercel                  |
| API interna e banco | Cloudflare Workers + D1 |

## Processo

1. Push para `main` (com mudanças que disparam o CI do Hub Web — ver `ci-hub-web.yml`)
2. Workflow **Build & quality checks — Hub Web**: typecheck → format:check → lint → tests → build
3. Se esse CI terminar com sucesso: **Deploy — Hub Web (Vercel)** roda deploy em produção (`vercel deploy --prod`), no mesmo padrão do `tribus-monitor`
4. Mudanças em **Hub API** (`apps/hub-api`) disparam **Build & quality checks — Hub API**; com sucesso em push em `main`, **Deploy production — Hub API (Cloudflare Workers)** aplica migrações D1 remotas e faz `wrangler deploy`

## Variáveis de ambiente no Vercel

Configure no painel do Vercel (Settings → Environment Variables):

```
AUTH_SECRET
AUTH_URL          # URL de produção, ex: https://hub.tribus.com.br
HUB_API_URL
HUB_API_INTERNAL_SECRET
NEXT_PUBLIC_APP_URL
```

## Primeira vez

```bash
# 1. Criar D1 e configurar binding no hub-api
# 2. Definir HUB_API_INTERNAL_SECRET no worker (wrangler secret)
# 3. Configurar env vars no Vercel (HUB_API_URL e HUB_API_INTERNAL_SECRET)
# 4. Deploy do worker hub-api
# 5. Deploy do hub-web no Vercel
```

## Rollback

Vercel mantém histórico de deploys. Rollback pelo painel em < 1 minuto.
