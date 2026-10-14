import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import type { AdminCourseCatalogDto } from '../../api/adminTypes';
import { ApiError } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { dateBr } from '../../lib/adminFormat';
import { inputClass } from '../../lib/adminStyles';
import { PixelModal } from '../PixelModal';
import { AdminPanel, Chip, Drawer, DrawerHeader, EmptyPanel, Field, PanelError, PixelButton, ResultBanner, SkeletonRows, Toggle } from './AdminUi';
import { AdminShell } from './AdminShell';

// Fase 97, Figma "Painel de gestão, Fase 97" (C01-C05, N02): aba Cursos. Criar curso vazio, editar o texto do catálogo,
// publicar, arquivar e voltar ao curso.json. Semanas e dias continuam vindo do importar (aba Curadoria).

// Espelham os limites do AdminCoursesUseCase (a Api confere de novo).
const MAX_NAME = 100;
const MAX_DESCRIPTION = 1000;
const MAX_PREPARES = 500;
const MAX_LIST_ITEMS = 12;
const MAX_ITEM_LENGTH = 200;

type StatusFilter = 'todos' | 'Active' | 'Draft';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'Active', label: 'Publicados' },
  { key: 'Draft', label: 'Rascunhos' },
];

type CourseAction = 'publicar' | 'arquivar' | 'voltar';

function statusChip(status: AdminCourseCatalogDto['status']) {
  if (status === 'Active') return <Chip tone="accent">PUBLICADO</Chip>;
  if (status === 'Archived') return <Chip tone="alert">ARQUIVADO</Chip>;
  return <Chip tone="muted">RASCUNHO</Chip>;
}

