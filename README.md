# Base kit for projects built with Claude Code

Reusable configuration files. Copy them to the root of a new project and fill in the `{{…}}` fields in CLAUDE.md.

- `CLAUDE.md` — project context and rules, read by Claude in every session.
- `docs/standards/` — UX, code, testing (TDD), security and workflow rules.
- `.claude/settings.json` — what Claude may run without asking and what it may never read.
- `.claude/commands/` — custom commands: `/plan`, `/tdd`, `/ux-review`, `/pr-review`, `/security-check`.
- `.mcp.json` — the project's MCP servers (context7).
- `.github/` — CI and PR template.
- `GLOBAL-CLAUDE.md` — personal rules; copy once to `~/.claude/CLAUDE.md` and delete from here.

CI expects `package.json` to have `lint`, `typecheck` and `test` scripts. It fails if `test` is missing.
