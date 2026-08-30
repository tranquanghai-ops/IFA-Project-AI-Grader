# IFA Unified AI Grader V1

Ứng dụng hợp nhất hai quy trình trong một địa chỉ:

- **Chấm đồ án môn học / bài vẽ**
- **Chấm thuyết minh DATN/DATH**, gồm GVHD, phản biện và góp ý sửa bài

## Model và API key

- Mặc định dùng Gemini 3 Flash Preview cho tác vụ thông thường.
- Gemini 3.6/3.7 vẫn có thể chọn thủ công khi cần.
- Hỗ trợ tối đa 10 API key và chọn khóa đang hoạt động.
- API key chỉ lưu trong trình duyệt, không nằm trong mã nguồn hoặc JSON.

## Thư viện rubric GitHub

Ứng dụng đọc danh sách rubric từ:

```
public/rubrics/manifest.json
```

Các CSV được đặt theo chế độ:

```
public/rubrics/project/
public/rubrics/thesis/
```

Để thêm rubric, tải CSV vào đúng thư mục và thêm mục tương ứng vào `manifest.json`. Sau lần triển khai tiếp theo, rubric tự xuất hiện trong danh sách lựa chọn ở Bước 1.

CSV nên có bốn cột:

```csv
id,name,maxScore,desc
```

## Bảo mật và đồng bộ tài khoản

GitHub Pages là ứng dụng tĩnh nên không được ghi API key vào mã hoặc tệp công khai. Phương án đồng bộ đa thiết bị dự kiến dùng Google Sign-In và vùng riêng `appDataFolder` của Google Drive:

- Hồ sơ giảng viên và cài đặt thông thường được đồng bộ theo tài khoản.
- API key chỉ được đồng bộ nếu giảng viên bật tùy chọn và khóa được mã hóa phía trình duyệt bằng mật khẩu bảo vệ riêng.
- Không lưu PDF/Base64 trong hồ sơ đồng bộ.

## Chạy và kiểm tra

```bash
npm ci
npm run dev
npm run build
```

---

IFA Unified AI Grader V1 — Built by Trần Quang Hải — tranquanghai@tdtu.edu.vn
