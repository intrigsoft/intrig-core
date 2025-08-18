# Intrig CLI Usage Guide

## Overview

Intrig is a powerful command-line interface (CLI) tool designed to help developers manage and interact with their projects. This guide provides comprehensive information on how to use the Intrig CLI tool effectively.

## Installation

Intrig is available as a command-line tool. You can access it directly from your terminal by typing `intrig`.

## Basic Usage

The basic syntax for using Intrig is:

```
intrig [command] [options]
```

To get help on any command, you can use the `--help` or `-h` flag:

```
intrig --help
intrig [command] --help
```

## Available Commands

Intrig provides several commands to help you manage your project:

### `daemon` - Daemon Related Operations

Manages the Intrig daemon service that runs in the background.

```
intrig daemon [subcommand]
```

Subcommands:
- `up` - Start the daemon
- `down` - Stop the daemon
- `restart` - Restart the daemon
- `status` - Check the daemon status

Examples:
```
intrig daemon up
intrig daemon down
intrig daemon restart
intrig daemon status
```

### `generate` - Generate Codebase

Generates code based on your project configuration.

```
intrig generate
```

### `init` - Initialize Intrig

Initializes Intrig in your project.

```
intrig init
```

### `sources` - Sources Management

Manages the sources used by Intrig.

```
intrig sources [subcommand]
```

Subcommands:
- `add` - Add a new source
- `ls` - List all sources
- `rm` - Remove a source

Examples:
```
intrig sources add
intrig sources ls
intrig sources rm
```

### `sync` - Sync All Entities

Synchronizes all entities from the configured sources.

```
intrig sync
```

### `search` - Search for Resources

Searches for resources within your project.

```
intrig search
```

### `prebuild` - Prebuild Operations

Performs pre-build operations before the main build process.

```
intrig prebuild
```

### `postbuild` - Postbuild Operations

Performs post-build operations after the main build process.

```
intrig postbuild
```

## Workflow Examples

Here are some common workflows using Intrig:

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
   intrig daemon up
   ```

2. Check daemon status:
   ```
   intrig daemon status
   ```

3. Restart the daemon after configuration changes:
   ```
   intrig daemon restart
   ```

4. Stop the daemon when not needed:
   ```
   intrig daemon down
   ```

## Troubleshooting

If you encounter issues with Intrig, try the following:

1. Check if the daemon is running:
   ```
   intrig daemon status
   ```

2. Restart the daemon:
   ```
   intrig daemon restart
   ```

3. Ensure your sources are correctly configured:
   ```
   intrig sources ls
   ```

## Conclusion

Intrig is a versatile tool that helps streamline your development workflow. By understanding and utilizing its various commands, you can enhance your productivity and manage your projects more effectively.

For more information or support, please refer to the official documentation or contact the support team.