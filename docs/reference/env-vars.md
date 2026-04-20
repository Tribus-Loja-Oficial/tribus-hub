# Environment Variables Reference

Consulte `.env.example` para o template completo.

## Obrigatórias

| Variável | Descrição |
|----------|-----------|
| `AUTH_SECRET` | Segredo JWT (mínimo 32 chars) — gerar com `openssl rand -base64 32` |
| `HUB_API_URL` | URL base do worker interno `hub-api` |
| `HUB_API_INTERNAL_SECRET` | Segredo HMAC compartilhado entre web e worker |
| `R2_ACCOUNT_ID` | ID da conta Cloudflare |
| `R2_ACCESS_KEY_ID` | Access key R2 |
| `R2_SECRET_ACCESS_KEY` | Secret key R2 |

## Opcionais com default

| Variável | Default | Descrição |
|----------|---------|-----------|
| `NODE_ENV` | `development` | Ambiente |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | URL pública da app |
| `NEXT_PUBLIC_APP_NAME` | `Tribus Hub` | Nome da app |
| `R2_BUCKET_NAME` | `tribus-hub-assets` | Nome do bucket R2 |
| `R2_PUBLIC_URL` | — | URL pública do bucket (CDN) |
| `UPLOAD_MAX_SIZE_BYTES` | `52428800` (50MB) | Tamanho máximo de upload |
| `UPLOAD_ALLOWED_MIME_TYPES` | jpeg, png, webp, gif, pdf, txt | MIMEs permitidos |

## Segurança

- Nunca commitar `.env.local`
- `AUTH_SECRET` deve ser diferente entre ambientes
- Credentials R2 devem ter permissões mínimas (read/write no bucket específico)
- `NEXT_PUBLIC_*` são expostos ao browser — nunca usar para segredos
