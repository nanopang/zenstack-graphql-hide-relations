# zenstack-graphql-hide-relations

[![npm version](https://badge.fury.io/js/zenstack-graphql-hide-relations.svg)](https://www.npmjs.com/package/zenstack-graphql-hide-relations)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ZenStack preprocessor plugin that provides fine-grained control over GraphQL field visibility using `@graphql.show()` and `@graphql.hide()` attributes.

## Features

- 🎯 **Fine-grained control** - Show/hide fields in specific contexts (query, read, create, update)
- 🔒 **Secure by default** - Relations are hidden by default, preventing accidental data exposure
- 🎨 **Flexible** - Works with both relations and regular fields
- 📝 **Type-safe** - Full TypeScript support with comprehensive type definitions
- ⚡ **Zero runtime overhead** - Preprocessor plugin runs at build time only

## Installation

```bash
npm install zenstack-graphql-hide-relations
```

Or with your preferred package manager:

```bash
pnpm add zenstack-graphql-hide-relations
yarn add zenstack-graphql-hide-relations
```

## Quick Start

### 1. Configure the Plugin

Add to your `schema.zmodel`:

```zmodel
plugin hideRelations {
  provider = 'zenstack-graphql-hide-relations'
  preprocessor = true
}
```

### 2. Automatic Attribute Definitions

The plugin automatically provides the following attributes when enabled:

- `@graphql.show()` - Show field in GraphQL with context control
- `@graphql.hide()` - Hide field in GraphQL with context control (inverse of @graphql.show)

Both attributes support these contexts:
- `query` - Query results + filters (output + WhereInput)
- `read` - Query results only (output, no filters)
- `create` - Create forms (CreateInput)
- `update` - Update forms (UpdateInput)

### 3. Use in Your Models

```zmodel
model Book {
  id String @id @default(cuid())
  title String

  // Show everywhere
  author Author @graphql.show()

  // Show in queries only (not in create/update forms)
  publisher Publisher @graphql.show(query: true)

  // Show in query results only (not in filters or forms)
  stats Statistics @graphql.show(read: true)

  // Hidden by default (no @graphql.show)
  relatedBooks Book[]
}
```

## Usage Guide

### Context Reference

The plugin supports four visibility contexts:

| Context | Scope | GraphQL Types |
|---------|-------|---------------|
| `query` | Query results + filters | Output types + WhereInput |
| `read` | Query results only | Output types |
| `create` | Create forms | CreateInput |
| `update` | Update forms | UpdateInput |

### @graphql.show() Attribute

Use `@graphql.show()` to make fields visible in GraphQL. By default, relations are **hidden everywhere**.

**Examples:**

```zmodel
model Product {
  // Show everywhere (output + all inputs)
  category Category @graphql.show()

  // Show in queries and filters only
  supplier Supplier @graphql.show(query: true)

  // Show in query results only (no filters)
  analytics Analytics @graphql.show(read: true)

  // Show in create forms only
  initialStock Stock @graphql.show(create: true)

  // Show in update forms only
  revision Revision @graphql.show(update: true)

  // Multiple contexts
  owner User @graphql.show(query: true, create: true, update: true)
}
```

### @graphql.hide() Attribute

Use `@graphql.hide()` to hide regular fields. By default, regular fields are **visible everywhere**.

**Examples:**

```zmodel
model User {
  email String  // Visible everywhere (default)

  // Hide everywhere
  internalId String @graphql.hide()

  // Hide from create and update forms
  calculatedField Float @graphql.hide(create: true, update: true)

  // Hide from query results only
  sensitiveData String @graphql.hide(read: true)

  // Hide from queries and filters
  privateMetadata Json @graphql.hide(query: true)
}
```

### Common Patterns

#### Pattern 1: Read-only Relations

Show in queries but not in forms:

```zmodel
model Order {
  // Can query/filter, but cannot create/update via forms
  customer Customer @graphql.show(query: true)
}
```

#### Pattern 2: Set Once, Never Update

Allow setting during creation, but not updates:

```zmodel
model Document {
  // Can set during creation, but cannot change later
  documentType Type @graphql.show(create: true, query: true)
}
```

#### Pattern 3: Internal Fields

Hide completely from GraphQL:

```zmodel
model User {
  // Never exposed in GraphQL
  passwordHash String @graphql.hide()
  internalFlags Json @graphql.hide()
}
```

#### Pattern 4: Display-only Relations

Show in results but not in inputs:

```zmodel
model Article {
  // Visible in query results, but not in any input forms
  statistics ArticleStats @graphql.show(read: true)
}
```

## How It Works

This preprocessor plugin runs before schema generation and:

1. Parses `@graphql.show()` and `@graphql.hide()` attributes from your ZenStack schema
2. Converts them to appropriate `/// @HideField()` comments
3. These comments are then picked up by `prisma-nestjs-graphql` generator
4. The generator applies `@HideField()` decorators to GraphQL types

### Generated Output Example

**Input (schema.zmodel):**

```zmodel
model Book {
  author Author @graphql.show(query: true)
  publisher Publisher @graphql.show()
  metadata Metadata  // No @graphql.show() = hidden
}
```

**Output (generated schema.prisma):**

```prisma
model Book {
  /// @HideField({ match: '@(*(*Create*Input)|*(*Update*Input))' })
  author Author

  author Author  // No @HideField = visible everywhere

  /// @HideField({ input: true, output: true })
  metadata Metadata
}
```

## Why This Plugin?

### Problem

By default, `prisma-nestjs-graphql` exposes all Prisma relations in GraphQL, which can lead to:

- ❌ **N+1 query problems** when relations are auto-resolved
- ❌ **Performance issues** with deep relation nesting
- ❌ **Security concerns** exposing internal data structures
- ❌ **API complexity** with unnecessary relation fields in inputs

### Solution

This plugin inverts the default behavior:

- ✅ **Hide by default** - All relations are hidden unless explicitly shown
- ✅ **Opt-in visibility** - Use `@graphql.show()` to selectively expose relations
- ✅ **Better performance** - Prevents accidental N+1 queries
- ✅ **Cleaner API** - Only expose relations you actually need
- ✅ **Fine-grained control** - Show/hide in specific contexts

## Context Rules

### Conflict Resolution

When both `query` and `read` are specified, `query` takes precedence (as it includes `read`):

```zmodel
model Book {
  // 'query' includes 'read', so this is equivalent to @graphql.show(query: true)
  stats Statistics @graphql.show(query: true, read: true)
}
```

### Default Behaviors

**Relations:**
- Without `@graphql.show()`: Hidden everywhere
- With `@graphql.show()` (no args): Visible everywhere

**Regular Fields:**
- Without `@graphql.hide()`: Visible everywhere
- With `@graphql.hide()` (no args): Hidden everywhere

## Requirements

- **ZenStack**: ^2.0.0
- **Node.js**: >=18.0.0
- **prisma-nestjs-graphql**: Recommended for GraphQL type generation

## TypeScript Support

The plugin is written in TypeScript and includes full type definitions. Your IDE will provide autocomplete and type checking for all attributes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Related Projects

- [ZenStack](https://zenstack.dev/) - Full-stack TypeScript toolkit
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [prisma-nestjs-graphql](https://github.com/unlight/prisma-nestjs-graphql) - Prisma generator for NestJS GraphQL

## Support

- 🐛 [Report bugs](https://github.com/yourusername/zenstack-graphql-hide-relations/issues)
- 💬 [Discussions](https://github.com/yourusername/zenstack-graphql-hide-relations/discussions)
- 📖 [Documentation](https://github.com/yourusername/zenstack-graphql-hide-relations#readme)
