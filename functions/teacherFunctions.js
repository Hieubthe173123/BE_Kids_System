const { app } = require('@azure/functions');
const connectDB = require("../shared/mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE } = require('../src/constants/useConstants');
const { PASSWORD_DEFAULT, IMAGE_CONFIG, IMAP_CONFIG, SMTP_CONFIG, NOTIFICATION_SUBJECT_TEACHER } = require('../src/constants/mailConstants.js');
const path = require('path');
const ejs = require('ejs');
const Class = require('../src/models/classModel');
const Teacher = require('../src/models/teacherModel');
const Parent = require('../src/models/parentModel');
const Schedule = require("../src/models/scheduleModel.js");
const Account = require('../src/models/accountModel');
const DailySchedule = require("../src/models/dailyscheduleModel.js");
const jwt = require("jsonwebtoken");
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "wdp_301";
const SMTP = require('../src/helper/stmpHepler');
const IMAP = require('../src/helper/iMapHelper');
const { generateUsername } = require('../src/helper/index');


// ===== HELPER FUNCTIONS =====
const getDatesInWeek = (year, weekNumber) => {
    const firstDayOfYear = new Date(year, 0, 1);
    const dayOfWeekJan1 = firstDayOfYear.getDay(); // 0=Chủ Nhật, 1=Thứ Hai, ..., 6=Thứ Bảy

    // Tạo một bản sao để tính toán
    let firstMonday = new Date(firstDayOfYear);

    // Tính toán để tìm ra ngày Thứ Hai đầu tiên của năm.
    // Logic: tìm ngày cần cộng thêm vào ngày 1/1 để ra Thứ Hai.
    if (dayOfWeekJan1 === 1) {
        // Nếu ngày 1/1 là Thứ Hai, không cần cộng gì cả.
    } else if (dayOfWeekJan1 === 0) { // Nếu là Chủ Nhật (giá trị 0)
        firstMonday.setDate(1 + 1); // Cộng 1 ngày để đến Thứ Hai
    } else { // Nếu là các ngày từ Thứ Ba -> Thứ Bảy (giá trị 2 -> 6)
        firstMonday.setDate(1 + (8 - dayOfWeekJan1)); // Cộng số ngày còn lại để đến Thứ Hai của tuần sau
    }

    // firstMonday giờ đây là ngày Thứ Hai đầu tiên nằm trong năm `year`
    // Đây là mốc bắt đầu của tuần 1.

    // Lấy ngày Thứ Hai của tuần mục tiêu bằng cách cộng thêm (tuần - 1) * 7 ngày
    const targetMonday = new Date(firstMonday);
    targetMonday.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

    const weekDates = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Lặp để lấy 5 ngày trong tuần
    for (let i = 0; i < 5; i++) {
        const currentDate = new Date(targetMonday);
        currentDate.setDate(targetMonday.getDate() + i);

        // Định dạng ngày thành chuỗi "YYYY-MM-DD"
        const yyyy = currentDate.getFullYear();
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDate.getDate()).padStart(2, '0');

        weekDates[days[i]] = `${yyyy}-${mm}-${dd}`;
    }

    return weekDates;
};

// ===== CRUD APIs =====

