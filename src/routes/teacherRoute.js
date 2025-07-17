const express = require("express");
const router = express.Router();
const Teacher = require("../models/teacherModel.js");

const { getTimeTable, getClasses, getStudents, getDashboard, deleteTeacher,getScheduleByClassId,getClassTeacher,getTeacherInClass, getScheduleByClassAndDate, swapSchedule } = require('../controllers/teacherController.js');
const { createGeneric, findAllGeneric, deletedSoftGeneric, updateGeneric } = require('../controllers/useController.js');

const verifyToken = require("../middlewares/verifyToken");
const { getOrCreateTodayAttendance, bulkUpdateAttendance , getAttendanceByDate } = require("../controllers/attendanceController.js");


router.get("/", verifyToken, findAllGeneric(Teacher));
router.post("/", verifyToken, createGeneric(Teacher));
router.put("/update-teacher/:id", verifyToken, updateGeneric(Teacher)); 
router.put("/delete-teacher/:id", verifyToken, deleteTeacher);

router.get("/time-table", verifyToken, getTimeTable);
router.get("/classes", verifyToken, getClasses);
router.get("/students/:classId", verifyToken, getStudents);
router.get("/dashboard", verifyToken, getDashboard);
router.get("/schedule/:classId", verifyToken, getScheduleByClassId);

router.get("/attendance/:classId", verifyToken, getOrCreateTodayAttendance);
router.get("/class-teacher",verifyToken,getClassTeacher);
router.put("/bulk-update", verifyToken, bulkUpdateAttendance);
router.get("/teacherinclass/:classId", verifyToken, getTeacherInClass);   
router.get("/attendance/history/:classId" , verifyToken, getAttendanceByDate);

router.get("/schedule/day/:classId", verifyToken, getScheduleByClassAndDate);
router.put("/schedule/swap-day" , verifyToken, swapSchedule);
module.exports = router;