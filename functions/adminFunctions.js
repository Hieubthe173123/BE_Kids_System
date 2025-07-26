const { app } = require('@azure/functions');
const connectDB = require("../shared/mongoose");
const Parent = require('../src/models/parentModel');
const Teacher = require('../src/models/teacherModel');
const Principal = require('../src/models/principalModel');
const Student = require('../src/models/studentModel');
const Class = require('../src/models/classModel');
const Room = require('../src/models/roomModel');


// 1. Lấy tất cả thông tin tài khoản (Phụ huynh & Giáo viên)
app.http('getAllAccountsInfo', {
    methods: ['GET'],
    authLevel: 'anonymous', // Thay đổi authLevel nếu cần xác thực
    route: 'management/accounts',
    handler: async (request, context) => {
        try {
            await connectDB();
            const parents = await Parent.find()
                .populate({
                    path: 'account',
                    select: '-password -createdAt -updatedAt -OTPnumber -exprire_in'
                })
                .populate('student');

            const teachers = await Teacher.find()
                .populate({
                    path: 'account',
                    select: '-password -createdAt -updatedAt -OTPnumber -exprire_in'
                });

            const allAccounts = [
                ...parents.map(p => ({ role: 'parent', ...p.toObject() })),
                ...teachers.map(t => ({ role: 'teacher', ...t.toObject() }))
            ];

            return { status: 200, jsonBody: allAccounts };
        } catch (err) {
            context.log("Lỗi khi lấy tất cả tài khoản:", err);
            return { status: 500, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

// 2. Lấy thông tin tài khoản theo ID
app.http('getAccountById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'management/accounts/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;

            // Tìm trong Parent
            const parent = await Parent.findById(id)
                .populate({
                    path: 'account',
                    select: '-password -OTPnumber -exprire_in -createdAt -updatedAt',
                })
                .populate('student');
            if (parent) {
                return { status: 200, jsonBody: { role: 'parent', info: parent } };
            }

            // Tìm trong Teacher
            const teacher = await Teacher.findById(id)
                .populate({
                    path: 'account',
                    select: '-password -OTPnumber -exprire_in -createdAt -updatedAt',
                });
            if (teacher) {
                return { status: 200, jsonBody: { role: 'teacher', info: teacher } };
            }

            // Tìm trong Principal
            const principal = await Principal.findById(id)
                .populate({
                    path: 'account',
                    select: '-password -OTPnumber -exprire_in -createdAt -updatedAt',
                });
            if (principal) {
                return { status: 200, jsonBody: { role: 'principal', info: principal } };
            }

            return { status: 404, jsonBody: { message: 'Không tìm thấy người dùng' } };
        } catch (err) {
            context.log("Lỗi khi lấy tài khoản theo ID:", err);
            return { status: 500, jsonBody: { message: 'Lỗi máy chủ' } };
        }
    }
});

// 3. Cập nhật thông tin tài khoản
app.http('saveAccountInfo', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'management/accounts/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const data = await request.json();

            // Cập nhật cho Parent
            const parent = await Parent.findById(id);
            if (parent) {
                await Parent.findByIdAndUpdate(id, {
                    fullName: data.fullName,
                    dob: data.dob,
                    gender: data.gender,
                    phoneNumber: data.phoneNumber,
                    email: data.email,
                    IDCard: data.IDCard,
                    address: data.address,
                });

                if (Array.isArray(data.student)) {
                    for (const stu of data.student) {
                        if (stu._id) {
                            await Student.findByIdAndUpdate(stu._id, {
                                fullName: stu.fullName,
                                age: stu.age,
                                gender: stu.gender,
                            });
                        }
                    }
                }
                return { status: 200, jsonBody: { message: 'Cập nhật thành công (parent)' } };
            }

            // Cập nhật cho Teacher
            const teacher = await Teacher.findById(id);
            if (teacher) {
                await Teacher.findByIdAndUpdate(id, {
                    fullName: data.fullName,
                    dob: data.dob,
                    gender: data.gender,
                    phoneNumber: data.phoneNumber,
                    email: data.email,
                    IDCard: data.IDCard,
                    address: data.address,
                });
                return { status: 200, jsonBody: { message: 'Cập nhật thành công (teacher)' } };
            }

            return { status: 404, jsonBody: { message: 'Không tìm thấy người dùng' } };
        } catch (err) {
            context.log("Lỗi khi cập nhật tài khoản:", err);
            return { status: 500, jsonBody: { message: 'Lỗi server khi cập nhật tài khoản' } };
        }
    }
});



app.http('getDataForStatistic', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'management/statistic',
    handler: async (request, context) => {
        try {
            await connectDB();
            const parents = await Parent.find().populate('student');
            const teachers = await Teacher.find();
            const students = await Student.find();
            const classes = await Class.find().populate('teacher').populate('students');
            const rooms = await Room.find();
            const classGraduate = await Class.find({ schoolYear: "2024-2025", classAge: "5" }).populate('teacher').populate('students');
            return { status: 200, jsonBody: { parents, teachers, students, classes, rooms, classGraduate } };
        } catch (err) {
            context.log("Lỗi khi lấy tất cả tài khoản:", err);
            return { status: 500, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

