import { useState } from 'react';
import { api, ApiError } from '../../api/client';
import { PROJECT_LANGUAGE_NAMES, ProjectLanguage, type UserDto } from '../../api/types';
import { InterestChip } from './InterestChip';

const LANGUAGE_OPTIONS = [ProjectLanguage.Python, ProjectLanguage.JavaScript];

/**
 * Modal global (montado por AuthProvider) pra quem concluiu o onboarding sem nunca ter marcado
 * linguagem dos Projetos Semanais (Fase 59) - sem isso o projeto da semana fica travado em
 * "marque uma linguagem no perfil". Sem fechar pelo fundo/ESC: some sozinho quando o `user`
 * devolvido pelo PUT ja tem linguagem. Reenvia interesses/notas atuais tal qual, porque o
 * endpoint substitui o perfil inteiro.
 */
export function LanguagePreferenceModal({ user, onSaved }: { user: UserDto; onSaved: (user: UserDto) => void }) {
  const [languages, setLanguages] = useState<ProjectLanguage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleLanguage(language: ProjectLanguage) {
    setLanguages((current) => (current.includes(language) ? current.filter((l) => l !== language) : [...current, language]));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      onSaved(await api.completeProfile(user.interests, user.additionalProfileNotes, languages));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar. Tente de novo.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-6" role="presentation">
      <div
        className="flex w-[460px] max-w-full flex-col gap-6 rounded-2xl border border-surface-alt bg-surface p-8"
        role="dialog"
        aria-modal="true"
        aria-label="Linguagem dos Projetos Semanais"
      >
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-bold text-primary">Em qual linguagem você quer fazer os projetos?</h1>
          <p className="text-sm leading-relaxed text-secondary">
            Os Projetos Semanais agora têm repositório pronto e referências próprias por linguagem. Marque uma ou mais para
            continuar - dá pra mudar depois no seu perfil.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((language) => (
            <InterestChip
              key={language}
              label={PROJECT_LANGUAGE_NAMES[language]}
              selected={languages.includes(language)}
              onToggle={() => toggleLanguage(language)}
            />
          ))}
        </div>

        {error && <p className="text-sm text-alert">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || languages.length === 0}
          className="rounded-xl bg-accent px-6 py-3 text-sm font-bold tracking-wide text-base disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar e continuar'}
        </button>
      </div>
    </div>
  );
}
