import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { ActivityType, DailyAccessMode, type DailyStateDto } from '../api/types';
import { Centered } from '../components/Layout';
import { QuizActivity } from '../components/QuizActivity';

/** GET /api/today - a Daily ativa de hoje. Start/Resume precisam de POST /start antes de poder responder (Daily.SubmitActivityResponse exige Status != Locked/Available). */
export function TodayPage() {
  const [daily, setDaily] = useState<DailyStateDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        let state = await api.getToday();
        if (state.accessMode === DailyAccessMode.Start || state.accessMode === DailyAccessMode.Resume) {
          state = await api.startDaily(state.id);
        }
        if (!cancelled) setDaily(state);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Nao foi possivel carregar a Daily de hoje.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Centered text="Carregando..." />;
  if (error) return <Centered text={error} tone="alert" />;
  if (!daily) return null;

  const activity = daily.activities.find((a) => a.status === 0) ?? daily.activities[0];
  if (!activity) return <Centered text="Essa Daily ainda nao tem atividades." />;

  // So a tela de Quiz esta implementada nesta fase (a mais validada no Figma) - WordMatch/Cloze/
  // Roleplay ficam para uma fase futura.
  if (activity.type !== ActivityType.Quiz) {
    return <Centered text={`Essa atividade ainda nao tem tela pronta (tipo ${activity.type}) - so Quiz esta implementado.`} />;
  }

  return <QuizActivity dailyId={daily.id} activity={activity} />;
}
