const { app } = require('@azure/functions');
const connectDB = require("../shared/mongoose");
const Class = require('../src/models/classModel');
const Student = require('../src/models/studentModel');
const Teacher = require('../src/models/teacherModel');
const Room = require('../src/models/roomModel');
const { HTTP_STATUS, RESPONSE_MESSAGE, VALIDATION_CONSTANTS, NUMBER_STUDENT_IN_CLASS } = require('../src/constants/useConstants');

// Helper function to validate class and sort class name

const sortClassesByName = (classes) => {
    const sortable = classes.map(item => {
        const match = item.className.match(/^(\d+)([A-Za-z])$/);
        if (match) {
            return {
                number: parseInt(match[1], 10),
                letter: match[2],
                class: item
            };
        }
        return { number: Infinity, letter: '', class: item };
    });

    sortable.sort((a, b) => {
        if (a.number === b.number) {
            return a.letter.localeCompare(b.letter);
        }
        return a.number - b.number;
    });

    return sortable.map(i => i.class);
};

// ===== STATIC ROUTES FIRST =====

// 1. Lấy danh sách tất cả các năm học
app.http('getAllSchoolYears', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'class/school-year',
    handler: async (request, context) => {
        try {
            await connectDB();
            const schoolYears = await Class.distinct('schoolYear');

            if (!schoolYears || schoolYears.length === 0) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: "Không tìm thấy năm học nào trong hệ thống." } };
            }

            schoolYears.sort((a, b) => {
                const yearA = parseInt(a.split(' - ')[0]);
                const yearB = parseInt(b.split(' - ')[0]);
                return yearA - yearB;
            });

            return { status: HTTP_STATUS.OK, jsonBody: { data: schoolYears } };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});

// 2. Lấy danh sách lớp học theo năm học (chỉ lớp đang hoạt động)
app.http('getClassBySchoolYear', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'class/school-year/{year}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { year } = request.params;
            const classes = await Class.find({
                schoolYear: year,
                status: true
            }).select("_id schoolYear className");

            if (!classes || classes.length === 0) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: `Không tìm thấy lớp nào cho năm học ${year}` } };
            }

            return { status: HTTP_STATUS.OK, jsonBody: { data: classes } };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});

// 3. Lấy tất cả lớp học theo năm học (bao gồm cả lớp ẩn và thông tin chi tiết)
app.http('getAllClassBySchoolYear', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'class/school-year/{year}/all',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { year } = request.params;
            const classes = await Class.find({ schoolYear: year })
                .populate('teacher')
                .populate('students')
                .populate('room', 'roomName')
                .exec();

            if (!classes || classes.length === 0) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: `Không tìm thấy lớp nào cho năm học ${year}` } };
            }

            return { status: HTTP_STATUS.OK, jsonBody: { data: classes } };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});

// 4. Lấy danh sách học sinh chưa được xếp lớp
app.http('getAvailableStudents', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'class/available-students',
    handler: async (request, context) => {
        try {
            await connectDB();
            const classes = await Class.find({}, 'students');
            const assignedStudentIds = classes.flatMap(cls =>
                Array.isArray(cls.students) ? cls.students.map(id => id?.toString()).filter(Boolean) : []
            );

            const availableStudents = await Student.find({
                _id: { $nin: assignedStudentIds },
                status: true
            }).select('studentCode fullName dob');

            return { status: HTTP_STATUS.OK, jsonBody: availableStudents };
        } catch (error) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: error.message } };
        }
    }
});

// 5. Lấy danh sách giáo viên chưa được xếp lớp
app.http('getAvailableTeachers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'class/available-teachers',
    handler: async (request, context) => {
        try {
            await connectDB();
            const classes = await Class.find({}, 'teacher');
            const assignedTeacherIds = classes.flatMap(cls =>
                Array.isArray(cls.teacher) ? cls.teacher.map(id => id?.toString()).filter(Boolean) : []
            );

            const availableTeachers = await Teacher.find({
                _id: { $nin: assignedTeacherIds },
                status: true
            }).select('fullName phoneNumber');

            return { status: HTTP_STATUS.OK, jsonBody: availableTeachers };
        } catch (error) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: error.message } };
        }
    }
});

// 6. Lấy danh sách lớp học theo trạng thái (hoạt động/ẩn)
app.http('getClassByStatus', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'class/status/{status}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { status } = request.params;
            const isActive = status === 'true';

            const classes = await Class.find({ status: isActive });

            if (!classes || classes.length === 0) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: `Không tìm thấy lớp nào có trạng thái ${isActive ? 'hiện' : 'ẩn'}` } };
            }

            return { status: HTTP_STATUS.OK, jsonBody: { data: classes } };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});


// ===== CRUD ROUTES =====

