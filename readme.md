🔐 Hướng dẫn Setup GitHub Secrets
📝 Tại sao dùng GitHub Secrets?
✅ An toàn: API keys không bao giờ xuất hiện trong code ✅ Encrypted: GitHub mã hóa secrets ✅ CI/CD: Tự động deploy mà không lộ keys ✅ Team-friendly: Dễ quản lý keys cho nhiều người

🔧 BƯỚC 1: Tạo GitHub Secrets
1.1. Vào Repository Settings
GitHub Repository → Settings → Secrets and variables → Actions
1.2. Click "New repository secret"
1.3. Thêm các Secrets sau:
Secret 1: SUPABASE_URL
Name: SUPABASE_URL
Value: https://xxxxxxxxxxxxx.supabase.co
Click "Add secret"
Secret 2: SUPABASE_SERVICE_ROLE_KEY
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service_role key từ Supabase)
Click "Add secret"
Secret 3: RENDER_API_KEY (Nếu dùng Render)
Name: RENDER_API_KEY
Value: Lấy từ Render.com → Account Settings → API Keys
Click "Add secret"
Secret 4: RENDER_SERVICE_ID (Nếu dùng Render)
Name: RENDER_SERVICE_ID
Value: Lấy từ Render service URL: srv-xxxxxxxxxxxxx
Click "Add secret"
🚀 BƯỚC 2: Setup Render với GitHub
Phương án A: Render tự động sync với GitHub (Khuyên dùng)
1. Kết nối GitHub với Render:

Vào Render.com Dashboard
New → Web Service
Connect GitHub repository
Render sẽ tự động detect render.yaml
2. Thêm Environment Variables trên Render:

Vào Service Settings → Environment
Add Environment Variable:
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGci... (paste service_role key)
Save Changes
3. Deploy:

Render tự động deploy khi bạn push code
Hoặc click "Manual Deploy"
Phương án B: Dùng GitHub Actions
1. Setup workflow:

Copy file .github/workflows/deploy.yml vào repo
Commit & push
2. Khi push code:

GitHub Actions tự động chạy
Deploy lên Render
Check tab "Actions" trên GitHub để xem progress
🔒 BƯỚC 3: Bảo mật file .env
3.1. Cập nhật .gitignore
bash
# .gitignore
node_modules/
dist/
.env
.env.local
.env.production
*.log
3.2. Xóa .env khỏi Git (nếu đã commit nhầm)
bash
# Nếu đã commit file .env nhầm
git rm --cached .env
git rm --cached backend/.env
git commit -m "Remove .env from tracking"
git push
3.3. Tạo .env.example
bash
# .env.example - Commit file này (không có giá trị thật)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
📦 BƯỚC 4: Cấu trúc thư mục đầy đủ
gold-price-project/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Actions workflow
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env                    ← KHÔNG commit (trong .gitignore)
│   └── .env.example            ← Commit file này
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── render.yaml                 ← Config cho Render
├── .gitignore                  ← Bắt buộc phải có
└── README.md
🧪 BƯỚC 5: Test trên Local
5.1. Clone repo mới
bash
git clone https://github.com/YOUR-USERNAME/gold-price-project.git
cd gold-price-project/backend
5.2. Tạo .env từ .env.example
bash
cp .env.example .env
# Sau đó điền giá trị thực vào .env
5.3. Chạy thử
bash
npm install
npm run dev
🔍 BƯỚC 6: Verify Security
6.1. Kiểm tra không có secrets trong code
bash
# Search trong toàn bộ repo
git grep "eyJhbGciOiJIUzI1NiI"  # Không được có kết quả!
git grep "supabase.co"          # Chỉ trong .env.example
6.2. Check GitHub
Vào repo trên GitHub
Tìm file server.js
Đảm bảo thấy: process.env.SUPABASE_SERVICE_ROLE_KEY
KHÔNG thấy: giá trị thực của key
6.3. Check Render
Vào Render service → Environment
Thấy SUPABASE_SERVICE_ROLE_KEY = *********** (bị ẩn)
KHÔNG thấy giá trị đầy đủ
🚨 Troubleshooting
Lỗi: "SUPABASE_SERVICE_ROLE_KEY is undefined"
Nguyên nhân: Environment variable chưa được set

Giải pháp:

Kiểm tra GitHub Secrets đã tạo chưa
Kiểm tra Render Environment Variables đã thêm chưa
Redeploy service trên Render
Lỗi: "Error: connect ECONNREFUSED"
Nguyên nhân: Local chưa có .env

Giải pháp:

bash
cd backend
cp .env.example .env
# Điền thông tin thực vào .env
npm run dev
Lỗi: GitHub Actions failed
Nguyên nhân: Thiếu secrets

Giải pháp:

Check GitHub → Settings → Secrets
Đảm bảo có đủ: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RENDER_API_KEY, RENDER_SERVICE_ID
Re-run workflow
✅ Checklist bảo mật
 File .env trong .gitignore
 Secrets được tạo trên GitHub
 Environment variables được set trên Render
 Không có secret nào trong code
 File .env.example có trong repo (không có giá trị thật)
 Test local với .env
 Test production đã hoạt động
🎯 Best Practices
✅ Rotate keys định kỳ (3-6 tháng/lần)
✅ Dùng service_role key chỉ trên backend
✅ Không log secrets trong console
✅ Review code trước khi commit
✅ Sử dụng GitHub branch protection cho main branch
📚 Tài liệu tham khảo
GitHub Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets
Render Environment Variables: https://render.com/docs/environment-variables
Supabase Security: https://supabase.com/docs/guides/api/api-keys
🆘 Nếu lộ secrets
Nếu vô tình commit secrets lên GitHub:

Ngay lập tức: Revoke key trên Supabase
Generate key mới trên Supabase
Update secrets trên GitHub và Render
Clean Git history:
bash
# Dùng git-filter-repo hoặc BFG Repo-Cleaner
# Hoặc đơn giản: tạo repo mới
Force push (nếu không ai clone repo chưa)
bash
git push --force
💡 Tip: Sử dụng doppler.com hoặc Vault
Nếu project lớn hơn, cân nhắc dùng:

Doppler: Secret management platform
HashiCorp Vault: Enterprise secret management
AWS Secrets Manager: Nếu dùng AWS
Nhưng với project này, GitHub Secrets + Render Environment Variables là đủ! 🎉

