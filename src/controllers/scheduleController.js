const Class = require("../models/classModel");
const Curriculum = require("../models/curriculumModel");
const { HTTP_STATUS } = require("../constants/useConstants");
const { generateScheduleWithGemini } = require("../AI/aiController");
const Schedule = require("../models/scheduleModel");

// Map classAge to age group key and class_name
const ageGroupMap = {
    1: {
        key: "1_years",
        age_group: "1 years",
        class_name: "Nursery",
        ageNum: "1",
    },
    2: {
        key: "2_years",
        age_group: "2 years",
        class_name: "Nursery",
        ageNum: "2",
    },
    3: {
        key: "3_years",
        age_group: "3 years",
        class_name: "Preschool",
        ageNum: "3",
    },
    4: {
        key: "4_years",
        age_group: "4 years",
        class_name: "Kindergarten 1",
        ageNum: "4",
    },
    5: {
        key: "5_years",
        age_group: "5 years",
        class_name: "Kindergarten 2",
        ageNum: "5",
    },
};

exports.getSchoolClassesAndCurriculum = async (req, res) => {
    try {
        const { year } = req.body;

        // Lấy danh sách lớp theo năm học
        const classes = await Class.find({
            schoolYear: year,
            status: true, // Chỉ lấy lớp còn hiệu lực
        }).select("className classAge");
        // console.log("Classes:", classes);
        // Gom nhóm lớp theo age group
        const school_classes = {
            "1_years": [],
            "2_years": [],
            "3_years": [],
            "4_years": [],
            "5_years": [],
        };
        classes.forEach((cls) => {
            const age = String(cls.classAge);
            if (ageGroupMap[age]) {
                school_classes[ageGroupMap[age].key].push(cls.className);
            }
        });

        // Lấy curriculum còn hiệu lực
        const curriculums = await Curriculum.find({ status: true });

        const preschool_schedule = [];
        // Duyệt từng age group
        Object.values(ageGroupMap).forEach(
            ({ age_group, class_name, ageNum }, idx) => {
                // Lấy curriculum cho age group này
                // let ageNum = age_group;
                // if (age_group === "1-2 years") ageNum = 1; // curriculum lưu age là số
                const activities = curriculums
                    .filter((c) => {
                        if (!c.activityFixed) {
                            return c.age === ageNum;
                        }
                        return false;
                    })
                    .map((c) => ({
                        name: c.activityName,
                        lessons_per_week: c.activityNumber,
                    }));
                // Nếu đã có activities thì push vào preschool_schedule
                if (activities.length > 0) {
                    // Tránh trùng lặp age_group/class_name
                    if (
                        !preschool_schedule.some(
                            (s) => s.age_group === age_group
                        )
                    ) {
                        preschool_schedule.push({
                            age_group,
                            class_name,
                            activities,
                        });
                    }
                }
            }
        );

        return res.status(HTTP_STATUS.OK).json({
            school_classes,
            preschool_schedule,
        });
    } catch (err) {
        return res
            .status(HTTP_STATUS.SERVER_ERROR)
            .json({ message: err.message });
    }
};

