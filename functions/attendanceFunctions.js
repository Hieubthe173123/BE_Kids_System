const { app } = require('@azure/functions');
const connectDB = require("../shared/mongoose");
const Class = require('../src/models/classModel');
const Teacher = require('../src/models/teacherModel');
const Attendance = require("../src/models/attendanceModel.js");
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
