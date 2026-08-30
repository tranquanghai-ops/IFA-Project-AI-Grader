# IFA AI Grader – cấu trúc mã

Ứng dụng được chia theo ranh giới chức năng để các lần sửa sau không phải thay toàn bộ mã:

- `src/App.tsx`: màn hình chọn chế độ.
- `src/ThesisGrader.tsx`: quy trình riêng của chấm thuyết minh DATN.
- `src/ProjectGrader.tsx`: quy trình riêng của chấm đồ án môn học.
- `src/geminiKeyPool.js`: lưu và chuyển tối đa 10 Gemini API key trên trình duyệt.
- `src/rubricLibrary.js`: đọc danh mục và CSV rubric trên GitHub Pages.
- `src/shared/geminiModels.js`: danh sách model và model mặc định dùng chung.
- `src/shared/studentCsv.js`: giải mã, phân tích CSV và ánh xạ MSSV/họ tên.
- `src/shared/projectSorting.js`: sắp xếp bài theo thứ tự nạp, tên và điểm.
- `src/shared/aiJson.js`: đọc, làm sạch JSON do Gemini trả về.

## Nguyên tắc sửa về sau

- Đổi model hoặc nhãn model: chỉ sửa `shared/geminiModels.js`.
- Sửa cách nhận danh sách sinh viên: chỉ sửa `shared/studentCsv.js`.
- Sửa cách sắp xếp: chỉ sửa `shared/projectSorting.js`.
- Sửa API key: chỉ sửa `geminiKeyPool.js` và phần giao diện gọi nó.
- Chỉ sửa `ThesisGrader.tsx` hoặc `ProjectGrader.tsx` khi thay đổi nghiệp vụ riêng của chế độ đó.

Các khối lưu/nạp JSON, phiên điểm và gọi Gemini sẽ tiếp tục được chuyển dần sang mô-đun dùng chung khi ổn định, nhằm tránh một lần tái cấu trúc quá lớn làm ảnh hưởng dữ liệu tiến trình cũ.
