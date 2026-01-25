import {
  isNullValue,
  Operation,
  TokenValueExtractor,
} from "@fincity/kirun-js";
import { resolveDynamicPath } from "./util/PathResolver";

class StoreException extends Error {
  cause?: Error;
  constructor(message: string, err?: Error) {
    super(message);
    this.cause = err;
  }
  public getCause(): Error | undefined {
    return this.cause;
  }
}

function isQuotedKey(key: any): boolean {
  if (typeof key !== 'string') return false;
  const str = key as string;
  return (str.startsWith('"') && str.endsWith('"')) ||
         (str.startsWith("'") && str.endsWith("'"));
}

function stripQuotes(key: any): any {
  if (!isQuotedKey(key)) return key;
  const str = key as string;
  return str.substring(1, str.length - 1);
}

export const setStoreData = (
  path: string,
  store: any,
  value: any,
  prefix: string,
  extractionMap: Map<string, TokenValueExtractor>,
  deleteKey?: boolean
) => {
  // Validate prefix
  if (!path.startsWith(prefix)) {
    throw new StoreException(`Prefix - ${prefix} is not found in path: ${path}`);
  }

  // Ensure all StoreExtractors in the map have the extraction map set
  for (const [, extractor] of Array.from(extractionMap.entries())) {
    if (typeof (extractor as any).setExtractionMap === 'function') {
      (extractor as any).setExtractionMap(extractionMap);
    }
  }

  // Resolve any dynamic expressions in brackets
  // Uses shared utility that leverages kirun-js ExpressionEvaluator
  const resolvedPath = resolveDynamicPath(path, extractionMap);

  // Use TokenValueExtractor.splitPath to parse the path
  const parts = TokenValueExtractor.splitPath(resolvedPath);

  if (parts.length < 2) {
    throw new StoreException(
      `Invalid path: ${resolvedPath} - must have at least prefix and one segment`
    );
  }

  // Start from index 1 (skip the prefix like 'Bamboo')
  let el = store;

  // Navigate to the parent of the final element
  for (let i = 1; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];

    // Parse bracket segments within this part
    const segments = parseBracketSegments(part);

    for (let j = 0; j < segments.length; j++) {
      const segment = segments[j];
      const isLastSegment = i === parts.length - 2 && j === segments.length - 1;
      const nextOp = isLastSegment
        ? getOpForSegment(parts[parts.length - 1])
        : getOpForSegment(nextPart);

      if (isArrayIndex(segment)) {
        el = getDataFromArray(el, segment, nextOp);
      } else {
        el = getDataFromObject(el, stripQuotes(segment), nextOp);
      }
    }
  }

  // Handle the final part (set the value)
  const finalPart = parts[parts.length - 1];
  const finalSegments = parseBracketSegments(finalPart);

  // Navigate through all but the last segment of the final part
  for (let j = 0; j < finalSegments.length - 1; j++) {
    const segment = finalSegments[j];
    const nextOp = isArrayIndex(finalSegments[j + 1])
      ? Operation.ARRAY_OPERATOR
      : Operation.OBJECT_OPERATOR;

    if (isArrayIndex(segment)) {
      el = getDataFromArray(el, segment, nextOp);
    } else {
      el = getDataFromObject(el, stripQuotes(segment), nextOp);
    }
  }

  // Set the final value
  const lastSegment = finalSegments[finalSegments.length - 1];
  if (isArrayIndex(lastSegment)) {
    putDataInArray(el, lastSegment, value);
  } else {
    putDataInObject(el, stripQuotes(lastSegment), value, deleteKey);
  }
};

/**
 * Parse a path segment that may contain bracket notation.
 * E.g., "addresses[0]" -> ["addresses", "0"]
 * E.g., 'obj["key"]' -> ["obj", "key"]
 */
function parseBracketSegments(part: string): string[] {
  const segments: string[] = [];
  let start = 0;
  let i = 0;

  while (i < part.length) {
    if (part[i] === "[") {
      if (i > start) {
        segments.push(part.substring(start, i));
      }
      // Find matching ]
      let end = i + 1;
      let inQuote = false;
      let quoteChar = "";
      while (end < part.length) {
        if (inQuote) {
          if (part[end] === quoteChar && part[end - 1] !== "\\") {
            inQuote = false;
          }
        } else {
          if (part[end] === '"' || part[end] === "'") {
            inQuote = true;
            quoteChar = part[end];
          } else if (part[end] === "]") {
            break;
          }
        }
        end++;
      }
      // Extract bracket content (without the brackets)
      segments.push(part.substring(i + 1, end));
      start = end + 1;
      i = start;
    } else {
      i++;
    }
  }

  if (start < part.length) {
    segments.push(part.substring(start));
  }

  return segments.length > 0 ? segments : [part];
}

/**
 * Check if a segment is an array index (numeric)
 */
function isArrayIndex(segment: string): boolean {
  // Check if it's a pure number (possibly negative)
  return /^-?\d+$/.test(segment);
}

/**
 * Determine the operation type for the next segment
 */
function getOpForSegment(segment: string): Operation {
  // Check if the segment starts with a bracket or is a pure number
  if (isArrayIndex(segment) || segment.startsWith("[")) {
    return Operation.ARRAY_OPERATOR;
  }
  return Operation.OBJECT_OPERATOR;
}

function getDataFromArray(el: any, mem: string, nextOp: Operation): any {
  if (!Array.isArray(el))
    throw new StoreException(`Expected an array but found  ${el}`);

  const index = Number.parseInt(mem);
  if (Number.isNaN(index))
    throw new StoreException(`Expected an array index but found  ${mem}`);
  if (index < 0)
    throw new StoreException(`Array index is out of bound -  ${mem}`);

  let je = el[index];

  if (isNullValue(je)) {
    je = nextOp == Operation.OBJECT_OPERATOR ? {} : [];
    el[index] = je;
  }
  return je;
}

function getDataFromObject(el: any, mem: string, nextOp: Operation): any {
  if (Array.isArray(el) || typeof el !== "object")
    throw new StoreException(`Expected an object but found  ${el}`);

  let je = el[mem];

  if (isNullValue(je)) {
    je = nextOp == Operation.OBJECT_OPERATOR ? {} : [];
    el[mem] = je;
  }
  return je;
}

function putDataInArray(el: any, mem: string, value: any): void {
  if (!Array.isArray(el))
    throw new StoreException(`Expected an array but found  ${el}`);

  const index = Number.parseInt(mem);
  if (Number.isNaN(index))
    throw new StoreException(`Expected an array index but found  ${mem}`);
  if (index < 0)
    throw new StoreException(`Array index is out of bound -  ${mem}`);

  el[index] = value;
}

function putDataInObject(
  el: any,
  mem: string,
  value: any,
  deleteKey?: boolean
): void {
  if (Array.isArray(el) || typeof el !== "object")
    throw new StoreException(`Expected an object but found  ${el}`);

  if (deleteKey && (value === null || value === undefined)) {
    delete el[mem];
    return;
  }

  el[mem] = value;
}
