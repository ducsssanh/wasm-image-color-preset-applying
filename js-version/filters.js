/**
 * ImageFilters - Pure JavaScript implementation for image processing
 * Optimized for performance comparison with WebAssembly
 */
class ImageFilters {
    constructor() {
        this.presets = null;
    }

    /**
     * Load presets from JSON file
     */
    async loadPresets() {
        try {
            const response = await fetch('/shared/presets.json');
            this.presets = await response.json();
            return this.presets;
        } catch (error) {
            console.error('Failed to load presets:', error);
            throw error;
        }
    }

    /**
     * Apply color matrix transformation to RGB values
     */
    applyMatrix(r, g, b, matrix) {
        const newR = r * matrix[0] + g * matrix[1] + b * matrix[2];
        const newG = r * matrix[3] + g * matrix[4] + b * matrix[5];
        const newB = r * matrix[6] + g * matrix[7] + b * matrix[8];
        return [newR, newG, newB];
    }

    /**
     * Apply saturation adjustment
     */
    applySaturation(r, g, b, saturation) {
        // Calculate luminance using ITU-R BT.709 coefficients
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const newR = gray + saturation * (r - gray);
        const newG = gray + saturation * (g - gray);
        const newB = gray + saturation * (b - gray);
        return [newR, newG, newB];
    }

    /**
     * Apply contrast adjustment
     */
    applyContrast(r, g, b, contrast) {
        const newR = ((r / 255.0 - 0.5) * contrast + 0.5) * 255.0;
        const newG = ((g / 255.0 - 0.5) * contrast + 0.5) * 255.0;
        const newB = ((b / 255.0 - 0.5) * contrast + 0.5) * 255.0;
        return [newR, newG, newB];
    }

    /**
     * Apply brightness adjustment
     */
    applyBrightness(r, g, b, brightness) {
        return [r * brightness, g * brightness, b * brightness];
    }

    /**
     * Apply gamma correction
     */
    applyGamma(r, g, b, gamma) {
        const newR = Math.pow(r / 255.0, gamma) * 255.0;
        const newG = Math.pow(g / 255.0, gamma) * 255.0;
        const newB = Math.pow(b / 255.0, gamma) * 255.0;
        return [newR, newG, newB];
    }

    /**
     * Clamp value between min and max
     */
    clamp(value, min = 0, max = 255) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Apply preset filter to image data
     * @param {ImageData} imageData - Canvas ImageData object
     * @param {string} presetName - Name of the preset to apply
     * @returns {number} - Processing time in milliseconds
     */
    applyPreset(imageData, presetName) {
        const startTime = performance.now();
        
        if (!this.presets || !this.presets[presetName]) {
            throw new Error(`Preset "${presetName}" not found`);
        }

        const preset = this.presets[presetName];
        const pixels = imageData.data;
        const length = pixels.length;

        // Process each pixel
        for (let i = 0; i < length; i += 4) {
            let r = pixels[i];
            let g = pixels[i + 1];
            let b = pixels[i + 2];
            // Alpha channel (pixels[i + 3]) is preserved

            // 1. Apply color matrix transformation
            [r, g, b] = this.applyMatrix(r, g, b, preset.matrix);

            // 2. Apply brightness
            [r, g, b] = this.applyBrightness(r, g, b, preset.brightness);

            // 3. Apply saturation
            [r, g, b] = this.applySaturation(r, g, b, preset.saturation);

            // 4. Apply contrast
            [r, g, b] = this.applyContrast(r, g, b, preset.contrast);

            // 5. Apply gamma correction
            [r, g, b] = this.applyGamma(r, g, b, preset.gamma);

            // 6. Clamp values and write back
            pixels[i] = this.clamp(r);
            pixels[i + 1] = this.clamp(g);
            pixels[i + 2] = this.clamp(b);
        }

        const endTime = performance.now();
        return endTime - startTime;
    }

    /**
     * Get list of available presets
     */
    getPresetNames() {
        return this.presets ? Object.keys(this.presets) : [];
    }

    /**
     * Get preset information
     */
    getPresetInfo(presetName) {
        return this.presets ? this.presets[presetName] : null;
    }
}

// Export for use in app.js
window.ImageFilters = ImageFilters;
