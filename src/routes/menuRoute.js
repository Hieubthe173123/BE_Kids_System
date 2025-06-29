const express = require("express");
const router = express.Router();
const { findAllGeneric, findIdGeneric} = require('../controllers/useController');
const verifyToken = require("../middlewares/verifyToken");
const weeklyMenuModel = require("../models/weeklyMenuModel");

router.get("/", verifyToken, findAllGeneric(weeklyMenuModel, [""]));
router.get("/:id", verifyToken,  findIdGeneric(weeklyMenuModel, [""]));
router.post("/", verifyToken, async (req, res) => {
    try {
        const { weekStart, dailyMenus } = req.body;
        const newMenu = new weeklyMenuModel({ weekStart, dailyMenus });
        const savedMenu = await newMenu.save();
        res.status(201).json(savedMenu);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.put("/:id", verifyToken, async (req, res) => {
    try {
        const { weekStart, dailyMenus } = req.body;
        const updatedMenu = await weeklyMenuModel.findByIdAndUpdate(
            req.params.id,
            { weekStart, dailyMenus },
            { new: true }
        );
        if (!updatedMenu) {
            return res.status(404).json({ message: "Thực đơn không tìm thấy" });
        }
        res.status(200).json(updatedMenu);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const deletedMenu = await weeklyMenuModel.findByIdAndDelete(req.params.id);
        if (!deletedMenu) {
            return res.status(404).json({ message: "Thực đơn không tìm thấy" });
        }
        res.status(200).json({ message: "Đã xóa thực đơn theo tuần" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


module.exports = router;