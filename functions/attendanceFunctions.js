const { app } = require('@azure/functions');
const connectDB = require("../shared/mongoose");
const Class = require('../src/models/classModel');
const Teacher = require('../src/models/teacherModel');
const Attendance = require("../src/models/attendanceModel.js");
const Schedule = require("../src/models/scheduleModel.js");
const DailySchedule = require("../src/models/dailyscheduleModel.js");
const jwt = require("jsonwebtoken");
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "wdp_301";


// ===== Attendance Logic =====

const getTodayString = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

app.http('getOrCreateTodayAttendanceForTeacher', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'teacher/attendance/{classId}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { classId } = request.params;
            const authHeader = request.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return { status: 401, jsonBody: { message: "Yêu cầu xác thực không hợp lệ." } };
            }
            const token = authHeader.split(' ')[1];
            const payload = jwt.verify(token, ACCESS_SECRET);
            const teacherAccountId = payload.id;

            const teacher = await Teacher.findOne({ account: teacherAccountId });
            if (!teacher) {
                return { status: 404, jsonBody: { message: "Không tìm thấy giáo viên" } };
            }

            const today = getTodayString();
            let attendanceRecords = await Attendance.find({ classId, date: today })
                .populate("studentId", "fullName studentCode")
                .populate("teacherId", "fullName");

            if (attendanceRecords.length === 0) {
                const classData = await Class.findById(classId).populate("students");
                if (!classData) {
                    return { status: 404, jsonBody: { message: "Không tìm thấy lớp" } };
                }

                const recordsToCreate = classData.students.map((student) => ({
                    classId,
                    studentId: student._id,
                    teacherId: teacher._id,
                    date: today,
                    status: "absent",
                    note: "",
                    checkInTime: "",
                    checkOutTime: "",
                }));

                if (recordsToCreate.length > 0) {
                    await Attendance.insertMany(recordsToCreate);
                }

                attendanceRecords = await Attendance.find({ classId, date: today })
                    .populate("studentId", "fullName studentCode")
                    .populate("teacherId", "fullName");
            }

            return { status: 200, jsonBody: { data: attendanceRecords } };
        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return { status: 401, jsonBody: { message: "Token không hợp lệ hoặc đã hết hạn" } };
            }
            context.log("Lỗi khi lấy điểm danh:", error);
            return { status: 500, jsonBody: { message: "Đã xảy ra lỗi khi lấy điểm danh" } };
        }
    }
});

app.http('bulkUpdateAttendance', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'teacher/bulk-update',
    handler: async (request, context) => {
        try {
            await connectDB();
            const updates = await request.json();
            const today = getTodayString();

            const bulkOps = updates
                .filter((r) => r.date === today)
                .map((record) => ({
                    updateOne: {
                        filter: { _id: record._id },
                        update: {
                            status: record.status,
                            note: record.note,
                            checkInTime: record.checkInTime,
                            checkOutTime: record.checkOutTime,
                        },
                    },
                }));

            if (bulkOps.length > 0) {
                await Attendance.bulkWrite(bulkOps);
            }

            return { status: 200, jsonBody: { message: "Cập nhật điểm danh thành công" } };
        } catch (err) {
            context.log("Lỗi khi cập nhật điểm danh:", err);
            return { status: 500, jsonBody: { message: "Lỗi khi cập nhật điểm danh" } };
        }
    }
});

app.http('getAttendanceByDate', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'teacher/attendance/history/{classId}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { classId } = request.params;
            const date = request.query.get('date');

            if (!date) {
                return { status: 400, jsonBody: { message: "Thiếu tham số ngày (date)" } };
            }

            const records = await Attendance.find({ classId, date })
                .populate("studentId", "fullName studentCode")
                .populate("teacherId", "fullName");

            if (!records || records.length === 0) {
                return { status: 404, jsonBody: { message: "Không tìm thấy dữ liệu điểm danh" } };
            }

            const result = records.map((record, index) => ({
                stt: index + 1,
                studentName: record.studentId?.fullName || "--",
                studentCode: record.studentId?.studentCode || "--",
                status: record.status,
                checkInTime: record.checkInTime || "--",
                checkOutTime: record.checkOutTime || "--",
                note: record.note || "",
                teacherName: record.teacherId?.fullName || "--",
            }));

            return { status: 200, jsonBody: { data: result } };
        } catch (error) {
            context.log("Lỗi khi lấy lịch sử điểm danh:", error);
            return { status: 500, jsonBody: { message: "Đã xảy ra lỗi khi truy vấn lịch sử điểm danh" } };
        }
    }
});

