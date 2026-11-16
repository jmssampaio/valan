# Workflow

1. One branch per feature: `feat/…`, `fix/…`, `chore/…`.
2. Before coding, write a short plan and wait for approval.
3. Implement test-first (red, green, refactor) in small steps; run lint, type check and tests before each commit.
4. Commits follow Conventional Commits (`feat: …`, `fix: …`).
5. Open a PR with the template filled in. CI must pass.
6. `main` is protected: code only gets in through a PR.
7. After merging, update "Project decisions" in CLAUDE.md if anything changed.
