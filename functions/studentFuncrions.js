const { app } = require('@azure/functions');
const connectDB = require("../shared/mongoose");
const Student = require("../src/models/studentModel");
const Parent = require("../src/models/parentModel");

app.http('getStudentsWithoutParents', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'student/no-parent',
    handler: async (request, context) => {
        try {
            await connectDB();
            const studentsWithParents = await Parent.distinct("student");
            const studentsWithoutParents = await Student.find({
                _id: { $nin: studentsWithParents },
            });
            return { status: 200, jsonBody: studentsWithoutParents };
        } catch (err) {
            context.log("Lỗi khi lấy danh sách học sinh chưa có phụ huynh:", err);
            return { status: 500, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

app.http('getAllStudents', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'student',
    handler: async (request, context) => {
        try {
            await connectDB();
            const students = await Student.find({});
            return { status: 200, jsonBody: { data: students } };
        } catch (err) {
            context.log("Lỗi khi lấy danh sách học sinh:", err);
            return { status: 500, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

app.http('getStudentById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'student/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const student = await Student.findById(id);
            if (!student) {
                return { status: 404, jsonBody: { message: "Không tìm thấy học sinh" } };
            }
            return { status: 200, jsonBody: { data: student } };
        } catch (err) {
            context.log("Lỗi khi lấy học sinh theo ID:", err);
            return { status: 500, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

app.http('createStudent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'student',
    handler: async (request, context) => {
        try {
            await connectDB();
            const body = await request.json();
            const newStudent = new Student(body);
            const savedStudent = await newStudent.save();
            return { status: 201, jsonBody: savedStudent };
        } catch (err) {
            context.log("Lỗi khi tạo học sinh:", err);
            return { status: 400, jsonBody: { message: err.message } };
        }
    }
});

app.http('updateStudent', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'student/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const body = await request.json();
            const updatedStudent = await Student.findByIdAndUpdate(id, body, { new: true });
            if (!updatedStudent) {
                return { status: 404, jsonBody: { message: "Không tìm thấy học sinh" } };
            }
            return { status: 200, jsonBody: updatedStudent };
        } catch (err) {
            context.log("Lỗi khi cập nhật học sinh:", err);
            return { status: 400, jsonBody: { message: err.message } };
        }
    }
});

app.http('softDeleteStudent', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'student/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const deletedStudent = await Student.findByIdAndUpdate(id, { status: false }, { new: true });
            if (!deletedStudent) {
                return { status: 404, jsonBody: { message: "Không tìm thấy học sinh" } };
            }
            return { status: 200, jsonBody: { message: "Đã xóa mềm học sinh thành công" } };
        } catch (err) {
            context.log("Lỗi khi xóa học sinh:", err);
            return { status: 500, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});
