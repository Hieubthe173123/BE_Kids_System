const express = require("express");
const router = express.Router();
const { findAllGeneric, findIdGeneric} = require('../controllers/useController');
const Student = require("../models/studentModel");

router.get("/", findAllGeneric(Student));
router.get("/:id", findIdGeneric(Student));

module.exports = router;