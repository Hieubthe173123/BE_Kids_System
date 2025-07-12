const express = require("express");
const router = express.Router();
const { getTimeTable, getClasses, getStudents } = require('../controllers/teacherController.js');

const verifyToken = require("../middlewares/verifyToken");

router.get("/time-table", verifyToken, getTimeTable);
router.get("/classes", verifyToken, getClasses);
router.get("/students", verifyToken, getStudents);

module.exports = router;