# Authentication Strategy for humorist.ai

## Problem Statement

We want to deploy multiple ChatKit apps in this repo to separate subdomains:
- `cupid-simple.humorist.ai`
- `new-app.humorist.ai`
- `another-app.humorist.ai`

Each app should require authentication, but users should only need to log in **once** to access all apps. This is called **Single Sign-On (SSO)**.

## Solution: Auth0 with Centralized Authentication

After thorough research, we're implementing **Auth0 Universal Login** with JWT token-based authentication across all subdomains.

**Infrastructure:**
- **DNS:** GoDaddy (domain registrar)
- **Hosting:** AWS (ECS/Fargate with Application Load Balancers)
- **SSL Certificates:** AWS Certificate Manager (validated via DNS)
- **Authentication:** Auth0 (centralized identity provider)

### ✅ Is This a Good Pattern?

**YES!** This is an industry-standard pattern used by:
- Google (mail.google.com, drive.google.com, docs.google.com)
- Microsoft (Office 365 suite)
- GitHub (github.com, gist.github.com)
- Atlassian (Jira, Confluence, Bitbucket)

## Documentation

Complete implementation documentation is available in the following files:

### 1. [auth-architecture.md](./auth-architecture.md)
**Read this first** to understand:
- Why this pattern is excellent for our use case
- How it works (architecture diagrams)
- Security best practices
- Comparison with alternative patterns
- Real-world examples

### 2. [auth-implementation-guide.md](./auth-implementation-guide.md)
**Step-by-step Auth0 setup:**
- Creating Auth0 account and tenant
- Configuring API and applications
- Setting up custom domain (login.humorist.ai)
- Environment variables
- Testing procedures
- Production checklist

### 3. [cupid-simple-auth-conversion.md](./cupid-simple-auth-conversion.md)
**Specific code changes for cupid-simple:**
- Backend modifications (FastAPI + JWT validation)
- Frontend modifications (React + Auth0 SDK)
- Environment variables
- Testing instructions
- Deployment updates

### 4. [app-template-auth-snippets.md](./app-template-auth-snippets.md)
**Copy-paste snippets for any new app:**
- Reusable backend code (auth.py, main.py)
- Reusable frontend components (LoginButton, UserProfile)
- Environment variable templates
- Docker/AWS deployment configs
- Quick reference guide

## Quick Start

### For Your First App (cupid-simple)

1. Read [auth-architecture.md](./auth-architecture.md) - 10 mins
2. Follow [auth-implementation-guide.md](./auth-implementation-guide.md) to set up Auth0 - 30 mins
3. Apply changes from [cupid-simple-auth-conversion.md](./cupid-simple-auth-conversion.md) - 1 hour
4. Test locally and deploy

### For Additional Apps

1. Register app in Auth0 (5 mins)
2. Copy code snippets from [app-template-auth-snippets.md](./app-template-auth-snippets.md) (15 mins)
3. Update environment variables
4. Deploy

## Architecture Summary

```
User visits cupid-simple.humorist.ai (unauthenticated)
    ↓
Redirected to Auth0 Universal Login
    ↓
User logs in with email/password, Google, GitHub, etc.
    ↓
Auth0 generates JWT access token
    ↓
User redirected back to cupid-simple.humorist.ai (authenticated)
    ↓
User can now access ANY subdomain without re-logging in:
    - new-app.humorist.ai → Already authenticated ✓
    - another-app.humorist.ai → Already authenticated ✓
```

## Key Benefits

✅ **Single Sign-On** - Users log in once, access all apps
✅ **Security** - Auth0 handles authentication (99.99% uptime SLA)
✅ **Easy to Scale** - Add new apps without rebuilding auth
✅ **Standards-Based** - Uses OAuth2/OpenID Connect
✅ **Cost Effective** - Free tier: 7,500 active users/month
✅ **Great UX** - No login fatigue

## Implementation Status

- [ ] Auth0 tenant setup
- [ ] cupid-simple conversion (first app)
- [ ] Test SSO across subdomains
- [ ] Convert additional apps as needed
- [ ] Optional: Create www.humorist.ai landing page/directory

## Resources

- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 React SDK](https://auth0.com/docs/quickstart/spa/react)
- [FastAPI + Auth0](https://auth0.com/blog/build-and-secure-fastapi-server-with-auth0/)

## Questions?

See the detailed documentation files above or reach out for clarification.

---

**Bottom Line:** This is the correct, industry-standard approach for your use case. The pattern is battle-tested, secure, and will make it very easy to add new apps to the humorist.ai ecosystem.
