const { app } = require('@azure/functions');
const connectDB = require("../shared/mongoose");
const Class = require("../src/models/classModel");
const Curriculum = require("../src/models/curriculumModel");
const Schedule = require("../src/models/scheduleModel");
const { HTTP_STATUS } = require("../src/constants/useConstants");
const { generateScheduleWithGemini } = require("../src/AI/aiController");
const { DateTime } = require("luxon");


const ageGroupMap = {
    1: { key: "1_years", age_group: "1 years", class_name: "Nursery", ageNum: "1" },
    2: { key: "2_years", age_group: "2 years", class_name: "Nursery", ageNum: "2" },
    3: { key: "3_years", age_group: "3 years", class_name: "Preschool", ageNum: "3" },
    4: { key: "4_years", age_group: "4 years", class_name: "Kindergarten 1", ageNum: "4" },
    5: { key: "5_years", age_group: "5 years", class_name: "Kindergarten 2", ageNum: "5" },
};

function toTimeStr(dateStr) {
    if (!dateStr) return "";
    const dt = DateTime.fromISO(dateStr, { zone: "utc" }).setZone("Asia/Ho_Chi_Minh");
    return dt.toFormat("HH:mm");
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
            const fixedForAll = fixedCurriculums.filter((f) => f.age === "Tất cả");
            const fixedForAge = fixedCurriculums.filter((f) => String(f.age) === String(age));
            const allFixed = [...fixedForAll, ...fixedForAge];

            const newSchedule = {};
            for (const day of days) {
                const originActs = (cls.schedule[day] || []).map(async (act) => {
                    const curriculumDoc = await Curriculum.findOne({
                        activityFixed: false,
                        status: true,
                        activityName: act.activity,
                        age: Number(age),
                    });
                    return {
                        id: curriculumDoc?._id,
                        age: age,
                        time: act.time,
                        activity: act.activity,
                        fixed: false,
                    };
                });

                const resolvedOriginActs = await Promise.all(originActs);

                const fixedActs = allFixed.map((f) => ({
                    id: f.id,
                    age: f.age,
                    time: f.time,
                    activity: f.activityName,
                    fixed: true,
                }));

                const merged = [...resolvedOriginActs, ...fixedActs]
                    .filter((a) => a.time)
                    .sort((a, b) => {
                        const [aStart] = parseTimeRange(a.time);
                        const [bStart] = parseTimeRange(b.time);
                        return aStart - bStart;
                    });

                newSchedule[day] = merged;
            }
            return { ...cls, schedule: newSchedule };
        })
    );
}

// ===== AZURE FUNCTIONS =====

app.http('getSchoolClassesAndCurriculum', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'schedule/getclass',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { year } = await request.json();
            if (!year) {
                return { status: 400, jsonBody: { message: "Cần cung cấp 'year' trong body" } };
            }

            const classes = await Class.find({ schoolYear: year, status: true }).select("className classAge");
            const school_classes = { "1_years": [], "2_years": [], "3_years": [], "4_years": [], "5_years": [] };
            classes.forEach((cls) => {
                const age = String(cls.classAge);
                if (ageGroupMap[age]) {
                    school_classes[ageGroupMap[age].key].push(cls.className);
                }
            });

            const curriculums = await Curriculum.find({ status: true });
            const preschool_schedule = [];
            Object.values(ageGroupMap).forEach(({ age_group, class_name, ageNum }) => {
                const activities = curriculums
                    .filter(c => !c.activityFixed && String(c.age) === String(ageNum))
                    .map(c => ({ name: c.activityName, lessons_per_week: c.activityNumber }));

                if (activities.length > 0 && !preschool_schedule.some(s => s.age_group === age_group)) {
                    preschool_schedule.push({ age_group, class_name, activities });
                }
            });

            return { status: HTTP_STATUS.OK, jsonBody: { school_classes, preschool_schedule } };
        } catch (err) {
            context.log(err);
            return { status: err.status || 500, jsonBody: { message: err.message || "Lỗi máy chủ" } };
        }
    }
});

app.http('genScheduleWithAI', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'schedule/genAI',
    handler: async (request, context) => {
        try {
            await connectDB();
            const year = request.query.get('year');
            if (!year) {
                return { status: 400, jsonBody: { message: "Cần cung cấp 'year' trong query parameter" } };
            }

            const classes = await Class.find({ schoolYear: year, status: true }).select("className classAge");
            const school_classes = { "1_years": [], "2_years": [], "3_years": [], "4_years": [], "5_years": [] };
            classes.forEach((cls) => {
                const age = String(cls.classAge);
                if (ageGroupMap[age]) {
                    school_classes[ageGroupMap[age].key].push(cls.className);
                }
            });
            const curriculums = await Curriculum.find({ status: true });
            const preschool_schedule = [];
            Object.values(ageGroupMap).forEach(({ age_group, class_name, ageNum }) => {
                const activities = curriculums
                    .filter(c => !c.activityFixed && String(c.age) === String(ageNum))
                    .map(c => ({ name: c.activityName, lessons_per_week: c.activityNumber }));

                if (activities.length > 0 && !preschool_schedule.some(s => s.age_group === age_group)) {
                    preschool_schedule.push({ age_group, class_name, activities });
                }
            });

            const genAIResult = await generateScheduleWithGemini({ school_classes, preschool_schedule });

            let result = genAIResult;
            if (typeof result === "string") {
                result = result.trim().replace(/```json|```/g, "").trim();
                try { result = JSON.parse(result); } catch (e) { }
            }

            const fixedCurriculums = await getCurriculumFixedTimeList();
            // context.log("Fixed curriculums:", fixedCurriculums);
            const mergedResult = await mergeFixedActivities(result, fixedCurriculums);

            return { status: HTTP_STATUS.OK, jsonBody: { schedules: mergedResult } };
        } catch (err) {
            context.log(err);
            return { status: err.status || 500, jsonBody: { message: err.message || "Lỗi máy chủ" } };
        }
    }
});

