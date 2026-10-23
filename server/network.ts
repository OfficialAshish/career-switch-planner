export async function boundedBody(response: Response, max: number): Promise<Buffer> {
  if (Number(response.headers.get('content-length') || 0) > max) {
    await response.body?.cancel();
    throw new Error('Download exceeds its size limit.');
  }
  if (!response.body) throw new Error('Empty response body.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error('Download exceeds its size limit.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
