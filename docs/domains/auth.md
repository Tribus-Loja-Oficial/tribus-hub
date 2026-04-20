# Domain: Auth

## Estratégia

Auth.js (NextAuth v5) com provider de Credentials internos.
Sessão em JWT armazenado em cookie HttpOnly.

## Roles

| Role | Permissões |
|------|-----------|
| `owner` | Acesso total. Gerencia usuários. Deletar/arquivar qualquer conteúdo |
| `admin` | Cria e edita pages, projects, tasks, assets. Gerencia board e estruturas |
| `member` | Visualiza e edita conteúdos permitidos. Sem acesso a configurações críticas |

## Guards disponíveis

```typescript
requireAuth()                     // apenas autenticado
requireRole('admin')              // admin ou owner
requireWorkspaceAccess(user, wid) // pertence ao workspace
canEditPage(user)                 // member+
canManageProject(user)            // admin+
canManageUsers(user)              // owner only
canDeleteEntity(user)             // admin+
```

## Localização

- Configuração Auth.js: `src/lib/auth/index.ts`
- Guards: `src/lib/permissions/index.ts`
- Middleware global: `src/middleware.ts`

## Segurança

- Cookie HttpOnly — inacessível via JavaScript do browser
- Secure em produção
- SameSite: lax
- JWT assinado com AUTH_SECRET (mínimo 32 chars)
- bcrypt para hashing de senhas (cost factor 10)
