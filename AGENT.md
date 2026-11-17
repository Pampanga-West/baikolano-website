# AGENT.md: Repository Agent Guidelines & Workflow

## Core Directive
All Antigravity / Gemini agents operating in this repository must execute code and documentation changes using the **Strict Issue + PR Workflow Pipeline** modeled after the regulated Sprint 1 history (`#1`–`#59`). Changes must **never** be committed directly to `main`, and **every** change must be accompanied by a corresponding **GitHub Issue** and **Pull Request** formatted with the committer's standardized task code:

```text
[S<sprint_number>-<ROLE>-<count>]
```

- **Current Active Sprint Number:** `2` (`S2`)
- Every requested modification must:
  1. Identify the active committer (`gh api user --jq .login`) and compute their next `[S2-<ROLE>-<COUNT>]` task code.
  2. Create (or link an existing) GitHub Issue following the standardized **Issue Template** (`#1`–`#29` format) and assign it to the committer.
  3. Process changes on an isolated feature branch (`feature/S2-<ROLE>-<COUNT>-<short-description>`).
  4. Commit with `[S2-<ROLE>-<COUNT>] <Task Title>`.
  5. Push and open a Pull Request following the standardized **PR Template** (`#30`–`#59` format) with the **exact same title** as the Issue and `Closes Issue: #<issue_number>`.
  6. Merge the PR immediately and sync local `main` to avoid merge conflicts and satisfy project Issue & PR quota requirements.

---

## Team Member Role Codes & Sprint 2 Counter Tracker

Derived from the regulated `#1`–`#59` Sprint 1 Issues and Pull Requests, each team member has a fixed **Role Code**, **Role Title**, and **GitHub Label** based on who commits (`gh api user --jq .login`):

### 1. Committer Lookup Table

| GitHub Username (`gh`) | Team Member Name (`Assignee` / `Author`) | Role Code | Role Title (Issue Body) | GitHub Role Label | Regulated Sprint 1 Issues & PRs (`#1`–`#59`) | Next Sprint 2 Task ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `JoeAndreRoja` | **Joe Andre Roja** | `SM` | `Scrum Master` | `role:scrum-master` | Issues `#1`–`#4` \| PRs `#32, #36, #41, #47` (`S1-SM-02`–`05`) | `[S2-SM-01]` *(increment sequentially)* |
| `GN68` | **Marc Miguel Ramirez** | `DBA` | `DB Admin` | `role:dba` | Issues `#5`–`#10` \| PRs `#31, #34, #40, #43, #44, #45` (`S1-DBA-01`–`06`) | `[S2-DBA-01]` *(increment sequentially)* |
| `EuresTinoco` | **Eures Nivrem Tinoco** | `DEV` | `Developer` | `role:developer` | Issues `#11`–`#18` \| PRs `#30, #35, #39, #42, #55, #56, #57, #59` (`S1-DEV-01`–`08`) | `[S2-DEV-01]` *(increment sequentially)* |
| `PhilHitalia` | **Phil Emmanuel Hitalia** | `UIX` | `UI/UX Designer` | `role:ui/ux` | Issues `#19`–`#23` \| PRs `#33, #37, #38, #48` (`S1-UIX-01`–`05`) | `[S2-UIX-01]` *(increment sequentially)* |
| `sarmientoredge11` | **Redge Rainier Sarmiento** | `TST` | `Tester` | `role:tester` | Issues `#24`–`#29` \| PRs `#49`–`#54` (`S1-TST-01`–`06`) | `[S2-TST-01]` *(increment sequentially)* |

### 2. Automatic Next-Count Detection Snippet
Before creating an Issue or branch, run this command to dynamically verify the active GitHub user and find the next available `S2-<ROLE>-<COUNT>` across all remote Issues and PRs:

```bash
python3 - << 'EOF'
import json, re, subprocess

login = subprocess.check_output(["gh", "api", "user", "--jq", ".login"], text=True).strip()
role_map = {
    "JoeAndreRoja": ("SM", "Scrum Master", "Joe Andre Roja", "role:scrum-master"),
    "GN68": ("DBA", "DB Admin", "Marc Miguel Ramirez", "role:dba"),
    "EuresTinoco": ("DEV", "Developer", "Eures Nivrem Tinoco", "role:developer"),
    "PhilHitalia": ("UIX", "UI/UX Designer", "Phil Emmanuel Hitalia", "role:ui/ux"),
    "sarmientoredge11": ("TST", "Tester", "Redge Rainier Sarmiento", "role:tester"),
}
role_code, role_title, full_name, role_label = role_map.get(login, ("DEV", "Developer", login, "role:developer"))

prs = json.loads(subprocess.check_output(["gh", "pr", "list", "--state", "all", "--limit", "200", "--json", "title"], text=True))
issues = json.loads(subprocess.check_output(["gh", "issue", "list", "--state", "all", "--limit", "200", "--json", "title"], text=True))

pattern = re.compile(rf"\[S2-{role_code}-(\d+)\]")
counts = [int(m.group(1)) for item in (prs + issues) if (m := pattern.search(item["title"]))]
next_count = max(counts, default=0) + 1
print(f"Login: {login} | Name: {full_name} | Role: {role_title} ({role_label})")
print(f"Next Task ID: S2-{role_code}-{next_count:02d}")
EOF
```

