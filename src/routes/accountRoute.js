const express = require("express");
const router = express.Router();
const { findAllGeneric, findIdGeneric, createGeneric } = require('../controllers/useController');
const Account = require("../models/accountModel");

router.get("/", findAllGeneric(Account));
router.get("/:id", findIdGeneric(Account));
router.post("/register",createGeneric(Account, ['username', 'role']));


module.exports = router;