function errorText(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function CoursesTab() {
  const { data, error, loading, retry } = useApiResource(() => adminApi.getAdminCourses(), []);
  const [filter, setFilter] = useState<StatusFilter>('todos');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{ course: AdminCourseCatalogDto | null } | null>(null);
  const [action, setAction] = useState<{ kind: CourseAction; course: AdminCourseCatalogDto } | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const rows = useMemo(() => (data ?? []).filter((c) => filter === 'todos' || c.status === filter), [data, filter]);
  const selected = (data ?? []).find((c) => c.id === selectedId) ?? null;

  function done(text: string) {
    setBanner({ tone: 'success', text });
    setForm(null);
    setAction(null);
    retry();
  }

  return (
    <AdminShell
      section="Cursos"
      subtitle="O texto de cada curso no catálogo e se ele está publicado. Semanas e dias vêm da Curadoria."
      context={data ? `${data.length} cursos · só admin` : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 lg:shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-pixel-label text-[7px] text-secondary">STATUS</span>
          {STATUS_FILTERS.map((f) => (
            <PixelButton key={f.key} tone={filter === f.key ? 'selected' : 'outline'} onClick={() => setFilter(f.key)}>
              {f.label} · {(data ?? []).filter((c) => f.key === 'todos' || c.status === f.key).length}
            </PixelButton>
          ))}
        </div>
        <PixelButton tone="primary" onClick={() => setForm({ course: null })} disabled={!data}>
          + Novo curso
        </PixelButton>
      </div>

      {banner && (
        <ResultBanner tone={banner.tone} onClose={() => setBanner(null)}>
          {banner.text}
        </ResultBanner>
      )}
      {loading && !data && <SkeletonRows rows={6} />}
      {error && <PanelError message="Não deu pra carregar os cursos." code="ADMIN_COURSES_FAILED" onRetry={retry} />}
      {data && data.length === 0 && <EmptyPanel title="Nenhum curso ainda">Crie o primeiro com "+ Novo curso". Ele nasce vazio, até você importar os dias na Curadoria.</EmptyPanel>}
      {data && data.length > 0 && (
        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_436px]">
          <AdminPanel label="Cursos" context={`${rows.length} de ${data.length}`} className="lg:overflow-hidden">
            {rows.length === 0 && <EmptyPanel title="Nenhum curso nesse filtro">Troque o filtro de status pra ver os outros.</EmptyPanel>}
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-base">
                  <tr className="border-b-2 border-stroke">
                    {['Curso', 'Status', 'Quem vê', 'Dias', 'Pasta', 'Texto do catálogo'].map((h) => (
                      <th key={h} className="px-3 py-2 font-pixel-label text-[7px] font-normal text-secondary">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const active = c.id === selectedId;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedId(active ? null : c.id)}
                        className={`cursor-pointer border-b border-stroke text-[13px] ${active ? 'outline-2 -outline-offset-2 outline-accent' : 'hover:bg-surface'}`}
                      >
                        <td className={`px-3 py-3 ${active ? 'text-accent' : 'text-primary'}`}>
                          {active && '▶ '}
                          {c.name}
                        </td>
                        <td className="px-3 py-3">{statusChip(c.status)}</td>
                        <td className="px-3 py-3">{c.onlyForCohorts ? <Chip tone="amber">SÓ PRA TURMAS</Chip> : <span className="text-[12px] text-secondary">todos</span>}</td>
                        <td className={`px-3 py-3 font-pixel-label text-[9px] ${c.importedDays === 0 ? 'text-alert' : 'text-primary'}`}>{c.importedDays}</td>
                        <td className="px-3 py-3">
                          <Chip tone={c.hasContentFolder ? 'accent' : 'muted'}>{c.hasContentFolder ? 'SIM' : 'NÃO'}</Chip>
                        </td>
                        <td className="px-3 py-3">
                          {c.catalogEditedAt ? <Chip tone="amber">EDITADO NO PAINEL</Chip> : <span className="text-[12px] text-secondary">curso.json</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] text-secondary">"Dias" conta os dias já importados. Curso sem dia importado não pode ser publicado.</p>
          </AdminPanel>

          {selected ? (
            <CourseDetail
              course={selected}
              onClose={() => setSelectedId(null)}
              onEdit={() => setForm({ course: selected })}
              onAction={(kind) => setAction({ kind, course: selected })}
            />
          ) : (
            <EmptyPanel title="Nenhum curso selecionado">Clique numa linha da tabela pra editar o catálogo, publicar ou arquivar.</EmptyPanel>
          )}
        </div>
      )}

      {form && (
        <CourseFormDrawer
          course={form.course}
          onClose={() => setForm(null)}
          onSaved={(saved) => {
            setSelectedId(saved.id);
            done(form.course ? `Catálogo de ${saved.name} salvo.` : `Curso ${saved.name} criado como rascunho. Importe os dias na Curadoria pra publicar.`);
          }}
        />
      )}
      {action && (
        <CourseActionModal
          kind={action.kind}
          course={action.course}
          onClose={() => setAction(null)}
          onDone={(text) => done(text)}
        />
      )}
    </AdminShell>
  );
}

function CourseDetail({
  course,
  onClose,
  onEdit,
  onAction,
}: {
  course: AdminCourseCatalogDto;
  onClose: () => void;
  onEdit: () => void;
  onAction: (kind: CourseAction) => void;
}) {
  const canPublish = course.status === 'Draft' && course.importedDays > 0;
  const publishBlocked =
    course.status === 'Archived' ? 'Curso arquivado no banco não pode ser publicado pelo Painel.' : course.importedDays === 0 ? 'Importe ao menos um dia na Curadoria antes.' : null;
  return (
    <AdminPanel
      accent
      label="Detalhe do curso"
      action={
        <button type="button" onClick={onClose} aria-label="Fechar detalhe" className="flex size-9 items-center justify-center border-2 border-stroke text-secondary hover:text-primary">
          ✕
        </button>
      }
      className="lg:overflow-hidden"
    >
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-pixel-label text-[12px] text-primary">{course.name}</p>
          {statusChip(course.status)}
          {course.onlyForCohorts && <Chip tone="amber">SÓ PRA TURMAS</Chip>}
        </div>
        {course.importedDays === 0 && (
          <p className="border-2 border-project px-3 py-2 text-[12px] text-project">
            {course.hasContentFolder ? 'Nenhum dia importado ainda.' : 'Sem pasta de conteúdo e sem dia importado.'}{' '}
            <Link to="/gestao/curadoria" className="text-accent hover:underline">
              Ir pra Curadoria ›
            </Link>
          </p>
        )}

        <DetailBlock label="Catálogo">
          <p className="text-[13px] text-secondary">{course.description ?? 'Sem descrição.'}</p>
          <ListLine label="Antes de começar" items={course.requirements} empty="Começa do zero." />
          <ListLine label="Recomendado antes" items={course.recommendedBefore} empty="Nenhum." />
          {course.preparesText && <p className="text-[12px] text-secondary">Prepara: {course.preparesText}</p>}
          <PixelButton size="sm" onClick={onEdit}>
            Editar catálogo
          </PixelButton>
        </DetailBlock>

        <DetailBlock label="Status">
          <p className="text-[12px] text-secondary">
            Arquivar tira o curso do catálogo de quem ainda não entrou. Quem já está matriculado continua com acesso, e nada é apagado.
          </p>
          {publishBlocked && course.status !== 'Active' && <p className="text-[12px] text-project">{publishBlocked}</p>}
          {course.status === 'Active' ? (
            <PixelButton size="sm" tone="danger" onClick={() => onAction('arquivar')}>
              Arquivar
            </PixelButton>
          ) : (
            <PixelButton size="sm" tone="primary" onClick={() => onAction('publicar')} disabled={!canPublish}>
              Publicar
            </PixelButton>
          )}
        </DetailBlock>

        <DetailBlock label="Origem do texto">
          <p className="text-[12px] text-secondary">
            {course.catalogEditedAt
              ? `Editado no Painel em ${dateBr(course.catalogEditedAt)}. O curso.json não reescreve mais esse texto.`
              : 'Vale o curso.json: ele reaplica o texto a cada deploy.'}
          </p>
          {course.catalogEditedAt && (
            <PixelButton size="sm" onClick={() => onAction('voltar')} disabled={!course.hasContentFolder}>
              Voltar ao curso.json
            </PixelButton>
          )}
          {course.catalogEditedAt && !course.hasContentFolder && (
            <p className="text-[12px] text-project">Sem pasta de conteúdo com o nome do curso, não há curso.json pra voltar.</p>
          )}
        </DetailBlock>
      </div>
    </AdminPanel>
  );
}

function DetailBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 border-2 border-stroke p-3">
      <p className="font-pixel-label text-[8px] text-secondary">// {label}</p>
      {children}
    </div>
  );
}

function ListLine({ label, items, empty }: { label: string; items: string[]; empty: string }) {
  return (
    <p className="text-[12px] text-secondary">
      <span className="text-muted">{label}:</span> {items.length > 0 ? items.join(' · ') : empty}
    </p>
  );
}

/** Lista de textos curtos com "x" e "+" (requisitos e recomendados antes). */
function StringListField({
  label,
  help,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  help: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const tooMany = items.length > MAX_LIST_ITEMS;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-pixel-label text-[8px] text-secondary">{label}</span>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={inputClass(item.length > MAX_ITEM_LENGTH)}
            value={item}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button
            type="button"
            aria-label={`Remover ${label} ${i + 1}`}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="flex size-10 shrink-0 items-center justify-center border-2 border-stroke text-secondary hover:text-primary"
          >
            ✕
          </button>
        </div>
      ))}
      <div>
        <PixelButton size="sm" onClick={() => onChange([...items, ''])} disabled={items.length >= MAX_LIST_ITEMS}>
          + Adicionar
        </PixelButton>
      </div>
      <span className={`text-[12px] ${tooMany ? 'text-alert' : 'text-muted'}`}>{help}</span>
    </div>
  );
}

