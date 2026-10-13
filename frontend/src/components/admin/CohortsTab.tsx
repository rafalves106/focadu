import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import type { AdminCohortCourseOptionDto, AdminCohortDetailDto, AdminCohortDto, AdminCohortsDto, CohortStatus } from '../../api/adminTypes';
import { ApiError } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { dateBr, fullLink, handleOf, when } from '../../lib/adminFormat';
import { inputClass } from '../../lib/adminStyles';
import { PixelModal } from '../PixelModal';
import { AdminPanel, CheckOption, Chip, EmptyPanel, Field, PanelError, PixelButton, ResultBanner, SkeletonRows } from './AdminUi';
import { AdminShell } from './AdminShell';
import { CreateInviteDrawer } from './InvitesTab';

// Fase 96, Figma "Turmas — v1 (proposta)", TU 01-08: lista de turmas, gaveta de criar/editar, detalhe (cursos, convites e
// alunos) e arquivar. `?turma=<id>` abre o detalhe (link "Ver turma" da aba Alunos).

const FILTERS: { key: CohortStatus | 'todas'; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'ativa', label: 'Ativas' },
  { key: 'arquivada', label: 'Arquivadas' },
];

/** Os limites do convite vem da aba Convites; a gaveta aberta daqui usa os mesmos (a Api confere de novo). */
const INVITE_LIMITS = { maxUsesLimit: 20, maxValidDays: 30, defaultValidDays: 7 };

