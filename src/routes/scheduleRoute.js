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
} = require("../controllers/scheduleController");

router.get("/getclass", getSchoolClassesAndCurriculum);
router.get("/genAI", genScheduleWithAI);

module.exports = router;
