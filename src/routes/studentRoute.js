const express = require("express");
const router = express.Router();
const { findAllGeneric, findIdGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controllers/useController');
const Student = require("../models/studentModel");
const Parent = require("../models/parentModel");
const verifyToken = require("../middlewares/verifyToken");
const { getStudentsWithoutParents } = require("../controllers/studentController");

router.get("/no-parent", verifyToken, getStudentsWithoutParents);

router.get("/", verifyToken, findAllGeneric(Student));
router.get("/:id", verifyToken, findIdGeneric(Student));
router.post("/", verifyToken, createGeneric(Student));
router.put("/:id", verifyToken, updateGeneric(Student));
router.delete("/:id", verifyToken, deletedSoftGeneric(Student));

module.exports = router;