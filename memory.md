# Nhật ký công việc - Soạn Toán AI
**Ngày cập nhật:** 15/03/2026 22:45

## Trạng thái hiện tại
- **Phiên bản app:** `v5.4.8 (Chatbot Reporting & Monitoring)` — Tích hợp theo dõi và báo cáo nộp bài thời gian thực.
- **Tính năng đã hoàn tất:**
    1. ... (giữ nguyên các mục trước)
    7. **Tích hợp Quản lý học tập**: Giao bài trực tiếp cho học sinh từ dự án `quanlyhoc`.
    8. **Dọn dẹp Log**: Đã xóa `console.log("Alla Firebase Config Status:...")`.
    9. **Monitoring & Reporting**: 
        - Chatbot chủ động thông báo khi học sinh nộp bài (Real-time).
        - Mẫu báo cáo nghiêm ngặt cho bài tập Đã làm/Chưa làm.
        - Tự động khen ngợi học sinh khi đạt điểm 9-10.

## Việc cần làm tiếp theo
1. **Siết Firestore Rules**: Hiện đang ở test mode, cần thêm authentication hoặc rules chặt hơn.
2. **Migration dữ liệu cũ**: Dữ liệu Firebase cũ ở `users/{deviceId_cũ}/...` chưa được migrate.

**Ghi chú cho Alla (Quy tắc báo cáo):**
- Khi báo cáo bài tập chưa làm: Sử dụng mẫu "Dạ, [Tên] vẫn chưa nộp bài ạ" kèm chi tiết BT và ngày giao.
- Khi báo cáo bài tập đã làm: Sử dụng mẫu "Dạ anh, [Tên] đã hoàn thành..." kèm điểm, lời khen (nếu >=9), tên bài và ngày nộp.
- Ngày tháng luôn định dạng VN (DD/MM/YYYY).
- Luôn gọi là "anh" và xưng "em", tuyệt đối không gọi "Anh Thưởng".
