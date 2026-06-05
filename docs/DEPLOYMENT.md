# Deployment Guide

This project deploys two build artifacts:

- Angular static files from `frontend/dist/rag-pipeline-demo-angular/browser/`
- Spring Boot jar from `spring-backend/target/rag-pipeline-spring-1.0.0-SNAPSHOT.jar`

The only public URL is:

```text
https://ragpipeline.exaultlabs.com
```

The Java backend stays private on the server. Nginx forwards browser requests from `/api/*` to the private Spring process.

## Open Source Safety Checklist

- Never commit `.env`, certificates, private keys, passwords, or cloud credentials.
- Keep SSH keys only in GitHub Actions secrets.
- Put server-specific values in GitHub Actions secrets or ignored local files.
- If a secret was ever committed, rotate it. Removing it in a later commit is not enough.

The root `.gitignore` blocks common secret files, local Spring overrides, certificates, logs, build output, and provider config files.

## 1. Prepare DNS

Create one DNS record:

```text
ragpipeline.exaultlabs.com  A record -> your server IP
```

## 2. Prepare Ubuntu Server

```bash
sudo apt update
sudo apt install -y openjdk-17-jre nginx rsync
sudo mkdir -p /opt/rag-pipeline/backend
sudo mkdir -p /var/www/rag-pipeline
sudo chown -R $USER:$USER /opt/rag-pipeline /var/www/rag-pipeline
```

## 3. Create Spring Service

Create `/etc/systemd/system/rag-pipeline.service`:

```ini
[Unit]
Description=RAG Pipeline Spring API
After=network.target

[Service]
WorkingDirectory=/opt/rag-pipeline/backend
ExecStart=/usr/bin/java -jar /opt/rag-pipeline/backend/rag-pipeline-spring.jar
Environment=SERVER_PORT=8080
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rag-pipeline
```

Spring listens only on the server. Do not open port `8080` in your public firewall.

## 4. Allow Deployment Sudo

GitHub Actions connects over SSH as `opsadmin`. It cannot type a sudo password, so the deployment user needs passwordless sudo for the small set of commands used by the workflow.

Run this once on the server:

```bash
sudo tee /etc/sudoers.d/rag-pipeline-deploy > /dev/null <<'EOF'
opsadmin ALL=(root) NOPASSWD: /usr/bin/mkdir, /usr/bin/cp, /usr/bin/rsync, /usr/bin/tee, /usr/bin/ln, /usr/bin/test, /usr/sbin/nginx, /usr/bin/systemctl, /usr/bin/apt-get, /usr/bin/certbot
EOF

sudo chmod 440 /etc/sudoers.d/rag-pipeline-deploy
sudo visudo -cf /etc/sudoers.d/rag-pipeline-deploy
```

If any command path differs on your server, check it with:

```bash
which mkdir cp rsync tee ln test nginx systemctl apt-get certbot
```

Then update `/etc/sudoers.d/rag-pipeline-deploy` with the actual path.

Verify non-interactive sudo works:

```bash
sudo -n nginx -t
sudo -n systemctl status nginx --no-pager
```

## 5. Configure Nginx

Use this idempotent setup. It can be run more than once.

```bash
APP_DOMAIN="ragpipeline.exaultlabs.com"
APP_ROOT="/var/www/rag-pipeline"
NGINX_SITE="/etc/nginx/sites-available/rag-pipeline"
NGINX_ENABLED="/etc/nginx/sites-enabled/rag-pipeline"

sudo mkdir -p "$APP_ROOT"

sudo tee "$NGINX_SITE" > /dev/null <<EOF
server {
  listen 80;
  server_name $APP_DOMAIN;

  root $APP_ROOT;
  index index.html;

  location / {
    try_files \$uri \$uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF

if [ ! -L "$NGINX_ENABLED" ]; then
  sudo ln -s "$NGINX_SITE" "$NGINX_ENABLED"
fi

sudo nginx -t
sudo systemctl reload nginx
```

This keeps the backend private. The only public hostname is `ragpipeline.exaultlabs.com`; requests to `/api/*` are forwarded inside the server to `127.0.0.1:8080`.

## 6. Add HTTPS Certificate

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Generate the certificate only if it does not already exist:

```bash
APP_DOMAIN="ragpipeline.exaultlabs.com"
CERT_PATH="/etc/letsencrypt/live/$APP_DOMAIN/fullchain.pem"

if sudo test -f "$CERT_PATH"; then
  echo "Certificate already exists for $APP_DOMAIN. Not replacing it."
else
  sudo certbot --nginx \
    -d "$APP_DOMAIN" \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    --redirect
fi

sudo nginx -t
sudo systemctl reload nginx
```

Check renewal is enabled:

```bash
sudo systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

Certbot stores certificates under:

```text
/etc/letsencrypt/live/ragpipeline.exaultlabs.com/
```

Do not copy these certificates into GitHub or the repository.

## 7. Add GitHub Actions Secrets

Open:

```text
GitHub repository -> Settings -> Secrets and variables -> Actions
```

Add:

- `SSH_HOST`: server IP or SSH hostname
- `SSH_USER`: SSH username
- `SSH_PORT`: usually `22`
- `SSH_PRIVATE_KEY`: private deployment key

Do not commit these values.

## 8. Deploy

The workflow in `.github/workflows/deploy.yml` runs on each push to `main`. It:

1. Builds the Spring jar.
2. Builds the Angular static website.
3. Uploads only those build artifacts.
4. Restarts the private Spring service.
5. Validates and reloads Nginx.

## Smoke Test

1. Open `https://ragpipeline.exaultlabs.com`.
2. Confirm the UI reports that Spring Boot is ready.
3. Click `Run Pipeline`.
4. Confirm narration finishes each step before advancing.
5. Ask: `How does a RAG pipeline reduce hallucinations?`
6. Confirm the answer includes retrieved context and sources.
