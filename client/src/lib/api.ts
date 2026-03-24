export async function apiRequest(method: string, url: string, body?: any): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res;
}
