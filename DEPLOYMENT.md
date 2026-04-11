# Deployment Guide - Financial Agent

## Pre-Deployment Checklist

### 1. Verify Build
```bash
cd financial-agent
pnpm install
pnpm build
```

### 2. Run Tests
```bash
pnpm test
pnpm test -- --coverage  # Verify >90% coverage
```

### 3. Environment Setup
```bash
# Copy .env.example to .env and configure:
cp .env.example .env

# Required variables:
# OPENAI_API_KEY=sk-...
# DATABASE_URL=postgresql://...  (if using database)
# NODE_ENV=production
```

---

## Deployment Options

### Option 1: Vercel (Recommended for Web + API)

#### Prerequisites
- Vercel account
- Git repository connected

#### Steps
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or use GitHub integration:
# 1. Connect repo to Vercel dashboard
# 2. Auto-deploy on push
```

#### Vercel Configuration (create vercel.json if needed)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/api/src/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "apps/web",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api"
    },
    {
      "src": "/(.*)",
      "dest": "/apps/web"
    }
  ]
}
```

---

### Option 2: Docker (Self-Hosted)

#### Prerequisites
- Docker installed
- Server/VPS to host container

#### Dockerfile (create in root)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm i -g pnpm

# Copy files
COPY . .

# Install dependencies
RUN pnpm install

# Build
RUN pnpm build

# Set environment
ENV NODE_ENV=production

# Expose ports
EXPOSE 3000 3001

# Start both apps
CMD ["pnpm", "start"]
```

#### Build & Run
```bash
# Build image
docker build -t financial-agent:latest .

# Run container
docker run -p 3000:3000 -p 3001:3001 \
  -e OPENAI_API_KEY=sk-... \
  financial-agent:latest

# Or use docker-compose (create docker-compose.yml)
docker-compose up -d
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PORT=3000
    restart: unless-stopped

  web:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://api:3000
    depends_on:
      - api
    restart: unless-stopped
```

---

### Option 3: Railway / Render (Easy Self-Hosted)

#### Railway
```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

#### Render
1. Push code to GitHub
2. Connect repo to Render dashboard
3. Select "Node" environment
4. Set build command: `pnpm build`
5. Set start command: `pnpm start`

---

### Option 4: AWS / GCP / Azure (Enterprise)

#### AWS EC2
```bash
# SSH into instance
ssh -i key.pem ec2-user@your-instance

# Clone repo
git clone your-repo.git
cd financial-agent

# Install Node/pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

# Install & build
pnpm install
pnpm build

# Start with PM2
npm i -g pm2
pm2 start "pnpm start" --name financial-agent
pm2 save
pm2 startup
```

#### GCP Cloud Run
```bash
# Build image
gcloud builds submit --tag gcr.io/PROJECT_ID/financial-agent

# Deploy
gcloud run deploy financial-agent \
  --image gcr.io/PROJECT_ID/financial-agent \
  --platform managed \
  --region us-central1 \
  --set-env-vars OPENAI_API_KEY=sk-...
```

---

## Post-Deployment Verification

### 1. Health Checks
```bash
# Check API health
curl http://your-domain.com/api/health

# Check Web UI
curl http://your-domain.com
```

### 2. Run Smoke Tests
```bash
# Basic endpoint test
curl -X POST http://your-domain.com/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Cuál es el dólar hoy?",
    "userId": "test-user",
    "mode": "information"
  }'
```

### 3. Monitor Logs
```bash
# Vercel
vercel logs

# Docker
docker logs -f financial-agent

# PM2
pm2 logs financial-agent
```

### 4. Performance Check
```bash
# Test latency
time curl http://your-domain.com/api/agents/chat

# Load test (optional)
npm i -g artillery
artillery quick --count 10 --num 100 http://your-domain.com/api/agents/chat
```

---

## Environment Variables Required

```env
# API
OPENAI_API_KEY=sk-your-key-here
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database (if used)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Web
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_ENV=production

# Security
API_RATE_LIMIT_ENABLED=true
SECURITY_HEADERS_ENABLED=true
```

---

## Rollback Plan

### If deployment fails:
```bash
# Vercel
vercel rollback

# Docker
docker run -d -p 3000:3000 financial-agent:previous-tag

# Git
git revert HEAD
git push origin main
```

---

## Monitoring & Logging

### Set up monitoring for:
- ✅ API response time (target <500ms p95)
- ✅ Error rate (target <1%)
- ✅ Memory usage (target <200MB)
- ✅ CPU usage (target <50%)
- ✅ Rate limit hits
- ✅ Security events (PII detection, SSRF blocks)

### Recommended tools:
- **Vercel Analytics** (if using Vercel)
- **DataDog** (comprehensive APM)
- **New Relic** (enterprise monitoring)
- **Sentry** (error tracking)
- **LogRocket** (session replay)

---

## Security Checklist Before Production

- [ ] Verify HTTPS/TLS enabled
- [ ] Set secure CORS headers
- [ ] Enable rate limiting
- [ ] Configure API key rotation
- [ ] Enable audit logging
- [ ] Set up DDoS protection
- [ ] Configure WAF rules
- [ ] Enable security headers (CSP, X-Frame-Options, etc.)
- [ ] Test security endpoints (injection, PII detection)
- [ ] Review environment variables (no secrets in code)

---

## Support & Troubleshooting

### Common Issues

**Issue: Build fails**
```bash
# Clear cache and rebuild
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

**Issue: API timeout**
```bash
# Increase timeout in deployment
# Vercel: Functions can run up to 60s
# Docker: Ensure adequate resources
# Nginx: Increase proxy_read_timeout
```

**Issue: Memory leak**
```bash
# Restart service
docker restart financial-agent
pm2 restart financial-agent

# Monitor memory
docker stats financial-agent
pm2 monit
```

**Issue: Rate limiting not working**
```bash
# Verify Redis/memory backend
# Check rate limit configuration
# Review logs for ToolRateLimiter errors
```

---

## Deployment Checklist

- [ ] All tests passing (>90% coverage)
- [ ] Build succeeds without errors
- [ ] Environment variables configured
- [ ] Security audit passed
- [ ] Performance baseline measured
- [ ] Monitoring/logging enabled
- [ ] Rollback plan ready
- [ ] Team notified of deployment
- [ ] Backup created (if applicable)

---

## Post-Deployment Runbook

1. **Monitor first 24 hours**
   - Check error logs every 1 hour
   - Monitor memory/CPU usage
   - Verify rate limiting is working

2. **Weekly checks**
   - Review security logs
   - Check for deprecated dependencies
   - Monitor API latency trends

3. **Monthly maintenance**
   - Update dependencies (if minor versions)
   - Review & rotate API keys
   - Analyze performance metrics
   - Update documentation

---

**Ready to deploy? Choose your option above and follow the steps!**
