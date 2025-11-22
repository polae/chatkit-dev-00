# Cupid-Simple: Docker + AWS EC2 Deployment Guide

Complete guide for deploying Cupid-Simple using Docker Compose on AWS EC2 with Caddy for automatic HTTPS.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Local Development](#local-development)
4. [AWS EC2 Setup](#aws-ec2-setup)
5. [Deployment](#deployment)
6. [Domain & SSL Setup](#domain--ssl-setup)
7. [CI/CD with GitHub Actions](#cicd-with-github-actions)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
Internet → Caddy (Port 80/443) → Nginx (Frontend) → FastAPI (Backend)
              ↓
     Automatic HTTPS (Let's Encrypt)
```

**Services:**
- **Caddy**: Reverse proxy with automatic SSL
- **Frontend**: Nginx serving built Vite static files
- **Backend**: Python 3.13 + FastAPI + uvicorn

**Cost:** ~$22/month (t3.small EC2 + 20GB storage)

---

## Prerequisites

### Local Machine
- Docker and Docker Compose installed
- Git
- SSH key pair for EC2

### AWS Account
- AWS account with EC2 access
- (Optional) Domain name for HTTPS

### Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key

---

## Local Development

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd chatkit-dev-00/apps/cupid-simple
```

### 2. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API key
nano .env
```

Add:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. Run Development Environment

```bash
# Start all services with hot reload
docker compose -f docker-compose.dev.yml up

# Or run in background
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f
```

**Access the app:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8003
- Health check: http://localhost:8003/health

### 4. Test Production Build Locally

```bash
# Build and start production containers
docker compose up --build

# Access at http://localhost (port 80)
```

### 5. Stop Services

```bash
# Development
docker compose -f docker-compose.dev.yml down

# Production
docker compose down
```

---

## AWS EC2 Setup

### Step 1: Launch EC2 Instance

1. **Go to AWS EC2 Console** → Launch Instance

2. **Configure Instance:**
   - **Name:** cupid-simple-server
   - **AMI:** Ubuntu 22.04 LTS (Free tier eligible)
   - **Instance Type:** t3.small (2 vCPU, 2GB RAM)
   - **Key Pair:** Create new or use existing (save as `cupid-key.pem`)

3. **Configure Security Group:**

   Create rules:
   ```
   Type            Protocol    Port    Source
   SSH             TCP         22      Your IP (e.g., 1.2.3.4/32)
   HTTP            TCP         80      0.0.0.0/0
   HTTPS           TCP         443     0.0.0.0/0
   ```

4. **Configure Storage:**
   - 20GB gp3 SSD

5. **Launch Instance**

6. **Note the Public IP** (e.g., 54.123.45.67)

### Step 2: Connect to EC2

```bash
# Set permissions on key file
chmod 400 cupid-key.pem

# Connect via SSH
ssh -i cupid-key.pem ubuntu@<your-ec2-public-ip>
```

### Step 3: Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker ubuntu
newgrp docker

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### Step 4: Install Git

```bash
sudo apt install git -y
```

---

## Deployment

### Step 1: Clone Repository on EC2

```bash
# Clone your repository
git clone <your-repo-url>
cd chatkit-dev-00/apps/cupid-simple
```

### Step 2: Configure Environment

```bash
# Create .env file
cat > .env << EOF
OPENAI_API_KEY=sk-your-actual-api-key-here
EOF

# Secure the .env file
chmod 600 .env
```

### Step 3: Deploy Application

```bash
# Build and start containers
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Check specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f caddy
```

### Step 4: Verify Deployment

```bash
# Check backend health
curl http://localhost:8003/health

# Check frontend (should return HTML)
curl http://localhost

# From your local machine
curl http://<your-ec2-ip>
```

**Access in browser:** `http://<your-ec2-ip>`

---

## Domain & SSL Setup

### With Domain (Automatic HTTPS)

#### Step 1: Point Domain to EC2

Create an A record:
```
Type: A
Name: cupid (or @)
Value: <your-ec2-ip>
TTL: 300
```

#### Step 2: Update Caddyfile

Edit `Caddyfile`:
```bash
nano Caddyfile
```

Replace content with:
```caddyfile
# Production with automatic HTTPS
cupid.yourdomain.com {
    reverse_proxy frontend:80
}
```

#### Step 3: Restart Caddy

```bash
docker compose restart caddy

# Watch Caddy get SSL certificate
docker compose logs -f caddy
```

Caddy will automatically:
- Obtain Let's Encrypt SSL certificate
- Redirect HTTP → HTTPS
- Auto-renew certificates

**Access:** `https://cupid.yourdomain.com`

### Without Domain (HTTP Only)

The default Caddyfile already works:
```caddyfile
:80 {
    reverse_proxy frontend:80
}
```

**Access:** `http://<your-ec2-ip>`

---

## CI/CD with GitHub Actions

### Step 1: Add GitHub Secrets

Go to your repo → Settings → Secrets and variables → Actions

Add these secrets:
- `EC2_HOST`: Your EC2 public IP or domain
- `EC2_SSH_KEY`: Content of `cupid-key.pem`
- `OPENAI_API_KEY`: Your OpenAI API key

### Step 2: Workflow Already Created

The workflow file is at `.github/workflows/deploy-cupid-simple-ec2.yml`

### Step 3: Deploy on Push

```bash
# Make changes
git add .
git commit -m "Update cupid-simple"
git push origin main

# GitHub Actions will automatically:
# 1. Connect to EC2
# 2. Pull latest code
# 3. Rebuild containers
# 4. Restart services
```

### Manual Deployment Trigger

Go to Actions → Deploy Cupid-Simple to EC2 → Run workflow

---

## Monitoring & Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f caddy

# Last 100 lines
docker compose logs --tail=100

# Follow new logs
docker compose logs -f --since 5m
```

### Check Container Status

```bash
docker compose ps

# Detailed info
docker compose ps -a
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend
docker compose restart caddy
```

### Update Application

```bash
cd ~/chatkit-dev-00/apps/cupid-simple

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build

# Or just restart without rebuild
docker compose down
docker compose up -d
```

### Check Resource Usage

```bash
# Docker stats
docker stats

# System resources
htop  # Install with: sudo apt install htop

# Disk usage
df -h
docker system df
```

### Clean Up Old Images

```bash
# Remove unused images
docker image prune -a

# Remove everything unused
docker system prune -a --volumes

# Warning: This removes stopped containers, unused networks, images, and volumes
```

---

## Troubleshooting

### Backend Not Starting

```bash
# Check logs
docker compose logs backend

# Common issues:
# 1. Missing OPENAI_API_KEY in .env
cat .env | grep OPENAI_API_KEY

# 2. Port already in use
sudo lsof -i :8003

# 3. Permission issues
ls -la backend/.env
chmod 600 backend/.env
```

### Frontend Not Accessible

```bash
# Check nginx logs
docker compose logs frontend

# Check if container is running
docker compose ps frontend

# Rebuild frontend
docker compose up -d --build frontend
```

### Caddy SSL Issues

```bash
# View Caddy logs
docker compose logs caddy

# Common issues:
# 1. Domain not pointing to server
dig cupid.yourdomain.com

# 2. Port 80/443 blocked
sudo ufw status

# 3. Let's Encrypt rate limit (5 per week)
# Wait or use staging:
# Add to Caddyfile: tls internal
```

### Can't Connect via SSH

```bash
# Check security group allows your IP
# AWS Console → EC2 → Security Groups → Edit inbound rules

# Verify key permissions
chmod 400 cupid-key.pem

# Try verbose SSH
ssh -i cupid-key.pem -v ubuntu@<ec2-ip>
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Clean apt cache
sudo apt clean
sudo apt autoclean
```

### Memory Issues

```bash
# Check memory
free -h

# If using t3.small (2GB) and running out:
# Option 1: Add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Option 2: Upgrade to t3.medium (4GB)
```

### Application Errors

```bash
# Check backend health
curl http://localhost:8003/health

# Check backend directly
docker compose exec backend /app/.venv/bin/python -c "print('Python OK')"

# Check environment variables
docker compose exec backend env | grep OPENAI

# Restart from scratch
docker compose down -v
docker compose up -d --build
```

---

## Backup and Recovery

### Backup (if you add database later)

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker compose exec -T backend python -m app.backup > backup_$DATE.sql
EOF

chmod +x backup.sh
./backup.sh
```

### Security Best Practices

1. **Never commit .env files**
   ```bash
   # Already in .gitignore
   cat .gitignore | grep .env
   ```

2. **Rotate API keys regularly**
   ```bash
   # Update .env
   nano .env
   # Restart backend
   docker compose restart backend
   ```

3. **Keep system updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **Monitor logs for suspicious activity**
   ```bash
   docker compose logs | grep -i error
   ```

---

## Cost Optimization

### Current Setup (~$22/month)

- EC2 t3.small: ~$15/month
- 20GB EBS: ~$2/month
- Data transfer: ~$5/month

### Ways to Reduce Cost

1. **Use t3.micro for testing** (~$7/month)
   - Limited to 1GB RAM
   - May need swap space

2. **Use Reserved Instances** (1-year commitment)
   - Save ~30-40%

3. **Use Spot Instances** (for non-critical)
   - Save ~70% but can be terminated

---

## Next Steps

- ✅ Application deployed and running
- 🔲 Set up domain and HTTPS
- 🔲 Configure GitHub Actions auto-deploy
- 🔲 Set up monitoring (CloudWatch, etc.)
- 🔲 Configure backups (if adding database)
- 🔲 Set up staging environment

---

## Quick Reference

### Useful Commands

```bash
# Deploy
docker compose up -d --build

# Update
git pull && docker compose down && docker compose up -d --build

# Logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Clean
docker system prune -a
```

### File Locations

- Application: `~/chatkit-dev-00/apps/cupid-simple`
- Logs: `docker compose logs`
- Environment: `.env`
- Caddy config: `Caddyfile`

### Support

- Frontend issues → `frontend/` directory
- Backend issues → `backend/app/` directory
- Deployment issues → This guide
- ChatKit issues → ChatKit documentation
