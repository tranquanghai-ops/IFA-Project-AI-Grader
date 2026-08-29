# IFA Unified AI Grader — bản hợp nhất thử nghiệm

Ứng dụng hợp nhất hai quy trình:

- **Chấm đồ án môn học / bài vẽ:** sử dụng mô-đun IFA Project AI Grader V6.
- **Chấm thuyết minh DATN/DATH:** sử dụng mô-đun IFA Thesis AI Grader V3.2, giữ quy trình GVHD và phản biện.

## Trạng thái nhánh

Nhánh `codex/unified-v1` là bản thử nghiệm, chưa thay thế ứng dụng đang chạy trên `main`.

Ở màn hình đầu, giảng viên chọn loại nội dung cần chấm. Hai mô-đun được tải riêng để giảm thời gian mở trang. Khi đổi chế độ trong cùng phiên trình duyệt, dữ liệu đang nhập của mô-đun trước vẫn được giữ.

## An toàn dữ liệu

- API key chỉ lưu cục bộ trong trình duyệt của giảng viên.
- Hai chế độ vẫn dùng vùng lưu trữ và schema tiến trình riêng.
- Không nhúng API key vào mã nguồn hoặc JSON xuất ra.
- Repository hiện tại vẫn giữ nhánh `main` nguyên vẹn cho đến khi bản hợp nhất được kiểm tra đầy đủ.

## Chạy thử

```bash
npm install
npm run dev
```

## Kiểm tra biên dịch

```bash
npm ci
npm run build
```

---

Built by Trần Quang Hải — tranquanghai@tdtu.edu.vn
