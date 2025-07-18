const { app } = require('@azure/functions');
const connectDB = require("../shared/mongoose");
const moment = require('moment');
const { HTTP_STATUS, RESPONSE_MESSAGE } = require('../src/constants/useConstants');
const Curriculum = require('../src/models/curriculumModel');

// 1. Lấy tất cả chương trình học
app.http('getAllCurriculums', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'curriculum',
    handler: async (request, context) => {
        try {
            await connectDB();
            const curriculums = await Curriculum.find({ status: true });
            return {
                status: HTTP_STATUS.OK,
                jsonBody: { data: curriculums }
            };
        } catch (err) {
            context.log("Lỗi khi lấy danh sách chương trình học:", err);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

// 2. Lấy chương trình học theo ID
app.http('getCurriculumById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'curriculum/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const curriculum = await Curriculum.findById(id);
            if (!curriculum) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: "Không tìm thấy chương trình học" } };
            }
            return { status: HTTP_STATUS.OK, jsonBody: { data: curriculum } };
        } catch (err) {
            context.log("Lỗi khi lấy chương trình học theo ID:", err);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

// 3. Tạo chương trình học mới
app.http('createCurriculum', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'curriculum',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { activityName, activityFixed, age, activityNumber } = await request.json();
            const errorList = [];
            if (!activityName) {
                errorList.push({ message: "Tên hoạt động bắt buộc nhập" });
            }
            if (!age) {
                errorList.push({ message: "Độ tuổi bắt buộc nhập" });
            }
            if (activityFixed === undefined && activityNumber === undefined) {
                errorList.push({ message: "Số tiết học bắt buộc nhập" });
            }
            if (errorList.length > 0) {
                return { status: HTTP_STATUS.BAD_REQUEST, jsonBody: errorList };
            }

            const today = moment().format('YY');
            const prefix = `CUR-${today}`;
            const lastCurriculum = await Curriculum.findOne({ curriculumCode: { $regex: `^${prefix}` } }).sort({ curriculumCode: -1 });
            let paddedNumber = '001';
            if (lastCurriculum) {
                const lastNumber = parseInt(lastCurriculum.curriculumCode.slice(prefix.length), 10);
                paddedNumber = String(lastNumber + 1).padStart(3, '0');
            }
            const curriculumCode = `${prefix}${paddedNumber}`;

            const newDataCurriculum = new Curriculum({
                curriculumCode, activityName, activityFixed, age, activityNumber
            });
            const newCurriculum = await newDataCurriculum.save();

            return {
                status: HTTP_STATUS.CREATED,
                jsonBody: { message: RESPONSE_MESSAGE.SUCCESS, data: newCurriculum }
            };
        } catch (err) {
            context.log("Lỗi khi tạo chương trình học:", err);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

// 4. Cập nhật chương trình học
app.http('updateCurriculum', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'curriculum/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const { activityName, activityFixed, age, activityNumber } = await request.json();
            const errorList = [];

            const curriculum = await Curriculum.findOne({ _id: id, status: true });
            if (!curriculum) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: [{ message: "Không tìm thấy chương trình học" }] };
            }

            if (!activityName) {
                errorList.push({ message: "Tên hoạt động bắt buộc nhập" });
            }
            if (!age) {
                errorList.push({ message: "Độ tuổi bắt buộc nhập" });
            }
            if (activityFixed === undefined && activityNumber === undefined) {
                errorList.push({ message: "Số tiết học bắt buộc nhập" });
            }
            if (errorList.length > 0) {
                return { status: HTTP_STATUS.BAD_REQUEST, jsonBody: errorList };
            }

            curriculum.activityName = activityName;
            curriculum.activityFixed = activityFixed;
            curriculum.age = age;
            curriculum.activityNumber = activityNumber;
            const updatedCurriculum = await curriculum.save();

            return {
                status: HTTP_STATUS.OK,
                jsonBody: { message: RESPONSE_MESSAGE.UPDATED, data: updatedCurriculum }
            };
        } catch (err) {
            context.log("Lỗi khi cập nhật chương trình học:", err);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

// 5. Xóa mềm chương trình học
app.http('softDeleteCurriculum', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'curriculum/delete/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const curriculum = await Curriculum.findByIdAndUpdate(id, { status: false }, { new: true });
            if (!curriculum) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: "Không tìm thấy chương trình học" } };
            }
            return {
                status: HTTP_STATUS.OK,
                jsonBody: { message: "Đã xóa mềm chương trình học thành công" }
            };
        } catch (err) {
            context.log("Lỗi khi xóa mềm chương trình học:", err);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: "Lỗi máy chủ" } };
        }
    }
});

// 6. Cập nhật thời gian cố định cho các hoạt động
app.http('createTimeFixed', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'curriculum/time-fixed',
    handler: async (request, context) => {
        try {
            await connectDB();
            const activityList = await request.json();
            const errorList = [];

            for (const activity of activityList) {
                const { activityId, startTime, endTime } = activity;
                const curriculum = await Curriculum.findById(activityId);

                if (!curriculum) {
                    errorList.push({ message: `Không tìm thấy hoạt động với ID: ${activityId}` });
                    continue;
                }
                if (!startTime) {
                    errorList.push({ message: `Thời gian bắt đầu bắt buộc nhập cho hoạt động ${curriculum.activityName}` });
                    continue;
                }
                if (!endTime) {
                    errorList.push({ message: `Thời gian kết thúc bắt buộc nhập cho hoạt động ${curriculum.activityName}` });
                    continue;
                }

                const start = new Date(startTime);
                const end = new Date(endTime);

                if (start >= end) {
                    errorList.push({ message: `Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc cho hoạt động ${curriculum.activityName}` });
                    continue;
                }

                // Logic kiểm tra trùng lặp
                const otherCurriculums = await Curriculum.find({
                    _id: { $ne: activityId },
                    status: true,
                    age: { $in: [curriculum.age, "Tất cả"] },
                    startTime: { $ne: null },
                    endTime: { $ne: null }
                });

                for (const other of otherCurriculums) {
                    const otherStart = new Date(other.startTime);
                    const otherEnd = new Date(other.endTime);
                    if (start < otherEnd && end > otherStart) {
                        errorList.push({ message: `Hoạt động "${curriculum.activityName}" bị trùng giờ với hoạt động "${other.activityName}"` });
                        break;
                    }
                }
            }

            if (errorList.length > 0) {
                return { status: HTTP_STATUS.BAD_REQUEST, jsonBody: errorList };
            }

            const bulkOps = activityList.map(({ activityId, startTime, endTime }) => ({
                updateOne: {
                    filter: { _id: activityId },
                    update: { $set: { startTime, endTime } },
                },
            }));

            const result = await Curriculum.bulkWrite(bulkOps);
            return { status: HTTP_STATUS.OK, jsonBody: { message: "Cập nhật thời gian thành công", result } };

        } catch (error) {
            context.log("Lỗi khi cập nhật thời gian cố định:", error);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: "Lỗi server, vui lòng thử lại sau" } };
        }
    }
});
