<p align="center">
  <img src="public/logo.svg" alt="Shipyard Logo" width="120" height="120">
</p>

<h1 align="center">Shipyard</h1>

<p align="center">
  <strong>A self-hosted update server for Electron applications</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#electron-integration">Electron Integration</a> •
  <a href="#api-reference">API</a> •
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
</p>

---

## Features

- 🚀 **Multi-App Support** - Manage updates for multiple Electron applications from one server
- 📦 **Multi-Channel Releases** - Support for `latest`, `beta`, and `alpha` release channels
- 🎯 **Staged Rollouts** - Gradually release updates to a percentage of users
- 🔐 **Private Releases** - Protect releases with API keys for controlled distribution
- 💻 **Multi-Platform** - Support for Windows, macOS, and Linux
- 🗄️ **S3-Compatible Storage** - Uses MinIO (works with AWS S3, Cloudflare R2, etc.)
- 📊 **Analytics Dashboard** - Track downloads and monitor rollout progress
- 🧹 **Automatic Cleanup** - Scheduled job removes orphaned files from storage
- 🎨 **Modern UI** - Clean, responsive management dashboard

<p align="center">
  <img src="docs/screenshot-dashboard.jpg" alt="Dashboard Screenshot" width="800">
</p>

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/LunarForge/Shipyard.git
   cd Shipyard
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env`** with secure passwords:
   ```env
   # Generate a secure secret: openssl rand -base64 32
   NEXTAUTH_SECRET=your-secure-random-secret
   
   # MinIO credentials (minimum 8 characters)
   MINIO_ROOT_PASSWORD=your-secure-minio-password
   S3_SECRET_ACCESS_KEY=your-secure-minio-password
   
   # Initial admin credentials (change after first login!)
   ADMIN_PASSWORD=your-secure-admin-password
   ```

4. **Start the services:**
   ```bash
   docker compose up -d
   ```

5. **Access the dashboard:**
   - Open http://localhost:3000
   - Login with your admin credentials
   - Create your first app and start uploading releases!

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | Secret for session encryption (use `openssl rand -base64 32`) | Yes |
| `NEXTAUTH_URL` | Public URL of your server | Yes |
| `S3_ENDPOINT` | S3/MinIO endpoint URL | Yes |
| `S3_PUBLIC_ENDPOINT` | Public S3 URL for downloads | Yes |
| `S3_ACCESS_KEY_ID` | S3 access key | Yes |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | Yes |
| `S3_BUCKET` | S3 bucket name | No (default: `releases`) |
| `S3_REGION` | S3 region | No (default: `us-east-1`) |
| `ADMIN_USERNAME` | Initial admin username | No (default: `admin`) |
| `ADMIN_PASSWORD` | Initial admin password | Yes |
| `AUTH_TRUST_HOST` | Trust proxy headers | No (default: `true`) |

### Using External S3 (AWS, Cloudflare R2, etc.)

```env
S3_ENDPOINT=https://s3.amazonaws.com
S3_PUBLIC_ENDPOINT=https://your-bucket.s3.amazonaws.com
S3_ACCESS_KEY_ID=your-aws-access-key
S3_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
```

For **Cloudflare R2**:
```env
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_PUBLIC_ENDPOINT=https://your-public-bucket-url.r2.dev
```

## Electron Integration

### Basic Configuration

In your Electron app's `package.json` or `electron-builder.yml`:

```json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://your-server.com/updates/your-app-slug",
      "channel": "latest"
    }
  }
}
```

### Using electron-updater

```javascript
import { autoUpdater } from 'electron-updater';

// Optional: Configure logging
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// Check for updates
autoUpdater.checkForUpdatesAndNotify();

// Handle update events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
});

autoUpdater.on('update-not-available', () => {
  console.log('App is up to date');
});

