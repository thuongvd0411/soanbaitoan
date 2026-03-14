
/**
 * Trích xuất và chuẩn hóa tên học sinh từ câu hỏi
 */
export const nameResolver = {
    /**
     * Trích xuất tên học sinh từ text
     * Hỗ trợ: "Bảo và Đạt", "Bảo, Đạt", "Bảo với Đạt"
     */
    extractStudentNames(query: string): string[] {
        // Danh sách các từ nối/phân cách
        const separators = [/ và /gi, / với /gi, / , /g, /,/g, / & /g];
        
        // Tìm phần text chứa tên (thường sau các từ khóa như "Bảo", "Đạt", ... hoặc là chủ ngữ)
        // Trong dự án này, ta giả định các câu hỏi LMS thường xoay quanh tên học sinh.
        // Để đơn giản và hiệu quả, ta sẽ dùng Gemini để trích xuất trong QueryPlanService, 
        // nhưng hàm này dùng để chuẩn hóa và lọc lại.
        
        let cleanedQuery = query;
        separators.forEach(sep => {
            cleanedQuery = cleanedQuery.replace(sep, "|");
        });

        // Tạm thời để Gemini trích xuất chính xác hơn, hàm này sẽ bổ trợ chuẩn hóa.
        return [];
    },

    /**
     * Chuẩn hóa tên: viết thường, bỏ dấu
     */
    normalizeName(name: string): string {
        return name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .trim();
    }
};
