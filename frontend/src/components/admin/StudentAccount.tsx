import { useState, type ReactNode } from 'react';
import { adminApi } from '../../api/admin';
import type { AdminStudentDto, AdminUpdateStudentResultDto } from '../../api/adminTypes';
import { ApiError } from '../../api/client';
import { dateBr } from '../../lib/adminFormat';
import { inputClass } from '../../lib/adminStyles';
import { PixelModal } from '../PixelModal';
import { Drawer, DrawerHeader, Field, PixelButton } from './AdminUi';

// Fase 97, Figma "Painel de gestão, Fase 97" (A01-A10): ações da conta do aluno na aba Alunos — editar nome e e-mail,
// enviar redefinição de senha (o admin nunca vê nem define a senha), tornar/tirar admin e desativar/reativar.

export type AccountAction = 'editar' | 'senha' | 'promover' | 'rebaixar' | 'desativar';

const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function errorText(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

/** Bloco "// CONTA" do detalhe: uma linha por ação; a que a Api recusaria fica desabilitada com o motivo (A08). */
export function AccountBlock({
  student,
  isSelf,
  onAction,
  onEnable,
}: {
  student: AdminStudentDto;
  isSelf: boolean;
  onAction: (kind: AccountAction) => void;
  onEnable: () => void;
}) {
  const disabled = student.disabledAt !== null;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-pixel-label text-[8px] text-secondary">// Conta</p>
      {disabled && (
        <p className="border-2 border-project px-3 py-2 text-[12px] text-project">
          Conta desativada em {dateBr(student.disabledAt as string)}. O aluno não entra e não aparece no ranking nem no squad. Matrículas e progresso ficam guardados.
        </p>
      )}
      <AccountRow label="Editar nome e e-mail" help="Trocar o e-mail pede nova confirmação do aluno.">
        <PixelButton size="sm" onClick={() => onAction('editar')}>
          Editar
        </PixelButton>
      </AccountRow>
      <AccountRow label="Redefinir senha" help="Manda um e-mail com o link. Você não vê nem define a senha." blocked={disabled ? 'Reative a conta primeiro.' : null}>
        <PixelButton size="sm" onClick={() => onAction('senha')} disabled={disabled}>
          Enviar redefinição
        </PixelButton>
      </AccountRow>
      {student.isAdmin ? (
        <AccountRow label="Papel: admin" help="Vê o Painel de gestão." blocked={isSelf ? 'Você não pode tirar o próprio papel de admin.' : null}>
          <PixelButton size="sm" onClick={() => onAction('rebaixar')} disabled={isSelf}>
            Tirar admin
          </PixelButton>
        </AccountRow>
      ) : (
        <AccountRow label="Papel: aluno" help="Admin vê o Painel de gestão." blocked={disabled ? 'Reative a conta antes de torná-la admin.' : null}>
          <PixelButton size="sm" onClick={() => onAction('promover')} disabled={disabled}>
            Tornar admin
          </PixelButton>
        </AccountRow>
      )}
      {disabled ? (
        <AccountRow label="Reativar conta" help="A conta volta a entrar na hora, sem pedir nada ao aluno.">
          <PixelButton size="sm" tone="primary" onClick={onEnable}>
            Reativar
          </PixelButton>
        </AccountRow>
      ) : (
        <AccountRow
          label="Desativar conta"
          help="Bloqueia o acesso na hora. Reversível; nada é apagado."
          blocked={isSelf ? 'Você não pode desativar a própria conta.' : student.isAdmin ? 'Tire o papel de admin antes de desativar.' : null}
        >
          <PixelButton size="sm" tone="danger" onClick={() => onAction('desativar')} disabled={isSelf || student.isAdmin}>
            Desativar
          </PixelButton>
        </AccountRow>
      )}
    </div>
  );
}

function AccountRow({ label, help, blocked = null, children }: { label: string; help: string; blocked?: string | null; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-2 border-stroke px-3 py-2">
      <div className="min-w-0">
        <p className="text-[13px] text-primary">{label}</p>
        <p className={`text-[12px] ${blocked ? 'text-project' : 'text-secondary'}`}>{blocked ?? help}</p>
      </div>
      {children}
    </div>
  );
}

