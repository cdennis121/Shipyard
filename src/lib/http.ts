export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = (await response.json()) as { error?: string; message?: string };
      return data.error || data.message || fallback;
    }

    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}
