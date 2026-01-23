import { TokenValueExtractor } from "@fincity/kirun-js";

export class StoreExtractor extends TokenValueExtractor {
  private store: any;
  private prefix: string;
  constructor(store: any, prefix: string) {
    super();
    this.store = store;
    this.prefix = prefix;
  }
  protected getValueInternal(token: string) {
    const prefix = this.getPrefix();
    const path = token.substring(prefix.length);
    const parts = TokenValueExtractor.splitPath(path);
    return this.retrieveElementFrom(token, parts, 0, this.store);
  }
  getPrefix(): string {
    return this.prefix;
  }
  getStore() {
    return this.store;
  }
}
