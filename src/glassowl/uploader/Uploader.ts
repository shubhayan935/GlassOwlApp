import { SessionChunk } from '../types';

export async function uploadChunk(chunk: SessionChunk, endpoint: string): Promise<void> {
  const maxRetries = 3;
  let attempt = 0;

  console.log('Upload: Starting upload to', endpoint, 'for session', chunk.sessionId, 'chunk', chunk.idx);

  while (attempt < maxRetries) {
    try {
      console.log(`Upload: Attempt ${attempt + 1}/${maxRetries}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Key': chunk.projectKey,
        },
        body: JSON.stringify(chunk),
      });

      console.log('Upload: Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Upload: Success!', result);
        return;
      } else {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (error) {
      attempt++;
      console.warn(`Upload: Attempt ${attempt} failed:`, error);

      if (attempt >= maxRetries) {
        console.error('Upload: All retries failed, giving up');
        throw error;
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Upload: Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}