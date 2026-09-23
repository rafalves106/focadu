import { PageShell } from '../components/Layout';
import { NotebookTab } from '../components/notebook/NotebookTab';

/**
 * Tela dedicada do Caderninho de Anotações (Fase 65) - antes era uma aba de `/start?course=`; com o mapa
 * da trilha ocupando a tela do curso, virou um botão na coluna lateral que abre esta tela (pedido do dono:
 * "botões que abrem a tela deles, não ficam abertos"). Roteada via `/start?course=&caderninho=1` (mesmo
 * padrão de CertificationsPage); `?tab=caderninho` (links antigos, ex. QuickNotePanel até a Fase 64)
 * também cai aqui, ver StartPage.
 */
export function NotebookPage({ courseId }: { courseId: string }) {
  return (
    <PageShell title="Caderninho" backTo={`/start?course=${courseId}`}>
      <NotebookTab courseId={courseId} />
    </PageShell>
  );
}
