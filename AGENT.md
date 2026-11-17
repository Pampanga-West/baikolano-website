# AGENT.md: Repository Agent Guidelines & Workflow

## Core Directive
All Antigravity / Gemini agents operating in this repository must execute code and documentation changes using the **Strict Issue + PR Workflow Pipeline** detailed below. Changes must **never** be committed directly to `main`, and **every** change must be accompanied by a corresponding **GitHub Issue** and **Pull Request** formatted with the committer's standardized task code:

```text
[S<sprint_number>-<ROLE>-<count>]
```

- **Current Active Sprint Number:** `2` (`S2`)
- Every requested modification must:
  1. Identify the active committer and compute their next `[S2-<ROLE>-<COUNT>]` task code.
  2. Create (or link an existing) GitHub Issue following the standardized **Issue Template**.
  3. Process changes on an isolated feature branch (`feature/S2-<ROLE>-<COUNT>-<short-description>`).
  4. Commit with `[S2-<ROLE>-<COUNT>] <Description>`.
  5. Push and open a Pull Request following the standardized **PR Template** that references and closes the Issue (`Closes #<issue_number>`).
  6. Merge the PR immediately and sync local `main` to avoid merge conflicts and satisfy project Issue & PR quota requirements.

---

## Team Member Role Codes & Sprint 2 Counter Tracker

Each team member's task code `[S2-<ROLE>-<COUNT>]` depends on who is committing (`gh api user --jq .login`). Always check the active GitHub CLI account and existing Issues/PRs to determine the next sequential `<COUNT>` (zero-padded to 2 digits: `01`, `02`, `03`, ...).

### 1. Committer Lookup Table

