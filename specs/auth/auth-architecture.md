# Authentication Architecture for humorist.ai

## Executive Summary

This document outlines the **Centralized Authentication with Single Sign-On (SSO)** architecture for the humorist.ai domain and all subdomain applications (cupid-simple.humorist.ai, new-app.humorist.ai, etc.).

**Pattern Name:** API Gateway + Centralized Authentication Service (CAS) with JWT Token-Based Authentication

**Verdict:** ✅ **This is a common, recommended, industry-standard pattern** used by major platforms including Google, Microsoft, GitHub, and Atlassian.

---

## Architecture Overview

### The Pattern

```
┌─────────────────────────────────────────────────────────┐
│                 www.humorist.ai                          │
│         (Main domain - landing page/directory)           │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Manages Authentication
                         ▼
┌─────────────────────────────────────────────────────────┐
│         login.humorist.ai OR Auth0 Universal Login       │
│         (Centralized Authentication Service)             │
│                                                          │
│  • Handles user login/logout                             │
│  • Issues JWT access tokens                              │
│  • Manages user sessions                                 │
│  • Stores user credentials                               │
└─────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ cupid-simple │  │   new-app    │  │  another-app │
│ .humorist.ai │  │ .humorist.ai │  │ .humorist.ai │
└──────────────┘  └──────────────┘  └──────────────┘

Each app:
• Validates JWT tokens on backend
• No authentication logic
• No password storage
• Just token verification
```

### Authentication Flow

1. **User visits** `cupid-simple.humorist.ai` (unauthenticated)
2. **App detects** no valid auth token
3. **Redirects to** Auth0 Universal Login (or `login.humorist.ai`)
4. **User authenticates** once with email/password, Google, etc.
5. **Auth0 generates** JWT access token with user claims
6. **User redirected back** to `cupid-simple.humorist.ai/callback` with token
7. **App validates token** and creates session
8. **User can now access** ANY subdomain without re-authenticating:
   - Visit `new-app.humorist.ai` → Already authenticated
   - Visit `another-app.humorist.ai` → Already authenticated

---

## Why This Pattern Is Excellent

### ✅ Advantages

| Benefit | Description |
|---------|-------------|
| **Single Source of Truth** | One authentication service manages all user sessions centrally |
| **Superior UX** | Users log in once, access everything (eliminates login fatigue) |
| **Easy Management** | Update authentication logic in one place, propagates to all apps |
| **Rapid Scalability** | Add new apps easily without rebuilding auth infrastructure |
| **Enhanced Security** | Centralize security policies, token management, secret handling |
| **Audit Trail** | Single location for monitoring and logging all authentication events |
| **Cost Effective** | No duplicate auth infrastructure per app |
| **Standards Compliant** | Uses OAuth2/OpenID Connect industry standards |

### ⚠️ Considerations

| Challenge | Mitigation Strategy |
|-----------|---------------------|
| **Single Point of Failure** | Deploy Auth0 (99.99% uptime SLA) or self-hosted with high availability, load balancers, and failover |
| **Cookie Configuration** | Properly configure cookies with `.humorist.ai` domain scope |
| **Token Security** | Implement short-lived tokens (15-60 mins), refresh token rotation, HTTPS everywhere |
| **CORS Complexity** | Configure CORS properly for subdomain communication |

---

## Technical Implementation

### Component Architecture

```
┌──────────────────────────────────────────────────────────┐
│  DNS (Route53 / CloudFlare)                               │
│  • www.humorist.ai → Main site (S3 + CloudFront)          │
│  • login.humorist.ai → Auth0 Custom Domain (optional)     │
│  • *.humorist.ai → Individual app ALBs                    │
└──────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   ALB        │  │   ALB        │  │   ALB        │
│ (cupid)      │  │ (new-app)    │  │ (app3)       │
│ + SSL Cert   │  │ + SSL Cert   │  │ + SSL Cert   │
└──────────────┘  └──────────────┘  └──────────────┘
         │               │               │
         ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   ECS        │  │   ECS        │  │   ECS        │
│ (FastAPI)    │  │ (FastAPI)    │  │ (FastAPI)    │
│              │  │              │  │              │
│ JWT          │  │ JWT          │  │ JWT          │
│ Validation   │  │ Validation   │  │ Validation   │
└──────────────┘  └──────────────┘  └──────────────┘

All apps validate tokens issued by:
┌──────────────────────────────────────┐
│   Auth0 Tenant                        │
│   yourtenant.auth0.com                │
│   (or login.humorist.ai custom domain)│
└──────────────────────────────────────┘
```

