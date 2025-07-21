const Class = require('../models/classModel');
const Student = require('../models/studentModel');
const Teacher = require('../models/teacherModel');
const Room = require('../models/roomModel');
const {
    HTTP_STATUS,
    RESPONSE_MESSAGE,
    VALIDATION_CONSTANTS,
    NUMBER_STUDENT_IN_CLASS,
} = require('../constants/useConstants');
const {
    findAllGeneric,
    findIdGeneric,
    deletedSoftGeneric
} = require('./useController');

exports.getAllClasses = findAllGeneric(Class);
exports.getClassById = findIdGeneric(Class);
exports.softDeleteClass = deletedSoftGeneric(Class);
exports.createClass = async (req, res) => {
    try {
        const { className, classAge, room, status } = req.body;

        if (!className) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Thiếu className' });
        }
        const found = await Class.findOne({ className });
        if (found) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: `${className} đã tồn tại`
            });
        }

        const newClass = new Class({
            className,
            classAge,
            room: room || null,
            status,
            teacher: [],
            student: [],
            schoolYear: req.body.schoolYear || new Date().getFullYear() + ' - ' + (new Date().getFullYear() + 1)
        });

        const saved = await newClass.save();
        return res.status(HTTP_STATUS.CREATED).json({
            message: `Đã tạo lớp ${className}`,
            data: saved
        });

    } catch (err) {
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};


exports.updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { className, classAge, room, status } = req.body;
        const existing = await Class.findById(id);

        if (!existing) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Không tìm thấy lớp' });
        }
        if (className && className !== existing.className) {
            const classNameExists = await Class.findOne({
                className,
                schoolYear: existing.schoolYear,
                _id: { $ne: id }
            });
            if (classNameExists) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: `${className} đã tồn tại trong năm học này`
                });
            }
        }

        existing.className = className || existing.className;
        existing.classAge = classAge || existing.classAge;
        existing.status = typeof status === 'boolean' ? status : existing.status;
        if (room !== undefined) {
            existing.room = room || null;
        }

        const updated = await existing.save();

        return res.status(HTTP_STATUS.OK).json({
            message: `Đã cập nhật lớp ${updated.className}`,
            data: updated
        });

    } catch (err) {
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};


exports.getClassBySchoolYear = async (req, res) => {
    try {
        const { year } = req.params;
        const classes = await Class.find({
            schoolYear: year,
            status: true
        }).select("_id schoolYear className");

        if (!classes || classes.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: `Không tìm thấy lớp nào cho năm học ${year}`
            });
        }

        const sortName = [];

        for (const item of classes) {
            const { className } = item;
            const match = className.match(/^(\d+)([A-Za-z])$/);
            if (match) {
                const numberPart = parseInt(match[1], 10);
                const letterPart = match[2];
                sortName.push({
                    number: numberPart,
                    letter: letterPart,
                    class: item
                });
            }
        }
        sortName.sort((a, b) => {
            if (a.number === b.number) {
                return a.letter.localeCompare(b.letter);
            }
            return a.number - b.number;
        });

        const sortedClasses = sortName.map(i => i.class);

        return res.status(HTTP_STATUS.OK).json({
            data: sortedClasses
        });

    } catch (err) {
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};

exports.getAllClassBySchoolYear = async (req, res) => {
    try {
        const { year } = req.params;

        const classes = await Class.find({ schoolYear: year })
            .populate('teacher')
            .populate('students')
            .populate('room', 'roomName')
            .exec();

        if (!classes || classes.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: `Không tìm thấy lớp nào cho năm học ${year}`
            });
        }

        const sortName = [];
        for (const item of classes) {
            const { className } = item;
            const match = className.match(/^(\d+)([A-Za-z])$/);
            if (match) {
                const numberPart = parseInt(match[1], 10);
                const letterPart = match[2];
                sortName.push({
                    number: numberPart,
                    letter: letterPart,
                    class: item
                });
            }
        }
        sortName.sort((a, b) => {
            if (a.number === b.number) {
                return a.letter.localeCompare(b.letter);
            }
            return a.number - b.number;
        });

        const sortedClasses = sortName.map(i => i.class);

        return res.status(HTTP_STATUS.OK).json({ data: sortedClasses });
    } catch (err) {
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};



