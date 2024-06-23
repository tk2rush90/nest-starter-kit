import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createTransport, SentMessageInfo } from 'nodemailer';
import { configs } from '../../configs/configs';
import { UNEXPECTED_ERROR } from '../../constants/errors';
import { compile } from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

/** A service to send mail with templates */
@Injectable()
export class MailService {
  private readonly _logger = new Logger('MailService');

  /** Transporter to send mail */
  private readonly _transporter = createTransport({
    service: 'gmail',
    auth: {
      user: configs.mail.user,
      pass: configs.mail.pass,
    },
    from: configs.mail.sender,
  });

  /**
   * Send mail.
   * @param to - Receiver's email.
   * @param subject - Subject of email.
   * @param templateName - Template name. Extension must be included.
   * @param parameters - Any parameters to pass to template.
   */
  async sendMail(to: string, subject: string, templateName: string, parameters: any): Promise<SentMessageInfo> {
    return this._transporter
      .sendMail({
        to,
        subject,
        html: this._getHtmlTemplate(templateName, parameters),
      })
      .catch((e) => {
        this._logger.error('Failed to send mail: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });
  }

  /**
   * Get template string with handlebars.
   * @param templateName - Template name to get from email template.
   * @param params - Parameters to replace from html template.
   * @returns Returns parameter replaced template string.
   */
  private _getHtmlTemplate(templateName: string, params: object): string {
    try {
      // Get template content.
      const templateContent = readFileSync(join(configs.paths.emailTemplates, templateName), {
        encoding: 'utf-8',
      });

      // Compile and replace variables.
      return compile(templateContent)(params);
    } catch (e) {
      this._logger.error('Failed to get html template: ' + e.toString(), e.stack);

      throw new InternalServerErrorException(UNEXPECTED_ERROR);
    }
  }
}
