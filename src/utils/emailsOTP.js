const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * @param {string} email 
 * @param {string} otp 
 */
const sendOTPEmail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: '"Sakura School" <no-reply@sakura.edu.vn>',
        to: email,
        subject: "🔐 Mã xác thực OTP - Sakura School",
        html: `<!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Xác minh OTP - Sakura School</title>
      <style>
        body {
          font-family: 'Segoe UI', sans-serif;
          background-color: #f4f9fd;
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 10px;
          box-shadow: 0 0 12px rgba(57, 130, 184, 0.2);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #46a2da, #3982b8);
          color: white;
          padding: 20px;
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .email-content {
          padding: 24px;
          color: #333;
          font-size: 16px;
          line-height: 1.6;
        }
        .otp-box {
          background-color: #e6687a;
          color: white;
          font-size: 30px;
          font-weight: bold;
          padding: 18px;
          text-align: center;
          border-radius: 8px;
          margin: 24px 0;
          letter-spacing: 4px;
        }
        .footer {
          background-color: #3982b8;
          color: white;
          padding: 16px;
          text-align: center;
          font-size: 14px;
        }
        .footer a {
          color: white;
          text-decoration: underline;
        }
        .note {
          font-size: 13px;
          color: #777;
          margin-top: 12px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">Sakura School - Xác minh OTP</div>
        <div class="email-content">
          <p>Xin chào,</p>
          <p>Bạn đã yêu cầu xác minh tài khoản hoặc khôi phục mật khẩu. Vui lòng sử dụng mã OTP sau:</p>
          <div class="otp-box">${otp}</div>
          <p>Mã OTP có hiệu lực trong <strong>1 phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
          <p>Nếu bạn không yêu cầu xác minh, vui lòng bỏ qua email này.</p>
          <p class="note">Vì lý do bảo mật, vui lòng không chia sẻ mã OTP với bất kỳ ai, kể cả nhân viên nhà trường.</p>
        </div>
        <div class="footer">
          &copy; 2025 Sakura School | <a href="https://sakura.edu.vn">sakura.edu.vn</a>
        </div>
      </div>
    </body>
    </html>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email đã được gửi tới ${email}`);
};

module.exports = { sendOTPEmail };
