import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { ActivityType, type DailyStateDto } from '../../api/types';
import { useSession } from '../../lib/sessionContext';
import { ACTIVITY_TITLE, sortedActivities } from '../../lib/sessionSteps';
import { SessionFooter, SessionLayout } from '../SessionShell';
import { FocadaSays } from './FocadaSays';
import { PixelButton, PixelChip } from './PixelButton';

const MAX_COMMENT = 1000;
const CLARITY_LABEL = ['Muito confuso', 'Confuso', 'Deu pra entender', 'Claro', 'Muito claro'];

/**
 * Feedback do dia (molde v1, Figma "Fase 1 - C / Feedback do dia"): ao fim do dia, depois de "Fechar o dia" e antes da
 * recompensa. So a clareza (1 a 5) e obrigatoria; "onde travei" comeca em "Nao travei" e o comentario e opcional.
 * Um por Daily, regravavel: se o aluno ja avaliou, a tela abre no estado "enviado" com "Editar". "Pular" sempre
 * disponivel - o feedback nunca segura a recompensa. Falha ao enviar nao perde o que foi digitado.
 */
export function DayFeedbackScreen({ daily, onDone }: { daily: DailyStateDto; onDone: () => void }) {
  const { weekly } = useSession();
  // As leituras levam o titulo do bloco: "Etapa 1 · Leitura" tres vezes nao diz em qual o aluno travou.
  const contentTitle = (id: string | null) => (id ? weekly?.curatedContents.find((c) => c.id === id)?.title : undefined);
  const [loading, setLoading] = useState(true);
  const [clarity, setClarity] = useState<number | null>(null);
  const [stuckId, setStuckId] = useState('');
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getDayFeedback(daily.id)
      .then((f) => {
        if (cancelled) return;
        setClarity(f.clarity);
        setStuckId(f.stuckActivityId ?? '');
        setComment(f.comment ?? '');
        setSent(true);
      })
      .catch(() => {
        // 404 feedback_nao_encontrado = ainda nao avaliou; qualquer outra falha tambem abre o formulario vazio.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [daily.id]);

  async function submit() {
    if (clarity === null || sending) return;
    setSending(true);
    setError(null);
    try {
      await api.submitDayFeedback(daily.id, { clarity, stuckActivityId: stuckId || null, comment: comment.trim() || null });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar agora. O que você escreveu continua aqui — tente de novo.');
    } finally {
      setSending(false);
    }
  }

  const activities = sortedActivities(daily);

  if (loading) {
    return (
      <SessionLayout label="Como foi o dia" chain="none" centered>
        <p className="font-pixel text-2xl text-secondary">Carregando...</p>
      </SessionLayout>
    );
  }

  if (sent) {
    return (
      <SessionLayout label="Como foi o dia" chain="none" centered>
        <FocadaSays expression="comemorando" size="lg" tone="accent">
          Anotado: {clarity !== null ? CLARITY_LABEL[clarity - 1] : ''}. Isso ajuda a melhorar o curso pra você e pra quem vem depois.
        </FocadaSays>
        <SessionFooter>
          <PixelButton ghost tone="muted" onClick={() => setSent(false)}>
            Editar
          </PixelButton>
          <PixelButton onClick={onDone}>Ver minha recompensa ›</PixelButton>
        </SessionFooter>
      </SessionLayout>
    );
  }

  return (
    <SessionLayout label="Como foi o dia" chain="none" showGauge={false}>
      <FocadaSays expression="neutra" size="sm">
        Antes da recompensa: o quanto o dia {daily.dayNumber} ficou claro pra você?
      </FocadaSays>

      <div role="radiogroup" aria-label="Clareza do dia, de 1 a 5" className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={clarity === n}
            onClick={() => setClarity(n)}
            className={`flex min-h-[64px] flex-col items-center justify-center gap-1 border-2 px-1 py-2 ${
              clarity === n ? 'border-accent bg-surface-alt text-accent' : 'border-stroke bg-base text-secondary hover:border-secondary'
            }`}
          >
            <span className="font-pixel text-3xl leading-none">{n}</span>
            <span className="font-pixel-label text-[8px] leading-tight">{CLARITY_LABEL[n - 1]}</span>
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="font-pixel-label text-[10px] text-secondary">Onde travei (opcional)</span>
        <select
          value={stuckId}
          onChange={(e) => setStuckId(e.target.value)}
          className="border-2 border-stroke bg-base px-3 py-3 font-pixel text-xl text-primary focus:border-accent focus:outline-none"
        >
          <option value="">Não travei</option>
          {activities.map((a, i) => (
            <option key={a.id} value={a.id}>
              Etapa {i + 1} · {a.isFinalQuestion ? 'Pergunta final' : ACTIVITY_TITLE[a.type]}
              {a.type === ActivityType.Reading && contentTitle(a.contentId) ? ` · ${contentTitle(a.contentId)}` : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between font-pixel-label text-[10px] text-secondary">
          Comentário (opcional)
          <span className={comment.length > MAX_COMMENT ? 'text-alert' : ''}>
            {comment.length}/{MAX_COMMENT}
          </span>
        </span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
          rows={3}
          className="resize-none border-2 border-stroke bg-base px-3 py-2 font-pixel text-xl leading-tight text-primary focus:border-accent focus:outline-none"
        />
      </label>

      {error && <p className="font-pixel text-lg leading-tight text-alert">{error}</p>}
      {clarity === null && <PixelChip>Escolha uma nota de clareza para enviar</PixelChip>}

      <SessionFooter>
        <PixelButton ghost tone="muted" onClick={onDone}>
          Pular
        </PixelButton>
        <PixelButton onClick={() => void submit()} disabled={clarity === null || sending}>
          {sending ? 'Enviando...' : 'Enviar'}
        </PixelButton>
      </SessionFooter>
    </SessionLayout>
  );
}
