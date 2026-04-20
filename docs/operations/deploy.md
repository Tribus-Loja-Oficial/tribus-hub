# Deploy

## Infraestrutura

| Componente | Serviço |
|------------|---------|
| Aplicação | Vercel |
| API interna e banco | Cloudflare Workers + D1 |
| Storage | Cloudflare R2 |

## Processo

1. Push para `main`
2. CI executa: typecheck → lint → format:check → tests → build
3. Se CI verde: `deploy-production.yml` faz deploy no Vercel automaticamente

## Variáveis de ambiente no Vercel

Configure no painel do Vercel (Settings → Environment Variables):

```
AUTH_SECRET
AUTH_URL          # URL de produção, ex: https://hub.tribus.com.br
HUB_API_URL
HUB_API_INTERNAL_SECRET
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL     # URL pública do bucket R2 (opcional, mas recomendado)
NEXT_PUBLIC_APP_URL
```

## Primeira vez

```bash
# 1. Criar D1 e configurar binding no hub-api
# 2. Definir HUB_API_INTERNAL_SECRET no worker (wrangler secret)
# 3. Configurar R2: bucket + API token read/write
# 4. Configurar env vars no Vercel (HUB_API_URL e HUB_API_INTERNAL_SECRET)
# 5. Deploy do worker hub-api
# 6. Deploy do hub-web no Vercel
```

## Rollback

Vercel mantém histórico de deploys. Rollback pelo painel em < 1 minuto.
