const Parent = require('../models/parentModel');
const Teacher = require('../models/teacherModel');
const Principal = require('../models/principalModel');
const Account = require('../models/accountModel');
const { HTTP_STATUS } = require('../constants/useConstants');

// GET /api/accounts/:id
exports.getAccountById = async (req, res) => {
    const { id } = req.params;

    try {
        const parent = await Parent.findById(id)
            .populate({
                path: 'account',
                select: '-password -createdAt -updatedAt -OTPnumber -exprire_in'
            })
            .populate('student');

        if (parent) return res.json({ role: 'parent', ...parent.toObject() });

        const teacher = await Teacher.findById(id)
            .populate({
                path: 'account',
                select: '-password -createdAt -updatedAt -OTPnumber -exprire_in'
            });

        if (teacher) return res.json({ role: 'teacher', ...teacher.toObject() });

        return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};


exports.getAllAccountsInfo = async (req, res) => {
    try {
        // Lấy tất cả parent và teacher, bỏ qua principal và admin
        const parents = await Parent.find()
            .populate({
                path: 'account',
                select: '-password -createdAt -updatedAt -OTPnumber -exprire_in'
            })
            .populate('student');

        const teachers = await Teacher.find()
            .populate({
                path: 'account',
                select: '-password -createdAt -updatedAt -OTPnumber -exprire_in'
            });

        const allAccounts = [
            ...parents.map(p => ({ role: 'parent', ...p.toObject() })),
            ...teachers.map(t => ({ role: 'teacher', ...t.toObject() }))
        ];

        res.status(200).json(allAccounts);
    } catch (err) {
        console.error("getAllAccountsInfo error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
