const express = require("express");
const router = express.Router();
const { findAllGeneric, findIdGeneric } = require('../controllers/useController');
const verifyToken = require("../middlewares/verifyToken");
const weeklyMenuModel = require("../models/weeklyMenuModel");
const { updateWeeklyMenu, deleteWeeklyMenu, createWeeklyMenu } = require("../controllers/weeklyMenuController");

router.get("/", findAllGeneric(weeklyMenuModel, [""]));
router.get("/:id", verifyToken, findIdGeneric(weeklyMenuModel, [""]));
router.post("/", verifyToken, createWeeklyMenu);

router.put("/:id", verifyToken, updateWeeklyMenu);

router.delete("/:id", verifyToken, deleteWeeklyMenu);


module.exports = router;