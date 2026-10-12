import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { useApiResource } from '../../api/useApiResource';
import { dayMonth, handleOf, usd, when } from '../../lib/adminFormat';
import { AdminPanel, BlockBar, PanelError, SkeletonRows, StatCard } from './AdminUi';
import { AdminShell } from './AdminShell';

// Fase 94, PG 01 — Visao geral do Painel de gestao.

export function OverviewTab() {
  const { data, error, loading, retry } = useApiResource(() => adminApi.getOverview(), []);
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <AdminShell
      section="Visão geral"
      subtitle="Como está o teste fechado hoje. Só quem é admin vê o painel; o aluno não vê nada daqui."
      context={data ? `Teste fechado · ${data.students} alunos · só admin` : undefined}
    >
      {loading && !data && <SkeletonRows rows={8} />}
      {error && <PanelError message="Não deu pra montar a visão geral." code="ADMIN_OVERVIEW_FAILED" onRetry={retry} />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:shrink-0 xl:grid-cols-5">
            <StatCard label="Alunos ativos · 7 dias" value={data.activeStudents7d} detail={`de ${data.students} cadastrados`} />
            <StatCard label="Alunos ativos · 30 dias" value={data.activeStudents30d} detail="com resposta ou dia concluído" />
            <StatCard label="Cadastros por convite" value={data.signupsByInvite} detail={`${data.activeInvites} convites ativos`} />
            <StatCard label="Dias concluídos · 30 dias" value={data.completedDays30d} detail="todos os cursos" />
            <Link to="/gestao/uso-de-ia" className="contents">
              <StatCard highlight label={`Custo de IA · ${month}`} value={usd(data.aiCostMonthUsd)} detail="estimado · abrir Uso de IA →" />
            </Link>
          </div>

          <div className="grid gap-4 lg:min-h-0 lg:flex-1 xl:grid-cols-[1fr_0.9fr_1.05fr]">
            <CompletionsChart days={data.completionsByDay} />

            <AdminPanel label="Últimos cadastros" context="mais recentes primeiro" className="lg:overflow-hidden">
              <ul className="flex flex-col divide-y divide-stroke overflow-y-auto">
                {data.recentSignups.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] text-primary">{handleOf(s.email)}</p>
                      <p className="truncate text-[12px] text-secondary">{s.courses.length ? s.courses.join(' · ') : 'sem curso ainda'}</p>
                    </div>
                    <p className="shrink-0 text-[12px] text-secondary">{when(s.createdAt)}</p>
                  </li>
                ))}
                {data.recentSignups.length === 0 && <li className="py-3 text-[13px] text-secondary">Ninguém se cadastrou ainda.</li>}
              </ul>
              <Link to="/gestao/convites" className="text-[13px] text-accent hover:underline">
                ver todos em Convites →
              </Link>
            </AdminPanel>

            <AdminPanel label="Dias curados por curso" context="secret/conteudo × banco" className="lg:overflow-hidden">
              <ul className="flex flex-col gap-4 overflow-y-auto">
                {data.curation.map((c) => {
                  const total = Math.max(c.curatedDays, c.importedDays, 1);
                  return (
                    <li key={c.name} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[14px] text-primary">{c.name}</p>
                        <Link to="/gestao/curadoria" className="shrink-0 text-[13px] text-accent hover:underline">
                          abrir →
                        </Link>
                      </div>
                      <BlockBar filled={Math.round((Math.min(c.curatedDays, c.importedDays) / total) * 24)} />
                      <p className="text-[12px] text-secondary">
                        {c.curatedDays} curados · {c.importedDays} no banco{c.staleDays > 0 ? ` · ${c.staleDays} só no banco` : ''}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </AdminPanel>
          </div>
        </>
      )}
    </AdminShell>
  );
}

function CompletionsChart({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const week = days.slice(-7);
  const weekTotal = week.reduce((sum, d) => sum + d.count, 0);
  return (
    <AdminPanel label="Dias concluídos por dia" context={`todos os cursos · ${dayMonth(days[0]?.date ?? '')} a hoje`} className="lg:overflow-hidden">
      <div className="flex min-h-48 flex-1 items-end gap-1.5">
        {days.map((d, i) => {
          const today = i === days.length - 1;
          return (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className={`font-pixel-label text-[7px] ${today ? 'text-accent' : 'text-primary'}`}>{d.count}</span>
              <span className={`w-full ${today ? 'bg-accent' : 'bg-secondary'}`} style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} />
              <span className={`font-pixel-label text-[6px] ${today ? 'text-accent' : 'text-muted'}`}>{today ? 'HOJE' : dayMonth(d.date)}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[12px] text-secondary">{weekTotal} dias concluídos nos últimos 7 dias.</p>
    </AdminPanel>
  );
}
