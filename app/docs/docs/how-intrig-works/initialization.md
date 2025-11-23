# Initialization

Project setup and configuration initialization for Intrig integration. Establishes base configuration files, configures package dependencies, and prepares the project structure for SDK generation.

---

## Initialization Process

The `intrig init` command performs three primary operations:

1. **Dependency Verification**: Confirms framework-specific Intrig packages are installed
2. **Configuration Creation**: Generates `intrig.config.json` with base settings
3. **Repository Configuration**: Updates `.gitignore` to exclude generated and temporary files

---

## Command

```bash
intrig init
```

Execute from the project root directory. The command detects the project type and configures accordingly.

---

## Configuration File

Initialization creates `intrig.config.json` in the project root:

```json
{
  "$schema": "https://raw.githubusercontent.com/intrigsoft/intrig-registry/refs/heads/main/schema.json",
  "sources": [],
  "generator": "react"
}
```

### Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `$schema` | `string` | JSON schema URL for editor validation and autocomplete |
| `sources` | `array` | API source definitions (populated via `intrig sources add`) |
| `generator` | `string` | Target framework for code generation (`react`, `next`, etc.) |

---

## Package Dependencies

Initialization verifies the presence of required packages based on the target framework:

**React Projects**:
```json
{
  "dependencies": {
    "@intrig/core": "^0.x.x",
    "@intrig/react": "^0.x.x"
  }
}
```

**Next.js Projects**:
```json
{
  "dependencies": {
    "@intrig/core": "^0.x.x",
    "@intrig/next": "^0.x.x"
  }
}
```

If packages are missing, initialization will prompt for installation.

---

## Repository Configuration

### Git Ignore

Initialization appends Intrig-specific exclusions to `.gitignore`:

```
# Intrig
.intrig/cache/
.intrig/daemon/
node_modules/@intrig/
```

**Included in Version Control**:
- `intrig.config.json` - Source configuration
- `.intrig/specs/` - Normalized OpenAPI specifications

**Excluded from Version Control**:
- `.intrig/cache/` - Temporary cache files
- `.intrig/daemon/` - Daemon runtime files
- Generated SDK in `node_modules` (regenerated during build)

---

## Post-Initialization Steps

After initialization, proceed with:

1. **Source Configuration**: Add API sources via `intrig sources add`
2. **Synchronization**: Fetch specifications with `intrig sync --all`
3. **Generation**: Generate SDK with `intrig generate`

---

## Verification

Confirm successful initialization:

```bash
# Check configuration file exists
cat intrig.config.json

# Verify Intrig CLI is accessible
intrig --version

# Check .gitignore contains Intrig exclusions
grep -A 3 "# Intrig" .gitignore
```

---

## Re-initialization

Running `intrig init` on an existing configuration:

- Preserves existing `intrig.config.json` content
- Updates `.gitignore` if Intrig exclusions are missing
- Verifies package dependencies

Re-initialization is safe and idempotent.

---

## Framework Detection

Initialization detects the target framework through:

1. **package.json dependencies**: Checks for React, Next.js, or other framework packages
2. **Explicit flag**: Use `--generator` flag to specify framework

```bash
# Force specific generator
intrig init --generator next
```

---

## Troubleshooting

### Missing Configuration File

**Symptom**: `intrig.config.json` not created

**Cause**: Insufficient permissions or directory is not a valid project root

**Resolution**: Ensure current directory contains `package.json` and has write permissions

### Incorrect Generator

**Symptom**: Wrong framework configured in `generator` field

**Cause**: Framework detection selected incorrect generator

**Resolution**: Manually edit `intrig.config.json` or re-run with `--generator` flag

### Package Installation Fails

**Symptom**: Dependency verification fails

**Cause**: Network issues or package version conflicts

**Resolution**: Manually install required packages: `npm install @intrig/core @intrig/react`

---

## Related Documentation

- [Source Management](./source-management.md) - Adding API sources after initialization
- [Getting Started](../getting-started.md) - Complete setup tutorial
- [CLI Reference](../cli-reference.mdx) - Full command documentation
