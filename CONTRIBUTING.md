# Contributing to Shipyard

Thank you for your interest in contributing to Shipyard! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/Shipyard/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Docker version, etc.)
   - Relevant logs or screenshots

### Suggesting Features

1. Check existing issues and discussions for similar suggestions
2. Create a new issue with the `enhancement` label
3. Describe the feature and its use case
4. Explain why this would benefit other users

### Pull Requests

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** following our coding standards
5. **Test** your changes thoroughly
6. **Commit** with clear, descriptive messages:
   ```bash
   git commit -m "feat: add amazing new feature"
   ```
7. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Open a Pull Request** against the `main` branch

## Development Setup

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Git

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Shipyard.git
cd Shipyard

# Install dependencies
npm install

# Start services
docker compose up -d postgres minio minio-init

# Setup database
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# Start dev server
npm run dev
```

### Running Tests

```bash
# Run linting
npm run lint

# Type checking
npm run type-check

# Build test
npm run build
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types when possible
- Use interfaces for object shapes

### Code Style

- Use Prettier for formatting (configured in project)
- Use ESLint rules (configured in project)
- Use meaningful variable and function names
- Add comments for complex logic

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### File Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/          # API endpoints
│   ├── dashboard/    # Dashboard pages
│   └── updates/      # Public update endpoints
├── components/       # React components
│   └── ui/           # shadcn/ui components
├── lib/              # Utility functions and configurations
└── generated/        # Auto-generated files (Prisma)
```

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Added/updated tests if applicable
- [ ] Updated documentation if needed
- [ ] No console.log or debugging code
- [ ] No hardcoded secrets or credentials

### PR Description

Include:
- What changes were made
- Why the changes were needed
- How to test the changes
- Screenshots for UI changes

## Security

If you discover a security vulnerability, please DO NOT open a public issue. Instead, see our [Security Policy](SECURITY.md) for responsible disclosure.

## Questions?

Feel free to open a [Discussion](https://github.com/yourusername/Shipyard/discussions) for questions or ideas.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Shipyard! 🚀
