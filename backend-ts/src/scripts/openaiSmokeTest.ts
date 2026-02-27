import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data } = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: modelName,
          messages: [
            {
              role: 'system',
              content: 'Reply with exactly: AI_OK',
            },
          ],
          temperature: 0,
        },
        {
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const text = data?.choices?.[0]?.message?.content;
      console.log(text);
      return;
    } catch (err) {
      lastError = err;

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const body = err.response?.data;

        if (body) {
          console.error('OpenAI error response:', JSON.stringify(body, null, 2));
        }

        if (status === 429 && attempt < maxAttempts) {
          const retryAfterHeader = err.response?.headers?.['retry-after'];
          const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
          const backoffMs = Number.isFinite(retryAfterSeconds)
            ? Math.max(1000, retryAfterSeconds * 1000)
            : 2000 * attempt;

          console.error(`429 received. Retrying in ${Math.round(backoffMs / 1000)}s (attempt ${attempt}/${maxAttempts})...`);
          await sleep(backoffMs);
          continue;
        }
      }

      throw err;
    }
  }

  throw lastError;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
