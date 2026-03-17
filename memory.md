# Nhật ký công việc - Soạn Toán AI
**Ngày cập nhật:** 17/03/2026 01:00

## Trạng thái hiện tại
- **Phiên bản app:** `v5.5.0 (Data-Driven Investment Assistant)` — Tái cấu trúc toàn diện hệ thống Stock Scanner.
- **Tính năng đã hoàn tất (Đợt 5 - 9):**
    1. **Data-Driven Scanner**: Chuyển logic tính toán chỉ báo từ AI sang code (`indicatorService.ts`).
    2. **Indicator Engine**: Hỗ trợ SMA, EMA, RSI, VCP, Breakout, Volume Dry-up.
    3. **Firestore Array History**: Chuyển từ "document theo ngày" sang "mảng history trong 1 document" (`market_history/{symbol}`). Giảm 99% request.
    4. **Stock Universe**: Mở rộng danh sách lên 250+ mã thanh khoản cao (HOSE, HNX, UPCOM).
    5. **Advanced Proxy Failover**: Tích hợp AllOrigins Raw, CodeTabs, CorsProxy.io với cơ chế tự động chuyển đổi Proxy khi lỗi CORS/DNS.
    6. **Smart Sync**: Cơ chế tự động bỏ qua (Skip) những mã đã có dữ liệu trong ngày, giúp Sync thần tốc và bền bỉ.
    7. **UI Updates**: Bổ sung phím tắt `/VCP`, `/BREAK` và hiển thị chi tiết tiến trình Sync (Success/Skip/Failed).
    8. **UI Fix**: Ẩn nút Chatbot Alla ở các tab không phải "Soạn bài" (Lớp học, AI Đầu tư) để tránh bị che khuất chức năng.
    9. **Expert Mode AI Đầu tư**: Thêm chế độ "Chuyên gia Alla" - Giáo sư kinh tế vĩ mô, phân tích sâu Vàng, Bạc, BĐS và Chứng khoán VN.

## Việc cần làm tiếp theo
1. **Theo dõi độ ổn định của Proxy**: Kiểm tra xem CodeTabs hay AllOrigins có bị rate limit lâu dài không.
2. **Nâng cấp Scanner**: Thêm các mẫu hình kỹ thuật nâng cao (Ví dụ: MACD Divergence, Bollinger Band Squeeze).
3. **User Dashboard**: Hiển thị biểu đồ kỹ thuật mini ngay trong Chatbot khi AI phân tích một mã cụ thể.
4. **Siết Firestore Rules**: Cần bảo vệ dữ liệu `market_history` vì đây là tài sản dữ liệu quan trọng.
5. **Sửa lỗi Scanner**: Khắc phục lỗi Scanner không tải được dữ liệu dẫn đến AI báo "không có dữ liệu".
6. **Refactor App.tsx**: Chia nhỏ file App.tsx (>2500 dòng) để dễ bảo trì.

**Ghi chú cho Alla (Quy tắc AI Đầu Tư):**
- Luôn ưu tiên dùng dữ liệu từ `market_history` để phân tích.
- Khi AI phân tích, cần bám sát các chỉ báo kỹ thuật đã được Scanner tính sẵn (Score, RSI, Pattern).
- Ngày tháng luôn định dạng VN (DD/MM/YYYY).
- Luôn gọi là "anh" và xưng "em".
