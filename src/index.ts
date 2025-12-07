import type { PluginFunction } from "@zenstackhq/sdk";
import { Model, DataModel } from "@zenstackhq/sdk/ast";
import type { DMMF } from "@zenstackhq/sdk/prisma";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Valid contexts for @graphql.show() attribute
 */
type ShowContext = "query" | "read" | "create" | "update";

/**
 * Parameters for @HideField attribute
 * Used internally and for legacy @HideField() attribute support
 */
interface HideFieldParams {
  /** Hide/show in input types (CreateInput, UpdateInput, WhereInput) */
  input?: boolean;
  /** Hide/show in output types (query results) */
  output?: boolean;
  /** Glob pattern to match specific DTO types (e.g., '*(*Create*Input)') */
  match?: string;
}

/**
 * ZenStack Plugin: GraphQL Field Visibility Control
 *
 * Automatically adds /// @HideField() comments to Prisma schema for fields
 * based on @graphql.show() or @graphql.hide() attributes.
 *
 * Usage in schema.zmodel:
 *
 * plugin GraphqlHideRelations {
 *   provider = 'zenstack-graphql-hide-relations'
 *   preprocessor = true
 * }
 *
 * Examples - Relations:
 *
 * model Book {
 *   // Show relation everywhere (output + all inputs)
 *   author Author @graphql.show()
 *
 *   // Show in query/filters only (not in Create/Update forms)
 *   publisher Publisher @graphql.show(query: true)
 *
 *   // Show in query results only (not in filters or forms)
 *   stats Statistics @graphql.show(read: true)
 *
 *   // Relations without @graphql.show() are hidden everywhere by default
 *   relatedBooks Book[]
 * }
 *
 * Examples - Regular Fields:
 *
 * model User {
 *   email String  // Shown everywhere by default
 *
 *   // Hide from Create/Update inputs (shown in query/read)
 *   privatePrice Float @graphql.hide(create: true, update: true)
 *
 *   // Hide everywhere
 *   internalId String @graphql.hide()
 *
 *   // Show only in Create forms (not Update or query)
 *   initialValue String @graphql.show(create: true)
 * }
 */

/**
 * Convert @graphql.show() boolean flags to @HideField match pattern
 *
 * Context meanings:
 * - 'query': Query results + filters (output + WhereInput)
 * - 'read': Query results only (output, no WhereInput)
 * - 'create': Create forms (CreateInput)
 * - 'update': Update forms (UpdateInput)
 *
 * @param contexts - Array of contexts where field should be shown
 * @returns @HideField match pattern or null if should show everywhere
 *
 * @example
 * // Input: ['query'] (results + filters)
 * // Output: { match: '*(*Create*Input)|*(*Update*Input)' }
 *
 * @example
 * // Input: ['read'] (results only, no filters)
 * // Output: { match: '*(Where*Input)|*(*Create*Input)|*(*Update*Input)' }
 *
 * @example
 * // Input: ['query', 'create', 'update']
 * // Output: null (show everywhere)
 */
