import { bridgeFileBefore, bridgePosition, closedBlocksLabel, lineTotal } from '../../lib/bridgeSteps';
import { useSession } from '../../lib/sessionContext';
import { useBridgeRunner } from '../../lib/useBridgeRunner';
import { BridgeEditor } from './BridgeEditor';
import { BridgeTerminal } from './BridgeTerminal';

/**
 * A coluna do código nas etapas sem código (Abertura, Explicação, Prever, Voz): o arquivo como os passos já o deixaram,
 * só leitura, com as linhas do bloco atual em Passo (quadro `111:1172`), e o terminal com a última execução. Na Abertura
 * o arquivo está vazio e o terminal é a Prévia, com a saída do script pronto (quadro `109:8`).
 */
export function BridgeFileView() {
  const { daily, activityId } = useSession();
  const runner = useBridgeRunner();
  const position = bridgePosition(daily, activityId);
  const fileName = daily.lab?.entry ?? 'script';

  if (position.part === 'abertura') {
    const preview = (daily.bridgePreview ?? '').replace(/\n+$/, '');
    return (
      <>
        <BridgeEditor fileName={fileName} status={`${runner.language} · vazio`} prior="" emptyNote="Arquivo vazio. O bloco 1 escreve as primeiras linhas." />
        <BridgeTerminal
          title="Prévia"
          command="saída do script pronto"
          lines={preview ? preview.split('\n').map((text) => ({ tone: 'saida' as const, text })) : []}
          emptyText="O script pronto aparece aqui."
        />
      </>
    );
  }

  const { code, closedLines } = bridgeFileBefore(daily, activityId);
  const total = lineTotal(code);
  const ran = runner.lines.length > 0;
  return (
    <>
      <BridgeEditor
        fileName={fileName}
        status={`${runner.language} · ${total === 0 ? 'vazio' : `${total} ${total === 1 ? 'linha' : 'linhas'}`}${ran ? ' · rodou' : ''}`}
        prior={code}
        priorFrom={closedLines < total ? closedLines + 1 : Infinity}
        closedLines={closedLines}
        closedLabel={closedBlocksLabel(position.block)}
        emptyNote="Arquivo vazio. O bloco 1 escreve as primeiras linhas."
      />
      <BridgeTerminal
        lines={runner.lines}
        command={daily.lab?.command ?? ''}
        onRun={code ? () => void runner.run(`${code}\n`) : undefined}
        running={runner.running}
        runDisabled={!code}
        status={runner.status}
        emptyText={code ? 'Ainda não rodou. Aperte Rodar.' : 'Nada pra rodar ainda.'}
      />
    </>
  );
}
