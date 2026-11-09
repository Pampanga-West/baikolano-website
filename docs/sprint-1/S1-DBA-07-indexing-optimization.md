# S1-DBA-07: Database Indexing & Performance Tuning

## Overview
Guidelines and specifications for indexing high-throughput tables in PostgreSQL.

## Index Strategy
- Ensure unique index on `users.email` and `users.username`.
- B-tree indexing on foreign key columns (`role_id`, `user_id`) to accelerate join queries.
- Composite index on `audit_logs (created_at DESC, user_id)` for optimized chronological log audits.
