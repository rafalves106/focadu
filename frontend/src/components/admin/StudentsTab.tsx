import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import type { AdminCourseProgressDto, AdminStudentDto, CourseResetPreviewDto } from '../../api/adminTypes';
import { ApiError } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { dateBr, handleOf, when } from '../../lib/adminFormat';
import { PixelModal } from '../PixelModal';
import { AdminPanel, Chip, EmptyPanel, Field, PanelError, PixelButton, ResultBanner, SkeletonRows, SortHeader, Toggle } from './AdminUi';
import { inputClass } from '../../lib/adminStyles';
import { AdminShell } from './AdminShell';

// Fase 94, PG 02-08 — Alunos: tabela ordenavel, painel lateral do aluno e "Resetar progresso" de um curso.
// Fase 96, TU 30: coluna e selo da turma; `?aluno=<id>` abre o aluno ja selecionado ("Ver em Alunos" da turma).

type SortKey = 'aluno' | 'turma' | 'cursos' | 'dia' | 'acesso' | 'sequencia' | 'email';

const TABLE_NAMES: Record<string, string> = {
  ActivityResponses: 'respostas das atividades',
  Notes: 'notas do Caderninho',
  NotesReviews: 'revisões do Caderninho',
  Enrollments: 'matrícula (semanas, dias, projetos e publicações juntos)',
};

export function StudentsTab() {
  const { data, error, loading, retry } = useApiResource(() => adminApi.getStudents(), []);
  const [hidden, setHidden] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'acesso', dir: 'desc' });
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('aluno'));
  const [resetting, setResetting] = useState<{ student: AdminStudentDto; course: AdminCourseProgressDto } | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const rows = useMemo(() => sortStudents(data ?? [], sort.key, sort.dir), [data, sort]);
  const selected = rows.find((s) => s.id === selectedId) ?? null;
  const nameOf = (s: AdminStudentDto) => handleOf(s.email, hidden, rows.indexOf(s));
  const toggleSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  return (
    <AdminShell
      section="Alunos"
      subtitle="Quem está estudando, em que dia está e se confirmou o e-mail. Clique num aluno pra ver o progresso."
      context={data ? `Teste fechado · ${data.length} alunos · só admin` : undefined}
    >
      {result && (
        <ResultBanner tone="success" onClose={() => setResult(null)}>
          {result}
        </ResultBanner>
      )}
      {loading && !data && <SkeletonRows rows={10} />}
      {error && <PanelError message="Não deu pra carregar a lista de alunos." code="ADMIN_STUDENTS_FAILED" onRetry={retry} />}
      {data && data.length === 0 && <EmptyPanel title="Nenhum aluno ainda">Quando alguém entrar com um convite, aparece aqui.</EmptyPanel>}
      {data && data.length > 0 && (
        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_436px]">
          <AdminPanel
            label="Alunos"
            context={`${data.length} alunos · clique no título da coluna pra ordenar`}
            action={<Toggle label="Ocultar nomes" checked={hidden} onChange={setHidden} />}
            className="lg:overflow-hidden"
          >
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-base">
                  <tr className="border-b-2 border-stroke">
                    <SortHeader label="Aluno" active={sort.key === 'aluno'} direction={sort.dir} onClick={() => toggleSort('aluno')} />
                    <SortHeader label="Turma" active={sort.key === 'turma'} direction={sort.dir} onClick={() => toggleSort('turma')} />
                    <SortHeader label="Cursos" active={sort.key === 'cursos'} direction={sort.dir} onClick={() => toggleSort('cursos')} />
                    <SortHeader label="Dia atual" active={sort.key === 'dia'} direction={sort.dir} onClick={() => toggleSort('dia')} />
                    <SortHeader label="Último acesso" active={sort.key === 'acesso'} direction={sort.dir} onClick={() => toggleSort('acesso')} />
                    <SortHeader label="Sequência" align="right" active={sort.key === 'sequencia'} direction={sort.dir} onClick={() => toggleSort('sequencia')} />
                    <SortHeader label="E-mail" align="right" active={sort.key === 'email'} direction={sort.dir} onClick={() => toggleSort('email')} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const active = s.id === selectedId;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedId(active ? null : s.id)}
                        className={`cursor-pointer border-b border-stroke text-[13px] ${active ? 'outline-2 -outline-offset-2 outline-accent' : 'hover:bg-surface'}`}
                      >
                        <td className={`px-3 py-3 ${active ? 'text-accent' : 'text-primary'}`}>
                          {active && '▶ '}
                          {nameOf(s)}
                          {s.isAdmin && <span className="ml-2 font-pixel-label text-[7px] text-project">admin</span>}
                        </td>
                        <td className="px-3 py-3">
                          {s.cohortName ? <Chip tone="amber">{s.cohortName}</Chip> : <span className="text-[12px] text-muted">sem turma</span>}
                        </td>
                        <td className="px-3 py-3 text-secondary">{s.courses.map((c) => c.courseName).join(' · ') || '—'}</td>
                        <td className="px-3 py-3 text-primary">{s.currentCourse ? `${s.currentCourse} D${s.currentDay}` : '—'}</td>
                        <td className="px-3 py-3 text-secondary">{when(s.lastActivityAt)}</td>
                        <td className="px-3 py-3 text-right font-pixel-label text-[9px] text-primary">{s.currentStreak}</td>
                        <td className="px-3 py-3 text-right">
                          <Chip tone={s.emailVerified ? 'accent' : 'alert'}>{s.emailVerified ? 'SIM' : 'NÃO'}</Chip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] text-secondary">A lista rola dentro do quadro. "Último acesso" é a última resposta ou dia concluído.</p>
          </AdminPanel>

          {selected ? (
            <StudentDetail
              student={selected}
              name={nameOf(selected)}
              onClose={() => setSelectedId(null)}
              onReset={(course) => setResetting({ student: selected, course })}
            />
          ) : (
            <EmptyPanel title="Nenhum aluno selecionado">Clique numa linha da tabela pra ver o progresso por curso.</EmptyPanel>
          )}
        </div>
      )}

      {resetting && (
        <ResetModal
          student={resetting.student}
          course={resetting.course}
          name={nameOf(resetting.student)}
          onClose={() => setResetting(null)}
          onDone={() => {
            setResult(`Progresso de ${nameOf(resetting.student)} em ${resetting.course.courseName} zerado. O aluno recomeça do Dia 1.`);
            setResetting(null);
            retry();
          }}
        />
      )}
    </AdminShell>
  );
}

