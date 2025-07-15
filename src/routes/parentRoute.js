const express = require("express");
const router = express.Router();

const {
  findAllGeneric,
  findIdGeneric,
  createGeneric,
  deletedSoftGeneric,
  updateGeneric
} = require('../controllers/useController');
const multer = require('multer');
const upload = multer(); 
const { getStudentsByParentId, getUnusedParentAccounts, getScheduleByClassId, uploadPictureProfile, getAttendanceByStudentID } = require('../controllers/parentController');

const Parent = require("../models/parentModel");
const Account = require("../models/accountModel");
const verifyToken = require("../middlewares/verifyToken");

// CRUD APIs
router.post("/", verifyToken, createGeneric(Parent));
router.put("/:id", verifyToken, updateGeneric(Parent));
router.delete("/:id", verifyToken, deletedSoftGeneric(Parent));
router.get("/unused", verifyToken, getUnusedParentAccounts)
router.get("/", verifyToken, findAllGeneric(Parent, ["student"]));
router.get("/:id", verifyToken, findIdGeneric(Parent, ["student"]));
router.get('/:parentId/students', getStudentsByParentId);
router.get("/schedule/:classId", getScheduleByClassId);
router.get("/attendance/:studentId", getAttendanceByStudentID);
router.post("/:parentId/upload-picture",  upload.single('file'), uploadPictureProfile);

module.exports = router;
