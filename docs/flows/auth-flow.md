# Auth Flow

## Login

```
User → POST /api/auth/[...nextauth] (credentials provider)
→ Auth.js: chama authorize(credentials)
→ credentialsSchema.parse() — valida formato
→ users.repository.findUserByEmail()
→ bcrypt.compare(password, passwordHash)
→ Se válido: retorna { id, name, email, role, workspaceId }
→ Auth.js: cria JWT com esses campos
→ Seta cookie __Secure-next-auth.session-token (HttpOnly, Secure em prod)
→ redirect para /
```

## Verificação de sessão (middleware)

```
Cada request → src/middleware.ts
→ Checar se path é público (login, /api/auth, /api/health)
→ Se não: auth() → decodifica JWT do cookie
→ Se sessão inválida: redirect para /login?callbackUrl=...
```

## Proteção de rotas de API

```
API Route handler
→ const user = await requireAuth()
→ auth() → session
→ Se não autenticado: throw UnauthorizedError (401)
→ Se autenticado: retorna AuthenticatedUser { id, role, workspaceId }
```

## Autorização por role

```
await requireRole('admin')
→ requireAuth() primeiro
→ hasRole(user.role, 'admin') — verifica hierarquia
→ Se insuficiente: throw ForbiddenError (403)
```

## Logout

```
User → signOut() (next-auth/react)
→ DELETE /api/auth/[...nextauth]
→ Cookie limpo
→ redirect para /login
```
