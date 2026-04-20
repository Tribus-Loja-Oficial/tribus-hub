# Architecture Overview

## Princípios

O tribus-hub segue a mesma disciplina arquitetural dos demais projetos Tribus:

1. **Separação rígida de camadas** — cada camada tem uma responsabilidade única
2. **Config centralizado** — env lido e validado em um único lugar
3. **Services como dono da lógica** — regra de negócio não vaza para routes nem UI
4. **Validação forte na borda** — toda entrada externa validada com Zod
5. **Soft delete por padrão** — entidades centrais não são removidas fisicamente
6. **Auditoria automática** — operações sensíveis registradas em audit_logs

## Stack de decisão

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Framework | Next.js App Router | SSR, Server Components, API Routes integradas |
| ORM | Drizzle | Type-safety forte, migrations versionadas, sem magic |
| Auth | Auth.js | Suporte a credentials, JWT, cookie seguro |
| Editor | Tiptap | Extensível, baseado em ProseMirror, React-native |
| DnD | dnd-kit | Acessível, performático, composable |
| Storage | Cloudflare R2 | S3-compatible, sem egress fee |
| UI base | Radix UI | Headless, acessível, sem opinião visual |

## Fluxo geral de uma request

```
Browser → Next.js middleware (auth check)
       → API Route (validate Zod schema)
       → Service (business logic)
       → Repository (DB query) / Integration (external)
       → Response
```