app.http('getCurriculumFixedTime', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'schedule/fixed',
    handler: async (request, context) => {
        try {
            await connectDB();
            const curriculums = await Curriculum.find({ activityFixed: true, status: true });
            const fixedTimes = curriculums.map((c) => ({
                id: c._id,
                activityName: c.activityName,
                age: c.age,
                fixed: c.activityFixed,
                time: c.startTime && c.endTime ? `${toTimeStr(c.startTime)}-${toTimeStr(c.endTime)}` : "",
            }));
            context.log("fixedTimes:", fixedTimes);
            return { status: HTTP_STATUS.OK, jsonBody: { data: fixedTimes } };
        } catch (err) {
            context.log(err);
            return { status: err.status || 500, jsonBody: { message: err.message || "Lỗi máy chủ" } };
        }
    }
});

app.http('saveClassSchedule', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'schedule/save',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { year, schedules } = await request.json();
            const results = [];

            for (const classSchedule of schedules) {
                const classDoc = await Class.findOne({ className: classSchedule.class, schoolYear: year });
                if (!classDoc) {
                    results.push({ class: classSchedule.class, error: "Class not found" });
                    continue;
                }

                const scheduleObj = {};
                for (const day of Object.keys(classSchedule.schedule)) {
                    scheduleObj[day] = classSchedule.schedule[day].map(activity => ({
                        time: activity.time,
                        fixed: activity.fixed,
                        curriculum: activity.id,
                    })).filter(act => act.curriculum);
                }

                await Schedule.findOneAndUpdate(
                    { class: classDoc._id, schoolYear: year },
                    { class: classDoc._id, schoolYear: year, schedule: scheduleObj },
                    { upsert: true, new: true }
                );
                results.push({ class: classSchedule.class, status: "Saved" });
            }
            return { status: 200, jsonBody: { success: true, results } };
        } catch (err) {
            context.log(err);
            return { status: err.status || 500, jsonBody: { message: err.message || "Lỗi máy chủ" } };
        }
    }
});

app.http('mergeActivity', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'schedule/test',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { schedules } = await request.json();
            const fixedCurriculums = await getCurriculumFixedTimeList();
            const mergedResult = await mergeFixedActivities(schedules, fixedCurriculums);
            return { status: HTTP_STATUS.OK, jsonBody: { schedules: mergedResult } };
        } catch (err) {
            context.log(err);
            return { status: err.status || 500, jsonBody: { message: err.message || "Lỗi máy chủ" } };
        }
    }
});

app.http('checkYearExistedSchedule', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'schedule/check-year',
    handler: async (request, context) => {
        try {
            await connectDB();
            const year = request.query.get('year');
            const schedules = await Schedule.find({ schoolYear: year });
            if (schedules.length > 0) {
                return { status: HTTP_STATUS.OK, jsonBody: { exists: true, message: `Schedules for year ${year} already exist.` } };
            }
            return { status: HTTP_STATUS.OK, jsonBody: { exists: false, message: `No schedules found for year ${year}.` } };
        } catch (err) {
            context.log(err);
            return { status: err.status || 500, jsonBody: { message: err.message || "Lỗi máy chủ" } };
        }
    }
});

app.http('getScheduleByClassNameAndYear', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'schedule/class-schedule',
    handler: async (request, context) => {
        try {
            await connectDB();
            const schoolYear = request.query.get('schoolYear');
            const className = request.query.get('className');

            if (!schoolYear || !className) {
                return { status: 400, jsonBody: { message: "Thiếu schoolYear hoặc className" } };
            }

            const classDoc = await Class.findOne({ schoolYear, className, status: true });
            if (!classDoc) {
                return { status: 404, jsonBody: { message: "Không tìm thấy lớp học" } };
            }

            const scheduleDoc = await Schedule.findOne({ class: classDoc._id, schoolYear }).lean();
            if (!scheduleDoc) {
                return { status: 404, jsonBody: { message: "Không tìm thấy lịch học" } };
            }

            const schedule = {};
            const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
            for (const day of days) {
                const activities = scheduleDoc.schedule[day] || [];
                const populatedActivities = await Promise.all(
                    activities.map(async (activity) => {
                        const curriculum = await Curriculum.findById(activity.curriculum).lean();
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
            return { status: 200, jsonBody: { schedule } };
        } catch (error) {
            context.log("Lỗi lấy lịch học:", error);
            return { status: error.status || 500, jsonBody: { message: error.message || "Lỗi server" } };
        }
    }
});
