const Curriculum = require('../models/curriculumModel');
const { Model } = require("mongoose");
const moment = require('moment');
const {
    HTTP_STATUS, RESPONSE_MESSAGE,
} = require('../constants/useConstants');
const {
    findAllGeneric,
    findIdGeneric,
    deletedSoftGeneric
} = require('./useController');

exports.createCurriculum = async (req, res) => {
    try {
        const { activityName, activityFixed, age, activityNumber } = req.body;

        const today = moment().format('YY');
        const prefix = `CUR-${today}`;
        const countToday = await Curriculum.countDocuments({
            curriculumCode: { $regex: `^${prefix}` }
        });
        const paddedNumber = String(countToday + 1).padStart(3, '0');
        const curriculumCode = `${prefix}${paddedNumber}`;

        if (!activityFixed && !activityNumber) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Số tiết học bắt buộc nhập" });
        }
        const newDataCurriculum = new Curriculum({
            curriculumCode,
            activityName,
            activityFixed,
            age,
            activityNumber
        })
        const newCurriculum = await newDataCurriculum.save();

        return res.status(HTTP_STATUS.CREATED).json(
            {
                message: RESPONSE_MESSAGE.SUCCESS,
                data: newCurriculum
            }
        );

    } catch (err) {
        console.error("Logout error:", err);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Server error" });
    }
};

exports.updateCurriculum = async (req, res) => {
    try {
        const { activityName, activityFixed, age, activityNumber } = req.body;
        const { id } = req.params;
        if (!activityFixed && !activityNumber) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Số tiết học bắt buộc nhập" });
        }
        const curriculum = await Curriculum.findOne({ _id: id, status: true });

        if (!curriculum) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy chương trình học" });
        }

        curriculum.activityName = req.body.activityName;
        curriculum.activityFixed = req.body.activityFixed;
        curriculum.age = req.body.age;
        curriculum.activityNumber = req.body.activityNumber;

        await curriculum.save();

        res.status(HTTP_STATUS.OK).json({ message: RESPONSE_MESSAGE.UPDATED, data: curriculum });

    } catch (err) {
        console.error("Curriculum error:", err);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Server error" });
    }
}