const { Model } = require("mongoose");
const moment = require('moment'); 
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS, STATE } = require('../constants/useConstants');
const { SMTP_CONFIG, NOTIFICATION_SUBJECT, IMAP_CONFIG, ERROR_SENT_MAIL, PASSWORD_DEFAULT } = require('../constants/mailConstants');

const EnrollSChool = require('../models/enrollSchoolModel');
const Parent = require('../models/parentModel');
const Student = require('../models/studentModel');
const Account = require("../models/accountModel");

const SMTP = require('../helper/stmpHepler');
const IMAP = require("../helper/iMapHelper");
const UPLOADIMAGE = require("../helper/uploadImageHelper");
const { generateUsername } = require("../helper/index");


exports.createEnrollSchool = async (req, res) => {
    try {
        const { studentName, studentAge, studentDob, studentGender,
               parentName, parentDob, parentGender, IDCard, address, phoneNumber, 
               email, relationship, reason, note } = req.body;
        const today = moment().format('YYYYMMDD'); 
        const prefix = `STUEN-${today}`;
        const countToday = await EnrollSChool.countDocuments({
            enrollCode: { $regex: `^${prefix}` }
        });

        const nextNumber = (countToday + 1).toString().padStart(3, '0'); 
        const enrollCode = `${prefix}${nextNumber}`;
        const newData = new EnrollSChool({
            studentName,
            studentAge,
            studentDob,
            studentGender,
            parentName,
            parentGender,
            parentDob,
            IDCard,
            address,
            phoneNumber,
            email,
            relationship,
            reason,
            note,
            enrollCode
        });
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
                        <p>Nhà trường đã nhận được thông tin đăng ký nhập học của học sinh <strong>${studentName}</strong> với mã đăng kí là <strong>${enrollCode}</strong>.</p>
                        <p>Để hoàn tất thủ tục, vui lòng anh/chị gửi lại email cho nhà trường với:</p>
                        <ul>
                        <li><strong>Tiêu đề:</strong> “XÁC NHẬN NHẬP HỌC - Mã Đăng Kí”</li>
                        <li><strong>Đính kèm:</strong> Ảnh của học sinh</li>
                        </ul>
                        <p style="text-align:center;">
                        <a class="btn" href="mailto:kidmanagesystem.2025@gmail.com?subject=XÁC NHẬN NHẬP HỌC - ${enrollCode}">Gửi xác nhận ngay</a>
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
        const enrollSchoolList = await EnrollSChool.updateMany({ state: STATE.WAITING_CONFIRM }, { state: STATE.WAITING_PROCESSING });
        if (enrollSchoolList.modifiedCount < 1) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: `${RESPONSE_MESSAGE.NOT_FOUND} có trạng thái là Chờ xác nhận`
            });
        }

        res.status(HTTP_STATUS.UPDATED).json({
            message: RESPONSE_MESSAGE.UPDATED,
            data: enrollSchoolList,
        });
        setImmediate(async () => {
            const mail = new IMAP(IMAP_CONFIG);
            const mailSent = new SMTP(SMTP_CONFIG);
            console.log("---------------------Start Bot ---------------------");
            let searchOptions = [];
            // let maxUid = 1;
            // searchOptions = ['ALL', ['UID', `${maxUid + 1}`]];
            searchOptions = ['UNSEEN'];
            const messages = await mail.readMail('INBOX', searchOptions, true);
            for (const message of messages) {
                let { from, to, cc, subject,
                    attachments, uid,
                    text, html,
                    //uid, messageId, inReplyTo , references,
                } = message;
                const enrollCode = subject.split(" - ")[1];
                const email = from.value[0].address;
                const enroll = await EnrollSChool.findOne({ enrollCode: enrollCode, state: "Chờ xử lý"});
                if (subject && subject.toUpperCase() === `${NOTIFICATION_SUBJECT} - ${enrollCode}`) {
                    if(attachments[0] === undefined){
                        await EnrollSChool.updateOne({ enrollCode: enrollCode }, { state: STATE.ERROR });
                        mailSent.send(
                        email,
                        '',
                        ERROR_SENT_MAIL,
                        `
                        <!DOCTYPE html>
                            <html lang="vi">

                            <head>
                                <meta charset="UTF-8" />
                                <style>
                                    body {
                                        font-family: Arial, sans-serif;
                                        background-color: #f4f6f8;
                                        padding: 20px;
                                        color: #333;
                                    }

                                    .email-container {
                                        background-color: #ffffff;
                                        border-radius: 8px;
                                        padding: 24px;
                                        max-width: 600px;
                                        margin: auto;
                                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                                    }

                                    h2 {
                                        color: #2c3e50;
                                    }

                                    p {
                                        font-size: 16px;
                                        line-height: 1.5;
                                    }

                                    .footer {
                                        margin-top: 32px;
                                        font-size: 14px;
                                        color: #888;
                                    }
                                </style>
                            </head>

                            <body>
                                <div class="email-container">
                                    <h2>Thư thông báo từ Nhà trường</h2>
                                    <p>Kính gửi Anh/Chị,</p>
                                    <p>
                                        Nhà trường đã nhận được email xác nhận nhập học của Anh/Chị. Tuy nhiên, nội dung email chưa đầy đủ 
                                        theo yêu cầu của nhà trường.
                                    </p>
                                    <p>
                                        Anh/Chị vui lòng gửi lại email xác nhận nhập học có chứa 
                                         <strong><span style="color: red;">HÌNH ẢNH CỦA HỌC SINH</span></strong>
                                        để đảm bảo quá trình nhập học được diễn ra thuận lợi.
                                    </p>
                                    <p>
                                        Xin chân thành cảm ơn sự hợp tác của Anh/Chị!
                                    </p>
                                    <p>
                                        Trân trọng,<br />
                                        <strong>Phòng Tuyển sinh</strong><br />
                                        Nhà trường
                                    </p>
                                    <div class="footer">
                                        (Email này được gửi tự động, vui lòng không phản hồi)
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
                    }else{
                        const { studentName, studentAge, studentDob, note ,studentGender, 
                            parentName, parentDob, parentGender,  IDCard, phoneNumber, address, email } = enroll;
                            console.log("attachments",attachments);
                        const imageUrl = await UPLOADIMAGE.uploadBuffer(
                            attachments[0].content,
                            attachments[0].contentType
                        ); 

                        const newDataStu = new Student({
                            fullName: studentName,
                            gender: studentGender,
                            dob: studentDob,
                            address: address,
                            age: studentAge,
                            image: imageUrl,
                            note: note
                        });
                        const newStudent = await newDataStu.save();
                        const parent = await Parent.findOne({"IDCard": IDCard}).populate("account", "username");
                        console.log("🚀 ~ setImmediate ~ parent:", parent)
                        if(!parent){
                            const username = await generateUsername(parentName);
                            const newDataAcc = new Account({
                                username: username,
                                password: PASSWORD_DEFAULT,
                            });
                            const newAcc = await newDataAcc.save();


                            const newDataPa = new Parent({
                                fullName: parentName,
                                dob: parentDob,
                                gender: parentGender,
                                phoneNumber: phoneNumber,
                                email: email,
                                IDCard: IDCard,
                                address: address,
                                account: newAcc._id,
                                student: newStudent._id
                            })
                            const newParent = await newDataPa.save();
                            mailSent.send(
                                email,
                                '',
                                "THÔNG BÁO NHẬP HỌC THÀNH CÔNG",
                                `
                            <!DOCTYPE html>
                            <html lang="vi">
                            <head>
                                <meta charset="UTF-8" />
                                <style>
                                    body {
                                        font-family: Arial, sans-serif;
                                        background-color: #f4f6f8;
                                        padding: 20px;
                                        color: #333;
                                    }

                                    .email-container {
                                        background-color: #ffffff;
                                        border-radius: 8px;
                                        padding: 24px;
                                        max-width: 600px;
                                        margin: auto;
                                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                                    }

                                    h2 {
                                        color: #27ae60;
                                    }

                                    p {
                                        font-size: 16px;
                                        line-height: 1.5;
                                    }

                                    .account-info {
                                        background-color: #ecf9f1;
                                        padding: 12px;
                                        border-radius: 6px;
                                        margin: 16px 0;
                                        font-weight: bold;
                                    }

                                    .footer {
                                        margin-top: 32px;
                                        font-size: 14px;
                                        color: #888;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="email-container">
                                    <h2>Thông báo nhập học thành công</h2>
                                    <p>Kính gửi Anh/Chị,</p>
                                    <p>
                                        Nhà trường xin trân trọng thông báo rằng hồ sơ nhập học của Anh/Chị cho học sinh
                                        đã được tiếp nhận và xác nhận thành công.
                                    </p>
                                    <p>
                                        Dưới đây là thông tin tài khoản để truy cập vào hệ thống của Nhà trường:
                                    </p>
                                    <div class="account-info">
                                        Tên đăng nhập: <span style="color: #2980b9;">${username}</span><br />
                                        Mật khẩu tạm thời: <span style="color: #c0392b;">${PASSWORD_DEFAULT}</span>
                                    </div>
                                    <p>
                                        Vui lòng đăng nhập và thay đổi mật khẩu sau lần đăng nhập đầu tiên để đảm bảo bảo mật thông tin.
                                    </p>
                                    <p>
                                        Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với phòng Tuyển sinh để được hỗ trợ.
                                    </p>
                                    <p>
                                        Trân trọng,<br />
                                        <strong>Phòng Tuyển sinh</strong><br />
                                        Nhà trường
                                    </p>
                                    <div class="footer">
                                        (Email này được gửi tự động, vui lòng không phản hồi)
                                    </div>
                                </div>
                            </body>
                            </html>
                            `,
                                '',
                                () => {
                                    console.log(`✅ Mail gửi thành công đến email: ${email}`);
                                }
                            );
                        } else {
                            const username = parent.account.username;
                            await Parent.updateOne(
                                { _id: parent._id },
                                { $push: { student: newStudent._id } }
                            );
                            mailSent.send(
                                email,
                                '',
                                "THÔNG BÁO NHẬP HỌC THÀNH CÔNG",
                                `
                                <!DOCTYPE html>
                                <html lang="vi">
                                <head>
                                    <meta charset="UTF-8" />
                                    <style>
                                        body {
                                            font-family: Arial, sans-serif;
                                            background-color: #f4f6f8;
                                            padding: 20px;
                                            color: #333;
                                        }

                                        .email-container {
                                            background-color: #ffffff;
                                            border-radius: 8px;
                                            padding: 24px;
                                            max-width: 600px;
                                            margin: auto;
                                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                                        }

                                        h2 {
                                            color: #27ae60;
                                        }

                                        p {
                                            font-size: 16px;
                                            line-height: 1.5;
                                        }

                                        .account-info {
                                            background-color: #ecf9f1;
                                            padding: 12px;
                                            border-radius: 6px;
                                            margin: 16px 0;
                                            font-weight: bold;
                                        }

                                        .footer {
                                            margin-top: 32px;
                                            font-size: 14px;
                                            color: #888;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <div class="email-container">
                                        <h2>Thông báo nhập học thành công</h2>
                                        <p>Kính gửi Anh/Chị,</p>
                                        <p>
                                            Nhà trường xin trân trọng thông báo rằng hồ sơ nhập học của Anh/Chị cho học sinh
                                            đã được tiếp nhận và xác nhận thành công.
                                        </p>
                                        <p>
                                            Tài khoản hiện tại của Anh/Chị đã được ghi nhận vào hệ thống và có thể sử dụng để theo dõi quá trình học tập của học sinh.
                                        </p>
                                        <div class="account-info">
                                            Tên đăng nhập: <span style="color: #2980b9;">${username}</span>
                                        </div>
                                        <p>
                                            Nếu Anh/Chị quên mật khẩu, có thể sử dụng chức năng "Quên mật khẩu" để đặt lại.
                                        </p>
                                        <p>
                                            Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với phòng Tuyển sinh để được hỗ trợ.
                                        </p>
                                        <p>
                                            Trân trọng,<br />
                                            <strong>Phòng Tuyển sinh</strong><br />
                                            Nhà trường
                                        </p>
                                        <div class="footer">
                                            (Email này được gửi tự động, vui lòng không phản hồi)
                                        </div>
                                    </div>
                                </body>
                                </html>
                                `,
                                '',
                                () => {
                                    console.log(`✅ Mail gửi thành công đến email: ${email}`);
                                }
                            );

                        }

                        await EnrollSChool.updateOne({ _id: enroll._id }, { state: STATE.FINISHED });
                    }
                }
            }
            await EnrollSChool.updateMany({ state: STATE.WAITING_PROCESSING }, { state: STATE.WAITING_CONFIRM });

        })


    } catch (error) {
        res.status(HTTP_STATUS.SERVER_ERROR).json({ message: error.message });
    }
}