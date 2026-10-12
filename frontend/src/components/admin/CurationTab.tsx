import { useState } from 'react';
import { adminApi } from '../../api/admin';
import type { CurationCourseDto, CurationDayDto, CurationDayState, ImportPreviewDto, ImportResultDto, StaleDaysPreviewDto } from '../../api/adminTypes';
import { ApiError } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { handleOf } from '../../lib/adminFormat';
import { PixelModal } from '../PixelModal';
import { AdminPanel, EmptyPanel, Field, PanelError, PixelButton, ResultBanner, SkeletonRows } from './AdminUi';
import { inputClass } from '../../lib/adminStyles';
import { AdminShell } from './AdminShell';

// Fase 94, PG 20-28 — Curadoria: dia a dia, arquivo em secret/conteudo x banco. Importar e em dois passos (previa,
// depois confirmar) e e tudo ou nada; dia "so no banco" sai pelo "Apagar dias antigos", nunca por celula.

const STATE: Record<CurationDayState, { label: string; cell: string; text: string; importable: boolean }> = {
  em_dia: { label: 'em dia', cell: 'border-accent bg-accent/10', text: 'text-accent', importable: false },
  difere: { label: 'difere', cell: 'border-alert bg-alert/10', text: 'text-alert', importable: true },
  so_no_arquivo: { label: 'novo', cell: 'border-project bg-project/10', text: 'text-project', importable: true },
  so_no_banco: { label: 'só no banco', cell: 'border-dashed border-muted bg-surface', text: 'text-secondary', importable: false },
  sem_curadoria: { label: '—', cell: 'border-stroke bg-base', text: 'text-muted', importable: false },
};

const TABLE_NAMES: Record<string, string> = {
  Notes: 'notas do Caderninho',
  NotesReviews: 'revisões do Caderninho',
  DayFeedbacks: 'feedbacks do dia',
  ActivityResponses: 'respostas das atividades',
  Weeklies: 'semanas dos alunos (com projeto e publicação)',
  Dailies: 'dias dos alunos',
  DailyTemplates: 'dias do currículo',
  WeeklyTemplates: 'semanas do currículo',
  Monthlies: 'módulos do currículo',
};

type ImportStep =
  | { kind: 'idle' }
  | { kind: 'previewing' }
  | { kind: 'preview'; preview: ImportPreviewDto }
  | { kind: 'importing'; preview: ImportPreviewDto }
  | { kind: 'done'; result: ImportResultDto }
  | { kind: 'failed'; message: string };

