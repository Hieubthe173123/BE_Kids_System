const Parent = require('../models/parentModel');

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