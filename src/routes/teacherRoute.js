const express = require("express");
const router = express.Router();
const Teacher = require("../models/teacherModel.js");
const { getTimeTable, getClasses, getStudents, getDashboard, deleteTeacher } = require('../controllers/teacherController.js');
const { createGeneric, findAllGeneric, deletedSoftGeneric, updateGeneric } = require('../controllers/useController.js');

const verifyToken = require("../middlewares/verifyToken");


router.get("/", verifyToken, findAllGeneric(Teacher));
router.post("/", verifyToken, createGeneric(Teacher));
router.put("/update-teacher/:id", verifyToken, updateGeneric(Teacher));
router.put("/delete-teacher/:id", verifyToken, deleteTeacher);

router.get("/time-table", verifyToken, getTimeTable);
router.get("/classes", verifyToken, getClasses);
router.get("/students/:classId", verifyToken, getStudents);
router.get("/dashboard", verifyToken, getDashboard);
module.exports = router;