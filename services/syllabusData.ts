// services/syllabusData.ts
import { SyllabusItem, ExamType } from '../types';

// Dữ liệu mục lục sách giáo khoa "Kết Nối Tri Thức Với Cuộc Sống" - GDPT 2018

export const SYLLABUS_DB: SyllabusItem[] = [
  // =========================================================================
  // VÙNG CẤM SỬA CHỮA: KHỐI THPT (10, 11, 12)
  // Tuyệt đối không thay đổi nội dung, thứ tự bài học của khối 10, 11, 12 
  // trừ khi có yêu cầu cụ thể từ người dùng.
  // =========================================================================
  {
    grade: 12,
    chapters: [
      {
        name: "Tập 1 - Chương I: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số",
        lessons: [
          "Bài 1: Tính đơn điệu và cực trị của hàm số", 
          "Bài 2: Giá trị lớn nhất và giá trị nhỏ nhất của hàm số", 
          "Bài 3: Đường tiệm cận của đồ thị hàm số", 
          "Bài 4: Khảo sát sự biến thiên và vẽ đồ thị của hàm số",
          "Bài 5: Ứng dụng đạo hàm để giải quyết một số vấn đề thực tiễn"
        ]
      },
      {
        name: "Tập 1 - Chương II: Vectơ và hệ trục tọa độ trong không gian",
        lessons: [
          "Bài 6: Vectơ trong không gian", 
          "Bài 7: Hệ trục tọa độ trong không gian", 
          "Bài 8: Biểu thức tọa độ của các phép toán vectơ"
        ]
      },
      {
        name: "Tập 1 - Chương III: Các số đặc trưng đo mức độ phân tán cho mẫu số liệu ghép nhóm",
        lessons: [
          "Bài 9: Khoảng biến thiên và khoảng tứ phân vị", 
          "Bài 10: Phương sai và độ lệch chuẩn"
        ]
      },
      {
        name: "Tập 2 - Chương IV: Nguyên hàm và tích phân",
        lessons: [
          "Bài 11: Nguyên hàm", 
          "Bài 12: Tích phân", 
          "Bài 13: Ứng dụng hình học của tích phân"
        ]
      },
      {
        name: "Tập 2 - Chương V: Phương pháp tọa độ trong không gian",
        lessons: [
          "Bài 14: Phương trình mặt phẳng", 
          "Bài 15: Phương trình đường thẳng trong không gian", 
          "Bài 16: Công thức tính góc trong không gian",
          "Bài 17: Phương trình mặt cầu"
        ]
      },
      {
        name: "Tập 2 - Chương VI: Xác suất có điều kiện",
        lessons: [
          "Bài 18: Xác suất có điều kiện", 
          "Bài 19: Công thức xác suất toàn phần và công thức Bayes"
        ]
      }
    ]
  },
  {
    grade: 11,
    chapters: [
      {
        name: "Tập 1 - Chương I: Hàm số lượng giác và phương trình lượng giác",
        lessons: [
          "Bài 1: Giá trị lượng giác của góc lượng giác", 
          "Bài 2: Công thức lượng giác", 
          "Bài 3: Hàm số lượng giác", 
          "Bài 4: Phương trình lượng giác cơ bản"
        ]
      },
      {
        name: "Tập 1 - Chương II: Dãy số. Cấp số cộng và cấp số nhân",
        lessons: [
          "Bài 5: Dãy số", 
          "Bài 6: Cấp số cộng", 
          "Bài 7: Cấp số nhân"
        ]
      },
      {
        name: "Tập 1 - Chương III: Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm",
        lessons: [
          "Bài 8: Mẫu số liệu ghép nhóm", 
          "Bài 9: Các số đặc trưng đo xu thế trung tâm"
        ]
      },
      {
        name: "Tập 1 - Chương IV: Quan hệ song song trong không gian",
        lessons: [
          "Bài 10: Đường thẳng và mặt phẳng song song", 
          "Bài 11: Hai mặt phẳng song song", 
          "Bài 12: Phép chiếu song song"
        ]
      },
      {
        name: "Tập 1 - Chương V: Giới hạn. Hàm số liên tục",
        lessons: [
          "Bài 13: Giới hạn của dãy số", 
          "Bài 14: Giới hạn của hàm số",
          "Bài 15: Hàm số liên tục"
        ]
      },
      {
        name: "Tập 2 - Chương VI: Hàm số mũ và hàm số lôgarit",
        lessons: [
          "Bài 18: Lũy thừa với số mũ thực", 
          "Bài 19: Lôgarit", 
          "Bài 20: Hàm số mũ và hàm số lôgarit", 
          "Bài 21: Phương trình, bất phương trình mũ và lôgarit"
        ]
      },
      {
        name: "Tập 2 - Chương VII: Quan hệ vuông góc trong không gian",
        lessons: [
          "Bài 22: Hai đường thẳng vuông góc", 
          "Bài 23: Đường thẳng vuông góc với mặt phẳng", 
          "Bài 24: Phép chiếu vuông góc. Góc giữa đường thẳng và mặt phẳng",
          "Bài 25: Hai mặt phẳng vuông góc",
          "Bài 26: Khoảng cách",
          "Bài 27: Thể tích"
        ]
      },
      {
          name: "Tập 2 - Chương VIII: Các quy tắc tính xác suất",
          lessons: [
              "Bài 28: Biến cố hợp, biến cố giao, biến cố độc lập",
              "Bài 29: Công thức cộng xác suất",
              "Bài 30: Công thức nhân xác suất"
          ]
      },
      {
          name: "Tập 2 - Chương IX: Đạo hàm",
          lessons: [
              "Bài 31: Định nghĩa và ý nghĩa của đạo hàm",
              "Bài 32: Các quy tắc tính đạo hàm",
              "Bài 33: Đạo hàm cấp hai"
          ]
      }
    ]
  },
  {
      grade: 10,
      chapters: [
          {
              name: "Tập 1 - Chương I: Mệnh đề và tập hợp",
              lessons: ["Bài 1: Mệnh đề", "Bài 2: Tập hợp"]
          },
          {
              name: "Tập 1 - Chương II: Bất phương trình và hệ bất phương trình bậc nhất hai ẩn",
              lessons: ["Bài 3: Bất phương trình bậc nhất hai ẩn", "Bài 4: Hệ bất phương trình bậc nhất hai ẩn"]
          },
          {
              name: "Tập 1 - Chương III: Hệ thức lượng trong tam giác",
              lessons: ["Bài 5: Giá trị lượng giác của một góc từ 0 đến 180 độ", "Bài 6: Hệ thức lượng trong tam giác"]
          },
          {
              name: "Tập 1 - Chương IV: Vectơ",
              lessons: ["Bài 7: Các khái niệm mở đầu", "Bài 8: Tổng và hiệu của hai vectơ", "Bài 9: Tích của một vectơ với một số", "Bài 10: Vectơ trong mặt phẳng tọa độ", "Bài 11: Tích vô hướng của hai vectơ"]
          },
          {
              name: "Tập 1 - Chương V: Các số đặc trưng của mẫu số liệu không ghép nhóm",
              lessons: ["Bài 12: Số gần đúng và sai số", "Bài 13: Các số đặc trưng đo xu thế trung tâm", "Bài 14: Các số đặc trưng đo độ phân tán"]
          },
          {
              name: "Tập 2 - Chương VI: Hàm số, đồ thị và ứng dụng",
              lessons: ["Bài 15: Hàm số", "Bài 16: Hàm số bậc hai", "Bài 17: Dấu của tam thức bậc hai", "Bài 18: Phương trình quy về phương trình bậc hai"]
          },
          {
              name: "Tập 2 - Chương VII: Phương pháp tọa độ trong mặt phẳng",
              lessons: ["Bài 19: Phương trình đường thẳng", "Bài 20: Vị trí tương đối giữa hai đường thẳng. Góc và khoảng cách", "Bài 21: Đường tròn trong mặt phẳng tọa độ", "Bài 22: Ba đường conic"]
          },
          {
              name: "Tập 2 - Chương VIII: Đại số tổ hợp",
              lessons: ["Bài 23: Quy tắc đếm", "Bài 24: Hoán vị, chỉnh hợp và tổ hợp", "Bài 25: Nhị thức Newton"]
          },
          {
              name: "Tập 2 - Chương IX: Tính xác suất theo định nghĩa cổ điển",
              lessons: ["Bài 26: Biến cố và định nghĩa cổ điển của xác suất", "Bài 27: Thực hành tính xác suất theo định nghĩa cổ điển"]
          }
      ]
  },

  {
      grade: 9,
      chapters: [
          {
              name: "Tập 1 - Chương I: Hệ phương trình bậc nhất hai ẩn",
              lessons: ["Bài 1: Khái niệm phương trình và hệ phương trình bậc nhất hai ẩn", "Bài 2: Giải hệ phương trình bậc nhất hai ẩn", "Bài 3: Giải bài toán bằng cách lập hệ phương trình"]
          },
          {
              name: "Tập 1 - Chương II: Phương trình và bất phương trình bậc nhất một ẩn",
              lessons: ["Bài 4: Phương trình bậc nhất một ẩn", "Bài 5: Bất đẳng thức và tính chất", "Bài 6: Bất phương trình bậc nhất một ẩn"]
          },
          {
              name: "Tập 1 - Chương III: Căn thức bậc hai và căn thức bậc ba",
              lessons: ["Bài 7: Căn bậc hai và căn thức bậc hai", "Bài 8: Khai căn bậc hai với phép nhân và phép chia", "Bài 9: Biến đổi đơn giản và rút gọn biểu thức chứa căn", "Bài 10: Căn bậc ba và căn thức bậc ba"]
          },
          {
              name: "Tập 1 - Chương IV: Hệ thức lượng trong tam giác vuông",
              lessons: ["Bài 11: Tỉ số lượng giác của góc nhọn", "Bài 12: Một số hệ thức giữa cạnh, góc trong tam giác vuông và ứng dụng"]
          },
          {
              name: "Tập 1 - Chương V: Đường tròn",
              lessons: ["Bài 13: Mở đầu về đường tròn", "Bài 14: Cung và dây của một đường tròn", "Bài 15: Độ dài đường tròn. Diện tích hình tròn", "Bài 16: Vị trí tương đối của đường thẳng và đường tròn", "Bài 17: Vị trí tương đối của hai đường tròn"]
          },
          {
              name: "Tập 2 - Chương VI: Hàm số y = ax² (a ≠ 0). Phương trình bậc hai một ẩn",
              lessons: ["Bài 18: Hàm số y = ax² (a ≠ 0)", "Bài 19: Phương trình bậc hai một ẩn", "Bài 20: Định lí Viète và ứng dụng", "Bài 21: Giải bài toán bằng cách lập phương trình"]
          },
          {
              name: "Tập 2 - Chương VII: Tần số và tần số tương đối",
              lessons: ["Bài 22: Bảng tần số và biểu đồ tần số", "Bài 23: Bảng tần số tương đối và biểu đồ tần số tương đối", "Bài 24: Bảng tần số, tần số tương đối ghép nhóm và biểu đồ"]
          },
          {
              name: "Tập 2 - Chương VIII: Xác suất của biến cố trong một số trò chơi đơn giản",
              lessons: ["Bài 25: Phép thử ngẫu nhiên và không gian mẫu", "Bài 26: Xác suất của biến cố liên quan đến phép thử", "Bài 27: Xác suất của biến cố liên quan đến trò chơi"]
          },
          {
              name: "Tập 2 - Chương IX: Đường tròn ngoại tiếp và đường tròn nội tiếp",
              lessons: ["Bài 28: Đường tròn ngoại tiếp và đường tròn nội tiếp của một tam giác", "Bài 29: Tứ giác nội tiếp", "Bài 30: Đa giác đều"]
          },
          {
              name: "Tập 2 - Chương X: Một số hình khối trong thực tiễn",
              lessons: ["Bài 31: Hình trụ và hình nón", "Bài 32: Hình cầu"]
          }
      ]
  },
  {
      grade: 8,
      chapters: [
          {
              name: "Tập 1 - Chương I: Đa thức",
              lessons: ["Bài 1: Đơn thức", "Bài 2: Đa thức", "Bài 3: Phép cộng và phép trừ đa thức", "Bài 4: Phép nhân đa thức", "Bài 5: Phép chia đa thức cho đơn thức"]
          },
          {
              name: "Tập 1 - Chương II: Hằng đẳng thức đáng nhớ và ứng dụng",
              lessons: ["Bài 6: Hiệu hai bình phương. Bình phương của một tổng hay một hiệu", "Bài 7: Lập phương của một tổng hay một hiệu", "Bài 8: Tổng và hiệu hai lập phương", "Bài 9: Phân tích đa thức thành nhân tử"]
          },
          {
              name: "Tập 1 - Chương III: Tứ giác",
              lessons: ["Bài 10: Tứ giác", "Bài 11: Hình thang cân", "Bài 12: Hình bình hành", "Bài 13: Hình chữ nhật", "Bài 14: Hình thoi và hình vuông"]
          },
          {
              name: "Tập 1 - Chương IV: Định lí Thalès",
              lessons: ["Bài 15: Định lí Thalès trong tam giác", "Bài 16: Đường trung bình của tam giác", "Bài 17: Tính chất đường phân giác của tam giác"]
          },
          {
              name: "Tập 1 - Chương V: Dữ liệu và biểu đồ",
              lessons: ["Bài 18: Thu thập và phân loại dữ liệu", "Bài 19: Biểu diễn dữ liệu bằng bảng, biểu đồ", "Bài 20: Phân tích số liệu thống kê dựa vào biểu đồ"]
          },
          {
              name: "Tập 2 - Chương VI: Phân thức đại số",
              lessons: ["Bài 21: Phân thức đại số", "Bài 22: Tính chất cơ bản của phân thức đại số", "Bài 23: Phép cộng và phép trừ phân thức đại số", "Bài 24: Phép nhân và phép chia phân thức đại số"]
          },
          {
              name: "Tập 2 - Chương VII: Phương trình bậc nhất và hàm số bậc nhất",
              lessons: ["Bài 25: Phương trình bậc nhất một ẩn", "Bài 26: Giải bài toán bằng cách lập phương trình", "Bài 27: Khái niệm hàm số và đồ thị của hàm số", "Bài 28: Hàm số bậc nhất và đồ thị", "Bài 29: Hệ số góc của đường thẳng"]
          },
          {
              name: "Tập 2 - Chương VIII: Mở đầu về tính xác suất của biến cố",
              lessons: ["Bài 30: Kết quả có thể và kết quả thuận lợi", "Bài 31: Cách tính xác suất của biến cố bằng tỉ số", "Bài 32: Mối liên hệ giữa xác suất thực nghiệm và xác suất lí thuyết"]
          },
          {
              name: "Tập 2 - Chương IX: Tam giác đồng dạng",
              lessons: ["Bài 33: Hai tam giác đồng dạng", "Bài 34: Ba trường hợp đồng dạng của hai tam giác", "Bài 35: Định lí Pythagore và ứng dụng", "Bài 36: Các trường hợp đồng dạng của hai tam giác vuông", "Bài 37: Hình đồng dạng"]
          },
          {
              name: "Tập 2 - Chương X: Một số hình khối trong thực tiễn",
              lessons: ["Bài 38: Hình chóp tam giác đều", "Bài 39: Hình chóp tứ giác đều"]
          }
      ]
  },
  {
      grade: 7,
      chapters: [
          {
              name: "Tập 1 - Chương I: Số hữu tỉ",
              lessons: ["Bài 1: Tập hợp các số hữu tỉ", "Bài 2: Cộng, trừ, nhân, chia số hữu tỉ", "Bài 3: Lũy thừa với số mũ tự nhiên của một số hữu tỉ", "Bài 4: Thứ tự thực hiện các phép tính. Quy tắc chuyển vế"]
          },
          {
              name: "Tập 1 - Chương II: Số thực",
              lessons: ["Bài 5: Làm quen với số thập phân vô hạn tuần hoàn", "Bài 6: Số vô tỉ. Căn bậc hai số học", "Bài 7: Tập hợp các số thực"]
          },
          {
              name: "Tập 1 - Chương III: Góc và đường thẳng song song",
              lessons: ["Bài 8: Góc ở vị trí đặc biệt. Tia phân giác của một góc", "Bài 9: Hai đường thẳng song song và dấu hiệu nhận biết", "Bài 10: Tiên đề Euclid. Tính chất của hai đường thẳng song song", "Bài 11: Định lí và chứng minh định lí"]
          },
          {
              name: "Tập 1 - Chương IV: Tam giác bằng nhau",
              lessons: ["Bài 12: Tổng các góc trong một tam giác", "Bài 13: Hai tam giác bằng nhau. Trường hợp bằng nhau thứ nhất (c.c.c)", "Bài 14: Trường hợp bằng nhau thứ hai (c.g.c)", "Bài 15: Các trường hợp bằng nhau của tam giác vuông", "Bài 16: Tam giác cân. Đường trung trực của đoạn thẳng"]
          },
          {
              name: "Tập 1 - Chương V: Thu thập và biểu diễn dữ liệu",
              lessons: ["Bài 17: Thu thập và phân loại dữ liệu", "Bài 18: Biểu đồ hình quạt tròn", "Bài 19: Biểu đồ đoạn thẳng"]
          },
          {
              name: "Tập 2 - Chương VI: Tỉ lệ thức và đại lượng tỉ lệ",
              lessons: ["Bài 20: Tỉ lệ thức", "Bài 21: Tính chất của dãy tỉ số bằng nhau", "Bài 22: Đại lượng tỉ lệ thuận", "Bài 23: Đại lượng tỉ lệ nghịch"]
          },
          {
              name: "Tập 2 - Chương VII: Biểu thức đại số và đa thức một biến",
              lessons: ["Bài 24: Biểu thức đại số", "Bài 25: Đa thức một biến", "Bài 26: Phép cộng và phép trừ đa thức một biến", "Bài 27: Phép nhân đa thức một biến", "Bài 28: Phép chia đa thức một biến"]
          },
          {
              name: "Tập 2 - Chương VIII: Làm quen với biến cố và xác suất của biến cố",
              lessons: ["Bài 29: Làm quen với biến cố", "Bài 30: Làm quen với xác suất của biến cố"]
          },
          {
              name: "Tập 2 - Chương IX: Quan hệ giữa các yếu tố trong một tam giác",
              lessons: ["Bài 31: Quan hệ giữa góc và cạnh đối diện trong một tam giác", "Bài 32: Quan hệ giữa đường vuông góc và đường xiên", "Bài 33: Quan hệ giữa ba cạnh của một tam giác", "Bài 34: Sự đồng quy của ba đường trung tuyến, ba đường phân giác", "Bài 35: Sự đồng quy của ba đường trung trực, ba đường cao"]
          },
          {
              name: "Tập 2 - Chương X: Một số hình khối trong thực tiễn",
              lessons: ["Bài 36: Hình hộp chữ nhật và hình lập phương", "Bài 37: Hình lăng trụ đứng tam giác và hình lăng trụ đứng tứ giác"]
          }
      ]
  },
  {
      grade: 6,
      chapters: [
          {
              name: "Tập 1 - Chương I: Tập hợp các số tự nhiên",
              lessons: ["Bài 1: Tập hợp", "Bài 2: Cách ghi số tự nhiên", "Bài 3: Thứ tự trong tập hợp các số tự nhiên", "Bài 4: Phép cộng và phép trừ số tự nhiên", "Bài 5: Phép nhân và phép chia số tự nhiên", "Bài 6: Lũy thừa với số mũ tự nhiên", "Bài 7: Thứ tự thực hiện các phép tính"]
          },
          {
              name: "Tập 1 - Chương II: Tính chia hết trong tập hợp các số tự nhiên",
              lessons: ["Bài 8: Quan hệ chia hết và tính chất", "Bài 9: Dấu hiệu chia hết", "Bài 10: Số nguyên tố", "Bài 11: Ước chung. Ước chung lớn nhất", "Bài 12: Bội chung. Bội chung nhỏ nhất"]
          },
          {
              name: "Tập 1 - Chương III: Số nguyên",
              lessons: ["Bài 13: Tập hợp các số nguyên", "Bài 14: Phép cộng và phép trừ số nguyên", "Bài 15: Quy tắc dấu ngoặc", "Bài 16: Phép nhân số nguyên", "Bài 17: Phép chia hết. Ước và bội của một số nguyên"]
          },
          {
              name: "Tập 1 - Chương IV: Một số hình phẳng trong thực tiễn",
              lessons: ["Bài 18: Hình tam giác đều. Hình vuông. Hình lục giác đều", "Bài 19: Hình chữ nhật. Hình thoi. Hình bình hành. Hình thang cân", "Bài 20: Chu vi và diện tích của một số tứ giác đã học"]
          },
          {
              name: "Tập 1 - Chương V: Tính đối xứng của hình phẳng trong tự nhiên",
              lessons: ["Bài 21: Hình có trục đối xứng", "Bài 22: Hình có tâm đối xứng"]
          },
          {
              name: "Tập 2 - Chương VI: Phân số",
              lessons: ["Bài 23: Mở rộng phân số. Phân số bằng nhau", "Bài 24: So sánh phân số. Hỗn số dương", "Bài 25: Phép cộng và phép trừ phân số", "Bài 26: Phép nhân và phép chia phân số", "Bài 27: Hai bài toán về phân số"]
          },
          {
              name: "Tập 2 - Chương VII: Số thập phân",
              lessons: ["Bài 28: Số thập phân", "Bài 29: Tính toán với số thập phân", "Bài 30: Làm tròn và ước lượng", "Bài 31: Một số bài toán về tỉ số và tỉ số phần trăm"]
          },
          {
              name: "Tập 2 - Chương VIII: Những hình học cơ bản",
              lessons: ["Bài 32: Điểm và đường thẳng", "Bài 33: Điểm nằm giữa hai điểm. Tia", "Bài 34: Đoạn thẳng. Độ dài đoạn thẳng", "Bài 35: Trung điểm của đoạn thẳng", "Bài 36: Góc", "Bài 37: Số đo góc"]
          },
          {
              name: "Tập 2 - Chương IX: Dữ liệu và xác suất thực nghiệm",
              lessons: ["Bài 38: Dữ liệu và thu thập dữ liệu", "Bài 39: Bảng thống kê và biểu đồ tranh", "Bài 40: Biểu đồ cột", "Bài 41: Biểu đồ cột kép", "Bài 42: Kết quả có thể và sự kiện trong trò chơi", "Bài 43: Xác suất thực nghiệm"]
          }
      ]
  },

  // --- TIỂU HỌC (LỚP 1, 2, 3, 4, 5) ---
  {
      grade: 5,
      chapters: [
          {
              name: "Tập 1 - Chủ đề 1: Ôn tập và bổ sung",
              lessons: ["Bài 1: Ôn tập số tự nhiên", "Bài 2: Ôn tập các phép tính với số tự nhiên", "Bài 3: Ôn tập phân số", "Bài 4: Phân số thập phân", "Bài 5: Ôn tập các phép tính với phân số", "Bài 6: Cộng, trừ hai phân số khác mẫu số", "Bài 7: Hỗn số"]
          },
          {
              name: "Tập 1 - Chủ đề 2: Số thập phân",
              lessons: ["Bài 8: Khái niệm số thập phân", "Bài 9: Hàng của số thập phân. Đọc, viết số thập phân", "Bài 10: Số thập phân bằng nhau", "Bài 11: So sánh các số thập phân", "Bài 12: Làm tròn số thập phân"]
          },
          {
              name: "Tập 1 - Chủ đề 3: Các phép tính với số thập phân",
              lessons: ["Bài 13: Cộng số thập phân", "Bài 14: Trừ số thập phân", "Bài 15: Nhân số thập phân", "Bài 16: Chia số thập phân", "Bài 17: Thực hành và trải nghiệm với số tự nhiên và số thập phân", "Bài 18: Luyện tập chung"]
          },
          {
              name: "Tập 1 - Chủ đề 4: Hình phẳng",
              lessons: ["Bài 20: Hình tam giác", "Bài 21: Diện tích hình tam giác", "Bài 22: Hình thang", "Bài 23: Diện tích hình thang", "Bài 24: Hình tròn. Chu vi và diện tích hình tròn", "Bài 25: Luyện tập chung"]
          },
          {
              name: "Tập 1 - Chủ đề 5: Tỉ số phần trăm",
              lessons: ["Bài 27: Tỉ số phần trăm", "Bài 28: Giải toán về tỉ số phần trăm", "Bài 29: Luyện tập chung", "Bài 30: Máy tính cầm tay"]
          },
          {
              name: "Tập 2 - Chủ đề 6: Hình khối",
              lessons: ["Bài 34: Hình hộp chữ nhật. Hình lập phương", "Bài 35: Diện tích xung quanh và diện tích toàn phần của hình hộp chữ nhật", "Bài 36: Diện tích xung quanh và diện tích toàn phần của hình lập phương", "Bài 37: Thể tích của một hình", "Bài 38: Đơn vị đo thể tích", "Bài 39: Thể tích hình hộp chữ nhật và hình lập phương"]
          },
          {
              name: "Tập 2 - Chủ đề 7: Số đo thời gian",
              lessons: ["Bài 42: Các đơn vị đo thời gian", "Bài 43: Cộng, trừ số đo thời gian", "Bài 44: Nhân, chia số đo thời gian"]
          },
          {
              name: "Tập 2 - Chủ đề 8: Chuyển động đều",
              lessons: ["Bài 45: Vận tốc", "Bài 46: Quãng đường", "Bài 47: Thời gian", "Bài 48: Bài toán chuyển động đều", "Bài 49: Luyện tập chung"]
          },
           {
              name: "Tập 2 - Chủ đề 9: Thống kê và xác suất",
              lessons: ["Bài 50: Biểu đồ hình quạt tròn", "Bài 51: Một số cách biểu diễn số liệu thống kê", "Bài 52: Tỉ số mô tả số lần lặp lại của một kết quả có thể xảy ra trong một số trò chơi đơn giản"]
          },
           {
              name: "Tập 2 - Chủ đề 10: Ôn tập cuối năm",
              lessons: ["Bài 53: Ôn tập số và phép tính", "Bài 54: Ôn tập hình học và đo lường", "Bài 55: Ôn tập một số yếu tố thống kê và xác suất", "Bài 56: Luyện tập chung"]
          }
      ]
  },
  {
      grade: 4,
      chapters: [
          {
              name: "Chủ đề 1: Số tự nhiên",
              lessons: ["Bài 1: Ôn tập các số đến 100 000", "Bài 2: Các số có nhiều chữ số", "Bài 3: Số chẵn, số lẻ", "Bài 4: Biểu thức chứa chữ", "Bài 5: Giải bài toán có ba bước tính"]
          },
          {
              name: "Chủ đề 2: Góc và đơn vị đo",
              lessons: ["Bài 6: Luyện tập chung", "Bài 7: Đo góc, đơn vị đo góc", "Bài 8: Góc nhọn, góc tù, góc bẹt", "Bài 9: Hai đường thẳng vuông góc. Hai đường thẳng song song", "Bài 10: Số đo góc. Độ (°)"]
          },
          {
              name: "Chủ đề 3: Phép tính với số tự nhiên",
              lessons: ["Bài 11: Phép cộng các số tự nhiên", "Bài 12: Phép trừ các số tự nhiên", "Bài 13: Tính chất giao hoán, tính chất kết hợp của phép cộng", "Bài 14: Tìm số trung bình cộng"]
          },
          {
              name: "Chủ đề 4: Phép nhân và phép chia",
              lessons: ["Bài 15: Phép nhân các số có nhiều chữ số", "Bài 16: Phép chia các số có nhiều chữ số", "Bài 17: Tính chất giao hoán, tính chất kết hợp của phép nhân"]
          },
          {
              name: "Chủ đề 5: Phân số",
              lessons: ["Bài 23: Khái niệm phân số", "Bài 24: Tính chất cơ cả của phân số", "Bài 25: Quy đồng mẫu số các phân số", "Bài 26: So sánh phân số", "Bài 27: Cộng, trừ phân số"]
          }
      ]
  },
  {
      grade: 3,
      chapters: [
          {
              name: "Chủ đề 1: Ôn tập và bổ sung",
              lessons: ["Bài 1: Ôn tập các số đến 1000", "Bài 2: Ôn tập phép cộng, phép trừ trong phạm vi 1000", "Bài 3: Tìm thành phần trong phép cộng, phép trừ", "Bài 4: Ôn tập bảng nhân 2, 5; bảng chia 2, 5"]
          },
          {
              name: "Chủ đề 2: Bảng nhân, bảng chia",
              lessons: ["Bài 6: Bảng nhân 3, bảng chia 3", "Bài 7: Bảng nhân 4, bảng chia 4", "Bài 9: Bảng nhân 6, 7, 8, 9", "Bài 10: Bảng chia 6, 7, 8, 9"]
          },
          {
              name: "Chủ đề 3: Hình học và đo lường",
              lessons: ["Bài 13: Điểm ở giữa, trung điểm của đoạn thẳng", "Bài 14: Hình tròn", "Bài 15: Góc vuông, góc không vuông", "Bài 16: Chu vi hình tam giác, chu vi hình tứ giác"]
          },
          {
              name: "Chủ đề 4: Các số đến 10 000",
              lessons: ["Bài 33: Các số đến 10 000", "Bài 34: So sánh các số trong phạm vi 10 000", "Bài 35: Phép cộng, phép trừ trong phạm vi 10 000"]
          }
      ]
  },
  {
      grade: 2,
      chapters: [
          {
              name: "Tập 1 - Chủ đề 1: Ôn tập và bổ sung",
              lessons: ["Bài 1: Ôn tập các số đến 100", "Bài 2: Tia số. Số liền trước, số liền sau", "Bài 3: Các thành phần của phép cộng, phép trừ", "Bài 4: Hơn, kém nhau bao nhiêu", "Bài 5: Ôn tập phép cộng, phép trừ trong phạm vi 100", "Bài 6: Luyện tập chung"]
          },
          {
              name: "Tập 1 - Chủ đề 2: Phép cộng, phép trừ trong phạm vi 20",
              lessons: ["Bài 7: Phép cộng (có nhớ) trong phạm vi 20", "Bài 8: Phép trừ (có nhớ) trong phạm vi 20", "Bài 9: Bài toán về thêm, bớt một số đơn vị", "Bài 10: Luyện tập chung"]
          },
          {
              name: "Tập 1 - Chủ đề 3: Làm quen với khối lượng, dung tích",
              lessons: ["Bài 11: Ki-lô-gam", "Bài 12: Lít", "Bài 13: Luyện tập chung"]
          },
          {
              name: "Tập 1 - Chủ đề 4: Làm quen với hình khối",
              lessons: ["Bài 14: Điểm, đoạn thẳng", "Bài 15: Đường thẳng, đường cong", "Bài 16: Ba điểm thẳng hàng. Đường gấp khúc", "Bài 17: Hình tứ giác", "Bài 18: Luyện tập chung"]
          },
          {
              name: "Tập 1 - Chủ đề 5: Phép cộng, phép trừ trong phạm vi 100",
              lessons: ["Bài 19: Phép cộng (có nhớ) số có hai chữ số với số có một chữ số", "Bài 20: Phép cộng (có nhớ) số có hai chữ số với số có hai chữ số", "Bài 21: Luyện tập chung", "Bài 22: Phép trừ (có nhớ) số có hai chữ số cho số có một chữ số", "Bài 23: Phép trừ (có nhớ) số có hai chữ số cho số có hai chữ số", "Bài 24: Luyện tập chung"]
          },
          {
              name: "Tập 1 - Chủ đề 6: Ôn tập học kì 1",
              lessons: ["Bài 28: Ôn tập các số trong phạm vi 100", "Bài 29: Ôn tập phép cộng, phép trừ trong phạm vi 100", "Bài 30: Ôn tập hình học và đo lường", "Bài 31: Luyện tập chung"]
          },
          {
              name: "Tập 2 - Chủ đề 7: Phép nhân, phép chia",
              lessons: ["Bài 32: Phép nhân", "Bài 33: Thừa số, tích", "Bài 34: Bảng nhân 2", "Bài 35: Bảng nhân 5", "Bài 36: Luyện tập chung", "Bài 37: Phép chia", "Bài 38: Số bị chia, số chia, thương", "Bài 39: Bảng chia 2", "Bài 40: Bảng chia 5", "Bài 41: Luyện tập chung"]
          },
          {
              name: "Tập 2 - Chủ đề 8: Làm quen với hình khối (tiếp)",
              lessons: ["Bài 42: Hình dạng xung quanh em", "Bài 43: Khối trụ, khối cầu", "Bài 44: Luyện tập chung", "Bài 45: Thực hành và trải nghiệm"]
          },
          {
              name: "Tập 2 - Chủ đề 9: Thời gian, Tiền Việt Nam",
              lessons: ["Bài 46: Khối lượng, dung tích (tiếp theo)", "Bài 57: Đồng hồ, thời gian", "Bài 58: Tiền Việt Nam", "Bài 59: Luyện tập chung"]
          },
          {
              name: "Tập 2 - Chủ đề 10: Các số đến 1000",
              lessons: ["Bài 50: Các số tròn trăm, tròn chục", "Bài 51: Các số đến 1000", "Bài 52: So sánh các số đến 1000", "Bài 53: Luyện tập chung"]
          },
          {
              name: "Tập 2 - Chủ đề 11: Độ dài và đơn vị đo độ dài",
              lessons: ["Bài 47: Đơn vị đo độ dài", "Bài 48: Mi-li-mét", "Bài 54: Mét", "Bài 55: Ki-lô-mét", "Bài 56: Luyện tập chung"]
          },
          {
              name: "Tập 2 - Chủ đề 12: Phép cộng, phép trừ trong phạm vi 1000",
              lessons: ["Bài 60: Phép cộng (không nhớ) trong phạm vi 1000", "Bài 61: Phép trừ (không nhớ) trong phạm vi 1000", "Bài 62: Luyện tập chung", "Bài 63: Phép cộng (có nhớ) trong phạm vi 1000", "Bài 64: Phép trừ (có nhớ) trong phạm vi 1000", "Bài 65: Luyện tập chung"]
          },
          {
              name: "Tập 2 - Chủ đề 13: Một số yếu tố thống kê và xác suất",
              lessons: ["Bài 66: Chắc chắn, có thể, không thể", "Bài 67: Kiểm đếm số lượng", "Bài 68: Luyện tập chung"]
          },
          {
              name: "Tập 2 - Chủ đề 14: Ôn tập cuối năm",
              lessons: ["Bài 69: Ôn tập các số đến 1000", "Bài 70: Ôn tập phép cộng, phép trừ", "Bài 71: Ôn tập phép nhân, phép chia", "Bài 72: Ôn tập hình học và đo lường", "Bài 73: Ôn tập yếu tố thống kê và xác suất", "Bài 74: Luyện tập chung"]
          }
      ]
  },
  {
      grade: 1,
      chapters: [
          {
              name: "Chủ đề 1: Các số từ 0 đến 10",
              lessons: ["Bài 1: Các số 0, 1, 2, 3, 4, 5", "Bài 2: Các số 6, 7, 8, 9, 10", "Bài 3: Nhiều hơn, ít hơn, bằng nhau", "Bài 4: So sánh số"]
          },
          {
              name: "Chủ đề 2: Làm quen với một số hình phẳng",
              lessons: ["Bài 6: Hình vuông, hình tròn, hình tam giác, hình chữ nhật", "Bài 7: Thực hành lắp ghép hình"]
          },
          {
              name: "Chủ đề 3: Phép cộng, phép trừ trong phạm vi 10",
              lessons: ["Bài 8: Phép cộng trong phạm vi 10", "Bài 9: Phép trừ trong phạm vi 10", "Bài 10: Luyện tập chung"]
          },
          {
              name: "Chủ đề 4: Các số trong phạm vi 100",
              lessons: ["Bài 21: Số có hai chữ số", "Bài 22: So sánh số có hai chữ số", "Bài 23: Bảng các số từ 1 đến 100"]
          }
      ]
  }
];

