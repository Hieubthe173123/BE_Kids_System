const Attendance = require("../models/attendanceModel");
const Class = require("../models/classModel");
const Teacher = require("../models/teacherModel");

const getTodayString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

exports.getOrCreateTodayAttendance = async (req, res) => {
  try {
    const classId = req.params.classId;
    const accountId = req.account.id;

    // Xác minh giáo viên
    const teacher = await Teacher.findById(accountId);
    if (!teacher) {
      return res.status(404).json({ message: "Không tìm thấy giáo viên" });
    }

    const today = getTodayString();

    // Tìm điểm danh đã tồn tại
    let attendanceRecords = await Attendance.find({ classId, date: today })
      .populate("studentId")
      .populate("teacherId");

    if (attendanceRecords.length === 0) {
      // Tạo mới nếu chưa có
      const classData = await Class.findById(classId).populate("students");
      if (!classData) {
        return res.status(404).json({ message: "Không tìm thấy lớp" });
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

      await Attendance.insertMany(recordsToCreate);

      // Lấy lại dữ liệu sau khi tạo
      attendanceRecords = await Attendance.find({ classId, date: today })
        .populate("studentId")
        .populate("teacherId");
    }

    return res.status(200).json({ data: attendanceRecords });
  } catch (error) {
    console.error("Lỗi khi lấy điểm danh:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi lấy điểm danh" });
  }
};
