import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import type { AiCallType, AiModelPriceDto, AiPeriod, AiUsageByTypeDto, AiUsageOverviewDto, AiUsageStudentDetailDto, AiUsageStudentRowDto } from '../../api/adminTypes';
import { api, ApiError } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { compact, dateBr, handleOf, num, usd, when } from '../../lib/adminFormat';
import { AdminPanel, BlockBar, EmptyPanel, Field, PanelError, PixelButton, SkeletonRows, SortHeader, StatCard, Toggle } from './AdminUi';
import { inputClass } from '../../lib/adminStyles';
import { AdminShell } from './AdminShell';

// Fase 94, Medicao de IA (Figma 244:4502, IA 01-07 + N1) dentro do Painel de gestao (PG 09). Regra da secao:
// medir antes de limitar - nada aqui bloqueia, avisa aluno ou troca modelo. Todo custo e estimado.

const CALL_TYPE_LABEL: Record<AiCallType, string> = {
  Transcription: 'Resumo falado · transcrição',
  ContentEvaluation: 'Resumo falado · correção e avaliação',
  StudyAssistant: 'Chat rápido',
  CodeStepEvaluation: 'Avaliação do passo de código',
  ProjectEvaluation: 'Avaliação do Projeto Semanal',
  NotesReview: 'Revisão do Caderninho',
  CodeStepHint: 'Dica da Focada (laboratório)',
  LinkedInDraft: 'Rascunho de LinkedIn',
  Analogy: 'Analogia "Pra você"',
};

