#!/bin/bash
set -e

SERVICE_FILE="/etc/systemd/system/aof2.service"
APP_DIR="/home/ubuntu/aof2"
NODE_PATH=$(which node)

echo "=== Criando service file em $SERVICE_FILE ==="

sudo tee $SERVICE_FILE > /dev/null <<EOL
[Unit]
Description=AOF2 Node.js Service
After=network.target

[Service]
ExecStart=${NODE_PATH} ${APP_DIR}/index.js
WorkingDirectory=${APP_DIR}
Restart=always
RestartSec=10
User=ubuntu
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

echo "=== Recarregando systemd e habilitando serviço ==="
sudo systemctl daemon-reload
sudo systemctl enable aof2
sudo systemctl start aof2

echo "=== Serviço aof2 instalado e em execução! ==="
echo "Use: sudo systemctl status aof2"
