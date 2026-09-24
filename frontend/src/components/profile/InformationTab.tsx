import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PROJECT_LANGUAGE_NAMES, type UserDto } from '../../api/types';
import terminalIcon from '../../assets/pixel/terminal.png';

const EDIT_LINK = '/onboarding/perfil?edit=1';

/**
 * Aba "Informações" do Perfil (Fase 18; pixel art na Fase 70) - nome/e-mail somente leitura (edicao
 * de conta fora de escopo, ver docs/fase-18), interesses/notas da Entrevista de Perfil e a linguagem
 * dos Projetos Semanais (Fase 59), os dois editados na propria entrevista (`?edit=1`). As estatisticas
 * que moravam aqui foram pra ficha do agente (`AgentSheet`), que aparece em todas as abas.
 */
export function InformationTab({ user }: { user: UserDto }) {
  return (
    <div className="flex flex-col gap-6">
      <Section title="Conta" aside={<span className="font-pixel-label text-[9px] text-muted">Somente leitura</span>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome de exibição" value={user.displayName} />
          <Field label="E-mail" value={user.email} />
        </div>
      </Section>

      <Section title="Seus interesses" aside={<EditLink />}>
        {user.interests.length === 0 ? (
          <p className="font-pixel text-xl leading-tight text-secondary">Nenhum interesse informado ainda.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <Chip key={interest}>{interest}</Chip>
            ))}
          </ul>
        )}
        {user.additionalProfileNotes && (
          <p className="font-pixel text-[19px] leading-tight break-words text-secondary">"{user.additionalProfileNotes}"</p>
        )}
        <p className="font-pixel-label text-[8px] text-muted">A Focada usa isso na analogia "pra você" da Leitura</p>
      </Section>

      <Section title="Linguagem dos Projetos Semanais" aside={<EditLink />}>
        {user.preferredLanguages.length === 0 ? (
          <p className="font-pixel text-xl leading-tight text-secondary">Nenhuma linguagem marcada ainda.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {user.preferredLanguages.map((language) => (
              <Chip key={language} icon={terminalIcon}>
                {PROJECT_LANGUAGE_NAMES[language]}
              </Chip>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-pixel-label text-[9px] text-accent">// {title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function EditLink() {
  return (
    <Link to={EDIT_LINK} className="shrink-0 font-pixel-label text-[9px] text-accent hover:underline">
      Editar ›
    </Link>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="font-pixel-label text-[8px] text-secondary">{label}</p>
      <p className="truncate border-2 border-stroke bg-surface px-3 py-2 font-pixel text-[22px] leading-tight text-primary">{value}</p>
    </div>
  );
}

function Chip({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 border-2 border-accent/60 px-3 py-1 font-pixel text-xl leading-tight text-primary">
      {icon && <img src={icon} alt="" className="size-4 pixelated" />}
      {children}
    </li>
  );
}