exports.getAllSchoolYears = async (req, res) => {
    try {
        const schoolYears = await Class.distinct('schoolYear');

        if (!schoolYears || schoolYears.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Không tìm thấy năm học nào trong hệ thống."
            });
        }
        schoolYears.sort((a, b) => {
            const yearA = parseInt(a.split(' - ')[0]);
            const yearB = parseInt(b.split(' - ')[0]);
            return yearA - yearB;
        });

        return res.status(HTTP_STATUS.OK).json({ data: schoolYears });
    } catch (err) {
        console.error("Lỗi khi lấy danh sách năm học:", err);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};


exports.getClassByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const isActive = status === 'true';

        const classes = await Class.find({ status: isActive });

        if (!classes || classes.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: `Không tìm thấy lớp nào có trạng thái ${isActive ? 'hiện' : 'ẩn'}`
            });
        }

        return res.status(HTTP_STATUS.OK).json({ data: classes });
    } catch (err) {
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};


exports.getStudentsInClass = async (req, res) => {
    try {
        const { id } = req.params;
        const classDoc = await Class.findById(id).populate('students').lean();

        if (!classDoc) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Không tìm thấy lớp' });
        }

        const students = classDoc.students.map((student) => {
            return {
                _id: student._id,
                studentId: student.studentCode,
                name: student.fullName,
                dob: student.dob,
                age: student.age,
            };
        });

        return res.status(HTTP_STATUS.OK).json(students);
    } catch (err) {
        console.error(`Lỗi khi lấy danh sách học sinh trong lớp ${req.params.id}:`, err);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};

exports.getStudentClassInfo = async (req, res) => {
    const { studentId } = req.params;

    try {
        const studentClass = await Class.findOne({ students: studentId })
            .populate({
                path: "teacher",
                select: "fullName"
            })
            .lean();

        if (!studentClass) {
            return res.status(404).json({ message: "Học sinh này chưa được xếp lớp" });
        }

        const teacherNames = studentClass.teacher.map(t => t.fullName).join(", ");

        res.json({
            classId: studentClass._id,
            className: studentClass.className,
            teacher: teacherNames,
            schoolYear: studentClass.schoolYear
        });
    } catch (error) {
        console.error("Error fetching student class info:", error);
        res.status(500).json({ message: "Lỗi server khi lấy thông tin lớp học" });
    }
};


exports.getTeachersInClass = async (req, res) => {
    try {
        const { id } = req.params;
        const classDoc = await Class.findById(id).populate('teacher').lean();

        if (!classDoc) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Không tìm thấy lớp' });
        }
        let teachers = classDoc.teacher;

        if (!Array.isArray(teachers)) {
            teachers = teachers ? [teachers] : [];
        }
        const formattedTeachers = teachers.map(teacher => ({
            _id: teacher._id,
            name: teacher.fullName,
            phone: teacher.phoneNumber,
        }));

        return res.status(HTTP_STATUS.OK).json(formattedTeachers);
    } catch (err) {
        console.error(`Lỗi khi lấy danh sách giáo viên trong lớp ${req.params.id}:`, err);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};

exports.addStudentsToClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { studentIds } = req.body;
        await Class.findByIdAndUpdate(id, { $addToSet: { students: { $each: studentIds } } });
        return res.status(HTTP_STATUS.OK).json({ message: 'Đã thêm học sinh vào lớp' });
    } catch (err) {
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};

exports.addTeachersToClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { teacherIds } = req.body;
        const classDoc = await Class.findById(id);
        if (!classDoc) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Không tìm thấy lớp' });
        }
        if (classDoc.teacher.length + teacherIds.length > 2) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Một lớp chỉ được tối đa 2 giáo viên' });
        }
        await Class.findByIdAndUpdate(id, { $addToSet: { teacher: { $each: teacherIds } } });
        return res.status(HTTP_STATUS.OK).json({ message: 'Đã thêm giáo viên vào lớp' });
    } catch (err) {
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};

