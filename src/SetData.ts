import {
  Expression,
  ExpressionEvaluator,
  ExpressionTokenValue,
  isNullValue,
  Operation,
  TokenValueExtractor,
} from "@fincity/kirun-js";

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
  const expression = new Expression(path);
  const tokens = expression.getTokens();
  const tokenString = expression.getTokens().peekLast().getExpression();
  if (!tokenString.startsWith(prefix)) {
    throw new StoreException(`Prefix - ${prefix} is not found`);
  }
  for (let i = 0; i < tokens.size(); i++) {
    let ex = tokens.get(i);
    if (!(ex instanceof Expression)) continue;
    tokens.set(
      i,
      new ExpressionTokenValue(
        path,
        new ExpressionEvaluator(ex as Expression).evaluate(extractionMap)
      )
    );
  }

  tokens.removeLast();
  const ops = expression.getOperations();
  let el = store;
  let token = tokens.removeLast();

  let mem =
    token instanceof ExpressionTokenValue
      ? (token as ExpressionTokenValue).getElement()
      : token.getExpression();

  if (ops.isEmpty()) {
    el[mem] = value;
    return;
  }

  let op: Operation = ops.removeLast();
  while (!ops.isEmpty()) {
    // Strip quotes if present (from bracket notation like ["key"] or ['key'])
    const cleanMem = stripQuotes(mem);

    // Check if this should be treated as object access even with ARRAY_OPERATOR
    // (happens with bracket notation using string keys like obj["key.with.dots"])
    // A valid array index is either a number type or a string that represents an integer
    const isArrayIndex = typeof cleanMem === 'number' ||
                         (typeof cleanMem === 'string' && /^\d+$/.test(cleanMem));
    const treatAsObject = op == Operation.OBJECT_OPERATOR ||
                          (op == Operation.ARRAY_OPERATOR && !isArrayIndex);

    // Need to check what type to create for the NEXT level
    // Peek at the next token to determine if it's numeric
    let nextOp = ops.peekLast();
    if (!tokens.isEmpty()) {
      const nextToken = tokens.peekLast();
      const nextMem = nextToken instanceof ExpressionTokenValue
        ? (nextToken as ExpressionTokenValue).getElement()
        : nextToken.getExpression();
      const nextCleanMem = stripQuotes(nextMem);
      const nextIsArrayIndex = typeof nextCleanMem === 'number' ||
                               (typeof nextCleanMem === 'string' && /^\d+$/.test(nextCleanMem));
      // If next operation is [ but with non-numeric key, treat as object creation
      if (nextOp == Operation.ARRAY_OPERATOR && !nextIsArrayIndex) {
        nextOp = Operation.OBJECT_OPERATOR;
      }
    }

    if (treatAsObject) {
      el = getDataFromObject(el, cleanMem, nextOp);
    } else {
      el = getDataFromArray(el, cleanMem, nextOp);
    }

    op = ops.removeLast();
    if (!tokens.isEmpty()) token = tokens.removeLast();
    mem =
      token instanceof ExpressionTokenValue
        ? (token as ExpressionTokenValue).getElement()
        : token.getExpression();
  }

  // Strip quotes if present for the final assignment
  const cleanMem = stripQuotes(mem);

  // Check if this should be treated as object access for the final assignment
  const isArrayIndex = typeof cleanMem === 'number' ||
                       (typeof cleanMem === 'string' && /^\d+$/.test(cleanMem));
  const treatAsObject = op == Operation.OBJECT_OPERATOR ||
                        (op == Operation.ARRAY_OPERATOR && !isArrayIndex);

  if (treatAsObject)
    putDataInObject(el, cleanMem, value, deleteKey);
  else
    putDataInArray(el, cleanMem, value);
};

function getDataFromArray(el: any, mem: string, nextOp: Operation): any {
  if (!Array.isArray(el))
    throw new StoreException(`Expected an array but found  ${el}`);

  const index = parseInt(mem);
  if (isNaN(index))
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

  const index = parseInt(mem);
  if (isNaN(index))
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
