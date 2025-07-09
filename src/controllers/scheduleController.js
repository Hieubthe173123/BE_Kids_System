const Class = require("../models/classModel");
const Curriculum = require("../models/curriculumModel");
const { HTTP_STATUS } = require("../constants/useConstants");
const { generateScheduleWithGemini } = require("../AI/aiController");

// Map classAge to age group key and class_name
const ageGroupMap = {
    1: { key: "1_years", age_group: "1 years", class_name: "Nursery" },
    2: { key: "2_years", age_group: "2 years", class_name: "Nursery" },
    3: { key: "3_years", age_group: "3 years", class_name: "Preschool" },
    4: { key: "4_years", age_group: "4 years", class_name: "Kindergarten 1" },
    5: { key: "5_years", age_group: "5 years", class_name: "Kindergarten 2" },
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
        console.log("Classes:", classes);
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
        // Gom curriculum thành preschool_schedule
        const preschool_schedule = [];
        // Duyệt từng age group
        Object.values(ageGroupMap).forEach(({ age_group, class_name }, idx) => {
            // Lấy curriculum cho age group này
            let ageNum = parseInt(age_group);
            // if (age_group === "1-2 years") ageNum = 1; // curriculum lưu age là số
            const activities = curriculums
                .filter((c) => {
                    if (!c.activityFixed) {
                        // if (age_group === "1-2 years")
                        //     return c.age === 1 || c.age === 2;
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
                    !preschool_schedule.some((s) => s.age_group === age_group)
                ) {
                    preschool_schedule.push({
                        age_group,
                        class_name,
                        activities,
                    });
                }
            }
        });

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
        // Gom curriculum thành preschool_schedule
        const preschool_schedule = [];
        // Duyệt từng age group
        Object.values(ageGroupMap).forEach(({ age_group, class_name }, idx) => {
            // Lấy curriculum cho age group này
            let ageNum = parseInt(age_group);
            // if (age_group === "1-2 years") ageNum = 1; // curriculum lưu age là số
            const activities = curriculums
                .filter((c) => {
                    if (!c.activityFixed) {
                        // if (age_group === "1-2 years")
                        //     return c.age === 1 || c.age === 2;
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
                    !preschool_schedule.some((s) => s.age_group === age_group)
                ) {
                    preschool_schedule.push({
                        age_group,
                        class_name,
                        activities,
                    });
                }
            }
        });

        // return res.status(HTTP_STATUS.OK).json({
        //     school_classes,
        //     preschool_schedule,
        // });
        const genAIResult = await generateScheduleWithGemini({
            school_classes,
            preschool_schedule,
        });

        // ...existing code...
        let result = genAIResult;
        if (typeof result === "string") {
            result = result.trim();
            if (result.startsWith("```json")) {
                result = result.replace(/```json|```/g, "").trim();
            }
            try {
                result = JSON.parse(result);
            } catch (e) {
                // Nếu không parse được thì giữ nguyên string
            }
        }
        return res.status(HTTP_STATUS.OK).json({
            result,
        });
        // ...existing code...
    } catch (err) {
        return res
            .status(HTTP_STATUS.SERVER_ERROR)
            .json({ message: err.message });
    }
};
