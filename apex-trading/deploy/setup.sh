#!/usr/bin/env bash
# APEX Trading System — Hetzner VPS Bootstrap
# Tested on: Ubuntu 22.04 LTS (Hetzner CX21 or larger)
# Run as root: bash setup.sh
set -euo pipefail

APEX_USER="apex"
APEX_DIR="/opt/apex-trading"
PYTHON_VERSION="3.11"
NODE_VERSION="20"

echo "=== APEX Trading System Setup ==="
echo "Server: $(hostname) | $(date)"

# ── 1. System packages ────────────────────────────────────────────────────────
apt-get update -qq
apt-get install -y \
  curl wget git unzip build-essential \
  python${PYTHON_VERSION} python${PYTHON_VERSION}-venv python${PYTHON_VERSION}-dev \
  python3-pip nginx certbot python3-certbot-nginx \
  sqlite3 ufw fail2ban htop

# ── 2. Node.js 20 ─────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node --version) | npm: $(npm --version)"

# ── 3. Create system user ─────────────────────────────────────────────────────
if ! id "${APEX_USER}" &>/dev/null; then
  useradd -r -m -d /home/${APEX_USER} -s /bin/bash ${APEX_USER}
  echo "Created user: ${APEX_USER}"
fi

# ── 4. Clone / copy project ───────────────────────────────────────────────────
if [ ! -d "${APEX_DIR}" ]; then
  mkdir -p "${APEX_DIR}"
  chown ${APEX_USER}:${APEX_USER} "${APEX_DIR}"
fi

# Assumes repo is already cloned at /tmp/apex-trading-source
if [ -d "/tmp/apex-trading-source" ]; then
  cp -r /tmp/apex-trading-source/. "${APEX_DIR}/"
  chown -R ${APEX_USER}:${APEX_USER} "${APEX_DIR}"
fi

# ── 5. Python virtual environment ─────────────────────────────────────────────
VENV="${APEX_DIR}/backend/venv"
if [ ! -d "${VENV}" ]; then
  python${PYTHON_VERSION} -m venv "${VENV}"
fi
"${VENV}/bin/pip" install --upgrade pip -q
"${VENV}/bin/pip" install -r "${APEX_DIR}/backend/requirements.txt" -q
echo "Python venv ready: ${VENV}"

# ── 6. Frontend build ─────────────────────────────────────────────────────────
FRONTEND="${APEX_DIR}/frontend"
cd "${FRONTEND}"
npm ci --silent
npm run build
echo "Frontend built: ${FRONTEND}/dist"

# ── 7. .env file ─────────────────────────────────────────────────────────────
ENV_FILE="${APEX_DIR}/backend/.env"
if [ ! -f "${ENV_FILE}" ]; then
  cp "${APEX_DIR}/.env.example" "${ENV_FILE}"
  chown ${APEX_USER}:${APEX_USER} "${ENV_FILE}"
  chmod 600 "${ENV_FILE}"
  echo "⚠  Created ${ENV_FILE} — fill in API keys before starting!"
fi

# ── 8. Nginx config ───────────────────────────────────────────────────────────
DOMAIN="${APEX_DOMAIN:-localhost}"
cat > /etc/nginx/sites-available/apex-trading << NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    # React frontend (built files)
    root ${APEX_DIR}/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # FastAPI backend proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 60s;
    }

    # Watchdog health
    location /health {
        proxy_pass http://127.0.0.1:8001;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/apex-trading /etc/nginx/sites-enabled/apex-trading
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "Nginx configured for domain: ${DOMAIN}"

# ── 9. SSL (skip if localhost) ────────────────────────────────────────────────
if [ "${DOMAIN}" != "localhost" ]; then
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos \
    -m "${APEX_ADMIN_EMAIL:-admin@example.com}" || echo "⚠  Certbot failed — set up SSL manually"
fi

# ── 10. Systemd services ──────────────────────────────────────────────────────
cp "${APEX_DIR}/deploy/apex-backend.service"  /etc/systemd/system/
cp "${APEX_DIR}/deploy/apex-watchdog.service" /etc/systemd/system/

systemd-analyze verify /etc/systemd/system/apex-backend.service  2>/dev/null || true
systemd-analyze verify /etc/systemd/system/apex-watchdog.service 2>/dev/null || true

systemctl daemon-reload
systemctl enable apex-backend apex-watchdog
systemctl start  apex-backend apex-watchdog

# ── 11. Firewall ──────────────────────────────────────────────────────────────
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
echo "Firewall enabled"

# ── 12. Log rotation ──────────────────────────────────────────────────────────
cat > /etc/logrotate.d/apex-trading << LOGROTATE
/var/log/apex/*.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
    copytruncate
}
LOGROTATE
mkdir -p /var/log/apex
chown ${APEX_USER}:${APEX_USER} /var/log/apex

echo ""
echo "=== Setup complete ==="
echo "1. Fill in API keys: nano ${ENV_FILE}"
echo "2. Restart services: systemctl restart apex-backend apex-watchdog"
echo "3. Check status:     systemctl status apex-backend"
echo "4. View logs:        journalctl -u apex-backend -f"
echo "5. Dashboard:        http://${DOMAIN}"