function StudentDetail({
  student,
  name,
  onClose,
  onReset,
}: {
  student: AdminStudentDto;
  name: string;
  onClose: () => void;
  onReset: (course: AdminCourseProgressDto) => void;
}) {
  const completed = student.courses.reduce((sum, c) => sum + c.completedDays, 0);
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
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
        <div>
          <p className="font-pixel-label text-[12px] text-primary">{name}</p>
          <p className="text-[12px] text-secondary">
            Entrou em {dateBr(student.createdAt)} · e-mail {student.emailVerified ? 'confirmado' : 'não confirmado'} · último acesso {when(student.lastActivityAt)}
          </p>
          {student.cohortName && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-pixel-label text-[7px] text-secondary">TURMA</span>
              <Chip tone="amber">{student.cohortName}</Chip>
              <Link to={`/gestao/turmas?turma=${student.cohortId}`} className="font-pixel-label text-[7px] text-accent hover:underline">
                Ver turma ›
              </Link>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MiniStat value={completed} label="dias concluídos" />
          <MiniStat value={`${student.currentStreak} dias`} label="de sequência" />
          <MiniStat value={student.courses.length} label={student.courses.length === 1 ? 'curso' : 'cursos'} />
        </div>
        <p className="font-pixel-label text-[8px] text-secondary">// Progresso por curso</p>
        {student.courses.length === 0 && <p className="text-[13px] text-secondary">Ainda não se matriculou em nenhum curso.</p>}
        {student.courses.map((course) => (
          <div key={course.courseId} className="flex flex-col gap-3 border-2 border-stroke p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] text-primary">{course.courseName}</p>
                <p className="text-[12px] text-secondary">
                  no D{course.currentDay} · {course.completedDays} de {course.totalDays} dias concluídos
                </p>
              </div>
              <PixelButton tone="danger" size="sm" onClick={() => onReset(course)}>
                Resetar progresso
              </PixelButton>
            </div>
            <DayGrid course={course} />
          </div>
        ))}
        <p className="text-[12px] text-secondary">
          Resetar zera só o curso escolhido: conclusões, respostas e notas dele. Conta, gems, sequência e os outros cursos ficam.
        </p>
      </div>
    </AdminPanel>
  );
}

function MiniStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="border-2 border-stroke px-3 py-2">
      <p className="font-pixel-label text-[10px] text-primary">{value}</p>
      <p className="text-[11px] text-secondary">{label}</p>
    </div>
  );
}

function DayGrid({ course }: { course: AdminCourseProgressDto }) {
  const weeks = [...new Set(course.days.map((d) => d.week))].sort((a, b) => a - b);
  return (
    <div className="flex flex-col gap-1.5">
      {weeks.map((week) => (
        <div key={week} className="flex items-center gap-1.5">
          <span className="w-6 font-pixel-label text-[7px] text-muted">S{week}</span>
          {course.days
            .filter((d) => d.week === week)
            .map((d) => {
              const current = d.day === course.currentDay && !d.completed;
              const tone = d.completed ? 'border-accent text-accent' : current ? 'border-primary text-primary' : 'border-stroke text-muted';
              return (
                <span key={d.day} className={`flex h-6 w-10 items-center justify-center border-2 font-pixel-label text-[7px] ${tone}`}>
                  {String(d.day).padStart(2, '0')}
                </span>
              );
            })}
        </div>
      ))}
    </div>
  );
}

function ResetModal({
  student,
  course,
  name,
  onClose,
  onDone,
}: {
  student: AdminStudentDto;
  course: AdminCourseProgressDto;
  name: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { data: preview, error: previewError } = useApiResource<CourseResetPreviewDto>(
    () => adminApi.previewCourseReset(student.id, course.courseId),
    [student.id, course.courseId],
  );
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === student.email.toLowerCase();

  async function confirm() {
    setBusy(true);
    setFailure(null);
    try {
      await adminApi.resetCourse(student.id, course.courseId, typed);
      onDone();
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : 'Não deu pra resetar. Nada foi apagado; tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PixelModal label="Resetar progresso" title="RESETAR PROGRESSO" onClose={busy ? undefined : onClose} widthClass="max-w-lg">
      <div className="flex flex-col gap-4 p-5">
        <p className="text-[14px] text-primary">
          Zerar o progresso de <span className="text-accent">{name}</span> em <span className="text-accent">{course.courseName}</span>? O aluno
          recomeça do Dia 1. Não tem como desfazer.
        </p>
        {previewError && <p className="text-[13px] text-alert">Não deu pra calcular a prévia.</p>}
        {!preview && !previewError && <SkeletonRows rows={3} />}
        {preview && (
          <ul className="flex flex-col gap-1 border-2 border-stroke p-3 text-[13px] text-secondary">
            {preview.willDelete.map((c) => (
              <li key={c.table}>
                <span className="font-pixel-label text-[9px] text-primary">{c.count}</span> {TABLE_NAMES[c.table] ?? c.table}
              </li>
            ))}
          </ul>
        )}
        <Field label="Pra confirmar, digite o e-mail do aluno" help={student.email}>
          <input className={inputClass()} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
        </Field>
        {failure && <p className="border-2 border-alert px-3 py-2 text-[13px] text-alert">{failure}</p>}
        <div className="flex justify-end gap-2">
          <PixelButton onClick={onClose} disabled={busy}>
            Cancelar
          </PixelButton>
          <PixelButton tone="dangerSolid" onClick={confirm} disabled={!matches || busy || !preview}>
            {busy ? 'Resetando…' : 'Resetar progresso'}
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}

function sortStudents(list: AdminStudentDto[], key: SortKey, dir: 'asc' | 'desc') {
  const value = (s: AdminStudentDto): string | number => {
    switch (key) {
      case 'aluno':
        return s.email;
      case 'turma':
        return s.cohortName ?? '';
      case 'cursos':
        return s.courses.map((c) => c.courseName).join(' ');
      case 'dia':
        return s.currentDay ?? 0;
      case 'acesso':
        return s.lastActivityAt ?? '';
      case 'sequencia':
        return s.currentStreak;
      case 'email':
        return s.emailVerified ? 1 : 0;
    }
  };
  const sign = dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    return (va < vb ? -1 : va > vb ? 1 : 0) * sign;
  });
}