app.http('getScheduleByClassAndDate', {
    methods: ['GET'],
    route: 'teacher/schedule/day/{classId}',
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`HTTP trigger function processed a request for url "${request.url}"`);

        try {
            await connectDB();
            const classId = request.params.classId;
            const date = request.query.get('date');
            if (!date) {
                return {
                    status: 400,
                    jsonBody: { message: "Thiếu tham số ngày (date)" }
                };
            }

            const mainSchedule = await Schedule.findOne({ class: classId })

                .populate("schedule.Monday.curriculum", "activityName activityFixed age")
                .populate("schedule.Tuesday.curriculum", "activityName activityFixed age")
                .populate("schedule.Wednesday.curriculum", "activityName activityFixed age")
                .populate("schedule.Thursday.curriculum", "activityName activityFixed age")
                .populate("schedule.Friday.curriculum", "activityName activityFixed age");

            context.log(`mainSchedule:`, mainSchedule);
            context.log(`classId:`, classId);
            //  context.log(`getAllschedule:`, getAllschedule);

            if (!mainSchedule) {
                return {
                    status: 400,
                    jsonBody: { message: "Không tìm thấy thời khóa biểu" }
                };
            }

            const weekday = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
            const todaySchedule = mainSchedule.schedule[weekday];

            if (!todaySchedule || todaySchedule.length === 0) {
                return {
                    status: 400,
                    jsonBody: { message: "Không có lịch dạy cho ngày này" }
                };
            }

            const overrides = await DailySchedule.find({ class: classId, date }).populate("curriculum", "activityName activityFixed age");

            const overrideMap = {};
            overrides.forEach((item) => {
                overrideMap[item.time] = item.curriculum;
            });

            const finalSchedule = todaySchedule.map((item) => ({
                time: item.time,
                fixed: item.fixed,
                curriculum: overrideMap[item.time] || item.curriculum,
                isSwapped: !!overrideMap[item.time]
            }));

            return {
                jsonBody: { date, classId, schedule: finalSchedule }
            };

        } catch (err) {
            context.log("getScheduleByClassAndDate error:", err);
            return {
                status: 500,
                jsonBody: { message: "Lỗi server" }
            };
        }
    }
});

app.http('swapSchedule', {
    methods: ['PUT'],
    route: 'teacher/schedule/swap-day',
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`HTTP trigger function processed a request for url "${request.url}"`);

        try {
            await connectDB();
            const body = await request.json();
            const { classId, date1, date2, time1, time2 } = body;

            if (!classId || !date1 || !date2 || !time1 || !time2) {
                return {
                    status: 400,
                    jsonBody: { message: "Thiếu thông tin đổi tiết" }
                };
            }

            const getWeekday = (date) => new Date(date).toLocaleDateString("en-US", { weekday: "long" });

            const weekday1 = getWeekday(date1);
            const weekday2 = getWeekday(date2);

            const schedule = await Schedule.findOne({ class: classId })
                .populate("schedule.Monday.curriculum")
                .populate("schedule.Tuesday.curriculum")
                .populate("schedule.Wednesday.curriculum")
                .populate("schedule.Thursday.curriculum")
                .populate("schedule.Friday.curriculum");

            if (!schedule) {
                return {
                    status: 400,
                    jsonBody: { message: "Không tìm thấy thời khóa biểu chính" }
                };
            }

            const dailyOverrides = await DailySchedule.find({
                class: classId,
                date: { $in: [date1, date2] },
                time: { $in: [time1, time2] },
            }).populate("curriculum");

            const overrideMap = {};
            dailyOverrides.forEach((d) => {
                overrideMap[`${d.date}-${d.time}`] = d.curriculum;
            });

            const findSlot = (date, weekday, time) => {
                const override = overrideMap[`${date}-${time}`];
                if (override) {
                    return { time, curriculum: override, fixed: override.activityFixed };
                }
                const slot = schedule.schedule[weekday]?.find((s) => s.time === time);
                if (!slot) return null;
                return {
                    time,
                    curriculum: slot.curriculum,
                    fixed: slot.fixed || slot.curriculum.activityFixed,
                };
            };

            const slot1 = findSlot(date1, weekday1, time1);
            const slot2 = findSlot(date2, weekday2, time2);

            if (!slot1 || !slot2) {
                return {
                    status: 400,
                    jsonBody: { message: "Không tìm thấy tiết học cần đổi" }
                };
            }



            if (slot1.fixed || slot2.fixed) {
                return {
                    status: 400,
                    jsonBody: { message: "Chỉ được đổi các tiết không cố định" }
                };
            }

            await Promise.all([
                DailySchedule.findOneAndUpdate(
                    { class: classId, date: date1, time: time1 },
                    { curriculum: slot2.curriculum._id },
                    { new: true, upsert: true }
                ),
                DailySchedule.findOneAndUpdate(
                    { class: classId, date: date2, time: time2 },
                    { curriculum: slot1.curriculum._id },
                    { new: true, upsert: true }
                ),
            ]);

            return {
                jsonBody: { message: "Đổi tiết giữa hai ngày thành công" }
            };
        } catch (err) {
            context.log("swapSchedule error:", err);
            return {
                status: 500,
                jsonBody: { message: "Lỗi server" }
            };
        }
    }
});



