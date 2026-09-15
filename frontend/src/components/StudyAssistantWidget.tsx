import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { STUDY_ASSISTANT_MAX_QUESTION_LENGTH, useStudyAssistantChat } from '../lib/useStudyAssistantChat';

/**
 * Botao flutuante + painel de chat do Suporte Rapido de IA (Fase 32 - ver
 * secret/rascunhos/visual-ui-ux.md, "Suporte Rápido de IA": "botão flutuante acessível para dúvidas
 * pontuais... interações curtas e diretas, impedindo que o usuário se perca em diálogos longos").
 *
 * Fase 37: nas telas com "material de hoje" (`SessionLayout`/`useMaterialSidebar`), este botao
 * flutuante deu lugar ao card fixo `StudyAssistantPanel` no sidebar (pedido explicito: "algo mais
 * parecido com um chat" em vez do botao) - `QuickQuestionOrb`/este componente so continuam ativos
 * onde nao ha esse sidebar (WeeklyProjectPage). Estado/logica do chat foi extraida pro hook
 * `useStudyAssistantChat` (compartilhado com `StudyAssistantPanel`) - aqui sobra so a apresentacao
 * flutuante (abrir/fechar, clique fora, autoscroll).
 *
 * `messages` e o transcript LOCAL da conversa - fechar o painel (✕ ou clique fora) so esconde
 * (`open=false`), nunca apaga `messages`; some de verdade so ao trocar de atividade/pagina (o
 * componente inteiro desmonta) ou via "Limpar"/`/clear` (Fase 33, ver useStudyAssistantChat).
 */
export function StudyAssistantWidget() {
  const [open, setOpen] = useState(false);
  const { question, setQuestion, messages, sending, error, handleSend, handleClear } = useStudyAssistantChat();
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  // Clique fora fecha (so oculta, ver doc da classe) - so ouve enquanto aberto, mesma ideia de
  // useSessionExitGuard (TodayPage.tsx) de so instalar o listener quando precisa.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, setOpen]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div ref={containerRef}>
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
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <button type="button" onClick={handleClear} className="text-xs font-semibold text-secondary hover:text-primary">
                  Limpar
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="shrink-0 text-secondary hover:text-primary"
              >
                ✕
              </button>
            </div>
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
              onChange={(e) => setQuestion(e.target.value.slice(0, STUDY_ASSISTANT_MAX_QUESTION_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua dúvida..."
              rows={1}
              // min-w-0 preventivo (mesmo bug corrigido em StudyAssistantPanel: textarea flex-1 sem
              // isso nao encolhe abaixo da largura minima intrinseca do navegador) - aqui o painel e
              // mais largo (340px) e nao chegou a estourar, mas o composer e o mesmo.
              className="max-h-24 min-w-0 flex-1 resize-none rounded-xl border border-stroke bg-base px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
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
    </div>
  );
}
