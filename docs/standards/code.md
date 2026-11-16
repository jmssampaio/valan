# Code rules

- TypeScript in strict mode. No `any`; no `// @ts-ignore` without a written reason.
- Database types are generated, never written by hand.
- Small, single-purpose functions. Names that make comments unnecessary.
- Comments explain why, not what.
- No dead code, no leftover `console.log`, no TODO without an owner.
- UI components do not call APIs directly: they go through a service layer.
- External integrations sit behind a common interface, so one can be swapped or added without touching the rest.
- Always handle network errors and unexpected responses; never swallow exceptions.
- Tests come first for business logic and external integrations (see testing.md).
- Prefer the standard library and already-installed dependencies over adding new ones.