function contextsToHideFieldPattern(
  contexts: ShowContext[]
): HideFieldParams | null {
  // Normalize contexts
  const uniqueContexts = [...new Set(contexts)];

  // Check for conflicting contexts
  const hasQuery = uniqueContexts.includes("query");
  const hasRead = uniqueContexts.includes("read");
  const hasCreate = uniqueContexts.includes("create");
  const hasUpdate = uniqueContexts.includes("update");

  // 'query' includes 'read' + filters, so they shouldn't be used together
  if (hasQuery && hasRead) {
    // 'query' takes precedence (it includes 'read')
    const filteredContexts = uniqueContexts.filter((c) => c !== "read");
    return contextsToHideFieldPattern(filteredContexts);
  }

  // Build exclusion list (contexts where field should be HIDDEN)
  const patterns: string[] = [];
  let hideOutput = false;

  // Determine what to hide based on what's shown
  if (!hasQuery && !hasRead) {
    // Not showing in query results at all
    hideOutput = true;
  }

  if (!hasQuery && hasRead) {
    // Showing in query results but not filters
    patterns.push("*(Where*Input)");
  }

  if (!hasCreate) {
    patterns.push("*(*Create*Input)");
  }

  if (!hasUpdate) {
    patterns.push("*(*Update*Input)");
  }

  // If all contexts are effectively present, show everywhere
  if (
    (hasQuery || hasRead) &&
    hasCreate &&
    hasUpdate &&
    !patterns.includes("*(Where*Input)")
  ) {
    return null;
  }

  // Special case: Hide output only
  if (hideOutput && hasCreate && hasUpdate) {
    return { input: false, output: true };
  }

  // Special case: Hide all inputs (show in output only)
  if ((hasQuery || hasRead) && !hasCreate && !hasUpdate) {
    const inputPatterns: string[] = ["*(*Create*Input)", "*(*Update*Input)"];

    // Add WhereInput if not showing in filters
    if (hasRead && !hasQuery) {
      inputPatterns.push("*(Where*Input)");
    }

    // Use outmatch glob syntax: @(pattern1|pattern2) for alternation
    if (inputPatterns.length === 1) {
      return { match: inputPatterns[0] };
    }
    return { match: `@(${inputPatterns.join("|")})` };
  }

  // Use match pattern for specific cases
  if (patterns.length > 0) {
    // Use outmatch glob syntax: @(pattern1|pattern2) for alternation
    if (patterns.length === 1) {
      return { match: patterns[0] };
    }
    // Combine patterns using @(...) syntax
    return { match: `@(${patterns.join("|")})` };
  }

  return null;
}

/**
 * Parse @graphql.show() attribute arguments to extract contexts from boolean flags
 *
 * @param attr - The attribute AST node
 * @param fieldName - Name of the field being processed
 * @param modelName - Name of the model containing the field
 * @returns Array of contexts or null if should show everywhere
 *
 * @example
 * // Input: @graphql.show(query: true, read: true)
 * // Output: ['query', 'read']
 *
 * @example
 * // Input: @graphql.show()
 * // Output: null (show everywhere)
 */
function parseShowContexts(
  attr: any,
  fieldName: string,
  modelName: string
): ShowContext[] | null {
  if (!attr.args || attr.args.length === 0) {
    return null; // @graphql.show() = show everywhere
  }

  const contexts: ShowContext[] = [];
  const validContexts: ShowContext[] = ["query", "read", "create", "update"];

  for (const arg of attr.args) {
    const name = arg.name as ShowContext;
    const value = arg.value;

    if (!validContexts.includes(name)) {
      console.warn(
        `⚠️  [GraphqlHideRelations] Unknown parameter "${name}" in @graphql.show() on ${modelName}.${fieldName}\n` +
          `   Valid: query, read, create, update\n` +
          `   Example: @graphql.show(query: true, read: true)`
      );
      continue;
    }

    if (
      (value.$type === "BooleanLiteral" || value.$type === "LiteralExpr") &&
      value.value === true
    ) {
      contexts.push(name);
    }
  }
  return contexts.length > 0 ? contexts : null;
}

/**
 * Parse @graphql.hide() attribute arguments to extract contexts from boolean flags
 *
 * @graphql.hide() works as the inverse of @graphql.show() - it specifies where to HIDE the field
 *
 * @param attr - The attribute AST node
 * @param fieldName - Name of the field being processed
 * @param modelName - Name of the model containing the field
 * @returns @HideField params or null if should hide everywhere
 *
 * @example
 * // Input: @graphql.hide(query: true)
 * // Output: { match: '*(*Where*Input)|*(*OrderBy*Input)|(Output)' }
 *
 * @example
 * // Input: @graphql.hide()
 * // Output: { input: true, output: true } (hide everywhere)
 */
