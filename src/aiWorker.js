import { env, pipeline } from '@xenova/transformers';

env.allowLocalModels = true;

let embedderPipeline = null;
let generatorPipeline = null;

async function getEmbedder() {
  if (!embedderPipeline) {
    embedderPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedderPipeline;
}

async function getGenerator() {
  if (!generatorPipeline) {
    generatorPipeline = await pipeline('text2text-generation', 'Xenova/t5-small');
  }
  return generatorPipeline;
}

self.onmessage = async function(e) {
  const { type, payload, searchId } = e.data;
  try {
    if (type === 'GENERATE_EMBEDDING') {
      const pipe = await getEmbedder();
      const output = await pipe(payload.text, { pooling: 'mean', normalize: true });
      self.postMessage({
        type: 'EMBEDDING_SUCCESS',
        payload: { vector: Array.from(output.data) },
        searchId
      });
    } else if (type === 'VECTOR_SEARCH') {
      const { queryVector, vectors } = payload;
      if (!vectors || vectors.length === 0) {
        return self.postMessage({
          type: 'SEARCH_SUCCESS',
          payload: { sortedIds: [] },
          searchId
        });
      }
      const cosineSimilarity = (a, b) => {
        let dot = 0, na = 0, nb = 0;
        for (let i = 0; i < a.length; i++) {
          dot += a[i] * b[i];
          na += a[i] * a[i];
          nb += b[i] * b[i];
        }
        return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
      };
      const scored = vectors.map(v => ({
        id: v.id,
        score: cosineSimilarity(queryVector, v.vector)
      }));
      scored.sort((a, b) => b.score - a.score);
      self.postMessage({
        type: 'SEARCH_SUCCESS',
        payload: { sortedIds: scored.slice(0, 10) },
        searchId
      });
    } else if (type === 'PARSE_SCAN') {
      const pipe = await getGenerator();
      const prompt = `Extract product name and price from this text. Input: ${payload.text} Output format: Name: <name>, Price: <number>`;
      const output = await pipe(prompt, {
        max_new_tokens: 32,
        temperature: 0.1,
        repetition_penalty: 1.2
      });
      const generatedText = output[0].generated_text;
      const nameMatch = generatedText.match(/Name:\s*([^,]+)/i);
      const priceMatch = generatedText.match(/Price:\s*([0-9.]+)/i);
      self.postMessage({
        type: 'PARSE_SUCCESS',
        payload: {
          name: nameMatch ? nameMatch[1].trim() : 'AI Parsed Item',
          price: priceMatch ? parseFloat(priceMatch[1]) : 0.00
        },
        searchId
      });
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', payload: err.message, searchId });
  }
};