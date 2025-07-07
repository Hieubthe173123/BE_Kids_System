const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { findAllGeneric, deletedSoftGeneric, findIdGeneric } = require('../controllers/useController');
const Curriculum = require('../models/curriculumModel');
const { createCurriculum, updateCurriculum } = require('../controllers/curriculumController');


router.get("/", findAllGeneric(Curriculum));
router.get("/:id", findIdGeneric(Curriculum));
router.post("/", createCurriculum);
router.put("/:id", updateCurriculum);
router.put("/delete/:id", deletedSoftGeneric(Curriculum));


module.exports = router;