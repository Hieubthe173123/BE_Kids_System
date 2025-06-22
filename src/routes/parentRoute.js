const express = require("express");
const router = express.Router();
const { findAllGeneric, findIdGeneric} = require('../controllers/useController');
const Parent = require("../models/parentModel");
const verifyToken = require("../middlewares/verifyToken");

router.get("/", verifyToken, findAllGeneric(Parent, ["student"]));
router.get("/:id", verifyToken,  findIdGeneric(Parent, ["student"]));

module.exports = router;