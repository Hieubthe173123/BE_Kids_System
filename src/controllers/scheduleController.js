const Class = require("../models/classModel");
const Curriculum = require("../models/curriculumModel");
const { HTTP_STATUS } = require("../constants/useConstants");
const { generateScheduleWithGemini } = require("../AI/aiController");

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
        console.log("Year:", year);
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
        // console.log("Curriculums:", curriculums);
        // Gom curriculum thành preschool_schedule
        const preschool_schedule = [];
        // Duyệt từng age group
        Object.values(ageGroupMap).forEach(
            ({ age_group, class_name, ageNum }, idx) => {
                // Lấy curriculum cho age group này
                // let ageNum = age_group;
                console.log("Age group:", age_group, "Age number:", ageNum);
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
        const { year } = req.body;
        console.log("Year:", year);
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
            } catch (e) {}
        }
        return res.status(HTTP_STATUS.OK).json({
            result,
        });
    } catch (err) {
        return res
            .status(HTTP_STATUS.SERVER_ERROR)
            .json({ message: err.message });
    }
};
