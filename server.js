const express = require('express');
const path = require('path');
const os = require('os');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with proper MIME types
app.use('/js', express.static(path.join(__dirname, 'js-version'), {
    setHeaders: (res, filepath) => {
        if (filepath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

app.use('/wasm', express.static(path.join(__dirname, 'wasm-version'), {
    setHeaders: (res, filepath) => {
        if (filepath.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
        } else if (filepath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

app.use('/shared', express.static(path.join(__dirname, 'shared')));

// Routes
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Filter Benchmark</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            width: 100%;
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
        }
        
        h1 {
            font-size: 3rem;
            color: #333;
            margin-bottom: 20px;
        }
        
        .emoji {
            font-size: 4rem;
            margin-bottom: 30px;
        }
        
        p {
            font-size: 1.2rem;
            color: #666;
            margin-bottom: 50px;
            line-height: 1.6;
        }
        
        .links {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
        }
        
        .link-card {
            padding: 40px 30px;
            border-radius: 16px;
            text-decoration: none;
            color: white;
            font-size: 1.3rem;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .link-card.js {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .link-card.wasm {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        
        .link-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        .link-card .icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }
        
        .info {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 12px;
            margin-top: 30px;
        }
        
        .info h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.3rem;
        }
        
        .info ul {
            list-style: none;
            text-align: left;
            color: #555;
            line-height: 2;
        }
        
        .info li:before {
            content: "✓ ";
            color: #4facfe;
            font-weight: bold;
            margin-right: 10px;
        }
        
        @media (max-width: 768px) {
            .links {
                grid-template-columns: 1fr;
            }
            
            h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🎨</div>
        <h1>Image Filter Benchmark</h1>
        <p>So sánh hiệu suất giữa JavaScript thuần và WebAssembly trong xử lý ảnh</p>
        
        <div class="links">
            <a href="/js" class="link-card js">
                <div class="icon">🟡</div>
                <div>JavaScript Version</div>
                <small style="opacity: 0.8; font-size: 0.9rem; display: block; margin-top: 10px;">Pure JavaScript</small>
            </a>
            
            <a href="/wasm" class="link-card wasm">
                <div class="icon">🔵</div>
                <div>WebAssembly Version</div>
                <small style="opacity: 0.8; font-size: 0.9rem; display: block; margin-top: 10px;">C compiled to WASM</small>
            </a>
        </div>
        
        <div class="info">
            <h3>Tính năng</h3>
            <ul>
                <li>8 preset màu chuyên nghiệp (Vintage, Cool, Warm, B&W, v.v.)</li>
                <li>Đo lường hiệu suất chi tiết (thời gian xử lý, throughput)</li>
                <li>Lịch sử benchmark với export CSV</li>
                <li>Giao diện responsive, dễ sử dụng</li>
                <li>So sánh trực quan giữa JS và WASM</li>
            </ul>
        </div>
    </div>
</body>
</html>
    `);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">Go back home</a>
    `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 Server started successfully!\n');
    console.log('📍 Access the application at:');
    console.log(`   Local:    http://localhost:${PORT}`);
    
    // Get all network interfaces
    const interfaces = os.networkInterfaces();
    Object.keys(interfaces).forEach(name => {
        interfaces[name].forEach(net => {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`   Network:  http://${net.address}:${PORT}`);
            }
        });
    });
    
    console.log('\n📂 Available routes:');
    console.log(`   /          - Home page`);
    console.log(`   /js        - JavaScript version`);
    console.log(`   /wasm      - WebAssembly version`);
    console.log(`   /health    - Health check`);
    console.log('\n⚠️  Note: WASM version requires building first:');
    console.log('   npm run build-wasm\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
