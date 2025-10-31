#!/bin/bash

# ===================================
# Setup Script cho Gold Price Tracker
# ===================================

echo "🚀 Thiết lập dự án Gold Price Tracker..."
echo ""

# Check nếu đã có .env
if [ -f "backend/.env" ]; then
    echo "⚠️  File .env đã tồn tại!"
    read -p "Bạn có muốn ghi đè không? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Hủy bỏ setup"
        exit 1
    fi
fi

# Tạo .env từ template
echo "📝 Tạo file .env từ template..."
cp backend/.env.example backend/.env

echo ""
echo "🔑 Nhập thông tin Supabase của bạn:"
echo ""

# Nhập SUPABASE_URL
read -p "SUPABASE_URL (https://xxxxx.supabase.co): " SUPABASE_URL
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL không được để trống!"
    exit 1
fi

# Nhập SUPABASE_SERVICE_ROLE_KEY
read -sp "SUPABASE_SERVICE_ROLE_KEY (sẽ ẩn khi nhập): " SUPABASE_KEY
echo ""
if [ -z "$SUPABASE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY không được để trống!"
    exit 1
fi

# Ghi vào .env
cat > backend/.env << EOF
# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_KEY

# Server Port
PORT=3001
EOF

echo ""
echo "✅ Đã tạo file backend/.env"
echo ""

# Kiểm tra .gitignore
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo "⚠️  Thêm .env vào .gitignore..."
    echo ".env" >> .gitignore
    echo "backend/.env" >> .gitignore
fi

# Cài đặt dependencies
echo "📦 Cài đặt dependencies..."
echo ""

cd backend
npm install
cd ..

if [ -d "frontend" ]; then
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "✅ Setup hoàn tất!"
echo ""
echo "📋 Bước tiếp theo:"
echo "   1. Chạy backend: cd backend && npm run dev"
echo "   2. Chạy frontend: cd frontend && npm run dev"
echo "   3. Thêm secrets vào GitHub (xem GITHUB-SECRETS-SETUP.md)"
echo ""
echo "⚠️  QUAN TRỌNG:"
echo "   - KHÔNG commit file .env lên GitHub!"
echo "   - Sử dụng GitHub Secrets cho CI/CD"
echo ""