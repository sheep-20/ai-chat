export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone:  (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamChat(
  apiKey: string,
  apiBase: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks,
) {
  // 开发模式下走 Vite 服务端代理（Node.js → OpenAI），规避浏览器跨域和梯子问题。
  // 生产环境下直接使用用户配置的 apiBase。
  const endpoint = import.meta.env.DEV
    ? `/api-proxy/chat/completions`
    : `${apiBase}/chat/completions`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: true, max_tokens: 1000, temperature: 0.9 }),
    });
  } catch (e) {
    callbacks.onError(new Error('网络请求失败，请检查梯子是否正常运行，然后重启开发服务器（npm run dev）'));
    return;
  }

  if (!response.ok) {
    let msg = `API 错误 ${response.status}`;
    try { const j = await response.json(); msg = j.error?.message ?? msg; } catch {}
    callbacks.onError(new Error(msg));
    return;
  }

  const reader = response.body!.getReader();
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
          if (delta) { full += delta; callbacks.onChunk(delta); }
        } catch { /* ignore malformed chunks */ }
      }
    }
    callbacks.onDone(full);
  } catch (e) {
    callbacks.onError(e instanceof Error ? e : new Error(String(e)));
  }
}
