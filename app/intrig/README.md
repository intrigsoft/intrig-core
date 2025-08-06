# Intrig Core

A powerful TypeScript library and code generator designed to streamline OpenAPI-based network integration.

## Overview

Intrig Core is a TypeScript library and code generator designed to simplify the process of connecting to APIs described by the OpenAPI specification. It generates type-safe TypeScript code for React and Next.js applications, reducing manual coding effort and potential for errors.

## Features

- **Multiple Framework Support**: Generate client code for both React and Next.js
- **Type Safety**: Generate TypeScript interfaces from API schemas for reduced runtime errors
- **REST API Support**: Generate hooks and utilities for REST API endpoints
- **File Download Support**: Special handling for file download endpoints
- **Customizable Templates**: Flexible template system for code generation
- **Intrig Insight**: Project-specific documentation about the generated code
- **CLI Tool**: Comprehensive command-line interface for managing your project

## Installation

```bash
# Install globally
npm install -g @intrig/core

# Or use with npx
npx @intrig/core
```

## Usage

### Configuration

Create an `intrig.config.json` file in your project root:

```json
{
  "sources": [
    {
      "id": "my-api",
      "url": "https://example.com/api/swagger.json",
      "type": "openapi"
    }
  ],
  "generator": "react"
}
```

You can set the generator to either "react" or "next" depending on your target framework.

### CLI Commands

```bash
# Initialize Intrig in your project
intrig init

# Add sources
intrig sources add

# List all sources
intrig sources ls

# Remove a source
intrig sources rm

# Sync all entities
intrig sync

# Generate code
intrig generate

# Manage the daemon
intrig deamon up
intrig deamon down
intrig deamon restart
intrig deamon status

# Search for resources
intrig search

# Prebuild and postbuild operations
intrig prebuild
intrig postbuild

# Get help
intrig --help
```

## Architecture

Intrig Core is built as a monorepo with NestJS, a popular Node.js framework for building scalable server-side applications with TypeScript. The project includes the following components:

- **common**: Shared utilities, interfaces, and services
- **openapi-source**: Parser for OpenAPI specifications
- **react-binding**: Generator for React bindings
- **next-binding**: Generator for Next.js bindings
- **react-client**: Client library for React applications
- **next-client**: Client library for Next.js applications
- **intrig**: CLI application and daemon for documentation and sync purposes

The code generation process follows these steps:

1. Parse API specifications into resource descriptors
2. Generate code using templates based on the selected framework
3. Output the generated code to the configured directory

## Intrig Insight

Intrig Insight is a powerful feature that addresses the "knowledge cost" challenge common with code generators. It provides:

- **Project-specific documentation** about the generated code
- **Customized and personalized documentation** for your specific integration
- **Reduced learning curve** for new team members or those unfamiliar with generated code
- **Documentation that stays in sync** with the actual generated output

Intrig Insight communicates with a project-specific daemon to provide this documentation. You can start the daemon using:

```bash
intrig deamon up
```

## Common Workflows

### Setting Up a New Project

1. Initialize Intrig in your project:
   ```
   intrig init
   ```

2. Add sources:
   ```
   intrig sources add
   ```

3. Sync entities:
   ```
   intrig sync
   ```

4. Generate code:
   ```
   intrig generate
   ```

### Managing the Daemon

1. Start the daemon:
   ```
   intrig deamon up
   ```

2. Check daemon status:
   ```
   intrig deamon status
   ```

3. Restart the daemon after configuration changes:
   ```
   intrig deamon restart
   ```

4. Stop the daemon when not needed:
   ```
   intrig deamon down
   ```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/intrigsoft/intrig-core.git
cd intrig-core

# Install dependencies
npm install

# Build the project
npm run build
```

### Running Tests

```bash
npm test
```

## Release Process

To release new versions of the packages, we use Nx Release, which handles version synchronization and publishing in a single command.

### Available Release Commands

```bash
# Default release (patch)
npm run release

# Specific release types
npm run release:patch  # Increment patch version (0.0.x)
npm run release:minor  # Increment minor version (0.x.0)
npm run release:major  # Increment major version (x.0.0)

# Test the release process without publishing
npm run release:dry-run
```

### What Nx Release Does

1. Builds all packages using Nx (configured as a preVersionCommand)
2. Bumps the version according to the release type (major, minor, or patch)
3. Updates all package versions to the new version (syncing them)
4. Publishes all packages to npm with the new version

### Packages Published

Nx Release publishes the following packages:
- `@intrig/core`
- `@intrig/next`
- `@intrig/react`

## Troubleshooting

If you encounter issues with Intrig, try the following:

1. Check if the daemon is running:
   ```
   intrig deamon status
   ```

2. Restart the daemon:
   ```
   intrig deamon restart
   ```

3. Ensure your sources are correctly configured:
   ```
   intrig sources ls
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.