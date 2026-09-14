# Lost & Found load tests

This setup uses [k6](https://grafana.com/docs/k6/latest/) and is intentionally
small and local-only by default. It does not add a runtime dependency to the
backend or frontend.

## Scope

The test exercises the routes that are safe and available for a normal
student account:

- `GET /api/health`
- `POST /api/auth/login` once during k6 setup
- `GET /api/auth/me`
- `GET /api/lostitems/my?page=1&limit=10`
- `GET /api/notifications?page=1&limit=10`
- `GET /api/notifications/stats`

The application does not expose a public item-browsing route. Lost/found
listing and search routes require authentication and staff roles, so this test
uses the student-owned lost-item list instead of inventing a public endpoint.

Uploads are intentionally excluded because they call Cloudinary and are
guarded by per-IP and per-user rate limits. Mutations are excluded because
they create or change real application records. No emails, Cloudinary
resources, or production databases should be used.

## Prerequisites

1. Install k6 using the official instructions for your operating system.
2. Start the backend against a dedicated local/test MongoDB database using the
   normal backend startup command.
3. Create a dedicated verified test account. Do not use a real student's
   credentials.
4. Seed only non-sensitive test data if list/notification response sizes need
   to be representative.

Example backend environment values:

```text
NODE_ENV=test
JWT_SECRET=local-load-test-secret
CLIENT_URL=http://localhost:5173
```

Keep the backend's `MONGODB_URI` pointed at a disposable test database.

## Running scenarios

From the repository root, replace the placeholder credentials with the
dedicated test account:

```powershell
$env:BASE_URL="http://localhost:5000"
$env:TEST_EMAIL="load-test-user@s.amity.edu"
$env:TEST_PASSWORD="A-dedicated-test-password1"
k6 run -e BASE_URL=$env:BASE_URL -e TEST_EMAIL=$env:TEST_EMAIL -e TEST_PASSWORD=$env:TEST_PASSWORD -e VUS=10 load-tests/lost-found.js
```

Run the modest scenarios separately:

```powershell
k6 run -e BASE_URL=http://localhost:5000 -e TEST_EMAIL=$env:TEST_EMAIL -e TEST_PASSWORD=$env:TEST_PASSWORD -e VUS=25 load-tests/lost-found.js
k6 run -e BASE_URL=http://localhost:5000 -e TEST_EMAIL=$env:TEST_EMAIL -e TEST_PASSWORD=$env:TEST_PASSWORD -e VUS=50 load-tests/lost-found.js
```

Each run lasts 30 seconds by default. Set `DURATION=60s` only when the 10-user
run is stable and a longer observation is useful.

The login request runs once in `setup()` so the authentication rate limiter is
not overwhelmed by 25 or 50 simultaneous login attempts. The authenticated
read operations are then executed by the configured VUs using the access token
returned by that test login.

For a non-local test environment, explicitly opt in:

```powershell
$env:LOADTEST_ALLOW_REMOTE="true"
```

Do not set this for production or for an environment containing real user
data.

## Metrics

k6 reports:

- Throughput: `http_reqs` and requests per second
- Average and percentile latency: `http_req_duration`, including p50 and p95
- Error rate: `http_req_failed` and the custom `operation_error_rate`
- HTTP failures: custom `status_failures` grouped by operation and status
- Rate limiting: custom `rate_limit_responses` for HTTP 429 responses
- Timeout/failure behavior: failed requests and k6 HTTP timeout errors

The default thresholds are deliberately modest: fewer than 10% failed HTTP
requests, p95 below 5 seconds, and at least 90% successful checks. These are
smoke-load guardrails, not a capacity guarantee.

## Stopping safely

Press `Ctrl+C` to stop a run. k6 stops issuing new requests and reports the
metrics collected so far. Stop the backend separately when finished, and
remove the disposable test database if it is no longer needed.
