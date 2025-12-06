# zenstack-hide-relations

[![npm version](https://badge.fury.io/js/zenstack-hide-relations.svg)](https://www.npmjs.com/package/zenstack-hide-relations)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ZenStack preprocessor plugin that provides fine-grained control over GraphQL field visibility using `@show()` and `@hide()` attributes.

## Features

- 🎯 **Fine-grained control** - Show/hide fields in specific contexts (query, read, create, update)
- 🔒 **Secure by default** - Relations are hidden by default, preventing accidental data exposure
- 🎨 **Flexible** - Works with both relations and regular fields
- 📝 **Type-safe** - Full TypeScript support with comprehensive type definitions
- ⚡ **Zero runtime overhead** - Preprocessor plugin runs at build time only

## Installation

```bash
npm install zenstack-hide-relations
```

Or with your preferred package manager:

```bash
pnpm add zenstack-hide-relations
yarn add zenstack-hide-relations
```

## Quick Start

### 1. Configure the Plugin

Add to your `schema.zmodel`:

```zmodel
plugin hideRelations {
  provider = 'zenstack-hide-relations'
  preprocessor = true
}
```

### 2. Define Custom Attributes

Add these attribute definitions to your schema (typically in a base model file):

```zmodel
/// Show field in GraphQL with context control
/// Contexts: query (results+filters), read (results only), create, update
attribute @show(query: Boolean?, read: Boolean?, create: Boolean?, update: Boolean?)

/// Hide field in GraphQL with context control (inverse of @show)
/// Contexts: query (results+filters), read (results only), create, update
attribute @hide(query: Boolean?, read: Boolean?, create: Boolean?, update: Boolean?)
```

### 3. Use in Your Models

```zmodel
model Book {
  id String @id @default(cuid())
  title String

  // Show everywhere
  author Author @show()

  // Show in queries only (not in create/update forms)
  publisher Publisher @show(query: true)

  // Show in query results only (not in filters or forms)
  stats Statistics @show(read: true)

  // Hidden by default (no @show)
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

### @show() Attribute

Use `@show()` to make fields visible in GraphQL. By default, relations are **hidden everywhere**.

**Examples:**

```zmodel
model Product {
  // Show everywhere (output + all inputs)
  category Category @show()

  // Show in queries and filters only
  supplier Supplier @show(query: true)

  // Show in query results only (no filters)
  analytics Analytics @show(read: true)

  // Show in create forms only
  initialStock Stock @show(create: true)

  // Show in update forms only
  revision Revision @show(update: true)

  // Multiple contexts
  owner User @show(query: true, create: true, update: true)
}
```

### @hide() Attribute

Use `@hide()` to hide regular fields. By default, regular fields are **visible everywhere**.

**Examples:**

```zmodel
model User {
  email String  // Visible everywhere (default)

  // Hide everywhere
  internalId String @hide()

  // Hide from create and update forms
  calculatedField Float @hide(create: true, update: true)

  // Hide from query results only
  sensitiveData String @hide(read: true)

  // Hide from queries and filters
  privateMetadata Json @hide(query: true)
}
```

### Common Patterns

#### Pattern 1: Read-only Relations

Show in queries but not in forms:

```zmodel
model Order {
  // Can query/filter, but cannot create/update via forms
  customer Customer @show(query: true)
}
```

#### Pattern 2: Set Once, Never Update

Allow setting during creation, but not updates:

```zmodel
model Document {
  // Can set during creation, but cannot change later
  documentType Type @show(create: true, query: true)
}
```

#### Pattern 3: Internal Fields

Hide completely from GraphQL:

```zmodel
model User {
  // Never exposed in GraphQL
  passwordHash String @hide()
  internalFlags Json @hide()
}
```

#### Pattern 4: Display-only Relations

Show in results but not in inputs:

```zmodel
model Article {
  // Visible in query results, but not in any input forms
  statistics ArticleStats @show(read: true)
}
```

## How It Works

This preprocessor plugin runs before schema generation and:

1. Parses `@show()` and `@hide()` attributes from your ZenStack schema
2. Converts them to appropriate `/// @HideField()` comments
3. These comments are then picked up by `prisma-nestjs-graphql` generator
4. The generator applies `@HideField()` decorators to GraphQL types

### Generated Output Example

**Input (schema.zmodel):**

```zmodel
model Book {
  author Author @show(query: true)
  publisher Publisher @show()
  metadata Metadata  // No @show() = hidden
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
- ✅ **Opt-in visibility** - Use `@show()` to selectively expose relations
- ✅ **Better performance** - Prevents accidental N+1 queries
- ✅ **Cleaner API** - Only expose relations you actually need
- ✅ **Fine-grained control** - Show/hide in specific contexts

## Context Rules

### Conflict Resolution

When both `query` and `read` are specified, `query` takes precedence (as it includes `read`):

```zmodel
model Book {
  // 'query' includes 'read', so this is equivalent to @show(query: true)
  stats Statistics @show(query: true, read: true)
}
```

### Default Behaviors

**Relations:**
- Without `@show()`: Hidden everywhere
- With `@show()` (no args): Visible everywhere

**Regular Fields:**
- Without `@hide()`: Visible everywhere
- With `@hide()` (no args): Hidden everywhere

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

- 🐛 [Report bugs](https://github.com/yourusername/zenstack-hide-relations/issues)
- 💬 [Discussions](https://github.com/yourusername/zenstack-hide-relations/discussions)
- 📖 [Documentation](https://github.com/yourusername/zenstack-hide-relations#readme)
