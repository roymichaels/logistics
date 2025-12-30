import { getIndexedDB, IndexedDBStore } from '../indexedDBStore';
import { logger } from '../logger';

export interface SearchIndex {
  id: string;
  docId: string;
  storeName: string;
  field: string;
  tokens: string[];
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult<T = any> {
  docId: string;
  storeName: string;
  score: number;
  highlights: string[];
  document?: T;
}

export interface SearchOptions {
  stores?: string[];
  fields?: string[];
  fuzzy?: boolean;
  maxResults?: number;
  includeDocument?: boolean;
  minScore?: number;
}

export class SearchEngine {
  private db: IndexedDBStore | null = null;
  private readonly SEARCH_INDEX_STORE = 'search_index';
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'של', 'את', 'עם', 'על', 'אל', 'מן', 'כי', 'אם', 'או', 'גם', 'לא'
  ]);

  private async ensureDB(): Promise<IndexedDBStore> {
    if (!this.db) {
      this.db = await getIndexedDB();
    }
    return this.db;
  }

  private tokenize(text: string): string[] {
    const normalized = text
      .toLowerCase()
      .replace(/[^\w\s\u0590-\u05FF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return normalized
      .split(' ')
      .filter((token) => token.length > 1 && !this.stopWords.has(token));
  }

  private calculateRelevance(queryTokens: string[], docTokens: string[]): number {
    const docTokenSet = new Set(docTokens);
    let matchCount = 0;
    let exactMatches = 0;

    for (const queryToken of queryTokens) {
      if (docTokenSet.has(queryToken)) {
        exactMatches++;
        matchCount++;
      }
    }

    if (matchCount === 0) return 0;

    const coverage = matchCount / queryTokens.length;
    const precision = exactMatches / docTokens.length;
    const score = coverage * 0.7 + precision * 0.3;

    return Math.min(score * 100, 100);
  }

  private generateHighlights(content: string, queryTokens: string[], maxLength: number = 150): string[] {
    const highlights: string[] = [];
    const contentLower = content.toLowerCase();

    for (const token of queryTokens) {
      const index = contentLower.indexOf(token);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + token.length + 50);
        let excerpt = content.slice(start, end);

        if (start > 0) excerpt = '...' + excerpt;
        if (end < content.length) excerpt = excerpt + '...';

        const highlightedExcerpt = excerpt.replace(
          new RegExp(`(${token})`, 'gi'),
          '<mark>$1</mark>'
        );

        highlights.push(highlightedExcerpt);
      }
    }

    return highlights.slice(0, 3);
  }

  async indexDocument(
    storeName: string,
    docId: string,
    document: any,
    fields?: string[]
  ): Promise<void> {
    const db = await this.ensureDB();

    const fieldsToIndex = fields || Object.keys(document);
    const allTokens: string[] = [];
    const allContent: string[] = [];

    for (const field of fieldsToIndex) {
      const value = document[field];
      if (value && typeof value === 'string') {
        const tokens = this.tokenize(value);
        allTokens.push(...tokens);
        allContent.push(value);
      } else if (value && typeof value === 'number') {
        allTokens.push(value.toString());
        allContent.push(value.toString());
      }
    }

    const now = new Date().toISOString();
    const indexEntry: SearchIndex = {
      id: `${storeName}_${docId}`,
      docId,
      storeName,
      field: fieldsToIndex.join(','),
      tokens: [...new Set(allTokens)],
      content: allContent.join(' '),
      createdAt: now,
      updatedAt: now
    };

    await db.put(this.SEARCH_INDEX_STORE, indexEntry);
    logger.debug('[SearchEngine] Indexed document', { storeName, docId, tokenCount: allTokens.length });
  }

  async indexStore(storeName: string, fields?: string[]): Promise<number> {
    const db = await this.ensureDB();

    try {
      const documents = await db.getAll<any>(storeName);
      let indexed = 0;

      for (const doc of documents) {
        const docId = doc.id || doc._id || doc.key;
        if (docId) {
          await this.indexDocument(storeName, docId, doc, fields);
          indexed++;
        }
      }

      logger.info(`[SearchEngine] Indexed ${indexed} documents from ${storeName}`);
      return indexed;
    } catch (error) {
      logger.error('[SearchEngine] Error indexing store', error as Error, { storeName });
      return 0;
    }
  }

  async search<T = any>(query: string, options: SearchOptions = {}): Promise<SearchResult<T>[]> {
    const db = await this.ensureDB();
    const queryTokens = this.tokenize(query);

    if (queryTokens.length === 0) {
      return [];
    }

    const allIndexes = await db.getAll<SearchIndex>(this.SEARCH_INDEX_STORE);

    let filteredIndexes = allIndexes;
    if (options.stores) {
      filteredIndexes = filteredIndexes.filter((idx) => options.stores!.includes(idx.storeName));
    }

    const results: SearchResult<T>[] = [];

    for (const index of filteredIndexes) {
      const score = this.calculateRelevance(queryTokens, index.tokens);

      if (score > (options.minScore || 0)) {
        const highlights = this.generateHighlights(index.content, queryTokens);

        const result: SearchResult<T> = {
          docId: index.docId,
          storeName: index.storeName,
          score,
          highlights
        };

        if (options.includeDocument) {
          try {
            const doc = await db.get<T>(index.storeName, index.docId);
            if (doc) {
              result.document = doc;
            }
          } catch (error) {
            logger.warn('[SearchEngine] Failed to load document', { docId: index.docId });
          }
        }

        results.push(result);
      }
    }

    results.sort((a, b) => b.score - a.score);

    const maxResults = options.maxResults || 50;
    return results.slice(0, maxResults);
  }

  async removeFromIndex(storeName: string, docId: string): Promise<void> {
    const db = await this.ensureDB();
    const indexId = `${storeName}_${docId}`;

    try {
      await db.delete(this.SEARCH_INDEX_STORE, indexId);
      logger.debug('[SearchEngine] Removed from index', { storeName, docId });
    } catch (error) {
      logger.error('[SearchEngine] Error removing from index', error as Error, { storeName, docId });
    }
  }

  async clearIndex(storeName?: string): Promise<void> {
    const db = await this.ensureDB();

    if (storeName) {
      const allIndexes = await db.getAll<SearchIndex>(this.SEARCH_INDEX_STORE);
      const toDelete = allIndexes.filter((idx) => idx.storeName === storeName);

      for (const index of toDelete) {
        await db.delete(this.SEARCH_INDEX_STORE, index.id);
      }

      logger.info(`[SearchEngine] Cleared index for ${storeName}`);
    } else {
      await db.clear(this.SEARCH_INDEX_STORE);
      logger.info('[SearchEngine] Cleared entire search index');
    }
  }

  async rebuildIndex(storeName: string, fields?: string[]): Promise<number> {
    await this.clearIndex(storeName);
    return await this.indexStore(storeName, fields);
  }

  async getIndexStats(): Promise<{
    totalDocuments: number;
    byStore: Record<string, number>;
    totalTokens: number;
    avgTokensPerDoc: number;
  }> {
    const db = await this.ensureDB();
    const allIndexes = await db.getAll<SearchIndex>(this.SEARCH_INDEX_STORE);

    const byStore: Record<string, number> = {};
    let totalTokens = 0;

    for (const index of allIndexes) {
      byStore[index.storeName] = (byStore[index.storeName] || 0) + 1;
      totalTokens += index.tokens.length;
    }

    return {
      totalDocuments: allIndexes.length,
      byStore,
      totalTokens,
      avgTokensPerDoc: allIndexes.length > 0 ? totalTokens / allIndexes.length : 0
    };
  }
}

let globalSearchEngine: SearchEngine | null = null;

export function getSearchEngine(): SearchEngine {
  if (!globalSearchEngine) {
    globalSearchEngine = new SearchEngine();
  }
  return globalSearchEngine;
}

export function resetSearchEngine(): void {
  globalSearchEngine = null;
}

logger.info('[SearchEngine] Module loaded');
