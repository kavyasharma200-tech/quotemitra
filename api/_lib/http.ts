// Tiny HTTP helpers shared by the CRUD API routes.

export function sendJson(res: any, status: number, data: unknown): void {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).send(JSON.stringify(data));
}

export function methodNotAllowed(res: any, allow: string[]): void {
  res.setHeader('Allow', allow.join(', '));
  sendJson(res, 405, { ok: false, error: 'method-not-allowed' });
}

/** First value of a query param (Vercel may give string | string[]). */
export function queryParam(req: any, name: string): string | undefined {
  const v = req.query?.[name];
  if (Array.isArray(v)) return v[0];
  return v === undefined ? undefined : String(v);
}

/** Read a JSON body. On Vercel, req.body is already parsed when the
 *  Content-Type is application/json; fall back to stream reading otherwise. */
export async function readJsonBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
