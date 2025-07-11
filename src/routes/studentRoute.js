const express = require("express");
const router = express.Router();
const { findAllGeneric, findIdGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controllers/useController');
const Student = require("../models/studentModel");
const Parent = require("../models/parentModel");
const verifyToken = require("../middlewares/verifyToken");

router.get("/no-parent", async (req, res) => {
  try {
    const studentsWithParents = await Parent.distinct("student");

    const studentsWithoutParents = await Student.find({
      _id: { $nin: studentsWithParents },
    });

    res.status(200).json(studentsWithoutParents);
  } catch (err) {
    console.error("Error fetching students without parents:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", verifyToken, findAllGeneric(Student));
router.get("/:id", verifyToken, findIdGeneric(Student));
router.post("/", verifyToken, createGeneric(Student));
router.put("/:id", verifyToken, updateGeneric(Student));
router.delete("/:id", verifyToken, deletedSoftGeneric(Student));

module.exports = router;