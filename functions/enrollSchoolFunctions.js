const { app } = require('@azure/functions');
const connectDB = require("../shared/mongoose");
const moment = require('moment');
const path = require('path');
const ejs = require('ejs');

const { HTTP_STATUS, RESPONSE_MESSAGE, STATE, NUMBER_STUDENT_IN_CLASS } = require('../src/constants/useConstants');
const { SMTP_CONFIG, NOTIFICATION_SUBJECT, IMAP_CONFIG, ERROR_SENT_MAIL, PASSWORD_DEFAULT, SUCCESS_ENROLL } = require('../src/constants/mailConstants');

const EnrollSChool = require('../src/models/enrollSchoolModel');
const Parent = require('../src/models/parentModel');
const Student = require('../src/models/studentModel');
const Account = require('../src/models/accountModel');
const Room = require('../src/models/roomModel');

const SMTP = require('../src/helper/stmpHepler');
const IMAP = require('../src/helper/iMapHelper');
const UPLOADIMAGE = require('../src/helper/uploadImageHelper');
const { generateUsername } = require('../src/helper/index');

app.http('createEnrollSchool', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'enrollSchool',
    handler: async (request, context) => {
        try {
            await connectDB();
            const body = await request.json();
            const { studentName, studentAge, studentDob, studentGender,
                parentName, parentDob, parentGender, IDCard, address, phoneNumber,
                email, relationship, reason, note } = body;

            const numberStudentList = await Student.countDocuments({ status: true });
            const countRoom = await Room.countDocuments({ status: true });
            const numberAvailableList = countRoom * NUMBER_STUDENT_IN_CLASS;

            if (numberStudentList >= numberAvailableList) {
                return { status: HTTP_STATUS.BAD_REQUEST, jsonBody: { message: 'Số lượng học sinh đã vượt quá chỉ tiêu tuyển sinh' } };
            }

            const today = moment().format('YYYYMMDD');
            const prefix = `STUEN-${today}`;
            const countToday = await EnrollSChool.countDocuments({ enrollCode: { $regex: `^${prefix}` } });
            const nextNumber = (countToday + 1).toString().padStart(3, '0');
            const enrollCode = `${prefix}${nextNumber}`;

            const newData = new EnrollSChool({
                studentName, studentAge, studentDob, studentGender,
                parentName, parentGender, parentDob, IDCard, address, phoneNumber,
                email, relationship, reason, note, enrollCode
            });

            const savedData = await newData.save();
            setImmediate(async () => {
                try {
                    const templatePath = path.join(__dirname, '..', 'templates', 'mailConfirmInfo.ejs');
                    const htmlConfirm = await ejs.renderFile(templatePath, {
                        parentName: savedData.parentName,
                        studentName: savedData.studentName,
                        enrollCode: savedData.enrollCode
                    });
                    const mail = new SMTP(SMTP_CONFIG);
                    mail.send(email, '', NOTIFICATION_SUBJECT, htmlConfirm, '', () => {
                        context.log(`✅ Mail gửi thành công đến email : ${email}`);
                    });
                } catch (emailError) {
                    context.log("Lỗi khi gửi email xác nhận:", emailError);
                }
            });

            return { status: HTTP_STATUS.CREATED, jsonBody: { message: RESPONSE_MESSAGE.CREATED, data: savedData } };

        } catch (error) {
            context.log(error);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: error.message } };
        }
    }
});
// app.http('processEnrollSchoolAll', {
//     methods: ['POST'],
//     authLevel: 'anonymous',
//     route: 'enrollSchool/process-enroll',
//     handler: async (request, context) => {
//         try {
//             await connectDB();
//             const enrollSchoolList = await EnrollSChool.find({
//                 state: { $in: [STATE.WAITING_CONFIRM, STATE.ERROR] }
//             });

//             if (enrollSchoolList.length < 1) {
//                 return {
//                     status: HTTP_STATUS.NOT_FOUND,
//                     jsonBody: {
//                         message: `Không tìm thấy đơn đăng ký nào có trạng thái là Chờ xác nhận hoặc Xử lý lỗi`
//                     }
//                 };
//             }

//             const mail = new IMAP(IMAP_CONFIG);
//             const mailSent = new SMTP(SMTP_CONFIG);
//             const messages = await mail.readMail('INBOX', ['UNSEEN'], true);

//             for (const message of messages) {
//                 const { from, subject, attachments } = message;
//                 if (!subject || !from || !from.value || !from.value[0]) continue;

//                 const enrollCode = subject.split(" - ")[1];
//                 const email = from.value[0].address;

//                 if (!enrollCode) continue;

//                 const enroll = await EnrollSChool.findOne({ enrollCode });
//                 if (!enroll) {
//                     context.log(`Không tìm thấy đơn đăng ký với mã: ${enrollCode}`);
//                     continue;
//                 }

