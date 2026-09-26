import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { PROJECT_LANGUAGE_NAMES, ProjectLanguage } from '../api/types';
import { PixelFormError } from '../components/auth/PixelFields';
import { ChoiceChip, EntryCard, EntryScreen } from '../components/entry/Entry';
import { pixelField } from '../components/PixelModal';
import { FocadaSays } from '../components/session/FocadaSays';
import { PixelButton } from '../components/session/PixelButton';
import backArrow from '../assets/pixel/voltar.png';
import { useAuth } from '../contexts/useAuth';

// Hobbies/referencias culturais, nao topicos de curriculo - User.Interests e "fonte de futuras
// analogias personalizadas" (ver User.cs), nao uma preferencia de conteudo (o curso e sempre o
// mesmo template fixo pra todo mundo, ver CompleteProfileUseCase).
const INTEREST_OPTIONS = [
  'Cinema', 'Séries', 'Games', 'Música', 'Esportes', 'Anime', 'Livros', 'Culinária', 'Viagens', 'Artes', 'Natureza', 'Tecnologia',
];

// Fase 59 (piloto Semana 1): linguagens do Projeto Semanal - lista fechada, diferente de
// INTEREST_OPTIONS (que e livre/nao-exaustiva). Opcional aqui, igual aos interesses ("fica a
// vontade pra pular") - a WeeklyProjectPage e quem exige a escolha, na hora que o projeto de fato
// precisa dela (decisao do dono).
const LANGUAGE_OPTIONS = [ProjectLanguage.Python, ProjectLanguage.JavaScript];

/**
 * `/onboarding/perfil` - passo 2/3 (Fase 13b; pixel art na Fase 74, Figma "Entrada e onboarding — v2",
 * node 145:6677): interesses (personalizam as analogias da IA) e as linguagens dos Projetos Semanais
 * (Fase 59) em chips, mais um texto livre opcional. `?edit` reabre a mesma tela pelo Perfil, sem o passo.
 */
export function ProfileInterviewPage() {
  const { user, setCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditing = searchParams.get('edit') !== null;
  const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
  const [languages, setLanguages] = useState<ProjectLanguage[]>(user?.preferredLanguages ?? []);
  const [notes, setNotes] = useState(user?.additionalProfileNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  if (user.profileCompletedAt && !isEditing) return <Navigate to="/selecionar-curso" replace />;

  function toggleInterest(interest: string) {
    setInterests((current) => (current.includes(interest) ? current.filter((i) => i !== interest) : [...current, interest]));
  }

  function toggleLanguage(language: ProjectLanguage) {
    setLanguages((current) => (current.includes(language) ? current.filter((l) => l !== language) : [...current, language]));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      setCurrentUser(await api.completeProfile(interests, notes.trim() || null, languages));
      navigate(isEditing ? '/perfil' : '/selecionar-curso');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar seu perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <EntryScreen step={isEditing ? undefined : 2}>
      <div className="mx-auto flex w-full max-w-[1248px] flex-1 flex-col gap-8 px-4 py-10 lg:flex-row lg:items-start lg:gap-16 lg:py-14">
        <div className="flex flex-col gap-6 lg:w-[420px] lg:shrink-0">
          <p className="font-pixel-label text-[10px] text-accent">{isEditing ? '// Editar seus interesses' : '// Conte um pouco sobre você'}</p>
          <h1 className="font-pixel text-[40px] leading-none text-primary sm:text-[44px]">Sem certo ou errado aqui.</h1>
          <FocadaSays size="md">Com os seus interesses eu monto analogias que fazem sentido pra você. Pode pular, se preferir.</FocadaSays>
        </div>

        <EntryCard className="min-w-0 flex-1">
          <p className="font-pixel-label text-[10px] text-accent">// Interesses</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => (
              <ChoiceChip key={interest} label={interest} selected={interests.includes(interest)} onToggle={() => toggleInterest(interest)} />
            ))}
          </div>

          {/* Fase 59 (piloto Semana 1): so os Projetos Semanais ja curados por linguagem usam isso -
              marcar aqui nao afeta o resto do curso. */}
          <p className="font-pixel-label text-[10px] text-accent">// Linguagem dos projetos semanais</p>
          <p className="font-pixel text-xl leading-tight text-secondary">
            Alguns projetos têm repositório pronto por linguagem. Marque em qual topa fazer: dá pra mudar depois, mas a escolha de um projeto não volta atrás.
          </p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((language) => (
              <ChoiceChip
                key={language}
                label={PROJECT_LANGUAGE_NAMES[language]}
                selected={languages.includes(language)}
                onToggle={() => toggleLanguage(language)}
              />
            ))}
          </div>

          <label className="flex flex-col gap-2">
            <span className="font-pixel-label text-[9px] text-secondary">Mais alguma coisa? (opcional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Referências, hobbies, o que quiser..." className={pixelField} />
          </label>

          <PixelFormError>{error}</PixelFormError>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(isEditing ? '/perfil' : '/onboarding')}
              className="flex items-center gap-2 font-pixel-label text-[9px] text-secondary hover:text-primary"
            >
              <img src={backArrow} alt="" className="size-4 pixelated" />
              Voltar
            </button>
            <PixelButton onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Próximo passo ›'}
            </PixelButton>
          </div>
        </EntryCard>
      </div>
    </EntryScreen>
  );
}
