import { useState } from 'react';
import { adminApi } from '../../api/admin';
import type { RetentionCellDto, RetentionCohortDto, RetentionReportDto } from '../../api/adminTypes';
import { useApiResource } from '../../api/useApiResource';
import { AdminPanel, Chip, PanelError, PixelButton } from './AdminUi';
import { AdminShell } from './AdminShell';

// Fase 103, Medicao de produto (Figma "Retencao — Fase 103", arquivo Uvy09SJEA9phpWZWRzj2ol, quadros R01-R07).
// Tudo calculado pela Api ao abrir a aba (sem tarefa agendada). Admins e contas desativadas ficam fora das contas.

type Mode = 'opened' | 'daily';
type Horizon = 1 | 7 | 30;
const HORIZONS: Horizon[] = [1, 7, 30];

const SCREEN_LABEL: Record<string, string> = {
  hoje: 'Hoje',
  sessao: 'Daily (sessão)',
  trilha: 'Trilha',
  semana: 'Semana',
  projeto: 'Projeto Semanal',
  start: 'Início',
  perfil: 'Perfil',
  squad: 'Squad',
  loja: 'Loja',
  ranking: 'Ranking',
  certificacoes: 'Certificações',
  caderninho: 'Caderninho',
  onboarding: 'Boas-vindas',
  gestao: 'Gestão',
  outra: 'Outras',
};

// DateOnly chega como "2026-10-12": conta em UTC pra o fuso nao mudar o dia.
function addDays(isoDay: string, days: number): Date {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
const ddmm = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
const weekLabel = (weekStart: string) => `${ddmm(addDays(weekStart, 0))} a ${ddmm(addDays(weekStart, 6))}`;

function currentWeekStart(): string {
  const now = new Date();
  const monday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)));
  return monday.toISOString().slice(0, 10);
}

function cellOf(c: RetentionCohortDto, mode: Mode, n: Horizon): RetentionCellDto | null {
  if (mode === 'opened') return n === 1 ? c.openedD1 : n === 7 ? c.openedD7 : c.openedD30;
  return n === 1 ? c.dailyD1 : n === 7 ? c.dailyD7 : c.dailyD30;
}

// Ordem do Figma (R01); as telas da lista base aparecem mesmo zeradas, as demais so com uso.
const SCREEN_ORDER = ['hoje', 'sessao', 'trilha', 'semana', 'projeto', 'perfil', 'squad', 'loja', 'ranking', 'caderninho', 'certificacoes', 'start', 'onboarding', 'gestao', 'outra'];
const ALWAYS_SHOWN = new Set(['hoje', 'sessao', 'trilha', 'projeto', 'perfil', 'squad', 'loja', 'ranking', 'caderninho', 'outra']);

function deviceRows(rows: RetentionReportDto['screensByDevice']) {
  const byScreen = new Map(rows.map((r) => [r.screen, r]));
  const known = SCREEN_ORDER.filter((s) => ALWAYS_SHOWN.has(s) || byScreen.has(s)).map(
    (screen) => byScreen.get(screen) ?? { screen, desktop: 0, mobile: 0, tablet: 0 },
  );
  return [...known, ...rows.filter((r) => !SCREEN_ORDER.includes(r.screen))];
}

const pct = (n: number, of: number) => (of === 0 ? 0 : Math.round((n / of) * 100));

function Ratio({ n, of }: { n: number; of: number }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-primary">
        {n} de {of}
      </span>
      <span className="text-secondary"> · {pct(n, of)}%</span>
    </span>
  );
}

