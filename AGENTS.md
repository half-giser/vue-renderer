# AGENTS.md

This document provides guidelines for AI agents working on the vue-renderer project.

## Build Commands

```bash
# Type checking only
npm run type-check

# Clean dist folder
npm run clean

# Compile all TypeScript files (uses SWC)
npm run compile:all

# Development build: compile + start local server
npm run build:dev

# Production build: type-check + compile
npm run build:prod

# Start local development server
npm run local-ser

# Run tests (watch mode)
npm run test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Code Style Guidelines

### Formatting (Prettier)

- No semicolons at line ends
- Single quotes for strings
- No parentheses around single-parameter arrow functions
- Tab width: 4 spaces
- Spaces instead of tabs

### TypeScript

- Strict mode is enabled in `tsconfig.json`
- Use `type` keyword for type-only imports
- Define types in `src/types/` directory
- Use explicit return types for exported functions
- Prefer interfaces over type aliases for object shapes

### File Headers

All source files should include a header comment:

```typescript
/*
 * @Date: YYYY-MM-DD HH:mm:ss
 * @Author: kenny half-giser@outlook.com
 * @Description:
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: YYYY-MM-DD HH:mm:ss
 */
```

### Imports

- Include file extensions in imports (e.g., `./utils.ts`)
- Group imports: external libraries first, then relative imports
- Use type-only imports where applicable

### Naming Conventions

- **Functions**: camelCase
- **Interfaces**: PascalCase with descriptive names
- **Constants**: SCREAMING_SNAKE_CASE for values, camelCase for refs
- **Files**: kebab-case for general files, PascalCase for components/types

### Error Handling

- Wrap async operations in try-catch blocks
- Use `console.error()` with descriptive messages
- Include context in error messages: `[Module] Description of error`
- HMR errors should use `[HMR]` prefix

### HMR Implementation

- Register hot context using `createHotContext(moduleId)`
- Implement `dispose()` callback for cleanup
- Implement acceptance callback for module updates
- Listen to `hmr:update` events for cross-module updates

### Platform Abstraction

- Keep platform-specific code in separate modules (e.g., `browser.ts`)
- Renderer should accept `PlatformOptions` for cross-platform support
- Abstract DOM operations behind platform API

### Comments

- Write comments in Chinese/English as needed
- Explain "why" rather than "what"
- Add comments for complex logic or non-obvious decisions

### Testing

- Test framework: Vitest with happy-dom environment
- Place tests alongside source files with `.test.ts` extension
- Use descriptive test names following Arrange-Act-Assert pattern
- Run a single test file: `npx vitest run src/hmr.test.ts`
- Run tests with coverage: `npm run test:coverage`

### SWC Configuration

- `.swcrc` and `swcOpts.json` configure SWC compilation
- TypeScript with decorators and dynamic import support
- Import transforms strip `.ts` extensions for ESM compatibility
- Source maps enabled for debugging
