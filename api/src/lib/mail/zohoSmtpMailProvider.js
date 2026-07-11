import nodemailer from 'nodemailer';
import { createDisabledMailProvider } from './mailProvider.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTransport(config) {
  const port = Number(config.zohoSmtpPort || 465);
  const secure =
    String(config.zohoSmtpSecure ?? 'true').toLowerCase() === 'true' ||
    port === 465;

  return nodemailer.createTransport({
    host: config.zohoSmtpHost,
    port,
    secure,
    auth: {
      user: config.zohoSmtpUser,
      pass: config.zohoSmtpPassword,
    },
  });
}

function fromHeader(config) {
  const address = config.mailFromAddress || config.zohoSmtpUser;
  const name = config.mailFromName || 'FAQ Inn';
  return { name, address };
}

export function createZohoSmtpMailProvider(config) {
  if (
    !config.zohoSmtpHost ||
    !config.zohoSmtpUser ||
    !config.zohoSmtpPassword
  ) {
    return createDisabledMailProvider();
  }

  const transporter = buildTransport(config);
  const from = fromHeader(config);

  return {
    async verifyConnection() {
      await transporter.verify();
    },

    async sendPasswordReset({ to, resetUrl, expiresAt }) {
      const expiresLabel = expiresAt.toISOString();
      const text = [
        'Recuperación de contraseña — FAQ Inn',
        '',
        'Recibimos una solicitud para restablecer tu contraseña.',
        `Abrí este enlace (válido hasta ${expiresLabel}):`,
        resetUrl,
        '',
        'Si no solicitaste este cambio, ignorá este correo.',
      ].join('\n');

      const html = `
        <p><strong>Recuperación de contraseña — FAQ Inn</strong></p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p><a href="${escapeHtml(resetUrl)}">Restablecer contraseña</a></p>
        <p>El enlace es válido hasta <code>${escapeHtml(expiresLabel)}</code>.</p>
        <p>Si no solicitaste este cambio, ignorá este correo.</p>
      `;

      await transporter.sendMail({
        from,
        to,
        subject: 'FAQ Inn — restablecer contraseña',
        text,
        html,
      });
    },

    async sendPasswordChanged({ to, changedAt }) {
      const when = changedAt.toISOString();
      const text = [
        'Tu contraseña de FAQ Inn se actualizó.',
        `Fecha: ${when}`,
        'Si no fuiste vos, contactá a soporte de inmediato.',
      ].join('\n');

      const html = `
        <p><strong>Contraseña actualizada — FAQ Inn</strong></p>
        <p>Tu contraseña se cambió el <code>${escapeHtml(when)}</code>.</p>
        <p>Si no fuiste vos, contactá a soporte de inmediato.</p>
      `;

      await transporter.sendMail({
        from,
        to,
        subject: 'FAQ Inn — contraseña actualizada',
        text,
        html,
      });
    },
  };
}

export function createMailProvider(config) {
  const provider = String(config.mailProvider || '').toLowerCase();
  if (provider === 'zoho_smtp') {
    return createZohoSmtpMailProvider(config);
  }
  return createDisabledMailProvider();
}
