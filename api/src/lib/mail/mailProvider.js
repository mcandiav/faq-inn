/**
 * Abstracción de correo. Auth/reset no debe importar Zoho ni Nodemailer.
 * @typedef {object} MailProvider
 * @property {() => Promise<void>} verifyConnection
 * @property {(input: { to: string, resetUrl: string, expiresAt: Date }) => Promise<void>} sendPasswordReset
 * @property {(input: { to: string, changedAt: Date }) => Promise<void>} sendPasswordChanged
 */

export function createDisabledMailProvider() {
  return {
    async verifyConnection() {
      throw new Error('Correo no configurado (MAIL_PROVIDER / ZOHO_SMTP_*)');
    },
    async sendPasswordReset() {
      throw new Error('Correo no configurado (MAIL_PROVIDER / ZOHO_SMTP_*)');
    },
    async sendPasswordChanged() {
      throw new Error('Correo no configurado (MAIL_PROVIDER / ZOHO_SMTP_*)');
    },
  };
}