| GitHub Username (`gh`) | Team Member Name | Role Code | Role Title (Issue Body) | GitHub Role Label | Sprint 1 History | Sprint 2 Baseline (as of PR #124) | Next Sprint 2 Code |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GN68` | **Marc Miguel Ramirez** | `SM` *(or `DBA`)* | `Scrum Master` *(or `DB Admin`)* | `role:scrum-master` *(or `role:dba`)* | `S1-DBA-01`–`07`, `S1-SM-06` *(+ bulk `S1-DEV-09`–`20`)* | `S2-SM-01` / `S2-DBA-00` | `[S2-SM-02]` / `[S2-DBA-01]` |
| `JoeAndreRoja` | **Joe Andre Roja** | `DBA` *(or `SM`)* | `DB Admin` *(or `Scrum Master`)* | `role:dba` *(or `role:scrum-master`)* | `S1-SM-02`–`05` *(+ `S1-UIX` logos)* | `S2-DBA-00` / `S2-SM-00` | `[S2-DBA-01]` / `[S2-SM-01]` |
| `EuresTinoco` | **Eures Nivrem Tinoco** | `DEV` | `Developer` | `role:developer` | `S1-DEV-01`–`08` *(+ `09`–`20`)* | `S2-DEV-00` | `[S2-DEV-01]` |
| `PhilHitalia` | **Phil Emmanuel Hitalia** | `UIX` | `UI/UX Designer` | `role:ui/ux` | `S1-UIX-01`–`05` | `S2-UIX-00` | `[S2-UIX-01]` |
| `sarmientoredge11` | **Redge Rainier Sarmiento** | `TST` | `Tester` | `role:tester` | `S1-TST-01`–`06` | `S2-TST-01`–`06` *(+ `S3-TST-01`–`03`)* | `[S2-TST-07]` |

> **Note on `GN68` & `JoeAndreRoja` Role Swap:** In Sprint 1 Issues/PRs (#31–#63), `GN68` (Marc Miguel Ramirez) committed `DBA` tasks and `JoeAndreRoja` (Joe Andre Roja) committed `SM` tasks. In PR #106, their roles in `README.md` were swapped (`Marc Miguel Ramirez` -> `Scrum Master` / `SM`; `Joe Andre Roja` -> `DB Admin` / `DBA`). Either code (`SM` or `DBA`) is valid for these two accounts based on the nature of the task—always query GitHub dynamically using the snippet below so counts never collide.

### 2. Automatic Next-Count Detection Snippet
Before creating an Issue or branch, run this command to dynamically verify the active GitHub user and find the next available `S2-<ROLE>-<COUNT>` across all remote Issues and PRs:

```bash
python3 - << 'EOF'
import json, re, subprocess

login = subprocess.check_output(["gh", "api", "user", "--jq", ".login"], text=True).strip()
role_map = {
    "GN68": ("SM", "Scrum Master", "Marc Miguel Ramirez", "role:scrum-master"),
    "JoeAndreRoja": ("DBA", "DB Admin", "Joe Andre Roja", "role:dba"),
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

## Standardized Issue, Branch, Commit & PR Templates

All future workflows **must** use these exact templates derived from the repository's Sprint 1 & Sprint 2 Issue/PR conventions:

### 1. GitHub Issue Template
- **Issue Title:**
  ```text
  [S2-<ROLE>-<COUNT>] <Short imperative task title>
  ```
- **Issue Labels:**
  `sprint:2`, `priority:medium` *(or `priority:high` / `priority:low`)*, `<role_label>` *(e.g. `role:developer`, `role:ui/ux`, `role:dba`, `role:scrum-master`, `role:tester`)*
- **Issue Body:**
  ```markdown
  ### Task ID: S2-<ROLE>-<COUNT>
  **Role:** <Role Title> | **Assignee:** <Full Name> | **Due:** Week 3, Sprint Day 5

  ### Description:
  <Clear description of the feature, fix, test suite, schema change, or documentation update.>
  ```

### 2. Feature Branch Template
- **Format:**
  ```text
  feature/S2-<ROLE>-<COUNT>-<kebab-case-short-description>
  ```
- **Examples:**
  - `feature/S2-DEV-01-customer-crud-validation`
  - `feature/S2-UIX-01-dark-mode-polish`
  - `feature/S2-DBA-01-price-history-indexes`
  - `feature/S2-SM-01-agent-issue-pr-templates`
  - `feature/S2-TST-07-sales-module-tests`

### 3. Commit Message Template
- **Format:**
  ```text
  [S2-<ROLE>-<COUNT>] <Brief imperative description of changes>
  ```

### 4. Pull Request Template
- **PR Title:**
  ```text
  [S2-<ROLE>-<COUNT>] <Short imperative task title>
  ```
- **PR Body:**
  ```markdown
  ## Sprint Task Reference
  - **Task ID:** [S2-<ROLE>-<COUNT>]
  - **Sprint:** Sprint 2
  - **Author:** <Full Name>
  - **Closes Issue:** #<issue_number>

  ## Summary of Changes
  - Implemented deliverables for **[S2-<ROLE>-<COUNT>] <Short imperative task title>**
  - <Summary bullet 1 / modified file paths>
  - <Summary bullet 2>

  ## Verification
  - Frontend build / lint verified
  - Zero merge conflicts
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
  --label "sprint:2,priority:medium,<role_label>" \
  --body "### Task ID: S2-<ROLE>-<COUNT>
**Role:** <Role Title> | **Assignee:** <Full Name> | **Due:** Week 3, Sprint Day 5

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
git commit -m "[S2-<ROLE>-<COUNT>] <Brief imperative description of changes>"
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
- **Task ID:** [S2-<ROLE>-<COUNT>]
- **Sprint:** Sprint 2
- **Author:** <Full Name>
- **Closes Issue:** #<issue_number>

## Summary of Changes
- Implemented deliverables for **[S2-<ROLE>-<COUNT>] <Task Title>**
- <Summary bullet 1>
- <Summary bullet 2>

## Verification
- Frontend build / lint verified
- Zero merge conflicts"
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
2. **Mandatory Issue + PR Pairing**: Always create or link a `[S2-<ROLE>-<COUNT>]` GitHub Issue before submitting the Pull Request so the board and PR history stay synchronized.
3. **Autonomous Conflict Resolution**: Always resolve git conflicts silently and independently. Never burden the user with merge resolutions.
4. **Never Commit Directly to Main**: All code, docs, and configurations must go through a feature branch and merged PR.
5. **Handle Transient Network Glitches**: If a network timeout occurs during `git push` or `gh` commands, retry with exponential backoff (e.g., 2–4s delay) or use `gh api` REST endpoints.
6. **Preserve Tech Stack Integrity**:
   - The application is a **Vite + React + TypeScript + Tailwind CSS** frontend directly integrating with **Supabase PostgreSQL**.
   - No legacy Java/Spring backend files should be restored or referenced.
7. **Clean Working Tree**: Ensure `git status` is clean before and after every turn.

---

## Reference Archive: Pull Requests (#59–#124) & Corresponding GitHub Issues

Below is the complete historical reference of all Pull Requests starting from **PR #59** alongside their branch names, authors, PR titles/bodies, and corresponding GitHub Issues.

### Part A: Issue-Linked Sprint PRs (#59–#99)

| PR # | Author (`gh`) | Branch Name (`headRefName`) | PR & Issue Title | Linked Issue # & Labels | Issue Body (`Task ID`, `Role`, `Assignee`, `Due`, `Description`) | PR Body Summary |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **#59** | `EuresTinoco` | `feature/S1-DEV-08-main-page-permissions` | `[S1-DEV-08] Main page: sidebar and module tiles by role and rights, plus server-side permission check` | **Issue #18** (`priority:high`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-08`<br>**Role:** Developer \| **Assignee:** Eures Nivrem Tinoco \| **Due:** Week 2, Sprint Day 9<br>**Description:** Main workspace layout: sidebar and dashboard module tiles rendered according to authenticated role, plus server-side permission checks. | **Task ID:** `S1-DEV-08` \| **Sprint:** Sprint 1 \| **Author:** EuresTinoco \| **Closes Issue:** `#18` (`#59` in text)<br>- Implemented deliverables for `[S1-DEV-08]` (`WorkspaceLayout.tsx`, `DashboardPage.tsx`) |
| **#60** | `PhilHitalia` | `feature/S1-UIX-01-design-system` | `[S1-UIX-05] Usability review of built screens and fix list` | **Issue #23** (`priority:low`, `sprint:1`, `role:ui/ux`) | **Task ID:** `S1-UIX-05`<br>**Role:** UI/UX Designer \| **Assignee:** Phil Emmanuel Hitalia \| **Due:** Week 2, Sprint Day 9<br>**Description:** Conduct usability review of built screens, verify role display clarity, layout responsiveness, and document styling fix list. | **Task ID:** `S1-UIX-05` \| **Sprint:** Sprint 1 \| **Author:** Phil Emmanuel Hitalia \| **Closes Issue:** `#23`<br>- Added formal Sprint 1 Usability Review document (`sprint1-ui-ux-usability-review.md`) |
| **#62** | `JoeAndreRoja` | `feature/S1-SM-04-mid-sprint-check` | `[S1-SM-04] Mid-sprint check notes and impediment log` | **Issue #3** (`priority:medium`, `sprint:1`, `role:scrum-master`) | **Task ID:** `S1-SM-04`<br>**Role:** Scrum Master \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Conduct mid-sprint review, record impediment log, and track sprint progress. | **Task ID:** `[S1-SM-04]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#3` |
| **#63**<br>*(#64, #65)* | `JoeAndreRoja` | `feature/S1-SM-05-sprint-review` | `[S1-SM-05] Sprint 1 review and retrospective report` | **Issue #4** (`priority:low`, `sprint:1`, `role:scrum-master`) | **Task ID:** `S1-SM-05`<br>**Role:** Scrum Master \| **Assignee:** Joe Andre Roja \| **Due:** Week 2, Sprint Day 10<br>**Description:** Document Sprint 1 review, retrospective summary report, and prepare Sprint 2 backlog items. | **Task ID:** `[S1-SM-05]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#4` *(PR #64 reverted #63; PR #65 restored #63)* |
| **#68** | `GN68` | `feature/S1-TST-02-auth-test-suites` | `[S1-TST-02] Authentication and session test suite expansion` | **Issue #67** (`priority:medium`, `sprint:1`, `role:tester`) | **Task ID:** `S1-TST-02`<br>**Role:** Tester \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Expand test cases covering session invalidation, concurrent logins, and token expiration handling. | **Task ID:** `[S1-TST-02]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#67`<br>- Added integration test documentation and test scenarios for authentication flows. |
| **#70** | `GN68` | `feature/S1-DEV-05-input-sanitization` | `[S1-DEV-05] Implement input sanitization and payload validation` | **Issue #69** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-05`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Add input validation and sanitization rules for user management and authentication payloads. | **Task ID:** `[S1-DEV-05]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#69`<br>- Implemented payload sanitization standards and documentation. |
| **#72** | `GN68` | `feature/S1-UIX-02-accessibility-enhancements` | `[S1-UIX-02] Accessibility attributes and contrast adjustments` | **Issue #71** (`priority:medium`, `sprint:1`, `role:ui/ux`) | **Task ID:** `S1-UIX-02`<br>**Role:** UI/UX Designer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Improve ARIA labels, keyboard navigation focus rings, and contrast ratios across authentication modals. | **Task ID:** `[S1-UIX-02]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#71`<br>- Enhanced accessibility in modal components with aria-labels. |
| **#74** | `GN68` | `feature/S1-DBA-07-indexing-optimization` | `[S1-DBA-07] Add database index documentation and migration notes` | **Issue #73** (`priority:low`, `sprint:1`, `role:dba`) | **Task ID:** `S1-DBA-07`<br>**Role:** Database Admin \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Document database indexes and add schema performance tuning guidelines. | **Task ID:** `[S1-DBA-07]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#73`<br>- Documented key database indexing strategies and tuning guidelines. |
| **#76** | `GN68` | `feature/S1-SM-06-sprint-velocity-metrics` | `[S1-SM-06] Sprint 1 velocity tracking and burndown summary` | **Issue #75** (`priority:medium`, `sprint:1`, `role:scrum-master`) | **Task ID:** `S1-SM-06`<br>**Role:** Scrum Master \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Document sprint 1 velocity, completion metrics, and burndown chart analysis. | **Task ID:** `[S1-SM-06]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#75`<br>- Added Sprint 1 velocity metrics and burndown analysis. |
| **#78** | `GN68` | `feature/S1-DEV-09-standardize-api-error-responses` | `[S1-DEV-09] Standardize API error response format` | **Issue #77** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-09`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Define consistent JSON payload structure for REST API error responses including code, message, and timestamp. | **Task ID:** `[S1-DEV-09]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#77`<br>- Standardized error response payload schema across controllers. |
| **#80** | `GN68` | `feature/S1-DEV-10-cors-and-origin-policy` | `[S1-DEV-10] Configure CORS and allowed origin policies` | **Issue #79** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-10`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Establish strict CORS origin whitelist and allowed headers configuration for web clients. | **Task ID:** `[S1-DEV-10]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#79`<br>- Configured CORS origin restrictions and security headers. |
| **#82** | `GN68` | `feature/S1-DEV-11-secure-cookie-flags` | `[S1-DEV-11] Enforce Secure and HttpOnly cookie flags` | **Issue #81** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-11`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Ensure session cookies are issued with HttpOnly, Secure, and SameSite=Lax flags by default. | **Task ID:** `[S1-DEV-11]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#81`<br>- Enforced HttpOnly and SameSite cookie attributes. |
| **#84** | `GN68` | `feature/S1-DEV-12-password-complexity-rules` | `[S1-DEV-12] Implement password complexity validation` | **Issue #83** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-12`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Add password validator requiring minimum length, uppercase, lowercase, numbers, and symbols. | **Task ID:** `[S1-DEV-12]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#83`<br>- Added password complexity checks and validation error messaging. |
| **#86** | `GN68` | `feature/S1-DEV-13-rate-limiting-auth-endpoints` | `[S1-DEV-13] Add rate limiting helpers for authentication routes` | **Issue #85** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-13`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Implement in-memory rate limiting guards on sign-in and password reset endpoints to mitigate brute force attacks. | **Task ID:** `[S1-DEV-13]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#85`<br>- Added rate limiter helper and IP-based request throttling. |
| **#88** | `GN68` | `feature/S1-DEV-14-session-renewal-mechanism` | `[S1-DEV-14] Implement sliding session renewal logic` | **Issue #87** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-14`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Refresh session expiration timestamp on active user API requests. | **Task ID:** `[S1-DEV-14]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#87`<br>- Implemented sliding session activity extension logic. |
| **#90** | `GN68` | `feature/S1-DEV-15-user-status-filter-helper` | `[S1-DEV-15] Add user status filtering query utility` | **Issue #89** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-15`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Create reusable query builder helper to filter users by Active, Pending, and Suspended states. | **Task ID:** `[S1-DEV-15]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#89`<br>- Added user status filtering utility functions. |
| **#92** | `GN68` | `feature/S1-DEV-16-avatar-upload-validator` | `[S1-DEV-16] Implement profile avatar size and MIME validator` | **Issue #91** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-16`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Validate uploaded avatar file sizes under 2MB and restrict formats to JPEG, PNG, and WebP. | **Task ID:** `[S1-DEV-16]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#91`<br>- Added MIME type and file size validation for profile images. |
| **#94** | `GN68` | `feature/S1-DEV-17-phone-number-sanitizer` | `[S1-DEV-17] Add phone number normalization and formatting helper` | **Issue #93** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-17`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Standardize phone number inputs to E.164 international format before database persistence. | **Task ID:** `[S1-DEV-17]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#93`<br>- Added E.164 phone normalization and validation helper. |
| **#96** | `GN68` | `feature/S1-DEV-18-email-verification-token-helper` | `[S1-DEV-18] Implement email verification token generator` | **Issue #95** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-18`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Generate cryptographically secure tokens for email activation workflows. | **Task ID:** `[S1-DEV-18]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#95`<br>- Implemented secure random token generation for account verification. |
| **#98** | `GN68` | `feature/S1-DEV-19-jwt-claims-parser-utility` | `[S1-DEV-19] Create JWT claims parser and audience check` | **Issue #97** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-19`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Add token claim inspection helper to verify audience, issuer, and expiration timestamps. | **Task ID:** `[S1-DEV-19]` \| **Sprint:** Sprint 1 \| **Author:** Joe Andre Roja \| **Closes Issue:** `#97`<br>- Added JWT claims extraction and validation helpers. |
| *(N/A)* | `GN68` | *(Issue #99 only)* | `[S1-DEV-20] Add active session count monitoring query` | **Issue #99** (`priority:medium`, `role:developer`, `sprint:1`) | **Task ID:** `S1-DEV-20`<br>**Role:** Developer \| **Assignee:** Joe Andre Roja \| **Due:** Week 1, Sprint Day 5<br>**Description:** Implement repository query to retrieve count of concurrent active user sessions. | *(Closed issue without separate PR)* |

### Part B: Additional PRs (#61, #66, #100–#124)

| PR # | Author (`gh`) | Branch Name (`headRefName`) | PR Title | Task Code | PR Body Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **#61** | `PhilHitalia` | `feature/S1-UIX-01-design-system` | `update agents description and README` | — | Updated agents role description and README project overview. |
| **#66** | `PhilHitalia` | `feature/S1-UIX-01-design-system` | `Update README` | — | Updated `README.md`. |
| **#100** | `GN68` | `future` | `[S6-SVN-67] I am about to pluh fix comflict ball` | `S6-SVN-67` | Merge conflict resolution test PR. |
| **#101** | `GN68` | `feature/agent-guidelines-pr-workflow` | `docs: add AGENT.md guidelines for automated PR workflow` | — | Added initial `AGENT.md` defining automated PR workflow. |
| **#102** | `GN68` | `feature/agent-autonomous-conflict-resolution` | `docs(agent): add autonomous merge conflict resolution instructions` | — | Added autonomous merge conflict resolution rules to `AGENT.md`. |
| **#103** | `EuresTinoco` | `feature/S1-DEV-update-backend-role` | `docs: update Eures Tinoco role to BackEnd in README` | — | Updated Eures Nivrem Tinoco role to BackEnd in `README.md`. |
| **#104** | `PhilHitalia` | `feature/docs-update-readme-role` | `docs: update Phil Emmanuel Hitalia role to Frontend in README` | — | Updated Phil Emmanuel Hitalia role to Frontend in `README.md`. |
| **#105** | `sarmientoredge11` | `feature/TST-update-role-readme` | `docs(readme): update role to Master Tester` | — | Updated Redge Rainier Sarmiento role in `README.md`. |
| **#106** | `JoeAndreRoja` | `feature/S1-DOC-swap-roles-readme` | `docs: swap roles for Joe Andre Roja and Marc Miguel Ramirez` | — | Swapped roles in `README.md`: Joe Andre Roja (DB Admin) and Marc Miguel Ramirez (Scrum Master). |
| **#107** | `JoeAndreRoja` | `feature/S1-DOC-swap-names-readme` | `docs: place Scrum Master on top in README members table` | — | Reordered `README.md` table so Scrum Master is on top. |
| **#108** | `sarmientoredge11` | `feature/TST-role-to-tester` | `docs(readme): change role to Tester` | — | Updated Redge Rainier Sarmiento role to Tester in `README.md`. |
| **#109** | `sarmientoredge11` | `feature/docs-readme-project-description` | `docs(readme): add neatly designed website description and overview` | — | Added HOPE ERP Platform overview, tech stack, and setup guide in `README.md`. |
| **#110** | `JoeAndreRoja` | `feature/S1-UIX-clash-bowler-logo` | `feat(ui): update website logo and favicon to Clash of Clans Bowler` | — | Updated `Logo.tsx`, `index.html`, and `favicon.svg` with Bowler assets. |
| **#111** | `sarmientoredge11` | `feature/docs-readme-live-link` | `docs(readme): add direct website link to live deployment` | — | Added live Vercel deployment link badge to `README.md`. |
| **#112** | `JoeAndreRoja` | `feature/S1-UIX-charlie-kirk-logo` | `feat(ui): update website logo and favicon to Charlie Kirk` | — | Updated `Logo.tsx`, `index.html`, and `favicon.svg` with Charlie Kirk avatar. |
| **#113** | `PhilHitalia` | `feature/profile-preferences-theme` | `feat(profile): add theme preferences with light and dark mode` | — | Added `ThemeContext.tsx`, light/dark mode support, and `ProfilePage.tsx` appearance controls. |
| **#114** | `sarmientoredge11` | `feature/S2-TST-01-customer-test-cases` | `[S2-TST-01] Test cases: customer module` | `S2-TST-01` | Added `docs/sprint-2/S2-TST-01-customer-test-cases.md`. |
| **#115** | `JoeAndreRoja` | `feature/S1-UIX-kirk-tagline` | `feat(ui): update landing hero tagline to 'Run your entire business with Kirk.'` | — | Updated hero tagline in `LandingPage.tsx`. |
| **#116** | `sarmientoredge11` | `feature/S2-TST-02-product-price-history-tests` | `[S2-TST-02] Test cases: product and price history` | `S2-TST-02` | Added `docs/sprint-2/S2-TST-02-product-price-history-tests.md`. |
| **#117** | `sarmientoredge11` | `feature/S2-TST-03-soft-delete-restore-tests` | `[S2-TST-03] Test cases: soft delete and restore with child dependency checks` | `S2-TST-03` | Added `docs/sprint-2/S2-TST-03-soft-delete-restore-tests.md`. |
| **#118** | `sarmientoredge11` | `feature/S2-TST-04-permission-tests` | `[S2-TST-04] Per-right permission tests for customer and product modules` | `S2-TST-04` | Added `docs/sprint-2/S2-TST-04-permission-tests.md`. |
| **#119** | `sarmientoredge11` | `feature/S2-TST-05-sprint-1-regression-tests` | `[S2-TST-05] Regression test of Sprint 1` | `S2-TST-05` | Added `docs/sprint-2/S2-TST-05-sprint-1-regression-tests.md`. |
| **#120** | `sarmientoredge11` | `feature/S2-TST-06-bug-reports-and-verification` | `[S2-TST-06] Bug reports and fix verification` | `S2-TST-06` | Added `docs/sprint-2/S2-TST-06-bug-verification-report.md`. |
| **#121** | `PhilHitalia` | `feature/dark-mode-contrast-and-default-theme` | `fix(theme): default to light mode and enhance text contrast across themes` | — | Enforced default light mode and improved dark mode contrast in `index.css` & `ProfilePage.tsx`. |
| **#122** | `sarmientoredge11` | `feature/S3-TST-01-department-job-tests` | `[S3-TST-01] Test cases: department and job` | `S3-TST-01` | Added `docs/sprint-3/S3-TST-01-department-job-tests.md`. |
| **#123** | `sarmientoredge11` | `feature/S3-TST-02-employee-tests` | `[S3-TST-02] Test cases: employee` | `S3-TST-02` | Added `docs/sprint-3/S3-TST-02-employee-tests.md`. |
| **#124** | `sarmientoredge11` | `feature/S3-TST-03-job-history-tests` | `[S3-TST-03] Job history tests (effective date, salary)` | `S3-TST-03` | Added `docs/sprint-3/S3-TST-03-job-history-tests.md`. |