exports.genScheduleWithAI = async (req, res) => {
    try {
        const { year } = req.query;
        const classes = await Class.find({
            schoolYear: year,
            status: true,
        }).select("className classAge");
        const school_classes = {
            "1_years": [],
            "2_years": [],
            "3_years": [],
            "4_years": [],
            "5_years": [],
        };
        classes.forEach((cls) => {
            const age = String(cls.classAge);
            if (ageGroupMap[age]) {
                school_classes[ageGroupMap[age].key].push(cls.className);
            }
        });

        const curriculums = await Curriculum.find({ status: true });
        const preschool_schedule = [];
        Object.values(ageGroupMap).forEach(
            ({ age_group, class_name, ageNum }, idx) => {
                const activities = curriculums
                    .filter((c) => {
                        if (!c.activityFixed) {
                            return c.age === ageNum;
                        }
                        return false;
                    })
                    .map((c) => ({
                        name: c.activityName,
                        lessons_per_week: c.activityNumber,
                    }));
                if (activities.length > 0) {
                    if (
                        !preschool_schedule.some(
                            (s) => s.age_group === age_group
                        )
                    ) {
                        preschool_schedule.push({
                            age_group,
                            class_name,
                            activities,
                        });
                    }
                }
            }
        );

        const genAIResult = await generateScheduleWithGemini({
            school_classes,
            preschool_schedule,
        });

        let result = genAIResult;
        if (typeof result === "string") {
            result = result.trim();
            if (result.startsWith("```json")) {
                result = result.replace(/```json|```/g, "").trim();
            }
            try {
                result = JSON.parse(result);
            } catch (e) { }
        }

        const fixedCurriculums = await getCurriculumFixedTimeList();

        const mergedResult = await mergeFixedActivities(
            result,
            fixedCurriculums
        );
        return res.status(HTTP_STATUS.OK).json({
            schedules: mergedResult,
        });
    } catch (err) {
        return res
            .status(HTTP_STATUS.SERVER_ERROR)
            .json({ message: err.message });
    }
};

exports.getCurriculumFixedTime = async (req, res) => {
    const curriculums = await Curriculum.find({
        activityFixed: true,
        status: true,
    });
    // return curriculums.map((c) => ({
    //     id: c._id,
    //     activityName: c.activityName,
    //     age: c.age,
    //     fixed: c.activityFixed,
    //     time:
    //         c.startTime && c.endTime
    //             ? `${toTimeStr(c.startTime)}-${toTimeStr(c.endTime)}`
    //             : "",
    // }));
    return res.status(HTTP_STATUS.OK).json({
        curriculums: await getCurriculumFixedTimeList(),
    });
};