// 7. Lấy tất cả lớp học
app.http('getAllClasses', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'class',
    handler: async (request, context) => {
        try {
            await connectDB();
            const classes = await Class.find();
            return { status: HTTP_STATUS.OK, jsonBody: { data: classes } };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});

// 8. Lấy lớp học theo ID
app.http('getClassById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'class/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const data = await Class.findById(id);
            if (!data) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: 'Không tìm thấy lớp' } };
            }
            return { status: HTTP_STATUS.OK, jsonBody: { data } };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});


// 11. Cập nhật thông tin lớp học
app.http('updateClass', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'class/update/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const body = await request.json();
            const { className, classAge, room, status } = body;
            const existing = await Class.findById(id);

            if (!existing) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: 'Không tìm thấy lớp' } };
            }

            if (className && className !== existing.className) {
                const classNameExists = await Class.findOne({
                    className,
                    schoolYear: existing.schoolYear,
                    _id: { $ne: id }
                });
                if (classNameExists) {
                    return { status: HTTP_STATUS.BAD_REQUEST, jsonBody: { message: `Lớp ${className} đã tồn tại trong năm học này` } };
                }
            }

            existing.className = className || existing.className;
            existing.classAge = classAge || existing.classAge;
            existing.status = typeof status === 'boolean' ? status : existing.status;
            if (room !== undefined) {
                existing.room = room || null;
            }

            const updated = await existing.save();
            return { status: HTTP_STATUS.OK, jsonBody: { message: `Đã cập nhật lớp ${updated.className}`, data: updated } };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});

// 12. Xóa mềm lớp học
app.http('softDeleteClass', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'class/delete/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const data = await Class.findById(id);
            if (!data) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: 'Không tìm thấy lớp' } };
            }
            data.status = false;
            await data.save();
            return { status: HTTP_STATUS.OK, jsonBody: { message: 'Đã xóa lớp' } };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});


// ===== STUDENTS / TEACHERS IN CLASS =====

// 13. Lấy danh sách học sinh trong một lớp
app.http('getStudentsInClass', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'class/{id}/students',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const classDoc = await Class.findById(id).populate('students').lean();

            if (!classDoc) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: 'Không tìm thấy lớp' } };
            }

            const students = classDoc.students.map((student) => ({
                _id: student._id,
                studentId: student.studentCode,
                name: student.fullName,
                dob: student.dob,
                age: student.age,
            }));

            return { status: HTTP_STATUS.OK, jsonBody: students };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});

// 14. Lấy danh sách giáo viên trong một lớp
app.http('getTeachersInClass', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'class/{id}/teachers',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const classDoc = await Class.findById(id).populate('teacher').lean();

            if (!classDoc) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: 'Không tìm thấy lớp' } };
            }

            let teachers = Array.isArray(classDoc.teacher) ? classDoc.teacher : (classDoc.teacher ? [classDoc.teacher] : []);

            const formattedTeachers = teachers.map(teacher => ({
                _id: teacher._id,
                name: teacher.fullName,
                phone: teacher.phoneNumber,
            }));

            return { status: HTTP_STATUS.OK, jsonBody: formattedTeachers };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});

// 15. Thêm học sinh vào lớp
app.http('addStudentsToClass', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'class/{id}/students',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const { studentIds } = await request.json();

            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                return { status: HTTP_STATUS.BAD_REQUEST, jsonBody: { message: 'studentIds phải là một mảng và không được rỗng' } };
            }

            await Class.findByIdAndUpdate(id, { $addToSet: { students: { $each: studentIds } } });
            return { status: HTTP_STATUS.OK, jsonBody: { message: 'Đã thêm học sinh vào lớp' } };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});

// 16. Thêm giáo viên vào lớp
// app.http('addTeachersToClass', {
//     methods: ['POST'],
//     authLevel: 'anonymous',
//     route: 'class/{id}/teachers',
//     handler: async (request, context) => {
//         try {
//             await connectDB();
//             const { id } = request.params;
//             const { teacherIds } = await request.json();

//             if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
//                 return { status: HTTP_STATUS.BAD_REQUEST, jsonBody: { message: 'teacherIds phải là một mảng và không được rỗng' } };
//             }

//             const classDoc = await Class.findById(id);
//             if (!classDoc) {
//                 return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: 'Không tìm thấy lớp' } };
//             }

//             if (classDoc.teacher.length + teacherIds.length > 2) {
//                 return { status: HTTP_STATUS.BAD_REQUEST, jsonBody: { message: 'Một lớp chỉ được tối đa 2 giáo viên' } };
//             }

//             await Class.findByIdAndUpdate(id, { $addToSet: { teacher: { $each: teacherIds } } });
//             return { status: HTTP_STATUS.OK, jsonBody: { message: 'Đã thêm giáo viên vào lớp' } };
//         } catch (err) {
//             return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
//         }
//     }
// });