export function RetentionTab() {
  const [courseId, setCourseId] = useState<string | null>(null);
  const report = useApiResource(() => adminApi.getRetention(courseId), [courseId]);
  const r = report.data;
  const loading = report.loading && !r;
  const empty = r && !r.hasData;
  const studentCount = r?.cohorts.reduce((sum, c) => sum + c.students, 0) ?? 0;
  const course = r?.courses.find((c) => c.id === r.courseId);

  return (
    <AdminShell
      section="Retenção"
      subtitle="Quem volta depois do cadastro, quem chega no Projeto Semanal, onde param e de qual aparelho usam. Conta só alunos: admins e contas desativadas ficam fora."
      context={r ? `${studentCount} ${studentCount === 1 ? 'aluno medido' : 'alunos medidos'} · calculado ao abrir · só admin` : undefined}
    >
      {report.error && (
        <PanelError
          message="Não deu pra carregar a retenção. A medição continua registrando normalmente; o que falhou foi só montar este resumo."
          code={`RETENTION_SUMMARY_FAILED · ${new Date().toLocaleString('pt-BR')}`}
          onRetry={report.retry}
        />
      )}

      {!report.error && (
        <div className="flex h-10 flex-wrap items-center justify-between gap-3 lg:shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <label className={`flex h-10 items-center gap-2 border-2 border-stroke px-3 ${loading || empty ? 'opacity-40' : ''}`}>
              <span className="font-pixel-label text-[7px] text-secondary">CURSO</span>
              <select
                value={r?.courseId ?? ''}
                disabled={loading || !!empty}
                onChange={(e) => setCourseId(e.target.value || null)}
                className="w-[220px] bg-base text-[13px] text-primary outline-none"
              >
                {r?.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-[12px] text-secondary">vale para "Daily → Projeto Semanal" e "Onde param"</p>
          </div>
          <p className="text-[12px] text-muted">Retorno e aparelho: a plataforma toda</p>
        </div>
      )}

      {empty && (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 border-2 border-stroke bg-base px-6 py-10 text-center">
          <p className="font-pixel-label text-[8px] text-muted">FOCADA</p>
          <p className="font-pixel text-[32px] leading-none text-accent">Sem dados ainda.</p>
          <p className="max-w-[560px] text-[13px] text-secondary">
            A medição começa quando os testadores entram. Retorno, Projeto Semanal, onde param e aparelho aparecem assim que o primeiro aluno abrir o app.
          </p>
        </section>
      )}

      {(loading || (r && r.hasData)) && (
        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_480px]">
          <div className="flex min-h-0 flex-col gap-4">
            <CohortsPanel report={r} />
            <div className="grid gap-4 lg:min-h-0 lg:flex-1 md:grid-cols-2">
              <DailyToProjectPanel report={r} courseName={course?.name} />
              <DropoutPanel report={r} courseName={course?.name} />
            </div>
          </div>
          <DevicePanel report={r} />
        </div>
      )}
    </AdminShell>
  );
}

function SkeletonLines({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} aria-hidden="true">
          <td colSpan={5} className="py-1.5">
            <div className="h-3 animate-pulse bg-surface-alt" />
          </td>
        </tr>
      ))}
    </>
  );
}

const TH = 'py-2 pr-3 text-left font-pixel-label text-[7px] font-normal text-secondary';
const TD = 'border-t-2 border-stroke py-2 pr-3 text-[13px]';

