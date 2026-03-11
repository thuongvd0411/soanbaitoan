# Nhật ký công việc - Soạn Toán AI
**Ngày cập nhật:** 11/03/2026 12:58

## Trạng thái hiện tại
- **Phiên bản app:** `v5.2 (Shared Data)` — Deploy thành công trên GitHub Pages
- **Tính năng đã hoàn tất:**
    1. **Bảo mật v2**: DeviceId + Fingerprint (SHA-256) đã chạy ổn định.
    2. **Cloud Database**: Firebase Firestore đã tạo + Rules cho phép read/write.
    3. **Chế độ "Chỉ Làm Bài Tập"**: Học sinh dán link → vào thẳng trang bài, bỏ qua kích hoạt.
    4. **Share Link hoạt động**: Sinh bài xong → copy link ngay, Firebase upload ngầm.
    5. **Dữ liệu chung**: Tất cả máy cùng token = cùng `ownerId` (hash SHA-256) = cùng kho dữ liệu.
    6. **Bỏ Sync ID UI**: Không cần sync key thủ công nữa.

## Kiến trúc dữ liệu hiện tại
- **ownerId**: `owner_` + SHA256(token).substring(0,24) — tự tạo khi kích hoạt
- **Firebase paths**: 
  - `users/{ownerId}/questionBank/{questionId}` — kho câu hỏi
  - `users/{ownerId}/history/{historyId}` — lịch sử soạn thảo
  - `shared_exams/{shareId}` — bài tập chia sẻ (public read)
- **Firestore Rules**: Test mode (allow read/write: if true) — Cần siết lại khi production

## Việc cần làm tiếp theo
1. **Siết Firestore Rules**: Hiện đang ở test mode, cần thêm authentication hoặc rules chặt hơn.
2. **Bỏ debug log**: Xóa `console.log("Alla Firebase Config Status:...")` trong `firebaseService.ts`.
3. **Nâng cấp UI**: Cân nhắc thêm tính năng xem kết quả học sinh, thống kê điểm.
4. **Migration dữ liệu cũ**: Dữ liệu Firebase cũ ở `users/{deviceId_cũ}/...` chưa được migrate.

**Ghi chú cho Alla:** Ưu tiên kiểm tra nhãn phiên bản (v5.2) trước khi debug. Firestore cần được tạo thủ công trên Firebase Console — code không tự tạo được.
