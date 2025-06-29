const express = require("express");
const router = express.Router();
const { findAllGeneric, findIdGeneric } = require('../controllers/useController');
const Student = require("../models/studentModel");
const verifyToken = require("../middlewares/verifyToken");

router.get("/", verifyToken, findAllGeneric(Student));
router.get("/:id", verifyToken, findIdGeneric(Student));

module.exports = router;