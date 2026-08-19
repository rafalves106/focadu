import { Component, type ReactNode } from 'react';
import { GenericError } from './errors/GenericError';

/**
 * Error boundary React (Fase 10) - so classes de componente podem implementar
 * `getDerivedStateFromError`/`componentDidCatch`, nao ha equivalente em hooks. Pega excecoes de
 * render que nenhum catch de fetch/Api cobriria (ex: um componente quebrado por um dado
 * inesperado) - diferente de `ApiErrorScreen`, que trata falhas de rede/Api, nao de render.
 *
 * "Tentar Novamente" so reseta o boundary - o React nao tem como "refazer" sozinho o render que
 * quebrou; se a causa persistir, quebra nesse mesmo lugar de novo.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('ErrorBoundary capturou um erro não tratado:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <GenericError onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
