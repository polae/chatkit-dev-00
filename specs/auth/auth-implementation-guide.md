# Auth0 Implementation Guide for humorist.ai

This guide provides step-by-step instructions for setting up Auth0 to provide centralized authentication across all humorist.ai subdomain applications.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Auth0 Account Setup](#phase-1-auth0-account-setup)
3. [Phase 2: Configure Auth0 Tenant](#phase-2-configure-auth0-tenant)
4. [Phase 3: Create API](#phase-3-create-api)
5. [Phase 4: Register Applications](#phase-4-register-applications)
6. [Phase 5: Custom Domain (Optional)](#phase-5-custom-domain-optional)
7. [Phase 6: Social Connections](#phase-6-social-connections)
8. [Phase 7: DNS Configuration for App Subdomains (GoDaddy)](#phase-7-dns-configuration-for-app-subdomains-godaddy)
9. [Testing](#testing)
10. [Production Checklist](#production-checklist)

---

## Prerequisites

- Domain ownership: `humorist.ai` (registered with GoDaddy)
- GoDaddy account with DNS management access
- AWS account for app hosting
- SSL certificates for subdomains (AWS Certificate Manager recommended)
- Credit card for Auth0 (free tier available, card required for verification)

**Note:** This guide uses **GoDaddy for DNS management** while deploying apps to AWS. This is a common and well-supported configuration.

---

## Phase 1: Auth0 Account Setup

### Step 1.1: Create Auth0 Account

1. Go to [auth0.com](https://auth0.com)
2. Click **Sign Up**
3. Choose account type: **Personal** (for testing) or **Company** (for production)
4. Verify your email address

### Step 1.2: Create Tenant

1. Choose a **Tenant Domain** (e.g., `humorist` → `humorist.auth0.com`)
   - This will be your Auth0 domain
   - Cannot be changed later, choose carefully!
2. Select **Region**: Choose closest to your users (e.g., `US`, `EU`, `AU`)
3. Select **Environment**: `Production` (even for initial testing)

**Result:** You now have a tenant at `https://humorist.auth0.com`

---

## Phase 2: Configure Auth0 Tenant

### Step 2.1: Configure Tenant Settings

Navigate to: **Settings** → **General**

```yaml
Tenant Name: humorist
Friendly Name: Humorist Apps
Support Email: support@humorist.ai
Support URL: https://www.humorist.ai/support
```

### Step 2.2: Configure Login Settings

Navigate to **Settings** → **Advanced** → **Login**

```yaml
Default Directory: Username-Password-Authentication
Session Timeout: 72 hours (for good UX)
Session Cookie:
  - Mode: Persistent
  - Domain: .humorist.ai  # This enables SSO across subdomains
```

### Step 2.3: Configure Security Settings

Navigate to **Security** → **Attack Protection**

Enable:
- ✅ **Brute Force Protection**
- ✅ **Suspicious IP Throttling**
- ✅ **Breached Password Detection**

---

## Phase 3: Create API

This API identifier is shared across ALL your apps.

### Step 3.1: Create API Resource

1. Navigate to **Applications** → **APIs**
2. Click **Create API**
3. Fill in details:

```yaml
Name: Humorist API
Identifier: https://api.humorist.ai
  # This is your "audience" - use in all apps
  # Does NOT need to be a real URL
Signing Algorithm: RS256
```

4. Click **Create**

### Step 3.2: Configure API Settings

Navigate to your API → **Settings**

```yaml
Token Expiration: 3600  # 1 hour (adjust as needed)
Token Expiration For Browser Flows: 3600
Allow Skipping User Consent: Enabled  # For first-party apps
Allow Offline Access: Enabled  # For refresh tokens
```

### Step 3.3: Configure Permissions (Scopes)

Navigate to your API → **Permissions**

Add scopes your apps will use:

```yaml
read:profile    - Read user profile information
write:profile   - Update user profile information
read:apps       - Access to user's app data
write:apps      - Create/modify app data
admin:users     - Admin-only user management
```

**Note:** Start simple, add more scopes as needed.

---

## Phase 4: Register Applications

Register each subdomain app as a separate "Application" in Auth0.

### Step 4.1: Register cupid-simple App

1. Navigate to **Applications** → **Applications**
2. Click **Create Application**
3. Fill in details:

```yaml
Name: Cupid Simple
Type: Single Page Application  # For React apps
```

4. Click **Create**

### Step 4.2: Configure cupid-simple Settings

Navigate to your app → **Settings**

#### Basic Information

```yaml
Name: Cupid Simple
Description: Divine matchmaking powered by the stars
Application Logo: [Upload cupid icon]
Application Type: Single Page Application
```

#### Application URIs

```yaml
Allowed Callback URLs:
  https://cupid-simple.humorist.ai/callback
  http://localhost:5173/callback  # For local development

Allowed Logout URLs:
  https://cupid-simple.humorist.ai
  http://localhost:5173

Allowed Web Origins:
  https://cupid-simple.humorist.ai
  http://localhost:5173

Allowed Origins (CORS):
  https://cupid-simple.humorist.ai
  http://localhost:5173
```

#### Advanced Settings

Navigate to **Advanced Settings** → **OAuth**

```yaml
JSON Web Token Signature Algorithm: RS256
OIDC Conformant: Enabled
```

Navigate to **Advanced Settings** → **Grant Types**

Enable:
- ✅ Implicit
- ✅ Authorization Code
- ✅ Refresh Token

### Step 4.3: Get Credentials

In **Settings** → **Basic Information**, copy:

```bash
Domain: humorist.auth0.com
Client ID: abc123xyz...  # Keep this
Client Secret: secret123...  # Backend only, DO NOT expose
```

**Save these values** - you'll need them for environment variables.

### Step 4.4: Register Additional Apps

Repeat steps 4.1-4.3 for each app:

```yaml
Application Name: New App
Allowed Callback URLs: https://new-app.humorist.ai/callback, http://localhost:5173/callback
Allowed Logout URLs: https://new-app.humorist.ai, http://localhost:5173
...
```

---

## Phase 5: Custom Domain (Optional but Recommended)

Custom domain changes Auth0 URLs from `humorist.auth0.com` to `login.humorist.ai`.

### Step 5.1: Create Custom Domain in Auth0

1. Navigate to **Branding** → **Custom Domains**
2. Click **Set Up Custom Domain**
3. Enter domain: `login.humorist.ai`
4. Click **Continue**

### Step 5.2: Verify Domain Ownership

Auth0 will provide a CNAME record:

```
Type: CNAME
Name: login.humorist.ai
Value: humorist.edge.tenants.auth0.com
```

### Step 5.3: Add CNAME to GoDaddy DNS

1. Go to [GoDaddy DNS Management](https://dcc.godaddy.com/manage/dns)
2. Login and select domain: `humorist.ai`
3. Click **Add New Record** or **Add**
4. Fill in:

```yaml
Type: CNAME
Name: login
Value: humorist.edge.tenants.auth0.com
TTL: 600 seconds (or use default)
```

5. Click **Save**

**Screenshot Guide:**
- GoDaddy DNS Manager → humorist.ai → DNS → Add → CNAME
- Name field: Enter `login` (GoDaddy automatically appends .humorist.ai)
- Value field: Enter `humorist.edge.tenants.auth0.com`
- TTL: Leave default (600 or 1 hour)

### Step 5.4: Wait for Verification

- Auth0 will automatically verify (1-20 minutes)
- Status will change to **Ready**
- Auth0 will provision SSL certificate

### Step 5.5: Update Application Code

Update all references from:
```javascript
domain: 'humorist.auth0.com'
```

To:
```javascript
domain: 'login.humorist.ai'
```

---

## Phase 6: Social Connections

Enable login with Google, GitHub, etc.

### Step 6.1: Enable Google Login

1. Navigate to **Authentication** → **Social**
2. Click **Google**
3. Two options:

#### Option A: Auth0 Dev Keys (Testing Only)
- Toggle **Use Auth0 development keys**
- Good for testing, not for production

#### Option B: Your Own Google OAuth (Production)

**Create Google OAuth Credentials:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project: "Humorist Auth"
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs:

```
https://humorist.auth0.com/login/callback
https://login.humorist.ai/login/callback  # If using custom domain
```

7. Copy **Client ID** and **Client Secret**
8. Paste into Auth0 Google connection settings

### Step 6.2: Enable Additional Providers

Repeat similar process for:
- GitHub
- Facebook
- Apple
- Microsoft

---

## Phase 7: DNS Configuration for App Subdomains (GoDaddy)

After deploying apps to AWS, you'll need to point subdomains to your AWS resources using GoDaddy DNS.

### Step 7.1: Deploy App to AWS

First, deploy your app (e.g., cupid-simple) to AWS ECS/EC2 with an Application Load Balancer (ALB). You'll get:

```
ALB DNS Name: cupid-simple-alb-123456789.us-east-1.elb.amazonaws.com
```

### Step 7.2: Request SSL Certificate in AWS Certificate Manager

1. Go to AWS Certificate Manager (ACM)
2. Click **Request certificate**
3. Choose **Request a public certificate**
4. Domain name: `cupid-simple.humorist.ai`
5. Validation method: **DNS validation** (recommended)
6. Click **Request**

ACM will show you a CNAME record for validation:

```
Name: _abc123def456.cupid-simple.humorist.ai
Value: _xyz789ghi012.acm-validations.aws.
```

### Step 7.3: Add SSL Validation Record to GoDaddy

1. Go to [GoDaddy DNS Management](https://dcc.godaddy.com/manage/dns)
2. Select domain: `humorist.ai`
3. Click **Add New Record**
4. Fill in:

```yaml
Type: CNAME
Name: _abc123def456.cupid-simple
Value: _xyz789ghi012.acm-validations.aws.
TTL: 600 seconds
```

5. Click **Save**

**Wait 5-30 minutes** for ACM to validate the certificate. Status will change to "Issued" when ready.

### Step 7.4: Add App Subdomain Record to GoDaddy

Once your app is deployed and SSL is validated:

1. Go to [GoDaddy DNS Management](https://dcc.godaddy.com/manage/dns)
2. Select domain: `humorist.ai`
3. Click **Add New Record**
4. Fill in:

```yaml
Type: CNAME
Name: cupid-simple
Value: cupid-simple-alb-123456789.us-east-1.elb.amazonaws.com
TTL: 600 seconds
```

5. Click **Save**

**Wait 5-10 minutes** for DNS to propagate.

### Step 7.5: Verify DNS Resolution

Test that your subdomain resolves correctly:

```bash
# Check DNS resolution
nslookup cupid-simple.humorist.ai

# Should return IP addresses from AWS ALB
```

Test SSL:

```bash
# Test HTTPS
curl -I https://cupid-simple.humorist.ai

# Should return 200 OK with valid SSL certificate
```

### Step 7.6: Repeat for Each App

For each new app (e.g., `new-app.humorist.ai`):

1. Deploy to AWS (get ALB DNS name)
2. Request SSL certificate in ACM
3. Add validation CNAME to GoDaddy
4. Wait for ACM validation
5. Add app subdomain CNAME to GoDaddy

**Typical DNS Records in GoDaddy for Full Setup:**

```
Type    Name            Value                                    TTL
CNAME   login           humorist.edge.tenants.auth0.com          600
CNAME   cupid-simple    cupid-alb-123.us-east-1.elb.amazonaws... 600
CNAME   new-app         newapp-alb-456.us-east-1.elb.amazonaws.. 600
CNAME   _abc123.cupid-  _xyz789.acm-validations.aws.             600
        simple
CNAME   _def456.new-app _ghi012.acm-validations.aws.             600
```

---

## Testing

### Test 1: Local Development

1. Set up environment variables (see cupid-simple-auth-conversion.md)
2. Run app locally: `npm run cupid-simple`
3. Click login button
4. Should redirect to Auth0 Universal Login
5. Sign up / Log in
6. Should redirect back to `http://localhost:5173/callback`
7. Should see user profile

### Test 2: Cross-Subdomain SSO

1. Deploy two apps to subdomains
2. Log in to `cupid-simple.humorist.ai`
3. Open new tab to `new-app.humorist.ai`
4. Should be automatically logged in (no login prompt)

### Test 3: Token Validation

```bash
# Get access token from your app's localStorage or network tab
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test backend API with token
curl -H "Authorization: Bearer $TOKEN" \
  https://cupid-simple.humorist.ai/api/profile

# Should return user profile if token is valid
```

### Test 4: Logout

1. Click logout in any app
2. Should clear session
3. Visiting other apps should require login again

---

## Production Checklist

Before going live, verify:

### Security

- [ ] Custom domain configured (`login.humorist.ai`)
- [ ] Production OAuth credentials (not Auth0 dev keys)
- [ ] All URLs use HTTPS (no HTTP)
- [ ] Client secrets stored in environment variables (not in code)
- [ ] CORS configured for production domains only
- [ ] Attack protection enabled (brute force, suspicious IP)
- [ ] Breached password detection enabled

### Configuration

- [ ] Token expiration appropriate (15-60 mins)
- [ ] Refresh tokens enabled
- [ ] Session timeout configured (24-72 hours)
- [ ] Logout URLs configured
- [ ] Callback URLs configured for all apps
- [ ] Email templates customized (optional)

### Monitoring

- [ ] Auth0 logs reviewed
- [ ] Error notifications configured
- [ ] Usage limits monitored (free tier: 7,500 users/month)

### User Experience

- [ ] Universal Login page customized with branding
- [ ] Social login providers tested
- [ ] Password reset flow tested
- [ ] Email verification enabled (optional)
- [ ] MFA enabled for admin users (optional)

---

## Environment Variables Reference

Each app needs these environment variables:

### Frontend (.env)

```bash
# Auth0 Configuration
VITE_AUTH0_DOMAIN=login.humorist.ai
VITE_AUTH0_CLIENT_ID=abc123xyz
VITE_AUTH0_AUDIENCE=https://api.humorist.ai
VITE_AUTH0_REDIRECT_URI=https://cupid-simple.humorist.ai/callback

# For local development
# VITE_AUTH0_REDIRECT_URI=http://localhost:5173/callback
```

### Backend (.env)

```bash
# Auth0 Configuration
AUTH0_DOMAIN=login.humorist.ai
AUTH0_AUDIENCE=https://api.humorist.ai

# IMPORTANT: Client secret ONLY in backend, never in frontend
AUTH0_CLIENT_SECRET=your_client_secret_here

# CORS Configuration
FRONTEND_URLS=https://cupid-simple.humorist.ai
```

---

## Common Issues and Solutions

### Issue: "Invalid callback URL"

**Cause:** Callback URL not registered in Auth0

**Solution:**
1. Go to Auth0 Application settings
2. Add callback URL to **Allowed Callback URLs**
3. Format: `https://cupid-simple.humorist.ai/callback`

### Issue: "Cross-Origin Request Blocked"

**Cause:** CORS not configured

**Solution:**
1. Add domain to **Allowed Web Origins** in Auth0
2. Add domain to **Allowed Origins (CORS)**
3. Ensure backend CORS middleware allows frontend domain

### Issue: SSO not working across subdomains

**Cause:** Cookie domain not configured

**Solution:**
1. Verify `cookieDomain: '.humorist.ai'` in Auth0 SDK initialization
2. Ensure all apps use same Auth0 tenant
3. Check cookies in browser DevTools (should see `Domain=.humorist.ai`)

### Issue: "Invalid token"

**Cause:** Token validation failing

**Solution:**
1. Verify `aud` claim matches API identifier
2. Verify `iss` claim matches Auth0 domain
3. Check token hasn't expired
4. Ensure public key is being fetched correctly

### Issue: Login works locally but not in production

**Cause:** Environment variables not set in production

**Solution:**
1. Verify environment variables in ECS task definition / deployment
2. Check AWS Secrets Manager integration
3. Ensure production URLs are in Auth0 allowed URLs

---

## Cost Estimation

### Auth0 Pricing (as of 2025)

| Plan | Price | Monthly Active Users | Notes |
|------|-------|---------------------|-------|
| **Free** | $0 | Up to 7,500 | Good for MVP and initial launch |
| **Essentials** | $35 base + $0.07/user | 500 included | Starts at 7,500 users |
| **Professional** | $240 base + $0.13/user | 1,000 included | For scaling startups |
| **Enterprise** | Custom | Unlimited | For large organizations |

**Example:**
- 10,000 active users/month = $35 + (10,000 - 500) × $0.07 = **$700/month**
- 50,000 active users/month = $35 + (50,000 - 500) × $0.07 = **$3,500/month**

**Tips to reduce costs:**
- Use "monthly active users" not "total users" (only charged for users who log in each month)
- Implement smart session management (longer sessions = fewer logins)
- Consider self-hosted option at very large scale (100k+ users)

---

## Next Steps

1. ✅ Complete Auth0 setup (this guide)
2. → Convert cupid-simple to use Auth0 (see `cupid-simple-auth-conversion.md`)
3. → Test SSO across subdomains
4. → Convert additional apps using template snippets (see `app-template-auth-snippets.md`)
5. → Deploy to production
6. → Monitor and iterate

---

## Additional Resources

### Official Documentation
- [Auth0 React SDK Quickstart](https://auth0.com/docs/quickstart/spa/react)
- [Auth0 Python/FastAPI Backend](https://auth0.com/docs/quickstart/backend/python)
- [Securing FastAPI with Auth0](https://auth0.com/blog/build-and-secure-fastapi-server-with-auth0/)

### Auth0 Dashboard Links
- Applications: `https://manage.auth0.com/dashboard/us/{tenant}/applications`
- APIs: `https://manage.auth0.com/dashboard/us/{tenant}/apis`
- Logs: `https://manage.auth0.com/dashboard/us/{tenant}/logs`
- Users: `https://manage.auth0.com/dashboard/us/{tenant}/users`

### Support
- Auth0 Community: https://community.auth0.com
- Auth0 Support: https://support.auth0.com (Professional+ plans)
- Auth0 Status: https://status.auth0.com

---

**Ready to implement?** See `cupid-simple-auth-conversion.md` for specific code changes to add Auth0 to your first app.
