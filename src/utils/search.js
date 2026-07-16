import { env } from '@xenova/transformers';
env.allowLocalModels = true;

const aiWorker = new Worker(new URL('../aiWorker.js', import.meta.url), {
  type: 'module'
});

let currentCallId = 0;

function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))
  ]);
}

export function generateProductEmbedding(text) {
  return withTimeout(new Promise((resolve, reject) => {
    const callId = ++currentCallId;
    const handler = (e) => {
      if (e.data.searchId === callId) {
        aiWorker.removeEventListener('message', handler);
        if (e.data.type === 'EMBEDDING_SUCCESS') {
          resolve(e.data.payload.vector);
        } else {
          reject(new Error(e.data.payload || 'Embedding generation failed'));
        }
      }
    };
    aiWorker.addEventListener('message', handler);
    aiWorker.postMessage({ type: 'GENERATE_EMBEDDING', payload: { text }, searchId: callId });
  }));
}

export function searchProducts(query, products) {
  if (!query.trim()) return Promise.resolve(products);
  return withTimeout(new Promise((resolve) => {
    const callId = ++currentCallId;
    generateProductEmbedding(query)
      .then((qEmb) => {
        const hasEmbeddings = products.some(p => p.embedding && p.embedding.length === 384);
        if (!hasEmbeddings) {
          const lower = query.toLowerCase();
          resolve(products.filter(p => p.name.toLowerCase().includes(lower)));
          return;
        }
        const vectors = products.map(p => ({ id: p.id, vector: p.embedding }));
        const handler = (e) => {
          if (e.data.searchId === callId) {
            aiWorker.removeEventListener('message', handler);
            if (e.data.type === 'SEARCH_SUCCESS') {
              const scoredIds = e.data.payload.sortedIds;
              const productMap = Object.fromEntries(products.map(p => [p.id, p]));
              resolve(scoredIds.map(s => productMap[s.id]).filter(Boolean));
            } else {
              resolve(products);
            }
          }
        };
        aiWorker.addEventListener('message', handler);
        aiWorker.postMessage({ type: 'VECTOR_SEARCH', payload: { queryVector: qEmb, vectors }, searchId: callId });
      })
      .catch(() => resolve(products));
  }));
}

export function parseScanWithLLM(text) {
  return withTimeout(new Promise((resolve, reject) => {
    const callId = ++currentCallId;
    const handler = (e) => {
      if (e.data.searchId === callId) {
        aiWorker.removeEventListener('message', handler);
        if (e.data.type === 'PARSE_SUCCESS') {
          resolve(e.data.payload);
        } else {
          reject(new Error(e.data.payload || 'AI parsing failed'));
        }
      }
    };
    aiWorker.addEventListener('message', handler);
    aiWorker.postMessage({ type: 'PARSE_SCAN', payload: { text }, searchId: callId });
  }));
}