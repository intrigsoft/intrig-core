# Intrig Development Playbook

This playbook provides guidance on working with the Intrig ecosystem, which consists of the Intrig backend and Insight frontend with a code generation layer in between.

## Development Workflow

The typical development workflow follows these steps:

1. Make modifications to the Intrig backend
2. **Restart the Intrig application** to apply your changes
3. Sync the API and generate the SDK:
   ```bash
   intrig sync --all && intrig generate
   ```
4. Work on the Insight frontend using the generated SDK

> **Important**: After making changes to the Intrig backend, you must restart the application before running the sync command to ensure your changes are properly applied.

## Navigating the SDK with Intrig Commands

Intrig provides powerful CLI commands to help you navigate and understand the generated SDK. The two most useful commands are `search` and `view`.

### Using the Search Command

The `search` command allows you to find resources by name, path, or other criteria.

#### Basic Search

```bash
intrig search "query"
```

This will display an interactive list of matching resources.

#### Non-Interactive Search

To prevent the command from hanging in scripts or CI environments, use the `--no-interactive` flag:

```bash
intrig search "query" --no-interactive
```

This will display a numbered list of resources without waiting for user input:

```
Select a resource.
 1. GET /api/users — Get all users
 2. POST /api/users — Create a user
 3. UserSchema
```

#### Selecting a Specific Resource

To select a specific resource in non-interactive mode, use the `--option` flag with the number of the resource:

```bash
intrig search "user" --no-interactive --option 3
```

This will output:
```
Selected resource: ID: abc123, Type: schema
```

### Using the View Command

The `view` command displays detailed information about a specific resource by its ID.

#### Basic View

```bash
intrig view abc123
```

This will fetch the resource and display its details interactively.

#### Non-Interactive View

To use the view command in non-interactive mode:

```bash
intrig view abc123 --no-interactive
```

If the resource type cannot be automatically determined, you'll see:

```
Select resource type ( use '--type' flag. eg: intrig view abc123 --type 'Endpoint' )
 1. Schema
 2. Endpoint
```

#### Specifying the Resource Type

When using non-interactive mode, specify the resource type with the `--type` flag:

```bash
intrig view abc123 --no-interactive --type "schema"
```

#### Viewing Specific Tabs

Many resources have multiple tabs of information. In non-interactive mode, you'll see:

```
Select a tab to view ( use '--tab-option' flag. eg: intrig view abc123 --type 'Endpoint' --tab-option 1 )
 1. Overview
 2. Examples
 3. Usage
```

To view a specific tab, use the `--tab-option` flag:

```bash
intrig view abc123 --no-interactive --type "endpoint" --tab-option 2
```

This will display the content of the "Examples" tab.

## Complete Examples

### Finding and Viewing an Endpoint

1. Search for endpoints related to users:
   ```bash
   intrig search "users" --no-interactive
   ```

2. View the details of a specific endpoint:
   ```bash
   intrig view def456 --no-interactive --type "endpoint"
   ```

3. View the examples tab for the endpoint:
   ```bash
   intrig view def456 --no-interactive --type "endpoint" --tab-option 2
   ```

### Finding and Viewing a Schema

1. Search for schemas related to users:
   ```bash
   intrig search "user schema" --no-interactive
   ```

2. View the details of a specific schema:
   ```bash
   intrig view abc123 --no-interactive --type "schema"
   ```

3. View the usage tab for the schema:
   ```bash
   intrig view abc123 --no-interactive --type "schema" --tab-option 3
   ```

## Tips for Effective SDK Navigation

1. Use specific search terms to narrow down results
2. Note the IDs and types of frequently used resources
3. Use the `--no-interactive` flag in scripts or when you want to avoid interactive prompts
4. Always specify the `--type` flag with the `view` command in non-interactive mode
5. The SDK provides documentation and examples on how to use the generated methods
6. Remember to restart the Intrig application after making changes and before running sync commands

By following this playbook, you'll be able to efficiently navigate the SDK and understand how to use the generated methods in your frontend development.