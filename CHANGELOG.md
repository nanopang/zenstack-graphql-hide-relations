# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-06

### Added

- Initial release of zenstack-graphql-hide-relations plugin
- `@show()` attribute for controlling relation visibility in GraphQL
- `@hide()` attribute for hiding regular fields in GraphQL
- Support for four visibility contexts: query, read, create, update
- Automatic `@HideField()` comment generation for prisma-nestjs-graphql
- TypeScript support with full type definitions
- Comprehensive documentation and examples

### Features

- Fine-grained control over GraphQL field visibility
- Secure by default (relations hidden unless explicitly shown)
- Zero runtime overhead (preprocessor plugin)
- Compatible with ZenStack ^2.0.0
