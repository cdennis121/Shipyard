# Changelog

All notable changes to Shipyard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Shipyard
- Multi-app support for managing multiple Electron applications
- Multi-channel releases (latest, beta, alpha)
- Staged rollouts with configurable percentage
- Private releases with API key protection
- Multi-platform support (Windows, macOS, Linux)
- S3-compatible storage (MinIO, AWS S3, Cloudflare R2)
- Analytics dashboard for download tracking
- Automatic cleanup of orphaned files
- Modern, responsive management dashboard
- Docker Compose deployment
- User management with role-based access
- API for Electron autoUpdater integration

### Security
- Secure authentication with NextAuth.js
- API key management for protected releases
- Environment-based configuration for secrets

## [0.0.1-alpha] - 2024-11-26

### Added
- Initial alpha release
- Core functionality for Electron update management
- Basic dashboard UI
- Docker deployment support

[Unreleased]: https://github.com/LunarForge/Shipyard/compare/v0.0.1-alpha...HEAD
[0.0.1-alpha]: https://github.com/LunarForge/Shipyard/releases/tag/v0.0.1-alpha
