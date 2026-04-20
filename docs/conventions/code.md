# Code Conventions

Architectural decisions are in [docs/architecture/](../architecture/). This document covers day-to-day coding standards.

---

## TypeScript

- **Strict mode** — `strict: true` in `tsconfig.json`. No `@ts-ignore` without a comment explaining why.
- **No `any`** — Use `unknown` and narrow with guards. The ESLint rule `@typescript-eslint/no-explicit-any` is set to `error`.
- **Type imports** — Always use `import type { Foo }` for type-only imports. Enforced by `@typescript-eslint/consistent-type-imports`.
- **No unused vars** — Rule is `error`. Prefix intentionally unused params with `_`.

```ts
// correct
import type { Project } from "@/lib/db/schema";

// wrong
import { Project } from "@/lib/db/schema";
```

---

## File & folder naming

| Thing | Convention | Example |
|---|---|---|
| React component | `kebab-case.tsx` | `task-card.tsx` |
| Hook | `use-kebab-case.ts` | `use-tasks.ts` |
| Zod schema file | `<domain>.schemas.ts` | `tasks.schemas.ts` |
| Repository file | `<domain>.repository.ts` | `projects.repository.ts` |
| Test file | `<name>.test.ts(x)` | `errors.test.ts` |

---

## Imports

Ordered by group, separated by blank line:

1. React / Next.js
2. Third-party packages
3. Internal `@/lib/`
4. Internal `@/features/`
5. Internal `@/components/`

Always use the `@/` alias — never relative `../../` across feature boundaries.

---

## React components

- **Server Components by default.** Add `"use client"` only when you need browser APIs, state, or event handlers.
- **No `React.FC`** — use plain function declarations with a `Props` interface.
- **No default exports** except for Next.js pages, layouts, and route handlers.

```tsx
// correct
interface TaskCardProps {
  task: Task;
  onOpen?: (task: Task) => void;
}

export function TaskCard({ task, onOpen }: TaskCardProps) { ... }

// wrong
const TaskCard: React.FC<{ task: Task }> = ({ task }) => { ... };
export default TaskCard;
```

---

## Class merging

Always use `cn()` from `@/lib/utils/cn` (wraps `clsx` + `tailwind-merge`).

```tsx
// correct
<div className={cn("flex items-center", isActive && "text-foreground")} />

// wrong — raw template literals don't handle conflicts
<div className={`flex items-center ${isActive ? "text-foreground" : ""}`} />
```

---

## Accessibility

Every Radix `<DialogContent>` must include a `<DialogTitle>`. If there is no visible title, hide it with Tailwind:

```tsx
<DialogTitle className="sr-only">Create task</DialogTitle>
```

---

## API routes

- Validate all input with Zod `.safeParse()` — return `400` on failure.
- Check the auth session at the top of every handler.
- Use typed errors from `@/lib/errors` — never throw plain `Error` objects in routes.
- Return `NextResponse.json({ data })` on success.

```ts
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const task = await createTask(parsed.data);
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (err) {
    const { message, code, status } = toApiError(err);
    return NextResponse.json({ message, code }, { status });
  }
}
```

---

## Zod schemas

- Live in `src/lib/schemas/<domain>.schemas.ts`.
- Export both the schema and the inferred type (`export type CreateTaskInput = z.infer<typeof createTaskSchema>`).
- Use `.optional().nullable()` only for fields that can be explicitly cleared (PATCH endpoints).

---

## Data fetching (TanStack Query)

- Query hooks live in `src/features/<domain>/hooks/`.
- Always invalidate related queries after a successful mutation.
- Use `staleTime: 0` for data that must be fresh on every render (e.g., milestones after selecting a project in a form).

```ts
useMutation({
  mutationFn: createTask,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  },
});
```

---

## Error handling

Use the typed error classes from `@/lib/errors`:

| Class | Status | Code |
|---|---|---|
| `NotFoundError` | 404 | `NOT_FOUND` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `ConflictError` | 409 | `CONFLICT` |

`toApiError(err)` safely converts any thrown value to `{ message, code, status }`.

---

## Logging

`no-console` is set to `warn` — `console.log` will fail CI lint. Use `console.warn` or `console.error` only at system boundaries (API routes, server actions). Never log sensitive data.

---

## Testing

See [vitest.config.ts](../../vitest.config.ts) for full configuration.

### Coverage thresholds (enforced in CI)
- Statements: 80%
- Lines: 80%
- Branches: 75%
- Functions: 80%

### Where tests live

```
tests/
  unit/
    errors.test.ts
    cn.test.ts
    schemas/
      tasks.test.ts
      okr.test.ts
    project-hierarchy-search.test.ts
```

### Conventions
- `describe` + `it` blocks (not bare `test`)
- Factory helpers (`makeProject()`, `makeTask()`) instead of repeated inline objects
- Test pure logic — no DB, no network, no Next.js internals
- E2E / integration tests live in a separate repository

### Running tests

```bash
npm run test              # watch mode
npm run test:coverage     # with coverage report
npm run test:staged       # only files staged for commit (used by pre-commit hook)
```

---

## Git hooks (Husky)

**pre-commit** (`.husky/pre-commit`):
1. `lint-staged` — runs ESLint + Prettier on staged files
2. `node scripts/vitest-staged.js` — runs Vitest only for tests related to staged `src/` files

**pre-push**: not configured — CI handles full validation.

---

## What CI checks (`ci.yml`)

On push/PR to `main` or `develop`:
1. TypeScript (`npm run typecheck`)
2. Prettier format check (`npm run format:check`)
3. ESLint (`npm run lint`)
4. Unit tests with coverage (`npm run test:coverage`)
5. Production build (`npm run build`)

All steps must pass before merging.
