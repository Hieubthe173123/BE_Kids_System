const Parent = require('../models/parentModel');
const Account = require('../models/accountModel');
const Schedule = require('../models/scheduleModel');
const Attendance = require('../models/attendanceModel');
const CLOUDINARY_HELPER = require('../helper/uploadImageHelper');

exports.uploadPictureProfile = async (req, res) => {
  const { parentId } = req.params;

  try {
    const parent = await Parent.findById(parentId);

    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imageUrl = await CLOUDINARY_HELPER.uploadBuffer(req.file.buffer, req.file.mimetype);
    parent.profilePicture = imageUrl;
    await parent.save();

    return res.status(200).json({ message: 'Profile picture uploaded successfully', imageUrl });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getStudentsByParentId = async (req, res) => {
  const { parentId } = req.params;

  try {
    const parent = await Parent.findById(parentId).populate('student');

    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    return res.status(200).json({
      students: parent.student.map(student => ({
        id: student._id,
        name: student.fullName,
        age: student.age,
      })),
    });
  } catch (error) {
    console.error('Error fetching students by parent:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUnusedParentAccounts = async (req, res) => {
  try {
    const usedAccountIds = await Parent.find().distinct("account");

    const unusedAccounts = await Account.find({
      _id: { $nin: usedAccountIds },
      role: "parent",
      status: true,
    });

    res.status(200).json({
      success: true,
      data: unusedAccounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getScheduleByClassId = async (req, res) => {
  try {
    const { classId } = req.params;
    console.log("classId", classId);
    const schedule = await Schedule.findOne({ class: classId })
      .populate({
        path: "class",
        populate: { path: "room", select: "roomName" },
        select: "className classAge schoolYear room"
      })
      .populate({
        path: "schedule.Monday.curriculum",
        select: "activityName activityFixed age"
      })
      .populate({
        path: "schedule.Tuesday.curriculum",
        select: "activityName activityFixed age"
      })
      .populate({
        path: "schedule.Wednesday.curriculum",
        select: "activityName activityFixed age"
      })
      .populate({
        path: "schedule.Thursday.curriculum",
        select: "activityName activityFixed age"
      })
      .populate({
        path: "schedule.Friday.curriculum",
        select: "activityName activityFixed age"
      });

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found for this class" });
    }

    res.json(schedule);
  } catch (err) {
    console.error("Error fetching schedule by classId:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

exports.getAttendanceByStudentID = async (req, res) => {
  const { studentId } = req.params;

  try {
    const attendanceRecords = await Attendance.find({ studentId })
      .sort({ date: -1 });

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(404).json({ message: 'No attendance records found for this student' });
    }
    const formattedData = attendanceRecords.map(record => {
      const { teacherId, ...rest } = record.toObject();
      return rest;
    });

    res.status(200).json({
      data: formattedData,
    });
  } catch (error) {
    console.error('Error fetching attendance by studentId:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