function CohortsPanel({ report }: { report: RetentionReportDto | null }) {
  const [mode, setMode] = useState<Mode>('opened');
  const thisWeek = currentWeekStart();

  return (
    <AdminPanel
      label="Retorno por coorte"
      className="lg:max-h-[50%] lg:shrink-0"
      action={
        <div className="flex items-center gap-2">
          <span className="font-pixel-label text-[7px] text-secondary">CONTAR QUEM</span>
          <PixelButton tone={mode === 'opened' ? 'selected' : 'outline'} onClick={() => setMode('opened')}>
            Abriu o app
          </PixelButton>
          <PixelButton tone={mode === 'daily' ? 'selected' : 'outline'} onClick={() => setMode('daily')}>
            Fez uma Daily
          </PixelButton>
        </div>
      }
    >
      <p className="text-[12px] text-secondary">
        Coorte = semana do cadastro (seg. a dom.). Voltou no D7 = {mode === 'opened' ? 'abriu o app' : 'concluiu uma Daily'} no 7º dia depois do cadastro ou
        depois.
      </p>
      <div className="min-h-0 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Semana do cadastro</th>
              <th className={TH}>Alunos</th>
              {HORIZONS.map((n) => (
                <th key={n} className={TH}>
                  D{n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!report && <SkeletonLines rows={4} />}
            {report?.cohorts.map((c) => (
              <tr key={c.weekStart}>
                <td className={`${TD} text-primary`}>
                  <span className="inline-flex items-center gap-2">
                    {weekLabel(c.weekStart)}
                    {c.weekStart === thisWeek && <Chip tone="muted">EM CURSO</Chip>}
                  </span>
                </td>
                <td className={`${TD} text-primary`}>{c.students}</td>
                {HORIZONS.map((n) => (
                  <td key={n} className={TD}>
                    <CohortCell cell={cellOf(c, mode, n)} n={n} weekStart={c.weekStart} />
                  </td>
                ))}
              </tr>
            ))}
            {report?.cohortTotal && (
              <tr className="bg-surface">
                <td className={`${TD} font-pixel-label text-[8px] text-primary`}>Total</td>
                <td className={`${TD} text-primary`}>{report.cohortTotal.students}</td>
                {HORIZONS.map((n) => {
                  const cell = cellOf(report.cohortTotal!, mode, n);
                  return (
                    <td key={n} className={TD}>
                      {cell ? <Ratio n={cell.returned} of={cell.eligible} /> : <span className="text-muted">—</span>}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-muted">
        "—" = ninguém da coorte completou o prazo ainda (passe o mouse para ver). O número conta só quem já completou; o total soma essas contas.
      </p>
    </AdminPanel>
  );
}

function CohortCell({ cell, n, weekStart }: { cell: RetentionCellDto | null; n: Horizon; weekStart: string }) {
  if (cell) return <Ratio n={cell.returned} of={cell.eligible} />;
  const closes = ddmm(addDays(weekStart, 6 + n));
  return (
    <span tabIndex={0} className="group relative inline-block px-1 text-muted outline-none hover:bg-surface-alt focus:bg-surface-alt">
      —
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-[260px] flex-col gap-1 border-2 border-secondary bg-surface-alt px-3 py-2 group-hover:flex group-focus:flex"
      >
        <span className="font-pixel-label text-[7px] text-secondary">
          D{n} · {weekLabel(weekStart)}
        </span>
        <span className="text-[12px] text-primary">
          Ainda não deu {n} {n === 1 ? 'dia' : 'dias'}. Essa coorte fecha o D{n} em {closes}.
        </span>
      </span>
    </span>
  );
}

function DailyToProjectPanel({ report, courseName }: { report: RetentionReportDto | null; courseName: string | undefined }) {
  return (
    <AdminPanel label="Daily → Projeto Semanal" context={courseName && <Chip tone="muted">{courseName}</Chip>} className="lg:min-h-0">
      {report && !report.courseHasProjects ? (
        <div className="flex flex-col gap-2 border-2 border-dashed border-stroke px-4 py-5">
          <p className="font-pixel-label text-[8px] text-primary">{(courseName ?? 'Este curso').toUpperCase()} NÃO TEM PROJETO SEMANAL</p>
          <p className="text-[13px] text-secondary">
            As semanas de {courseName ?? 'este curso'} terminam no 6º dia, sem projeto. Escolha outro curso no seletor para ver esta conta.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[12px] text-secondary">Por semana do curso: quem fez ao menos 1 Daily e quantos entregaram o projeto.</p>
          <div className="min-h-0 overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Semana</th>
                  <th className={TH}>Fez Daily</th>
                  <th className={TH}>Entregou o projeto</th>
                </tr>
              </thead>
              <tbody>
                {!report && <SkeletonLines rows={3} />}
                {report?.dailyToProject.map((w) => (
                  <tr key={w.week}>
                    <td className={`${TD} text-primary`}>Semana {w.week}</td>
                    <td className={`${TD} text-primary`}>{w.didDaily}</td>
                    <td className={TD}>
                      <span className="flex items-center gap-3">
                        <Ratio n={w.deliveredProject} of={w.didDaily} />
                        <BlocksOf8 filled={Math.round((pct(w.deliveredProject, w.didDaily) / 100) * 8)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report && report.dailyToProject.length === 0 && (
              <p className="pt-2 text-[12px] text-muted">Ninguém concluiu uma Daily de semana com projeto ainda.</p>
            )}
          </div>
        </>
      )}
    </AdminPanel>
  );
}

function BlocksOf8({ filled }: { filled: number }) {
  return (
    <span className="flex gap-[2px]" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className={`h-2 w-1.5 ${i < filled ? 'bg-accent' : 'bg-surface-alt'}`} />
      ))}
    </span>
  );
}

function DropoutPanel({ report, courseName }: { report: RetentionReportDto | null; courseName: string | undefined }) {
  const d = report?.dropout;
  const enrolled = d ? d.active + d.beforeFirstDaily + d.byWeek.reduce((s, w) => s + w.students, 0) : 0;
  const stopped = enrolled - (d?.active ?? 0);
  const rows = d ? [{ label: 'Antes da 1ª Daily', students: d.beforeFirstDaily }, ...d.byWeek.map((w) => ({ label: `Semana ${w.week}`, students: w.students }))] : [];

  return (
    <AdminPanel label="Onde param" context={courseName && <Chip tone="muted">{courseName}</Chip>} className="lg:min-h-0">
      <p className="text-[12px] text-secondary">Sem abrir o app há 7 dias ou mais, pela última semana com Daily.</p>
      {d && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 border-2 border-project px-3 py-2">
            <span className="font-pixel-label text-[7px] text-project">PARADOS</span>
            <span className="text-[13px] text-primary">
              {stopped} de {enrolled} no curso
            </span>
          </div>
          <div className="flex flex-col gap-1 border-2 border-stroke px-3 py-2">
            <span className="font-pixel-label text-[7px] text-secondary">ATIVOS</span>
            <span className="text-[13px] text-primary">
              {d.active} de {enrolled} no curso
            </span>
          </div>
        </div>
      )}
      <ul className="flex min-h-0 flex-col gap-1.5 overflow-auto">
        {!d && <li className="h-3 animate-pulse bg-surface-alt" aria-hidden="true" />}
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3 text-[13px]">
            <span className="w-[140px] shrink-0 text-primary">{row.label}</span>
            {row.students === 0 ? (
              <span className="text-muted">0 alunos</span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="flex gap-[2px]" aria-hidden="true">
                  {Array.from({ length: row.students }, (_, i) => (
                    <span key={i} className="h-3 w-3 bg-project" />
                  ))}
                </span>
                <span className="text-primary">{row.students === 1 ? '1 aluno' : `${row.students} alunos`}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-muted">Ativo = abriu o app nos últimos 7 dias.</p>
    </AdminPanel>
  );
}

function DevicePanel({ report }: { report: RetentionReportDto | null }) {
  return (
    <AdminPanel label="Aparelho por tela" className="lg:min-h-0">
      <p className="text-[12px] text-secondary">
        Últimos {report?.deviceWindowDays ?? 30} dias, em alunos-dia: um aluno conta uma vez por dia em cada tela.
      </p>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Tela</th>
              <th className={`${TH} text-right`}>Computador</th>
              <th className={`${TH} text-right`}>Celular</th>
              <th className={`${TH} text-right`}>Tablet</th>
            </tr>
          </thead>
          <tbody>
            {!report && <SkeletonLines rows={8} />}
            {report && deviceRows(report.screensByDevice).map((row) => {
              const handheld = row.mobile + row.tablet > 0;
              const n = (value: number, small: boolean) => (
                <td className={`${TD} text-right font-pixel-label text-[9px] ${small && value > 0 ? 'text-project' : 'text-primary'}`}>
                  {small && value > 0 ? `■ ${value}` : value}
                </td>
              );
              return (
                <tr key={row.screen} className={handheld ? 'bg-project/[0.06]' : undefined}>
                  <td className={`${TD} text-primary`}>
                    <span className="inline-flex items-center gap-2">
                      {handheld && <span className="h-1.5 w-1.5 bg-project" aria-hidden="true" />}
                      {SCREEN_LABEL[row.screen] ?? row.screen}
                    </span>
                  </td>
                  {n(row.desktop, false)}
                  {n(row.mobile, true)}
                  {n(row.tablet, true)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-muted">
        <span className="text-project">■</span> Tela aberta no celular ou tablet ao menos uma vez: candidata a ajuste de layout.
      </p>
    </AdminPanel>
  );
}
