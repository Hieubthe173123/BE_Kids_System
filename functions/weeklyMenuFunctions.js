const { app } = require('@azure/functions');
const connectDB = require("../shared/mongoose");
const WeeklyMenu = require('../src/models/weeklyMenuModel');

// ===== HELPER FUNCTION =====

// Hàm để lấy ngày đầu tuần (Thứ 2) từ bất kỳ ngày nào
function getStartOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Chuẩn hóa về đầu ngày
    const day = d.getDay(); // 0 = Chủ Nhật, 1 = Thứ 2, ..., 6 = Thứ 7
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Điều chỉnh về Thứ 2
    return new Date(d.setDate(diff));
}


// ===== STANDARD CRUD FROM ROUTER =====

// 1. Lấy tất cả thực đơn tuần
app.http('getAllWeeklyMenus', {
    methods: ['GET'],
    authLevel: 'anonymous', // Thay đổi authLevel nếu cần xác thực
    route: 'weeklyMenu',
    handler: async (request, context) => {
        try {
            await connectDB();
            const weeklyMenus = await WeeklyMenu.find({});
            return { status: 200, jsonBody: weeklyMenus };
        } catch (err) {
            context.log(err);
            return { status: 400, jsonBody: { error: err.message } };
        }
    }
});

// 2. Lấy thực đơn tuần theo ID
app.http('getWeeklyMenuById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'weeklyMenu/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const menu = await WeeklyMenu.findById(id);
            if (!menu) {
                return { status: 404, jsonBody: { message: "Thực đơn không tìm thấy" } };
            }
            return { status: 200, jsonBody: menu };
        } catch (err) {
            context.log(err);
            return { status: 400, jsonBody: { error: err.message } };
        }
    }
});

// 3. Tạo thực đơn tuần mới
app.http('createWeeklyMenu', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'weeklyMenu',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { weekStart, dailyMenus, ageCategory } = await request.json();
            const newMenu = new WeeklyMenu({ weekStart, ageCategory, dailyMenus });
            const savedMenu = await newMenu.save();
            return { status: 201, jsonBody: savedMenu };
        } catch (err) {
            context.log(err);
            return { status: 400, jsonBody: { error: err.message } };
        }
    }
});

// 4. Cập nhật thực đơn tuần theo ID
app.http('updateWeeklyMenuById', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'weeklyMenu/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const { weekStart, dailyMenus, ageCategory } = await request.json();
            const updatedMenu = await WeeklyMenu.findByIdAndUpdate(
                id,
                { weekStart, dailyMenus, ageCategory },
                { new: true }
            );
            if (!updatedMenu) {
                return { status: 404, jsonBody: { message: "Thực đơn không tìm thấy" } };
            }
            return { status: 200, jsonBody: updatedMenu };
        } catch (err) {
            context.log(err);
            return { status: 400, jsonBody: { error: err.message } };
        }
    }
});

// 5. Xóa thực đơn tuần theo ID
app.http('deleteWeeklyMenuById', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'weeklyMenu/{id}',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { id } = request.params;
            const deletedMenu = await WeeklyMenu.findByIdAndDelete(id);
            if (!deletedMenu) {
                return { status: 404, jsonBody: { message: "Thực đơn không tìm thấy" } };
            }
            return { status: 200, jsonBody: { message: "Đã xóa thực đơn theo tuần" } };
        } catch (err) {
            context.log(err);
            return { status: 400, jsonBody: { error: err.message } };
        }
    }
});


// ===== ADVANCED LOGIC FROM CONTROLLER =====

// 6. Thêm hoặc cập nhật thực đơn cho một ngày cụ thể
app.http('addOrUpdateDailyMenu', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'weeklyMenu/daily',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { date, breakfast, lunch, dinner, note } = await request.json();
            const menuDate = new Date(date);
            const weekStart = getStartOfWeek(menuDate);

            let weekly = await WeeklyMenu.findOne({ weekStart });
            const newDaily = { date: menuDate, breakfast, lunch, dinner, note };

            if (!weekly) {
                weekly = new WeeklyMenu({ weekStart, dailyMenus: [newDaily] });
            } else {
                const index = weekly.dailyMenus.findIndex(menu => menu.date.toDateString() === menuDate.toDateString());
                if (index !== -1) {
                    weekly.dailyMenus[index] = newDaily;
                } else {
                    weekly.dailyMenus.push(newDaily);
                }
            }
            await weekly.save();
            return { status: 200, jsonBody: weekly };
        } catch (err) {
            context.log(err);
            return { status: 400, jsonBody: { error: err.message } };
        }
    }
});

// 7. Lấy thực đơn theo tuần (dựa vào ngày bắt đầu tuần)
app.http('getWeeklyMenuByDate', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'weeklyMenu/week',
    handler: async (request, context) => {
        try {
            await connectDB();
            const weekStartQuery = request.query.get('weekStart');
            if (!weekStartQuery) {
                return { status: 400, jsonBody: { message: 'Cần cung cấp query parameter "weekStart"' } };
            }
            const startOfWeek = getStartOfWeek(new Date(weekStartQuery));
            const weeklyMenu = await WeeklyMenu.findOne({ weekStart: startOfWeek });

            if (!weeklyMenu) {
                return { status: 404, jsonBody: { message: 'Thực đơn không tìm thấy' } };
            }
            return { status: 200, jsonBody: weeklyMenu };
        } catch (err) {
            context.log(err);
            return { status: 400, jsonBody: { error: err.message } };
        }
    }
});

// 8. Xóa thực đơn của một ngày cụ thể
app.http('deleteDailyMenu', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'weeklyMenu/daily',
    handler: async (request, context) => {
        try {
            await connectDB();
            const { date } = await request.json();
            const menuDate = new Date(date);
            const weekStart = getStartOfWeek(menuDate);

            const weekly = await WeeklyMenu.findOne({ weekStart });
            if (!weekly) {
                return { status: 404, jsonBody: { message: 'Thực đơn tuần không tìm thấy' } };
            }

            const initialLength = weekly.dailyMenus.length;
            weekly.dailyMenus = weekly.dailyMenus.filter(menu => menu.date.toDateString() !== menuDate.toDateString());

            if (weekly.dailyMenus.length === initialLength) {
                return { status: 404, jsonBody: { message: 'Thực đơn ngày không tìm thấy trong tuần' } };
            }

            if (weekly.dailyMenus.length === 0) {
                await WeeklyMenu.deleteOne({ weekStart });
                return { status: 200, jsonBody: { message: 'Đã xóa toàn bộ tuần thực đơn vì không còn ngày nào' } };
            }

            await weekly.save();
            return { status: 200, jsonBody: weekly };
        } catch (err) {
            context.log(err);
            return { status: 400, jsonBody: { error: err.message } };
        }
    }
});