//                 await EnrollSChool.updateOne({ enrollCode }, { state: STATE.WAITING_PROCESSING });

//                 if (subject.toUpperCase() === `${NOTIFICATION_SUBJECT.toUpperCase()} - ${enrollCode}`) {
//                     if (!attachments || attachments.length === 0) {
//                         const htmlErrorPath = path.join(__dirname, '..', 'templates', 'mailErrorImage.ejs');
//                         const htmlError = await ejs.renderFile(htmlErrorPath);
//                         await EnrollSChool.updateOne({ enrollCode }, { state: STATE.ERROR });
//                         await mailSent.send(email, '', ERROR_SENT_MAIL, htmlError);
//                         context.log(`✅ Mail báo lỗi (thiếu ảnh) đã gửi tới: ${email}`);
//                     } else {
//                         const {
//                             studentName, studentAge, studentDob, note, studentGender,
//                             parentName, parentDob, parentGender, IDCard, phoneNumber, address
//                         } = enroll;

//                         const imageUrl = await UPLOADIMAGE.uploadBuffer(attachments[0].content, attachments[0].contentType);

//                         const today = moment().format('YY');
//                         const prefix = `STU-${today}`;
//                         const countToday = await Student.countDocuments({ studentCode: { $regex: `^${prefix}` } });
//                         const studentCode = `${prefix}${String(countToday + 1).padStart(3, '0')}`;

//                         const newStudent = await new Student({
//                             studentCode,
//                             fullName: studentName,
//                             gender: studentGender,
//                             dob: studentDob,
//                             address,
//                             age: studentAge,
//                             image: imageUrl,
//                             note
//                         }).save();

//                         const parent = await Parent.findOne({ IDCard }).populate("account", "username");

//                         if (!parent) {
//                             const baseUsername = await generateUsername(parentName);
//                             const randomSuffix = Math.floor(10 + Math.random() * 90);
//                             const username = `${baseUsername}${randomSuffix}`;

//                             const newAcc = await new Account({ username, password: PASSWORD_DEFAULT }).save();
//                             await new Parent({
//                                 fullName: parentName, dob: parentDob, gender: parentGender,
//                                 phoneNumber, email, IDCard, address,
//                                 account: newAcc._id, student: [newStudent._id]
//                             }).save();

//                             const htmlPath = path.join(__dirname, '..', 'templates', 'mailSuccessNoAcc.ejs');
//                             const htmlContent = await ejs.renderFile(htmlPath, {
//                                 username, password: PASSWORD_DEFAULT, studentCode
//                             });

//                             await mailSent.send(email, '', SUCCESS_ENROLL, htmlContent);
//                             context.log(`✅ Mail nhập học thành công (tài khoản mới) đã gửi tới: ${email}`);
//                         } else {
//                             await Parent.updateOne({ _id: parent._id }, { $push: { student: newStudent._id } });

//                             const htmlPath = path.join(__dirname, '..', 'templates', 'mailSuccessAcc.ejs');
//                             const htmlContent = await ejs.renderFile(htmlPath, {
//                                 username: parent.account.username, studentCode
//                             });

//                             await mailSent.send(email, '', SUCCESS_ENROLL, htmlContent);
//                             context.log(`✅ Mail nhập học thành công (tài khoản cũ) đã gửi tới: ${email}`);
//                         }

//                         await EnrollSChool.updateOne({ _id: enroll._id }, { state: STATE.FINISHED });
//                     }
//                 }
//             }

//             context.log("--------------------- Kết thúc Bot xử lý Email ---------------------");

//             return {
//                 status: HTTP_STATUS.OK,
//                 jsonBody: { message: "Đã xử lý tất cả đơn đăng ký và gửi mail thông báo." }
//             };

//         } catch (error) {
//             context.log("Lỗi trong function:", error);
//             return {
//                 status: HTTP_STATUS.SERVER_ERROR,
//                 jsonBody: { message: error.message }
//             };
//         }
//     }
// });