/** C02 e C03: gaveta de 720px. O nome só se escolhe na criação (a pasta de conteúdo se liga ao curso por ele). */
function CourseFormDrawer({
  course,
  onClose,
  onSaved,
}: {
  course: AdminCourseCatalogDto | null;
  onClose: () => void;
  onSaved: (saved: AdminCourseCatalogDto) => void;
}) {
  const [name, setName] = useState(course?.name ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [requirements, setRequirements] = useState<string[]>(course?.requirements ?? []);
  const [recommended, setRecommended] = useState<string[]>(course?.recommendedBefore ?? []);
  const [prepares, setPrepares] = useState(course?.preparesText ?? '');
  const [onlyForCohorts, setOnlyForCohorts] = useState(course?.onlyForCohorts ?? false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const nameError = !course && name.trim().length === 0 ? 'Dê um nome ao curso.' : !course && name.trim().length > MAX_NAME ? `Até ${MAX_NAME} caracteres.` : null;
  const descriptionError = description.length > MAX_DESCRIPTION ? `Até ${MAX_DESCRIPTION} caracteres.` : null;
  const preparesError = prepares.length > MAX_PREPARES ? `Até ${MAX_PREPARES} caracteres.` : null;
  const listsError =
    requirements.length > MAX_LIST_ITEMS || recommended.length > MAX_LIST_ITEMS || [...requirements, ...recommended].some((i) => i.length > MAX_ITEM_LENGTH)
      ? `No máximo ${MAX_LIST_ITEMS} itens de ${MAX_ITEM_LENGTH} caracteres em cada lista.`
      : null;
  const invalid = nameError || descriptionError || preparesError || listsError;

  async function save() {
    setTouched(true);
    if (invalid) return;
    setBusy(true);
    setFailure(null);
    const body = {
      description: description.trim() || null,
      requirements: requirements.map((r) => r.trim()).filter(Boolean),
      recommendedBefore: recommended.map((r) => r.trim()).filter(Boolean),
      preparesText: prepares.trim() || null,
      onlyForCohorts,
    };
    try {
      onSaved(course ? await adminApi.updateAdminCourse(course.id, { name: course.name, ...body }) : await adminApi.createAdminCourse({ name: name.trim(), ...body }));
    } catch (err) {
      setFailure(errorText(err, 'Não deu pra salvar. Nada mudou; tente de novo.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer label={course ? 'Editar curso' : 'Novo curso'} wide busy={busy} onClose={onClose}>
      <DrawerHeader label={course ? 'EDITAR CURSO' : 'NOVO CURSO'} busy={busy} onClose={onClose} />
      {course ? (
        <p className="border-2 border-project px-3 py-2 text-[12px] text-project">
          Ao salvar, este texto passa a ser do Painel: o curso.json não o reescreve mais. Dá pra voltar ao curso.json depois.
        </p>
      ) : (
        <p className="border-2 border-project px-3 py-2 text-[12px] text-project">
          O curso nasce vazio e como rascunho. Ele só ganha dias quando existir uma pasta com o nome dele em conteúdo/ e você importar na Curadoria.
        </p>
      )}
      <Field
        label="Nome"
        error={touched ? nameError : null}
        help={course ? 'O nome não muda: a pasta de conteúdo se liga ao curso por ele.' : 'Não dá pra mudar depois, porque a pasta de conteúdo se liga ao curso por ele.'}
      >
        <input className={inputClass(touched && nameError !== null)} value={name} onChange={(e) => setName(e.target.value)} readOnly={course !== null} disabled={course !== null} />
      </Field>
      <Field label="Descrição" error={touched ? descriptionError : null} help={`${description.length}/${MAX_DESCRIPTION} · aparece no card de escolha do curso`}>
        <textarea
          className={`${inputClass(touched && descriptionError !== null)} h-24 resize-none py-2`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <StringListField
        label="Antes de começar"
        help={`O que ajuda saber antes (até ${MAX_LIST_ITEMS} itens). Vazio = começa do zero.`}
        items={requirements}
        onChange={setRequirements}
        placeholder="Ex.: saber usar o terminal"
      />
      <StringListField
        label="Recomendado antes"
        help="Nomes de cursos que a Focadu recomenda fazer antes. É só recomendação: nada trava."
        items={recommended}
        onChange={setRecommended}
        placeholder="Nome de outro curso"
      />
      <Field label="Prepara" error={touched ? preparesError : null} help={`${prepares.length}/${MAX_PREPARES} · como este curso prepara pros que o recomendam (opcional)`}>
        <input className={inputClass(touched && preparesError !== null)} value={prepares} onChange={(e) => setPrepares(e.target.value)} />
      </Field>
      <Toggle label="Só pra turmas" checked={onlyForCohorts} onChange={setOnlyForCohorts} />
      {touched && listsError && <p className="text-[12px] text-alert">{listsError}</p>}
      {failure && <p className="border-2 border-alert px-3 py-2 text-[13px] text-alert">{failure}</p>}
      <div className="sticky bottom-0 -mx-6 -mb-6 mt-auto flex justify-end gap-2 border-t-2 border-stroke bg-base px-6 py-4">
        <PixelButton onClick={onClose} disabled={busy}>
          Cancelar
        </PixelButton>
        <PixelButton tone="primary" onClick={save} disabled={busy}>
          {busy ? 'Salvando…' : course ? 'Salvar' : 'Criar curso'}
        </PixelButton>
      </div>
    </Drawer>
  );
}

/** C04: publicar, arquivar e voltar ao curso.json agem na hora, então ficam em modal curto e não dentro da gaveta. */
function CourseActionModal({
  kind,
  course,
  onClose,
  onDone,
}: {
  kind: CourseAction;
  course: AdminCourseCatalogDto;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const copy = {
    publicar: {
      title: 'PUBLICAR CURSO',
      confirm: 'Publicar',
      body: `${course.name} passa a aparecer no catálogo pra todos (menos se estiver marcado "só pra turmas"). Tem ${course.importedDays} ${course.importedDays === 1 ? 'dia importado' : 'dias importados'}.`,
    },
    arquivar: {
      title: 'ARQUIVAR CURSO',
      confirm: 'Arquivar',
      body: `${course.name} sai do catálogo de quem ainda não entrou. Quem já está matriculado continua com acesso, e nada é apagado. Dá pra publicar de novo.`,
    },
    voltar: {
      title: 'VOLTAR AO CURSO.JSON',
      confirm: 'Voltar ao curso.json',
      body: `O texto do catálogo de ${course.name} volta a ser o do curso.json (descrição, antes de começar, recomendados e "prepara"). O que foi editado no Painel se perde.`,
    },
  }[kind];

  async function confirm() {
    setBusy(true);
    setFailure(null);
    try {
      if (kind === 'publicar') await adminApi.publishAdminCourse(course.id);
      else if (kind === 'arquivar') await adminApi.unpublishAdminCourse(course.id);
      else await adminApi.revertAdminCourseCatalog(course.id);
      onDone(
        kind === 'publicar'
          ? `${course.name} publicado.`
          : kind === 'arquivar'
            ? `${course.name} arquivado. Quem já estava matriculado continua com acesso.`
            : `${course.name} voltou ao texto do curso.json.`,
      );
    } catch (err) {
      setFailure(errorText(err, 'Não deu pra concluir. Nada mudou; tente de novo.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PixelModal label={copy.title} title={copy.title} onClose={busy ? undefined : onClose} widthClass="max-w-lg">
      <div className="flex flex-col gap-4 p-5">
        <p className="text-[14px] text-primary">{copy.body}</p>
        {failure && <p className="border-2 border-alert px-3 py-2 text-[13px] text-alert">{failure}</p>}
        <div className="flex justify-end gap-2">
          <PixelButton onClick={onClose} disabled={busy}>
            Cancelar
          </PixelButton>
          <PixelButton tone={kind === 'arquivar' ? 'dangerSolid' : 'primary'} onClick={confirm} disabled={busy}>
            {busy ? 'Aguarde…' : copy.confirm}
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}
