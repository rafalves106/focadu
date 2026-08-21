import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { InterestChip } from '../components/onboarding/InterestChip';
import { OnboardingStepper } from '../components/onboarding/OnboardingStepper';
import { useAuth } from '../contexts/useAuth';

// Hobbies/referencias culturais, nao topicos de curriculo - User.Interests e "fonte de futuras
// analogias personalizadas" (ver User.cs), nao uma preferencia de conteudo (o curso e sempre o
// mesmo template fixo pra todo mundo, ver CompleteProfileUseCase).
const INTEREST_OPTIONS = [
  'Cinema', 'Séries', 'Games', 'Música', 'Esportes', 'Anime', 'Livros', 'Culinária', 'Viagens', 'Artes', 'Natureza', 'Tecnologia',
];

/**
 * `/onboarding/perfil` - passo 2/3 (Fase 13b). Sem node Figma proprio validado nesta fase (so
 * Boas-vindas/Seleção/Empty State foram conferidos) - segue a mesma estética das outras 2 telas
 * de onboarding.
 *
 * `?edit=1` (Fase 18): mesma tela reaproveitada pra editar depois do onboarding, a partir da aba
 * "Informações" do Perfil - PUT /api/users/me/profile ja aceita ser chamado de novo (sem guarda
 * de "so uma vez", ver CompleteProfileUseCase), so faltava a UI de edicao. Pre-popula com o que ja
 * foi salvo (UserDto.interests/additionalProfileNotes) e volta pro Perfil ao salvar, em vez de
 * seguir pra Selecao de Curso.
 */
export function ProfileInterviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditing = searchParams.get('edit') !== null;
  const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
  const [notes, setNotes] = useState(user?.additionalProfileNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  if (user.profileCompletedAt && !isEditing) return <Navigate to="/selecionar-curso" replace />;

  function toggleInterest(interest: string) {
    setInterests((current) => (current.includes(interest) ? current.filter((i) => i !== interest) : [...current, interest]));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await api.completeProfile(interests, notes.trim() || null);
      navigate(isEditing ? '/perfil' : '/selecionar-curso');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar seu perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <header className="border-b border-surface-alt px-8 py-5">
        <p className="text-lg font-black tracking-[0.3em] text-primary">FOCADU</p>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 p-8">
        {!isEditing && <OnboardingStepper step={2} />}

        <div>
          <h1 className="text-3xl font-black text-primary">{isEditing ? 'Editar seus interesses' : 'Conte um pouco sobre você'}</h1>
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            Sem certo ou errado aqui - isso ajuda a montar analogias que fazem sentido pra você mais pra frente. Fica
            à vontade pra pular, se preferir.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <InterestChip key={interest} label={interest} selected={interests.includes(interest)} onToggle={() => toggleInterest(interest)} />
          ))}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Mais alguma coisa? (opcional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Referências, hobbies, o que quiser..."
            className="rounded-lg border border-surface-alt bg-surface p-3 text-sm text-primary outline-none focus:border-accent"
          />
        </label>

        {error && <p className="text-sm text-alert">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate(isEditing ? '/perfil' : '/onboarding')}
            className="text-sm text-secondary hover:text-primary"
          >
            ← Voltar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-accent px-6 py-3 text-sm font-bold tracking-wide text-base disabled:opacity-50"
          >
            {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Próximo Passo →'}
          </button>
        </div>
      </div>
    </div>
  );
}
