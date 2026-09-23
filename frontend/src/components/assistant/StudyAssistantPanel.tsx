import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { STUDY_ASSISTANT_MAX_QUESTION_LENGTH, useStudyAssistantChat } from '../../lib/useStudyAssistantChat';
import { CardLabel } from '../CardLabel';
import { ScrollArea } from '../ScrollArea';

/**
 * Suporte Rapido de IA em formato de card fixo (Fase 37, pedido explicito: "ao inves do botao,
 * algo mais parecido com um chat") - empilhado no sidebar de material, ao lado do
 * `<QuickNotePanel>` (ver useMaterialSidebar.tsx), no lugar do botao flutuante `StudyAssistantWidget`
 * usado ate aqui em toda tela de sessao. `StudyAssistantWidget`/`QuickQuestionOrb` continuam
 * existindo (WeeklyProjectPage nao tem esse sidebar) - mesmo estado/logica via
 * `useStudyAssistantChat`, so a apresentacao muda (card sempre visivel em vez de painel que abre
 * por cima de tudo).
 *
 * Altura da lista de mensagens fixa (`h-[200px]`, com scroll proprio) em vez de esticar pra
 * preencher o sidebar inteiro - pedido explicito de manter "tamanho similar ao Pomodoro" (o outro
 * card empilhado do lado esquerdo), pra os 2 lados ficarem visualmente equilibrados; o total dos 2
 * cards do sidebar (Caderninho + este) fica perto da altura do cartao central por causa do
 * `justify-between` no container pai, nao de este card esticar sozinho.
 *
 * `tall` (Fase 61, Projeto Semanal): o card estica pra altura que o pai der (`flex-1 min-h-0` la) e
 * a lista de mensagens ocupa todo o espaco sobrando, com a rolagem minimalista do `ScrollArea` -
 * pedido do dono: "ocupando mais espaco vertical, digno de um chat". Desde 23/09/2026 `tall` tambem e a
 * variante pixel art (mesma linguagem dos cartoes laterais da trilha): `pixel-box`, rotulo em
 * Silkscreen, mensagens e campo em VT323, cantos retos. Sem `tall`, nada muda (Daily).
 */
export function StudyAssistantPanel({ tall = false, className = '' }: { tall?: boolean; className?: string }) {
  const { question, setQuestion, messages, sending, error, handleSend, handleClear } = useStudyAssistantChat();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Campo cresce com a mensagem (pedido do dono, 23/09/2026): zera a altura e mede o scrollHeight a
  // cada mudanca - inclusive ao esvaziar depois de enviar, quando volta a 1 linha. O teto fica no
  // `max-h-*` do className; passou dele, rola por dentro. (`field-sizing: content` faria isso so com
  // CSS, mas ainda nao existe no Firefox.)
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
  }, [question]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div
      className={`flex shrink-0 flex-col gap-3 ${tall ? 'pixel-box bg-base p-5' : 'w-[280px] rounded-2xl border border-stroke bg-surface p-5'} ${className}`}
    >
      <div className="flex items-center justify-between">
        {tall ? (
          <CardLabel pixel>Tira dúvidas</CardLabel>
        ) : (
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">Tire sua dúvida</p>
        )}
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className={tall ? 'font-pixel-label text-[10px] text-secondary hover:text-primary' : 'text-[10px] font-semibold uppercase tracking-wide text-accent hover:underline'}
          >
            Limpar
          </button>
        )}
      </div>

      {tall ? (
        <ScrollArea scrollRef={listRef} className="min-h-0 flex-1 border-2 border-stroke bg-surface" contentClassName="flex flex-col gap-2 p-2 pr-4">
          <MessageList messages={messages} sending={sending} error={error} pixel />
        </ScrollArea>
      ) : (
      <div ref={listRef} className="flex h-[200px] flex-col gap-2 overflow-y-auto rounded-xl bg-base p-3">
        <MessageList messages={messages} sending={sending} error={error} />
      </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, STUDY_ASSISTANT_MAX_QUESTION_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder={tall ? 'Sua dúvida...' : 'Digite sua dúvida...'}
          rows={1}
          // min-w-0 (bug reportado: botao de enviar saindo do card) - um <textarea> flex-1 sem isso
          // nao encolhe abaixo da sua largura minima intrinseca (~20 colunas default do navegador),
          // que nao cabe nos 280px do card (mais estreito que o painel flutuante de 340px de onde
          // este composer foi copiado) - o excesso empurrava o botao pra fora da borda arredondada.
          className={`${tall ? 'max-h-40' : 'max-h-28'} min-w-0 flex-1 resize-none text-primary placeholder:text-muted focus:outline-none ${
            tall
              ? 'border-2 border-stroke bg-surface px-2 py-1 font-pixel text-lg leading-snug focus:border-accent'
              : 'rounded-xl border border-stroke bg-base px-3 py-2 text-sm focus:ring-1 focus:ring-accent'
          }`}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!question.trim() || sending}
          aria-label="Enviar pergunta"
          className={`shrink-0 bg-accent text-base disabled:opacity-40 ${
            tall ? 'h-9 px-2.5 font-pixel-label text-[10px] hover:brightness-110' : 'rounded-xl px-3 py-2.5 text-sm font-bold'
          }`}
        >
          {tall ? 'OK' : '➤'}
        </button>
      </div>
    </div>
  );
}

function MessageList({
  messages,
  sending,
  error,
  pixel = false,
}: {
  messages: ReturnType<typeof useStudyAssistantChat>['messages'];
  sending: boolean;
  error: string | null;
  pixel?: boolean;
}) {
  if (pixel) {
    return (
      <>
        {messages.length === 0 && (
          <p className="font-pixel text-lg leading-snug text-muted">Pergunte algo sobre o que está estudando agora — respostas curtas, direto ao ponto.</p>
        )}
        {messages.map((message, i) => (
          <div
            key={i}
            className={`max-w-[90%] px-2 py-1 font-pixel text-lg leading-snug ${
              message.role === 'user' ? 'self-end bg-accent text-base' : 'self-start bg-surface-alt text-primary'
            }`}
          >
            {message.text}
          </div>
        ))}
        {sending && <div className="self-start bg-surface-alt px-2 py-1 font-pixel text-lg text-muted">Pensando...</div>}
        {error && <p className="font-pixel text-lg leading-snug text-alert">{error}</p>}
      </>
    );
  }
  return (
    <>
      {messages.length === 0 && (
        <p className="text-xs text-muted">Pergunte algo sobre o que está estudando agora — respostas curtas, direto ao ponto.</p>
      )}
      {messages.map((message, i) => (
        <div
          key={i}
          className={`max-w-[90%] rounded-xl px-3 py-2 text-[13px] leading-[1.4] ${
            message.role === 'user' ? 'self-end bg-accent text-base' : 'self-start bg-surface-alt text-primary'
          }`}
        >
          {message.text}
        </div>
      ))}
      {sending && <div className="self-start rounded-xl bg-surface-alt px-3 py-2 text-[13px] text-muted">Pensando...</div>}
      {error && <p className="text-xs text-alert">{error}</p>}
    </>
  );
}