export function CohortsTab() {
  const { data, error, loading, retry } = useApiResource(() => adminApi.getCohorts(), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<CohortStatus | 'todas'>('todas');
  const [creating, setCreating] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const openId = searchParams.get('turma');

  const cohorts = data?.cohorts ?? [];
  const shown = filter === 'todas' ? cohorts : cohorts.filter((c) => c.status === filter);
  const count = (key: CohortStatus | 'todas') => (key === 'todas' ? cohorts.length : cohorts.filter((c) => c.status === key).length);
  const open = (id: string | null) => setSearchParams(id ? { turma: id } : {}, { replace: true });

  return (
    <AdminShell
      section="Turmas"
      subtitle="Uma turma junta um grupo de alunos e os cursos deles. Quem entra por convite de turma é matriculado nos cursos dela e só vê esses cursos."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 lg:shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-pixel-label text-[7px] text-secondary">STATUS</span>
          {FILTERS.map((f) => (
            <PixelButton key={f.key} tone={filter === f.key ? 'selected' : 'outline'} onClick={() => setFilter(f.key)}>
              {f.label} · {count(f.key)}
            </PixelButton>
          ))}
        </div>
        <PixelButton tone="primary" onClick={() => setCreating(true)} disabled={!data}>
          + Nova turma
        </PixelButton>
      </div>

      {banner && (
        <ResultBanner tone={banner.tone} onClose={() => setBanner(null)}>
          {banner.text}
        </ResultBanner>
      )}
      {loading && !data && <SkeletonRows rows={4} />}
      {error && <PanelError message="Não deu pra carregar as turmas." code="ADMIN_COHORTS_FAILED" onRetry={retry} />}
      {data && cohorts.length === 0 && (
        <EmptyPanel title="Nenhuma turma ainda">
          Crie uma turma, marque os cursos dela e faça um convite da turma. Quem entrar por ele só vê esses cursos.
        </EmptyPanel>
      )}
      {data && cohorts.length > 0 && (
        <AdminPanel
          label="Turmas"
          context={`${cohorts.length} ${cohorts.length === 1 ? 'turma' : 'turmas'} · ${data.studentsInCohorts} alunos entraram por convite de turma · ativas primeiro, arquivadas no fim`}
          className="lg:flex-1 lg:overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-base">
                <tr className="border-b-2 border-stroke font-pixel-label text-[7px] text-secondary">
                  <th className="px-3 py-2 font-normal">TURMA</th>
                  <th className="px-3 py-2 font-normal">CURSOS</th>
                  <th className="px-3 py-2 font-normal">ALUNOS</th>
                  <th className="px-3 py-2 font-normal">CONVITES ATIVOS</th>
                  <th className="px-3 py-2 font-normal">CRIADA EM</th>
                  <th className="px-3 py-2 text-right font-normal">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((cohort) => {
                  const archived = cohort.status === 'arquivada';
                  const active = cohort.id === openId;
                  return (
                    <tr
                      key={cohort.id}
                      onClick={() => open(cohort.id)}
                      className={`cursor-pointer border-b border-stroke text-[13px] ${active ? 'outline-2 -outline-offset-2 outline-accent' : 'hover:bg-surface'} ${archived ? 'text-muted' : 'text-primary'}`}
                    >
                      <td className={`px-3 py-3 ${active ? 'text-accent' : ''}`}>
                        {active && '▶ '}
                        {cohort.name}
                      </td>
                      <td className="px-3 py-3">
                        <div className={`flex flex-wrap gap-1 ${archived ? 'opacity-50' : ''}`}>
                          {cohort.courses.map((c) => (
                            <Chip key={c.id} tone="muted">
                              {c.name}
                            </Chip>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-pixel-label text-[9px]">{cohort.students}</td>
                      <td className="px-3 py-3 font-pixel-label text-[9px]">{cohort.activeInvites}</td>
                      <td className="px-3 py-3 text-secondary">{dateBr(cohort.createdAt)}</td>
                      <td className="px-3 py-3 text-right">
                        <Chip tone={archived ? 'muted' : 'accent'}>{cohort.status.toUpperCase()}</Chip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-secondary">
            Clique numa turma pra ver cursos, alunos e convites dela. Turma arquivada fica na lista pra histórico. Aluno sem turma vê todos os
            cursos públicos.
          </p>
        </AdminPanel>
      )}

      {creating && data && (
        <CohortFormDrawer
          courses={data.courses}
          onClose={() => setCreating(false)}
          onSaved={(saved) => {
            setCreating(false);
            setBanner({ tone: 'success', text: `Turma ${saved.cohort.name} criada. Agora faça um convite desta turma.` });
            retry();
            open(saved.cohort.id);
          }}
        />
      )}

      {openId && data && (
        <CohortDetailDrawer
          key={openId}
          cohortId={openId}
          options={data}
          onClose={() => open(null)}
          onChanged={(text) => {
            if (text) setBanner({ tone: 'success', text });
            retry();
          }}
        />
      )}
    </AdminShell>
  );
}

/** Gaveta lateral comum (mesmo jeito da "Criar convite"). */
function Drawer({ label, wide = false, busy = false, onClose, children }: { label: string; wide?: boolean; busy?: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-base/70 backdrop-blur-sm" role="presentation" onClick={busy ? undefined : onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={`flex h-full w-full flex-col gap-5 overflow-y-auto border-l-2 border-accent bg-base p-6 ${wide ? 'max-w-[720px]' : 'max-w-[520px]'}`}
      >
        {children}
      </aside>
    </div>
  );
}

function DrawerHeader({ label, busy = false, onClose }: { label: string; busy?: boolean; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-pixel-label text-[10px] text-accent">// {label}</h2>
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        aria-label="Fechar"
        className="flex size-9 items-center justify-center border-2 border-stroke text-secondary hover:text-primary"
      >
        ✕
      </button>
    </div>
  );
}

function visibilityText(course: AdminCohortCourseOptionDto, editingName?: string) {
  const others = course.cohorts.filter((name) => name !== editingName);
  const who = course.onlyForCohorts ? 'Só pra turmas' : 'Visível pra todos';
  return others.length > 0 ? `${who} · também na turma ${others.join(', ')}` : who;
}

/** TU 03, 04 e 06: criar ou editar (nome e cursos). Curso que sai da turma ganha o aviso de que ninguem perde a matricula. */
function CohortFormDrawer({
  courses,
  cohort,
  onClose,
  onSaved,
}: {
  courses: AdminCohortCourseOptionDto[];
  cohort?: AdminCohortDto;
  onClose: () => void;
  onSaved: (saved: AdminCohortDetailDto) => void;
}) {
  const [name, setName] = useState(cohort?.name ?? '');
  const [selected, setSelected] = useState<string[]>(cohort?.courses.map((c) => c.id) ?? []);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const nameError = touched && !name.trim() ? 'Dê um nome pra turma.' : null;
  const coursesError = touched && selected.length === 0 ? 'Marque ao menos um curso.' : null;
  const removed = cohort ? cohort.courses.filter((c) => !selected.includes(c.id)) : [];
  const added = cohort ? selected.filter((id) => !cohort.courses.some((c) => c.id === id)) : [];

  function toggle(id: string) {
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  async function save() {
    setTouched(true);
    if (!name.trim() || selected.length === 0) return;
    setBusy(true);
    setFailure(null);
    try {
      onSaved(cohort ? await adminApi.updateCohort(cohort.id, name.trim(), selected) : await adminApi.createCohort(name.trim(), selected));
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : 'Não deu pra salvar a turma. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer label={cohort ? 'Editar turma' : 'Nova turma'} busy={busy} onClose={onClose}>
      <DrawerHeader label={cohort ? 'EDITAR TURMA' : 'NOVA TURMA'} busy={busy} onClose={onClose} />
      <div className="flex flex-col gap-2">
        <h3 className="text-[20px] text-primary">{cohort ? 'Editar turma' : 'Criar turma'}</h3>
        <p className="text-[13px] text-secondary">
          {cohort
            ? `Muda o nome e os cursos da turma ${cohort.name}. Os convites desta turma continuam valendo e passam a usar os cursos novos.`
            : 'Depois de criar, faça um convite desta turma. Quem se cadastrar com ele entra na turma, é matriculado nos cursos marcados e só vê esses cursos.'}
        </p>
      </div>
      <Field label="NOME DA TURMA" help="Ex.: faculdade, matéria e semestre. O aluno vê esse nome na tela inicial." error={nameError}>
        <input
          className={inputClass(Boolean(nameError))}
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder="UNA BD 2026/2"
        />
      </Field>
      <div className="flex flex-col gap-2">
        <span className="font-pixel-label text-[8px] text-secondary">CURSOS DA TURMA · MARQUE UM OU MAIS</span>
        <div className="flex flex-col gap-2" role="group" aria-label="Cursos da turma">
          {courses.map((course) => (
            <CheckOption
              key={course.id}
              kind="checkbox"
              checked={selected.includes(course.id)}
              title={course.name}
              detail={visibilityText(course, cohort?.name)}
              onChange={() => toggle(course.id)}
            />
          ))}
        </div>
        <span className={`text-[12px] ${coursesError ? 'text-alert' : 'text-muted'}`}>
          {coursesError ??
            `${selected.length} ${selected.length === 1 ? 'marcado' : 'marcados'}. ${
              cohort ? 'Curso que entra: os alunos da turma são matriculados nele na hora.' : '"Só pra turmas" e "Visível pra todos" se mudam na aba Curadoria.'
            }`}
        </span>
      </div>
      {cohort && removed.length > 0 && (
        <div className="flex flex-col gap-1 border-2 border-project px-4 py-3">
          <span className="font-pixel-label text-[7px] text-project">■ ATENÇÃO</span>
          <p className="text-[13px] text-primary">
            {removed.map((c) => c.name).join(', ')} {removed.length === 1 ? 'sai' : 'saem'} da turma. {cohort.students === 1 ? 'O aluno continua' : `Os ${cohort.students} alunos continuam`}{' '}
            matriculados e com o progresso; só quem entrar depois não recebe {removed.length === 1 ? 'o curso' : 'esses cursos'}.
          </p>
        </div>
      )}
      {cohort && added.length > 0 && cohort.students > 0 && (
        <p className="text-[12px] text-secondary">
          Ao salvar, {cohort.students === 1 ? 'o aluno da turma é matriculado' : `os ${cohort.students} alunos da turma são matriculados`} em{' '}
          {added.length === 1 ? 'mais 1 curso' : `mais ${added.length} cursos`}.
        </p>
      )}
      {failure && <p className="border-2 border-alert px-3 py-2 text-[13px] text-alert">{failure}</p>}
      <div className="mt-auto flex gap-2">
        <PixelButton tone="primary" onClick={save} disabled={busy}>
          {busy ? 'Salvando…' : cohort ? 'Salvar' : 'Criar turma'}
        </PixelButton>
        <PixelButton onClick={onClose} disabled={busy}>
          Cancelar
        </PixelButton>
      </div>
    </Drawer>
  );
}

/** TU 05, 07 e 08: detalhe da turma (cursos, convites, alunos), editar, arquivar e "+ Novo convite desta turma". */
function CohortDetailDrawer({
  cohortId,
  options,
  onClose,
  onChanged,
}: {
  cohortId: string;
  options: AdminCohortsDto;
  onClose: () => void;
  onChanged: (banner: string | null) => void;
}) {
  const detail = useApiResource(() => adminApi.getCohort(cohortId), [cohortId]);
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (editing && detail.data) {
    return (
      <CohortFormDrawer
        courses={options.courses}
        cohort={detail.data.cohort}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setEditing(false);
          detail.retry();
          onChanged(`Turma ${saved.cohort.name} salva.`);
        }}
      />
    );
  }

  const data = detail.data;
  const cohort = data?.cohort;
  const archived = cohort?.status === 'arquivada';
  const activeInvites = data?.invites.filter((i) => i.status === 'ativo') ?? [];
  const onlyForCohorts = cohort
    ? cohort.courses.every((c) => options.courses.find((o) => o.id === c.id)?.onlyForCohorts)
    : false;

  async function copy(code: string, link: string) {
    await navigator.clipboard.writeText(link).catch(() => undefined);
    setCopied(code);
    window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
  }

  return (
    <>
      <Drawer label="Turma" wide onClose={onClose}>
        <DrawerHeader label="TURMA" onClose={onClose} />
        {detail.loading && !data && <SkeletonRows rows={6} />}
        {detail.error && <PanelError message="Não deu pra carregar a turma." code="ADMIN_COHORT_FAILED" onRetry={detail.retry} />}
        {data && cohort && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-[20px] text-primary">{cohort.name}</h3>
                  <Chip tone={archived ? 'muted' : 'accent'}>{cohort.status.toUpperCase()}</Chip>
                </div>
                <p className="text-[13px] text-secondary">
                  Criada em {dateBr(cohort.createdAt)}
                  {archived && ` · arquivada em ${dateBr(cohort.archivedAt)}`} · {cohort.students} {cohort.students === 1 ? 'aluno' : 'alunos'} ·{' '}
                  {cohort.activeInvites} {cohort.activeInvites === 1 ? 'convite ativo' : 'convites ativos'}
                </p>
              </div>
              {!archived && (
                <div className="flex gap-2">
                  <PixelButton size="sm" onClick={() => setEditing(true)}>
                    Editar
                  </PixelButton>
                  <PixelButton size="sm" tone="danger" onClick={() => setArchiving(true)}>
                    Arquivar
                  </PixelButton>
                </div>
              )}
            </div>
            {archived && (
              <p className="border-2 border-stroke px-4 py-3 text-[13px] text-secondary">
                Turma arquivada: os alunos continuam com as matrículas e só veem os cursos dela. Os convites pararam de funcionar e não dá pra
                editar.
              </p>
            )}

            <section className="flex flex-col gap-2">
              <p className="flex items-baseline gap-3">
                <span className="font-pixel-label text-[8px] text-accent">// CURSOS DA TURMA</span>
                <span className="text-[12px] text-secondary">
                  {cohort.courses.length} {cohort.courses.length === 1 ? 'curso' : 'cursos'}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {cohort.courses.map((c) => (
                  <Chip key={c.id} tone="muted">
                    {c.name}
                  </Chip>
                ))}
              </div>
              <p className="text-[12px] text-secondary">
                {onlyForCohorts
                  ? `${cohort.courses.length === 1 ? 'Ele está' : 'Todos estão'} "só pra turmas": fora das turmas, ninguém vê.`
                  : 'Algum curso está "visível pra todos": quem não é da turma também vê.'}{' '}
                Quem entra pelo convite é matriculado {cohort.courses.length === 1 ? 'nele' : 'em todos'}.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-baseline gap-3">
                  <span className="font-pixel-label text-[8px] text-accent">// CONVITES DESTA TURMA</span>
                  <span className="text-[12px] text-secondary">
                    {data.invites.length} {data.invites.length === 1 ? 'convite' : 'convites'}
                  </span>
                </p>
                {!archived && <PixelButton onClick={() => setInviting(true)}>+ Novo convite desta turma</PixelButton>}
              </div>
              {data.invites.length === 0 ? (
                <p className="text-[13px] text-secondary">Nenhum convite ainda. Sem convite, ninguém entra na turma.</p>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b-2 border-stroke font-pixel-label text-[7px] text-secondary">
                      <th className="px-3 py-2 font-normal">CÓDIGO</th>
                      <th className="px-3 py-2 font-normal">PRA QUEM</th>
                      <th className="px-3 py-2 font-normal">USOS</th>
                      <th className="px-3 py-2 font-normal">VALIDADE</th>
                      <th className="px-3 py-2 font-normal">STATUS</th>
                      <th className="px-3 py-2 text-right font-normal">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invites.map((invite) => (
                      <tr key={invite.code} className="border-b border-stroke text-[13px]">
                        <td className="px-3 py-3 font-pixel-label text-[10px] text-primary">{invite.code}</td>
                        <td className="px-3 py-3 text-primary">{invite.note}</td>
                        <td className="px-3 py-3 font-pixel-label text-[9px] text-primary">
                          {invite.usedCount} / {invite.maxUses}
                        </td>
                        <td className="px-3 py-3 text-secondary">{invite.expiresAt ? `até ${dateBr(invite.expiresAt)}` : 'não vence'}</td>
                        <td className="px-3 py-3">
                          <Chip tone={invite.status === 'ativo' ? 'accent' : invite.status === 'revogado' ? 'alert' : 'muted'}>{invite.status.toUpperCase()}</Chip>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {invite.status === 'ativo' && (
                            <PixelButton size="sm" onClick={() => copy(invite.code, fullLink(invite))}>
                              {copied === invite.code ? 'Copiado' : 'Copiar link'}
                            </PixelButton>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <p className="flex items-baseline gap-3">
                <span className="font-pixel-label text-[8px] text-accent">// ALUNOS DA TURMA</span>
                <span className="text-[12px] text-secondary">
                  {data.students.length} {data.students.length === 1 ? 'aluno' : 'alunos'} · último acesso primeiro
                </span>
              </p>
              {data.students.length === 0 ? (
                <p className="text-[13px] text-secondary">Ninguém entrou ainda. Mande o link do convite pra turma.</p>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b-2 border-stroke font-pixel-label text-[7px] text-secondary">
                      <th className="px-3 py-2 font-normal">ALUNO</th>
                      {cohort.courses.map((c) => (
                        <th key={c.id} className="px-3 py-2 font-normal">
                          {c.name.toUpperCase()}
                        </th>
                      ))}
                      <th className="px-3 py-2 font-normal">ÚLTIMO ACESSO</th>
                      <th className="px-3 py-2 font-normal" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((student) => (
                      <tr key={student.id} className="group border-b border-stroke text-[13px] hover:bg-surface">
                        <td className="px-3 py-3 text-primary">{handleOf(student.email)}</td>
                        {cohort.courses.map((c) => {
                          const progress = student.courses.find((p) => p.courseId === c.id);
                          return (
                            <td key={c.id} className="px-3 py-3 font-pixel-label text-[9px] text-primary">
                              {progress ? `D${progress.currentDay}` : '—'}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-secondary">{when(student.lastActivityAt)}</td>
                        <td className="px-3 py-3 text-right">
                          <Link to={`/gestao/alunos?aluno=${student.id}`} className="font-pixel-label text-[7px] text-accent hover:underline">
                            Ver em Alunos ›
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </Drawer>

      {inviting && cohort && (
        <CreateInviteDrawer
          limits={INVITE_LIMITS}
          cohorts={options.cohorts}
          initialCohortId={cohort.id}
          onClose={() => setInviting(false)}
          onCreated={() => {
            detail.retry();
            onChanged(null);
          }}
        />
      )}

      {archiving && cohort && (
        <ArchiveModal
          cohort={cohort}
          activeCodes={activeInvites.map((i) => i.code)}
          onClose={() => setArchiving(false)}
          onDone={() => {
            setArchiving(false);
            detail.retry();
            onChanged(`Turma ${cohort.name} arquivada. Os convites dela pararam de funcionar.`);
          }}
        />
      )}
    </>
  );
}

/** TU 07: confirmar arquivar (sem digitar nada: nada se perde, so os convites param). */
function ArchiveModal({ cohort, activeCodes, onClose, onDone }: { cohort: AdminCohortDto; activeCodes: string[]; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function archive() {
    setBusy(true);
    setFailure(null);
    try {
      await adminApi.archiveCohort(cohort.id);
      onDone();
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : 'Não deu pra arquivar. Tente de novo.');
      setBusy(false);
    }
  }

  const invitesText =
    activeCodes.length === 0
      ? 'A turma não tem convite ativo.'
      : activeCodes.length === 1
        ? `O convite ativo desta turma (${activeCodes[0]}) para de funcionar na hora, então ninguém novo entra.`
        : `Os ${activeCodes.length} convites ativos desta turma param de funcionar na hora, então ninguém novo entra.`;

  return (
    <PixelModal label="Arquivar turma" title="ARQUIVAR TURMA" onClose={busy ? undefined : onClose} widthClass="max-w-lg">
      <div className="flex flex-col gap-4 p-5">
        <h3 className="text-[18px] text-primary">Arquivar a turma {cohort.name}?</h3>
        <p className="text-[14px] text-secondary">
          {cohort.students === 1 ? 'O aluno continua' : `Os ${cohort.students} alunos continuam`} na Focadu com as matrículas e o progresso que têm.{' '}
          {invitesText} Dá pra ver a turma depois no filtro "Arquivadas".
        </p>
        {failure && <p className="text-[13px] text-alert">{failure}</p>}
        <div className="flex justify-end gap-2">
          <PixelButton onClick={onClose} disabled={busy}>
            Cancelar
          </PixelButton>
          <PixelButton tone="danger" onClick={archive} disabled={busy}>
            {busy ? 'Arquivando…' : 'Arquivar turma'}
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}
