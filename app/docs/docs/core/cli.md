---
sidebar_position: 2
---

# CLI Reference

The Intrig CLI provides powerful commands for managing your API development workflow.

## Overview

The CLI is your primary interface to Intrig's functionality, enabling you to:
- Sync API changes from your backend
- Generate type-safe SDKs
- Explore and search your API endpoints
- Manage configurations and settings

## Common Commands

```bash
# Sync all APIs and generate SDKs
intrig sync --all && intrig generate

# Search for specific endpoints
intrig search "users" --no-interactive

# View endpoint details
intrig view endpoint_id --type "endpoint" --no-interactive

# List available resources
intrig ls
```

For detailed information about each command, see the individual CLI command pages.