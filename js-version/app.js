/**
 * Performance Metrics Tracker
 */
class PerformanceMetrics {
    constructor() {
        this.history = this.loadHistory();
    }

    loadHistory() {
        try {
            const stored = localStorage.getItem('benchmarkHistory');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem('benchmarkHistory', JSON.stringify(this.history));
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
        localStorage.removeItem('benchmarkHistory');
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
                    // Escape commas and quotes in values
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
        a.download = `benchmark-js-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

/**
 * Main Application
 */
class ImageFilterApp {
    constructor() {
        this.filters = new ImageFilters();
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
            // Load presets
            await this.filters.loadPresets();
            this.renderPresetButtons();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Render existing history
            this.renderHistory();
            
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            alert('Không thể khởi tạo ứng dụng. Vui lòng tải lại trang.');
        }
    }

    setupEventListeners() {
        // File input
        document.getElementById('imageInput').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.metrics.exportCSV();
        });

        // Clear button
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
                
                // Clear filtered canvas
                this.filteredCtx.clearRect(0, 0, this.filteredCanvas.width, this.filteredCanvas.height);
                
                // Update metrics
                this.updateImageInfo();
                
                // Reset active preset
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

        // Update active state
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // Get image data
        const imageData = this.originalCtx.getImageData(
            0, 0, 
            this.originalCanvas.width, 
            this.originalCanvas.height
        );

        // Apply filter and measure performance
        const processingTime = this.filters.applyPreset(imageData, presetName);

        // Display filtered image
        this.filteredCtx.putImageData(imageData, 0, 0);
        
        // Update metrics
        const width = this.originalCanvas.width;
        const height = this.originalCanvas.height;
        const pixelCount = width * height;
        const throughput = Math.round(pixelCount / processingTime);

        document.getElementById('processingTime').textContent = processingTime.toFixed(2);
        document.getElementById('imageSize').textContent = `${width} × ${height}`;
        document.getElementById('pixelCount').textContent = pixelCount.toLocaleString();
        document.getElementById('throughput').textContent = throughput.toLocaleString();
        document.getElementById('filteredInfo').textContent = `${processingTime.toFixed(2)}ms`;

        // Add to history
        const presetInfo = this.filters.getPresetInfo(presetName);
        this.metrics.add({
            preset: presetInfo.name,
            size: `${width}×${height}`,
            pixelCount: pixelCount,
            processingTime: processingTime.toFixed(2),
            throughput: throughput
        });

        // Update history table
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
        
        // Show most recent first
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