exports.removeStudentFromClass = async (req, res) => {
    try {
        const { classId, studentId } = req.params;
        await Class.findByIdAndUpdate(classId, { $pull: { students: studentId } });
        return res.status(HTTP_STATUS.OK).json({ message: 'Đã gỡ học sinh khỏi lớp' });
    } catch (err) {
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};

exports.removeTeacherFromClass = async (req, res) => {
    try {
        const { classId, teacherId } = req.params;
        await Class.findByIdAndUpdate(classId, { $pull: { teacher: teacherId } });
        return res.status(HTTP_STATUS.OK).json({ message: 'Đã gỡ giáo viên khỏi lớp' });
    } catch (err) {
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};


exports.getAvailableStudents = async (req, res) => {
    try {
        const classes = await Class.find({}, 'students');
        const assignedStudentIds = classes.flatMap(cls =>
            Array.isArray(cls.students)
                ? cls.students.map(id => id?.toString()).filter(Boolean)
                : []
        );

        const availableStudents = await Student.find({
            _id: { $nin: assignedStudentIds },
            status: true
        }).select('studentCode fullName dob');

        res.status(200).json(availableStudents);
    } catch (error) {
        console.error("Error fetching available students:", error);
        res.status(500).json({ error: "Server error" });
    }
};



exports.getAvailableTeachers = async (req, res) => {
    try {
        const classes = await Class.find({}, 'teacher');
        const assignedTeacherIds = classes.flatMap(cls =>
            Array.isArray(cls.teacher)
                ? cls.teacher.map(id => id?.toString()).filter(Boolean)
                : []
        );

        const availableTeachers = await Teacher.find({
            _id: { $nin: assignedTeacherIds },
            status: true
        }).select('fullName phoneNumber');

        res.status(200).json(availableTeachers);
    } catch (error) {
        console.error("Error fetching available teachers:", error);
        res.status(500).json({ error: "Server error" });
    }
};


exports.createClassBatch = async (req, res) => {
    const { classes } = req.body;

    if (!Array.isArray(classes) || classes.length === 0) {
        return res.status(400).json({ message: 'Invalid class data' });
    }

    try {
        const createdClasses = await Class.insertMany(classes);
        return res.status(201).json(createdClasses);
    } catch (error) {
        console.error("Error creating class batch:", error.message);
        return res.status(500).json({ message: 'Server error' });
    }
}

exports.statisticSchoolYear = async (req, res) => {
    try {
        console.log("1111")
        const data = await Class.aggregate([
            {
                $group: {
                    _id: "$schoolYear",
                    totalClasses: { $sum: 1 },
                    totalStudents: { $sum: { $size: "$students" } },
                    totalTeachers: { $sum: { $size: "$teacher" } },
                },
            },
            { $sort: { _id: 1 } }
        ]);

        return res.status(HTTP_STATUS.OK).json({
            message: RESPONSE_MESSAGE.SUCCESS,
            data: data
        })
    } catch (error) {
        console.error("Error createNewSchoolYear:", error.message);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error.message);
    }
}

exports.createNewSchoolYear = async (req, res) => {
    try {
        const { schoolYear } = req.body;
        const errorList = [];
        if (!schoolYear) {
            errorList.push({ message: "Nhập thiếu năm học bắt đầu và năm học kết thúc" });
        }
        const startYear = schoolYear.split("-")[0];
        const endYear = schoolYear.split("-")[1];
        const currentYear = new Date().getFullYear();
        const nextYear = (new Date().getFullYear()) + 1;
        if (startYear != currentYear) {
            errorList.push({ message: "Năm học bắt đầu không trùng khớp với thời gian hiện tại" });
        }
        if (endYear != nextYear) {
            errorList.push({ message: "Năm học kết thúc không trùng khớp với thời gian năm sau" });
        }

        const listClassOld = await Class.find({}).populate("students");

        const checkYearOld = listClassOld.find(item => item.schoolYear === schoolYear);

        if (checkYearOld) {
            errorList.push({ message: "Năm học này đã được tạo!" });
        }

        if (errorList.length > 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(errorList);
        }

        const newClasses = [];
        const graduateStudent = [];

        // Xử lý lên lớp
        for (const classOld of listClassOld) {
            const { teacher, className, students: studentList, room } = classOld;
            const nextAge = (parseInt(className.charAt(0))) + 1;
            const name = className.slice(1);
            const promoteStudent = [];
            for (const student of studentList) {
                const { age } = student;
                if (age === VALIDATION_CONSTANTS.MAX_STUDENT_AGE) {
                    graduateStudent.push(student._id);
                } else {
                    promoteStudent.push(student._id);
                }
            }
            if (nextAge <= VALIDATION_CONSTANTS.MAX_STUDENT_AGE) {
                const newDataClass = {
                    teacher: teacher,
                    className: `${nextAge}${name}`,
                    students: promoteStudent,
                    classAge: `${nextAge}`,
                    schoolYear: schoolYear,
                    room: room
                }
                newClasses.push(newDataClass);
            }
        }

        // Xử lý ra trường cho học sinh lớp 5
        if (graduateStudent.length > 0) {
            await Student.updateMany(
                { _id: { $in: graduateStudent } },
                { $set: { status: false } }
            );
        }

        const studentInClass = newClasses.flatMap(item => item.students.map(id => id.toString()))
        const studentNoClass = await Student.find({
            _id: { $nin: studentInClass },
            status: true
        });

        const usedRoomIds = await Class.distinct("room", { room: { $ne: null } });
        const unusedRooms = await Room.find({
            _id: { $nin: usedRoomIds },
            status: true
        });

        const usedTeacherIds = await Class.distinct("teacher", { teacher: { $ne: null } });
        const availableTeachers = await Teacher.find({
            _id: { $nin: usedTeacherIds },
            status: true
        });

        const ageGroups = { 1: [], 2: [], 3: [], 4: [], 5: [] };

        for (const student of studentNoClass) {
            const birthYear = new Date(student.dob).getFullYear();
            const age = currentYear - birthYear;

            if (age >= VALIDATION_CONSTANTS.MIN_STUDENT_AGE && age <= VALIDATION_CONSTANTS.MAX_STUDENT_AGE) {
                ageGroups[age].push(student._id);
            }
        }

        let teacherIndex = 0;
        let roomIndex = 0;

        for (let age = VALIDATION_CONSTANTS.MIN_STUDENT_AGE; age <= VALIDATION_CONSTANTS.MAX_STUDENT_AGE; age++) {
            const studentList = ageGroups[age];
            if (studentList.length === 0) continue;

            const ageClasses = newClasses.filter(cls => parseInt(cls.classAge) === age);
            const usedSuffixes = ageClasses.map(cls => cls.className.slice(1));
            let suffixIndex = usedSuffixes.length;

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
                    const newSuffix = VALIDATION_CONSTANTS.CLASS_SUFFIXES[suffixIndex++];
                    const className = `${age}${newSuffix}`;

                    let assignedTeachers = [];
                    if (teacherIndex + 1 < availableTeachers.length) {
                        assignedTeachers = [
                            availableTeachers[teacherIndex]._id,
                            availableTeachers[teacherIndex + 1]._id
                        ];
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

                    newClasses.push(newClass);
                    ageClasses.push(newClass);
                }
            }
        }


        // add lớp tạo mới
        if (newClasses.length > 0) {
            await Class.insertMany(newClasses);
        }

        return res.status(HTTP_STATUS.CREATED).json({
            message: RESPONSE_MESSAGE.OK,
            dataList: newClasses,
        })

    } catch (error) {
        console.error("Error createNewSchoolYear:", error.message);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error.message);
    }
}

