import type { LabConfigDto } from '../api/types';
import type { LabRunResult } from './labClient';
import type { LabSession } from './labSession';
import { argvFor } from './labOutput';

/**
 * Fase 113: o "Rodar" do terminal da ponte intercalada. No Linux do laboratório (bash, v86) grava o arquivo do dia no
 * home e roda `lab.command` (`python3 inspetor.py`); nos outros runtimes roda o script direto. Sem campo de comando:
 * o terminal da ponte só tem o Rodar (Figma `108:245`).
 */
export async function runBridgeScript(session: LabSession, lab: LabConfigDto, script: string): Promise<LabRunResult> {
  if (lab.runtime === 'bash') {
    await session.write(`${lab.user ? `/home/${lab.user}` : '/root'}/${lab.entry}`, script);
    return session.exec(lab.command);
  }
  return session.run(script, argvFor(lab.runtime, lab.command), lab.entry);
}