app.http('getAllTeachers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'teacher',
    handler: async (request, context) => {
        try {
            await connectDB();
            const teachers = await Teacher.find({ status: true });
            return { status: 200, jsonBody: { data: teachers } };
        } catch (err) {
            context.log("Lỗi khi lấy danh sách giáo viên:", err);
            return { status: 500, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

app.http('createTeacher', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'teacher',
    handler: async (request, context) => {
        try {
            await connectDB();
            const body = await request.json();
            const { fullName, dob, gender, phoneNumber, email, IDCard, address } = body
            const baseUsername = await generateUsername(fullName);
            const username = `${baseUsername}${Math.floor(10 + Math.random() * 90)}`;
            const newAcc = await new Account({
                username,
                password: PASSWORD_DEFAULT,
                role: 'teacher',
            }).save();
            const newTeacher = new Teacher({
                fullName,
                dob,
                gender,
                phoneNumber,
                email,
                IDCard,
                address,
                account: newAcc._id
            });

            const savedTeacher = await newTeacher.save();
            setImmediate(async () => {
                try {
                    const templatePath = path.join(__dirname, '..', 'templates', 'mailAccountTeacher.ejs');
                    const htmlConfirm = await ejs.renderFile(templatePath, {
                        fullName: fullName,
                        username: username,
                        password: PASSWORD_DEFAULT
                    });
                    const mail = new SMTP(SMTP_CONFIG);
                    mail.send(email, '', NOTIFICATION_SUBJECT_TEACHER, htmlConfirm, '', () => {
                        context.log(`✅ Mail gửi thành công đến email : ${email}`);
                    });
                } catch (emailError) {
                    context.log("Lỗi khi gửi email xác nhận:", emailError);
                }
            });
            return { status: 201, jsonBody: savedTeacher };
            c

        } catch (err) {
            context.log("Lỗi khi tạo giáo viên:", err);
            return { status: 400, jsonBody: { message: err.message } };
        }
    }
});

app.http('updateTeacher', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'teacher/update-teacher/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const body = await request.json();
            const updatedTeacher = await Teacher.findByIdAndUpdate(id, body, { new: true });
            if (!updatedTeacher) {
                return { status: 404, jsonBody: { message: "Không tìm thấy giáo viên" } };
            }
            return { status: 200, jsonBody: updatedTeacher };
        } catch (err) {
            context.log("Lỗi khi cập nhật giáo viên:", err);
            return { status: 400, jsonBody: { message: err.message } };
        }
    }
});

app.http('deleteTeacher', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'teacher/delete-teacher/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const errorList = [];
            const data = await Teacher.findById(id);
            if (!data) {
                errorList.push({ message: "Không tìm thấy dữ liệu" });
            }
            const isTeaching = await Class.findOne({ teacher: id });
            if (isTeaching) {
                errorList.push({ message: `Giáo viên này đang dạy lớp ${isTeaching.className}` });
            }
            if (errorList.length > 0) {
                return { status: HTTP_STATUS.BAD_REQUEST, jsonBody: errorList };
            }
            data.status = false;
            await data.save();
            return { status: HTTP_STATUS.OK, jsonBody: { message: RESPONSE_MESSAGE.DELETED } };
        } catch (error) {
            context.log("deleteTeacher error:", error);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: "Lỗi server" } };
        }
    }
});

// ===== Teacher Specific Logic =====

app.http('getClassesForTeacher2', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'teacher/classes',
    handler: async (request, context) => {
        try {
            await connectDB();
            const authHeader = request.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return { status: 401, jsonBody: { message: "Yêu cầu xác thực không hợp lệ." } };
            }
            const token = authHeader.split(' ')[1];
            const payload = jwt.verify(token, ACCESS_SECRET);
            const teacherAccountId = payload.id;

            const teacher = await Teacher.findOne({ account: teacherAccountId });
            if (!teacher) {
                return { status: 404, jsonBody: { message: 'Không tìm thấy giáo viên' } };
            }

            const classes = await Class.find({ teacher: { $in: [teacher._id] }, status: true })
                .populate('room', 'roomName')
                .populate('students', 'fullName studentCode age gender')
                .select('-__v');

            return {
                status: 200,
                jsonBody: {
                    message: 'Lấy danh sách lớp thành công',
                    data: {
                        teacher: { _id: teacher._id, fullName: teacher.fullName, teacherCode: teacher.teacherCode },
                        classes: classes.map(cls => ({ ...cls.toObject(), studentCount: cls.students.length }))
                    }
                }
            };
        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return { status: 401, jsonBody: { message: "Token không hợp lệ hoặc đã hết hạn" } };
            }
            context.log('getClasses error:', error);
            return { status: 500, jsonBody: { message: 'Lỗi server' } };
        }
    }
});

app.http('getClassesForTeacher', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'teacher/class-teacher',
    handler: async (request, context) => {
        try {
            await connectDB();
            const authHeader = request.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return { status: 401, jsonBody: { message: "Yêu cầu xác thực không hợp lệ." } };
            }

            const token = authHeader.split(' ')[1];

            let payload;
            try {
                payload = jwt.verify(token, ACCESS_SECRET);
            } catch (error) {
                return { status: 403, jsonBody: { message: "Token không hợp lệ hoặc đã hết hạn." } };
            }
            const teacherAccountId = payload.id;
            const teacher = await Teacher.findOne({ account: teacherAccountId });

            if (!teacher) {
                return { status: 404, jsonBody: { message: 'Không tìm thấy giáo viên.' } };
            }
            const classes = await Class.find({ teacher: teacher._id, status: true })
                .populate('room', 'roomName')
                .populate('students', 'fullName studentCode age gender')
                .select('-__v');

            return {
                status: 200,
                jsonBody: {
                    message: 'Lấy danh sách lớp thành công',
                    data: {
                        classes: classes.map(cls => ({
                            ...cls.toObject(),
                            studentCount: cls.students.length
                        }))
                    }
                }
            };
        } catch (error) {
            context.log('getClasses error:', error);
            return { status: 500, jsonBody: { message: 'Lỗi server' } };
        }
    }
});


