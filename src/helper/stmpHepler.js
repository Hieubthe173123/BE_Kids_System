const { createTransport } = require('nodemailer');

const appBizDebugger = require('debug')('app:biz');

class SMTP_Helper {
  constructor(config) {
    this.config = config;

    const {
      host, port,
      tls, secure,
      from, user,
      password: pass,
      maxConnections, pool,
    } = config;

    this.sentBy = from || user;

    this.transport = {
      host, port,
      secure,
      requireTLS: tls,

      maxConnections, pool,

      tls: tls ? { rejectUnauthorized: false } : undefined,

      from: (from || user),

      auth: {
        user,
        pass,
      }
    };

    this.smtp = createTransport(this.transport);
  }

  // TODO: send templated email

  send(to, cc, subject, html, attachments = [], callback) {
    appBizDebugger(`SMTP_Helper sendEmail: To: ${to}; CC: ${cc}`);

    const mailOptions = {
      from: this.sentBy,
      to: String(to),
      cc: String(cc),
      subject,
      html,
      attachments
    };

    this.smtp.sendMail(mailOptions, callback);
  }
};

module.exports = SMTP_Helper;

