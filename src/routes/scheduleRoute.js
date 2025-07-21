const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const {
    findAllGeneric,
    deletedSoftGeneric,
} = require("../controllers/useController");
const Schedule = require("../models/scheduleModel");
const {
    getSchoolClassesAndCurriculum,
    genScheduleWithAI,
    getCurriculumFixedTime,
    saveClassSchedule,
    mergeActivity,
    checkYearExistedSchedule,
    getScheduleByClassNameAndYear,
} = require("../controllers/scheduleController");

router.get("/getclass", getSchoolClassesAndCurriculum);
router.get("/genAI", genScheduleWithAI);
router.get("/fixed", getCurriculumFixedTime);
router.post("/save", saveClassSchedule);
router.get("/test", mergeActivity);
router.get("/check-year", checkYearExistedSchedule);
router.get("/class-schedule", getScheduleByClassNameAndYear);

module.exports = router;