app.http('getStudentsInClassForTeacher', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'teacher/students/{classId}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const authHeader = request.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return { status: 401, jsonBody: { message: "Yêu cầu xác thực không hợp lệ." } };
            }
            const token = authHeader.split(' ')[1];
            const payload = jwt.verify(token, ACCESS_SECRET);
            const teacherAccountId = payload.id;
            const { classId } = request.params;

            const teacher = await Teacher.findOne({ account: teacherAccountId });
            if (!teacher) {
                return { status: 404, jsonBody: { message: 'Không tìm thấy giáo viên' } };
            }

            const classData = await Class.findOne({ _id: classId, teacher: teacher._id, status: true })
                .populate({ path: 'students', match: { status: true } });

            if (!classData) {
                return { status: 404, jsonBody: { message: 'Không tìm thấy lớp hoặc bạn không có quyền truy cập' } };
            }

            const studentList = await Promise.all(classData.students.map(async (student) => {
                const parent = await Parent.findOne({ student: student._id }).select('fullName phoneNumber email');
                return { ...student.toObject(), parent: parent || null };
            }));

            return {
                status: 200,
                jsonBody: {
                    message: 'Lấy danh sách học sinh thành công',
                    data: {
                        class: { _id: classData._id, className: classData.className },
                        students: studentList
                    }
                }
            };
        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return { status: 401, jsonBody: { message: "Token không hợp lệ hoặc đã hết hạn" } };
            }
            context.log('getStudents error:', error);
            return { status: 500, jsonBody: { message: 'Lỗi server' } };
        }
    }
});


app.http('getTeacherInClass', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'teacher/teacherinclass/{classId}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { classId } = request.params;

            if (!classId) {
                return { status: 400, jsonBody: { message: "Vui lòng cung cấp classId" } };
            }

            const classData = await Class.findById(classId).populate("teacher");

            if (!classData) {
                return { status: 404, jsonBody: { message: "Không tìm thấy lớp" } };
            }

            // Dù `teacher` là một object hay một mảng, cũng chuẩn hóa để luôn trả về một mảng
            const teachers = classData.teacher;
            let teacherArray = [];

            if (teachers) {
                if (Array.isArray(teachers)) {
                    teacherArray = teachers;
                } else {
                    teacherArray = [teachers]; // Bọc object vào mảng
                }
            }

            // Luôn trả về một mảng
            return { status: 200, jsonBody: teacherArray };

        } catch (error) {
            context.log("getTeacherInClass error:", error.message);
            return { status: 500, jsonBody: { message: "Lỗi server" } };
        }
    }
});

// ===== SCHEDULE LOGIC =====

