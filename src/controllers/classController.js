const Class = require('../models/classModel');
const Student = require('../models/studentModel');
const Teacher = require('../models/teacherModel');
const {
    HTTP_STATUS,
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

        return res.status(HTTP_STATUS.OK).json({ data: classes });
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

        return res.status(HTTP_STATUS.OK).json({ data: classes });
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
        console.log(classDoc);

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



