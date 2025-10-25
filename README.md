# Sub-Tracker

Lightweight subscription tracking API built with Express and Mongoose.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Secrets & Git](#secrets--git-do-not-commit-secrets)
- [Install & Run](#install--run)
- [API Endpoints](#api-endpoints)
- [Request Examples](#request-examples)
- [Data Model (Subscription)](#data-model-subscription)
- [Troubleshooting & Tips](#troubleshooting--tips)
- [Contributing](#contributing)
- [License](#license)

## Features
- Create, read, update, delete subscriptions
- Cancel subscriptions
- Query upcoming renewals (public endpoint)
- Ownership checks so users only access their own data

## Prerequisites
- Node.js (>= 16)
- MongoDB (local or hosted)
- npm or yarn

## Environment Variables
Create a `.env` or similar config with at least:
- MONGO_URI=your_mongo_connection_string
- PORT=3000
- JWT_SECRET=your_jwt_secret
- SERVER_URL=https://your-server.example.com
- (Optional) UPSTASH / workflow config used by your project

Do not commit secrets.

## Secrets & Git (do NOT commit secrets)

- Add local secrets to `.env` only. This repo includes a `.env.example` with placeholder values — copy it to `.env` and fill real values locally.
- Ensure `.gitignore` contains `.env` and related patterns (already added).

If you have already committed secrets
1. Remove the files and force-push cleaned history (note: this rewrites history):
   - Quick remove from current commit:
     - git rm --cached .env
     - git commit -m "remove .env"
     - git push origin main
   - To purge from history use BFG or git-filter-repo (recommended):
     - BFG example:
       - Install BFG (https://rtyley.github.io/bfg-repo-cleaner/)
       - bfg --delete-files .env
       - git reflog expire --expire=now --all && git gc --prune=now --aggressive
       - git push --force
2. Rotate any exposed credentials immediately (change API keys, DB passwords, JWT secrets).
3. Enable repository secret scanning (GitHub) and add secrets to your CI/CD provider (GitHub Actions Secrets, etc.), not to the repo.

Best practices
- Never commit real keys — use environment variables, CI secrets, or a secrets manager (HashiCorp Vault, AWS Secrets Manager, GitHub Secrets).
- Add automated checks (git-secrets, pre-commit hooks) or use CI-based secret scanning for extra safety.

## Install & Run
1. Install deps:
   - npm install
2. Run (development):
   - npm run dev
3. Build / start (production):
   - npm start

## API Endpoints (base: `/api/v1/subscriptions`)
- GET /  
  - Description: Get all subscriptions (requires auth)
- GET /upcoming-renewals  
  - Description: Public — returns subscriptions with `renewalDate` later than now. Optional query: `?user=<userId>` to filter.
- GET /:id  
  - Description: Get subscription details (requires auth; owner only)
- POST /  
  - Description: Create subscription (requires auth). Server sets `user` from token.
- POST /:id  
  - Description: Update subscription (requires auth; owner only). (Note: endpoint uses POST in this project)
- DELETE /:id  
  - Description: Delete subscription (requires auth; owner only)
- GET /user/:id  
  - Description: Get all subscriptions for a user (requires auth; must match requesting user)
- PUT /:id/cancel  
  - Description: Cancel subscription (requires auth; owner only)

## Authentication
- Most endpoints require a Bearer JWT in the `Authorization` header:
  Authorization: Bearer <token>
- Token middleware should populate `req.user` with `{ _id, ... }`.

## Request Examples

Create subscription (POST /api/v1/subscriptions)
Headers:
- Authorization: Bearer <token>
- Content-Type: application/json

Body:
{
  "name": "Netflix",
  "amount": 12.99,
  "currency": "USD",
  "billingCycle": "monthly",
  "nextBillingDate": "2025-11-01T00:00:00.000Z",
  "renewalDate": "2025-11-01T00:00:00.000Z",
  "notes": "Standard plan"
}

Update subscription (POST /api/v1/subscriptions/:id)
Headers: same as above
Body: only fields to change, e.g.
{
  "amount": 15.99,
  "nextBillingDate": "2025-12-01T00:00:00.000Z"
}

Upcoming renewals (GET /api/v1/subscriptions/upcoming-renewals)
- Public endpoint
- Optional: `?user=<userId>` to filter to a single user
- Returns subscriptions where `renewalDate` > now

## Data Model (Subscription) — example fields
- _id: ObjectId
- user: ObjectId (owner)
- name: string
- amount: number
- currency: string
- billingCycle: string ("monthly"|"yearly" etc.)
- nextBillingDate: Date
- renewalDate: Date
- status: string ("active","cancelled","expired", etc.)
- notes: string
- createdAt / updatedAt

Adjust to match `models/subscription.model.js`.

## Troubleshooting & Tips
- Route ordering: define specific routes (e.g. `/upcoming-renewals`) before parameterized routes like `/:id` to avoid accidental matching.
- ObjectId comparisons: Mongoose ObjectIds are objects. Compare with `.toString()` or `.equals()` (e.g. `doc.user.equals(req.user._id)`).
- Deleting docs: `document.remove()` may be deprecated depending on Mongoose version — use `doc.deleteOne()` or `Model.findByIdAndDelete()`; use sessions if transactions needed.
- Ownership checks: always fetch the document first, then validate ownership before mutating or returning data.
- If you see "Unauthorized" on an endpoint that should be public, verify route registration and middleware order.

## Testing
- Use Postman or similar.
- Ensure Authorization header is present for protected routes.
- ObjectId format: 24 hex chars (e.g. `64a7f2c9b1e4f6a3d2c9e8b1`).

## Architecture & Key Features (what a recruiter should know)

This project is a small REST API built with Express + Mongoose. Below is a concise, recruiter-friendly summary of technical features, what is already implemented, and what is recommended/straightforward to add.

Implemented
- Authentication
  - JWT-based authentication via an `authorize` middleware that populates `req.user`.
  - Server-side ownership checks on protected resources (compare ObjectId with `.toString()` / `.equals()`).
- Authorization
  - Per-resource ownership enforcement (users can only read/update/delete their own subscriptions).
- Data model & consistency
  - Mongoose schemas and validation (model enforces types and validators).
  - Use of Mongoose sessions/transactions for critical delete flows to keep data consistent.
- Background workflows
  - Integration with Upstash Workflows (workflowClient.trigger) to schedule or trigger subscription reminders.
- CRUD and business logic
  - Create, update, cancel, delete, and list operations with appropriate status codes and validations.
- Public reporting endpoint
  - Public endpoint to query upcoming renewals (supports filtering by user).
- Error handling
  - Centralized controller try/catch forwarding to error middleware (standard Express pattern).

Recommended / Easily Added (notes for reviewers)
- Rate limiting
  - Not currently enforced in-route. Add express-rate-limit (or Cloudflare/LB rules) to protect endpoints per-IP and per-user.
- Refresh tokens & session management
  - JWT is stateless; for longer sessions or revocation, add refresh tokens (stored securely) and token rotation.
- Role-based access control
  - Currently owner-based checks exist. Add roles (admin/support) to expose management endpoints.
- Input validation
  - Add request-level validation (Joi / express-validator) to enforce payloads before controller logic.
- Security hardening
  - Add Helmet, strict CORS policy, and enforce HTTPS in production. Validate file uploads and sanitize inputs.
- Logging & observability
  - Integrate request/error logging (Winston or Pino), structured logs, and correlation IDs. Add metrics (Prometheus) and tracing (OpenTelemetry) for production.
- Testing & CI
  - Add unit tests (Jest), integration tests (supertest), and a GitHub Actions pipeline running lint/test/build on PRs.
- Caching & performance
  - Use Redis for caching heavy reads and rate limit storage. Paginate large lists and index commonly queried fields (renewalDate, user).
- Deployment
  - Containerize (Docker) and recommend deployment to a managed platform (Heroku, Vercel, AWS ECS/Fargate). Use environment variables and a secrets manager for credentials.

Notes for reviewers / interview talking points
- Ownership checks: implemented at controller level (fetch then verify), protecting accidental data leaks.
- ID comparisons: uses Mongoose ObjectId comparisons (.toString() / .equals()) to avoid reference equality bugs.
- Background work: Upstash integration demonstrates asynchronous workflow design and decoupling of short-lived API requests from scheduled jobs.
- Transactions: usage of Mongoose sessions shows attention to data integrity when performing multi-step deletes/cleanup.
- Extensibility: small codebase where rate limiting, RBAC, refresh tokens, and observability can be added with minimal changes — good for demoing incremental improvements.

Short summary statement for a recruiter
- This repo is a production-minded prototype: JWT auth, ownership checks, background workflow hooks, and transactional deletes are implemented. The code is ready for standard hardening (rate limiting, refresh token flow, logging, tests, and CI/CD) to reach production maturity.

## Contributing
- Open issues and PRs welcome. Keep changes small and focused.

## License
- MIT (adjust as needed)
