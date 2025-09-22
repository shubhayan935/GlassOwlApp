import { SessionChunk } from '../types';

export async function uploadChunk(chunk: SessionChunk, endpoint: string): Promise<void> {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Key': chunk.projectKey,
        },
        body: JSON.stringify(chunk),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Upload successful:', result);
        return;
      } else {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      attempt++;
      console.warn(`Upload attempt ${attempt} failed:`, error);

      if (attempt >= maxRetries) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}