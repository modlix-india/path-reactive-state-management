import { TokenValueExtractor } from "@fincity/kirun-js";
import { resolveDynamicPath } from "./util/PathResolver";

export class StoreExtractor extends TokenValueExtractor {
  private store: any;
  private prefix: string;
  private extractionMap?: Map<string, TokenValueExtractor>;

  constructor(store: any, prefix: string, extractionMap?: Map<string, TokenValueExtractor>) {
    super();
    this.store = store;
    this.prefix = prefix;
    this.extractionMap = extractionMap;
  }

  setExtractionMap(extractionMap: Map<string, TokenValueExtractor>) {
    this.extractionMap = extractionMap;
  }

  protected getValueInternal(token: string) {
    const prefix = this.getPrefix();
    const path = token.substring(prefix.length);

    // Resolve any dynamic expressions in brackets before processing
    // Uses shared utility that leverages kirun-js ExpressionEvaluator
    const resolvedPath = this.extractionMap
      ? resolveDynamicPath(path, this.extractionMap)
      : path;

    const parts = TokenValueExtractor.splitPath(resolvedPath);

    // Use the prefix + resolved path for error messages in retrieveElementFrom
    const resolvedToken = prefix + resolvedPath;
    return this.retrieveElementFrom(resolvedToken, parts, 0, this.store);
  }

  getPrefix(): string {
    return this.prefix;
  }

  getStore() {
    return this.store;
  }
}
