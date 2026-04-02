# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability within Aion, please report it responsibly.

**Do not open a public issue.** Instead, email the maintainers directly with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested fixes (optional)

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation within 7 days for critical issues.

## Security Measures

Aion implements the following security controls:

### Server-Side Key Isolation
All sensitive API keys (OpenAI, Gemini, Supabase service role) are stored exclusively as Supabase Edge Function environment variables. The React Native client only holds the public `anon` key.

### Row Level Security (RLS)
Every database table has RLS enabled with strict policies:
- `bible_verses`: Read-only for all users, no client-side writes
- `conversations`: Users can only access their own rows (`auth.uid() = user_id`)
- `messages`: Users can only access messages within their own conversations
- `rate_limits`, `global_usage`, `response_cache`: No client access (blocked entirely)

### IP-Based Rate Limiting
Rate limiting is keyed on the client's IP address (via `x-forwarded-for`), not on spoofable anonymous user IDs:
- **5 requests/minute** burst protection
- **30 requests/3 hours** per IP
- **200 requests/day** global hard cap

### Fail-Closed Design
If the rate limiting system encounters an error, requests are denied by default rather than allowed through.

### Response Caching
Exact-match queries are served from a database cache, eliminating unnecessary LLM API calls and reducing the attack surface for cost-based abuse.

### Input Validation
User messages are capped at 500 characters to prevent token-stuffing attacks against the LLM APIs.

### Dev Bypass Protection
A development-only bypass header (`x-dev-bypass`) is available for testing. It requires a secret stored server-side and is excluded from production builds by leaving `EXPO_PUBLIC_DEV_BYPASS` empty.

## Responsible Disclosure

We ask that you give us reasonable time to address any reported vulnerabilities before public disclosure. We are committed to working with security researchers to resolve issues promptly.