app.http('getWeeklyScheduleForTeacher', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'teacher/schedule/{classId}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { classId } = request.params;
            const year = request.query.get('year');
            const week = request.query.get('week');

            if (!classId || !year || !week) {
                return { status: 400, jsonBody: { message: "Thiếu tham số classId, year hoặc week" } };
            }

            const mainSchedule = await Schedule.findOne({ class: classId })
                .populate("schedule.Monday.curriculum", "activityName activityFixed age")
                .populate("schedule.Tuesday.curriculum", "activityName activityFixed age")
                .populate("schedule.Wednesday.curriculum", "activityName activityFixed age")
                .populate("schedule.Thursday.curriculum", "activityName activityFixed age")
                .populate("schedule.Friday.curriculum", "activityName activityFixed age")
                .populate("class", "className classAge schoolYear room");

            if (!mainSchedule) {
                return { status: 404, jsonBody: { message: "Không tìm thấy thời khóa biểu" } };
            }

            const datesInWeek = getDatesInWeek(parseInt(year), parseInt(week));

            const overrideDates = Object.values(datesInWeek);
            const overrides = await DailySchedule.find({ class: classId, date: { $in: overrideDates } }).populate("curriculum", "activityName activityFixed age");

            const overrideMap = {};
            overrides.forEach(item => {
                const dateStr = new Date(item.date).toISOString().split('T')[0];
                if (!overrideMap[dateStr]) overrideMap[dateStr] = {};
                overrideMap[dateStr][item.time] = item.curriculum;
            });

            const normalizeTime = (str) => str.replace(/\s+/g, '').replace(/[–—]/g, '-');
            const finalSchedule = {};

            for (const [day, dateStr] of Object.entries(datesInWeek)) {
                const dailySchedule = mainSchedule.schedule[day] || [];
                finalSchedule[day] = dailySchedule.map((item) => {
                    const timeKey = normalizeTime(item.time);
                    const overrideCurriculum = overrideMap[dateStr]?.[timeKey];
                    return {
                        time: item.time,
                        fixed: item.fixed,
                        curriculum: overrideCurriculum || item.curriculum,
                        isSwapped: !!overrideCurriculum,
                    };
                });
            }

            return { status: 200, jsonBody: { class: mainSchedule.class, week: { year, week }, datesInWeek, schedule: finalSchedule } };
        } catch (err) {
            context.log("getWeeklyScheduleForTeacher error:", err);
            return { status: 500, jsonBody: { message: "Lỗi server" } };
        }
    }
});

// app.http('swapSchedule', {
//     methods: ['POST'],
//     authLevel: 'anonymous',
//     route: 'teacher/schedule/swap',
//     handler: async (request, context) => {
//         try {
//             await connectDB();
//             const { classId, date1, date2, time1, time2 } = await request.json();

//             if (!classId || !date1 || !date2 || !time1 || !time2) {
//                 return { status: 400, jsonBody: { message: "Thiếu thông tin đổi tiết" } };
//             }

//             const getWeekday = (date) => new Date(date).toLocaleDateString("en-US", { weekday: "long" });
//             const weekday1 = getWeekday(date1);
//             const weekday2 = getWeekday(date2);

//             const schedule = await Schedule.findOne({ class: classId }).populate("schedule.Monday.curriculum").populate("schedule.Tuesday.curriculum").populate("schedule.Wednesday.curriculum").populate("schedule.Thursday.curriculum").populate("schedule.Friday.curriculum");
//             if (!schedule) {
//                 return { status: 404, jsonBody: { message: "Không tìm thấy thời khóa biểu chính" } };
//             }

//             const dailyOverrides = await DailySchedule.find({ class: classId, date: { $in: [date1, date2] }, time: { $in: [time1, time2] } }).populate("curriculum");
//             const overrideMap = {};
//             dailyOverrides.forEach(d => { overrideMap[`${new Date(d.date).toISOString().split('T')[0]}-${d.time}`] = d.curriculum; });

//             const findSlot = (date, weekday, time) => {
//                 const override = overrideMap[`${date}-${time}`];
//                 if (override) return { time, curriculum: override, fixed: override.activityFixed };
//                 const slot = schedule.schedule[weekday]?.find((s) => s.time === time);
//                 if (!slot) return null;
//                 return { time, curriculum: slot.curriculum, fixed: slot.fixed || slot.curriculum.activityFixed };
//             };

//             const slot1 = findSlot(date1, weekday1, time1);
//             const slot2 = findSlot(date2, weekday2, time2);

//             if (!slot1 || !slot2) {
//                 return { status: 404, jsonBody: { message: "Không tìm thấy tiết học cần đổi" } };
//             }
//             if (slot1.fixed || slot2.fixed) {
//                 return { status: 400, jsonBody: { message: "Chỉ được đổi các tiết không cố định" } };
//             }

//             await Promise.all([
//                 DailySchedule.findOneAndUpdate({ class: classId, date: date1, time: time1 }, { curriculum: slot2.curriculum._id }, { new: true, upsert: true }),
//                 DailySchedule.findOneAndUpdate({ class: classId, date: date2, time: time2 }, { curriculum: slot1.curriculum._id }, { new: true, upsert: true })
//             ]);

//             return { status: 200, jsonBody: { message: "Đổi tiết giữa hai ngày thành công" } };
//         } catch (err) {
//             context.log("swapSchedule error:", err);
//             return { status: 500, jsonBody: { message: "Lỗi server" } };
//         }
//     }
// });
