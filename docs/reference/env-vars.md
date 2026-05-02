# Environment Variables Reference

Consulte `.env.example` para o template completo.

## Obrigatórias

| Variável                  | Descrição                                                           |
| ------------------------- | ------------------------------------------------------------------- |
| `AUTH_SECRET`             | Segredo JWT (mínimo 32 chars) — gerar com `openssl rand -base64 32` |
| `HUB_API_URL`             | URL base do worker interno `hub-api`                                |
| `HUB_API_INTERNAL_SECRET` | Segredo HMAC compartilhado entre web e worker                       |

## Opcionais com default

| Variável               | Default                 | Descrição          |
| ---------------------- | ----------------------- | ------------------ |
| `NODE_ENV`             | `development`           | Ambiente           |
| `NEXT_PUBLIC_APP_URL`  | `http://localhost:3000` | URL pública da app |
| `NEXT_PUBLIC_APP_NAME` | `Tribus Hub`            | Nome da app        |

## Segurança

- Nunca commitar `.env.local`
- `AUTH_SECRET` deve ser diferente entre ambientes
- `NEXT_PUBLIC_*` são expostos ao browser — nunca usar para segredos
