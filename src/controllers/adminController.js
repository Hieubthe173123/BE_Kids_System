const Parent = require('../models/parentModel');
const Teacher = require('../models/teacherModel');
const Principal = require('../models/principalModel');
const Account = require('../models/accountModel');
const Student = require('../models/studentModel');
const { HTTP_STATUS } = require('../constants/useConstants');

// GET /api/accounts/:id
exports.getAccountByIda = async (req, res) => {
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

exports.getAccountById = async (req, res) => {
    const { id } = req.params;
  
    try {
      // 1. Tìm trong Parent
      const parent = await Parent.findById(id)
        .populate({
          path: 'account',
          select: '-password -OTPnumber -exprire_in -createdAt -updatedAt',
        })
        .populate('student');
  
      if (parent) {
        return res.json({
          role: 'parent',
          info: parent,
        });
      }
  
      // 2. Tìm trong Teacher
      const teacher = await Teacher.findById(id)
        .populate({
          path: 'account',
          select: '-password -OTPnumber -exprire_in -createdAt -updatedAt',
        });
  
      if (teacher) {
        return res.json({
          role: 'teacher',
          info: teacher,
        });
      }
  
      // 3. (Có thể thêm Principal tương tự)
      const principal = await Principal.findById(id)
        .populate({
          path: 'account',
          select: '-password -OTPnumber -exprire_in -createdAt -updatedAt',
        });
  
      if (principal) {
        return res.json({
          role: 'principal',
          info: principal,
        });
      }
  
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  };

  exports.saveAccountInfo = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
  
    try {
      // Cập nhật cho Parent
      const parent = await Parent.findById(id);
      if (parent) {
        // Cập nhật thông tin parent
        await Parent.findByIdAndUpdate(id, {
          fullName: data.fullName,
          dob: data.dob,
          gender: data.gender,
          phoneNumber: data.phoneNumber,
          email: data.email,
          IDCard: data.IDCard,
          address: data.address,
        });
  
        // Nếu có danh sách student, cập nhật từng học sinh
        if (Array.isArray(data.student)) {
          for (const stu of data.student) {
            if (stu._id || stu.id) {
              const studentId = stu._id || stu.id;
              await Student.findByIdAndUpdate(studentId, {
                fullName: stu.fullName,
                age: stu.age,
                gender: stu.gender,
              });
            }
          }
        }
  
        return res.json({ message: 'Cập nhật thành công (parent)' });
      }
  
      // Cập nhật cho Teacher
      const teacher = await Teacher.findById(id);
      if (teacher) {
        await Teacher.findByIdAndUpdate(id, {
          fullName: data.fullName,
          dob: data.dob,
          gender: data.gender,
          phoneNumber: data.phoneNumber,
          email: data.email,
          IDCard: data.IDCard,
          address: data.address,
        });
  
        return res.json({ message: 'Cập nhật thành công (teacher)' });
      }
  
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Lỗi server khi cập nhật tài khoản' });
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



