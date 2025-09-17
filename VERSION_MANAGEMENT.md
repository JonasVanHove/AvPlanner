# Version Management

This project uses Git commit-based version management that automatically extracts version information from commit messages and displays it in the team settings.

## How it works

- Version is automatically extracted from Git commit messages
- Supports various version patterns in commit messages
- Git commit hash and branch are automatically detected
- Version info is displayed in team settings page
- No manual version file updates needed

## Version Detection

The system looks for version patterns in commit messages:
- `v1.5.0` or `1.5.0` - Direct version number
- `version 1.5.0` - Version keyword
- `bump to v1.5.0` - Version bump
- `release v1.5.0` - Release version
- `chore: bump version to v1.5.1` - Standard format

If no version is found in recent commits, it falls back to `1.5.{commit_count}`.

## Version Display

The version appears in:
1. **Team Settings Info Section**: Shows app version with build info and commit message tooltip
2. **Page Footer**: Subtle version indicator with latest commit message
3. **API Endpoint**: `/api/version` provides full version data

## Commit Message Examples

```bash
git commit -m "feat: add new dashboard v1.6.0"
git commit -m "fix: resolve login issue v1.5.3"  
git commit -m "release v2.0.0: major UI overhaul"
git commit -m "bump version to v1.5.2"
git commit -m "v1.5.1 - hotfix for database connection"
```

## Version Format

- **Development**: `v1.5.1 • v1.5-development-zone@6ca7b59 • dev`
- **Production**: `v1.5.1 • 6ca7b59`
- **Fallback**: `v1.5.{commit_count}` (if no version in commits)

## Workflow

1. **Make changes** to your code
2. **Commit with version** in message: `git commit -m "feat: new feature v1.6.0"`
3. **Version automatically detected** from commit message
4. **Displayed in settings** immediately after commit

## Version Patterns Supported

The system recognizes these patterns (case-insensitive):
- `v1.5.0`, `1.5.0`
- `version v1.5.0`, `version 1.5.0`
- `bump to v1.5.0`, `bump v1.5.0`
- `release v1.5.0`, `release 1.5.0`
- `^v1.5.0` (starting with version)

## Files Involved

- `lib/version.ts` - Git-based version detection with pattern matching
- `hooks/use-version.ts` - Client-side version hook with commit message
- `app/api/version/route.ts` - Version API endpoint
- Team settings page - Displays version with commit context

## Fallback Strategy

1. **Primary**: Extract from latest commit message
2. **Secondary**: Search last 10 commits for version
3. **Tertiary**: Use commit count as patch version (`1.5.{count}`)
4. **Ultimate**: Default to `1.5.0`

The system automatically detects:
- Version from commit messages
- Current git branch
- Latest commit hash
- Latest commit message
- Build date
- Environment (dev/prod)
