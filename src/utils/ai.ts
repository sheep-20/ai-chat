export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: (fullText: string) => void | Promise<void>;
  onError: (error: Error) => void;
}

export async function streamChat(
  model: string,
  messages: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks,
) {
  let response: Response;
  try {
    response = await fetch('/api-proxy/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true, max_tokens: 1000, temperature: 0.9 }),
    });
  } catch {
    callbacks.onError(new Error('网络请求失败，请确认本地开发服务正在运行。'));
    return;
  }

  if (!response.ok) {
    let msg = `API 错误 ${response.status}`;
    try {
      const j = await response.json();
      msg = j.error?.message ?? msg;
    } catch {}
    callbacks.onError(new Error(msg));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error('响应体为空'));
    return;
  }

  const decoder = new TextDecoder();
  let full = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const delta = JSON.parse(data)?.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            full += delta;
            callbacks.onChunk(delta);
          }
        } catch {
          // Ignore malformed SSE chunks.
        }
      }
    }
    await callbacks.onDone(full);
  } catch (e) {
    callbacks.onError(e instanceof Error ? e : new Error(String(e)));
  }
}
