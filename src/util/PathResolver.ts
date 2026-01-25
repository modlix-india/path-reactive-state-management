import { ExpressionEvaluator, TokenValueExtractor } from "@fincity/kirun-js";

/**
 * Resolves any dynamic expressions in a path string.
 * E.g., "Store.a.c[Store.a.b]" -> "Store.a.c[10]" (if Store.a.b evaluates to 10)
 *
 * This uses kirun-js's ExpressionEvaluator to handle all expression syntax,
 * so it automatically supports any new features added to kirun-js.
 *
 * @param path - The path string potentially containing dynamic expressions in brackets
 * @param extractionMap - Map of extractors to resolve expressions
 * @returns The resolved path with all dynamic expressions evaluated
 */
export function resolveDynamicPath(
  path: string,
  extractionMap: Map<string, TokenValueExtractor>
): string {
  let resolvedPath = path;
  const maxIterations = 10; // Prevent infinite loops
  let iterations = 0;

  // Keep resolving until no more changes (handles nested brackets)
  while (iterations < maxIterations) {
    iterations++;

    const newPath = resolveOneBracket(resolvedPath, extractionMap);

    // Check if any changes were made
    if (newPath === resolvedPath) {
      break; // No changes, we're done
    }

    resolvedPath = newPath;
  }

  return resolvedPath;
}

/**
 * Finds one bracket containing a dynamic expression and resolves it.
 * Returns the path with that bracket resolved, or the original path if no resolvable bracket found.
 */
function resolveOneBracket(
  path: string,
  extractionMap: Map<string, TokenValueExtractor>
): string {
  let i = 0;

  while (i < path.length) {
    if (path[i] === '[') {
      // Find the matching closing bracket
      let depth = 1;
      let j = i + 1;

      while (j < path.length && depth > 0) {
        if (path[j] === '[') {
          depth++;
        } else if (path[j] === ']') {
          depth--;
        }
        j++;
      }

      if (depth === 0) {
        const bracketContent = path.substring(i + 1, j - 1);

        // Check if it looks like a dynamic expression
        const isQuoted = (bracketContent.startsWith('"') && bracketContent.endsWith('"')) ||
                         (bracketContent.startsWith("'") && bracketContent.endsWith("'"));
        const isPureNumber = /^-?\d+$/.test(bracketContent);

        // If it contains dots or starts with a letter (and isn't quoted or a number),
        // it's likely a dynamic expression
        if (!isQuoted && !isPureNumber && (bracketContent.includes('.') || /^[A-Za-z]/.test(bracketContent))) {
          try {
            // Use kirun-js ExpressionEvaluator to handle the expression
            // This ensures we support all expression features kirun-js supports
            const evaluator = new ExpressionEvaluator(bracketContent);
            const result = evaluator.evaluate(extractionMap);
            const replacement = `[${result}]`;

            // Return the path with this bracket resolved
            return path.substring(0, i) + replacement + path.substring(j);
          } catch (e) {
            // If evaluation fails, skip this bracket and try the next one
            // This might happen if inner brackets need to be resolved first
          }
        }
        // Move past this bracket
        i = j;
      } else {
        // Unmatched bracket
        i++;
      }
    } else {
      i++;
    }
  }

  return path; // No changes made
}
