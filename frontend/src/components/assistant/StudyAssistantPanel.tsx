import { useEffect, useRef, type KeyboardEvent } from 'react';
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
 * pedido do dono: "ocupando mais espaco vertical, digno de um chat". Sem `tall`, nada muda (Daily).
 */
export function StudyAssistantPanel({ tall = false, className = '' }: { tall?: boolean; className?: string }) {
  const { question, setQuestion, messages, sending, error, handleSend, handleClear } = useStudyAssistantChat();
  const listRef = useRef<HTMLDivElement>(null);

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
    <div className={`flex shrink-0 flex-col gap-3 rounded-2xl border border-stroke bg-surface ${tall ? 'px-[18px] pt-4 pb-4' : 'w-[280px] p-5'} ${className}`}>
      <div className="flex items-center justify-between">
        {tall ? (
          <CardLabel>Tira dúvidas</CardLabel>
        ) : (
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">Tire sua dúvida</p>
        )}
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] font-semibold uppercase tracking-wide text-accent hover:underline"
          >
            Limpar
          </button>
        )}
      </div>

      {tall ? (
        <ScrollArea scrollRef={listRef} className="min-h-0 flex-1 rounded-xl bg-base" contentClassName="flex flex-col gap-2 p-3 pr-4">
          <MessageList messages={messages} sending={sending} error={error} />
        </ScrollArea>
      ) : (
      <div ref={listRef} className="flex h-[200px] flex-col gap-2 overflow-y-auto rounded-xl bg-base p-3">
        <MessageList messages={messages} sending={sending} error={error} />
      </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, STUDY_ASSISTANT_MAX_QUESTION_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua dúvida..."
          rows={1}
          // min-w-0 (bug reportado: botao de enviar saindo do card) - um <textarea> flex-1 sem isso
          // nao encolhe abaixo da sua largura minima intrinseca (~20 colunas default do navegador),
          // que nao cabe nos 280px do card (mais estreito que o painel flutuante de 340px de onde
          // este composer foi copiado) - o excesso empurrava o botao pra fora da borda arredondada.
          className={`max-h-20 min-w-0 flex-1 resize-none rounded-xl border border-stroke bg-base px-3 py-2 text-primary ${tall ? 'text-[13px]' : 'text-sm'} placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent`}
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
  );
}

function MessageList({
  messages,
  sending,
  error,
}: {
  messages: ReturnType<typeof useStudyAssistantChat>['messages'];
  sending: boolean;
  error: string | null;
}) {
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
