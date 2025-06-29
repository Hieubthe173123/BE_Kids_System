const WeeklyMenu = require('../models/weeklyMenuModel');

// Hàm để lấy ngày đầu tuần (Thứ 2) từ bất kỳ ngày nào
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // Chủ nhật là 0
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Đưa về thứ 2
  return new Date(d.setDate(diff));
}

// API: Tạo hoặc cập nhật thực đơn theo ngày
const addOrUpdateDailyMenu = async (req, res) => {
  try {
    const { date, breakfast, lunch, dinner, note } = req.body;
    const menuDate = new Date(date);
    const weekStart = getStartOfWeek(menuDate);

    let weekly = await WeeklyMenu.findOne({ weekStart });

    const newDaily = { date: menuDate, breakfast, lunch, dinner, note };

    if (!weekly) {
      // Tạo tuần mới nếu chưa có
      weekly = new WeeklyMenu({
        weekStart,
        dailyMenus: [newDaily],
      });
    } else {
      // Kiểm tra ngày đã tồn tại chưa
      const index = weekly.dailyMenus.findIndex(menu =>
        menu.date.toDateString() === menuDate.toDateString()
      );

      if (index !== -1) {
        // Cập nhật nếu đã có
        weekly.dailyMenus[index] = newDaily;
      } else {
        // Thêm mới nếu chưa có
        weekly.dailyMenus.push(newDaily);
      }
    }

    await weekly.save();
    res.status(200).json(weekly);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// API: Lấy thực đơn theo tuần
const getWeeklyMenu = async (req, res) => {
  try {
    const { weekStart } = req.query;
    const startOfWeek = new Date(weekStart);
    const weeklyMenu = await WeeklyMenu.findOne({ weekStart: getStartOfWeek(startOfWeek) });

    if (!weeklyMenu) {
      return res.status(404).json({ message: 'Thực đơn không tìm thấy' });
    }

    res.status(200).json(weeklyMenu);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// API: Xóa thực đơn theo ngày
const deleteDailyMenu = async (req, res) => {
  try {
    const { date } = req.body;
    const menuDate = new Date(date);
    const weekStart = getStartOfWeek(menuDate);

    const weekly = await WeeklyMenu.findOne({ weekStart });

    if (!weekly) {
      return res.status(404).json({ message: 'Thực đơn không tìm thấy' });
    }

    weekly.dailyMenus = weekly.dailyMenus.filter(menu =>
      menu.date.toDateString() !== menuDate.toDateString()
    );

    if (weekly.dailyMenus.length === 0) {
      await WeeklyMenu.deleteOne({ weekStart });
      return res.status(200).json({ message: 'Đã xóa tuần thực đơn' });
    }

    await weekly.save();
    res.status(200).json(weekly);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// API: Lấy tất cả thực đơn theo tuần
const getAllWeeklyMenus = async (req, res) => {
  try {
    const weeklyMenus = await WeeklyMenu.find().sort({ weekStart: -1 });
    res.status(200).json(weeklyMenus);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// API: Xóa thực đơn theo tuần
const deleteWeeklyMenu = async (req, res) => {
  try {
    const { weekStart } = req.body;
    const startOfWeek = new Date(weekStart);

    const result = await WeeklyMenu.deleteOne({ weekStart: getStartOfWeek(startOfWeek) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Thực đơn không tìm thấy' });
    }

    res.status(200).json({ message: 'Đã xóa thực đơn theo tuần' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// API: Cập nhật thực đơn theo tuần
const updateWeeklyMenu = async (req, res) => {
  try {
    const { weekStart, dailyMenus } = req.body;
    const startOfWeek = getStartOfWeek(new Date(weekStart));

    const weekly = await WeeklyMenu.findOneAndUpdate(
      { weekStart: startOfWeek },
      { dailyMenus },
      { new: true, upsert: true }
    );

    res.status(200).json(weekly);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  addOrUpdateDailyMenu,
  getWeeklyMenu,
  deleteDailyMenu,
  getAllWeeklyMenus,
  deleteWeeklyMenu,
  updateWeeklyMenu
};