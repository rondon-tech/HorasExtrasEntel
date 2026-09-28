/**
 * Email service — ready-to-connect email delivery.
 *
 * Currently a no-op (logs to console). To activate, install Resend:
 *   npm install resend
 * Then uncomment the Resend code below and add RESEND_API_KEY to .env.
 *
 * Usage:
 *   import { emailService } from '../services/email.service.js';
 *   await emailService.sendWelcomeEmail(to, username, tempPassword);
 */

// import { Resend } from 'resend';

export const emailService = {
  async sendWelcomeEmail(to, username, tempPassword) {
    const subject = 'Bienvenido a Entel Horas Extras';
    const text = [
      `Usuario: ${username}`,
      `Contraseña temporal: ${tempPassword}`,
      `URL: https://horas-extras-entel-eight.vercel.app`,
      '',
      'Debe cambiar su contraseña en el primer inicio de sesión.',
    ].join('\n');
    void text; // used when Resend is activated

    console.log(`[EMAIL] To: ${to}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    console.log(`[EMAIL] Body: [REDACTED - contains temporary password]`);

    // --- Activar cuando se configure RESEND_API_KEY ---
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'Entel Horas Extras <no-reply@entelhoras.app>',
    //   to,
    //   subject,
    //   text,
    // });
  },
};
