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

    const lastCurriculum = await Curriculum.findOne({
      curriculumCode: { $regex: `^${prefix}` }
    }).sort({ curriculumCode: -1 });

    let paddedNumber = '001';

    if (lastCurriculum) {
      const lastCode = lastCurriculum.curriculumCode;
      const lastNumber = parseInt(lastCode.slice(prefix.length), 10);
      paddedNumber = String(lastNumber + 1).padStart(3, '0');
    }

    const curriculumCode = `${prefix}${paddedNumber}`;

        const errorList = [];
        if(!activityName){
            errorList.push({ message: "Tên hoạt động bắt buộc nhập"});
        }
        if(!age){
            errorList.push({ message: "Độ tuổi bắt buộc nhập" });
        }
        if (!activityFixed && !activityNumber) {
            errorList.push({ message: "Số tiết học bắt buộc nhập" });
        }
        if(errorList.length > 0){
            return res.status(HTTP_STATUS.BAD_REQUEST).json(errorList);
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
        const errorList = [];
        const curriculum = await Curriculum.findOne({ _id: id, status: true });

        if (!curriculum) {
            errorList.push({ message: "Không tìm thấy chương trình học" });
        }
        if(!activityName){
            errorList.push({ message: "Tên hoạt động bắt buộc nhập"});
        }
        if(!age){
            errorList.push({ message: "Độ tuổi bắt buộc nhập" });
        }
        if (!activityFixed && !activityNumber) {
            errorList.push({ message: "Số tiết học bắt buộc nhập" });
        }

        if(errorList.length > 0){
            return res.status(HTTP_STATUS.BAD_REQUEST).json(errorList);
        }
        curriculum.activityName = req.body.activityName;
        curriculum.activityFixed = req.body.activityFixed;
        curriculum.age = req.body.age;
        curriculum.activityNumber = req.body.activityNumber;

        await curriculum.save();

        res.status(HTTP_STATUS.OK).json({ message: RESPONSE_MESSAGE.UPDATED, data: curriculum });

    } catch (err) {
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Server error" });
    }
}

exports.createTimeFixed = async (req, res) => {
  try {
    const activityList = req.body;
    const errorList = [];

    for (const activity of activityList) {
      const { activityId, startTime, endTime } = activity;
      const curriculum = await Curriculum.findById(activityId);

      if (!curriculum) {
        errorList.push({
          message: `Không tìm thấy hoạt động với ID: ${activityId}`,
        });
        continue;
      }

      if (!startTime) {
        errorList.push({
          message: `Thời gian bắt đầu bắt buộc nhập cho hoạt động ${curriculum.activityName}`,
        });
        continue;
      }

      if (!endTime) {
        errorList.push({
          message: `Thời gian kết thúc bắt buộc nhập cho hoạt động ${curriculum.activityName}`,
        });
        continue;
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (start >= end) {
        errorList.push({
          message: `Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc cho hoạt động ${curriculum.activityName}`,
        });
        continue;
      }

      const startHour = start.getUTCHours();
      const startMinute = start.getUTCMinutes();
      const endHour = end.getUTCHours();
      const endMinute = end.getUTCMinutes();

      const otherCurriculums = await Curriculum.find({
        _id: { $ne: activityId },
        status: true
      });

      const otherAgeCurriculums = otherCurriculums.filter(item =>
        item.age === curriculum.age || item.age === "Tất cả"
      );


      for (const other of otherAgeCurriculums) {
        if (!other.startTime || !other.endTime) continue;

        const otherStart = new Date(other.startTime);
        const otherEnd = new Date(other.endTime);

        const sameStartTime =
          otherStart.getUTCHours() === startHour &&
          otherStart.getUTCMinutes() === startMinute;

        const sameEndTime =
          otherEnd.getUTCHours() === endHour &&
          otherEnd.getUTCMinutes() === endMinute;

        if (sameStartTime || sameEndTime) {
          errorList.push({
            message: `Hoạt động "${curriculum.activityName}" bị trùng giờ với hoạt động "${other.activityName}"`,
          });
          break;
        }
      }
    }

    if (errorList.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(errorList);
    }

    const bulkOps = activityList.map(({ activityId, startTime, endTime }) => ({
      updateOne: {
        filter: { _id: activityId },
        update: {
          $set: {
            startTime,
            endTime,
          },
        },
      },
    }));

    const result = await Curriculum.bulkWrite(bulkOps);

    return res.status(HTTP_STATUS.OK).json({
      message: "Cập nhật thời gian thành công",
      result,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật thời gian cố định:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server, vui lòng thử lại sau",
    });
  }
};
