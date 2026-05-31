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

## 4. Configure Nginx

Create `/etc/nginx/sites-available/rag-pipeline`:

```nginx
server {
  listen 80;
  server_name ragpipeline.exaultlabs.com;

  root /var/www/rag-pipeline;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/rag-pipeline /etc/nginx/sites-enabled/rag-pipeline
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Add HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ragpipeline.exaultlabs.com
```

## 6. Add GitHub Actions Secrets

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

## 7. Deploy

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

