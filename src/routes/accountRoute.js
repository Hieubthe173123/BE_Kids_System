const express = require("express");
const router = express.Router();
const { findAllGeneric, findIdGeneric, createGeneric } = require('../controllers/useController');
const Account = require("../models/accountModel");
const verifyToken = require("../middlewares/verifyToken");

router.get("/", verifyToken, findAllGeneric(Account));
router.get("/:id", verifyToken, findIdGeneric(Account));
router.post("/register", createGeneric(Account, ['username']));


module.exports = router;