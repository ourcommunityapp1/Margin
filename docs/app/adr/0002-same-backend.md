# ADR-0002: The app uses the same back end as the website

- **Status:** Accepted

## Context

The website already has everything the app needs on the server side.

**Supabase:**
- Sign-in by emailed one-time code.
- Tables, each protected by row-level security: `heir_households`, `heir_members`, `heir_progress`, `heir_answers`,
  `heir_events`, `heir_profiles`, `heir_stats`, `heir_model_params` and others.
- Server functions (RPC), for example `heir_board`, `heir_friends_list`, `heir_request_send`,
  `heir_friend_invite_accept`.

**Server routes on katekize.com:**
- `/api/heir/verse`: NASB text. It is licensed and fetched on the server only.
- `/api/heir/stats`: works out friends' numbers.
- `/api/heir/stats/sweep`: the daily job.

## Decision

- The app talks to **the same Supabase project** with the same publishable key, using `supabase_flutter`.
- It calls **the same katekize.com routes** over HTTPS, sending the user's sign-in token where the website does.
- No new server.
- Anything new that needs a server is added to the website's routes, so both apps use it. "Delete my account" is one
  example.

## Consequences

- **Accounts and data are shared.** The website and the app are two windows onto one account.
- **Security stays in one place:** the database's row-level security and the server functions. The app never holds a
  service key.
- **API changes are breaking changes.** A route or RPC change must keep old app versions working, because people don't
  update at once. Add new things; don't change or remove old ones without a version check.
