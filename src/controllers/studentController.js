const Parent = require('../models/parentModel');
const Student = require('../models/studentModel');

exports.getStudentsWithoutParents = async (req, res) => {
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
};