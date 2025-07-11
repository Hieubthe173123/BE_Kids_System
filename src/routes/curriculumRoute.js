const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { findAllGeneric, deletedSoftGeneric, findIdGeneric } = require('../controllers/useController');
const Curriculum = require('../models/curriculumModel');
const { createCurriculum, updateCurriculum, createTimeFixed } = require('../controllers/curriculumController');


router.get("/", verifyToken, findAllGeneric(Curriculum));
router.get("/:id", verifyToken, findIdGeneric(Curriculum));
router.post("/", verifyToken, createCurriculum);
router.put("/:id", verifyToken, updateCurriculum);
router.put("/delete/:id", verifyToken, deletedSoftGeneric(Curriculum));
router.post("/time-fixed", verifyToken, createTimeFixed);


module.exports = router;