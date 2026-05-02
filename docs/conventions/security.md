# Segurança

Regras **prescritivas** de segurança para o **tribus-hub**. Toda rota, serviço e componente que lida com dados sensíveis deve seguir estas práticas.

---

## Variáveis de ambiente e segredos

- **Nunca** commitar `.env.local` nem arquivos com chaves reais. O `.env.example` contém apenas nomes e placeholders.
- Em produção, definir variáveis no painel do Vercel; não deixar segredos em código ou em logs.
- `process.env` **apenas em** `src/lib/config/env.ts`. Qualquer outro ponto de acesso é proibido pela arquitetura.
- `NEXT_PUBLIC_*` são expostos ao browser — nunca usar para segredos (chaves privadas, tokens de acesso, etc.).

---

## Autenticação e sessão

- Sessão via **Auth.js v5** com strategy JWT em cookie.
- Cookies de sessão (`next-auth.session-token`) **devem** ser:
  - **HttpOnly** — não acessíveis por JavaScript no client.
  - **Secure** em produção (`secure: process.env.NODE_ENV === 'production'`).
  - **SameSite: 'lax'** para reduzir risco de CSRF.
- **Nunca confiar** em estado do client (TanStack Query cache, localStorage) para decisões de autorização. Autorização é sempre verificada no servidor.
- **`requireAuth()`** obrigatório no topo de todo handler de API route, exceto `GET /api/health` e rotas de login.

---

## Autorização baseada em roles

- Roles: `owner > admin > member`
- Use `hasRole()` de `src/lib/permissions.ts` para verificações hierárquicas.
- Use `requireRole()` para bloquear ações que exigem role mínima.
- Nunca assumir role pelo session sem verificar no servidor — o JWT pode estar desatualizado após mudança de role.

---

## Proteção de endpoints

- Todos os inputs de API validados com **Zod** (`.safeParse()`) antes de qualquer processamento.
- Em caso de erro de validação, retornar **400** sem vazar detalhes internos ou stack traces.
- Em caso de erro interno (500), usar `toApiError()` de `src/lib/errors` — nunca retornar a `Error` raw para o client.
- Rotas que retornam dados de outros usuários devem verificar que o `workspaceId` da sessão corresponde ao dado solicitado.

---

## Soft delete e integridade de dados

- Entidades centrais (pages, projects, tasks) **nunca** são deletadas com `DELETE FROM`. Usar campos de soft delete (`isDeleted`, `deletedAt`, `archivedAt`).
- Queries de listagem **sempre** devem filtrar por `isDeleted = false` (ou equivalente), a menos que seja explicitamente uma view de "lixeira".
- Antes de reativar (restore) uma entidade soft-deleted, verificar se o workspace ainda existe e o usuário tem permissão.

---

## Logs e observabilidade

- Nunca logar: passwords (mesmo hasheados), tokens de sessão, chaves de API.
- Usar o logger estruturado de `src/lib/observability/logger.ts` em vez de `console.log`.
- Em produção, logs devem conter `requestId`, `userId` (quando disponível), rota e status — não payloads completos.

---

## Resumo

- Segredos apenas no servidor e em variáveis de ambiente.
- Cookie de sessão: HttpOnly, Secure em prod, SameSite=lax.
- Toda entrada validada com Zod; toda rota autenticada com `requireAuth()`.
- Soft delete obrigatório — nunca hard delete em produção.
- Nunca expor stack traces ou dados internos ao client.

Referência de env vars: [getting-started/environment-variables](../getting-started/environment-variables.md). Regras de código: [conventions/code](code.md).