function parseHideContexts(
  attr: any,
  fieldName: string,
  modelName: string
): HideFieldParams | null {
  if (!attr.args || attr.args.length === 0) {
    // @graphql.hide() = hide everywhere
    return { input: true, output: true };
  }

  const hiddenContexts: ShowContext[] = [];
  const validContexts: ShowContext[] = ["query", "read", "create", "update"];

  for (const arg of attr.args) {
    const name = arg.name as ShowContext;
    const value = arg.value;

    if (!validContexts.includes(name)) {
      console.warn(
        `⚠️  [GraphqlHideRelations] Unknown parameter "${name}" in @graphql.hide() on ${modelName}.${fieldName}\n` +
          `   Valid: query, read, create, update\n` +
          `   Example: @graphql.hide(query: true, create: true)`
      );
      continue;
    }

    if (
      (value.$type === "BooleanLiteral" || value.$type === "LiteralExpr") &&
      value.value === true
    ) {
      hiddenContexts.push(name);
    }
  }

  if (hiddenContexts.length === 0) {
    return null; // No contexts specified
  }

  // Convert hidden contexts to HideField pattern
  // @graphql.hide(query: true) means hide from query results and filters
  // @graphql.hide(create: true) means hide from create forms
  // etc.

  const hasQuery = hiddenContexts.includes("query");
  const hasRead = hiddenContexts.includes("read");
  const hasCreate = hiddenContexts.includes("create");
  const hasUpdate = hiddenContexts.includes("update");

  // 'query' includes 'read' + filters
  if (hasQuery && hasRead) {
    // Remove redundant 'read'
    const filteredContexts = hiddenContexts.filter((c) => c !== "read");
    return parseHideContexts(
      {
        args: filteredContexts.map((c) => ({
          name: c,
          value: { $type: "BooleanLiteral", value: true },
        })),
      },
      fieldName,
      modelName
    );
  }

  const patterns: string[] = [];
  let hideOutput = false;

  // Build patterns for what to hide
  if (hasQuery) {
    // Hide from query results AND filters
    hideOutput = true;
    patterns.push("*(Where*Input)");
    patterns.push("*(*OrderBy*Input)");
  }

  if (hasRead && !hasQuery) {
    // Hide from query results only (not filters)
    hideOutput = true;
  }

  if (hasCreate) {
    patterns.push("*(*Create*Input)");
  }

  if (hasUpdate) {
    patterns.push("*(*Update*Input)");
  }

  // If hiding everything, return simple params
  if (
    hideOutput &&
    hasCreate &&
    hasUpdate &&
    patterns.includes("*(Where*Input)")
  ) {
    return { input: true, output: true };
  }

  // If hiding output only
  if (hideOutput && !hasCreate && !hasUpdate) {
    return { input: false, output: true };
  }

  // If hiding input only
  if (!hideOutput && patterns.length > 0) {
    // Use outmatch glob syntax: @(pattern1|pattern2) for alternation
    if (patterns.length === 1) {
      return { match: patterns[0] };
    }
    return { match: `@(${patterns.join("|")})` };
  }

  // Mixed case: output + some inputs
  if (hideOutput && patterns.length > 0) {
    const filteredPatterns = patterns.filter(
      (p) => !p.includes("Where") && !p.includes("OrderBy")
    );
    if (filteredPatterns.length > 0) {
      const combinedPatterns = [...filteredPatterns, "(Output)"];
      if (combinedPatterns.length === 1) {
        return { match: combinedPatterns[0] };
      }
      return { match: `@(${combinedPatterns.join("|")})` };
    }
    return { input: false, output: true };
  }

  return null;
}

/**
 * Generate @HideField comment based on parameters
 *
 * @param params - The parsed HideField parameters
 * @returns The formatted @HideField comment string
 *
 * @example
 * // Input: { match: '*(*Create*Input)' }
 * // Output: "/// @HideField({ match: '*(*Create*Input)' })"
 *
 * @example
 * // Input: { input: false, output: true }
 * // Output: "/// @HideField({ input: false, output: true })"
 */
