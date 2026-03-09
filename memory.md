# Nhật ký công việc - Soạn Toán AI
**Ngày cập nhật:** 09/03/2026 00:30 (Đêm muộn)

## Trạng thái hiện tại
- **Phiên bản app:** `v5.1b` (Đã gắn nhãn vào giao diện để nhận diện).
- **Tính năng đã hoàn tất:**
    1. **Bảo mật v2**: DeviceId + Fingerprint (SHA-256) đã chạy ổn định.
    2. **Cloud Database**: Tích hợp Firebase Firestore, đồng bộ 2 chiều (Local <-> Cloud).
    3. **GitHub Workflow**: Cập nhật `main.yml` để nhận các biến môi trường `VITE_`.
- **Vấn đề đang xử lý:**
    - Lỗi `An API Key must be set when running in a browser` trên GitHub Pages.
    - **Nguyên nhân nghi vấn:** Đang "lệch pha" giữa tên Secret cũ (`GEMINI_API_KEY`) và mới (`VITE_GEMINI_API_KEY`) hoặc do cache build cũ trên GitHub.
    - **Giải pháp cuối cùng đã thực hiện:** 
        - Chuẩn hóa toàn bộ tên Secret thành `VITE_GEMINI_API_KEY`.
        - Dọn dẹp sạch sẽ file `vite.config.ts` để tránh ghi đè biến môi trường.
        - Gắn nhãn `v5.1b` để anh Thưởng xác nhận khi app load bản mới nhất.

## Việc cần làm tiếp theo (Sáng mai)
1. **Xác nhận v5.1b**: Kiểm tra xem anh Thưởng đã thấy nhãn `v5.1b` chưa.
2. **Kiểm tra soạn bài**: Nếu vẫn lỗi API Key dù đã ở `v5.1b`, cần kiểm tra lại chính xác giá trị Secret trên GitHub (có thể bị thừa dấu cách hoặc sai ký tự).
3. **Đồng bộ thực tế**: Sau khi AI chạy, kiểm tra dữ liệu có thực sự "đổ" về Firestore không.

**Ghi chú cho Alla:** Luôn ưu tiên kiểm tra nhãn phiên bản trên giao diện trước khi debug tiếp.
