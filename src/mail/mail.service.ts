import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transporter: nodemailer.Transporter

  constructor() {
    this.connect() // Tự động kết nối khi khởi tạo
  }

  // Hàm kết nối đến mail server
  private connect(): void {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.MAIL_PORT || '2525'),
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    })

    // Verify connection
    this.transporter
      .verify()
      .then(() => this.logger.log('Mail server connection established'))
      .catch((error) => this.logger.error('Mail server connection failed', error))
  }

  // Hàm gửi mail đa năng
  async sendMail(options: { to: string; subject: string; html?: string; text?: string; from?: string }): Promise<void> {
    const mailOptions = {
      from: options.from || `"DonateProject" <${process.env.MAIL_FROM || 'noreply@example.com'}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html?.replace(/<[^>]*>/g, ''),
    }

    try {
      await this.transporter.sendMail(mailOptions)
      this.logger.log(`Email sent to ${options.to}`)
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error.stack)
      throw error
    }
  }
}