/** A04-A06: gaveta de 520px. O aviso do e-mail vira âmbar quando o e-mail muda, e o botão pede a nova confirmação. */
export function EditStudentDrawer({
  student,
  onClose,
  onSaved,
}: {
  student: AdminStudentDto;
  onClose: () => void;
  onSaved: (result: AdminUpdateStudentResultDto) => void;
}) {
  const [name, setName] = useState(student.displayName);
  const [email, setEmail] = useState(student.email);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const trimmedEmail = email.trim().toLowerCase();
  const emailChanged = trimmedEmail !== student.email.toLowerCase();
  const nameError = name.trim().length === 0 ? 'Escreva o nome do aluno.' : null;
  const emailError = !EMAIL_FORMAT.test(trimmedEmail) ? 'Esse e-mail não parece válido.' : null;
  const changed = emailChanged || name.trim() !== student.displayName;

  async function save() {
    setTouched(true);
    if (nameError || emailError || !changed) return;
    setBusy(true);
    setFailure(null);
    try {
      onSaved(await adminApi.updateStudent(student.id, name.trim(), trimmedEmail));
    } catch (err) {
      setFailure(errorText(err, 'Não deu pra salvar. Nada mudou; tente de novo.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer label="Editar aluno" busy={busy} onClose={onClose}>
      <DrawerHeader label="EDITAR ALUNO" busy={busy} onClose={onClose} />
      <Field label="Nome" error={touched ? nameError : null}>
        <input className={inputClass(touched && nameError !== null)} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
      </Field>
      <Field label="E-mail" error={touched ? emailError : null} help={emailChanged ? `E-mail antigo: ${student.email}` : undefined}>
        <input className={inputClass(touched && emailError !== null)} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" spellCheck={false} />
      </Field>
      <p className={`border-2 px-3 py-2 text-[12px] ${emailChanged ? 'border-project text-project' : 'border-stroke text-secondary'}`}>
        {emailChanged
          ? 'Ao salvar, o aluno precisa confirmar o novo e-mail de novo. Até lá ele só alcança a tela de confirmação.'
          : 'Trocar o e-mail zera a confirmação: o aluno confirma o novo endereço. A senha não se edita aqui; use "Enviar redefinição".'}
      </p>
      {failure && <p className="border-2 border-alert px-3 py-2 text-[13px] text-alert">{failure}</p>}
      <div className="mt-auto flex justify-end gap-2">
        <PixelButton onClick={onClose} disabled={busy}>
          Cancelar
        </PixelButton>
        <PixelButton tone="primary" onClick={save} disabled={busy || !changed}>
          {busy ? 'Salvando…' : emailChanged ? 'Salvar e pedir confirmação' : 'Salvar'}
        </PixelButton>
      </div>
    </Drawer>
  );
}

/** Casca dos modais curtos desta aba: texto, falha e os dois botões. */
function ActionModal({
  label,
  title,
  busy,
  failure,
  onClose,
  confirm,
  children,
}: {
  label: string;
  title: string;
  busy: boolean;
  failure: string | null;
  onClose: () => void;
  confirm: ReactNode;
  children: ReactNode;
}) {
  return (
    <PixelModal label={label} title={title} onClose={busy ? undefined : onClose} widthClass="max-w-lg">
      <div className="flex flex-col gap-4 p-5">
        {children}
        {failure && <p className="border-2 border-alert px-3 py-2 text-[13px] text-alert">{failure}</p>}
        <div className="flex justify-end gap-2">
          <PixelButton onClick={onClose} disabled={busy}>
            Cancelar
          </PixelButton>
          {confirm}
        </div>
      </div>
    </PixelModal>
  );
}

/** A07: sem digitar confirmação, só mostra pra quem o e-mail vai. */
export function PasswordResetModal({ student, onClose, onDone }: { student: AdminStudentDto; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setFailure(null);
    try {
      await adminApi.sendPasswordReset(student.id);
      onDone();
    } catch (err) {
      setFailure(errorText(err, 'Não deu pra enviar o e-mail. Tente de novo.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionModal
      label="Enviar redefinição de senha"
      title="REDEFINIR SENHA"
      busy={busy}
      failure={failure}
      onClose={onClose}
      confirm={
        <PixelButton tone="primary" onClick={send} disabled={busy}>
          {busy ? 'Enviando…' : 'Enviar e-mail'}
        </PixelButton>
      }
    >
      <p className="text-[14px] text-primary">
        Mandar o e-mail de redefinição para <span className="text-accent">{student.email}</span>? O aluno escolhe a senha nova pelo link. Você não vê nem define
        a senha, e a atual continua valendo até ele trocar.
      </p>
    </ActionModal>
  );
}

/** A08: tornar ou tirar admin. A Api ainda confere as travas (si mesmo, último admin, conta desativada). */
export function RoleModal({
  student,
  makeAdmin,
  onClose,
  onDone,
}: {
  student: AdminStudentDto;
  makeAdmin: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setFailure(null);
    try {
      await adminApi.setStudentRole(student.id, makeAdmin);
      onDone();
    } catch (err) {
      setFailure(errorText(err, 'Não deu pra mudar o papel. Nada mudou; tente de novo.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionModal
      label={makeAdmin ? 'Tornar admin' : 'Tirar admin'}
      title={makeAdmin ? 'TORNAR ADMIN' : 'TIRAR ADMIN'}
      busy={busy}
      failure={failure}
      onClose={onClose}
      confirm={
        <PixelButton tone={makeAdmin ? 'primary' : 'dangerSolid'} onClick={confirm} disabled={busy}>
          {busy ? 'Salvando…' : makeAdmin ? 'Tornar admin' : 'Tirar admin'}
        </PixelButton>
      }
    >
      <p className="text-[14px] text-primary">
        {makeAdmin ? (
          <>
            <span className="text-accent">{student.displayName}</span> passa a ver o Painel de gestão: alunos, convites, turmas, cursos e uso de IA. O que ele vê
            como aluno não muda.
          </>
        ) : (
          <>
            <span className="text-accent">{student.displayName}</span> deixa de ver o Painel de gestão. A conta e o progresso continuam como estão.
          </>
        )}
      </p>
    </ActionModal>
  );
}

/** A09 e A10: prévia do que acontece + confirmação digitando o e-mail (mesmo padrão do reset de curso). */
export function DisableModal({ student, onClose, onDone }: { student: AdminStudentDto; onClose: () => void; onDone: () => void }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === student.email.toLowerCase();
  const courses = student.courses.length;
  const completed = student.courses.reduce((sum, c) => sum + c.completedDays, 0);

  async function confirm() {
    setBusy(true);
    setFailure(null);
    try {
      await adminApi.disableStudent(student.id, typed);
      onDone();
    } catch (err) {
      setFailure(errorText(err, 'Não deu pra desativar. Nada mudou; tente de novo.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PixelModal label="Desativar conta" title="DESATIVAR CONTA" onClose={busy ? undefined : onClose} widthClass="max-w-lg">
      <div className="flex flex-col gap-4 p-5">
        <p className="text-[14px] text-primary">
          Desativar a conta de <span className="text-accent">{student.displayName}</span>? Dá pra reativar depois.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 border-2 border-alert p-3">
            <p className="font-pixel-label text-[8px] text-alert">// O que acontece</p>
            <ul className="flex flex-col gap-1 text-[13px] text-secondary">
              <li>Perde o acesso na hora, mesmo logado.</li>
              <li>Some do ranking, do squad e do QG dos colegas.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-1 border-2 border-accent p-3">
            <p className="font-pixel-label text-[8px] text-accent">// O que fica</p>
            <ul className="flex flex-col gap-1 text-[13px] text-secondary">
              <li>
                {courses} {courses === 1 ? 'matrícula' : 'matrículas'} e {completed} {completed === 1 ? 'dia concluído' : 'dias concluídos'}.
              </li>
              <li>Gems, sequência e notas.</li>
            </ul>
          </div>
        </div>
        <Field label="Pra confirmar, digite o e-mail do aluno" help={student.email}>
          <input className={inputClass()} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
        </Field>
        {failure && <p className="border-2 border-alert px-3 py-2 text-[13px] text-alert">{failure}</p>}
        <div className="flex justify-end gap-2">
          <PixelButton onClick={onClose} disabled={busy}>
            Cancelar
          </PixelButton>
          <PixelButton tone="dangerSolid" onClick={confirm} disabled={!matches || busy}>
            {busy ? 'Desativando…' : 'Desativar conta'}
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}
