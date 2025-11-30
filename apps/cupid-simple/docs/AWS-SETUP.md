# Cupid-Simple EC2 Manual Deployment - Command Reference

Copy and paste these commands in order. Replace values in `< >` with your actual information.

---

## STEP 1: Connect to EC2 from Your Mac

**After launching your EC2 instance, AWS will give you a Public IP address. Note it down!**

```bash
# Move the downloaded key to .ssh folder
mkdir -p ~/.ssh
mv ~/Desktop/cupid-simple-pk-00.pem ~/.ssh/
chmod 400 ~/.ssh/cupid-simple-pk-00.pem
```

```bash
# Connect to EC2
ssh -i ~/.ssh/cupid-simple-pk-00.pem ubuntu@3.151.112.221
```

---

## STEP 2: Update System (on EC2)

```bash
sudo apt update && sudo apt upgrade -y
```

---

## STEP 3: Install Docker (on EC2)

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

```bash
sudo usermod -aG docker ubuntu
newgrp docker
```

```bash
sudo apt install docker-compose-plugin -y
```

```bash
# Verify installation
docker --version
docker compose version
```

---

## STEP 4: Install Git (on EC2)

```bash
sudo apt install git -y
```

---

## STEP 5: Set Up GitHub SSH Key (for Private Repo)

Since this is a private repository, we need to set up SSH authentication with GitHub.

**Generate SSH key on EC2:**

```bash
ssh-keygen -t ed25519 -C "steven@polae.com" -f ~/.ssh/github_ec2 -N ""
```

**Display the public key:**

```bash
cat ~/.ssh/github_ec2.pub
```

**Copy the entire output** (starts with `ssh-ed25519`).

**Add to GitHub:**

1. Go to https://github.com/settings/keys
2. Click **New SSH key**
3. Title: `EC2 Cupid-Simple Server`
4. Key: Paste the public key you copied
5. Click **Add SSH key**

**Configure Git to use the key:**

```bash
cat >> ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_ec2
EOF
```

```bash
chmod 600 ~/.ssh/config
```

**Test the connection:**

```bash
ssh -T git@github.com
```

You should see: `Hi polae! You've successfully authenticated...`

---

## STEP 6: Clone Repository (on EC2)

```bash
git clone git@github.com:polae/chatkit-dev-00.git
git checkout development
git pull origin development
```

```bash
cd chatkit-dev-00/apps/cupid-simple
```

---

## STEP 7: Create Environment File (on EC2)

**Replace `<YOUR_OPENAI_API_KEY>` with your actual OpenAI API key and `<YOUR_EC2_IP>` with your EC2 public IP address!**

```bash
cat > .env << 'EOF'
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
FRONTEND_URLS=http://<YOUR_EC2_IP>
EOF
```

```bash
chmod 600 .env
```

---

## STEP 8: Deploy with Docker Compose (on EC2)

```bash
docker compose up -d --build
```

```bash
# Check status (all should show "Up")
docker compose ps
```

```bash
# View logs (Ctrl+C to exit)
docker compose logs -f
```

---

## STEP 9: Test Deployment

**On EC2:**

```bash
curl http://localhost
```

**On your Mac:**

```bash
curl http://3.136.156.43
```

**In your browser:**

- Open: `http://3.136.156.43`

---

## Useful Commands for Later

**View logs:**

```bash
docker compose logs -f
```

**Restart services:**

```bash
docker compose restart
```

**Stop all services:**

```bash
docker compose down
```

**Update and redeploy:**

```bash
git pull origin main
docker compose down
docker compose up -d --build
```

**Check resource usage:**

```bash
docker stats
```

**Exit EC2 SSH session:**

```bash
exit
```

---

## Troubleshooting

**If containers fail to start:**

```bash
docker compose down -v
docker compose up -d --build
docker compose logs
```

**If you can't connect via browser:**

```bash
# Check if services are running
docker compose ps

# Check if port 80 is accessible
sudo lsof -i :80
```

---

## Next Steps

Once you complete these steps, your cupid-simple app will be live on the internet at `http://3.136.156.43`!

For automatic deployments with GitHub Actions, see the main deployment documentation in `DEPLOY-DOCKER-AWS.md`.
