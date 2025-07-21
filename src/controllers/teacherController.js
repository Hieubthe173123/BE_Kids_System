const { HTTP_STATUS, RESPONSE_MESSAGE } = require('../constants/useConstants');
const Class = require('../models/classModel');
const Student = require('../models/studentModel');
const Teacher = require('../models/teacherModel');
const Room = require('../models/roomModel');
const Parent = require('../models/parentModel');
const Schedule = require("../models/scheduleModel.js");
const DailySchedule = require("../models/dailyscheduleModel.js");
const { getDatesInWeek } = require('../utils/validation');
// API 1: Lấy lịch dạy của teacher với phân trang (sử dụng Class model)
exports.getTimeTable = async (req, res) => {
  try {
    const teacherId = req.account.id;

    // Nếu không có year hoặc week thì dùng thời gian hiện tại
    const now = new Date();

    let year = parseInt(req.query.year);
    let week = parseInt(req.query.week);

    if (!year || isNaN(year)) {
      year = now.getFullYear();
    }

    if (!week || isNaN(week)) {
      // Tính tuần hiện tại
      const startOfYear = new Date(year, 0, 1);
      const daysPassed = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
      week = Math.ceil((daysPassed + startOfYear.getDay()) / 7);
    }

    // Tìm giáo viên
    const teacher = await Teacher.findOne({ account: teacherId });
    if (!teacher) {
      return res.status(404).json({ message: "Không tìm thấy giáo viên" });
    }

    // Tìm lớp của giáo viên
    const cls = await Class.findOne({ teacher: teacher._id, status: true })
      .populate("room", "roomName")
      .populate("students", "fullName studentCode");

    if (!cls) {
      return res.json({
        message: "Không có lớp nào",
        data: {
          schedules: [],
          weekRange: null,
        },
      });
    }

    // Tính ngày bắt đầu (Thứ 2) và kết thúc (Chủ nhật) của tuần đó
    const getStartOfWeek = (year, week) => {
      const jan4 = new Date(year, 0, 4); // ISO: tuần đầu tiên là tuần có ngày 4/1
      const dayOfWeek = jan4.getDay() || 7; // 0 (Sun) => 7
      const start = new Date(jan4);
      start.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
      return start;
    };

    const formatDate = (d) => {
      const date = new Date(d);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    const startOfWeek = getStartOfWeek(year, week);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const subjects = ["Toán", "Tiếng Việt", "Tiếng Anh", "Khoa học", "Lịch sử"];

    const schedules = Array.from({ length: 5 }).map((_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);

      const isMorning = i % 2 === 0;

      return {
        _id: `${cls._id}_${i}`,
        class: {
          _id: cls._id,
          className: cls.className,
          classAge: cls.classAge,
          schoolYear: cls.schoolYear,
        },
        room: cls.room,
        dayOfWeek: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"][i],
        timeSlot: isMorning ? "Buổi sáng" : "Buổi chiều",
        startTime: isMorning ? "08:00" : "14:00",
        endTime: isMorning ? "09:00" : "15:00",
        subject: subjects[i % subjects.length],
        studentCount: cls.students.length,
      };
    });

    return res.json({
      message: "Lấy lịch dạy thành công",
      data: {
        teacher: {
          _id: teacher._id,
          fullName: teacher.fullName,
          teacherCode: teacher.teacherCode,
        },
        weekRange: {
          from: formatDate(startOfWeek),
          to: formatDate(endOfWeek),
        },
        schedules,
      },
    });
  } catch (error) {
    console.error("getTimeTable error:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};


// API 2: Lấy danh sách lớp mà teacher đang dạy
exports.getClasses = async (req, res) => {
  try {
    const teacherId = req.account.id; // Lấy từ cookie token
    // Kiểm tra teacher có tồn tại không
    const teacher = await Teacher.findOne({ account: teacherId });
    if (!teacher) {
      return res.status(400).json({ message: 'Không tìm thấy giáo viên' });
    }

    // Lấy các lớp mà teacher đang dạy
    const classes = await Class.find({
      teacher: { $in: [teacher._id] },
      status: true,
      //schoolYear:"2024-2025"
    })


      .populate('room', 'roomName')
      .populate('students', 'fullName studentCode age gender')
      .select('-__v');

    res.json({
      message: 'Lấy danh sách lớp thành công',
      data: {
        teacher: {
          _id: teacher._id,
          fullName: teacher.fullName,
          teacherCode: teacher.teacherCode
        },
        classes: classes.map(cls => ({
          ...cls.toObject(),
          studentCount: cls.students.length
        }))
      }
    });
  } catch (error) {
    console.error('getClasses error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Lỗi server' });
  }
}

// API 3: Lấy danh sách học sinh trong một lớp cụ thể


exports.getStudents = async (req, res) => {
  try {
    const teacherId = req.account.id;
    const { classId } = req.params;

    const teacher = await Teacher.findOne({ account: teacherId });
    if (!teacher) {
      return res.status(400).json({ message: 'Không tìm thấy giáo viên' });
    }

    // Lấy lớp và danh sách học sinh
    const classData = await Class.findOne({
      _id: classId,
      teacher: teacher._id,
      status: true,
    }).populate({
      path: 'students',
      match: { status: true },
    });

    if (!classData) {
      return res.status(404).json({ message: 'Không tìm thấy lớp hoặc bạn không có quyền truy cập' });
    }

    const students = classData.students;

    // Duyệt từng học sinh, lấy thông tin phụ huynh tương ứng
    const studentList = await Promise.all(students.map(async (student) => {
      const parent = await Parent.findOne({ student: student._id }).select('fullName phoneNumber email address job');
      return {
        _id: student._id,
        fullName: student.fullName,
        studentCode: student.studentCode,
        age: student.age,
        gender: student.gender,
        address: student.address,
        image: student.image,
        note: student.note || "Không có ghi chú",
        parent: parent || null
      };
    }));

    return res.json({
      message: 'Lấy danh sách học sinh thành công',
      data: {
        class: {
          _id: classData._id,
          className: classData.className,
          classAge: classData.classAge,
          schoolYear: classData.schoolYear,
        },
        students: studentList,
      },
    });
  } catch (error) {
    console.error('getStudents error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};


exports.getDashboard = async (req, res) => {
  try {
    const teacherId = req.account.id;

    const teacher = await Teacher.findOne({ account: teacherId });
    if (!teacher) {
      return res.status(404).json({ message: "Không tìm thấy giáo viên" });
    }

    const cls = await Class.findOne({ teacher: teacher._id, status: true }).populate("students");
    if (!cls) {
      return res.status(404).json({ message: "Không có lớp nào được giao" });
    }



    res.json({

    });
  } catch (error) {
    console.error("getDashboard error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};


exports.deleteTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;

    const errorList = [];
    const data = await Teacher.findById(teacherId);
    if (!data) {
      errorList.push({ message: "Không tìm thấy dữ liệu" });
    }
    const isTeaching = await Class.findOne({ teacher: teacherId });
    if (isTeaching) {
      errorList.push({ message: `Giáo viên này đang dạy lớp ${isTeaching.className}` });
    }
    if (errorList.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(errorList);
    }
    data.status = false;
    await data.save();
    return res.status(HTTP_STATUS.OK).json(RESPONSE_MESSAGE.DELETED);
  } catch (error) {
    console.error("deleteTeacher error:", error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Lỗi server" });
  }
}


exports.getScheduleByClassId = async (req, res) => {
  try {
    const { classId } = req.params;
    const { year, week } = req.query;
    
    if (!classId || !year || !week) {
      return res.status(400).json({ message: "Thiếu tham số classId, year hoặc week" });
    }

    // 1. Lấy schedule gốc
    const mainSchedule = await Schedule.findOne({ class: classId })
      .populate("schedule.Monday.curriculum", "activityName activityFixed age")
      .populate("schedule.Tuesday.curriculum", "activityName activityFixed age")
      .populate("schedule.Wednesday.curriculum", "activityName activityFixed age")
      .populate("schedule.Thursday.curriculum", "activityName activityFixed age")
      .populate("schedule.Friday.curriculum", "activityName activityFixed age")
      .populate("class", "className classAge schoolYear room");

    if (!mainSchedule) {
      return res.status(404).json({ message: "Không tìm thấy thời khóa biểu" });
    }

    // 2. Tính ngày trong tuần (Monday -> Friday)
    const datesInWeek = getDatesInWeek(parseInt(year), parseInt(week));
    // { Monday: '2025-07-07', Tuesday: ..., ..., Friday: '2025-07-11' }
    
    // 3. Lấy các override từ DailySchedule theo date
    const overrideDates = Object.values(datesInWeek);

    const overrides = await DailySchedule.find({
      class: classId,
      date: { $in: overrideDates }
    }).populate("curriculum", "activityName activityFixed age");


    // 4. Tạo map để tra nhanh
    const overrideMap = {}; // { '2025-07-07': { '08:00-08:30': curriculumObj } }
    overrides.forEach(item => {
      const dateObj = new Date(item.date);
      const dateStr = dateObj.toISOString().split('T')[0];
      if (!overrideMap[dateStr]) overrideMap[dateStr] = {};
      overrideMap[dateStr][item.time] = item.curriculum;
    });
    //  console.log('overrides map', overrideMap);
    // console.log('check main schedule', mainSchedule);

    // 5. Gộp lịch
    const normalizeTime = (str) => str.replace(/\s+/g, '').replace(/[–—]/g, '-');

    const finalSchedule = {};

    for (const [day, dateStr] of Object.entries(datesInWeek)) {
      const dailySchedule = mainSchedule.schedule[day] || [];

      finalSchedule[day] = dailySchedule.map((item) => {
        const timeKey = normalizeTime(item.time);
        const overrideCurriculum = overrideMap[dateStr]?.[timeKey];


        return {
          time: item.time,
          fixed: item.fixed,
          curriculum: overrideCurriculum || item.curriculum,
          isSwapped: !!overrideCurriculum,
        };
      });
    }

    // 6. Trả kết quả
    res.json({
      class: mainSchedule.class,
      week: { year, week },
      datesInWeek,
      schedule: finalSchedule
    });
  } catch (err) {
    console.error("getScheduleByClassId error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};



exports.getClassTeacher = async (req, res) => {
  try {
    const accountId = req.account.id;
    const teacher = await Teacher.findOne({ account: accountId });
    if (!teacher) {
      return res.status(404).json({ message: "Không tìm thấy giáo viên" });
    }
    const classes = await Class.find({ teacher: teacher._id, status: true, schoolYear: "2024-2025" }).populate("students");
    res.json(classes);
  } catch (error) {
    console.error("getClassTeacher error:", error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Lỗi server" });
  }
}


exports.getTeacherInClass = async (req, res) => {
  try {
    const classId = req.params.classId;
    const classData = await Class.findById(classId).populate("teacher");
    if (!classData) {
      return res.status(404).json({ message: "Không tìm thấy lớp" });
    }

    res.json(classData.teacher);
  } catch (error) {
    console.error("getTeacherInClass error:", error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Lỗi server" });
  }
}



exports.getScheduleByClassAndDate = async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;


    if (!date) {
      return res.status(400).json({ message: "Thiếu tham số ngày (date)" });
    }

    // Lấy lịch gốc
    const mainSchedule = await Schedule.findOne({ class: classId })
      .populate("schedule.Monday.curriculum", "activityName activityFixed age")
      .populate("schedule.Tuesday.curriculum", "activityName activityFixed age")
      .populate("schedule.Wednesday.curriculum", "activityName activityFixed age")
      .populate("schedule.Thursday.curriculum", "activityName activityFixed age")
      .populate("schedule.Friday.curriculum", "activityName activityFixed age");

    if (!mainSchedule) {
      return res.status(400).json({ message: "Không tìm thấy thời khóa biểu" });
    }

    const weekday = new Date(date).toLocaleDateString("en-US", { weekday: "long" }); // e.g., Monday
    const todaySchedule = mainSchedule.schedule[weekday];

    if (!todaySchedule || todaySchedule.length === 0) {
      return res.status(400).json({ message: "Không có lịch dạy cho ngày này" });
    }

    // Lấy override trong dailySchedule
    const overrides = await DailySchedule.find({ class: classId, date }).populate("curriculum", "activityName activityFixed age");

    const overrideMap = {};
    overrides.forEach((item) => {
      overrideMap[item.time] = item.curriculum;
    });

    // Gộp
    const finalSchedule = todaySchedule.map((item) => ({
      time: item.time,
      fixed: item.fixed,
      curriculum: overrideMap[item.time] || item.curriculum,
      isSwapped: !!overrideMap[item.time]
    }));

    res.json({ date, classId, schedule: finalSchedule });
  } catch (err) {
    console.error("getScheduleByClassAndDate error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.swapSchedule = async (req, res) => {
  try {
    const { classId, date1, date2, time1, time2 } = req.body;

    if (!classId || !date1 || !date2 || !time1 || !time2) {
      return res.status(400).json({ message: "Thiếu thông tin đổi tiết" });
    }

    const getWeekday = (date) =>
      new Date(date).toLocaleDateString("en-US", { weekday: "long" });

    const weekday1 = getWeekday(date1);
    const weekday2 = getWeekday(date2);

    // Lấy lịch gốc
    const schedule = await Schedule.findOne({ class: classId })
      .populate("schedule.Monday.curriculum")
      .populate("schedule.Tuesday.curriculum")
      .populate("schedule.Wednesday.curriculum")
      .populate("schedule.Thursday.curriculum")
      .populate("schedule.Friday.curriculum");

    if (!schedule) {
      return res.status(400).json({ message: "Không tìm thấy thời khóa biểu chính" });
    }

    // Lấy lịch override nếu có
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
      return res.status(400).json({ message: "Không tìm thấy tiết học cần đổi" });
    }

    if (slot1.fixed || slot2.fixed) {
      return res.status(400).json({ message: "Chỉ được đổi các tiết không cố định" });
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

    res.json({ message: "Đổi tiết giữa hai ngày thành công" });
  } catch (err) {
    console.error("swapSchedule error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

