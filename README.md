# Intrig Core

A powerful code generation tool for creating React and Next.js bindings from API specifications.

## Overview

Intrig Core is a framework for generating type-safe API client code for React and Next.js applications. It takes API specifications (like OpenAPI) as input and generates fully typed client libraries that can be used in your frontend applications.

## Features

- **Multiple Framework Support**: Generate client code for both React and Next.js
- **Type Safety**: Generate TypeScript interfaces from API schemas
- **REST API Support**: Generate hooks and utilities for REST API endpoints
- **File Download Support**: Special handling for file download endpoints
- **Customizable Templates**: Flexible template system for code generation
- **CLI and Server Modes**: Use as a CLI tool or run as a server with Swagger documentation

## Installation

```bash
# Install globally
npm install -g @intrig-core/source

# Or use with npx
npx @intrig-core/source
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
# Generate code
intrig generate

# Run in server mode
intrig run

# Get help
intrig --help
```

### Server Mode

When running in server mode, Intrig Core provides a web interface for exploring and generating code from API specifications. The server is available at:

- API: http://localhost:{port}/api
- Swagger Docs: http://localhost:{port}/docs

## Architecture

Intrig Core is built as a monorepo with the following components:

- **common**: Shared utilities, interfaces, and services
- **openapi-source**: Parser for OpenAPI specifications
- **react-binding**: Generator for React bindings
- **next-binding**: Generator for Next.js bindings
- **intrig**: CLI application

The code generation process follows these steps:

1. Parse API specifications into resource descriptors
2. Generate code using templates based on the selected framework
3. Output the generated code to the configured directory

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/intrig-core.git
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