app.http('processEnrollSchoolAll', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'enrollSchool/process-enroll',
    handler: async (request, context) => {
        try {
            await connectDB();
            const enrollSchoolList = await EnrollSChool.find({
                state: { $in: [STATE.WAITING_CONFIRM, STATE.ERROR] }
            });

            if (enrollSchoolList.length < 1) {
                return {
                    status: HTTP_STATUS.NOT_FOUND,
                    jsonBody: {
                        message: `${RESPONSE_MESSAGE.NOT_FOUND} có trạng thái là Chờ xác nhận hoặc Xử lý lỗi`
                    }
                };
            }

            context.log("✅ Danh sách enrollSchool tìm được:", enrollSchoolList.length);
            const response = {
                status: HTTP_STATUS.OK,
                jsonBody: {
                    message: RESPONSE_MESSAGE.SUCCESS,
                    data: enrollSchoolList,
                }
            };
            
            setImmediate(async () => {
                const mail = new IMAP(IMAP_CONFIG);
                const mailSent = new SMTP(SMTP_CONFIG);
                console.log("---------------------Start Bot ---------------------");
                let searchOptions = ['UNSEEN'];
                const messages = await mail.readMail('INBOX', searchOptions, true);

                for (const message of messages) {
                    let {
                        from, subject, attachments
                    } = message;

                    const enrollCode = subject.split(" - ")[1];
                    const email = from.value[0].address;
                    await EnrollSChool.updateOne({ enrollCode }, { state: STATE.WAITING_PROCESSING });
                    const enroll = await EnrollSChool.findOne({ enrollCode, state: STATE.WAITING_PROCESSING });

                    if (subject && subject.toUpperCase() === `${NOTIFICATION_SUBJECT} - ${enrollCode}`) {
                        if (attachments[0] === undefined) {
                            const htmlErrorPath = path.join(__dirname, '..', 'templates', 'mailErrorImage.ejs');
                            const htmlError = await ejs.renderFile(htmlErrorPath);

                            await EnrollSChool.updateOne({ enrollCode }, { state: STATE.ERROR });
                            mailSent.send(
                                email,
                                '',
                                ERROR_SENT_MAIL,
                                htmlError,
                                '',
                                () => console.log(`✅ Mail gửi thành công đến email : ${email}`)
                            );
                        } else {
                            const {
                                studentName, studentAge, studentDob, note, studentGender,
                                parentName, parentDob, parentGender, IDCard, phoneNumber, address
                            } = enroll;

                            const imageUrl = await UPLOADIMAGE.uploadBuffer(
                                attachments[0].content,
                                attachments[0].contentType
                            );

                            const today = moment().format('YY');
                            const prefix = `STU-${today}`;
                            const countToday = await Student.countDocuments({ studentCode: { $regex: `^${prefix}` } });
                            const paddedNumber = String(countToday + 1).padStart(3, '0');
                            const studentCode = `${prefix}${paddedNumber}`;

                            const newStudent = await new Student({
                                studentCode,
                                fullName: studentName,
                                gender: studentGender,
                                dob: studentDob,
                                address,
                                age: studentAge,
                                image: imageUrl,
                                note
                            }).save();

                            const parent = await Parent.findOne({ IDCard }).populate("account", "username");

                            if (!parent) {
                                const baseUsername = await generateUsername(parentName);
                                const username = `${baseUsername}${Math.floor(10 + Math.random() * 90)}`;

                                const htmlPath = path.join(__dirname, '..', 'templates', 'mailSuccessNoAcc.ejs');
                                const html = await ejs.renderFile(htmlPath, {
                                    parentName,
                                    username,
                                    password: PASSWORD_DEFAULT,
                                    studentName
                                });

                                const newAcc = await new Account({
                                    username,
                                    password: PASSWORD_DEFAULT
                                }).save();

                                await new Parent({
                                    fullName: parentName,
                                    dob: parentDob,
                                    gender: parentGender,
                                    phoneNumber,
                                    email,
                                    IDCard,
                                    address,
                                    account: newAcc._id,
                                    student: newStudent._id
                                }).save();

                                mailSent.send(email, '', SUCCESS_ENROLL, html, '', () => {
                                    console.log(`✅ Mail gửi thành công đến mail: ${email}`);
                                });

                            } else {
                                const username = parent.account.username;

                                const htmlPath = path.join(__dirname, '..', 'templates', 'mailSuccessAcc.ejs');
                                const html = await ejs.renderFile(htmlPath, {
                                    parentName,
                                    username,
                                    studentName
                                });

                                await Parent.updateOne(
                                    { _id: parent._id },
                                    { $push: { student: newStudent._id } }
                                );

                                mailSent.send(email, '', SUCCESS_ENROLL, html, '', () => {
                                    console.log(`✅ Mail gửi thành công đến email: ${email}`);
                                });
                            }

                            await EnrollSChool.updateOne({ _id: enroll._id }, { state: STATE.FINISHED });
                        }
                    }
                }
            });

            return response;

        } catch (error) {
            context.log("❌ Lỗi trong quá trình xử lý:", error);
            return {
                status: HTTP_STATUS.SERVER_ERROR,
                jsonBody: { message: error.message }
            };
        }
    }
});



app.http('getAllEnrollments', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'enrollSchool',
    handler: async (request, context) => {
        try {
            await connectDB();
            const enrollments = await EnrollSChool.find({});
            return { status: HTTP_STATUS.OK, jsonBody: { data: enrollments } };
        } catch (error) {
            context.log(error);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: error.message } };
        }
    }
});