### JWT Token Structure

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-id-123"
  },
  "payload": {
    "iss": "https://yourname.auth0.com/",
    "sub": "auth0|507f1f77bcf86cd799439011",
    "aud": "https://api.humorist.ai",
    "iat": 1735070400,
    "exp": 1735074000,
    "azp": "cupid-simple-client-id",
    "scope": "openid profile email",
    "email": "user@example.com",
    "email_verified": true,
    "name": "Jane Doe"
  },
  "signature": "..."
}
```

**Key Claims:**
- `iss` (Issuer): Auth0 tenant domain
- `sub` (Subject): Unique user ID
- `aud` (Audience): Your API identifier (same for all apps)
- `exp` (Expiration): Token expiry timestamp
- `email`, `name`: User information

---

## Cookie-Based SSO (Subdomain Sharing)

### How It Works

Auth0's `auth0-spa-js` SDK (v1.21.0+) supports the `cookieDomain` option:

```javascript
const auth0 = await createAuth0Client({
  domain: 'yourname.auth0.com',
  clientId: 'YOUR_CLIENT_ID',
  authorizationParams: {
    redirect_uri: 'https://cupid-simple.humorist.ai/callback',
    audience: 'https://api.humorist.ai',
  },
  cookieDomain: '.humorist.ai',  // 🔑 Key setting
})
```

**What happens:**
1. User logs in on `cupid-simple.humorist.ai`
2. Auth0 SDK sets cookie: `Domain=.humorist.ai; Secure; HttpOnly; SameSite=Lax`
3. User visits `new-app.humorist.ai`
4. Cookie is sent automatically (same parent domain)
5. Auth0 SDK detects existing session → User already authenticated!

### Cookie Configuration

```python
# Backend session cookie example (FastAPI)
response.set_cookie(
    key="session",
    value=encrypted_session_token,
    domain=".humorist.ai",     # Leading dot = all subdomains
    secure=True,                # HTTPS only
    httponly=True,              # Prevents XSS attacks
    samesite="lax",             # CSRF protection
    max_age=3600,               # 1 hour
    path="/"
)
```

**Security Flags:**
- `Secure`: Cookie only sent over HTTPS
- `HttpOnly`: JavaScript cannot access (prevents XSS)
- `SameSite=Lax`: Prevents CSRF while allowing navigation
- `Domain=.humorist.ai`: Shared across all subdomains

---

## Security Best Practices

### 1. Token Management

| Practice | Implementation |
|----------|----------------|
| **Short-lived tokens** | Access tokens expire in 15-60 minutes |
| **Refresh tokens** | Use refresh tokens to obtain new access tokens |
| **Token rotation** | Rotate refresh tokens on each use (Auth0 does this) |
| **Revocation** | Implement token revocation for logout/security events |

### 2. Secret Management

```bash
# Store in AWS Secrets Manager or similar
AUTH0_DOMAIN=yourname.auth0.com
AUTH0_CLIENT_ID=abc123xyz
AUTH0_CLIENT_SECRET=secret_xyz  # Backend only, never expose to frontend
AUTH0_AUDIENCE=https://api.humorist.ai
```

**Never:**
- Commit secrets to Git
- Expose client secrets in frontend code
- Use same secrets across environments

### 3. HTTPS Everywhere

- All apps must use HTTPS (SSL/TLS)
- Redirect HTTP → HTTPS automatically
- Use AWS Certificate Manager for free SSL certs
- Configure HSTS headers

### 4. Token Validation

Every backend must validate JWT tokens:

```python
# What to verify:
✓ Signature (using Auth0 public key)
✓ Expiration (exp claim)
✓ Audience (aud claim matches your API)
✓ Issuer (iss claim matches Auth0 tenant)
✓ Not before (nbf claim if present)
```

---

## Comparison with Alternative Patterns

### 1. Separate Authentication Per App ❌

**How it works:** Each app has own login system

**Pros:**
- Complete independence
- No shared failure points

**Cons:**
- Poor UX (login multiple times)
- Duplicate code and infrastructure
- Harder to maintain
- Different password policies
- No unified user management

**Verdict:** Not recommended for related apps under same domain

### 2. OAuth2 Cross-Domain (Unrelated Domains) ⚠️

**How it works:** Apps on different root domains (yourapp.com, otherapp.com) use OAuth2 flow

**Pros:**
- Works across different domains
- Industry standard

**Cons:**
- More complex redirect flows
- Cannot share cookies
- Requires OAuth2 consent screens
- Overkill for subdomains

**Verdict:** Use only if apps are on different root domains

### 3. SAML Federation (Enterprise SSO) ⚠️

**How it works:** Corporate identity providers (Active Directory, Okta) authenticate users

**Pros:**
- Required for enterprise customers
- Meets compliance requirements

**Cons:**
- Very complex setup
- Requires XML configuration
- Not needed for B2C applications

**Verdict:** Use only for B2B enterprise requirements

### 4. Subdomain SSO with Auth0 ✅ (Recommended)

**How it works:** Centralized auth with JWT tokens, cookie-based SSO

**Pros:**
- Simple, industry-standard
- Great UX
- Easy to add apps
- Managed service (Auth0)
- Free tier available

**Cons:**
- Auth0 dependency (mitigated by 99.99% SLA)
- Cookie configuration needed

**Verdict:** Best choice for your use case

---

## Real-World Examples

This exact pattern is used by:

### Google Suite
- mail.google.com
- drive.google.com
- docs.google.com
- All share authentication via accounts.google.com

### Microsoft Office 365
- outlook.office.com
- teams.microsoft.com
- onedrive.live.com
- Single sign-on across all services

### Atlassian
- jira.atlassian.com
- confluence.atlassian.com
- bitbucket.org
- One Atlassian account for all products

### GitHub
- github.com
- gist.github.com
- GitHub Desktop, CLI
- Single authentication

---

## Implementation Options

### Option A: Auth0 Hosted (Recommended)

**Pros:**
- Fastest setup (hours, not weeks)
- Managed infrastructure (99.99% uptime)
- Free tier: 7,500 active users
- Built-in security features
- Social login (Google, GitHub, etc.)
- Multi-factor authentication
- Compliance (SOC2, GDPR, etc.)

**Cons:**
- Vendor dependency
- Cost at scale (but reasonable)

**Cost:**
- Free: Up to 7,500 active users/month
- Essentials: $35/month (500 users) + $0.07/user
- Professional: $240/month (1,000 users) + $0.13/user

### Option B: Custom Authentication Service

**Pros:**
- Full control
- No vendor lock-in
- Potentially lower cost at massive scale

**Cons:**
- Weeks/months of development
- Security responsibility on you
- Maintenance burden
- Must implement: password hashing, MFA, social login, password reset, email verification, rate limiting, etc.

**Verdict:** Only consider if you have specific requirements Auth0 cannot meet

---

## Deployment Architecture for AWS (with GoDaddy DNS)

```
GoDaddy DNS (humorist.ai domain)
├── www.humorist.ai
│   └── CNAME → CloudFront distribution (Static landing page)
│       └── S3 bucket
│
├── login.humorist.ai (Optional Auth0 custom domain)
│   └── CNAME → humorist.edge.tenants.auth0.com
│       └── Auth0 Universal Login
│
├── cupid-simple.humorist.ai
│   └── CNAME → cupid-alb-123.us-east-1.elb.amazonaws.com
│       └── ALB (SSL cert from ACM)
│           └── ECS Service (FastAPI + React)
│               └── Validates JWT from Auth0
│
├── new-app.humorist.ai
│   └── CNAME → newapp-alb-456.us-east-1.elb.amazonaws.com
│       └── ALB (SSL cert from ACM)
│           └── ECS Service (FastAPI + React)
│               └── Validates JWT from Auth0
│
└── SSL Validation Records (temporary)
    ├── _abc123.cupid-simple → _xyz789.acm-validations.aws
    └── _def456.new-app → _ghi012.acm-validations.aws
