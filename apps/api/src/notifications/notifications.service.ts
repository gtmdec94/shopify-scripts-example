import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly config: ConfigService) {}

  async sendEmail(to: string, subject: string, html: string) {
    // In production, use nodemailer with SMTP config
    // const transporter = nodemailer.createTransport({
    //   host: this.config.get('mail.host'),
    //   port: this.config.get('mail.port'),
    //   auth: { user: this.config.get('mail.user'), pass: this.config.get('mail.pass') },
    // });
    // await transporter.sendMail({ from: this.config.get('mail.from'), to, subject, html });

    this.logger.log(`[Email] To: ${to}, Subject: ${subject}`);
  }
}