function toTimeStr(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

async function getCurriculumFixedTimeList() {
    const curriculums = await Curriculum.find({
        activityFixed: true,
        status: true,
    });

    return curriculums.map((c) => ({
        id: c._id,
        activityName: c.activityName,
        age: c.age,
        fixed: c.activityFixed,
        time:
            c.startTime && c.endTime
                ? `${toTimeStr(c.startTime)}-${toTimeStr(c.endTime)}`
                : "",
    }));
}

async function mergeFixedActivities(scheduleArr, fixedCurriculums) {
    function getAgeFromClassName(className) {
        const match = className.match(/^(\d)/);
        return match ? match[1] : null;
    }

    function parseTimeRange(timeStr) {
        if (!timeStr) return [0, 0];
        const [start, end] = timeStr.split("-");
        const toNum = (t) => parseInt(t.replace(":", ""), 10);
        return [toNum(start), toNum(end)];
    }

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    return await Promise.all(
        scheduleArr.map(async (cls) => {
            const age = getAgeFromClassName(cls.class);
            const fixedForAll = fixedCurriculums.filter(
                (f) => f.age === "Tất cả"
            );
            const fixedForAge = fixedCurriculums.filter((f) => f.age === age);
            const allFixed = [...fixedForAll, ...fixedForAge];

            const newSchedule = {};
            for (const day of days) {
                const originActs2 = await Promise.all(
                    (cls.schedule[day] || []).map(async (act) => {
                        const id = await Curriculum.findOne({
                            activityFixed: false,
                            status: true,
                            activityName: act.activity,
                            age: Number(age),
                        });
                        return {
                            id: id?._id,
                            age: age,
                            time: act.time,
                            activity: act.activity,
                            fixed: false,
                        };
                    })
                );

                const fixedActs = allFixed.map((f) => ({
                    id: f.id,
                    age: f.age,
                    time: f.time,
                    activity: f.activityName,
                    fixed: true,
                }));

                const merged = [...originActs2, ...fixedActs]
                    .filter((a) => a.time)
                    .sort((a, b) => {
                        const [aStart] = parseTimeRange(a.time);
                        const [bStart] = parseTimeRange(b.time);
                        return aStart - bStart;
                    });

                newSchedule[day] = merged;
            }

            return {
                ...cls,
                schedule: newSchedule,
            };
        })
    );
}

exports.saveClassSchedule = async (req, res) => {
    try {
        const { year, schedules } = req.body;
        const results = [];

        for (const classSchedule of schedules) {
            // Tìm classId từ tên lớp (className)
            const classDoc = await Class.findOne({
                className: classSchedule.class,
                schoolYear: year,
            });
            if (!classDoc) {
                results.push({
                    class: classSchedule.class,
                    error: "Class not found",
                });
                continue;
            }

            // Chuyển đổi từng activity sang đúng format
            const scheduleObj = {};
            for (const day of Object.keys(classSchedule.schedule)) {
                scheduleObj[day] = [];
                for (const activity of classSchedule.schedule[day]) {
                    if (!activity.id) {
                        results.push({
                            class: classSchedule.class,
                            day,
                            activity: activity.activity,
                            error: "Curriculum id missing",
                        });
                        continue;
                    }
                    scheduleObj[day].push({
                        time: activity.time,
                        fixed: activity.fixed,
                        curriculum: activity.id, // lấy trực tiếp id
                    });
                }
            }

            // Upsert schedule cho từng class + year
            await Schedule.findOneAndUpdate(
                { class: classDoc._id, schoolYear: year },
                {
                    class: classDoc._id,
                    schoolYear: year,
                    schedule: scheduleObj,
                },
                { upsert: true, new: true }
            );
            results.push({ class: classSchedule.class, status: "Saved" });
        }

        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.mergeActivity = async (req, res) => {
    const scheduleArr = req.body.schedules;
    const fixedCurriculums = await getCurriculumFixedTimeList();
    const mergedResult = await mergeFixedActivities(
        scheduleArr,
        fixedCurriculums
    );
    return res.status(HTTP_STATUS.OK).json({
        schedules: mergedResult,
    });
};

exports.checkYearExistedSchedule = async (req, res) => {
    try {
        const { year } = req.query;
        const schedules = await Schedule.find({ schoolYear: year });
        if (schedules.length > 0) {
            return res.status(HTTP_STATUS.OK).json({
                exists: true,
                message: `Schedules for year ${year} already exist.`,
            });
        }
        return res.status(HTTP_STATUS.OK).json({
            exists: false,
            message: `No schedules found for year ${year}.`,
        });
    } catch (err) {
        return res
            .status(HTTP_STATUS.SERVER_ERROR)
            .json({ message: err.message });
    }
};

exports.getScheduleByClassNameAndYear = async (req, res) => {
    try {
        const { schoolYear, className } = req.query;

        if (!schoolYear || !className) {
            return res
                .status(400)
                .json({ message: "Thiếu schoolYear hoặc className" });
        }

        // Tìm class theo schoolYear và className
        const classDoc = await Class.findOne({
            schoolYear: schoolYear,
            className: className,
            status: true, // Chỉ lấy lớp còn hiệu lực
        });

        if (!classDoc) {
            return res.status(404).json({ message: "Không tìm thấy lớp học" });
        }

        // Tìm schedule của class
        const scheduleDoc = await Schedule.findOne({
            class: classDoc._id,
            schoolYear,
        }).lean(); // Dùng lean để xử lý nhanh hơn

        if (!scheduleDoc) {
            return res.status(404).json({ message: "Không tìm thấy lịch học" });
        }

        const schedule = {};

        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

        for (const day of days) {
            const activities = scheduleDoc.schedule[day] || [];

            // Populate thủ công curriculum
            const populatedActivities = await Promise.all(
                activities.map(async (activity) => {
                    const curriculum = await Curriculum.findById(
                        activity.curriculum
                    ).lean();
                    return {
                        id: curriculum._id.toString(),
                        age: curriculum.age,
                        time: activity.time,
                        activity: curriculum.activityName,
                        fixed: activity.fixed,
                    };
                })
            );

            schedule[day] = populatedActivities;
        }

        return res.status(200).json({
            schedule,
        });
    } catch (error) {
        console.error("Lỗi lấy lịch học:", error);
        return res.status(500).json({ message: "Lỗi server" });
    }
};
