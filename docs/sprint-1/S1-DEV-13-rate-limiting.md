# S1-DEV-13: Add rate limiting helpers for authentication routes

## Overview
Implement in-memory rate limiting guards on sign-in and password reset endpoints to mitigate brute force attacks.

## Implementation Summary
- Added rate limiter helper and IP-based request throttling.
- Aligned with Sprint 1 standards and team DoD.
