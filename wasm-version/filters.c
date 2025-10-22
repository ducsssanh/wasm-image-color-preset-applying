#include <emscripten.h>
#include <math.h>
#include <stdint.h>

/**
 * Clamp value between 0 and 255
 */
static inline uint8_t clamp(float value) {
    if (value < 0.0f) return 0;
    if (value > 255.0f) return 255;
    return (uint8_t)value;
}

/**
 * Apply color matrix transformation
 */
static inline void apply_matrix(float* r, float* g, float* b, float* matrix) {
    float newR = (*r) * matrix[0] + (*g) * matrix[1] + (*b) * matrix[2];
    float newG = (*r) * matrix[3] + (*g) * matrix[4] + (*b) * matrix[5];
    float newB = (*r) * matrix[6] + (*g) * matrix[7] + (*b) * matrix[8];
    
    *r = newR;
    *g = newG;
    *b = newB;
}

/**
 * Apply saturation adjustment
 */
static inline void apply_saturation(float* r, float* g, float* b, float saturation) {
    // ITU-R BT.709 coefficients for luminance
    float gray = 0.2126f * (*r) + 0.7152f * (*g) + 0.0722f * (*b);
    
    *r = gray + saturation * ((*r) - gray);
    *g = gray + saturation * ((*g) - gray);
    *b = gray + saturation * ((*b) - gray);
}

/**
 * Apply contrast adjustment
 */
static inline void apply_contrast(float* r, float* g, float* b, float contrast) {
    *r = (((*r) / 255.0f - 0.5f) * contrast + 0.5f) * 255.0f;
    *g = (((*g) / 255.0f - 0.5f) * contrast + 0.5f) * 255.0f;
    *b = (((*b) / 255.0f - 0.5f) * contrast + 0.5f) * 255.0f;
}

/**
 * Apply brightness adjustment
 */
static inline void apply_brightness(float* r, float* g, float* b, float brightness) {
    *r *= brightness;
    *g *= brightness;
    *b *= brightness;
}

/**
 * Apply gamma correction
 */
static inline void apply_gamma(float* r, float* g, float* b, float gamma) {
    *r = powf((*r) / 255.0f, gamma) * 255.0f;
    *g = powf((*g) / 255.0f, gamma) * 255.0f;
    *b = powf((*b) / 255.0f, gamma) * 255.0f;
}

/**
 * Main filter function - applies preset to image data
 * 
 * @param pixels - Pointer to RGBA pixel data
 * @param width - Image width
 * @param height - Image height
 * @param matrix - 9-element color transformation matrix
 * @param saturation - Saturation multiplier
 * @param contrast - Contrast multiplier
 * @param brightness - Brightness multiplier
 * @param gamma - Gamma correction value
 */
EMSCRIPTEN_KEEPALIVE
void applyPreset(uint8_t* pixels, int width, int height,
                 float* matrix, float saturation, float contrast,
                 float brightness, float gamma) {
    int totalPixels = width * height;
    
    // Process each pixel
    for (int i = 0; i < totalPixels; i++) {
        int idx = i * 4;
        
        // Read RGB values (skip alpha)
        float r = (float)pixels[idx];
        float g = (float)pixels[idx + 1];
        float b = (float)pixels[idx + 2];
        
        // Apply transformations in order
        apply_matrix(&r, &g, &b, matrix);
        apply_brightness(&r, &g, &b, brightness);
        apply_saturation(&r, &g, &b, saturation);
        apply_contrast(&r, &g, &b, contrast);
        apply_gamma(&r, &g, &b, gamma);
        
        // Write back clamped values
        pixels[idx] = clamp(r);
        pixels[idx + 1] = clamp(g);
        pixels[idx + 2] = clamp(b);
        // Alpha channel (idx + 3) remains unchanged
    }
}

/**
 * Optimized version using loop unrolling for better performance
 */
EMSCRIPTEN_KEEPALIVE
void applyPresetOptimized(uint8_t* pixels, int width, int height,
                          float* matrix, float saturation, float contrast,
                          float brightness, float gamma) {
    int totalPixels = width * height;
    int remainder = totalPixels % 4;
    int limit = totalPixels - remainder;
    
    // Process 4 pixels at a time (loop unrolling)
    for (int i = 0; i < limit; i += 4) {
        for (int j = 0; j < 4; j++) {
            int idx = (i + j) * 4;
            
            float r = (float)pixels[idx];
            float g = (float)pixels[idx + 1];
            float b = (float)pixels[idx + 2];
            
            apply_matrix(&r, &g, &b, matrix);
            apply_brightness(&r, &g, &b, brightness);
            apply_saturation(&r, &g, &b, saturation);
            apply_contrast(&r, &g, &b, contrast);
            apply_gamma(&r, &g, &b, gamma);
            
            pixels[idx] = clamp(r);
            pixels[idx + 1] = clamp(g);
            pixels[idx + 2] = clamp(b);
        }
    }
    
    // Process remaining pixels
    for (int i = limit; i < totalPixels; i++) {
        int idx = i * 4;
        
        float r = (float)pixels[idx];
        float g = (float)pixels[idx + 1];
        float b = (float)pixels[idx + 2];
        
        apply_matrix(&r, &g, &b, matrix);
        apply_brightness(&r, &g, &b, brightness);
        apply_saturation(&r, &g, &b, saturation);
        apply_contrast(&r, &g, &b, contrast);
        apply_gamma(&r, &g, &b, gamma);
        
        pixels[idx] = clamp(r);
        pixels[idx + 1] = clamp(g);
        pixels[idx + 2] = clamp(b);
    }
}