export const getLessonOptions = (grade: number) => {
  const data = SYLLABUS_DB.find(item => item.grade === grade);
  return data ? data.chapters : [];
};

export const getChapterOfLesson = (grade: number, lessonName: string): string => {
  const chapters = getLessonOptions(grade);
  for (const chapter of chapters) {
      if (chapter.lessons.includes(lessonName)) {
          return chapter.name;
      }
  }
  return "";
};

// --- NEW HELPER: Get Syllabus Scope for Exams ---
export const getExamScope = (grade: number, examType: ExamType): string => {
    const chapters = getLessonOptions(grade);
    let relevantChapters: { name: string, lessons: string[] }[] = [];

    switch (examType) {
        case ExamType.MidTerm1:
            // Lấy 50% chương đầu của Tập 1
            relevantChapters = chapters.filter(c => c.name.includes("Tập 1")).slice(0, Math.ceil(chapters.filter(c => c.name.includes("Tập 1")).length / 2));
            break;
        case ExamType.EndTerm1:
            // Lấy toàn bộ Tập 1
            relevantChapters = chapters.filter(c => c.name.includes("Tập 1"));
            break;
        case ExamType.MidTerm2:
            // Lấy 50% chương đầu của Tập 2
            relevantChapters = chapters.filter(c => c.name.includes("Tập 2")).slice(0, Math.ceil(chapters.filter(c => c.name.includes("Tập 2")).length / 2));
            break;
        case ExamType.EndTerm2:
            // Lấy toàn bộ Tập 2
            relevantChapters = chapters.filter(c => c.name.includes("Tập 2"));
            break;
        default:
            return "";
    }

    if (relevantChapters.length === 0) return "";

    // Gom thành chuỗi mô tả ngắn gọn
    const scopeDescription = relevantChapters.map(c => c.name.split(':')[0]).join(", ");
    return `Phạm vi kiến thức: ${scopeDescription}. Bao gồm các nội dung chính trong các chương này.`;
};