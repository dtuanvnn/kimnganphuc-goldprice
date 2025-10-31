// server.js - Backend API với Supabase Database
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase client
// Dùng service_role key cho backend (có quyền INSERT)
const supabase = createClient(
  process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY'
);

app.use(cors());
app.use(express.json());

// Lấy tất cả lịch sử giá
app.get('/api/gold-prices/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('gold_prices')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lấy giá mới nhất
app.get('/api/gold-prices/latest', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('gold_prices')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({
      success: true,
      data: data || null
    });
  } catch (error) {
    console.error('Error fetching latest:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch và lưu giá mới
app.post('/api/gold-prices/fetch', async (req, res) => {
  try {
    // Fetch từ Kim Ngân Phúc
    const response = await axios.get('https://kimnganphuc.vn/gia-vang', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const prices = {};
    let updateTime = null;

    // Tìm thời gian cập nhật
    $('*').each((i, el) => {
      const text = $(el).text();
      const match = text.match(/Cập nhật lúc (\d{2}:\d{2})\s+Ngày\s+(\d{2}\/\d{2}\/\d{4})/i);
      if (match) {
        updateTime = `${match[2]} ${match[1]}`;
        return false;
      }
    });

    // Parse bảng giá
    $('table tr').each((index, row) => {
      if (index === 0) return;
      
      const cols = $(row).find('td');
      if (cols.length >= 3) {
        const name = $(cols[0]).text().trim();
        const buyText = $(cols[1]).text().trim();
        const sellText = $(cols[2]).text().trim();
        
        const buy = parseFloat(buyText.replace(/[,\.]/g, ''));
        const sell = parseFloat(sellText.replace(/[,\.]/g, ''));
        
        if (name && !isNaN(buy) && !isNaN(sell)) {
          const key = name.toLowerCase()
            .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
            .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
            .replace(/[ìíịỉĩ]/g, 'i')
            .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
            .replace(/[ùúụủũưừứựửữ]/g, 'u')
            .replace(/[ỳýỵỷỹ]/g, 'y')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]/g, '_');
          
          prices[key] = { name, buy, sell };
        }
      }
    });

    const displayTime = updateTime || new Date().toLocaleString('vi-VN');

    // Debug: Log tất cả keys để xem tên thực tế
    console.log('📊 Parsed price keys:');
    Object.keys(prices).forEach(key => {
      console.log(`  - ${key}: mua ${prices[key].buy}, bán ${prices[key].sell}`);
    });

    // Tự động tìm key phù hợp (flexible mapping)
    const findPrice = (keywords) => {
      const key = Object.keys(prices).find(k => 
        keywords.every(keyword => k.includes(keyword))
      );
      return key ? prices[key] : { buy: null, sell: null };
    };

    // Chuẩn bị dữ liệu để insert với flexible key matching
    const priceData = {
      display_time: displayTime,
      nhan_ep_vi_knp_9999_buy: findPrice(['nhan', 'ep', 'vi']).buy,
      nhan_ep_vi_knp_9999_sell: findPrice(['nhan', 'ep', 'vi']).sell,
      vang_trang_suc_9999_buy: findPrice(['vang', 'trang', 'suc', '9999']).buy,
      vang_trang_suc_9999_sell: findPrice(['vang', 'trang', 'suc', '9999']).sell,
      vang_trang_suc_999_buy: findPrice(['vang', 'trang', 'suc', '999']).buy,
      vang_trang_suc_999_sell: findPrice(['vang', 'trang', 'suc', '999']).sell,
      bac_thoi_1_luong_buy: findPrice(['bac', 'thoi', '1', 'luong']).buy,
      bac_thoi_1_luong_sell: findPrice(['bac', 'thoi', '1', 'luong']).sell,
      bac_mieng_1_luong_buy: findPrice(['bac', 'mieng', '1', 'luong']).buy,
      bac_mieng_1_luong_sell: findPrice(['bac', 'mieng', '1', 'luong']).sell,
      bac_thoi_2024_buy: findPrice(['bac', 'thoi', '2024']).buy,
      bac_thoi_2024_sell: findPrice(['bac', 'thoi', '2024']).sell,
      bac_thoi_2025_buy: findPrice(['bac', 'thoi', '2025']).buy,
      bac_thoi_2025_sell: findPrice(['bac', 'thoi', '2025']).sell
    };

    // Kiểm tra xem giá có thay đổi không
    const { data: latest } = await supabase
      .from('gold_prices')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    let hasChanged = !latest;
    if (latest) {
      // So sánh các giá
      const fields = Object.keys(priceData).filter(k => k !== 'display_time');
      hasChanged = fields.some(field => latest[field] !== priceData[field]);
    }

    if (!hasChanged) {
      console.log('Giá không thay đổi, không lưu vào database');
      return res.json({
        success: true,
        message: 'Giá không thay đổi',
        prices: prices,
        updateTime: displayTime,
        saved: false
      });
    }

    // Lưu vào database
    const { data: inserted, error: insertError } = await supabase
      .from('gold_prices')
      .insert([priceData])
      .select()
      .single();

    if (insertError) {
      // Nếu trùng display_time, bỏ qua
      if (insertError.code === '23505') {
        return res.json({
          success: true,
          message: 'Dữ liệu đã tồn tại',
          prices: prices,
          updateTime: displayTime,
          saved: false
        });
      }
      throw insertError;
    }

    res.json({
      success: true,
      message: 'Đã lưu giá mới vào database',
      prices: prices,
      updateTime: displayTime,
      saved: true,
      id: inserted.id
    });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Không thể lấy hoặc lưu dữ liệu',
      message: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'Supabase PostgreSQL'
  });
});

// Thêm vào server.js
app.get('/api/cron/update-prices', async (req, res) => {
  try {
    await axios.post(`http://localhost:${PORT}/api/gold-prices/fetch`);
    res.json({ success: true, message: 'Prices updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   - POST /api/gold-prices/fetch (fetch & save new prices)`);
  console.log(`   - GET  /api/gold-prices/history (get all history)`);
  console.log(`   - GET  /api/gold-prices/latest (get latest price)`);
  console.log(`   - GET  /api/health (health check)`);
  console.log(`   - GET  /api/cron/update-prices (cron update prices)`);
});