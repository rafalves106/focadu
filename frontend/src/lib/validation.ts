// Validacao client-side de auth (Fase 12) - compartilhada por LoginForm/RegisterForm. O servidor
// nunca confia so nisso (User.Create valida formato de email no dominio, RegisterUserUseCase
// valida tamanho de senha na aplicacao) - isso aqui e so pra dar feedback sem round-trip.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_FORMAT.test(email.trim());
}

export const MIN_PASSWORD_LENGTH = 8;
