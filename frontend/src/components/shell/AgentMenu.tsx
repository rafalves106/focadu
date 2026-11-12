import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ajudaIcon from '../../assets/pixel/ajuda.png';
import capeloIcon from '../../assets/pixel/capelo.png';
import navConfig from '../../assets/pixel/nav-config.png';
import navLoja from '../../assets/pixel/nav-loja.png';
import { useAuth } from '../../contexts/useAuth';
import { useGuide } from '../../contexts/useGuide';
import { useSettings } from '../../contexts/useSettings';
import { AI_SHORT } from '../../lib/aiStatusText';
import type { AiHealth } from '../../lib/useAiStatus';
import type { ShellData } from '../../lib/useShellData';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { FocadaLine } from '../ui/FocadaLine';
import { Modal } from '../ui/Modal';
import { AgentAvatar } from './AgentAvatar';

/**
 * Menu do agente (Fase 109; Figma `33:1317`, celular `34:2761`): gaveta à direita no desktop e de baixo
 * no celular, aberta pelo agente da nav ou pelo "Você" da barra inferior. Perfil, Loja, Caderninho,
 * Certificações, Configurações, Ajuda desta tela e Sair da conta (Perigo). Loja só depois do 1º dia;
 * Caderninho e Certificações só com curso; Gestão só pra admin. Configurações e Ajuda são modais: a
 * gaveta fecha antes de abrir (um diálogo por vez).
 */
export function AgentMenu({ data, health, onClose }: { data: ShellData; health: AiHealth | null; onClose: () => void }) {
  const { user, logout } = useAuth();
  const settings = useSettings();
  const { openGuide } = useGuide();
  const navigate = useNavigate();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const showNumbers = data.firstDayDone && data.gems !== null && data.streak !== null;
  const course = data.courseId;

  return (
    <Drawer label="Menu do agente" title="Você" onClose={onClose}>
      <div className="flex items-center gap-4 pb-6">
        <span className="flex size-[72px] shrink-0 items-center justify-center bg-surface-alt">
          <AgentAvatar look={data.look} size={64} health={health ?? undefined} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-lead text-primary">{user?.displayName}</p>
          {showNumbers && (
            <p className="flex gap-3 text-rotulo-sm">
              <span className="text-accent">{data.gems} {data.gems === 1 ? 'gem' : 'gems'}</span>
              <span className="text-project">
                {data.streak} {data.streak === 1 ? 'dia' : 'dias'}
              </span>
            </p>
          )}
          {data.look === null && (
            <Link to="/perfil?abrir=guarda-roupa" onClick={onClose} className="text-rotulo-sm text-accent hover:text-accent-hover">
              Criar meu agente ›
            </Link>
          )}
          {health && <p className="text-rotulo-sm text-muted">{AI_SHORT[health]}</p>}
        </div>
      </div>

      <ul className="flex flex-col">
        <MenuItem icon={<AgentAvatar look={data.look} size={16} />} label="Perfil" to="/perfil" onClose={onClose} />
        {data.firstDayDone && <MenuItem icon={<Sprite src={navLoja} />} label="Loja" to="/loja" onClose={onClose} />}
        {course && (
          <MenuItem
            icon={<span className="block size-4 border-2 border-muted" aria-hidden="true" />}
            label="Caderninho"
            to={`/start?course=${course}&caderninho=1`}
            onClose={onClose}
          />
        )}
        {course && <MenuItem icon={<Sprite src={capeloIcon} />} label="Certificações" to={`/start?course=${course}&certifications=1`} onClose={onClose} />}
        <MenuItem
          icon={<Sprite src={navConfig} />}
          label="Configurações"
          onClick={() => {
            onClose();
            settings.open();
          }}
        />
        <MenuItem
          icon={<Sprite src={ajudaIcon} />}
          label="Ajuda desta tela"
          onClick={() => {
            onClose();
            openGuide();
          }}
        />
        {user?.isAdmin && (
          <MenuItem icon={<span className="block size-4 bg-muted" aria-hidden="true" />} label="Gestão" to="/gestao" onClose={onClose} />
        )}
      </ul>

      <div className="border-t-2 border-stroke pt-6">
        <Button kind="perigo" className="w-full md:w-auto" onClick={() => setConfirmingLogout(true)}>
          Sair da conta
        </Button>
      </div>

      {confirmingLogout && (
        <Modal label="Sair da conta" eyebrow="Sair da conta" onClose={() => setConfirmingLogout(false)} width={480}>
          <FocadaLine size="devolutiva">Sair da conta, agente? Pra continuar estudando você vai precisar entrar de novo.</FocadaLine>
          <div className="flex flex-col gap-4 md:flex-row-reverse md:justify-start">
            <Button
              kind="perigo"
              className="w-full md:w-auto"
              onClick={() => {
                setConfirmingLogout(false);
                onClose();
                void logout().then(() => navigate('/login'));
              }}
            >
              Sim, sair da conta
            </Button>
            <Button kind="secundario" className="w-full md:w-auto" onClick={() => setConfirmingLogout(false)}>
              Não, fico por aqui
            </Button>
          </div>
        </Modal>
      )}
    </Drawer>
  );
}

function Sprite({ src }: { src: string }) {
  return <img src={src} alt="" aria-hidden="true" className="size-4 pixelated" />;
}

const ROW = 'flex h-[52px] w-full items-center gap-4 border-t-2 border-stroke text-left text-rotulo text-primary hover:text-accent';

function MenuItem({ icon, label, to, onClick, onClose }: { icon: ReactNode; label: string; to?: string; onClick?: () => void; onClose?: () => void }) {
  const body = (
    <>
      {icon}
      <span className="flex-1">{label}</span>
      <span className="text-corpo text-muted" aria-hidden="true">
        ›
      </span>
    </>
  );
  return (
    <li>
      {to ? (
        <Link to={to} onClick={onClose} className={ROW}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={ROW}>
          {body}
        </button>
      )}
    </li>
  );
}
