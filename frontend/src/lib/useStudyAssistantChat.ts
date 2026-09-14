import { useState } from 'react';
import { api, ApiError, type StudyAssistantHistoryItem } from '../api/client';
import { useStudyAssistantContext } from './studyAssistantContext';

export type StudyAssistantChatMessage = { role: 'user' | 'assistant'; text: string };

// Espelha AskStudyAssistantUseCase.MaxQuestionLength (backend) - so pra UX (contador/corte cedo no
// campo), a validacao de verdade e sempre no servidor.
export const STUDY_ASSISTANT_MAX_QUESTION_LENGTH = 500;

/**
 * Logica do Suporte Rapido de IA (Fase 32/33), extraida de dentro de `StudyAssistantWidget` (Fase
 * 37) quando o "material de hoje" ganhou uma 2a apresentacao: alem do botao flutuante
 * (`StudyAssistantWidget`, ainda usado pela WeeklyProjectPage), agora existe tambem
 * `StudyAssistantPanel` (card fixo no sidebar de material, ao lado do Caderninho/Pomodoro) - os 2
 * precisam do mesmo estado/comportamento (enviar pergunta, historico, `/clear`, erro), so a
 * apresentacao (flutuante vs. card fixo) e diferente. Hook em arquivo proprio pelo mesmo motivo de
 * lib/statusBadge.ts - co-exportar hook e componente quebra o fast refresh.
 *
 * `messages` e o transcript LOCAL da conversa (nao persiste no backend) - ver doc de
 * StudyAssistantWidget pra regra de quando ele e esvaziado de verdade.
 */
export function useStudyAssistantChat() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<StudyAssistantChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const context = useStudyAssistantContext();

  function handleClear() {
    setMessages([]);
    setError(null);
  }

  async function handleSend() {
    const trimmed = question.trim();
    if (!trimmed || sending) return;

    // Atalho reconhecido localmente, nunca vira pergunta pra IA (Fase 33: no teste real, "/clear"
    // foi enviado como texto literal e a IA respondeu "vamos limpar a conversa" sem limpar nada).
    if (trimmed.toLowerCase() === '/clear') {
      setQuestion('');
      handleClear();
      return;
    }

    const history: StudyAssistantHistoryItem[] = messages.map((m) => ({ fromUser: m.role === 'user', content: m.text }));
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setQuestion('');
    setSending(true);
    setError(null);

    try {
      const result = await api.askStudyAssistant(trimmed, context, history);
      setMessages((prev) => [...prev, { role: 'assistant', text: result.answer }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível responder agora. Tente de novo.');
    } finally {
      setSending(false);
    }
  }

  return { question, setQuestion, messages, sending, error, handleSend, handleClear };
}
