/**
 * Wrapper để expose WASM memory ra Module object
 * 
 * Emscripten-generated code giữ wasmMemory trong closure,
 * script này sẽ expose nó sau khi module được khởi tạo.
 */

(function() {
    console.log('Installing WASM memory wrapper...');
    
    // Store original createModule
    let originalCreateModule = null;
    
    // Poll for createModule to be defined
    const installWrapper = () => {
        if (typeof window.createModule === 'function') {
            console.log('✓ Found createModule, installing wrapper');
            originalCreateModule = window.createModule;
            
            // Override createModule
            window.createModule = async function(moduleConfig = {}) {
                console.log('Wrapped createModule called');
                
                // CRITICAL FIX: Intercept instantiateWasm to capture memory
                moduleConfig.instantiateWasm = function(imports, receiveInstance) {
                    console.log('instantiateWasm intercepted!');
                    
                    // Use WebAssembly.instantiateStreaming to load
                    WebAssembly.instantiateStreaming(fetch('filters.wasm'), imports)
                        .then(result => {
                            console.log('WASM instantiated, checking exports...');
                            const instance = result.instance;
                            const exports = instance.exports;
                            
                            // Log all exports to find memory
                            console.log('Export keys:', Object.keys(exports).join(', '));
                            
                            // Find memory in exports (usually "memory" or single-letter like "f")
                            let foundMemory = null;
                            for (const key in exports) {
                                if (exports[key] instanceof WebAssembly.Memory) {
                                    foundMemory = exports[key];
                                    console.log(`✓ Found memory in exports["${key}"]`);
                                    break;
                                }
                            }
                            
                            // Store in global scope for access in onRuntimeInitialized
                            window.__wasmMemoryInstance = foundMemory;
                            
                            // Call Emscripten's receiveInstance
                            receiveInstance(instance, result.module);
                        })
                        .catch(err => {
                            console.error('instantiateWasm failed:', err);
                        });
                    
                    return {}; // Emscripten expects empty object
                };
                
                // Wrap onRuntimeInitialized
                const originalOnRuntimeInit = moduleConfig.onRuntimeInitialized;
                
                moduleConfig.onRuntimeInitialized = function() {
                    console.log('onRuntimeInitialized wrapper executing...');
                    
                    // Call original callback first
                    if (originalOnRuntimeInit) {
                        originalOnRuntimeInit.call(this);
                    }
                    
                    // CRITICAL: Get memory from our global
                    if (window.__wasmMemoryInstance) {
                        this.wasmMemory = window.__wasmMemoryInstance;
                        this.memory = window.__wasmMemoryInstance;
                        console.log('✓ Exposed memory from intercepted instance');
                        
                        const buffer = this.wasmMemory.buffer;
                        
                        // Create HEAP arrays
                        this.HEAP8 = new Int8Array(buffer);
                        this.HEAPU8 = new Uint8Array(buffer);
                        this.HEAP16 = new Int16Array(buffer);
                        this.HEAPU16 = new Uint16Array(buffer);
                        this.HEAP32 = new Int32Array(buffer);
                        this.HEAPU32 = new Uint32Array(buffer);
                        this.HEAPF32 = new Float32Array(buffer);
                        this.HEAPF64 = new Float64Array(buffer);
                        
                        console.log(`✓ Created HEAP arrays, buffer size: ${buffer.byteLength} bytes`);
                        
                        // Cleanup
                        delete window.__wasmMemoryInstance;
                    } else {
                        console.error('✗ Memory not found in intercepted instance!');
                    }
                    
                    console.log('✓ Wrapper initialization complete');
                    console.log('Module has memory:', !!this.wasmMemory);
                    console.log('Module has HEAPU8:', !!this.HEAPU8);
                };
                
                // Call original createModule
                const module = await originalCreateModule(moduleConfig);
                
                console.log('Module created, keys:', Object.keys(module).slice(0, 30).join(', '));
                
                return module;
            };
            
            console.log('✓ Wrapper installed successfully');
        } else {
            // Retry after a short delay
            setTimeout(installWrapper, 10);
        }
    };
    
    // Start installation
    installWrapper();
})();

