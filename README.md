# QuickInvoice POS

Hệ thống tính tiền và xuất hóa đơn cho cửa hàng chai nhựa & thủy tinh.

## Tính năng

- ✅ Đăng nhập (admin / guest)
- ✅ Chọn sản phẩm, thêm vào giỏ hàng
- ✅ Xem & in hóa đơn, lưu ảnh PNG
- ✅ Lịch sử hóa đơn (trạng thái: chưa TT / đã TT / hủy)
- ✅ Quản lý danh mục sản phẩm (thêm / sửa / xóa)
- ✅ **Xuất Excel** (2 sheet: chi tiết & tổng hợp)
- ✅ Responsive – dùng được trên điện thoại & laptop

## Tài khoản mặc định

| Tài khoản | Mật khẩu | Quyền |
|-----------|----------|-------|
| admin     | 123      | Toàn quyền |
| guest     | 123      | Chỉ xem lịch sử |

## Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:3000

## Deploy lên Vercel

1. Push repo lên GitHub
2. Vào [vercel.com](https://vercel.com) → **New Project** → Import repo
3. Framework: **Vite** (tự detect)
4. Bấm **Deploy** — xong!

Không cần cấu hình env variable nào.
