# Variáveis de ambiente

Referência completa das variáveis de ambiente do **tribus-hub**. O arquivo `.env.example` na raiz contém o template com placeholders.

---

## Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `AUTH_SECRET` | Segredo JWT do Auth.js — mínimo 32 chars | `openssl rand -base64 32` |
| `HUB_API_URL` | URL do worker interno hub-api | `http://127.0.0.1:8787` |
| `HUB_API_INTERNAL_SECRET` | Segredo HMAC compartilhado web ↔ hub-api | `hex_64_chars` |
| `R2_ACCOUNT_ID` | ID da conta Cloudflare | `abc123def456` |
| `R2_ACCESS_KEY_ID` | Access key do R2 | `key_id_here` |
| `R2_SECRET_ACCESS_KEY` | Secret key do R2 | `secret_key_here` |

---

## Opcionais com default

| Variável | Default | Descrição |
|----------|---------|-----------|
| `NODE_ENV` | `development` | Ambiente (`development`, `production`, `test`) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | URL pública da aplicação |
| `NEXT_PUBLIC_APP_NAME` | `Tribus Hub` | Nome exibido na UI |
| `R2_BUCKET_NAME` | `tribus-hub-assets` | Nome do bucket R2 |
| `R2_PUBLIC_URL` | — | URL pública do CDN do R2 (sem trailing slash) |
| `UPLOAD_MAX_SIZE_BYTES` | `52428800` (50 MB) | Tamanho máximo de upload por arquivo |
| `UPLOAD_ALLOWED_MIME_TYPES` | jpeg, png, webp, gif, pdf, txt, mp4 | MIMEs permitidos (separados por vírgula) |

---

## Onde definir

| Ambiente | Onde |
|----------|------|
| **Local (dev)** | `.env.local` na raiz — nunca commitar |
| **Produção** | Painel do Vercel → Settings → Environment Variables |
| **CI (testes)** | `vitest.setup.ts` usa `vi.stubEnv()` com valores de teste |
| **CI (build)** | GitHub Actions secrets — configurados no repositório |

---

## Variáveis usadas nos testes

Os unit tests não precisam de variáveis reais. O `vitest.setup.ts` faz stub automaticamente:

```ts
AUTH_SECRET = "test-secret-that-is-at-least-32-chars-long"
HUB_API_URL = "http://127.0.0.1:8787"
HUB_API_INTERNAL_SECRET = "test-secret-shared-with-worker"
R2_ACCOUNT_ID = "test-account"
// ...
```

---

## Segurança

- **Nunca commitar** `.env.local` — está no `.gitignore`.
- `AUTH_SECRET` deve ser diferente entre ambientes (dev ≠ prod).
- Credenciais R2 devem ter **permissões mínimas**: leitura e escrita apenas no bucket específico.
- `NEXT_PUBLIC_*` são expostos ao browser — **nunca** usar para segredos.
- Consulte [conventions/security](../conventions/security.md) para regras completas.
