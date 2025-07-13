const express = require("express");
const router = express.Router();

const {
  findAllGeneric,
  findIdGeneric,
  createGeneric,
  deletedSoftGeneric,
  updateGeneric
} = require('../controllers/useController');

const { getStudentsByParentId, getUnusedParentAccounts } = require('../controllers/parentController');

const Parent = require("../models/parentModel");
const Account = require("../models/accountModel"); // <-- THÊM DÒNG NÀY
const verifyToken = require("../middlewares/verifyToken");

// CRUD APIs
router.post("/", verifyToken, createGeneric(Parent));
router.put("/:id", verifyToken, updateGeneric(Parent));
router.delete("/:id", verifyToken, deletedSoftGeneric(Parent));
router.get("/unused", verifyToken, getUnusedParentAccounts)
router.get("/", verifyToken, findAllGeneric(Parent, ["student"]));
router.get("/:id", verifyToken, findIdGeneric(Parent, ["student"]));
router.get('/:parentId/students', getStudentsByParentId);

module.exports = router;