---

## Standardized Issue, Branch, Commit & PR Templates (`#1`–`#59` Standard)

All future workflows **must** strictly follow these templates modeled directly after Issues `#1`–`#29` and Pull Requests `#30`–`#59`:

### 1. GitHub Issue Template
- **Issue Title:**
  ```text
  [S2-<ROLE>-<COUNT>] <Task Title>
  ```
- **Issue Assignee:** `--assignee <github_login>`
- **Issue Labels:**
  `sprint:2`, `priority:high` *(or `priority:medium` / `priority:low`)*, `<role_label>` *(e.g. `role:scrum-master`, `role:dba`, `role:developer`, `role:ui/ux`, `role:tester`)*
- **Issue Body:**
  ```markdown
  ### Task ID: S2-<ROLE>-<COUNT>
  **Role:** <Role Title> | **Assignee:** <Full Name> | **Due:** Week <W>, Sprint Day <D>

  ### Description:
  <Concise description of the deliverables to implement.>
  ```

### 2. Feature Branch Template
- **Format:**
  ```text
  feature/S2-<ROLE>-<COUNT>-<kebab-case-short-description>
  ```
- **Examples (modeled on `#30`–`#59`):**
  - `feature/S2-SM-01-sprint-2-board`
  - `feature/S2-DBA-01-customer-product-schema`
  - `feature/S2-DEV-01-customer-crud-api`
  - `feature/S2-UIX-01-customer-product-mockups`
  - `feature/S2-TST-01-customer-test-cases`

### 3. Commit Message Template
- **Format:**
  ```text
  [S2-<ROLE>-<COUNT>] <Task Title>
  ```

### 4. Pull Request Template
- **PR Title (matches Issue Title):**
  ```text
  [S2-<ROLE>-<COUNT>] <Task Title>
  ```
- **PR Body (matches `#30`–`#59`):**
  ```markdown
  ## Sprint Task Reference
  - **Task ID:** S2-<ROLE>-<COUNT>
  - **Sprint:** Sprint 2
  - **Author:** <Full Name>
  - **Closes Issue:** #<issue_number>

  ## Summary of Changes
  - Implemented deliverables for **[S2-<ROLE>-<COUNT>] <Task Title>**
  - `<modified-file-path-1>`
  - `<modified-file-path-2>`
  ```

---

## Mandatory Execution Pipeline

For **every** requested change, bug fix, feature, test case, or documentation update, execute these 7 steps in sequence without delay:

### 1. Sync Latest Remote
Always ensure local `main` is clean and up to date before starting any task:
```bash
git checkout main
git pull origin main
```