const PERIODS: { key: AiPeriod; label: string }[] = [
  { key: 'mes', label: 'Mês atual' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
];

export function AiUsageTab() {
  const [params, setParams] = useSearchParams();
  const view = params.get('vista') === 'aluno' ? 'aluno' : 'mes';
  const [period, setPeriod] = useState<AiPeriod>('mes');
  const [courseId, setCourseId] = useState<string | null>(null);
  const { data: courses } = useApiResource(() => api.getCourses(), []);
  const overview = useApiResource(() => adminApi.getAiUsage(period, courseId), [period, courseId]);

  const setView = (v: 'mes' | 'aluno') => setParams(v === 'aluno' ? { vista: 'aluno' } : {}, { replace: true });
  const o = overview.data;

  return (
    <AdminShell
      section="Uso de IA"
      subtitle="Quanto a IA custa por aluno. Só quem é admin vê esta tela; o aluno não vê nada disso."
      actions={
        <>
          <PixelButton tone={view === 'mes' ? 'selected' : 'outline'} onClick={() => setView('mes')}>
            Visão do mês
          </PixelButton>
          <PixelButton tone={view === 'aluno' ? 'selected' : 'outline'} onClick={() => setView('aluno')}>
            Por aluno
          </PixelButton>
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-accent bg-accent/5 px-4 py-2.5 lg:shrink-0">
        <p className="text-[13px] text-primary">
          <span className="mr-3 font-pixel-label text-[8px] text-accent">■ MEDINDO, SEM LIMITES ATIVOS</span>
          Nada bloqueia nem troca o modelo de ninguém. A medição só registra tokens e minutos de áudio de cada chamada.
        </p>
        {o && <p className="text-[12px] text-secondary">medindo desde {dateBr(o.measuringSince)}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 lg:shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-pixel-label text-[7px] text-secondary">PERÍODO</span>
          {PERIODS.map((p) => (
            <PixelButton key={p.key} tone={period === p.key ? 'selected' : 'outline'} onClick={() => setPeriod(p.key)}>
              {p.label}
            </PixelButton>
          ))}
          <label className="ml-2 flex h-10 items-center gap-2 border-2 border-stroke px-3">
            <span className="font-pixel-label text-[7px] text-secondary">CURSO</span>
            <select
              value={courseId ?? ''}
              onChange={(e) => setCourseId(e.target.value || null)}
              className="bg-base text-[13px] text-primary outline-none"
            >
              <option value="">Todos os cursos</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {o && (
          <p className="text-[12px] text-secondary">
            {dateBr(o.fromUtc).slice(0, 5)} a {dateBr(new Date(new Date(o.toUtc).getTime() - 1).toISOString()).slice(0, 5)} · custo em US$, estimado
          </p>
        )}
      </div>

      {overview.loading && !o && <SkeletonRows rows={8} />}
      {overview.error && (
        <PanelError
          message="A medição continua registrando cada chamada normalmente; o que falhou foi só montar este resumo. Tente de novo."
          code={`AI_USAGE_SUMMARY_FAILED · ${new Date().toLocaleString('pt-BR')}`}
          onRetry={overview.retry}
        />
      )}
      {o && view === 'mes' && <MonthView overview={o} onChanged={overview.retry} />}
      {o && view === 'aluno' && <StudentsView period={period} courseId={courseId} />}
    </AdminShell>
  );
}

function MonthView({ overview, onChanged }: { overview: AiUsageOverviewDto; onChanged: () => void }) {
  const t = overview.totals;
  const [editingPrices, setEditingPrices] = useState(false);
  const latestPrice = overview.prices.reduce<AiModelPriceDto | null>((a, p) => (!a || p.updatedAt > a.updatedAt ? p : a), null);
  const nothing = t.calls === 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:shrink-0 xl:grid-cols-6">
        <StatCard highlight label="Custo estimado" value={nothing ? 'US$ 0,00' : usd(t.estimatedCostUsd)} detail={`no período · tabela de ${dateBr(latestPrice?.updatedAt)}`} />
        <StatCard label="Por aluno ativo" value={t.costPerActiveStudentUsd == null ? '—' : usd(t.costPerActiveStudentUsd)} detail={`média de ${t.activeStudents} alunos`} />
        <StatCard label="Áudio transcrito" value={nothing ? '—' : `${num(t.audioMinutes, 1)} min`} detail="Whisper" />
        <StatCard label="Tokens" value={nothing ? '—' : compact(t.inputTokens + t.outputTokens)} detail={`${compact(t.inputTokens)} entrada · ${compact(t.outputTokens)} saída`} />
        <StatCard label="Chamadas" value={nothing ? '—' : num(t.calls)} detail={t.failedCalls ? `${t.failedCalls} com erro` : t.activeStudents ? `≈ ${num(t.calls / t.activeStudents)} por aluno` : 'sem aluno'} />
        <StatCard label="Alunos ativos" value={nothing ? '—' : t.activeStudents} detail="com 1+ chamada no período" />
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 xl:grid-cols-[1fr_420px]">
        <AdminPanel label="Por tipo de chamada" className="lg:overflow-hidden">
          {nothing ? (
            <EmptyPanel title="Ainda não medi nenhuma chamada">
              A medição foi ligada em {dateBr(overview.measuringSince)} e só conta chamadas feitas depois disso; o uso de antes não entra. Assim que um aluno
              usar a IA, os números aparecem aqui.
            </EmptyPanel>
          ) : (
            <ByTypeTable rows={overview.byType} />
          )}
          {overview.unpricedModels.length > 0 && (
            <p className="text-[12px] text-project">Sem preço (fora da soma): {overview.unpricedModels.join(', ')}.</p>
          )}
        </AdminPanel>

        <div className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">
          <CapPanel overview={overview} onChanged={onChanged} />
          <AdminPanel label="Tabela de preços" context={latestPrice ? `atualizada em ${dateBr(latestPrice.updatedAt)}` : undefined}>
            <p className="text-[13px] text-primary">O custo é estimado com estes preços. Editar recalcula a estimativa; nada muda pro aluno.</p>
            <ul className="flex flex-col gap-1 text-[12px] text-secondary">
              {overview.prices.map((p) => (
                <li key={p.model}>{priceLine(p)}</li>
              ))}
            </ul>
            <PixelButton className="self-start" onClick={() => setEditingPrices(true)}>
              Ver e editar
            </PixelButton>
          </AdminPanel>
        </div>
      </div>

      {editingPrices && (
        <PricesDrawer
          prices={overview.prices}
          unpriced={overview.unpricedModels}
          onClose={() => setEditingPrices(false)}
          onSaved={onChanged}
        />
      )}
    </>
  );
}

function priceLine(p: AiModelPriceDto) {
  if (p.audioPerHourUsd != null) return `${p.model} · ${usd(p.audioPerHourUsd, 3)} por hora de áudio`;
  return `${p.model} · ${usd(p.inputPerMillionUsd ?? 0)} / ${num(p.outputPerMillionUsd ?? 0, 2)} por 1 M tokens (entrada / saída)`;
}

function ByTypeTable({ rows }: { rows: AiUsageByTypeDto[] }) {
  const max = Math.max(0, ...rows.map((r) => r.costUsd));
  const shown: (AiUsageByTypeDto | { callType: 'Analogy'; off: true })[] = rows.some((r) => r.callType === 'Analogy')
    ? rows
    : [...rows, { callType: 'Analogy', off: true }];
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="font-pixel-label text-[7px] text-secondary">
            <th className="py-2 font-normal" />
            <th className="py-2 font-normal">FATIA DO CUSTO</th>
            <th className="py-2 text-right font-normal">CUSTO</th>
            <th className="py-2 text-right font-normal">% TOTAL</th>
            <th className="py-2 text-right font-normal">CHAMADAS</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) =>
            'off' in r ? (
              <tr key="analogy-off" className="text-[13px] text-muted">
                <td className="py-2 pr-4">
                  {CALL_TYPE_LABEL.Analogy} <span className="ml-1 border-2 border-muted px-1.5 font-pixel-label text-[6px]">DESLIGADA</span>
                </td>
                <td className="w-2/5 py-2">
                  <div className="h-3 border border-dashed border-muted" />
                </td>
                <td className="py-2 text-right">—</td>
                <td className="py-2 text-right">—</td>
                <td className="py-2 text-right">0 chamadas</td>
              </tr>
            ) : (
              <tr key={r.callType} className="text-[13px] text-primary">
                <td className="py-2 pr-4">{CALL_TYPE_LABEL[r.callType]}</td>
                <td className="w-2/5 py-2">
                  <BlockBar filled={max > 0 ? Math.max(r.costUsd > 0 ? 1 : 0, Math.round((r.costUsd / max) * 24)) : 0} />
                </td>
                <td className="py-2 text-right font-pixel-label text-[8px]">{usd(r.costUsd)}</td>
                <td className="py-2 text-right font-pixel-label text-[8px] text-secondary">{num(r.sharePercent, 1)}%</td>
                <td className="py-2 text-right text-secondary">{num(r.calls)} chamadas</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function CapPanel({ overview, onChanged }: { overview: AiUsageOverviewDto; onChanged: () => void }) {
  const cap = overview.monthlyCap.capUsd;
  const [value, setValue] = useState(cap == null ? '' : String(cap).replace('.', ','));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const parsed = value.trim() === '' ? null : Number(value.replace(',', '.'));
  const invalid = parsed !== null && (!Number.isFinite(parsed) || parsed <= 0);
  const pct = cap ? Math.min(100, (overview.monthlyCap.monthCostUsd / cap) * 100) : 0;

  async function save() {
    setBusy(true);
    setFailure(null);
    try {
      await adminApi.setAiCap(parsed);
      onChanged();
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : 'Não deu pra salvar o teto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPanel label="Teto mensal global">
      <p className="text-[13px] text-secondary">
        <span className="mr-2 font-pixel-label text-[14px] text-primary">{usd(overview.monthlyCap.monthCostUsd)}</span>
        gastos em {month}
      </p>
      {cap ? (
        <div className="flex flex-col gap-1">
          <BlockBar filled={Math.round((pct / 100) * 24)} color={pct >= 100 ? 'bg-alert' : 'bg-accent'} />
          <p className="text-[12px] text-secondary">
            {num(pct)}% de {usd(cap)}
          </p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-muted py-1 text-center font-pixel-label text-[7px] text-secondary">TETO NÃO DEFINIDO</div>
      )}
      <Field label="TETO DO MÊS (US$)" error={invalid ? 'Use um valor maior que zero, ou deixe vazio.' : failure}>
        <div className="flex gap-2">
          <input className={inputClass(invalid)} inputMode="decimal" placeholder="não definido" value={value} onChange={(e) => setValue(e.target.value)} />
          <PixelButton onClick={save} disabled={busy || invalid}>
            {busy ? 'Salvando…' : 'Salvar'}
          </PixelButton>
        </div>
      </Field>
      <p className="text-[12px] text-secondary">Quando definido: ao passar dele, a plataforma trocaria para um modelo mais barato. Hoje é só referência; passar não muda nada.</p>
    </AdminPanel>
  );
}

function PricesDrawer({ prices, unpriced, onClose, onSaved }: { prices: AiModelPriceDto[]; unpriced: string[]; onClose: () => void; onSaved: () => void }) {
  const models = [...prices.map((p) => p.model), ...unpriced.filter((m) => !prices.some((p) => p.model === m))];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-base/70 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Tabela de preços"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[520px] flex-col gap-5 overflow-y-auto border-l-2 border-accent bg-base p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-pixel-label text-[10px] text-accent">// TABELA DE PREÇOS</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center border-2 border-stroke text-secondary hover:text-primary">
            ✕
          </button>
        </div>
        <p className="text-[13px] text-secondary">
          Todo custo destas telas é estimado: o uso medido (tokens e minutos) vezes estes preços. Atualize quando o provedor mudar o preço. Salvar recalcula a
          estimativa de todos os períodos; o uso medido não muda e nada muda pro aluno.
        </p>
        {models.map((model) => (
          <PriceForm key={model} model={model} price={prices.find((p) => p.model === model) ?? null} onSaved={onSaved} />
        ))}
      </aside>
    </div>
  );
}

function PriceForm({ model, price, onSaved }: { model: string; price: AiModelPriceDto | null; onSaved: () => void }) {
  const isAudio = price ? price.audioPerHourUsd != null : model.includes('whisper');
  const show = (v: number | null | undefined) => (v == null ? '' : String(v).replace('.', ','));
  const [input, setInput] = useState(show(price?.inputPerMillionUsd));
  const [output, setOutput] = useState(show(price?.outputPerMillionUsd));
  const [audio, setAudio] = useState(show(price?.audioPerHourUsd));
  const [source, setSource] = useState(price?.source ?? 'página de preços da Groq');
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | string>('idle');
  const parse = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

  async function save() {
    setState('busy');
    try {
      await adminApi.setAiPrice({
        model,
        inputPerMillionUsd: isAudio ? null : parse(input),
        outputPerMillionUsd: isAudio ? null : parse(output),
        audioPerHourUsd: isAudio ? parse(audio) : null,
        source: source.trim() || null,
      });
      setState('saved');
      onSaved();
    } catch (err) {
      setState(err instanceof ApiError ? err.message : 'Não deu pra salvar.');
    }
  }

  return (
    <div className="flex flex-col gap-3 border-2 border-stroke p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[13px] text-primary">{model}</p>
        <p className="text-[11px] text-muted">{price ? `${dateBr(price.updatedAt)} · ${price.updatedBy}` : 'sem preço'}</p>
      </div>
      {isAudio ? (
        <Field label="US$ POR HORA DE ÁUDIO">
          <input className={inputClass()} inputMode="decimal" value={audio} onChange={(e) => setAudio(e.target.value)} />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="ENTRADA · US$ / 1 M">
            <input className={inputClass()} inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} />
          </Field>
          <Field label="SAÍDA · US$ / 1 M">
            <input className={inputClass()} inputMode="decimal" value={output} onChange={(e) => setOutput(e.target.value)} />
          </Field>
        </div>
      )}
      <Field label="FONTE">
        <input className={inputClass()} value={source} onChange={(e) => setSource(e.target.value)} />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[12px] ${state === 'saved' ? 'text-accent' : 'text-alert'}`}>
          {state === 'saved' ? 'Salvo. A estimativa foi recalculada.' : state !== 'idle' && state !== 'busy' ? state : ''}
        </p>
        <PixelButton tone="primary" onClick={save} disabled={state === 'busy'}>
          {state === 'busy' ? 'Salvando…' : 'Salvar preço'}
        </PixelButton>
      </div>
    </div>
  );
}

type StudentSort = 'aluno' | 'curso' | 'chamadas' | 'tokens' | 'audio' | 'custo' | 'ultima';

function StudentsView({ period, courseId }: { period: AiPeriod; courseId: string | null }) {
  const { data, error, loading, retry } = useApiResource(() => adminApi.getAiUsageStudents(period, courseId), [period, courseId]);
  const [hidden, setHidden] = useState(false);
  const [sort, setSort] = useState<{ key: StudentSort; dir: 'asc' | 'desc' }>({ key: 'custo', dir: 'desc' });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const value = (r: AiUsageStudentRowDto): string | number =>
      ({ aluno: r.email, curso: r.courses.join(' '), chamadas: r.calls, tokens: r.tokens, audio: r.audioMinutes, custo: r.costUsd, ultima: r.lastCallAt ?? '' })[sort.key];
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...(data?.students ?? [])].sort((a, b) => (value(a) < value(b) ? -1 : value(a) > value(b) ? 1 : 0) * sign);
  }, [data, sort]);
  const nameOf = (r: { email: string; userId: string }) => handleOf(r.email, hidden, rows.findIndex((x) => x.userId === r.userId));
  const toggleSort = (key: StudentSort) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  const header = (key: StudentSort, label: string, align: 'left' | 'right' = 'right') => (
    <SortHeader label={label} align={align} active={sort.key === key} direction={sort.dir} onClick={() => toggleSort(key)} />
  );

  if (loading && !data) return <SkeletonRows rows={10} />;
  if (error) return <PanelError message="Não deu pra montar a lista por aluno." code="AI_USAGE_STUDENTS_FAILED" onRetry={retry} />;
  if (!data) return null;
  if (rows.length === 0) return <EmptyPanel title="Nenhum aluno usou a IA no período">Troque o período ou o curso pra ver outros números.</EmptyPanel>;

  const selected = rows.find((r) => r.userId === selectedId) ?? null;
  return (
    <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_436px]">
      <AdminPanel
        label="Por aluno"
        context={`${rows.length} alunos ativos · clique no título da coluna pra ordenar`}
        action={<Toggle label="Ocultar nomes" checked={hidden} onChange={setHidden} />}
        className="lg:overflow-hidden"
      >
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-base">
              <tr className="border-b-2 border-stroke">
                {header('aluno', 'Aluno', 'left')}
                {header('curso', 'Curso', 'left')}
                {header('chamadas', 'Chamadas')}
                {header('tokens', 'Tokens')}
                {header('audio', 'Min áudio')}
                {header('custo', 'Custo')}
                <th className="px-3 py-2 text-right font-pixel-label text-[7px] font-normal text-secondary">% TOTAL</th>
                {header('ultima', 'Última chamada')}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const active = r.userId === selectedId;
                return (
                  <tr
                    key={r.userId}
                    onClick={() => setSelectedId(active ? null : r.userId)}
                    className={`cursor-pointer border-b border-stroke text-[13px] ${active ? 'outline-2 -outline-offset-2 outline-accent' : 'hover:bg-surface'}`}
                  >
                    <td className={`px-3 py-3 ${active ? 'text-accent' : 'text-primary'}`}>
                      {active && '▶ '}
                      {nameOf(r)}
                    </td>
                    <td className="px-3 py-3 text-secondary">{r.courses.join(' · ') || '—'}</td>
                    <td className="px-3 py-3 text-right font-pixel-label text-[8px] text-primary">{num(r.calls)}</td>
                    <td className="px-3 py-3 text-right font-pixel-label text-[8px] text-primary">{compact(r.tokens)}</td>
                    <td className="px-3 py-3 text-right font-pixel-label text-[8px] text-primary">{num(r.audioMinutes, 1)}</td>
                    <td className={`px-3 py-3 text-right font-pixel-label text-[8px] ${active ? 'text-accent' : 'text-primary'}`}>{usd(r.costUsd)}</td>
                    <td className="px-3 py-3 text-right font-pixel-label text-[8px] text-secondary">
                      {data.totalCostUsd > 0 ? `${num((r.costUsd / data.totalCostUsd) * 100, 1)}%` : '—'}
                    </td>
                    <td className="px-3 py-3 text-right text-secondary">{when(r.lastCallAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[12px] text-secondary">Total do período: {usd(data.totalCostUsd)} (inclui chamadas sem aluno).</p>
      </AdminPanel>

      {selected ? (
        <StudentCostDetail userId={selected.userId} name={nameOf(selected)} onClose={() => setSelectedId(null)} />
      ) : (
        <EmptyPanel title="Nenhum aluno selecionado">Clique numa linha pra ver o custo por dia do curso.</EmptyPanel>
      )}
    </div>
  );
}

function StudentCostDetail({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
  const { data, error, retry } = useApiResource<AiUsageStudentDetailDto>(() => adminApi.getAiUsageStudent(userId), [userId]);
  return (
    <AdminPanel
      accent
      label="Detalhe do aluno"
      action={
        <button type="button" onClick={onClose} aria-label="Fechar detalhe" className="flex size-9 items-center justify-center border-2 border-stroke text-secondary hover:text-primary">
          ✕
        </button>
      }
      className="lg:overflow-hidden"
    >
      {error && <PanelError message="Não deu pra carregar o aluno." onRetry={retry} />}
      {!data && !error && <SkeletonRows rows={5} />}
      {data && (
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <div>
            <p className="font-pixel-label text-[12px] text-primary">{name}</p>
            <p className="text-[12px] text-secondary">desde o início da medição</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              [usd(data.totals.estimatedCostUsd), 'custo estimado'],
              [num(data.totals.calls), 'chamadas'],
              [`${num(data.totals.audioMinutes, 1)} min`, 'de áudio'],
            ].map(([value, label]) => (
              <div key={label} className="border-2 border-stroke px-3 py-2">
                <p className="font-pixel-label text-[9px] text-primary">{value}</p>
                <p className="text-[11px] text-secondary">{label}</p>
              </div>
            ))}
          </div>
          {data.courses.map((c) => (
            <CourseDayChart key={c.courseId} course={c} name={name} />
          ))}
          <p className="font-pixel-label text-[8px] text-secondary">// Por tipo de chamada</p>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
            {data.byType.map((t) => (
              <li key={t.callType} className="flex justify-between gap-2">
                <span className="text-secondary">{CALL_TYPE_LABEL[t.callType]}</span>
                <span className="font-pixel-label text-[8px] text-primary">{usd(t.costUsd)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminPanel>
  );
}

function CourseDayChart({ course, name }: { course: AiUsageStudentDetailDto['courses'][number]; name: string }) {
  const max = Math.max(0.000001, ...course.days.map((d) => Math.max(d.costUsd, d.courseAverageUsd ?? 0)));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-pixel-label text-[8px] text-secondary">// Custo por dia · {course.courseName}</p>
        <p className="flex items-center gap-3 text-[11px] text-secondary">
          <span className="flex items-center gap-1">
            <span className="size-2.5 bg-accent" /> {name}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1 w-3 bg-project" /> média do curso
          </span>
        </p>
      </div>
      <div className="flex h-32 items-end gap-1 border-b border-stroke">
        {course.days.map((d) => (
          <div key={d.day} className="relative flex h-full flex-1 flex-col justify-end" title={`Dia ${d.day}: ${usd(d.costUsd)}`}>
            <span className="w-full bg-accent" style={{ height: `${(d.costUsd / max) * 100}%` }} />
            {d.courseAverageUsd != null && (
              <span className="absolute inset-x-0 h-1 bg-project" style={{ bottom: `${(d.courseAverageUsd / max) * 100}%` }} />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {course.days.map((d) => (
          <span key={d.day} className="flex-1 text-center font-pixel-label text-[6px] text-muted">
            {d.day}
          </span>
        ))}
      </div>
      <p className="text-[12px] text-secondary">
        Dia 1 ao {course.days.length}: {usd(course.totalCostUsd)} no total.
      </p>
    </div>
  );
}
