import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api, ApiError } from '../api/client';
import { useStudyAssistantContext } from '../lib/studyAssistantContext';

type ChatMessage = { role: 'user' | 'assistant'; text: string };

// Espelha AskStudyAssistantUseCase.MaxQuestionLength (backend) - so pra UX (contador/corte cedo no
// campo), a validacao de verdade e sempre no servidor.
const MAX_QUESTION_LENGTH = 500;

/**
 * Botao flutuante + painel de chat do Suporte Rapido de IA (Fase 32 - ver
 * secret/rascunhos/visual-ui-ux.md, "Suporte Rápido de IA": "botão flutuante acessível para dúvidas
 * pontuais... interações curtas e diretas, impedindo que o usuário se perca em diálogos longos").
 *
 * Sem historico enviado ao backend de proposito (cada pergunta e independente, ver
 * AskStudyAssistantUseCase) - `messages` aqui e so o transcript LOCAL da conversa, pra referencia
 * visual do aluno dentro desta mesma tela; some ao trocar de atividade/pagina (nao persiste).
 * `context` vem de useStudyAssistantContext() - store externo que SessionLayout/WeeklyProjectPage
 * alimentam sozinhos (ver lib/studyAssistantContext.ts), sem este componente precisar de nenhuma
 * prop: renderizado sempre como `<QuickQuestionOrb/>` (SessionShell.tsx), zero argumentos.
 *
 * "Fecha só pelo próprio botão (sem listener de clique fora)" - mesmo idioma simples de
 * AiStatusBadge.tsx.
 */
export function StudyAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const context = useStudyAssistantContext();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSend() {
    const trimmed = question.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setQuestion('');
    setSending(true);
    setError(null);

    try {
      const result = await api.askStudyAssistant(trimmed, context);
      setMessages((prev) => [...prev, { role: 'assistant', text: result.answer }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível responder agora. Tente de novo.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Suporte rápido de IA"
          className="fixed bottom-24 right-6 z-50 flex h-[440px] w-[340px] flex-col overflow-hidden rounded-[20px] border border-stroke bg-surface shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-primary">Tire sua dúvida</p>
              <p className="text-[11px] text-muted">Perguntas rápidas sobre a sessão ou o curso</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="shrink-0 text-secondary hover:text-primary"
            >
              ✕
            </button>
          </div>

          <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted">
                Pergunte algo sobre o que está estudando agora — respostas curtas, pra você voltar rápido pro foco.
              </p>
            )}
            {messages.map((message, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-[1.4] ${
                  message.role === 'user' ? 'self-end bg-accent text-base' : 'self-start bg-surface-alt text-primary'
                }`}
              >
                {message.text}
              </div>
            ))}
            {sending && <div className="self-start rounded-xl bg-surface-alt px-3 py-2 text-[13px] text-muted">Pensando...</div>}
            {error && <p className="text-xs text-alert">{error}</p>}
          </div>

          <div className="flex items-end gap-2 border-t border-stroke p-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua dúvida..."
              rows={1}
              className="max-h-24 flex-1 resize-none rounded-xl border border-stroke bg-base px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!question.trim() || sending}
              aria-label="Enviar pergunta"
              className="shrink-0 rounded-xl bg-accent px-3 py-2.5 text-sm font-bold text-base disabled:opacity-40"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? 'Fechar suporte de IA' : 'Tirar dúvida com a IA'}
        title="Suporte rápido de IA"
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-accent text-2xl text-base shadow-lg transition-transform hover:scale-105"
      >
        {open ? '✕' : '💬'}
      </button>
    </>
  );
}
