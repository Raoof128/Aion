# Contributing to Aion

Thank you for your interest in contributing to Aion. This document covers everything you need to know to go from zero to a merged pull request.

---

## Table of Contents

- [Development Environment](#development-environment)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)

---

## Development Environment

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20 or later |
| npm | 10 or later |
| Expo CLI | Latest (`npm i -g expo-cli`) |
| Supabase CLI | Latest (`npm i -g supabase`) |
| TypeScript | ~5.9 (installed via devDependencies) |

You will also need:

- A Supabase project with the `pgvector` extension enabled.
- An OpenAI API key (for embedding generation during ingestion).
- A Google AI (Gemini) API key (for the chat LLM).

### 1. Fork and Clone

```bash
git clone https://github.com/<your-username>/Aion.git
cd Aion
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Install Script Dependencies

```bash
cd scripts && npm install && cd ..
```

### 4. Configure Environment Variables

Copy the example files and fill in your credentials:

```bash
cp .env.example .env
cp scripts/.env.example scripts/.env
```

Edit `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EXPO_PUBLIC_DEV_BYPASS=<your-dev-secret>   # Remove for production builds
```

Edit `scripts/.env`:

```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
OPENAI_API_KEY=<your-openai-key>
```

Never commit either of these files. They are listed in `.gitignore`.

### 5. Apply Database Migrations

Run the SQL migrations in your Supabase SQL Editor (or via `supabase db push` if using the local stack):

```
supabase/migrations/20260402080000_initial_schema.sql
supabase/migrations/20260402081000_rate_limits.sql
```

Enable **Anonymous Sign-Ins** under Supabase Dashboard > Authentication > Providers.

### 6. Set Edge Function Secrets

```bash
supabase secrets set \
  OPENAI_API_KEY="<your-key>" \
  GEMINI_API_KEY="<your-key>" \
  DEV_BYPASS_SECRET="<your-secret>"
```

### 7. Deploy the Edge Function

```bash
supabase functions deploy chat --no-verify-jwt
```

### 8. Ingest Bible Data (One-Time)

```bash
cd scripts
npx tsx ingest.ts
```

This fetches the full Berean Standard Bible, generates embeddings, and upserts them to Supabase. It takes approximately 20 minutes and costs around $0.02 in OpenAI usage.

### 9. Start the App

```bash
npx expo start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go.

---

## Branch Naming

Use the following prefixes so CI and reviewers can immediately understand the intent of a branch:

| Prefix | Use for |
|---|---|
| `feature/` | New functionality or capabilities |
| `fix/` | Bug fixes |
| `docs/` | Documentation-only changes |
| `chore/` | Tooling, dependency updates, refactors with no behavior change |
| `security/` | Security patches or hardening |

**Format:** `<prefix>/<short-description-in-kebab-case>`

**Examples:**

```
feature/verse-bookmarks
fix/sse-stream-hang-on-disconnect
docs/architecture-diagram-update
chore/upgrade-expo-55
security/rate-limit-bypass-patch
```

---

## Commit Messages

Aion follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. Every commit message must match the following format:

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|---|---|
| `feat` | A new feature visible to users |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `chore` | Build process, deps, tooling — no production code change |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `security` | Security hardening or vulnerability patches |
| `perf` | Performance improvements |

### Rules

- Use the **imperative mood** in the short description: "add verse bookmarks", not "added" or "adding".
- Keep the subject line under **72 characters**.
- Reference issues and PRs in the footer: `Closes #42`.
- Mark breaking changes with `!` after the type/scope and explain in the footer:

```
feat(auth)!: require signed tokens for all chat requests

BREAKING CHANGE: anonymous sessions that relied on unsigned tokens
will need to re-authenticate.
```

### Examples

```
feat(chat): add SSE reconnect with exponential backoff
fix(rate-limit): prevent bypass via forged X-Forwarded-For header
docs: update architecture diagram with response cache layer
chore: upgrade @supabase/supabase-js to 2.102.0
security: enforce message length cap at Edge Function boundary
```

---

## Pull Request Process

1. **Open an issue first** for non-trivial changes (new features, architectural changes, security fixes). This avoids duplicated effort and gives maintainers a chance to provide early guidance.

2. **Create your branch** from `main` using the naming convention above.

3. **Keep PRs focused.** One logical change per PR. If you find an unrelated bug, open a separate issue or PR.

4. **Fill in the PR template** completely. Incomplete templates slow review.

5. **Pass all checks** before requesting review:
   - TypeScript compiles with no errors (`npx tsc --noEmit`)
   - No ESLint errors
   - All existing behavior is preserved (manual smoke test if automated tests do not cover the area)

6. **Request a review** from a maintainer. At least one approval is required before merging.

7. **Squash-merge** is the default merge strategy on `main`. Your commit message at merge time should follow Conventional Commits.

8. **Delete your branch** after merging.

---

## Code Style

### TypeScript

- **Strict mode is required.** The `tsconfig.json` enables `"strict": true`. Do not disable or work around any strict-mode flags.
- Prefer `interface` over `type` for object shapes that will be extended; prefer `type` for unions, intersections, and aliases.
- All exported functions and components must have explicit return types.
- Avoid `any`. Use `unknown` and narrow with type guards.

### React Native & Expo

- **Use NativeWind for all styling.** Apply Tailwind utility classes via the `className` prop. Do not use `StyleSheet.create` or inline `style` objects for layout or visual styling.
- Component files live in `components/`. Screen files live in `app/`.
- Prefer functional components with hooks. No class components.
- Co-locate component-specific logic in the same file unless it becomes complex enough to warrant a dedicated hook in `lib/`.

### Supabase & Edge Functions

- Edge Functions are written in TypeScript (Deno runtime). Follow existing patterns in `supabase/functions/chat/index.ts`.
- All database access goes through RLS-protected tables. Never bypass RLS with the `service_role` key from client-side code.
- New tables must include RLS policies. `ENABLE ROW LEVEL SECURITY` is required on every table; `FORCE ROW LEVEL SECURITY` is encouraged for tables owned by service roles.

### General

- No commented-out code in committed files.
- No `console.log` left in production paths (use conditional logging behind a `__DEV__` guard).
- Keep functions small and focused. If a function exceeds ~40 lines, consider breaking it up.

---

## Testing

Aion does not yet have a full automated test suite. Until one is established, contributors are expected to:

1. **Manually smoke-test** any screen or Edge Function path they modify.
2. **Verify the TypeScript build** passes: `npx tsc --noEmit`.
3. **Check for lint issues** if ESLint is configured in the project.
4. **Test on both iOS and Android** for any UI changes. Use Expo Go or simulators.
5. **Test rate limiting** by verifying the Edge Function correctly blocks requests after the per-IP limits are exceeded, if modifying that logic.
6. **Test RLS** by attempting to access another user's data with a different authenticated session, if modifying database policies.

When automated tests are introduced, all PRs will be required to maintain or improve code coverage.