autoUpdater.on('download-progress', (progress) => {
  console.log(`Downloaded ${progress.percent.toFixed(1)}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  // Prompt user to restart and install
  autoUpdater.quitAndInstall();
});
```

### Private Releases with API Key

For private/restricted releases, configure the API key header:

```javascript
import { autoUpdater } from 'electron-updater';

// Set API key header
autoUpdater.requestHeaders = {
  'X-API-Key': process.env.UPDATE_API_KEY
};

// Or use Authorization header
autoUpdater.requestHeaders = {
  'Authorization': `Bearer ${process.env.UPDATE_API_KEY}`
};

autoUpdater.checkForUpdatesAndNotify();
```

> ⚠️ **Security Note:** Never hardcode API keys. Use environment variables or secure storage like `electron-store` with encryption.

### Channel Switching

Allow users to switch between release channels:

```javascript
import { autoUpdater } from 'electron-updater';

function setUpdateChannel(channel) {
  // 'latest', 'beta', or 'alpha'
  autoUpdater.channel = channel;
  autoUpdater.checkForUpdates();
}

// Example: User selects beta channel in settings
setUpdateChannel('beta');
```

## API Reference

### Update Endpoints (Public)

| Endpoint | Description |
|----------|-------------|
| `GET /updates/{app-slug}/latest.yml` | Stable release manifest |
| `GET /updates/{app-slug}/beta.yml` | Beta release manifest |
| `GET /updates/{app-slug}/alpha.yml` | Alpha release manifest |
| `GET /updates/{app-slug}/download/{filename}` | Download release file |

### Management API (Authenticated)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/apps` | GET, POST | List/create apps |
| `/api/apps/{id}` | GET, PATCH, DELETE | Manage app |
| `/api/releases` | GET, POST | List/create releases |
| `/api/releases/{id}` | GET, PATCH, DELETE | Manage release |
| `/api/releases/{id}/files` | POST | Upload file to release |
| `/api/releases/{id}/keys` | POST | Create API key |
| `/api/keys/{id}` | DELETE | Revoke API key |
| `/api/stats` | GET | Download statistics |
| `/api/cleanup` | GET, POST | Storage cleanup |

## Deployment

### Production Checklist

- [ ] Set strong, unique passwords for all services
- [ ] Generate a secure `NEXTAUTH_SECRET`: `openssl rand -base64 32`
- [ ] Use HTTPS with a reverse proxy (nginx, Caddy, Traefik)
- [ ] Configure firewall rules (only expose ports 80/443)
- [ ] Set up regular database backups
- [ ] Consider external S3 for storage redundancy
- [ ] Change default admin password after first login
- [ ] Set `NODE_ENV=production`

### Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name updates.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for large file uploads
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        client_max_body_size 500M;
    }
}
```

### Docker Compose (Production)

```yaml
services:
  app:
    image: ghcr.io/lunarforge/shipyard:latest
    restart: always
    environment:
      - NODE_ENV=production
    # ... rest of config
```

## Development

### Local Setup

```bash
# Install dependencies
npm install

# Start database and MinIO
docker compose up -d postgres minio minio-init

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Start development server
npm run dev
```

### Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Storage:** S3-compatible (MinIO)
- **Auth:** NextAuth.js v5
- **UI:** Tailwind CSS + shadcn/ui
- **Icons:** Lucide React

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   Next.js App    │  │      MinIO       │                │
│  │   (Port 3000)    │──│   (Port 9000)    │                │
│  │                  │  │                  │                │
│  │  • Dashboard     │  │  • File Storage  │                │
│  │  • API Routes    │  │  • Presigned URLs│                │
│  │  • Update Server │  │                  │                │
│  └────────┬─────────┘  └──────────────────┘                │
│           │                                                  │
│  ┌────────┴─────────┐                                       │
│  │   PostgreSQL     │                                       │
│  │   (Port 5432)    │                                       │
│  │                  │                                       │
│  │  • Apps          │                                       │
│  │  • Releases      │                                       │
│  │  • Users/Keys    │                                       │
│  │  • Statistics    │                                       │
│  └──────────────────┘                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [electron-updater](https://www.electron.build/auto-update) for the update protocol
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [MinIO](https://min.io/) for S3-compatible storage

---

<p align="center">
  Made with ❤️ for the Electron community
</p>
