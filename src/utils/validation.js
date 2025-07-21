exports.getDatesInWeek = (year, weekNumber) => {
  const firstDayOfYear = new Date(year, 0, 1);
  const dayOfWeekJan1 = firstDayOfYear.getDay(); // 0=Chủ Nhật, 1=Thứ Hai, ..., 6=Thứ Bảy

  // Tạo một bản sao để tính toán
  let firstMonday = new Date(firstDayOfYear);

  // Tính toán để tìm ra ngày Thứ Hai đầu tiên của năm.
  // Logic: tìm ngày cần cộng thêm vào ngày 1/1 để ra Thứ Hai.
  if (dayOfWeekJan1 === 1) {
      // Nếu ngày 1/1 là Thứ Hai, không cần cộng gì cả.
  } else if (dayOfWeekJan1 === 0) { // Nếu là Chủ Nhật (giá trị 0)
      firstMonday.setDate(1 + 1); // Cộng 1 ngày để đến Thứ Hai
  } else { // Nếu là các ngày từ Thứ Ba -> Thứ Bảy (giá trị 2 -> 6)
      firstMonday.setDate(1 + (8 - dayOfWeekJan1)); // Cộng số ngày còn lại để đến Thứ Hai của tuần sau
  }

  // firstMonday giờ đây là ngày Thứ Hai đầu tiên nằm trong năm `year`
  // Đây là mốc bắt đầu của tuần 1.

  // Lấy ngày Thứ Hai của tuần mục tiêu bằng cách cộng thêm (tuần - 1) * 7 ngày
  const targetMonday = new Date(firstMonday);
  targetMonday.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  const weekDates = {};
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Lặp để lấy 5 ngày trong tuần
  for (let i = 0; i < 5; i++) {
      const currentDate = new Date(targetMonday);
      currentDate.setDate(targetMonday.getDate() + i);

      // Định dạng ngày thành chuỗi "YYYY-MM-DD"
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');

      weekDates[days[i]] = `${yyyy}-${mm}-${dd}`;
  }

  return weekDates;
};
