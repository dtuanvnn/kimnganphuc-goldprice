-- ============================================
-- SUPABASE DATABASE SETUP
-- Chạy script này trong SQL Editor của Supabase
-- ============================================

-- 1. Tạo bảng lưu giá vàng
CREATE TABLE IF NOT EXISTS gold_prices (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  display_time TEXT NOT NULL,
  
  -- Giá vàng
  nhan_ep_vi_knp_9999_buy NUMERIC,
  nhan_ep_vi_knp_9999_sell NUMERIC,
  vang_trang_suc_9999_buy NUMERIC,
  vang_trang_suc_9999_sell NUMERIC,
  vang_trang_suc_999_buy NUMERIC,
  vang_trang_suc_999_sell NUMERIC,
  
  -- Giá bạc
  bac_thoi_1_luong_buy NUMERIC,
  bac_thoi_1_luong_sell NUMERIC,
  bac_mieng_1_luong_buy NUMERIC,
  bac_mieng_1_luong_sell NUMERIC,
  bac_thoi_2024_buy NUMERIC,
  bac_thoi_2024_sell NUMERIC,
  bac_thoi_2025_buy NUMERIC,
  bac_thoi_2025_sell NUMERIC,
  
  -- Constraint: không cho phép trùng display_time
  UNIQUE(display_time)
);

-- 2. Tạo index để query nhanh
CREATE INDEX IF NOT EXISTS idx_gold_prices_timestamp 
ON gold_prices(timestamp DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE gold_prices ENABLE ROW LEVEL SECURITY;

-- 4. Xóa các policy cũ nếu có (để chạy lại script)
DROP POLICY IF EXISTS "Allow public read" ON gold_prices;
DROP POLICY IF EXISTS "Allow service role write" ON gold_prices;

-- 5. Policy: Cho phép mọi người ĐỌC (dùng anon key từ frontend)
CREATE POLICY "Allow public read" 
ON gold_prices 
FOR SELECT 
USING (true);

-- 6. Policy: CHỈ service_role mới được INSERT/UPDATE/DELETE
-- Frontend với anon key KHÔNG thể insert
-- Chỉ backend với service_role key mới insert được
CREATE POLICY "Allow service role write" 
ON gold_prices 
FOR ALL 
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- 7. Kiểm tra setup
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'gold_prices';

-- 8. Xem các policies
SELECT * FROM pg_policies WHERE tablename = 'gold_prices';

-- ============================================
-- TEST QUERIES (Optional)
-- ============================================

-- Xem tất cả dữ liệu
-- SELECT * FROM gold_prices ORDER BY timestamp DESC LIMIT 10;

-- Xem tổng số records
-- SELECT COUNT(*) FROM gold_prices;

-- Xóa tất cả dữ liệu (nếu cần reset)
-- TRUNCATE gold_prices RESTART IDENTITY;