/**
 * Performance Metrics Tracker
 */
class PerformanceMetrics {
    constructor() {
        this.history = this.loadHistory();
    }

    loadHistory() {
        try {
            const stored = localStorage.getItem('benchmarkHistoryWasm');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem('benchmarkHistoryWasm', JSON.stringify(this.history));
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }

    add(metrics) {
        this.history.push({
            timestamp: new Date().toISOString(),
            ...metrics
        });
        this.saveHistory();
    }

    clear() {
        this.history = [];
        localStorage.removeItem('benchmarkHistoryWasm');
    }

    exportCSV() {
        if (this.history.length === 0) {
            alert('Không có dữ liệu để export!');
            return;
        }

        const headers = Object.keys(this.history[0]);
        const csv = [
            headers.join(','),
            ...this.history.map(row => 
                headers.map(h => {
                    const value = row[h];
                    return typeof value === 'string' && value.includes(',') 
                        ? `"${value.replace(/"/g, '""')}"` 
                        : value;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `benchmark-wasm-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

/**
 * WebAssembly Image Filter Wrapper
 */
class WasmImageFilters {
    constructor() {
        this.module = null;
        this.presets = null;
        this.ready = false;
    }

    async init() {
        try {
            // Load WASM module with custom onRuntimeInitialized hook
            const moduleConfig = {
                onRuntimeInitialized: () => {
                    console.log('WASM runtime initialized');
                }
            };
            
            this.module = await createModule(moduleConfig);
            
            console.log('WASM module loaded, searching for memory...');
            
            // CRITICAL: Wait for module to be fully ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Find memory buffer - comprehensive search
            let memoryBuffer = null;
            const keys = Object.keys(this.module);
            
            console.log('Module keys:', keys.join(', '));
            
            // Method 1-5: Try standard properties
            if (this.module.wasmMemory?.buffer) {
                memoryBuffer = this.module.wasmMemory.buffer;
                console.log('✓ Found via wasmMemory.buffer');
            } else if (this.module.memory?.buffer) {
                memoryBuffer = this.module.memory.buffer;
                console.log('✓ Found via memory.buffer');
            } else if (this.module.buffer instanceof ArrayBuffer) {
                memoryBuffer = this.module.buffer;
                console.log('✓ Found via buffer');
            } else if (this.module.HEAP8?.buffer) {
                memoryBuffer = this.module.HEAP8.buffer;
                console.log('✓ Found via HEAP8.buffer');
            } else {
                // Method 6: Search for WebAssembly.Memory in all properties
                for (const key of keys) {
                    const val = this.module[key];
                    if (val instanceof WebAssembly.Memory) {
                        memoryBuffer = val.buffer;
                        console.log(`✓ Found via ${key} (WebAssembly.Memory)`);
                        break;
                    }
                    // Also check if property has .buffer that's an ArrayBuffer
                    if (val?.buffer instanceof ArrayBuffer) {
                        memoryBuffer = val.buffer;
                        console.log(`✓ Found via ${key}.buffer`);
                        break;
                    }
                }
            }
            
            // Method 7: Try accessing internal wasmMemory (might be in closure)
            if (!memoryBuffer && typeof this.module.asm === 'object') {
                if (this.module.asm.memory?.buffer) {
                    memoryBuffer = this.module.asm.memory.buffer;
                    console.log('✓ Found via asm.memory.buffer');
                }
            }
            
            if (!memoryBuffer) {
                console.error('Available keys:', keys);
                console.error('Module object:', this.module);
                throw new Error('Cannot find WebAssembly memory buffer. Check console for details.');
            }
            
            // Create HEAP arrays from memory buffer
            this.module.HEAPU8 = new Uint8Array(memoryBuffer);
            this.module.HEAPF32 = new Float32Array(memoryBuffer);
            console.log(`✓ Created HEAPU8 with ${this.module.HEAPU8.length} bytes`);
            
            // Wrap WASM functions
            this.applyPresetFunc = this.module.cwrap(
                'applyPreset',
                null,
                ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']
            );
            
            this.applyPresetOptimizedFunc = this.module.cwrap(
                'applyPresetOptimized',
                null,
                ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']
            );
            
            // Load presets
            const response = await fetch('/shared/presets.json');
            this.presets = await response.json();
            
            this.ready = true;
            console.log('✓ WASM module initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize WASM:', error);
            throw error;
        }
    }

    /**
     * Apply preset filter using WebAssembly
     */
    applyPreset(imageData, presetName, useOptimized = true) {
        if (!this.ready) {
            throw new Error('WASM module not initialized');
        }

        if (!this.presets[presetName]) {
            throw new Error(`Preset "${presetName}" not found`);
        }

        const preset = this.presets[presetName];
        const width = imageData.width;
        const height = imageData.height;
        const pixels = imageData.data;

        const startTime = performance.now();

        // Allocate memory in WASM heap
        const pixelsPtr = this.module._malloc(pixels.length);
        const matrixPtr = this.module._malloc(preset.matrix.length * 4); // 4 bytes per float

        try {
            // Copy pixel data to WASM memory using direct indexing (most compatible)
            for (let i = 0; i < pixels.length; i++) {
                this.module.HEAPU8[pixelsPtr + i] = pixels[i];
            }

            // Copy matrix data to WASM memory
            for (let i = 0; i < preset.matrix.length; i++) {
                this.module.HEAPF32[(matrixPtr >> 2) + i] = preset.matrix[i];
            }

            // Call WASM function using cwrap
            const wasmFunc = useOptimized ? this.applyPresetOptimizedFunc : this.applyPresetFunc;
            wasmFunc(
                pixelsPtr,
                width,
                height,
                matrixPtr,
                preset.saturation,
                preset.contrast,
                preset.brightness,
                preset.gamma
            );

            // Copy processed data back from WASM memory using direct indexing
            for (let i = 0; i < pixels.length; i++) {
                pixels[i] = this.module.HEAPU8[pixelsPtr + i];
            }

        } finally {
            // Free allocated memory
            this.module._free(pixelsPtr);
            this.module._free(matrixPtr);
        }

        const endTime = performance.now();
        return endTime - startTime;
    }

    getPresetNames() {
        return this.presets ? Object.keys(this.presets) : [];
    }

    getPresetInfo(presetName) {
        return this.presets ? this.presets[presetName] : null;
    }
}

/**
 * Main Application
 */
class ImageFilterApp {
    constructor() {
        this.filters = new WasmImageFilters();
        this.metrics = new PerformanceMetrics();
        this.currentImage = null;
        this.originalCanvas = document.getElementById('originalCanvas');
        this.filteredCanvas = document.getElementById('filteredCanvas');
        this.originalCtx = this.originalCanvas.getContext('2d', { willReadFrequently: true });
        this.filteredCtx = this.filteredCanvas.getContext('2d', { willReadFrequently: true });
        
        this.init();
    }

    async init() {
        try {
            this.updateWasmStatus('loading', 'Đang tải WASM module...');
            
            // Initialize WASM module
            await this.filters.init();
            
            this.updateWasmStatus('ready', '✓ WASM module sẵn sàng');
            
            // Render preset buttons
            this.renderPresetButtons();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Render existing history
            this.renderHistory();
            
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.updateWasmStatus('error', '✗ Lỗi tải WASM module');
            alert('Không thể khởi tạo ứng dụng. Vui lòng kiểm tra console và tải lại trang.');
        }
    }

    updateWasmStatus(status, message) {
        const statusElement = document.getElementById('wasmStatusText');
        const statusContainer = document.getElementById('wasmStatus');
        
        statusElement.textContent = message;
        statusContainer.className = `wasm-status wasm-status-${status}`;
    }

    setupEventListeners() {
        document.getElementById('imageInput').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.metrics.exportCSV();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử?')) {
                this.metrics.clear();
                this.renderHistory();
            }
        });
    }

    renderPresetButtons() {
        const container = document.getElementById('presetSelector');
        const presetNames = this.filters.getPresetNames();
        
        container.innerHTML = '';
        presetNames.forEach(presetName => {
            const info = this.filters.getPresetInfo(presetName);
            const button = document.createElement('button');
            button.className = 'preset-btn';
            button.dataset.preset = presetName;
            button.innerHTML = `
                <span class="preset-name">${info.name}</span>
                <span class="preset-desc">${info.description}</span>
            `;
            button.addEventListener('click', () => this.applyPreset(presetName, button));
            container.appendChild(button);
        });
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.style.display = 'inline-block';

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.displayOriginalImage(img);
                loadingIndicator.style.display = 'none';
                
                this.filteredCtx.clearRect(0, 0, this.filteredCanvas.width, this.filteredCanvas.height);
                this.updateImageInfo();
                
                document.querySelectorAll('.preset-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
            };
            img.onerror = () => {
                loadingIndicator.style.display = 'none';
                alert('Không thể tải ảnh. Vui lòng chọn file ảnh hợp lệ.');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    displayOriginalImage(img) {
        // Use original image dimensions (no scaling)
        const width = img.width;
        const height = img.height;

        // Set canvas size to exact image dimensions
        this.originalCanvas.width = width;
        this.originalCanvas.height = height;
        this.filteredCanvas.width = width;
        this.filteredCanvas.height = height;

        // Draw image at original size (1:1 pixel mapping)
        this.originalCtx.drawImage(img, 0, 0, width, height);
        
        // Update info
        document.getElementById('originalInfo').textContent = `${width} × ${height}`;
    }

    applyPreset(presetName, button) {
        if (!this.currentImage) {
            alert('Vui lòng chọn ảnh trước!');
            return;
        }

        if (!this.filters.ready) {
            alert('WASM module chưa sẵn sàng. Vui lòng đợi...');
            return;
        }

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        const imageData = this.originalCtx.getImageData(
            0, 0, 
            this.originalCanvas.width, 
            this.originalCanvas.height
        );

        const processingTime = this.filters.applyPreset(imageData, presetName, true);

        this.filteredCtx.putImageData(imageData, 0, 0);
        
        const width = this.originalCanvas.width;
        const height = this.originalCanvas.height;
        const pixelCount = width * height;
        const throughput = Math.round(pixelCount / processingTime);

        document.getElementById('processingTime').textContent = processingTime.toFixed(2);
        document.getElementById('imageSize').textContent = `${width} × ${height}`;
        document.getElementById('pixelCount').textContent = pixelCount.toLocaleString();
        document.getElementById('throughput').textContent = throughput.toLocaleString();
        document.getElementById('filteredInfo').textContent = `${processingTime.toFixed(2)}ms`;

        const presetInfo = this.filters.getPresetInfo(presetName);
        this.metrics.add({
            preset: presetInfo.name,
            size: `${width}×${height}`,
            pixelCount: pixelCount,
            processingTime: processingTime.toFixed(2),
            throughput: throughput
        });

        this.renderHistory();
    }

    updateImageInfo() {
        const width = this.originalCanvas.width;
        const height = this.originalCanvas.height;
        const pixelCount = width * height;

        document.getElementById('imageSize').textContent = `${width} × ${height}`;
        document.getElementById('pixelCount').textContent = pixelCount.toLocaleString();
        document.getElementById('processingTime').textContent = '--';
        document.getElementById('throughput').textContent = '--';
    }

    renderHistory() {
        const tbody = document.querySelector('#statsTable tbody');
        
        if (this.metrics.history.length === 0) {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="5">Chưa có dữ liệu. Hãy chọn ảnh và áp dụng preset!</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        
        const reversedHistory = [...this.metrics.history].reverse();
        reversedHistory.forEach((entry, index) => {
            const row = document.createElement('tr');
            if (index === 0) row.classList.add('latest');
            
            const time = new Date(entry.timestamp);
            const timeStr = time.toLocaleTimeString('vi-VN');
            
            row.innerHTML = `
                <td>${timeStr}</td>
                <td><span class="preset-tag">${entry.preset}</span></td>
                <td>${entry.size}</td>
                <td><strong>${entry.processingTime}ms</strong></td>
                <td>${entry.throughput.toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ImageFilterApp();
});
