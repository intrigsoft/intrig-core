# CI/CD Integration

Integrate Intrig into your continuous integration and deployment pipelines for automated SDK generation and type-safe builds.

---

## Overview

Intrig supports a CI workflow where:

1. **Normalized specs are committed to git** - The `intrig sync` command fetches and normalizes OpenAPI specifications into the `.intrig` directory
2. **Generated SDK is git-ignored** - The `intrig generate` command outputs compiled TypeScript to `node_modules/@intrig`, which should not be committed
3. **CI regenerates SDK from committed specs** - Each build runs `intrig generate` to produce the SDK from the committed normalized specifications

This approach ensures reproducible builds while keeping generated code out of version control.

---

## The `--ci` Flag

Use the `--ci` flag for all Intrig commands in CI environments:

```bash
intrig generate --ci
intrig sync --all --ci
```

**Behavior with `--ci`:**

- **No daemon startup** - Runs without the background daemon process
- **Non-interactive mode** - Skips all prompts, using defaults or failing if input is required
- **Explicit exit codes** - Returns non-zero exit code on any failure
- **Optimized for automation** - No progress spinners or interactive UI elements

---

## Recommended Workflow

### Local Development

1. Run `intrig sync` when API specifications change
2. Commit the normalized specs (`.intrig` directory) to the repository
3. Run `intrig generate` for local development

### CI Pipeline

1. Install dependencies (`npm ci` or equivalent)
2. Run `intrig generate --ci` as a pre-build step
3. Run regular build (TypeScript compilation, bundling, etc.)

Breaking changes in API specs surface as TypeScript compilation errors, blocking the build before deployment.

---

## Pipeline Examples

### GitHub Actions

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx intrig generate --ci
      - run: npm run build
```

### GitLab CI

```yaml
build:
  stage: build
  script:
    - npm ci
    - npx intrig generate --ci
    - npm run build
```

### Generic (Any CI)

```bash
npm ci
npx intrig generate --ci
npm run build
```

---

## Failure Handling

### When `intrig generate --ci` Fails

- Exit code is non-zero
- CI pipeline stops immediately
- Check logs for spec validation errors or generation issues
- Verify the `.intrig` directory contains valid normalized specifications

### When TypeScript Compilation Fails After Successful Generation

- Indicates a breaking API change
- Review spec changes in committed normalized specs (`.intrig` directory)
- Update application code to match the new API contract
- Common issues: renamed endpoints, changed parameter types, removed fields

---

## Advanced: Full Contract Validation (Experimental)

:::warning Experimental
This workflow pattern is not yet battle-tested. The recommended approach is committing normalized specs and running only `generate` in CI.
:::

For pipelines where backend deploys before frontend, you can validate against live API endpoints:

```bash
npx intrig sync --all --ci
npx intrig generate --ci
npm run build
```

This syncs from live API endpoints, ensuring frontend builds against the deployed contract.

**Requirements:**

- Backend deployment completes before frontend CI runs
- API endpoints accessible from CI environment
- Pipeline orchestration to order builds correctly

**Use case:** Catch contract mismatches before frontend deployment when backend has already been updated.
