# 🚀 Hướng dẫn Deploy Website Giá Vàng Kim Ngân Phúc

## 📁 Cấu trúc thư mục

```
gold-price-project/
├── frontend/                    # Ứng dụng React
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .gitignore
│   └── src/
│       ├── main.jsx
│       ├── index.css
│       └── App.jsx             # Copy code từ artifact "gold_price_tracker"
│
└── backend/                     # API Server
    ├── server.js               # Copy từ artifact "backend_api"
    ├── package.json            # Copy từ artifact "backend_package_json"
    └── .gitignore
```

## 🔧 BƯỚC 1: Setup Frontend

```bash
# Tạo thư mục dự án
mkdir gold-price-project
cd gold-price-project
mkdir frontend
cd frontend

# Khởi tạo dự án
npm init -y

# Cài đặt dependencies
npm install react react-dom recharts lucide-react

# Cài đặt dev dependencies
npm install -D vite @vitejs/plugin-react tailwindcss postcss autoprefixer

# Khởi tạo Tailwind
npx tailwindcss init -p
```

**Tạo các file:**
1. Copy tất cả các file config từ artifacts vào thư mục này
2. Tạo thư mục `src/` và copy `App.jsx` từ artifact `gold_price_tracker`
3. Sửa trong `App.jsx` - thay đổi URL fetch:

```javascript
// Dòng ~60, trong hàm fetchPrices()
const response = await fetch('https://YOUR-BACKEND-URL.onrender.com/api/gold-prices');
```

**Chạy thử local:**
```bash
npm run dev
```

Mở http://localhost:3000

---

## 🔧 BƯỚC 2: Setup Backend

```bash
# Quay lại thư mục gốc
cd ..
mkdir backend
cd backend

# Tạo package.json và server.js từ artifacts
# Cài đặt dependencies
npm install
```

**Chạy thử local:**
```bash
npm run dev
```

Backend sẽ chạy tại http://localhost:3001

---

## ☁️ BƯỚC 3: Deploy Backend lên Render.com (Miễn phí)

### 3.1. Chuẩn bị

1. Đăng ký tại https://render.com
2. Tạo GitHub repository và push code backend lên

```bash
cd backend
git init
git add .
git commit -m "Initial backend"
git remote add origin https://github.com/YOUR-USERNAME/gold-api.git
git push -u origin main
```

### 3.2. Deploy trên Render

1. Đăng nhập Render.com
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repository
4. Điền thông tin:
   - **Name:** `gold-price-api`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
5. Click **"Create Web Service"**

Sau vài phút, bạn sẽ có URL như: `https://gold-price-api.onrender.com`

### 3.3. Test API

```bash
curl https://gold-price-api.onrender.com/api/gold-prices
```

---

## ☁️ BƯỚC 4: Deploy Frontend lên Vercel (Miễn phí)

### 4.1. Cập nhật URL API

Sửa file `src/App.jsx`, tìm hàm `fetchPrices()` và thay:

```javascript
const response = await fetch('https://gold-price-api.onrender.com/api/gold-prices');
```

### 4.2. Deploy

```bash
cd ../frontend

# Cài Vercel CLI
npm i -g vercel

# Deploy
vercel

# Hoặc deploy production
vercel --prod
```

Làm theo hướng dẫn, website sẽ có URL như: `https://gold-price-tracker.vercel.app`

---

## 🎯 BƯỚC 5: Test toàn bộ hệ thống

1. Truy cập URL frontend của bạn
2. Click nút "Cập nhật ngay"
3. Kiểm tra xem dữ liệu có load không
4. Để 30 phút xem có tự động cập nhật không

---

## 🔄 Cập nhật sau này

### Cập nhật Backend:
```bash
cd backend
# Sửa code
git add .
git commit -m "Update API"
git push
# Render sẽ tự động deploy lại
```

### Cập nhật Frontend:
```bash
cd frontend
# Sửa code
vercel --prod
```

---

## 🐛 Troubleshooting

### Backend không fetch được dữ liệu?
- Kiểm tra console logs trên Render
- Website Kim Ngân Phúc có thể đã thay đổi cấu trúc HTML
- Cần cập nhật selector trong `server.js`

### Frontend không connect được backend?
- Kiểm tra CORS đã enable chưa
- Kiểm tra URL API có đúng không
- Mở DevTools → Network tab để debug

### Storage không hoạt động?
- Storage artifact chỉ hoạt động trên Claude.ai
- Cần migrate sang localStorage hoặc database thật (MongoDB, Supabase)

---

## 💡 Nâng cấp trong tương lai

1. **Database thật:** Dùng MongoDB Atlas (miễn phí) thay vì artifact storage
2. **Authentication:** Thêm login nếu muốn riêng tư
3. **Notification:** Gửi email khi giá thay đổi lớn
4. **Mobile App:** Dùng React Native
5. **Cron Job:** Dùng cron-job.org để ping backend mỗi 30 phút (giữ cho free tier không sleep)

---

## 📞 Liên hệ & Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Check logs trên Render/Vercel
2. Kiểm tra GitHub Issues
3. Google error message

Good luck! 🍀