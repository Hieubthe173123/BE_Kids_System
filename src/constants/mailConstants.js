const dotenv = require('dotenv');

const SMTP_CONFIG = {
  "user": process.env.EMAIL_USER,
  "password": process.env.EMAIL_PASS,
  "host": process.env.HOST_SMTP,
  "port": process.env.PORT_SMTP,
  "tls": process.env.TLS_SMTP,
  "maxConnections": process.env.MAXCONNECTIONS,
  "pool": process.env.POOL,
  "from": process.env.FROM_STMP
}

const IMAP_CONFIG = {
  "user": process.env.EMAIL_USER,
  "password": process.env.EMAIL_PASS,
  "host": process.env.HOST_IMAP,
  "port": process.env.PORT_IMAP,
  "tls": process.env.TLS,
  tlsOptions: { rejectUnauthorized: false }

}
const IMAGE_CONFIG = {
  folder: "student_images",
  filename: "student_upload_images" 
}
const NOTIFICATION_SUBJECT = "XÁC NHẬN NHẬP HỌC";
const ERROR_SENT_MAIL = "XÁC NHẬN NHẬP HỌC SAI THÔNG TIN";
const PASSWORD_DEFAULT= "123456"

module.exports = {
  SMTP_CONFIG,
  NOTIFICATION_SUBJECT,
  IMAP_CONFIG,
  ERROR_SENT_MAIL,
  IMAGE_CONFIG,
  PASSWORD_DEFAULT
};