app.http('addTeachersToClass', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'class/{id}/teachers',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const { teacherIds } = await request.json();

            if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
                return {
                    status: HTTP_STATUS.BAD_REQUEST,
                    jsonBody: { message: 'teacherIds phải là một mảng và không được rỗng' }
                };
            }

            const validTeacherIds = teacherIds.filter(
                (id) => typeof id === 'string' && id.trim() !== ''
            );

            if (validTeacherIds.length === 0) {
                return {
                    status: HTTP_STATUS.BAD_REQUEST,
                    jsonBody: { message: 'Danh sách teacherIds không hợp lệ' }
                };
            }

            const classDoc = await Class.findById(id);
            if (!classDoc) {
                return {
                    status: HTTP_STATUS.NOT_FOUND,
                    jsonBody: { message: 'Không tìm thấy lớp' }
                };
            }

            if (classDoc.teacher.length + validTeacherIds.length > 2) {
                return {
                    status: HTTP_STATUS.BAD_REQUEST,
                    jsonBody: { message: 'Một lớp chỉ được tối đa 2 giáo viên' }
                };
            }

            await Class.findByIdAndUpdate(id, {
                $addToSet: { teacher: { $each: validTeacherIds } }
            });

            return {
                status: HTTP_STATUS.OK,
                jsonBody: { message: 'Đã thêm giáo viên vào lớp' }
            };
        } catch (err) {
            return {
                status: HTTP_STATUS.SERVER_ERROR,
                jsonBody: { message: err.message }
            };
        }
    }
});


// 17. Gỡ học sinh khỏi lớp
app.http('removeStudentFromClass', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'class/{classId}/students/{studentId}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { classId, studentId } = request.params;
            await Class.findByIdAndUpdate(classId, { $pull: { students: studentId } });
            return { status: HTTP_STATUS.OK, jsonBody: { message: 'Đã gỡ học sinh khỏi lớp' } };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});

// 18. Gỡ giáo viên khỏi lớp
app.http('removeTeacherFromClass', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'class/{classId}/teachers/{teacherId}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { classId, teacherId } = request.params;
            await Class.findByIdAndUpdate(classId, { $pull: { teacher: teacherId } });
            return { status: HTTP_STATUS.OK, jsonBody: { message: 'Đã gỡ giáo viên khỏi lớp' } };
        } catch (err) {
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: err.message } };
        }
    }
});

app.http('getStudentClassInfo', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'class/{studentId}/class-info',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { studentId } = request.params;
            const studentClass = await Class.findOne({ students: studentId }).populate({ path: "teacher", select: "fullName" }).lean();
            if (!studentClass) {
                return { status: 404, jsonBody: { message: "Học sinh này chưa được xếp lớp" } };
            }
            const teacherNames = studentClass.teacher.map(t => t.fullName).join(", ");
            return { status: 200, jsonBody: { classId: studentClass._id, className: studentClass.className, teacher: teacherNames, schoolYear: studentClass.schoolYear } };
        } catch (error) {
            context.log(error);
            return { status: 500, jsonBody: { message: "Lỗi server khi lấy thông tin lớp học" } };
        }
    }
});

app.http('statisticSchoolYear', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'class/schoolyear/statistic',
    handler: async (request, context) => {
        try {
            await connectDB();
            const data = await Class.aggregate([
                { $group: { _id: "$schoolYear", totalClasses: { $sum: 1 }, totalStudents: { $sum: { $size: "$students" } }, totalTeachers: { $sum: { $size: "$teacher" } } } },
                { $sort: { _id: 1 } }
            ]);
            return { status: HTTP_STATUS.OK, jsonBody: { message: RESPONSE_MESSAGE.SUCCESS, data: data } };
        } catch (error) {
            context.log(error);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: error.message } };
        }
    }
});

