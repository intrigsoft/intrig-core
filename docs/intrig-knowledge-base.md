# Intrig Core Knowledge Base

## Overview

**Intrig Core** is a TypeScript library and code generator designed to streamline OpenAPI-based network integration. Its primary goal is to simplify the process of connecting to APIs described by the OpenAPI specification by generating type-safe TypeScript code, reducing manual coding effort and potential for errors.

- **Repository:** `intrigsoft/intrig-core`
- **Primary Language:** TypeScript (with some JavaScript)
- **Purpose:** Automate and simplify OpenAPI client integration in TypeScript projects.

---

## Key Features

### 1. OpenAPI Code Generation

- Converts OpenAPI specifications into TypeScript code.
- Likely generates client libraries, type definitions, and utility functions.
- Ensures type-safety and consistency when interfacing with APIs.

### 2. Reduced Knowledge Cost with Intrig Insight

One of the common challenges with code generators is the "knowledge cost": developers must understand not only the original API but also the structure and behavior of the generated code. Intrig addresses this by providing:

#### Intrig Insight

- **What is it?**  
  A tool that communicates with a project-specific daemon to provide documentation about the generated code.
- **How does it help?**
    - Offers customized and personalized documentation for your specific integration.
    - Reduces the learning curve for new team members or those unfamiliar with generated code.
    - Keeps documentation in sync with the actual generated output, minimizing confusion and errors.
- **Typical Workflow:**  
  Developers interact with the generated code as usual, but can leverage Intrig Insight for real-time, accurate documentation and guidance.

---

## Architectural Notes

- **NestJS Usage:**  
  The project is built with or incorporates [NestJS](https://nestjs.com/), a popular Node.js framework for building scalable server-side applications with TypeScript.
- **CLI Utility:**  
  Intrig Core includes a CLI for initializing projects, managing OpenAPI sources, generating code, and managing the daemon for documentation and sync purposes.

---

## Intended Audience

- TypeScript developers integrating with OpenAPI-described APIs.
- Teams seeking to reduce manual API client maintenance.
- Organizations prioritizing type safety, maintainability, and clear documentation for API integrations.

---

## Benefits

- **Type Safety:**  
  Generated code leverages TypeScript’s type system, reducing runtime errors.
- **Automation:**  
  Handles repetitive client code generation, freeing developers to focus on business logic.
- **Documentation:**  
  Intrig Insight ensures thorough, project-specific documentation is always available.
- **Maintainability:**  
  Sync and update mechanisms help keep client code in line with evolving API specs.

---

## Common Workflows (CLI Outlined Separately)

- Initialize Intrig in your project.
- Add or manage OpenAPI sources.
- Generate or update client code based on the latest specs.
- Start the documentation daemon for Intrig Insight.
- Sync entities to ensure consistency across project state.

---

## Summary

Intrig Core is built to make OpenAPI network integration in TypeScript projects fast, reliable, and easy to understand. By combining robust code generation with dynamic, integration-aware documentation (Intrig Insight), it tackles both implementation speed and the long-term maintainability challenge of generated codebases.