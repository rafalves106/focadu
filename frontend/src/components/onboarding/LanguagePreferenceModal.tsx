import { useState } from 'react';
import { api, ApiError } from '../../api/client';
import { PROJECT_LANGUAGE_NAMES, ProjectLanguage, type UserDto } from '../../api/types';
import { PixelModal } from '../PixelModal';
import { FocadaSays } from '../session/FocadaSays';
import { PixelButton } from '../session/PixelButton';

const LANGUAGE_OPTIONS = [ProjectLanguage.Python, ProjectLanguage.JavaScript];

/**
 * Modal global (montado por AuthProvider) pra quem concluiu o onboarding sem nunca ter marcado
 * linguagem dos Projetos Semanais (Fase 59) - sem isso o projeto da semana fica travado em
 * "marque uma linguagem no perfil". Sem fechar pelo fundo/ESC: some sozinho quando o `user`
 * devolvido pelo PUT ja tem linguagem. Reenvia interesses/notas atuais tal qual, porque o
 * endpoint substitui o perfil inteiro. Pixel art desde 24/09/2026: a Focada pergunta, as linguagens
 * sao caixas de marcar pixel (■/□) e o botao e o `PixelButton`.
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
    <PixelModal label="Linguagem dos Projetos Semanais" title="Projetos semanais" widthClass="max-w-lg">
      <FocadaSays>
        Em qual linguagem você quer fazer os projetos, agente? Cada uma tem repositório pronto e referências próprias. Marca
        uma ou mais: dá pra mudar depois no seu perfil.
      </FocadaSays>

      <div className="flex flex-wrap gap-3" role="group" aria-label="Linguagens">
        {LANGUAGE_OPTIONS.map((language) => {
          const selected = languages.includes(language);
          return (
            <button
              key={language}
              type="button"
              onClick={() => toggleLanguage(language)}
              aria-pressed={selected}
              className={`flex items-center gap-2 border-2 px-4 py-2 font-pixel text-xl leading-none transition-colors ${
                selected ? 'border-accent bg-accent/10 text-primary' : 'border-stroke text-secondary hover:border-secondary hover:text-primary'
              }`}
            >
              <span className={selected ? 'text-accent' : 'text-muted'} aria-hidden="true">
                {selected ? '■' : '□'}
              </span>
              {PROJECT_LANGUAGE_NAMES[language]}
            </button>
          );
        })}
      </div>

      {error && <p className="font-pixel text-lg leading-snug text-alert">{error}</p>}

      <PixelButton onClick={handleSave} disabled={saving || languages.length === 0} className="w-full">
        {saving ? 'Salvando...' : 'Salvar e continuar'}
      </PixelButton>
    </PixelModal>
  );
}
