import type { TerminalMissionDto } from '../api/types';

/** Regex da curadoria com `m`: `^`/`$` valem por linha, como nas saidas de varias linhas do terminal. */
function matches(source: string, text: string): boolean {
  return new RegExp(source, 'm').test(text);
}

/**
 * Missao no terminal: confere a missao depois de um comando do aluno. TODA condicao informada em `check` precisa
 * valer (ver `TerminalMissionDto`): `command` sobre o comando digitado, `output` sobre a saida dele e `state`
 * sobre a saida de `probe`, que o laboratorio roda em silencio (`runProbe`) - e o que confere o ESTADO do sistema
 * (permissao, dono, arquivo criado), sem depender de como o aluno chegou la. Regex invalida na curadoria nao
 * quebra a tela: a missao simplesmente nao passa (o verificador da curadoria pega isso antes).
 */
export async function evaluateMission(
  mission: TerminalMissionDto,
  command: string,
  output: string,
  runProbe: (probe: string) => Promise<string>,
): Promise<boolean> {
  const { check } = mission;
  try {
    if (check.command && !matches(check.command, command.trim())) return false;
    if (check.output && !matches(check.output, output)) return false;
    if (check.probe && check.state && !matches(check.state, (await runProbe(check.probe)).trim())) return false;
    return true;
  } catch {
    return false;
  }
}

/** O bash nao achou o comando (typo): a conferencia diz isso em vez de so "ainda nao". */
export function isCommandNotFound(output: string, exitCode: number): boolean {
  return exitCode === 127 || /command not found/i.test(output);
}
