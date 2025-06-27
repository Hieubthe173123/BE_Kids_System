const { Model } = require("mongoose");
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS, STATE } = require('../constants/useConstants');
const { SMTP_CONFIG, NOTIFICATION_SUBJECT, IMAP_CONFIG, ERROR_SENT_MAIL, PASSWORD_DEFAULT, SUCCESS_ENROLL } = require('../constants/mailConstants');

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

        setImmediate(async () => {
            const templatePath = path.join(__dirname, '..', 'templates', 'mailConfirmInfo.ejs');

            const htmlConfirm = await ejs.renderFile(templatePath, {
                parentName: savedData.parentName,
                studentName: savedData.studentName,
                enrollCode: savedData.enrollCode
            });

            const mail = new SMTP(SMTP_CONFIG);
            mail.send(
                email,
                '',
                NOTIFICATION_SUBJECT,
                htmlConfirm,
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
        const enrollSchoolList = await EnrollSChool.find({ state: STATE.WAITING_CONFIRM });
        if (enrollSchoolList.length < 1) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: `${RESPONSE_MESSAGE.NOT_FOUND} có trạng thái là Chờ xác nhận`
            });
        }

        res.status(HTTP_STATUS.OK).json({
            message: RESPONSE_MESSAGE.SUCCESS,
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
                await EnrollSChool.updateOne({ enrollCode: enrollCode}, {state: STATE.WAITING_PROCESSING});
                const enroll = await EnrollSChool.findOne({ enrollCode: enrollCode, state: STATE.WAITING_PROCESSING });

                if ( subject && subject.toUpperCase() === `${NOTIFICATION_SUBJECT} - ${enrollCode}`) {
                    if (attachments[0] === undefined) {

                        const htmlErrorPath = path.join(__dirname, '..', 'templates', 'mailErrorImage.ejs');
                        const htmlError = await ejs.renderFile(htmlErrorPath);

                        await EnrollSChool.updateOne({ enrollCode: enrollCode }, { state: STATE.ERROR });
                        mailSent.send(
                            email,
                            '',
                            ERROR_SENT_MAIL,
                            htmlError,
                            '',
                            () => {
                                console.log(`✅ Mail gửi thành công đến email : ${email}`);
                            }
                        );
                    } else {

                        const { studentName, studentAge, studentDob, note, studentGender,
                            parentName, parentDob, parentGender, IDCard, phoneNumber, address, email } = enroll;

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
                        const parent = await Parent.findOne({ "IDCard": IDCard }).populate("account", "username");
                        if (!parent) {
                            const username = await generateUsername(parentName);

                            const htmlPathSuccessNoAcc = path.join(__dirname, '..', 'templates', 'mailSuccessNoAcc.ejs');
                            const htmlSuccessNoAcc = await ejs.renderFile(htmlPathSuccessNoAcc, {
                                username: username,
                                password: PASSWORD_DEFAULT
                            });

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
                                `${SUCCESS_ENROLL}`,
                                htmlSuccessNoAcc,
                                '',
                                () => {
                                    console.log(`✅ Mail gửi thành công đến ssemail: ${email}`);
                                }
                            );
                        } else {
                            const username = parent.account.username;

                            const htmlPathSuccessAcc = path.join(__dirname, '..', 'templates', 'mailSuccessAcc.ejs');
                            const htmlSuccessAcc = await ejs.renderFile(htmlPathSuccessAcc, {
                                username: username,
                            });


                            await Parent.updateOne(
                                { _id: parent._id },
                                { $push: { student: newStudent._id } }
                            );
                            mailSent.send(
                                email,
                                '',
                                `${SUCCESS_ENROLL}`,
                                htmlSuccessAcc,
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

        })


    } catch (error) {
        res.status(HTTP_STATUS.SERVER_ERROR).json({ message: error.message });
    }
}