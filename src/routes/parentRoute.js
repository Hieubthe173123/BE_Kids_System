const express = require("express");
const router = express.Router();

const { 
  findAllGeneric, 
  findIdGeneric, 
  createGeneric, 
  deletedSoftGeneric,
  updateGeneric
} = require('../controllers/useController');

const Parent = require("../models/parentModel");
const Account = require("../models/accountModel"); // <-- THÊM DÒNG NÀY
const verifyToken = require("../middlewares/verifyToken");

// CRUD APIs
router.post("/", verifyToken, createGeneric(Parent));
router.put("/:id", verifyToken, updateGeneric(Parent));
router.delete("/:id", verifyToken, deletedSoftGeneric(Parent));
router.get("/unused", verifyToken, async (req, res) => {
  try {
    const usedAccountIds = await Parent.find().distinct("account");

    const unusedAccounts = await Account.find({
      _id: { $nin: usedAccountIds },
      role: "parent",
      status: true,
    });

    res.status(200).json({
      success: true,
      data: unusedAccounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});
router.get("/", verifyToken, findAllGeneric(Parent, ["student"]));
router.get("/:id", verifyToken, findIdGeneric(Parent, ["student"]));
module.exports = router;