### 2. Determine Task Code & Create GitHub Issue
Identify the active user's role code and next sequential Sprint 2 number (`S2-<ROLE>-<COUNT>`), then create the corresponding GitHub Issue first and capture its `<issue_number>`:
```bash
gh issue create \
  --title "[S2-<ROLE>-<COUNT>] <Task Title>" \
  --assignee "<github_login>" \
  --label "sprint:2,priority:high,<role_label>" \
  --body "### Task ID: S2-<ROLE>-<COUNT>
**Role:** <Role Title> | **Assignee:** <Full Name> | **Due:** Week 3, Sprint Day 1

### Description:
<Detailed description of the task deliverables.>"
```
*(Note: If the user specifies an existing open Issue to work on, use that Issue's `[S2-<ROLE>-<COUNT>]` code and `#<issue_number>` instead of creating a duplicate.)*

### 3. Create a Feature Branch
Create a descriptive branch matching the Task ID:
```bash
git checkout -b feature/S2-<ROLE>-<COUNT>-<short-description>
```

### 4. Implement & Commit Changes
Make the required edits to files cleanly and stage them:
```bash
git add <modified-files>
git commit -m "[S2-<ROLE>-<COUNT>] <Task Title>"
```

### 5. Push Branch to Origin
Push the new branch to GitHub:
```bash
git push -u origin feature/S2-<ROLE>-<COUNT>-<short-description>
```

### 6. Create Pull Request (Linked to Issue)
Create the PR using the GitHub CLI (`gh`), referencing the Task ID and closing `#<issue_number>`:
```bash
gh pr create \
  --base main \
  --head feature/S2-<ROLE>-<COUNT>-<short-description> \
  --title "[S2-<ROLE>-<COUNT>] <Task Title>" \
  --body "## Sprint Task Reference
- **Task ID:** S2-<ROLE>-<COUNT>
- **Sprint:** Sprint 2
- **Author:** <Full Name>
- **Closes Issue:** #<issue_number>

## Summary of Changes
- Implemented deliverables for **[S2-<ROLE>-<COUNT>] <Task Title>**
- \`<modified-file-1>\`
- \`<modified-file-2>\`"
```
*(If `gh pr create` encounters GraphQL network timeouts, fall back to `gh api repos/Pampanga-West/baikolano-website/pulls`).*

### 7. Merge PR and Clean Up
Merge the pull request immediately (which also auto-closes the linked GitHub Issue) and delete the remote branch:
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
   git push origin feature/S2-<ROLE>-<COUNT>-<short-description>
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

1. **Fast Autonomous Execution**: Execute all 7 steps sequentially without pausing or asking for user confirmation between steps unless required credentials or requirements are missing.
2. **Mandatory Issue + PR Pairing**: Always create or link a `[S2-<ROLE>-<COUNT>]` GitHub Issue before submitting the Pull Request so the board and PR history match the regulated `#1`–`#59` standard.
3. **Autonomous Conflict Resolution**: Always resolve git conflicts silently and independently. Never burden the user with merge resolutions.
4. **Never Commit Directly to Main**: All code, docs, and configurations must go through a feature branch and merged PR.
5. **Handle Transient Network Glitches**: If a network timeout occurs during `git push` or `gh` commands, retry with exponential backoff (e.g., 2–4s delay) or use `gh api` REST endpoints.
6. **Preserve Tech Stack Integrity**:
   - The application is a **Vite + React + TypeScript + Tailwind CSS** frontend directly integrating with **Supabase PostgreSQL**.
   - No legacy Java/Spring backend files should be restored or referenced.
7. **Clean Working Tree**: Ensure `git status` is clean before and after every turn.

---

## Regulated Reference Archive: `#59` Down to `#1` (PRs `#59`–`#30` & Issues `#29`–`#1`)

Below is the complete archive of the regulated Sprint 1 Pull Requests (`#59` down to `#30`) paired with their corresponding GitHub Issues (`#29` down to `#1`), including exact titles, branch names, bodies, labels, and file deliverables.

### 1. Pull Requests `#59` Down to `#30` & Corresponding Issues (`#1`–`#29`)

| PR # | Author (`gh`) | Branch Name (`headRefName`) | PR & Issue Title | Corresponding Issue # & Labels | Issue Body (`Task ID`, `Role`, `Assignee`, `Due`, `Description`) | PR Body (`Sprint Task Reference` & `Summary of Changes`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **#59** | `EuresTinoco`<br>*(Eures Nivrem Tinoco)* | `feature/S1-DEV-08-main-page-permissions` | `[S1-DEV-08] Main page: sidebar and module tiles by role and rights, plus server-side permission check` | **Issue #18**<br>`priority:high`, `role:developer`, `sprint:1` | **Task ID:** `S1-DEV-08`<br>**Role:** Developer \| **Assignee:** Eures Nivrem Tinoco \| **Due:** Week 2, Sprint Day 9<br>**Description:** Main workspace layout: sidebar and dashboard module tiles rendered according to authenticated role, plus server-side permission checks. | **Task ID:** `S1-DEV-08` \| **Sprint:** Sprint 1 \| **Author:** EuresTinoco \| **Closes Issue:** `#18`<br>- Implemented deliverables for **[S1-DEV-08] Main page: sidebar and module tiles by role and rights, plus server-side permission check**<br>- `frontend/src/layouts/WorkspaceLayout.tsx`<br>- `frontend/src/pages/DashboardPage.tsx` |
| **#58** | `PhilHitalia`<br>*(Phil Emmanuel Hitalia)* | `feature/S1-UIX-01-design-system` | `feat: initialize React config and implement Profile settings UI` | *(Supporting PR for UIX)* | — | **Sprint:** Sprint 1 \| **Author:** `@PhilHitalia`<br>- Set up core project configuration (Vite, TypeScript, package dependencies)<br>- Implement `ProfilePage.tsx`, `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, `main.tsx` |
| **#57** | `EuresTinoco`<br>*(Eures Nivrem Tinoco)* | `feature/S1-DEV-07-rights-dialog` | `[S1-DEV-07] Rights dialog: assign per-action rights by module with audit_log recording` | **Issue #17**<br>`priority:high`, `role:developer`, `sprint:1` | **Task ID:** `S1-DEV-07`<br>**Role:** Developer \| **Assignee:** Eures Nivrem Tinoco \| **Due:** Week 2, Sprint Day 9<br>**Description:** Rights assignment dialog: toggle 36 rights across 5 modules (Customer, Product, Human Resources, Sales, Reports) with All/None buttons, saving to database and recording in audit_log. | **Task ID:** `S1-DEV-07` \| **Sprint:** Sprint 1 \| **Author:** EuresTinoco \| **Closes Issue:** `#17`<br>- Implemented deliverables for **[S1-DEV-07] Rights dialog: assign per-action rights by module with audit_log recording**<br>- `frontend/src/components/RightsModal.tsx`<br>- `frontend/src/lib/data.ts` |
| **#56** | `EuresTinoco`<br>*(Eures Nivrem Tinoco)* | `feature/S1-DEV-06-superadmin-safeguards` | `[S1-DEV-06] Superadmin: approve pending users and designate admins; last-superadmin safeguard` | **Issue #16**<br>`priority:high`, `role:developer`, `sprint:1` | **Task ID:** `S1-DEV-06`<br>**Role:** Developer \| **Assignee:** Eures Nivrem Tinoco \| **Due:** Week 2, Sprint Day 8<br>**Description:** Superadmin features to approve pending registrations and toggle roles. Guard against removing, deleting, or disabling the last active Superadmin. | **Task ID:** `S1-DEV-06` \| **Sprint:** Sprint 1 \| **Author:** EuresTinoco \| **Closes Issue:** `#16`<br>- Implemented deliverables for **[S1-DEV-06] Superadmin: approve pending users and designate admins; last-superadmin safeguard**<br>- `backend/src/main/java/top/gnon/backend/user/UserController.java` |
| **#55** | `EuresTinoco`<br>*(Eures Nivrem Tinoco)* | `feature/S1-DEV-05-user-management-screen` | `[S1-DEV-05] User Management screen: user list, Add User, Edit User, Block/Unblock` | **Issue #15**<br>`priority:high`, `role:developer`, `sprint:1` | **Task ID:** `S1-DEV-05`<br>**Role:** Developer \| **Assignee:** Eures Nivrem Tinoco \| **Due:** Week 2, Sprint Day 8<br>**Description:** User Management screen: live user table, Add User modal, Edit User modal, and Block/Unblock toggle. Admin manages Users only; Superadmin accounts hidden from Admin. | **Task ID:** `S1-DEV-05` \| **Sprint:** Sprint 1 \| **Author:** EuresTinoco \| **Closes Issue:** `#15`<br>- Implemented deliverables for **[S1-DEV-05] User Management screen: user list, Add User, Edit User, Block/Unblock**<br>- `frontend/src/pages/UserManagementPage.tsx`<br>- `frontend/src/lib/types.ts` |
| **#54** | `sarmientoredge11`<br>*(Redge Rainier D. Sarmiento)* | `feature/S1-TST-06-bug-verification` | `[S1-TST-06] Bug reports and fix verification` | **Issue #29**<br>`priority:medium`, `sprint:1`, `role:tester` | **Task ID:** `S1-TST-06`<br>**Role:** Tester \| **Assignee:** Redge Rainier Sarmiento \| **Due:** Week 2, Sprint Day 9<br>**Description:** Log bug reports, verify regression fixes, and certify Sprint 1 readiness. | **Task ID:** `S1-TST-06` \| **Sprint:** Sprint 1 \| **Author:** Redge Rainier D. Sarmiento \| **Closes Issue:** `#29`<br>- Implemented deliverables for **[S1-TST-06] Bug reports and fix verification**<br>- `docs/sprint-1/S1-TST-06-bug-verification-report.md` |
| **#53** | `sarmientoredge11`<br>*(Redge Rainier D. Sarmiento)* | `feature/S1-TST-05-smoke-test` | `[S1-TST-05] Automated smoke test: login and main page` | **Issue #28**<br>`priority:medium`, `sprint:1`, `role:tester` | **Task ID:** `S1-TST-05`<br>**Role:** Tester \| **Assignee:** Redge Rainier Sarmiento \| **Due:** Week 2, Sprint Day 9<br>**Description:** Implement automated smoke tests verifying health of login API and initial dashboard loading. | **Task ID:** `S1-TST-05` \| **Sprint:** Sprint 1 \| **Author:** Redge Rainier D. Sarmiento \| **Closes Issue:** `#28`<br>- Implemented deliverables for **[S1-TST-05] Automated smoke test: login and main page**<br>- `backend/test scripts/Smoke test.js` |
| **#52** | `sarmientoredge11`<br>*(Redge Rainier D. Sarmiento)* | `feature/S1-TST-04-permission-matrix-tests` | `[S1-TST-04] Permission matrix tests (superadmin/admin/user x each right)` | **Issue #27**<br>`priority:high`, `sprint:1`, `role:tester` | **Task ID:** `S1-TST-04`<br>**Role:** Tester \| **Assignee:** Redge Rainier Sarmiento \| **Due:** Week 2, Sprint Day 9<br>**Description:** Test permission matrix across roles (superadmin, admin, user) ensuring menus, buttons, and endpoints enforce assigned rights. | **Task ID:** `S1-TST-04` \| **Sprint:** Sprint 1 \| **Author:** Redge Rainier D. Sarmiento \| **Closes Issue:** `#27`<br>- Implemented deliverables for **[S1-TST-04] Permission matrix tests (superadmin/admin/user x each right)**<br>- `backend/test scripts/Permission Matrix tests.js` |
| **#51** | `sarmientoredge11`<br>*(Redge Rainier D. Sarmiento)* | `feature/S1-TST-03-user-management-tests` | `[S1-TST-03] Test cases: User Management (add, edit, block/unblock, approve, designate admin; last-superadmin guard)` | **Issue #26**<br>`priority:high`, `sprint:1`, `role:tester` | **Task ID:** `S1-TST-03`<br>**Role:** Tester \| **Assignee:** Redge Rainier Sarmiento \| **Due:** Week 2, Sprint Day 8<br>**Description:** Test user CRUD operations, block/unblock states, admin role designation, and verify that the last Superadmin cannot be demoted or disabled. | **Task ID:** `S1-TST-03` \| **Sprint:** Sprint 1 \| **Author:** Redge Rainier D. Sarmiento \| **Closes Issue:** `#26`<br>- Implemented deliverables for **[S1-TST-03] Test cases: User Management (add, edit, block/unblock, approve, designate admin; last-superadmin guard)**<br>- `backend/test scripts/User Management tests.js` |
| **#50** | `sarmientoredge11`<br>*(Redge Rainier D. Sarmiento)* | `feature/S1-TST-02-auth-test-cases` | `[S1-TST-02] Test cases: register, login and logout, set and reset password (expired and reused token)` | **Issue #25**<br>`priority:high`, `sprint:1`, `role:tester` | **Task ID:** `S1-TST-02`<br>**Role:** Tester \| **Assignee:** Redge Rainier Sarmiento \| **Due:** Week 2, Sprint Day 7<br>**Description:** Execute and automate test cases: registration validation, session login and logout, and password reset (verifying expired and reused token prevention). | **Task ID:** `S1-TST-02` \| **Sprint:** Sprint 1 \| **Author:** Redge Rainier D. Sarmiento \| **Closes Issue:** `#25`<br>- Implemented deliverables for **[S1-TST-02] Test cases: register, login and logout, set and reset password (expired and reused token)**<br>- `backend/test scripts/Register test.js`, `Registration Validation tests.js`, `Login test.js`, `Log in log out test.js` |
| **#49** | `sarmientoredge11`<br>*(Redge Rainier D. Sarmiento)* | `feature/S1-TST-01-test-plan` | `[S1-TST-01] Sprint 1 test plan and acceptance criteria` | **Issue #24**<br>`priority:high`, `sprint:1`, `role:tester` | **Task ID:** `S1-TST-01`<br>**Role:** Tester \| **Assignee:** Redge Rainier Sarmiento \| **Due:** Week 1, Sprint Day 3<br>**Description:** Define Sprint 1 test plan, acceptance criteria, and test scenarios across authentication and user management. | **Task ID:** `S1-TST-01` \| **Sprint:** Sprint 1 \| **Author:** Redge Rainier D. Sarmiento \| **Closes Issue:** `#24`<br>- Implemented deliverables for **[S1-TST-01] Sprint 1 test plan and acceptance criteria**<br>- `backend/src/test/java/top/gnon/backend/BackendApplicationTests.java`<br>- `docs/sprint-1/S1-TST-01-test-plan.md` |
| **#48** | `PhilHitalia`<br>*(Phil Emmanuel Hitalia)* | `feature/S1-UIX-01-design-system` | `[S1-UIX-04] Hi-fi mockups and developer handoff notes` | **Issue #22**<br>`priority:high`, `sprint:1`, `role:ui/ux` | **Task ID:** `S1-UIX-04`<br>**Role:** UI/UX Designer \| **Assignee:** Phil Emmanuel Hitalia \| **Due:** Week 2, Sprint Day 6<br>**Description:** High-fidelity mockups for main page, User Management, Rights dialog, read-only role badge, and developer handoff notes. | **Task ID:** `S1-UIX-04` \| **Sprint:** Sprint 1 \| **Author:** Phil Emmanuel Hitalia \| **Closes Issue:** `#22`<br>- Added `docs/ui design/Hi-fi mockup 1.md`<br>- `CustomersPage.tsx`, `ProductsPage.tsx`, `HumanResourcesPage.tsx`, `SalesPage.tsx`, `ReportsPage.tsx` |
| **#47** | `JoeAndreRoja`<br>*(Joe Andre Roja)* | `feature/S1-SM-05-sprint-review` | `[S1-SM-05] Sprint 1 review and retrospective report` | **Issue #4**<br>`priority:low`, `sprint:1`, `role:scrum-master` | **Task ID:** `S1-SM-05`<br>**Role:** Scrum Master \| **Assignee:** Joe Andre Roja \| **Due:** Week 2, Sprint Day 10<br>**Description:** Document Sprint 1 review, retrospective summary report, and prepare Sprint 2 backlog items. | **Task ID:** `S1-SM-05` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#4`<br>- Implemented deliverables for **[S1-SM-05] Sprint 1 review and retrospective report**<br>- `frontend/public/favicon.svg`<br>- `docs/sprint-1/S1-SM-05-retrospective.md` |
| **#46** | `PhilHitalia`<br>*(Phil Emmanuel Hitalia)* | `feature/S1-UIX-01-design-system` | `Add modal components for record deletion and empty state handling` | *(Supporting PR for UIX)* | — | **Sprint:** Sprint 1 \| **Author:** Phil Emmanuel Hitalia<br>- `EmptyState.tsx`, `EntityControls.tsx`, `ConfirmDeleteModal.tsx`, `BlockedDeleteModal.tsx`, `AuditLogPage.tsx` |
| **#45** | `GN68`<br>*(Marc Ramirez)* | `feature/S1-DBA-06-audit-user-logging` | `[S1-DBA-06] Make audit_user() record the logged-in user in audit_log; test it` | **Issue #10**<br>`priority:medium`, `sprint:1`, `role:dba` | **Task ID:** `S1-DBA-06`<br>**Role:** DB Admin \| **Assignee:** Marc Miguel Ramirez \| **Due:** Week 2, Sprint Day 8<br>**Description:** Configure audit triggers and functions to record the authenticated user and operation details into audit_log. | **Task ID:** `S1-DBA-06` \| **Sprint:** Sprint 1 \| **Author:** Marc Ramirez \| **Closes Issue:** `#10`<br>- Implemented deliverables for **[S1-DBA-06] Make audit_user() record the logged-in user in audit_log; test it**<br>- `backend/src/main/resources/db/migration/V6__relax_audit_log_action_check.sql` |
| **#44** | `GN68`<br>*(Marc Ramirez)* | `feature/S1-DBA-05-seed-superadmins` | `[S1-DBA-05] Seed data: one superadmin account per team member, modules, and per-action rights` | **Issue #9**<br>`priority:high`, `sprint:1`, `role:dba` | **Task ID:** `S1-DBA-05`<br>**Role:** DB Admin \| **Assignee:** Marc Miguel Ramirez \| **Due:** Week 1, Sprint Day 5<br>**Description:** Seed data for the 5 team members as approved Superadmins, system module catalog, and 36 per-action rights. | **Task ID:** `S1-DBA-05` \| **Sprint:** Sprint 1 \| **Author:** Marc Ramirez \| **Closes Issue:** `#9`<br>- Implemented deliverables for **[S1-DBA-05] Seed data: one superadmin account per team member, modules, and per-action rights**<br>- `backend/src/main/resources/db/migration/V5__seed_team_superadmins.sql` |
| **#43** | `GN68`<br>*(Marc Ramirez)* | `feature/S1-DBA-04-reset-token-table` | `[S1-DBA-04] Migration: password reset token table (hashed, expiry, used flag)` | **Issue #8**<br>`priority:medium`, `sprint:1`, `role:dba` | **Task ID:** `S1-DBA-04`<br>**Role:** DB Admin \| **Assignee:** Marc Miguel Ramirez \| **Due:** Week 1, Sprint Day 5<br>**Description:** Create password_reset_token table with token hash, expiration timestamp, and single-use flag. | **Task ID:** `S1-DBA-04` \| **Sprint:** Sprint 1 \| **Author:** Marc Ramirez \| **Closes Issue:** `#8`<br>- Implemented deliverables for **[S1-DBA-04] Migration: password reset token table (hashed, expiry, used flag)**<br>- `backend/src/main/resources/db/migration/V3__permissions_and_reset_token.sql` |
| **#42** | `EuresTinoco`<br>*(Eures Nivrem Tinoco)* | `feature/S1-DEV-04-reset-password` | `[S1-DEV-04] Reset password: request, emailed token, reset form` | **Issue #14**<br>`priority:medium`, `role:developer`, `sprint:1` | **Task ID:** `S1-DEV-04`<br>**Role:** Developer \| **Assignee:** Eures Nivrem Tinoco \| **Due:** Week 2, Sprint Day 7<br>**Description:** Password reset workflow: reset token request endpoint, token verification, URL deep-linking (?token=), and set-new-password form. | **Task ID:** `S1-DEV-04` \| **Sprint:** Sprint 1 \| **Author:** EuresTinoco \| **Closes Issue:** `#14`<br>- Implemented deliverables for **[S1-DEV-04] Reset password: request, emailed token, reset form**<br>- `AuthController.java`, `frontend/src/lib/api.ts`, `frontend/src/App.tsx` |
| **#41** | `JoeAndreRoja`<br>*(Joe Andre Roja)* | `feature/S1-SM-04-mid-sprint-check` | `[S1-SM-04] Mid-sprint check notes and impediment log` | **Issue #3**<br>`priority:medium`, `sprint:1`, `role:scrum-master` | **Task ID:** `S1-SM-04`<br>**Role:** Scrum Master \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Conduct mid-sprint review, record impediment log, and track sprint progress. | **Task ID:** `S1-SM-04` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#3`<br>- Implemented deliverables for **[S1-SM-04] Mid-sprint check notes and impediment log**<br>- `backend/.gitattributes`, `backend/.gitignore`, `docs/sprint-1/S1-SM-04-impediment-log.md` |
| **#40** | `GN68`<br>*(Marc Ramirez)* | `feature/S1-DBA-03-roles-and-permissions-schema` | `[S1-DBA-03] Migration: app_user (role, blocked flag), role, module, rights catalogue, user_permission` | **Issue #7**<br>`priority:high`, `sprint:1`, `role:dba` | **Task ID:** `S1-DBA-03`<br>**Role:** DB Admin \| **Assignee:** Marc Miguel Ramirez \| **Due:** Week 1, Sprint Day 4<br>**Description:** Schema migrations for app_user (role column with checks, blocked flag) and user_permission table with soft delete support. | **Task ID:** `S1-DBA-03` \| **Sprint:** Sprint 1 \| **Author:** Marc Ramirez \| **Closes Issue:** `#7`<br>- Implemented deliverables for **[S1-DBA-03] Migration: app_user (role, blocked flag), role, module, rights catalogue, user_permission**<br>- `V2__add_role_to_app_user.sql`, `V4__add_user_profile_names.sql` |
| **#39** | `EuresTinoco`<br>*(Eures Nivrem Tinoco)* | `feature/S1-DEV-03-login-logout-session` | `[S1-DEV-03] Login and logout with session handling; password hashing; blocked users cannot sign in` | **Issue #13**<br>`priority:high`, `role:developer`, `sprint:1` | **Task ID:** `S1-DEV-03`<br>**Role:** Developer \| **Assignee:** Eures Nivrem Tinoco \| **Due:** Week 2, Sprint Day 6<br>**Description:** Implement session-based login and logout with Spring Security, BCrypt hashing, and lockout for blocked/pending accounts. | **Task ID:** `S1-DEV-03` \| **Sprint:** Sprint 1 \| **Author:** EuresTinoco \| **Closes Issue:** `#13`<br>- Implemented deliverables for **[S1-DEV-03] Login and logout with session handling; password hashing; blocked users cannot sign in**<br>- `PasswordConfig.java`, `SecurityConfig.java`, `LoginRequest.java`, `AppUserDetailsService.java`, `AuthContext.tsx` |
| **#38** | `PhilHitalia`<br>*(Phil Emmanuel Hitalia)* | `feature/task-3-wireframes` | `[S1-UIX-03] Wireframes: main page, User Management list and Rights dialog` | **Issue #21**<br>`priority:medium`, `sprint:1`, `role:ui/ux` | **Task ID:** `S1-UIX-03`<br>**Role:** UI/UX Designer \| **Assignee:** Phil Emmanuel Hitalia \| **Due:** Week 1, Sprint Day 4<br>**Description:** Wireframes for main dashboard layout, navigation sidebar, User Management table, and Rights assignment dialog. | **Task ID:** `S1-UIX-03` \| **Sprint:** Sprint 1 \| **Author:** Phil Emmanuel Hitalia \| **Closes Issue:** `#21`<br>- Added `docs/ui/S1-UIX-03_Dashboard_User_Management.md` and sliced `.png` assets in `docs/ui/assets/` |
| **#37** | `PhilHitalia`<br>*(Phil Emmanuel Hitalia)* | `feature/S1-UIX-01-design-system` | `[S1-UIX-02] Wireframes: login, register, set/reset password` | **Issue #20**<br>`priority:medium`, `sprint:1`, `role:ui/ux` | **Task ID:** `S1-UIX-02`<br>**Role:** UI/UX Designer \| **Assignee:** Phil Emmanuel Hitalia \| **Due:** Week 1, Sprint Day 3<br>**Description:** Wireframes for authentication interfaces: sign in, registration, password reset request, and set new password views. | **Task ID:** `S1-UIX-02` \| **Sprint:** Sprint 1 \| **Author:** Phil Emmanuel Hitalia \| **Closes Issue:** `#20`<br>- Added `docs/ui/S1-UIX-02_Auth_Wireframes.md` and modal state `.png` assets |
| **#36** | `JoeAndreRoja`<br>*(Joe Andre Roja)* | `feature/S1-SM-03-working-agreement` | `[S1-SM-03] Team working agreement, Definition of Done, role guide` | **Issue #2**<br>`priority:high`, `sprint:1`, `role:scrum-master` | **Task ID:** `S1-SM-03`<br>**Role:** Scrum Master \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 2<br>**Description:** Define team working agreements, Definition of Done (DoD), and project role guide documentation. | **Task ID:** `S1-SM-03` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#2`<br>- Implemented deliverables for **[S1-SM-03] Team working agreement, Definition of Done, role guide**<br>- `frontend/AGENTS.md`, `frontend/CLAUDE.md`, `docs/sprint-1/S1-SM-03-working-agreement.md` |
| **#35** | `EuresTinoco`<br>*(Eures Nivrem Tinoco)* | `feature/S1-DEV-02-register-user-api` | `[S1-DEV-02] Register user form and API (new users start as pending)` | **Issue #12**<br>`priority:high`, `role:developer`, `sprint:1` | **Task ID:** `S1-DEV-02`<br>**Role:** Developer \| **Assignee:** Eures Nivrem Tinoco \| **Due:** Week 1, Sprint Day 4<br>**Description:** User registration form and backend API (/api/auth/register). Newly registered accounts start in PENDING approval status. | **Task ID:** `S1-DEV-02` \| **Sprint:** Sprint 1 \| **Author:** EuresTinoco \| **Closes Issue:** `#12`<br>- Implemented deliverables for **[S1-DEV-02] Register user form and API (new users start as pending)**<br>- `AppUser.java`, `UserRepository.java`, `RegisterRequest.java`, `AuthService.java` |
| **#34** | `GN68`<br>*(Marc Ramirez)* | `feature/S1-DBA-02-base-migration` | `[S1-DBA-02] Migration: HOPE base tables and sample data from HopeDB_audit.sql` | **Issue #6**<br>`priority:high`, `sprint:1`, `role:dba` | **Task ID:** `S1-DBA-02`<br>**Role:** DB Admin \| **Assignee:** Marc Miguel Ramirez \| **Due:** Week 1, Sprint Day 3<br>**Description:** Implement base schema tables (employee, department, job, customer, product, sales, payment, pricehist) and audit log table. | **Task ID:** `S1-DBA-02` \| **Sprint:** Sprint 1 \| **Author:** Marc Ramirez \| **Closes Issue:** `#6`<br>- Implemented deliverables for **[S1-DBA-02] Migration: HOPE base tables and sample data from HopeDB_audit.sql**<br>- `backend/src/main/resources/db/migration/V1__create_app_user.sql` |
| **#33** | `PhilHitalia`<br>*(Phil Emmanuel Hitalia)* | `feature/S1-UIX-01-design-system` | `[S1-UIX-01] Design system: colors, typography, core components` | **Issue #19**<br>`priority:high`, `sprint:1`, `role:ui/ux` | **Task ID:** `S1-UIX-01`<br>**Role:** UI/UX Designer \| **Assignee:** Phil Emmanuel Hitalia \| **Due:** Week 1, Sprint Day 2<br>**Description:** Establish design system colors, typography, and reusable core UI components (Button, Badge, Field, Icon, ModalShell). | **Task ID:** `S1-UIX-01` \| **Sprint:** Sprint 1 \| **Author:** Phil Emmanuel Hitalia \| **Closes Issue:** `#19`<br>- Implemented deliverables for **[S1-UIX-01] Design system: colors, typography, core components**<br>- `index.css`, `Badge.tsx`, `Button.tsx`, `Field.tsx`, `Icon.tsx`, `Logo.tsx`, `ModalShell.tsx`, `Stamp.tsx`, `AuthModal.tsx`, `LandingPage.tsx` |
| **#32** | `JoeAndreRoja`<br>*(Joe Andre Roja)* | `feature/S1-SM-02-sprint-board` | `[S1-SM-02] Sprint 1 board: stories with acceptance criteria; map all six guide modules` | **Issue #1**<br>`priority:high`, `sprint:1`, `role:scrum-master` | **Task ID:** `S1-SM-02`<br>**Role:** Scrum Master \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 1<br>**Description:** Set up Sprint 1 board with stories and acceptance criteria; map all guide modules to sprints within the 8-week limit. | **Task ID:** `S1-SM-02` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#1`<br>- Implemented deliverables for **[S1-SM-02] Sprint 1 board: stories with acceptance criteria; map all six guide modules**<br>- `frontend/.gitattributes`, `frontend/.gitignore`, `frontend/.mise.toml`, `docs/sprint-1/S1-SM-02-sprint-board.md` |
| **#31** | `GN68`<br>*(Marc Ramirez)* | `feature/S1-DBA-01-db-setup` | `[S1-DBA-01] Team database setup, migration runner script, and student setup README (no Docker)` | **Issue #5**<br>`priority:high`, `sprint:1`, `role:dba` | **Task ID:** `S1-DBA-01`<br>**Role:** DB Admin \| **Assignee:** Marc Miguel Ramirez \| **Due:** Week 1, Sprint Day 2<br>**Description:** Set up team database connection configuration, Flyway migration runner, and student setup documentation. | **Task ID:** `S1-DBA-01` \| **Sprint:** Sprint 1 \| **Author:** Marc Ramirez \| **Closes Issue:** `#5`<br>- Implemented deliverables for **[S1-DBA-01] Team database setup, migration runner script, and student setup README (no Docker)**<br>- `backend/src/main/resources/application.properties`, `backend/backup-pom.xml` |
| **#30** | `EuresTinoco`<br>*(Eures Nivrem Tinoco)* | `feature/S1-DEV-01-project-scaffold` | `[S1-DEV-01] Project scaffold: app skeleton, env config, DB connection` | **Issue #11**<br>`priority:high`, `role:developer`, `sprint:1` | **Task ID:** `S1-DEV-01`<br>**Role:** Developer \| **Assignee:** Eures Nivrem Tinoco \| **Due:** Week 1, Sprint Day 2<br>**Description:** Establish backend application skeleton, Spring Boot environment configuration, and database connection. | **Task ID:** `S1-DEV-01` \| **Sprint:** Sprint 1 \| **Author:** EuresTinoco \| **Closes Issue:** `#11`<br>- Implemented deliverables for **[S1-DEV-01] Project scaffold: app skeleton, env config, DB connection**<br>- `pom.xml`, `mvnw`, `BackendApplication.java`, `HelloController.java`, `DatabaseController.java` |

*(Note: Issue **#23** — `[S1-UIX-05] Usability review of built screens and fix list` assigned to `PhilHitalia` — was part of the `#1`–`#29` issue batch and was closed in PR #60).*
