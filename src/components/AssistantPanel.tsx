import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Bot, X, SendHorizonal, Square } from 'lucide-react';
import ThinkingDots from './ThinkingDots';

const ReactMarkdown = lazy(() => import('react-markdown'));

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  '¿Cuántas horas extras llevo este mes?',
  '¿Cuál es mi líquido a pagar?',
  'Explícame mis descuentos legales',
];

const SESSION_KEY = 'hhee_agent_session';

function renderContent(text: string) {
  return (
    <Suspense fallback={<span>{text}</span>}>
      <ReactMarkdown>{text}</ReactMarkdown>
    </Suspense>
  );
}

export default function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(localStorage.getItem(SESSION_KEY));
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;

    setError(null);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: message }, { role: 'assistant', content: '' }]);
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId: sessionIdRef.current, message }),
        signal: controller.signal,
      });

      const sid = res.headers.get('X-Agent-Session-Id');
      if (sid) {
        sessionIdRef.current = sid;
        localStorage.setItem(SESSION_KEY, sid);
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'El asistente no está disponible en este momento.');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: acc };
          return copy;
        });
      }

      if (!acc.trim()) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: 'No recibí respuesta. Intenta de nuevo.' };
          return copy;
        });
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setError('Respuesta detenida.');
      } else {
        const msg = err instanceof Error ? err.message : 'Error al contactar al asistente.';
        setError(msg);
      }
      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length && copy[copy.length - 1].role === 'assistant' && !copy[copy.length - 1].content) {
          copy.pop();
        }
        return copy;
      });
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  };

  const resetSession = () => {
    stop();
    sessionIdRef.current = null;
    localStorage.removeItem(SESSION_KEY);
    setMessages([]);
    setError(null);
  };

  return (
    <>
      {!open && (
        <button
          className="assistant-fab"
          onClick={() => setOpen(true)}
          aria-label="Abrir asistente virtual"
          title="Asistente virtual"
        >
          <Bot size={22} aria-hidden="true" />
        </button>
      )}

      {open && (
        <div className="assistant-panel" role="dialog" aria-label="Asistente virtual Entel">
          <div className="assistant-header">
            <div className="assistant-title">
              <Bot size={16} aria-hidden="true" />
              <span>Asistente Entel</span>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {messages.length > 0 && (
                <button className="assistant-close" onClick={resetSession} aria-label="Nueva conversación" title="Nueva conversación">
                  ↺
                </button>
              )}
              <button className="assistant-close" onClick={() => setOpen(false)} aria-label="Cerrar asistente">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="assistant-messages" ref={listRef}>
            {messages.length === 0 && (
              <p className="assistant-empty">
                Hola 👋 Pregúntame por tus horas extras, gastos o tu liquidación del mes.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`assistant-msg ${m.role}`}>
                {m.role === 'assistant'
                  ? (m.content
                    ? renderContent(m.content)
                    : (sending && i === messages.length - 1 ? <ThinkingDots /> : ''))
                  : m.content}
              </div>
            ))}
          </div>

          {error && <p className="assistant-error" role="alert">{error}</p>}

          {messages.length === 0 && (
            <div className="assistant-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="assistant-chip" onClick={() => send(s)} disabled={sending}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="assistant-input">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
              placeholder="Escribe tu consulta…"
              maxLength={2000}
              aria-label="Mensaje para el asistente"
              disabled={sending}
            />
            {sending ? (
              <button className="assistant-send" onClick={stop} aria-label="Detener respuesta" title="Detener">
                <Square size={14} aria-hidden="true" />
              </button>
            ) : (
              <button
                className="assistant-send"
                onClick={() => send(input)}
                disabled={!input.trim()}
                aria-label="Enviar mensaje"
              >
                <SendHorizonal size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
