# Agent Rules

These rules govern the development of the Aion project.

## Rules
- **Dependency Cleanliness:** Maintain clean package dependencies. Resolve peer dependency conflicts by aligning versions in `package.json` rather than relying on `--legacy-peer-deps` or `--force`.
- **Cross-Platform Compatibility:** Keep cross-platform requirements in mind. The app runs on Expo (iOS, Android, Web) and Tauri (macOS, Windows, Linux).
- **Linter & Formatter:** Ensure ESLint runs cleanly on `app/`, `components/`, and `lib/` directories. Use prettier for formatting.

## Change Log

### 2026-05-21 (Australia/Sydney)
**Raouf:**
- **Scope:** ESLint Dependency Conflict
- **Summary:** Resolved `npm install` peer dependency conflict between `eslint` and `eslint-plugin-react` by downgrading `eslint` from `^10.1.0` to `^9.39.0`.
- **Files Changed:**
  - [package.json](file:///Users/raoof.r12/Desktop/Raouf/Aion/package.json) - Downgraded `eslint` dependency from `^10.1.0` to `^9.39.0`.
- **Verification:** Successfully ran `npm install` and verified that the package-lock resolved cleanly. Verified that `npm run lint` executes successfully with 0 errors.
- **Follow-ups:** None.
