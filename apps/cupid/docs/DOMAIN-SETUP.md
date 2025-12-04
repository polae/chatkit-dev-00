# Cupid Domain Configuration - Production Setup

This guide continues from [AWS-SETUP.md](./AWS-SETUP.md) and covers configuring a custom domain with ChatKit domain key authentication.

**Prerequisites:** Complete AWS-SETUP.md through STEP 9.

---

## Issue: ChatKit Domain Key Validation

After initial deployment, the chat interface doesn't render because:
- ChatKit requires domain allowlisting on OpenAI's platform
- The default `domain_pk_localhost_dev` only works for localhost
- IP addresses cannot be added to OpenAI's domain allowlist

**Solution:** Use a custom domain with OpenAI domain key.

---

## STEP 1: Configure DNS (GoDaddy or your DNS provider)

Add an A record pointing your subdomain to your EC2 IP:

**GoDaddy Example:**
1. Log into GoDaddy DNS management for your domain
2. Add A record:
   - **Type:** A
   - **Name:** `cupid` (for cupid.yourdomain.com)
   - **Value:** `<YOUR_EC2_IP>`
   - **TTL:** 600 (or default)
3. Save changes

**DNS Propagation:** Wait 5-30 minutes for DNS to propagate globally.

---

## STEP 2: Register Domain on OpenAI Platform

1. Go to: https://platform.openai.com/settings/organization/security/domain-allowlist
2. Click **Add domain**
3. Enter your domain: `cupid.yourdomain.com`
4. Click **Save**
5. **Copy the generated domain key** (format: `domain_pk_xxxxx`)
6. Wait 2-5 minutes for allowlist propagation

**Note:** Only valid domain names are accepted - IP addresses will be rejected.

---

## STEP 3: Update .env on EC2 with Domain Key

SSH into your EC2 instance and update the environment file:

```bash
ssh -i ~/.ssh/cupid-pk-00.pem ubuntu@<YOUR_EC2_IP>
cd ~/chatkit-dev-00/apps/cupid
```

Edit `.env` to add the domain key and update FRONTEND_URLS:

```bash
nano .env
```

Update to include:
```bash
OPENAI_API_KEY=your-openai-api-key
FRONTEND_URLS=https://cupid.yourdomain.com,http://<YOUR_EC2_IP>
VITE_CHATKIT_API_DOMAIN_KEY=domain_pk_xxxxx
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

---

## STEP 4: Pull Latest Code Changes

```bash
cd ~/chatkit-dev-00
git pull origin main
cd apps/cupid
```

---

## STEP 5: Rebuild and Restart Services

Rebuild with the new domain key embedded in the frontend:

```bash
docker compose down
docker compose up -d --build
```

**Build time:** ~30-60 seconds (cached layers speed this up)

---

## STEP 6: Verify Deployment

Check that all services are running:

```bash
docker compose ps
```

Expected output:
```
NAME             STATUS                   PORTS
cupid-backend    Up (healthy)             8003/tcp
cupid-caddy      Up                       0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
cupid-frontend   Up                       80/tcp
```

Check logs:

```bash
docker compose logs caddy
```

Look for Caddy obtaining SSL certificate:
```
"obtaining certificate" ... "got certificate"
```

---

## STEP 7: Test Access

**Via Domain (HTTPS):**
```bash
curl -I https://cupid.yourdomain.com
```

**In Browser:**
- Open: `https://cupid.yourdomain.com`
- The chat interface should now load
- SSL certificate will be automatically provisioned by Caddy

**Fallback via IP (HTTP):**
- `http://<YOUR_EC2_IP>` should still work

---

## Troubleshooting

### Chat Interface Still Blank

**Check DNS propagation:**
```bash
nslookup cupid.yourdomain.com
```

Should return your EC2 IP address.

**Check domain key is set:**
```bash
cat .env | grep VITE_CHATKIT_API_DOMAIN_KEY
```

**Check OpenAI domain allowlist:**
- Verify domain is listed at https://platform.openai.com/settings/organization/security/domain-allowlist
- Wait 5 minutes after adding

**Check Caddy logs for SSL errors:**
```bash
docker compose logs caddy | grep -i error
```

### SSL Certificate Issues

**If Caddy can't obtain certificate:**
- Ensure DNS is fully propagated
- Check port 443 is open in EC2 Security Group
- Check Caddy logs: `docker compose logs caddy`

**Force certificate renewal:**
```bash
docker compose restart caddy
```

### Domain Key Errors

**Browser console shows domain key validation error:**
- Rebuild frontend: `docker compose up -d --build`
- Domain key must be embedded at build time
- Verify `.env` has correct `VITE_CHATKIT_API_DOMAIN_KEY`

---

## Architecture Overview

```
Internet
   ↓
DNS (cupid.yourdomain.com → <YOUR_EC2_IP>)
   ↓
Caddy (Port 443/80)
   ├─ Automatic HTTPS (Let's Encrypt)
   └─ Reverse Proxy → nginx (cupid-frontend:80)
       ├─ Serves static frontend files
       └─ Proxies /chatkit → FastAPI (cupid-backend:8003)
```

**ChatKit Domain Validation:**
- Frontend checks domain on initialization
- Makes POST to `https://api.openai.com/v1/chatkit/domain_keys/verify_hosted`
- OpenAI validates domain against allowlist
- If valid, ChatKit renders; if invalid, blank screen

---

## Summary

You now have:
- ✅ Production domain with HTTPS
- ✅ ChatKit domain key authentication
- ✅ Automatic SSL certificate renewal (Caddy)
- ✅ CORS configured for both domain and IP
- ✅ Frontend built with production domain key

**Access your app at:** `https://cupid.yourdomain.com`

---

## Maintenance Commands

**View all logs:**
```bash
docker compose logs
```

**Restart specific service:**
```bash
docker compose restart backend
docker compose restart frontend
docker compose restart caddy
```

**Update code and redeploy:**
```bash
git pull origin main
docker compose down
docker compose up -d --build
```

**Check resource usage:**
```bash
docker stats
```