```

**Key Components:**
- **GoDaddy DNS**: Domain name resolution (CNAME records point to AWS)
- **ACM (AWS Certificate Manager)**: Free SSL/TLS certificates (validated via DNS)
- **ALB (Application Load Balancer)**: One per app, handles HTTPS termination
- **ECS/Fargate**: Container hosting for backend + frontend
- **Auth0**: Centralized authentication service

**DNS Flow:**
1. User types `cupid-simple.humorist.ai` in browser
2. GoDaddy DNS returns CNAME → AWS ALB DNS name
3. Browser connects to AWS ALB (HTTPS with ACM certificate)
4. ALB routes to ECS container
5. App validates JWT token from Auth0

---

## Token Validation Flow

```
User Request
    │
    ├─→ Frontend (React)
    │   ├─→ Check local storage for token
    │   ├─→ If missing/expired → Redirect to Auth0
    │   └─→ If valid → Include in API requests (Authorization: Bearer <token>)
    │
    └─→ Backend (FastAPI)
        ├─→ Extract token from Authorization header
        ├─→ Verify JWT signature with Auth0 public key
        ├─→ Check expiration (exp claim)
        ├─→ Validate audience (aud = https://api.humorist.ai)
        ├─→ Validate issuer (iss = https://yourname.auth0.com/)
        └─→ If valid → Process request
            If invalid → Return 401 Unauthorized
```

---

## Migration Path

### Phase 1: Setup Auth0
1. Create Auth0 account
2. Configure tenant settings
3. Create API identifier: `https://api.humorist.ai`
4. (Optional) Set up custom domain: `login.humorist.ai`

### Phase 2: Convert First App (cupid-simple)
1. Install Auth0 SDK in frontend
2. Add JWT validation middleware to backend
3. Test login/logout flow
4. Deploy to production

### Phase 3: Convert Additional Apps
1. Reuse same Auth0 tenant
2. Register each app as new "Application" in Auth0
3. Copy auth code from cupid-simple
4. Deploy independently

### Phase 4: Landing Page/Directory
1. Build `www.humorist.ai` landing page
2. List all available apps
3. Show user authentication status
4. Provide unified navigation

---

## Conclusion

The centralized authentication pattern with Auth0 is:

✅ **Industry-standard** - Used by major platforms
✅ **Well-documented** - Extensive guides and community support
✅ **Cost-effective** - Free tier covers initial growth
✅ **Secure** - Managed by security experts
✅ **Scalable** - Add apps easily
✅ **Great UX** - Users log in once

This is the **correct choice** for the humorist.ai ecosystem.

---

## Resources

### Documentation
- [Building a Centralized Authentication Service for Multi-Domain Apps](https://dev.to/logicverse_2025/building-a-centralized-authentication-service-for-multi-domain-apps-1jib)
- [Auth0 Universal Login - SSO between multiple apps](https://auth0.com/features/universal-login)
- [How to login once across multiple subdomains using Auth0](https://stackoverflow.com/questions/71288896/how-to-login-once-across-multiple-subdomains-on-a-custom-domain-using-auth0)

### Security
- [Sharing Authentication Across Subdomains using cookies](https://softwareengineering.stackexchange.com/questions/118801/sharing-authentication-across-subdomains-using-cookies)
- [What is the most secure way to store cross subdomain cookies](https://security.stackexchange.com/questions/212809/what-is-the-most-secure-way-to-store-cross-subdomain-cookies)

### Architecture
- [Microservices Authentication and Authorization Using API Gateway](https://permify.co/post/microservices-authentication-authorization-using-api-gateway/)
- [Authentication and Authorization in Microservices Architecture](https://www.nblocks.dev/blog/authentication/authentication-in-microservices)
- [JWT Authentication in API Gateway on Microservice Architecture](https://medium.com/geekculture/how-jwt-is-implemented-in-api-gateway-on-microservice-architecture-5dce8f5b89aa)

---

**Next Steps:** See `auth-implementation-guide.md` for step-by-step Auth0 setup instructions.
