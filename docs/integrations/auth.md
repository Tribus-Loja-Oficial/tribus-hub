# Auth.js — Autenticação

O tribus-hub usa **Auth.js v5** (next-auth) com credentials provider e strategy JWT.

---

## Configuração

| Variável de ambiente | Descrição |
|---------------------|-----------|
| `AUTH_SECRET` | Segredo para assinar/verificar JWT — mínimo 32 chars |
| `AUTH_URL` | URL de produção da app (ex.: `https://hub.tribus.com.br`) |

Configuração principal: `src/lib/auth/index.ts`.

---

## Como funciona

### Login

1. Usuário envia email + password para `POST /api/auth/callback/credentials` (gerenciado pelo Auth.js)
2. O credentials provider chama `auth.service.authenticate()`:
   - Busca o usuário pelo email no banco
   - Compara a senha com `bcrypt.compare()`
   - Retorna o user object se válido
3. Auth.js cria um **JWT** assinado com `AUTH_SECRET`
4. JWT é armazenado em cookie `next-auth.session-token` (HttpOnly, Secure em prod, SameSite=lax)

### Sessão

- O middleware do Next.js (`src/middleware.ts`) verifica o JWT em toda rota protegida
- Rotas da API chamam `requireAuth()` de `src/lib/auth/guards.ts` para obter a sessão
- A sessão contém: `{ userId, email, name, role, workspaceId }`

### Logout

- `POST /api/auth/signout` (gerenciado pelo Auth.js)
- Remove o cookie de sessão

---

## Guards de autorização

```ts
// Verifica sessão ativa (qualquer role)
const session = await requireAuth();

// Verifica role mínima
const session = await requireRole("admin");

// Helpers de permissão (src/lib/permissions.ts)
hasRole(session.role, "owner")    // → boolean
canEditPage(session)              // → boolean
canManageUsers(session)           // → boolean
```

---

## JWT — o que está no token

```ts
{
  userId: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  workspaceId: string;
}
```

O JWT **não** contém dados sensíveis. Roles são definidos no banco e inseridos no JWT no momento do login — mudanças de role requerem novo login para efeito imediato.

---

## Senhas

- Armazenadas com **bcrypt** (custo 10)
- Nunca armazenadas em plain text, nunca logadas
- Usuário inicial criado pelo seed com senha `changeme123!` — deve ser trocada imediatamente

---

## Middleware

`src/middleware.ts` protege todas as rotas sob `/(dashboard)` e `/api/*` (exceto `/api/health`). Usuários não autenticados são redirecionados para `/login`.

---

## Segurança

- Cookie de sessão: HttpOnly, Secure em prod, SameSite=lax
- `AUTH_SECRET` diferente por ambiente
- Nunca expor o JWT ao client via JS — apenas lido pelo servidor via cookie HttpOnly

Consulte [conventions/security](../conventions/security.md) para regras completas.
