# AGENT.md: Repository Agent Guidelines & Workflow

## Core Directive
All Antigravity agents operating in this repository must execute code and documentation changes using the **Strict PR Workflow Pipeline** detailed below. Changes must **never** be committed directly to `main`. Every requested modification must be processed through an isolated branch, pushed, submitted as a Pull Request, merged, and synced back to `main` as fast as possible to avoid merge conflicts and satisfy project PR quota requirements.

---

## Mandatory Execution Pipeline

For **every** requested change, bug fix, feature, or documentation update, execute these steps in sequence without delay:

### 1. Sync Latest Remote
Always ensure local `main` is clean and up to date before starting any task:
```bash
git checkout main
git pull origin main
```

### 2. Create a Feature Branch
Create a descriptive branch adhering to repository naming conventions:
- **Format:** `feature/<ROLE>-<TASK-ID>-<short-description>` or `feature/<short-description>`
- **Examples:**
  - `feature/S1-DEV-21-user-search`
  - `feature/S1-UIX-13-button-hover-states`
  - `feature/S1-TST-17-auth-unit-tests`
```bash
git checkout -b feature/<branch-name>
```

### 3. Implement & Commit Changes
Make the required edits to files cleanly and stage them:
```bash
git add <modified-files>
git commit -m "[<TASK-ID>] <Brief imperative description of changes>"
```
*Tip: If there is no specific Task ID, use standard conventional commit prefixes like `feat:`, `fix:`, `docs:`, or `refactor:`.*

### 4. Push Branch to Origin
Push the new branch to GitHub:
```bash
git push -u origin feature/<branch-name>
```

### 5. Create Pull Request
Create the PR using the GitHub CLI (`gh`). Include a clear summary and issue reference (if applicable):
```bash
gh pr create \
  --base main \
  --head feature/<branch-name> \
  --title "[<TASK-ID>] <PR Title>" \
  --body "## Summary of Changes
- <Summary bullet 1>
- <Summary bullet 2>

## Verification
- Frontend build / lint verified
- Zero merge conflicts"
```
*(If `gh pr create` encounters GraphQL network timeouts, fall back to `gh api repos/Pampanga-West/baikolano-website/pulls`).*

### 6. Merge PR and Clean Up
Merge the pull request immediately and delete the remote branch:
```bash
gh pr merge <pr_number_or_branch> --merge --delete-branch
```
Return to `main` and sync immediately so the workspace remains conflict-free for the next task:
```bash
git checkout main
git pull origin main
```

---

## Autonomous Merge Conflict Resolution

If a conflict arises at **any point** in the workflow (during `git pull`, rebasing, branch merging, or PR mergeability checks):

> **CRITICAL RULE:** The AI agent **MUST resolve the conflict entirely on its own**. Never ask the user to resolve it, and never surface conflicts to the user as an error or blocking question. The process must appear seamless to the user, as if no conflict ever occurred.

### Conflict Resolution Steps:
1. **Detect Conflicted Files:**
   Identify conflicted files via `git status` or merge output.
2. **Reconcile Automatically:**
   Read and analyze the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`). Intelligently merge the code by keeping both upstream incoming updates and the new feature/task logic without losing functionality.
3. **Stage and Commit the Resolution:**
   ```bash
   git add <resolved-files>
   git commit -m "fix(merge): resolve merge conflicts autonomously"
   ```
4. **Push and Complete PR Merge:**
   Push the resolved branch and complete the PR merge:
   ```bash
   git push origin feature/<branch-name>
   gh pr merge <pr_number> --merge --delete-branch
   ```
5. **Sync Main:**
   Return to `main` and pull the clean, resolved tree:
   ```bash
   git checkout main
   git pull origin main
   ```

---

## Operational Rules for Agents

1. **Fast Autonomous Execution**: Execute the 6 steps sequentially without pausing or asking for user confirmation between steps unless required credentials or requirements are missing.
2. **Autonomous Conflict Resolution**: Always resolve git conflicts silently and independently. Never burden the user with merge resolutions.
3. **Never Commit Directly to Main**: All code, docs, and configurations must go through a feature branch and merged PR.
4. **Handle Transient Network Glitches**: If a network timeout occurs during `git push` or `gh` commands, retry with exponential backoff (e.g., 2–4s delay) or use `gh api` REST endpoints.
5. **Preserve Tech Stack Integrity**:
   - The application is a **Vite + React + TypeScript + Tailwind CSS** frontend directly integrating with **Supabase PostgreSQL**.
   - No legacy Java/Spring backend files should be restored or referenced.
6. **Clean Working Tree**: Ensure `git status` is clean before and after every turn.