export function CurationTab() {
  const { data: loaded, error, loading, retry } = useApiResource(
    () => adminApi.getCuration().then((grid) => ({ grid, at: new Date() })),
    [],
  );
  const data = loaded?.grid;
  const [courseKey, setCourseKey] = useState<string | null>(null);
  const [marked, setMarked] = useState<number[]>([]);
  const [step, setStep] = useState<ImportStep>({ kind: 'idle' });
  const [deleting, setDeleting] = useState<CurationCourseDto | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const course = data?.find((c) => keyOf(c) === courseKey) ?? data?.[0] ?? null;

  function pickCourse(c: CurationCourseDto) {
    setCourseKey(keyOf(c));
    setMarked([]);
    setStep({ kind: 'idle' });
  }

  function toggle(day: CurationDayDto) {
    if (!STATE[day.state].importable || step.kind === 'importing') return;
    setStep({ kind: 'idle' });
    setMarked((m) => (m.includes(day.day) ? m.filter((d) => d !== day.day) : [...m, day.day].sort((a, b) => a - b)));
  }

  async function preview() {
    if (!course?.slug) return;
    setStep({ kind: 'previewing' });
    try {
      setStep({ kind: 'preview', preview: await adminApi.previewImport(course.slug, marked) });
    } catch (err) {
      setStep({ kind: 'failed', message: err instanceof ApiError ? err.message : 'Não deu pra montar a prévia.' });
    }
  }

  async function confirmImport(p: ImportPreviewDto) {
    if (!course?.slug) return;
    setStep({ kind: 'importing', preview: p });
    try {
      const result = await adminApi.importDays(course.slug, marked);
      setStep({ kind: 'done', result });
      setMarked([]);
      retry();
    } catch (err) {
      setStep({ kind: 'failed', message: `${err instanceof ApiError ? err.message : 'A importação falhou.'} Nada foi importado; tente de novo.` });
    }
  }

  return (
    <AdminShell
      section="Curadoria"
      subtitle="Dia a dia, o que está curado em secret/conteudo e o que está no banco. Dia novo ou divergente entra pela importação, nunca por SQL."
    >
      {loading && !data && <SkeletonRows rows={8} />}
      {error && <PanelError message="Não deu pra ler a curadoria." code="ADMIN_CURATION_FAILED" onRetry={retry} />}
      {data && data.length === 0 && <EmptyPanel title="Nenhum curso">Não achei curso.json em secret/conteudo nem curso no banco.</EmptyPanel>}
      {data && course && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 lg:shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-pixel-label text-[7px] text-secondary">CURSO</span>
              {data.map((c) => (
                <PixelButton key={keyOf(c)} tone={keyOf(c) === keyOf(course) ? 'selected' : 'outline'} onClick={() => pickCourse(c)}>
                  {c.name}
                </PixelButton>
              ))}
            </div>
            <p className="text-[12px] text-secondary">arquivos lidos às {loaded?.at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          {banner && (
            <ResultBanner tone="success" onClose={() => setBanner(null)}>
              {banner}
            </ResultBanner>
          )}

          <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_436px]">
            <AdminPanel
              label={`Dias de ${course.name}`}
              context={summary(course)}
              action={
                course.staleDays > 0 && course.courseId ? (
                  <PixelButton tone="danger" size="sm" onClick={() => setDeleting(course)}>
                    Apagar dias antigos ({course.staleDays})
                  </PixelButton>
                ) : undefined
              }
              className="lg:overflow-hidden"
            >
              <Legend />
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {weeksOf(course).map(([week, days]) => (
                  <div key={week} className="flex items-start gap-4">
                    <p className="w-20 shrink-0 pt-2 font-pixel-label text-[8px] text-primary">{week === 0 ? 'Fora do curso' : `Semana ${week}`}</p>
                    <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-6">
                      {days.map((day) => (
                        <DayCell key={day.day} day={day} marked={marked.includes(day.day)} onClick={() => toggle(day)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-secondary">
                Clique nos dias "novo" ou "difere" pra marcar. Dia só no banco não tem ação por célula: sai pelo "Apagar dias antigos".
              </p>
            </AdminPanel>

            <ImportPanel course={course} marked={marked} step={step} onPreview={preview} onConfirm={confirmImport} onClear={() => { setMarked([]); setStep({ kind: 'idle' }); }} />
          </div>
        </>
      )}

      {deleting && deleting.courseId && (
        <StaleDaysModal
          course={deleting}
          onClose={() => setDeleting(null)}
          onDone={(n) => {
            setBanner(`${n} dias antigos de ${deleting.name} apagados. Quem estava num deles segue pro primeiro dia curado que ainda não concluiu.`);
            setDeleting(null);
            retry();
          }}
        />
      )}
    </AdminShell>
  );
}

function keyOf(c: CurationCourseDto) {
  return c.slug ?? c.courseId ?? c.name;
}

function summary(c: CurationCourseDto) {
  const count = (s: CurationDayState) => c.days.filter((d) => d.state === s).length;
  return [
    `${c.days.length} dias`,
    `${c.curatedDays} curados`,
    `${count('em_dia')} em dia`,
    count('difere') && `${count('difere')} diferem`,
    count('so_no_arquivo') && `${count('so_no_arquivo')} novos`,
    c.staleDays && `${c.staleDays} só no banco`,
  ]
    .filter(Boolean)
    .join(' · ');
}

function weeksOf(c: CurationCourseDto): [number, CurationDayDto[]][] {
  const map = new Map<number, CurationDayDto[]>();
  for (const day of c.days) map.set(day.week, [...(map.get(day.week) ?? []), day]);
  return [...map.entries()].sort(([a], [b]) => (a === 0 ? 1 : b === 0 ? -1 : a - b));
}

function Legend() {
  const items: [CurationDayState, string][] = [
    ['em_dia', 'curado e importado, mesmo hash'],
    ['so_no_arquivo', 'curado, não importado'],
    ['difere', 'banco diferente do arquivo'],
    ['so_no_banco', 'dia antigo: no banco, sem arquivo'],
    ['sem_curadoria', 'sem curadoria'],
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map(([state, text]) => (
        <span key={state} className="flex items-center gap-1.5 text-[11px] text-secondary">
          <span className={`size-2.5 border-2 ${STATE[state].cell}`} />
          <span className={`font-pixel-label text-[7px] ${STATE[state].text}`}>{STATE[state].label}</span> {text}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-[11px] text-secondary">
        <span className="text-project">●N</span> alunos com resposta no dia
      </span>
    </div>
  );
}

function DayCell({ day, marked, onClick }: { day: CurationDayDto; marked: boolean; onClick: () => void }) {
  const s = STATE[day.state];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!s.importable}
      aria-pressed={s.importable ? marked : undefined}
      className={`flex h-16 flex-col justify-between border-2 px-2.5 py-2 text-left ${s.cell} ${marked ? 'outline-2 outline-offset-2 outline-primary' : ''} ${s.importable ? 'cursor-pointer hover:brightness-125' : 'cursor-default'}`}
    >
      <span className="flex items-center justify-between font-pixel-label text-[8px] text-primary">
        D{String(day.day).padStart(2, '0')}
        {day.studentsWithProgress > 0 && <span className="text-[9px] text-project">●{day.studentsWithProgress}</span>}
      </span>
      <span className={`font-pixel-label text-[7px] ${s.text}`}>{marked ? 'marcado' : s.label}</span>
    </button>
  );
}

function ImportPanel({
  course,
  marked,
  step,
  onPreview,
  onConfirm,
  onClear,
}: {
  course: CurationCourseDto;
  marked: number[];
  step: ImportStep;
  onPreview: () => void;
  onConfirm: (preview: ImportPreviewDto) => void;
  onClear: () => void;
}) {
  if (!course.slug)
    return (
      <AdminPanel label="Importar">
        <p className="text-[13px] text-secondary">Esse curso não tem pasta em secret/conteudo: nada pra importar. Os dias dele saem pelo "Apagar dias antigos".</p>
      </AdminPanel>
    );

  return (
    <AdminPanel label="Importar" className="lg:overflow-hidden">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
        {step.kind === 'done' ? (
          <>
            <p className="font-pixel-label text-[12px] text-accent">Dias importados</p>
            <ul className="flex flex-col gap-1 text-[13px] text-primary">
              {step.result.days.map((d) => (
                <li key={d.day}>
                  D{String(d.day).padStart(2, '0')} · {d.detail}
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-secondary">
              {step.result.dailiesAdded} dias adicionados aos alunos matriculados · {step.result.dailiesReset} dias não concluídos recomeçam.
            </p>
          </>
        ) : marked.length === 0 ? (
          <>
            <p className="font-pixel-label text-[12px] text-primary">Nada marcado</p>
            <p className="text-[13px] text-secondary">Marque na grade os dias "novo" ou "difere" pra importar. A importação roda o linter e é tudo ou nada.</p>
          </>
        ) : (
          <>
            <p className="font-pixel-label text-[12px] text-primary">
              {marked.length} {marked.length === 1 ? 'dia marcado' : 'dias marcados'}
            </p>
            <p className="text-[13px] text-secondary">{marked.map((d) => `D${String(d).padStart(2, '0')}`).join(', ')}</p>

            {(step.kind === 'preview' || step.kind === 'importing') && <PreviewResult preview={step.preview} />}
            {step.kind === 'failed' && <p className="border-2 border-alert px-3 py-2 text-[13px] text-alert">{step.message}</p>}

            <div className="flex flex-wrap gap-2">
              <PixelButton onClick={onClear} disabled={step.kind === 'importing' || step.kind === 'previewing'}>
                Desmarcar
              </PixelButton>
              {step.kind === 'preview' || step.kind === 'importing' ? (
                step.preview.canConfirm && (
                  <PixelButton tone="primary" onClick={() => onConfirm(step.preview)} disabled={step.kind === 'importing'}>
                    {step.kind === 'importing' ? 'Importando…' : `Importar ${marked.length} ${marked.length === 1 ? 'dia' : 'dias'}`}
                  </PixelButton>
                )
              ) : (
                <PixelButton tone="primary" onClick={onPreview} disabled={step.kind === 'previewing'}>
                  {step.kind === 'previewing' ? 'Rodando o linter…' : 'Ver prévia'}
                </PixelButton>
              )}
            </div>
          </>
        )}
      </div>
    </AdminPanel>
  );
}

function PreviewResult({ preview }: { preview: ImportPreviewDto }) {
  return (
    <div className={`flex flex-col gap-2 border-2 p-3 ${preview.canConfirm ? 'border-accent' : 'border-alert'}`}>
      <p className={`font-pixel-label text-[8px] ${preview.canConfirm ? 'text-accent' : 'text-alert'}`}>
        {preview.canConfirm ? 'Prévia ok: pode importar' : 'Não dá pra importar: nada entra'}
      </p>
      <ul className="flex flex-col gap-2 text-[13px]">
        {preview.days.map((d) => (
          <li key={d.day} className={d.status === 'Rejected' || d.status === 'NoFile' ? 'text-alert' : 'text-primary'}>
            D{String(d.day).padStart(2, '0')} · {d.detail}
            {d.errors.length > 0 && (
              <ul className="mt-1 list-inside list-disc font-mono text-[11px] text-secondary">
                {d.errors.slice(0, 8).map((e) => (
                  <li key={e}>{e}</li>
                ))}
                {d.errors.length > 8 && <li>+{d.errors.length - 8} erros</li>}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {preview.studentsLosingAnswers > 0 && (
        <p className="text-[12px] text-project">
          {preview.studentsLosingAnswers} {preview.studentsLosingAnswers === 1 ? 'aluno tem' : 'alunos têm'} resposta em dia que muda: as respostas das
          atividades trocadas deixam de aparecer e dias não concluídos recomeçam.
        </p>
      )}
    </div>
  );
}

function StaleDaysModal({ course, onClose, onDone }: { course: CurationCourseDto; onClose: () => void; onDone: (days: number) => void }) {
  const courseId = course.courseId!;
  const { data: preview, error } = useApiResource<StaleDaysPreviewDto>(() => adminApi.previewStaleDays(courseId), [courseId]);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === course.name.toLowerCase();

  async function confirm() {
    setBusy(true);
    setFailure(null);
    try {
      const result = await adminApi.deleteStaleDays(courseId, typed);
      onDone(result.days.length);
    } catch (err) {
      setFailure(`${err instanceof ApiError ? err.message : 'Não deu pra apagar.'} Nada foi apagado; tente de novo.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PixelModal label="Apagar dias antigos" title="APAGAR DIAS ANTIGOS" onClose={busy ? undefined : onClose} widthClass="max-w-xl">
      <div className="flex flex-col gap-4 p-5">
        {error && <p className="text-[13px] text-alert">Não deu pra calcular a prévia.</p>}
        {!preview && !error && <SkeletonRows rows={4} />}
        {preview && (
          <>
            <p className="text-[14px] text-primary">
              Apagar {preview.days.length} dias de <span className="text-accent">{course.name}</span> que estão no banco e não têm arquivo em
              secret/conteudo ({rangeText(preview.days)})? Não tem como desfazer.
            </p>
            <ul className="flex flex-col gap-1 border-2 border-stroke p-3 text-[13px] text-secondary">
              {preview.willDelete.filter((c) => c.count > 0).map((c) => (
                <li key={c.table}>
                  <span className="font-pixel-label text-[9px] text-primary">{c.count}</span> {TABLE_NAMES[c.table] ?? c.table}
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-secondary">
              {preview.affectedStudents.length === 0
                ? 'Nenhum aluno tem resposta ou conclusão nesses dias.'
                : `${preview.affectedStudents.length} alunos perdem respostas e conclusões nesses dias: ${preview.affectedStudents.map((s) => handleOf(s.email)).join(', ')}. Quem estava num deles segue pro primeiro dia curado que ainda não concluiu.`}
            </p>
            <p className="text-[12px] text-muted">A medição de IA dessas chamadas fica.</p>
          </>
        )}
        <Field label="Pra confirmar, digite o nome do curso" help={course.name}>
          <input className={inputClass()} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
        </Field>
        {failure && <p className="border-2 border-alert px-3 py-2 text-[13px] text-alert">{failure}</p>}
        <div className="flex justify-end gap-2">
          <PixelButton onClick={onClose} disabled={busy}>
            Cancelar
          </PixelButton>
          <PixelButton tone="dangerSolid" onClick={confirm} disabled={!matches || busy || !preview || preview.days.length === 0}>
            {busy ? 'Apagando…' : `Apagar ${preview?.days.length ?? ''} dias`}
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}

function rangeText(days: number[]) {
  if (days.length === 0) return 'nenhum';
  const first = days[0];
  const last = days[days.length - 1];
  return days.length === last - first + 1 ? `D${first} a D${last}` : days.map((d) => `D${d}`).join(', ');
}
