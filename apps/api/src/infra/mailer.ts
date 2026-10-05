import { loadConfig } from '@/config/Config';
import { getLogger } from '@/infra/logger';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/**
 * Geliştirme/test sürücüsü: e-postayı göndermez, loglar ve bellekte tutar (testler okuyabilsin).
 * Canlıda SMTP/SES gibi bir sürücü bu arayüzle eklenir (config `mail.transport`).
 */
export class LogMailer implements Mailer {
  static readonly outbox: (MailMessage & { from: string; sentAt: Date })[] = [];

  async send(message: MailMessage): Promise<void> {
    const from = loadConfig().mail.from;
    LogMailer.outbox.push({ ...message, from, sentAt: new Date() });
    if (LogMailer.outbox.length > 50) LogMailer.outbox.shift();
    getLogger('mail').info(`[mail] ${from} → ${message.to}: ${message.subject}\n${message.text}`);
  }
}

let mailer: Mailer | undefined;

export function getMailer(): Mailer {
  mailer ??= new LogMailer();
  return mailer;
}