function generateHideFieldComment(params: HideFieldParams): string {
  if (params.match) {
    // If match pattern is specified, use it
    return `/// @HideField({ match: '${params.match}' })`;
  }

  if (params.input !== undefined || params.output !== undefined) {
    // If input/output are specified, use them
    const parts: string[] = [];
    if (params.input !== undefined) {
      parts.push(`input: ${params.input}`);
    }
    if (params.output !== undefined) {
      parts.push(`output: ${params.output}`);
    }
    return `/// @HideField({ ${parts.join(", ")} })`;
  }

  // Default: hide everywhere
  return "/// @HideField({ input: true, output: true })";
}

/**
 * Helper: Add HideField comment to a field
 */
function addHideFieldComment(field: any, hideFieldParams: HideFieldParams) {
  const hideFieldComment = generateHideFieldComment(hideFieldParams);

  if (!field.comments) {
    field.comments = [];
  }

  const hasHideFieldComment = field.comments.some((comment: any) =>
    comment.includes("@HideField")
  );

  if (!hasHideFieldComment) {
    field.comments.push(hideFieldComment);
  }
}

/**
 * Helper: Find attribute by name
 */
function findAttribute(field: any, ...names: string[]) {
  return field.attributes.find((attr: any) => {
    const attrName = attr.decl.ref?.name || attr.decl.$refText;
    return names.some((name) => attrName === name || attrName === `@${name}`);
  });
}

const plugin: PluginFunction = async (
  model: Model,
  _options: Record<string, unknown>,
  _dmmf?: DMMF.Document
) => {
  const models = model.declarations.filter(
    (d): d is DataModel => d.$type === "DataModel"
  );

  let shownRelations = 0;
  let hiddenRelations = 0;
  let hiddenFields = 0;

  for (const modelDecl of models) {
    const modelName = modelDecl.name;

    for (const field of modelDecl.fields) {
      const fieldName = field.name;
      const isRelation = field.type.reference?.ref?.$type === "DataModel";

      // Process @graphql.show() attribute (relations and normal fields)
      const showAttr = findAttribute(field, "graphql.show");
      if (showAttr) {
        const contexts = parseShowContexts(showAttr, fieldName, modelName);

        if (contexts === null) {
          // @graphql.show() with no args - show everywhere
          if (isRelation) shownRelations++;
          continue;
        }

        const hideFieldParams = contextsToHideFieldPattern(contexts);
        if (hideFieldParams === null) {
          // All contexts present - show everywhere
          if (isRelation) shownRelations++;
          continue;
        }

        addHideFieldComment(field, hideFieldParams);
        if (isRelation) shownRelations++;
        continue;
      }

      // Process @graphql.hide() attribute (relations and normal fields)
      const hideAttr = findAttribute(field, "graphql.hide");
      if (hideAttr) {
        const hideFieldParams = parseHideContexts(
          hideAttr,
          fieldName,
          modelName
        );

        if (hideFieldParams === null) {
          console.warn(
            `⚠️  [GraphqlHideRelations] @graphql.hide() without contexts on ${modelName}.${fieldName}\n` +
              `   Use @graphql.hide() to hide everywhere or @graphql.hide(query: true, create: true) for specific contexts`
          );
          continue;
        }

        addHideFieldComment(field, hideFieldParams);
        if (!isRelation) hiddenFields++;
        continue;
      }

      // Default behavior for relations only: hide everywhere
      if (isRelation) {
        addHideFieldComment(field, { input: true, output: true });
        hiddenRelations++;
      }
    }
  }

  // Log summary
  const totalProcessed = shownRelations + hiddenRelations + hiddenFields;
  if (totalProcessed > 0) {
    console.log(
      `\n✨ [GraphqlHideRelations] Processed ${totalProcessed} field(s)\n` +
        `   📖 Shown relations:              ${shownRelations} field(s)\n` +
        `   🔒 Hidden relations (default):   ${hiddenRelations} field(s)\n` +
        `   🙈 Hidden fields:                ${hiddenFields} field(s)\n`
    );
  }

  return;
};

export default plugin;
