# 🚀 Quick Start Guide

## 📋 Yêu Cầu

- Node.js >= 14.0.0
- npm hoặc yarn

## ⚡ Chạy Project

### 1. Cài Đặt Dependencies

```bash
npm install
```

### 2. Khởi Động Server

```bash
npm start
```

Server sẽ chạy tại: **http://localhost:3000**

### 3. Truy Cập Ứng Dụng

- **JavaScript Version**: http://localhost:3000/js
- **WebAssembly Version**: http://localhost:3000/wasm
- **Home Page**: http://localhost:3000

## 🎯 Cách Sử Dụng

1. **Chọn phiên bản** (JS hoặc WASM)
2. **Upload ảnh** - Click "📁 Chọn Ảnh"
3. **Áp dụng preset** - Click vào bất kỳ preset nào
4. **Xem kết quả**:
   - Ảnh gốc (bên trái)
   - Ảnh đã filter (bên phải)
   - Thông tin hiệu suất (thời gian xử lý, throughput)

## 📊 Benchmark

- Mỗi lần apply filter sẽ lưu vào **Benchmark History**
- So sánh hiệu suất giữa JS và WASM
- Export kết quả ra file CSV

## 🎨 Available Presets

1. **Vintage** - Tông màu sepia cổ điển
2. **Cool** - Tông màu xanh lạnh
3. **Warm** - Tông màu cam/vàng ấm
4. **Black & White** - Đen trắng
5. **High Contrast** - Tăng độ tương phản
6. **Vibrant** - Tăng độ bão hòa
7. **Fade** - Hiệu ứng phai màu
8. **Nashville** - Instagram-style filter

## 🔧 Build WASM (Optional)

Nếu muốn modify C code và rebuild WASM:

### 1. Cài Đặt Emscripten

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

### 2. Build WASM

```bash
cd wasm-version
bash build.sh
```

File `filters.wasm` và `filters.js` sẽ được generate.

## 🐛 Troubleshooting

### Server không chạy

```bash
# Check port 3000 có bị dùng không
lsof -i :3000

# Kill process nếu cần
kill -9 <PID>
```

### WASM không load

1. Hard refresh: `Ctrl + Shift + R`
2. Check console logs
3. Verify `filters.wasm` exists: `ls wasm-version/filters.wasm`

### Ảnh không hiển thị

- Check file format (chỉ hỗ trợ: JPG, PNG, WebP)
- Check file size (< 10MB recommended)

## 📁 File Structure

```
Webassembly/
├── js-version/          # JavaScript implementation
├── wasm-version/        # WebAssembly implementation  
├── shared/              # Preset definitions
├── server.js            # Express server
└── package.json         # Dependencies
```

## 🎓 Technical Details

### JavaScript Version
- Pure JavaScript image processing
- Canvas API
- No external libraries

### WebAssembly Version
- C code compiled to WASM via Emscripten
- Memory wrapper for HEAP access
- ~10-30% faster than JS (depending on image size)

## 📚 Tài Liệu Chi Tiết

Xem [README.md](./README.md) để biết thêm chi tiết về:
- Kiến trúc hệ thống
- API documentation
- Công thức xử lý ảnh
- Performance optimization

---

**Happy filtering! 🎨**


## 🎯 Current Status

- ✅ `app.js` - 5 fallback methods
- ✅ `simple-test.html` - 5 fallback methods + detailed logs
- ✅ `debug.html` - 5 fallback methods + memory keys detection

## 📞 Need Help?

If still not working after:
1. Hard refresh (Ctrl+Shift+R)
2. Testing simple-test.html
3. Checking console logs

Then send me:
- Screenshot of browser console
- Or copy/paste the "Available keys: ..." line

---

## 🚀 TL;DR

```bash
# 1. Hard refresh
Ctrl + Shift + R

# 2. Test
http://localhost:3000/wasm/simple-test.html

# 3. Click button
# Should see: ✓ Created HEAPU8 (...) and grayscale canvas

# 4. If working, test main app
http://localhost:3000/wasm
```

Good luck! 🎉
