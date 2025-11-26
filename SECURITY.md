# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Please DO NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security vulnerabilities via:

🔒 **GitHub's private vulnerability reporting** (preferred):  
[Report a vulnerability](https://github.com/LunarForge/Shipyard/security/advisories/new)

Or email: **security@lunarforge.dev**

### What to Include

Please include as much of the following information as possible:

- Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
- Full paths of affected source files
- Step-by-step instructions to reproduce
- Proof-of-concept or exploit code (if possible)
- Impact assessment

### Response Timeline

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix Timeline:** Depends on severity (critical: ASAP, high: 30 days, medium: 90 days)

### What to Expect

1. **Acknowledgment:** We'll confirm receipt of your report
2. **Assessment:** We'll assess the vulnerability and its impact
3. **Fix Development:** We'll develop and test a fix
4. **Disclosure:** We'll coordinate disclosure timing with you
5. **Credit:** We'll credit you in release notes (unless you prefer anonymity)

## Security Best Practices for Deployment

### Environment Variables

- Never commit `.env` files
- Use strong, unique passwords
- Generate secure secrets: `openssl rand -base64 32`
- Rotate credentials periodically

### Network Security

- Always use HTTPS in production
- Use a reverse proxy (nginx, Caddy, Traefik)
- Configure firewalls to only expose necessary ports
- Consider IP whitelisting for admin access

### Database

- Use strong PostgreSQL passwords
- Enable SSL for database connections in production
- Regular backups with encryption
- Don't expose database port publicly

### S3/MinIO

- Use strong access keys
- Enable bucket versioning for backups
- Consider encryption at rest
- Restrict bucket policies

### Application

- Change default admin password immediately
- Implement rate limiting for public endpoints
- Monitor logs for suspicious activity
- Keep dependencies updated

## Known Security Considerations

### API Keys

- API keys are stored as bcrypt hashes
- Keys are only shown once at creation time
- Keys can be revoked at any time

### Authentication

- Sessions are encrypted with NEXTAUTH_SECRET
- Passwords are hashed with bcrypt (12 rounds)
- Session tokens expire after inactivity

### File Uploads

- Files are uploaded directly to S3 via presigned URLs
- File types are not restricted (intentional for release artifacts)
- Large file support via multipart uploads

## Vulnerability Disclosure Policy

We follow a coordinated disclosure approach:

1. Reporter submits vulnerability privately
2. We acknowledge and assess
3. We develop and test a fix
4. We release the fix
5. We publicly disclose after users have time to update

We ask that you:
- Give us reasonable time to fix before public disclosure
- Don't access or modify other users' data
- Don't perform attacks that degrade service
- Don't social engineer our team or users

## Recognition

We appreciate security researchers who help keep Shipyard secure. With your permission, we'll acknowledge your contribution in:

- Release notes
- Security advisory
- Hall of Fame (if we create one)

Thank you for helping keep Shipyard and its users safe! 🛡️
