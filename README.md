# IFA Project AI Grader V6

Ứng dụng hỗ trợ giảng viên chấm **đồ án môn học và bài vẽ tay** theo rubric do giảng viên tải lên hoặc tự nhập.

Ứng dụng này không phải bản chấm thuyết minh tốt nghiệp và không có chế độ chấm phản biện.

## Chức năng chính

- Đọc ảnh, Word và PDF; PDF có thể đọc toàn bộ, theo mục chính, theo cụm 8–150 trang hoặc chia 2–3 lượt.
- Chấm theo rubric môn học, lưu phiên bản điểm và phiên bản nhận xét.
- Cân chỉnh tương quan điểm, hiển thị điểm trước/sau và hoàn tác từng bài.
- Kiểm tra riêng dấu hiệu nội dung tạo sinh, có báo cáo chi tiết và kết luận của giảng viên.
- OCR tên/MSSV, đối chiếu danh sách lớp, xuất CSV và phiếu PDF.
- Hiển thị ba dòng tiến trình mới nhất khi chấm.
- Lưu/khôi phục toàn bộ tiến trình bằng JSON.

## Cấu hình AI

Khi mở lần đầu, nhập Gemini API key trong **Cấu hình AI**. Khóa chỉ lưu bằng `localStorage` trên trình duyệt hiện tại, không nằm trong mã nguồn hay file JSON xuất ra.

- Model chấm chính mặc định: `gemini-3.7-flash`.
- Model Flash Review mặc định: `gemini-3.1-flash-lite`, dùng cho OCR, phân tích rubric và danh sách sinh viên.

Không nhập API key trực tiếp vào mã nguồn hoặc commit lên GitHub.

## Chạy trên máy

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Mỗi lần cập nhật nhánh `main`, GitHub Actions sẽ build và triển khai GitHub Pages tự động.

---

Built by Trần Quang Hải — tranquanghai@tdtu.edu.vn
