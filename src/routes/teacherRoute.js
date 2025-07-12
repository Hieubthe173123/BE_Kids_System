const express = require("express");
const router = express.Router();
const { getTimeTable, getClasses, getStudents, getDashboard } = require('../controllers/teacherController.js');

const verifyToken = require("../middlewares/verifyToken");

router.get("/time-table", verifyToken, getTimeTable);
router.get("/classes", verifyToken, getClasses);
router.get("/students/:classId", verifyToken, getStudents);
router.get("/dashboard", verifyToken, getDashboard);
module.exports = router;