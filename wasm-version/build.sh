#!/bin/bash

# Build script for WebAssembly image filter module
# Requires Emscripten SDK to be installed and activated

echo "Building WebAssembly module..."

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    echo "Error: emcc not found. Please install and activate Emscripten SDK."
    echo "Visit: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

# Compile C code to WebAssembly
emcc filters.c -o filters.js \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_applyPreset", "_applyPresetOptimized", "_malloc", "_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "getValue", "setValue", "HEAPU8", "HEAP8", "HEAPF32"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MAXIMUM_MEMORY=2GB \
  -s INITIAL_MEMORY=64MB \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="createModule" \
  -s ENVIRONMENT='web' \
  -O3 \
  -flto

if [ $? -eq 0 ]; then
    echo "✓ Build successful!"
    echo "  Generated files:"
    echo "    - filters.js"
    echo "    - filters.wasm"
    ls -lh filters.js filters.wasm 2>/dev/null
else
    echo "✗ Build failed!"
    exit 1
fi
