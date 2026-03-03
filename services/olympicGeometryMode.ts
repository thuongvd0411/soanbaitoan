// services/olympicGeometryMode.ts

/**
 * MODULE: OlympicGeometryMode
 * ĐỘC LẬP HOÀN TOÀN - KHÔNG PHỤ THUỘC MODULE KHÁC
 * Chứa logic hướng dẫn AI thực hiện quy trình vẽ hình học chuẩn Olympic.
 */

export const OLYMPIC_GEOMETRY_INSTRUCTION = `
====================================================
KÍCH HOẠT: OLYMPIC GEOMETRY PIPELINE
====================================================
Bạn đang ở chế độ "Olympic Mode". Mọi hình vẽ hình học (SVG) phải tuân thủ nghiêm ngặt quy trình sau:

BƯỚC 1 – PHÂN TÍCH ĐỀ TOÁN
- Trích xuất rõ ràng: Các điểm, đường thẳng, đường tròn, và quan hệ hình học (vuông góc, song song, tiếp tuyến, v.v.).

BƯỚC 2 – KIỂM TRA TÍNH KHẢ DĨ
- Trước khi vẽ, hãy tự kiểm tra xem các ràng buộc hình học có mâu thuẫn không. Nếu mâu thuẫn, KHÔNG VẼ và báo lỗi trong imageDescription.

BƯỚC 3 – GÁN TỌA ĐỘ KIỂM SOÁT (QUAN TRỌNG NHẤT)
- KHÔNG ĐƯỢC ƯỚC LƯỢNG. Bạn phải thiết lập hệ trục tọa độ Oxy (hoặc Oxyz) trong tư duy.
- Gán tọa độ cụ thể cho các điểm gốc (Ví dụ: Cho tam giác đều ABC, gán A(0, sqrt(3)), B(-1, 0), C(1, 0)).
- Tính toán tọa độ các điểm phát sinh (giao điểm, chân đường cao...) bằng công thức giải tích chính xác.

BƯỚC 4 – SUY LUẬN HÌNH HỌC BẰNG ĐẠI SỐ
- Sử dụng Vector, phương trình đường thẳng để xác định vị trí điểm.

BƯỚC 5 – VẼ HÌNH TỪ DỮ LIỆU TOÁN (SVG CODE)
- Mã SVG phải được sinh ra từ chính các tọa độ đã tính toán ở Bước 3.
- Stroke-width mảnh, tinh tế (khoảng 1px - 1.5px).
- Màu sắc: Đen chủ đạo (#000), điểm và ký hiệu quan trọng có thể dùng màu xanh đậm (#005b96).
- Font-size cho nhãn điểm phải vừa phải, không chồng chéo lên nét vẽ.

BƯỚC 6 – KIỂM ĐỊNH OLYMPIC
- Kiểm tra lại hình vẽ: Các đường vuông góc có thực sự vuông góc trên SVG không? Ba điểm thẳng hàng có thẳng hàng không?
- Nếu sai số quá lớn > 1%, hãy tính lại tọa độ.

BƯỚC 7 – ĐÁNH DẤU ĐỘ TIN CẬY
- Trong mã SVG hoặc phần mô tả, hãy thêm comment: "<!-- Olympic Geometry Mode Verified -->".

LUẬT CẤM:
- ❌ Không được vẽ minh họa ước lệ (sketch) khi chế độ này bật.
- ❌ Không được bỏ qua bước tính tọa độ.
- ❌ Nếu bài toán là Đại số/Giải tích không cần hình, hãy bỏ qua Pipeline này.
`;

export const getOlympicPromptAugmentation = (isActive: boolean): string => {
    if (!isActive) return "";
    return `
    \n*** YÊU CẦU ĐẶC BIỆT VỀ HÌNH VẼ (OLYMPIC MODE ĐANG BẬT) ***
    1. Ưu tiên tuyệt đối cho độ chính xác hình học.
    2. Hình vẽ SVG phải được dựng trên hệ trục tọa độ thực sự.
    3. Hiển thị đầy đủ các ký hiệu: Góc vuông, bằng nhau, song song nếu đề bài yêu cầu.
    4. Nếu câu hỏi không liên quan đến hình học (VD: Giải phương trình lượng giác, logarit đại số thuần túy), hãy đặt hasImage = false.
    `;
};