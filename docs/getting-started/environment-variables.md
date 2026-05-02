# Variáveis de ambiente

Referência completa das variáveis de ambiente do **tribus-hub**. O arquivo `.env.example` na raiz contém o template com placeholders.

---

## Obrigatórias

| Variável                  | Descrição                                | Exemplo                   |
| ------------------------- | ---------------------------------------- | ------------------------- |
| `AUTH_SECRET`             | Segredo JWT do Auth.js — mínimo 32 chars | `openssl rand -base64 32` |
| `HUB_API_URL`             | URL do worker interno hub-api            | `http://127.0.0.1:8787`   |
| `HUB_API_INTERNAL_SECRET` | Segredo HMAC compartilhado web ↔ hub-api | `hex_64_chars`            |

---

## Opcionais com default

| Variável               | Default                 | Descrição                                      |
| ---------------------- | ----------------------- | ---------------------------------------------- |
| `NODE_ENV`             | `development`           | Ambiente (`development`, `production`, `test`) |
| `NEXT_PUBLIC_APP_URL`  | `http://localhost:3000` | URL pública da aplicação                       |
| `NEXT_PUBLIC_APP_NAME` | `Tribus Hub`            | Nome exibido na UI                             |

---

## Onde definir

| Ambiente        | Onde                                                      |
| --------------- | --------------------------------------------------------- |
| **Local (dev)** | `.env.local` na raiz — nunca commitar                     |
| **Produção**    | Painel do Vercel → Settings → Environment Variables       |
| **CI (testes)** | `vitest.setup.ts` usa `vi.stubEnv()` com valores de teste |
| **CI (build)**  | GitHub Actions secrets — configurados no repositório      |

---

## Variáveis usadas nos testes

Os unit tests não precisam de variáveis reais. O `vitest.setup.ts` faz stub automaticamente:

```ts
AUTH_SECRET = "test-secret-that-is-at-least-32-chars-long";
DATABASE_URL = "postgresql://test:test@localhost:5432/test";
NODE_ENV = "test";
```

---

## Segurança

- **Nunca commitar** `.env.local` — está no `.gitignore`.
- `AUTH_SECRET` deve ser diferente entre ambientes (dev ≠ prod).
- `NEXT_PUBLIC_*` são expostos ao browser — **nunca** usar para segredos.
- Consulte [conventions/security](../conventions/security.md) para regras completas.
