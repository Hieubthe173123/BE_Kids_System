const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const EnrollSChool = require('../models/enrollSchoolModel');
const SMTP = require('../utils/stmpHepler');
const IMAP = require("../utils/iMapHelper");
const { SMTP_CONFIG, NOTIFICATION_SUBJECT } = require('../constants/mailConstants');

exports.createEnrollSchool = async (req, res) => {
    try {
        const { email, parentName, studentName } = req.body;
        const newData = new EnrollSChool(req.body);
        const savedData = await newData.save();

        res.status(HTTP_STATUS.CREATED).json({
            message: RESPONSE_MESSAGE.CREATED,
            data: savedData,
        });

        setImmediate(() => {
            const mail = new SMTP(SMTP_CONFIG);
            mail.send(
                email,
                '',
                NOTIFICATION_SUBJECT,
                `
                    <!DOCTYPE html>
                    <html lang="vi">
                    <head>
                    <meta charset="UTF-8" />
                    <style>
                        body { font-family: Arial, sans-serif; background: #f9f9f9; }
                        .container { max-width: 600px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .header { background: #1a73e8; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .footer { font-size: 12px; color: #999; text-align: center; margin-top: 20px; }
                        .btn { display: inline-block; padding: 10px 20px; background: #1a73e8; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
                    </style>
                    </head>
                    <body>
                    <div class="container">
                        <div class="header">
                        <h2>Trường Mầm Non Sakura</h2>
                        </div>
                        <p>Xin chào anh/chị <strong>${parentName}</strong>,</p>
                        <p>Nhà trường đã nhận được thông tin đăng ký nhập học của học sinh <strong>${studentName}</strong>.</p>
                        <p>Để hoàn tất thủ tục, vui lòng anh/chị gửi lại email cho nhà trường với:</p>
                        <ul>
                        <li><strong>Tiêu đề:</strong> “XÁC NHẬN NHẬP HỌC”</li>
                        <li><strong>Đính kèm:</strong> Ảnh của học sinh</li>
                        </ul>
                        <p style="text-align:center;">
                        <a class="btn" href="mailto:kidmanagesystem.2025@gmail.com?subject=XÁC NHẬN NHẬP HỌC">Gửi xác nhận ngay</a>
                        </p>
                        <p>Xin cảm ơn!</p>
                        <div class="footer">
                        © 2025 Trường Mầm Non Sakura<br />
                        Email: kidmanagesystem.2025@gmail.com | Hotline: 0913-339-709
                        </div>
                    </div>
                    </body>
                    </html>
                `,
                '',
                () => {
                    console.log(`✅ Mail gửi thành công đến email : ${email}`);
                }
            );

        });

    } catch (error) {
        res.status(HTTP_STATUS.SERVER_ERROR).json({ message: error.message });
    }
}

exports.processEnrollSchoolAll = async (req, res) => {
    try {
        const enrollSchoolList = await EnrollSChool.updateMany({state: "Chờ xác nhận"}, {state:"Chờ xử lý"});
        if(enrollSchoolList.modifiedCount < 1){
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: `${RESPONSE_MESSAGE.NOT_FOUND} có trạng thái là Chờ xác nhận`
            });
        }
        
        res.status(HTTP_STATUS.UPDATED).json({
            message: RESPONSE_MESSAGE.UPDATED,
            data: enrollSchoolList,
        });
        setImmediate( async () => {
            
            // const waitProcessingList = await EnrollSChool.find({state: "Chờ xử lý"});
            // for( const item of waitProcessingList){
            //     const {email, studentName, parentName} = item;
            //     console.log("🚀 ~ setImmediate ~ email:", email);
            //     console.log("🚀 ~ setImmediate ~ parentName:", parentName);
            //     console.log("🚀 ~ setImmediate ~ username:", studentName);


            // }
        })

        
    } catch (error) {
        res.status(HTTP_STATUS.SERVER_ERROR).json({ message: error.message });
    }
}