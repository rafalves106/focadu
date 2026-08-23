import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { CourseStatus, type GamificationSummaryDto, type UserDto } from '../../api/types';
import { Centered } from '../Layout';

/**
 * Aba "Informações" do Perfil (Fase 18) - nome/email somente leitura (edição de conta em si fora
 * de escopo, ver docs/fase-18), interesses/notas da Entrevista de Perfil (já salvos, UserDto),
 * botão pra editar (reaproveita ProfileInterviewPage em modo edição) + estatísticas básicas.
 *
 * Sem Elo/Patente/Nível/XP nem "sessões completas" - o mockup do Figma mostra isso, mas nenhum
 * desses dados existe no domínio (confirmado fora de escopo até Squad/PvP existir); "Recorde de
 * Streak" do mockup vira `longestStreak` de verdade (GamificationSummaryDto).
 */
export function InformationTab({ user, gamification }: { user: UserDto; gamification: GamificationSummaryDto }) {
  const { data, loading } = useApiResource(async () => {
    const courses = await api.getCourses();
    const active = courses.find((c) => c.status === CourseStatus.Active) ?? courses[0] ?? null;
    const ranking = active ? await api.getCourseRanking(active.id, 'course') : null;
    return { coursesCount: courses.length, courseName: active?.name ?? null, score: ranking?.currentUserEntry?.score ?? null };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-stroke bg-surface p-6 sm:grid-cols-2">
        <Field label="Nome de exibição" value={user.displayName} />
        <Field label="E-mail" value={user.email} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-stroke bg-surface p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Seus interesses</p>
          <Link to="/onboarding/perfil?edit=1" className="text-sm font-semibold text-accent hover:underline">
            Editar meus interesses →
          </Link>
        </div>
        {user.interests.length === 0 ? (
          <p className="text-sm text-secondary">Nenhum interesse informado ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <span key={interest} className="rounded-full border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-primary">
                {interest}
              </span>
            ))}
          </div>
        )}
        {user.additionalProfileNotes && <p className="text-sm text-secondary">{user.additionalProfileNotes}</p>}
      </div>

      {loading && <Centered text="Carregando estatísticas..." />}
      {data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Curso(s)" value={String(data.coursesCount)} />
          <Stat label="Recorde de Streak" value={`${gamification.longestStreak} dia(s)`} />
          {data.courseName && data.score !== null && <Stat label={`Score em ${data.courseName}`} value={data.score.toFixed(1)} />}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] font-semibold tracking-[0.5px] text-secondary uppercase">{label}</p>
      <p className="rounded-[10px] border border-stroke bg-surface-alt p-4 text-[15px] text-primary">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stroke bg-surface p-4 text-center">
      <p className="text-xl font-bold text-primary">{value}</p>
      <p className="text-xs text-secondary">{label}</p>
    </div>
  );
}
