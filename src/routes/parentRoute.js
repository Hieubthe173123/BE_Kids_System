const express = require("express");
const router = express.Router();
const { findAllGeneric, findIdGeneric} = require('../controllers/useController');
const Parent = require("../models/parentModel");

router.get("/", findAllGeneric(Parent, ["student"]));
router.get("/:id", findIdGeneric(Parent, ["student"]));

module.exports = router;