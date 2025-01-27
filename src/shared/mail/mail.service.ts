import { Injectable } from '@nestjs/common';
import { createTransport, SentMessageInfo } from 'nodemailer';
import { configs } from '../../configs/configs';
import { compile } from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class MailService {
  private readonly _transporter = createTransport({
    service: 'gmail',
    auth: {
      user: configs.mail.user,
      pass: configs.mail.pass,
    },
    from: configs.mail.sender,
  });

  /**
   * 이메일 발송
   * @param to
   * @param subject
   * @param templateName - 템플릿 이름. 확장자 포함 필수
   * @param parameters
   */
  async sendMail(to: string, subject: string, templateName: string, parameters: any): Promise<SentMessageInfo> {
    return this._transporter.sendMail({
      to,
      subject,
      html: this._getHtmlTemplate(templateName, parameters),
    });
  }

  /**
   * Get template string with handlebars.
   * @param templateName - 템플릿 이름. 확장자 포함 필수
   * @param parameters
   * @returns 템플릿에서 파라미터가 대체된 문자열
   */
  private _getHtmlTemplate(templateName: string, parameters: any): string {
    const templateContent = readFileSync(join(configs.paths.emailTemplates, templateName), {
      encoding: 'utf-8',
    });

    return compile(templateContent)(parameters);
  }
}
