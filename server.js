// server.js - Backend API để fetch giá vàng
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Lưu trong .env, KHÔNG commit
);

// Cho phép CORS
app.use(cors());
app.use(express.json());

// Cache để tránh fetch quá nhiều
let cache = {
  data: null,
  timestamp: null
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 phút

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

    // Chuẩn bị dữ liệu để insert
    const priceData = {
      display_time: displayTime,
      nhan_ep_vi_knp_9999_buy: prices.nhan_ep_vi_knp_9999?.buy || null,
      nhan_ep_vi_knp_9999_sell: prices.nhan_ep_vi_knp_9999?.sell || null,
      vang_trang_suc_9999_buy: prices.vang_trang_suc_9999?.buy || null,
      vang_trang_suc_9999_sell: prices.vang_trang_suc_9999?.sell || null,
      vang_trang_suc_999_buy: prices.vang_trang_suc_999?.buy || null,
      vang_trang_suc_999_sell: prices.vang_trang_suc_999?.sell || null,
      bac_thoi_1_luong_buy: prices.bac_thoi_kim_ngan_phuc_9991_luong_1l_2l_5l_10l?.buy || null,
      bac_thoi_1_luong_sell: prices.bac_thoi_kim_ngan_phuc_9991_luong_1l_2l_5l_10l?.sell || null,
      bac_mieng_1_luong_buy: prices.bac_mieng_1_luong_hinh_logo_kim_ngan_phuc?.buy || null,
      bac_mieng_1_luong_sell: prices.bac_mieng_1_luong_hinh_logo_kim_ngan_phuc?.sell || null,
      bac_thoi_2024_buy: prices.bac_thoi_kim_ngan_phuc_9991kilo_500gram__1_kilo_phien_ban_2024?.buy || null,
      bac_thoi_2024_sell: prices.bac_thoi_kim_ngan_phuc_9991kilo_500gram__1_kilo_phien_ban_2024?.sell || null,
      bac_thoi_2025_buy: prices.bac_thoi_kim_ngan_phuc_9991kilo_500gram__1_kilo_phien_ban_2025?.buy || null,
      bac_thoi_2025_sell: prices.bac_thoi_kim_ngan_phuc_9991kilo_500gram__1_kilo_phien_ban_2025?.sell || null
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

app.get('/api/gold-prices', async (req, res) => {
  try {
    // Kiểm tra cache
    if (cache.data && cache.timestamp && (Date.now() - cache.timestamp < CACHE_DURATION)) {
      console.log('Trả về dữ liệu từ cache');
      return res.json(cache.data);
    }

    // Fetch từ Kim Ngân Phúc
    const response = await axios.get('https://kimnganphuc.vn/gia-vang', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
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
        return false; // break
      }
    });

    // Parse bảng giá
    $('table tr').each((index, row) => {
      if (index === 0) return; // Skip header
      
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

    const result = {
      prices,
      updateTime: updateTime || new Date().toLocaleString('vi-VN'),
      fetchedAt: new Date().toISOString()
    };

    // Lưu vào cache
    cache.data = result;
    cache.timestamp = Date.now();

    res.json(result);
    
  } catch (error) {
    console.error('Error fetching gold prices:', error.message);
    res.status(500).json({ 
      error: 'Không thể lấy dữ liệu giá vàng',
      message: error.message 
    });
  }
});

app.get('/api/cron/update-prices', async (req, res) => {
  try {
    await axios.post(`http://localhost:${PORT}/api/gold-prices/fetch`);
    res.json({ success: true, message: 'Prices updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   - POST /api/gold-prices/fetch (fetch & save new prices)`);
  console.log(`   - GET  /api/gold-prices/history (get all history)`);
  console.log(`   - GET  /api/gold-prices/latest (get latest price)`);
  console.log(`   - GET  /api/health (health check)`);
});