# Pandora Garments — Performance Evaluation System

## Stack
- Frontend: React + TypeScript + Vite (built to `frontend/dist/`)
- Backend: PHP 8.0+
- Database: MySQL 5.7+ / MariaDB 10+

## Server Requirements
- PHP 8.0+ with `pdo_mysql`, `json`, `mbstring` extensions
- MySQL or MariaDB
- Apache or Nginx (or PHP built-in server for testing)

## Setup Instructions

### 1. Database
```sql
CREATE DATABASE pandora_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pandora'@'localhost' IDENTIFIED BY 'yourpassword';
GRANT ALL PRIVILEGES ON pandora_db.* TO 'pandora'@'localhost';
FLUSH PRIVILEGES;
```
Then import the schema:
```bash
mysql -u pandora -p pandora_db < backend/schema.sql
```

### 2. Configure DB credentials
Edit `backend/db.php` and set your host, dbname, user, password.

### 3. Deploy files
Copy everything to your web root (e.g. `/var/www/html/pandora/`).

### Apache — add to `.htaccess` or VirtualHost:
```apache
RewriteEngine On
# API routes → PHP
RewriteRule ^(employees|evaluations|dashboard|reports|health)(.*) /pandora/backend/api.php [L,QSA]
# SPA fallback
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ /pandora/frontend/dist/index.html [L]
```

### Nginx config:
```nginx
location ~ ^/(employees|evaluations|dashboard|reports|health) {
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    fastcgi_param SCRIPT_FILENAME /var/www/html/pandora/backend/api.php;
    include fastcgi_params;
}
location / {
    try_files $uri /pandora/frontend/dist/index.html;
}
```

### 4. Set API URL in frontend
Edit `frontend/src/api.ts` → set `BASE` to your server URL, then rebuild:
```bash
cd frontend && npm install && npm run build
```

### 5. Quick test (built-in PHP server)
```bash
cd /path/to/pandora && php -S 0.0.0.0:8080 server.php
```
