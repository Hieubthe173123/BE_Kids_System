const { app } = require('@azure/functions');
const connectDB = require("../shared/mongoose");
const Parent = require("../src/models/parentModel");
const Account = require("../src/models/accountModel");
const Schedule = require("../src/models/scheduleModel");
const Attendance = require("../src/models/attendanceModel");
const CLOUDINARY_HELPER = require('../src/helper/uploadImageHelper');
const multer = require('multer');
const upload = multer(); 

// ===== CRUD APIs =====

app.http('createParent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'parent',
    handler: async (request, context) => {
        try {
            await connectDB();
            const body = await request.json();
            const newParent = new Parent(body);
            const savedParent = await newParent.save();
            return { status: 201, jsonBody: savedParent };
        } catch (err) {
            context.log("Lỗi khi tạo phụ huynh:", err);
            return { status: 400, jsonBody: { message: err.message } };
        }
    }
});

app.http('updateParent', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'parent/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const body = await request.json();
            const updatedParent = await Parent.findByIdAndUpdate(id, body, { new: true });
            if (!updatedParent) {
                return { status: 404, jsonBody: { message: "Không tìm thấy phụ huynh" } };
            }
            return { status: 200, jsonBody: updatedParent };
        } catch (err) {
            context.log("Lỗi khi cập nhật phụ huynh:", err);
            return { status: 400, jsonBody: { message: err.message } };
        }
    }
});

app.http('softDeleteParent', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'parent/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const deletedParent = await Parent.findByIdAndUpdate(id, { status: false }, { new: true });
            if (!deletedParent) {
                return { status: 404, jsonBody: { message: "Không tìm thấy phụ huynh" } };
            }
            return { status: 200, jsonBody: { message: "Đã xóa mềm phụ huynh thành công" } };
        } catch (err) {
            context.log("Lỗi khi xóa phụ huynh:", err);
            return { status: 500, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

app.http('getAllParents', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'parent',
    handler: async (request, context) => {
        try {
            await connectDB();
            const parents = await Parent.find({}).populate("student");
            return { status: 200, jsonBody: { data: parents } };
        } catch (err) {
            context.log("Lỗi khi lấy danh sách phụ huynh:", err);
            return { status: 500, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

app.http('getParentById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'parent/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const parent = await Parent.findById(id).populate("student");
            if (!parent) {
                return { status: 404, jsonBody: { message: "Không tìm thấy phụ huynh" } };
            }
            return { status: 200, jsonBody: { data: parent } };
        } catch (err) {
            context.log("Lỗi khi lấy phụ huynh theo ID:", err);
            return { status: 500, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

// ===== CUSTOM LOGIC APIs =====

app.http('getUnusedParentAccounts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'parent/unused',
    handler: async (request, context) => {
        try {
            await connectDB();
            const usedAccountIds = await Parent.find().distinct("account");
            const unusedAccounts = await Account.find({
                _id: { $nin: usedAccountIds },
                role: "parent",
                status: true,
            });
            return { status: 200, jsonBody: { success: true, data: unusedAccounts } };
        } catch (error) {
            context.log(error);
            return { status: 500, jsonBody: { success: false, message: "Internal server error", error: error.message } };
        }
    }
});

app.http('getStudentsByParentId', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'parent/{parentId}/students',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { parentId } = request.params;
            const parent = await Parent.findById(parentId).populate('student');
            if (!parent) {
                return { status: 404, jsonBody: { message: 'Parent not found' } };
            }
            const students = parent.student.map(student => ({
                id: student._id,
                name: student.fullName,
                age: student.age,
            }));
            return { status: 200, jsonBody: { students } };
        } catch (error) {
            context.log('Error fetching students by parent:', error);
            return { status: 500, jsonBody: { message: 'Internal server error' } };
        }
    }
});

app.http('getScheduleByClassId', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'parent/schedule/{classId}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { classId } = request.params;
            const schedule = await Schedule.findOne({ class: classId })
                .populate({
                    path: "class",
                    populate: { path: "room", select: "roomName" },
                    select: "className classAge schoolYear room"
                })
                .populate({ path: "schedule.Monday.curriculum", select: "activityName activityFixed age" })
                .populate({ path: "schedule.Tuesday.curriculum", select: "activityName activityFixed age" })
                .populate({ path: "schedule.Wednesday.curriculum", select: "activityName activityFixed age" })
                .populate({ path: "schedule.Thursday.curriculum", select: "activityName activityFixed age" })
                .populate({ path: "schedule.Friday.curriculum", select: "activityName activityFixed age" });

            if (!schedule) {
                return { status: 404, jsonBody: { message: "Schedule not found for this class" } };
            }
            return { status: 200, jsonBody: schedule };
        } catch (err) {
            context.log("Error fetching schedule by classId:", err);
            return { status: 500, jsonBody: { message: "Internal server error" } };
        }
    }
});

app.http('getAttendanceByStudentID', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'parent/attendance/{studentId}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { studentId } = request.params;
            const attendanceRecords = await Attendance.find({ studentId }).sort({ date: -1 });
            if (!attendanceRecords || attendanceRecords.length === 0) {
                return { status: 404, jsonBody: { message: 'No attendance records found for this student' } };
            }
            const formattedData = attendanceRecords.map(record => {
                const { teacherId, ...rest } = record.toObject();
                return rest;
            });
            return { status: 200, jsonBody: { data: formattedData } };
        } catch (error) {
            context.log('Error fetching attendance by studentId:', error);
            return { status: 500, jsonBody: { message: 'Internal server error' } };
        }
    }
});

app.http('uploadPictureProfile', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'parent/{parentId}/upload-picture',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { parentId } = request.params;

            const parent = await Parent.findById(parentId);
            if (!parent) {
                return {
                    status: 404,
                    jsonBody: { message: 'Parent not found' }
                };
            }

            const formData = await request.formData();
            const file = formData.get('file');

            if (!file) {
                return {
                    status: 400,
                    jsonBody: { message: 'No file uploaded' }
                };
            }

            const fileBuffer = Buffer.from(await file.arrayBuffer());
            const imageUrl = await CLOUDINARY_HELPER.uploadBuffer(fileBuffer, file.type);

            parent.profilePicture = imageUrl;
            await parent.save();

            return {
                status: 200,
                jsonBody: {
                    message: 'Profile picture uploaded successfully',
                    imageUrl
                }
            };
        } catch (error) {
            context.log('Error uploading profile picture:', error);
            return {
                status: 500,
                jsonBody: { message: 'Internal server error' }
            };
        }
    }
});
