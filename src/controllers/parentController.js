const Parent = require('../models/parentModel');
const Account = require('../models/accountModel');

exports.getStudentsByParentId = async (req, res) => {
    const { parentId } = req.params;

    try {
        const parent = await Parent.findById(parentId).populate('student');

        if (!parent) {
            return res.status(404).json({ message: 'Parent not found' });
        }
        return res.status(200).json({
            students: parent.student.map(student => ({
                id: student._id,
                name: student.fullName,
                age: student.age,
            })),
        });
    } catch (error) {
        console.error('Error fetching students by parent:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getUnusedParentAccounts = async (req, res) => {
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
};