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
    const teacher = await Teacher.findOne({account:accountId});
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


exports.bulkUpdateAttendance = async (req, res) => {
    try {
      const updates = req.body; // [{ _id, status, note, checkInTime, checkOutTime }]
      const today = getTodayString();
  
      const bulkOps = updates
        .filter((r) => r.date === today) // Chỉ cho phép chỉnh sửa hôm nay
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
  
      await Attendance.bulkWrite(bulkOps);
  
      res.status(200).json({ message: "Cập nhật điểm danh thành công" });
    } catch (err) {
      res.status(500).json({ message: "Lỗi khi cập nhật điểm danh" });
    }
  };

  exports.getAttendanceByDate = async (req, res) => {
    try {
      const { classId } = req.params;
      const { date } = req.query;
  
      if (!date) {
        return res.status(400).json({ message: "Thiếu tham số ngày (date)" });
      }
  
      const records = await Attendance.find({ classId, date })
        .populate("studentId")
        .populate("teacherId");
  
      if (!records.length) {
        return res.status(400).json({ message: "Không tìm thấy dữ liệu điểm danh" });
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
  
      res.status(200).json({ data: result });
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử điểm danh:", error);
      res.status(500).json({ message: "Đã xảy ra lỗi khi truy vấn lịch sử điểm danh" });
    }
  };