app.http('createNewSchoolYear', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'class/schoolyear/create-schoolyear',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { schoolYear } = await request.json();
            const errorList = [];

            if (!schoolYear) {
                errorList.push({ message: "Nhập thiếu năm học bắt đầu và năm học kết thúc" });
            } else {
                const [startYearStr, endYearStr] = schoolYear.split("-");
                const startYear = parseInt(startYearStr.trim());
                const endYear = parseInt(endYearStr.trim());
                const currentYear = new Date().getFullYear();

                if (startYear !== currentYear) {
                    errorList.push({ message: "Năm học bắt đầu không trùng khớp với thời gian hiện tại" });
                }
                if (endYear !== currentYear + 1) {
                    errorList.push({ message: "Năm học kết thúc không trùng khớp với thời gian năm sau" });
                }
            }

            const checkYearOld = await Class.findOne({ schoolYear: schoolYear });
            if (checkYearOld) {
                errorList.push({ message: "Năm học này đã được tạo!" });
            }

            if (errorList.length > 0) {
                return { status: HTTP_STATUS.BAD_REQUEST, jsonBody: errorList };
            }

            const listClassOld = await Class.find({}).populate("students");
            const newClassesData = [];
            const graduateStudentIds = [];

            // Xử lý lên lớp
            for (const classOld of listClassOld) {
                const { teacher, className, students: studentList, room } = classOld;
                const currentAge = parseInt(className.charAt(0));
                const nextAge = currentAge + 1;
                const name = className.slice(1);
                const promoteStudentIds = [];

                for (const student of studentList) {
                    if (student.age >= VALIDATION_CONSTANTS.MAX_STUDENT_AGE) {
                        graduateStudentIds.push(student._id);
                    } else {
                        promoteStudentIds.push(student._id);
                    }
                }

                if (nextAge <= VALIDATION_CONSTANTS.MAX_STUDENT_AGE) {
                    newClassesData.push({
                        teacher: teacher,
                        className: `${nextAge}${name}`,
                        students: promoteStudentIds,
                        classAge: `${nextAge}`,
                        schoolYear: schoolYear,
                        room: room,
                        status: true
                    });
                }
            }

            // Xử lý ra trường
            if (graduateStudentIds.length > 0) {
                await Student.updateMany({ _id: { $in: graduateStudentIds } }, { $set: { status: false } });
            }

            const studentInPromotedClass = newClassesData.flatMap(item => item.students.map(id => id.toString()));
            const studentNoClass = await Student.find({
                _id: { $nin: studentInPromotedClass },
                status: true
            });

            const usedRoomIds = newClassesData.map(c => c.room?.toString()).filter(Boolean);
            const unusedRooms = await Room.find({ _id: { $nin: usedRoomIds }, status: true });

            const usedTeacherIds = newClassesData.flatMap(c => c.teacher.map(t => t.toString()));
            const availableTeachers = await Teacher.find({ _id: { $nin: usedTeacherIds }, status: true });

            const ageGroups = {};
            const currentYear = new Date().getFullYear();
            for (const student of studentNoClass) {
                const age = currentYear - new Date(student.dob).getFullYear();
                if (age >= VALIDATION_CONSTANTS.MIN_STUDENT_AGE && age <= VALIDATION_CONSTANTS.MAX_STUDENT_AGE) {
                    if (!ageGroups[age]) ageGroups[age] = [];
                    ageGroups[age].push(student._id);
                }
            }

            let teacherIndex = 0;
            let roomIndex = 0;

            for (let age = VALIDATION_CONSTANTS.MIN_STUDENT_AGE; age <= VALIDATION_CONSTANTS.MAX_STUDENT_AGE; age++) {
                const studentList = ageGroups[age];
                if (!studentList || studentList.length === 0) continue;

                const ageClasses = newClassesData.filter(cls => parseInt(cls.classAge) === age);

                for (const studentId of studentList) {
                    let placed = false;
                    for (const cls of ageClasses) {
                        if (cls.students.length < NUMBER_STUDENT_IN_CLASS) {
                            cls.students.push(studentId);
                            placed = true;
                            break;
                        }
                    }

                    if (!placed) {
                        const usedSuffixes = ageClasses.map(cls => cls.className.slice(1));
                        const newSuffix = VALIDATION_CONSTANTS.CLASS_SUFFIXES.find(s => !usedSuffixes.includes(s));

                        if (newSuffix) {
                            const className = `${age}${newSuffix}`;
                            let assignedTeachers = [];
                            if (teacherIndex + 1 < availableTeachers.length) {
                                assignedTeachers = [availableTeachers[teacherIndex]._id, availableTeachers[teacherIndex + 1]._id];
                                teacherIndex += 2;
                            }
                            let assignedRoom = null;
                            if (roomIndex < unusedRooms.length) {
                                assignedRoom = unusedRooms[roomIndex]._id;
                                roomIndex++;
                            }

                            const newClass = {
                                teacher: assignedTeachers,
                                className,
                                students: [studentId],
                                classAge: `${age}`,
                                schoolYear,
                                room: assignedRoom,
                                status: true,
                            };
                            newClassesData.push(newClass);
                            ageClasses.push(newClass);
                        }
                    }
                }
            }

            if (newClassesData.length > 0) {
                await Class.insertMany(newClassesData);
            }

            return { status: HTTP_STATUS.CREATED, jsonBody: { message: `Đã tạo thành công năm học mới ${schoolYear}`, dataList: newClassesData } };

        } catch (error) {
            context.log("Error createNewSchoolYear:", error);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: error.message } };
        }
    }
});

