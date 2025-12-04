# @intrig/plugin-nest

NestJS plugin for Intrig that generates injectable services from OpenAPI specifications.

## Overview

This plugin generates type-safe NestJS services from OpenAPI specs, organized by API tags. Each service contains methods corresponding to REST endpoints, fully typed with request/response schemas.

## Features

- **Tag-based Service Organization**: Groups endpoints by OpenAPI tags into separate injectable services
- **Type-safe Generated Code**: Full TypeScript types from OpenAPI schemas
- **NestJS HttpService Integration**: Uses `@nestjs/axios` for HTTP operations
- **Promise-based API**: All methods return promises (observables converted with `firstValueFrom`)
- **Dependency Injection Ready**: All services are decorated with `@Injectable()`
- **Module Export**: Single `IntrigModule` exports all generated services

## Installation

```bash
npm install @intrig/plugin-nest
```

## Usage

### 1. Configure Intrig

In your `intrig.config.json`:

```json
{
  "generator": "nest",
  "sources": [
    {
      "id": "petstore",
      "name": "Petstore API",
      "specUrl": "https://petstore3.swagger.io/api/v3/openapi.json"
    }
  ]
}
```

### 2. Generate Services

```bash
npx intrig build
```

This generates:
- `@intrig/nest/IntrigModule` - NestJS module
- Service classes per tag (e.g., `UsersService`, `ProductsService`)
- TypeScript types for all schemas
- Full type safety for requests and responses

### 3. Import IntrigModule

In your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { IntrigModule } from '@intrig/nest';

@Module({
  imports: [IntrigModule],
  // ...
})
export class AppModule {}
```

### 4. Inject and Use Services

```typescript
import { Injectable } from '@nestjs/common';
import { UsersService } from '@intrig/nest';

@Injectable()
export class MyService {
  constructor(private readonly usersService: UsersService) {}

  async getUser(id: string) {
    return this.usersService.getUser(id);
  }

  async createUser(data: CreateUserDto) {
    return this.usersService.createUser(data);
  }
}
```

## Generated Code Structure

```
node_modules/@intrig/nest/
├── intrig.module.ts          # Main NestJS module
├── index.ts                  # Barrel exports
├── users/
│   └── users.service.ts      # UsersService (from 'users' tag)
├── products/
│   └── products.service.ts   # ProductsService (from 'products' tag)
└── components/
    └── schemas/              # TypeScript types
        ├── User.ts
        ├── Product.ts
        └── ...
```

## Example Generated Service

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { User } from '../components/schemas/User';
import { CreateUserDto } from '../components/schemas/CreateUserDto';

@Injectable()
export class UsersService {
  constructor(private readonly httpService: HttpService) {}

  async getUser(id: string): Promise<User> {
    const response = await firstValueFrom(
      this.httpService.get<User>(`/users/${id}`)
    );
    return response.data;
  }

  async createUser(data: CreateUserDto): Promise<User> {
    const response = await firstValueFrom(
      this.httpService.post<User>('/users', data)
    );
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await firstValueFrom(
      this.httpService.delete(`/users/${id}`)
    );
  }
}
```

## Configuration Options

### Plugin Options

```typescript
export type NestPluginOptions = {
  baseURL?: string; // Optional base URL for HTTP client
};
```

Currently, the plugin doesn't require specific options. The `baseURL` option is reserved for future use to configure the HTTP client's base URL.

## Architecture

- **Services**: One service per OpenAPI tag
- **Methods**: One async method per endpoint operation
- **Types**: Generated from OpenAPI schemas (no runtime validation)
- **HTTP Client**: NestJS `HttpService` (axios wrapper)
- **Error Handling**: Let NestJS exception filters handle errors

## Comparison with React Plugin

| Feature | React Plugin | NestJS Plugin |
|---------|-------------|---------------|
| **Target** | Browser (React hooks) | Server (NestJS services) |
| **State Management** | Yes (React state) | No |
| **Caching** | Yes (built-in) | No (use NestJS interceptors) |
| **Validation** | Zod schemas | TypeScript types only |
| **Organization** | By source | By OpenAPI tag |
| **DI** | React Context | NestJS DI |

## Development

### Build

```bash
nx build @intrig/plugin-nest
```

### Test

```bash
nx test @intrig/plugin-nest
```

## License

MIT
