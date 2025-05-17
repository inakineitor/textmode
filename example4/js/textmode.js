const CHARACTER_WIDTH = 16;
const CHARACTER_HEIGHT = 24;

// Renderer Interface (conceptual)
// interface IRenderer {
//   initialize(): Promise<void>;
//   presentToScreen(charBuffer: Uint8Array, colourBuffer: Uint8Array): void;
//   characterWidth: number;
//   characterHeight: number;
// }

class Canvas2DRenderer {
  #COLOR_TABLE = [
    "#000000", "#0000AA", "#00AA00", "#00AAAA",
    "#AA0000", "#AA00AA", "#AA5500", "#AAAAAA",
    "#555555", "#5555FF", "#55FF55", "#55FFFF",
    "#FF5555", "#FF55FF", "#FFFF55", "#FFFFFF",
  ];

  constructor(canvas, sourceFont, charsWide, charsHigh) {
    if (!canvas) {
      alert("Failed to find canvas");
      throw new Error("Canvas not provided to Canvas2DRenderer");
    }
    this.context2d = canvas.getContext("2d");
    if (!this.context2d) {
      alert("Couldn't get 2d context on canvas");
      throw new Error("Failed to get 2D context");
    }

    this.charsWide = charsWide;
    this.charsHigh = charsHigh;
    this.characterWidth = CHARACTER_WIDTH;
    this.characterHeight = CHARACTER_HEIGHT;

    // Create foreground font colours
    this.coloredFonts = new Array(this.#COLOR_TABLE.length);
    for (let i = 0; i < this.coloredFonts.length; i++) {
      this.coloredFonts[i] = document.createElement("canvas");
      this.coloredFonts[i].width = sourceFont.width;
      this.coloredFonts[i].height = sourceFont.height;
      const bufferContext = this.coloredFonts[i].getContext("2d");
      if (!bufferContext) {
        console.error("Failed to get 2D context for colored font buffer");
        continue;
      }
      bufferContext.fillStyle = this.#COLOR_TABLE[i];
      bufferContext.fillRect(0, 0, sourceFont.width, sourceFont.height);
      bufferContext.globalCompositeOperation = "destination-atop";
      bufferContext.drawImage(sourceFont, 0, 0);
    }
  }

  async initialize() {
    // No async initialization needed for 2D canvas renderer
    return Promise.resolve();
  }

  presentToScreen(charBuffer, colourBuffer) {
    if (!this.context2d) return;

    for (
      let readPosition = 0;
      readPosition < this.charsWide * this.charsHigh;
      readPosition++
    ) {
      const x = readPosition % this.charsWide;
      const y = Math.floor(readPosition / this.charsWide);

      const startY = y * this.characterHeight;
      const startX = x * this.characterWidth;

      const charId = charBuffer[readPosition];
      const colorId = colourBuffer[readPosition];

      const characterSpriteX = (charId & 0x0f) * this.characterWidth;
      const characterSpriteY = (charId >> 4) * this.characterHeight;

      // Background color
      this.context2d.fillStyle = this.#COLOR_TABLE[colorId >> 4];
      this.context2d.fillRect(
        startX,
        startY,
        this.characterWidth,
        this.characterHeight,
      );
      // Foreground character
      if (this.coloredFonts[colorId & 15]) {
      this.context2d.drawImage(
        this.coloredFonts[colorId & 15],
        characterSpriteX,
        characterSpriteY,
          this.characterWidth,
          this.characterHeight,
        startX,
        startY,
          this.characterWidth,
          this.characterHeight,
        );
      }
    }
  }
}

class WebGPURenderer {
  // HDR color palette (colors can exceed 1.0)
  // Format: [R, G, B, A]
  #HDR_COLOR_PALETTE = [
    [0.0, 0.0, 0.0, 1.0],     // 0: Black
    [0.0, 0.0, 1.4, 1.0],     // 1: Blue
    [0.0, 1.4, 0.0, 1.0],     // 2: Green
    [0.0, 1.4, 1.4, 1.0],     // 3: Cyan
    [1.4, 0.0, 0.0, 1.0],     // 4: Red
    [1.4, 0.0, 1.4, 1.0],     // 5: Magenta
    [1.4, 0.7, 0.0, 1.0],     // 6: Brown
    [1.4, 1.4, 1.4, 1.0],     // 7: Light Gray
    [0.7, 0.7, 0.7, 1.0],     // 8: Dark Gray
    // Super Bright Colors for animations
    [0.5, 0.5, 5.0, 1.0],     // 9: Super Bright Blue
    [0.5, 5.0, 0.5, 1.0],     // 10: Super Bright Green
    [0.5, 5.0, 5.0, 1.0],     // 11: Super Bright Cyan
    [5.0, 0.5, 0.5, 1.0],     // 12: Super Bright Red
    [5.0, 0.5, 5.0, 1.0],     // 13: Super Bright Magenta
    [5.0, 5.0, 0.5, 1.0],     // 14: Super Bright Yellow
    // Standard White
    [2.0, 2.0, 2.0, 1.0],     // 15: Standard White
  ];

  constructor(canvas, sourceFont, charsWide, charsHigh) {
    this.canvas = canvas;
    this.sourceFont = sourceFont;
    this.charsWide = charsWide;
    this.charsHigh = charsHigh;
    this.characterWidth = CHARACTER_WIDTH;
    this.characterHeight = CHARACTER_HEIGHT;

    this.device = null;
    this.context = null;
    this.pipeline = null;
    this.fontTexture = null;
    this.fontSampler = null;
    this.quadVertexBuffer = null;
    this.instanceDataBuffer = null;
    this.numInstances = 0;
    this.hdrTexture = null;
    this.toneMapPipeline = null;
    this.toneMapBindGroup = null;
    this.displayFormat = 'bgra8unorm';
  }

  async initialize() {
    if (!navigator.gpu) {
      alert("WebGPU not supported on this browser.");
      throw new Error("WebGPU not supported");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      alert("Failed to get GPU adapter.");
      throw new Error("No GPU adapter found");
    }

    this.device = await adapter.requestDevice();
    if(!this.device){
        alert("Failed to get GPU device.");
        throw new Error("No GPU device found");
    }

    this.context = this.canvas.getContext("webgpu");
    if(!this.context){
        alert("Failed to get WebGPU context from canvas.");
        throw new Error("No WebGPU context");
    }
    
    this.displayFormat = navigator.gpu.getPreferredCanvasFormat(); 

    this.context.configure({
      device: this.device,
      format: this.displayFormat, // Use preferred format directly
      alphaMode: "opaque", 
    });

    // Create HDR texture for offscreen rendering
    this.hdrTexture = this.device.createTexture({
        label: "HDR Scene Texture",
        size: [this.canvas.width, this.canvas.height, 1],
        format: 'rgba16float',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    // Load font.png into GPUTexture
    if (!this.sourceFont || !this.sourceFont.complete || this.sourceFont.naturalWidth === 0) {
        alert("Source font image is not loaded correctly.");
        throw new Error("Invalid source font image for WebGPURenderer.");
    }
    const imageBitmap = await createImageBitmap(this.sourceFont);
    this.fontTexture = this.device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm', // Font atlas is standard sRGB
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: this.fontTexture },
      [imageBitmap.width, imageBitmap.height]
    );

    // Create sampler for the font texture
    this.fontSampler = this.device.createSampler({
      magFilter: 'nearest',
      minFilter: 'nearest',
    });

    // Create a vertex buffer for a single quad (2 triangles)
    // x, y positions for 6 vertices. The quad spans [0,0] to [1,1] in local space.
    // The vertex shader will scale and position this based on character cell.
    const quadVertices = new Float32Array([
      // Triangle 1
      0.0, 0.0, // Top-left
      1.0, 0.0, // Top-right
      0.0, 1.0, // Bottom-left
      // Triangle 2
      0.0, 1.0, // Bottom-left
      1.0, 0.0, // Top-right
      1.0, 1.0, // Bottom-right
    ]);
    this.quadVertexBuffer = this.device.createBuffer({
      label: 'Quad Vertex Buffer',
      size: quadVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.quadVertexBuffer.getMappedRange()).set(quadVertices);
    this.quadVertexBuffer.unmap();

    // Create instance data buffer
    this.numInstances = this.charsWide * this.charsHigh;
    // Instance data: charId (u32), gridX (f32), gridY (f32), fgColor (4xf32), bgColor (4xf32)
    // charId (4 bytes) + gridPos (2 * 4 = 8 bytes) + fgColor (4 * 4 = 16 bytes) + bgColor (4 * 4 = 16 bytes) = 44 bytes per instance
    const instanceDataStride = 4 + (2 * 4) + (4 * 4) + (4 * 4); 
    this.instanceDataBuffer = this.device.createBuffer({
      label: 'Instance Data Buffer',
      size: this.numInstances * instanceDataStride,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Shader Modules (WGSL)
    const mainRenderShaderModule = this.device.createShaderModule({
      label: 'Text Rendering Shader',
      code: `
        struct VertexInput {
          @location(0) quadPos: vec2<f32>,
          @location(1) charId: u32,
          @location(2) gridPos: vec2<f32>,
          @location(3) fgColor: vec4<f32>,
          @location(4) bgColor: vec4<f32>,
        };

        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) texCoord: vec2<f32>,
          @location(1) fgColor: vec4<f32>,
          @location(2) bgColor: vec4<f32>,
        };

        @group(0) @binding(0) var<uniform> screenDimensions: vec2<f32>; // canvas width, height in pixels
        @group(0) @binding(1) var<uniform> characterPixelSize: vec2<f32>; // e.g., 16, 24
        @group(0) @binding(2) var<uniform> fontAtlasTextureSize: vec2<f32>; // font texture width, height in pixels

        @vertex
        fn vs_main(input: VertexInput) -> VertexOutput {
          var output: VertexOutput;

          // Calculate texture coordinates for the font atlas
          // Robustly calculate atlas column and row based on texture and character sizes
          let numAtlasCols: u32 = u32(fontAtlasTextureSize.x / characterPixelSize.x);
          let atlasCol: u32 = input.charId % numAtlasCols;
          let atlasRow: u32 = input.charId / numAtlasCols;

          let charSpriteX = f32(atlasCol) * characterPixelSize.x;
          let charSpriteY = f32(atlasRow) * characterPixelSize.y;
          
          let uvTopLeft = vec2<f32>(
            charSpriteX / fontAtlasTextureSize.x,
            charSpriteY / fontAtlasTextureSize.y
          );
          let uvBottomRight = vec2<f32>(
            (charSpriteX + characterPixelSize.x) / fontAtlasTextureSize.x,
            (charSpriteY + characterPixelSize.y) / fontAtlasTextureSize.y
          );
          output.texCoord = mix(uvTopLeft, uvBottomRight, input.quadPos); // quadPos is 0..1

          // Calculate screen position of the quad in pixels
          let pixelPos = input.gridPos * characterPixelSize + input.quadPos * characterPixelSize;
          
          // Convert pixel position to Normalized Device Coordinates (NDC)
          let ndcPos = (pixelPos / screenDimensions) * 2.0 - 1.0;
          output.position = vec4<f32>(ndcPos.x, -ndcPos.y, 0.0, 1.0); // Flip Y for WebGPU NDC

          output.fgColor = input.fgColor;
          output.bgColor = input.bgColor;
          return output;
        }

        @group(1) @binding(0) var fontSampler: sampler;
        @group(1) @binding(1) var fontTexture: texture_2d<f32>;

        @fragment
        fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
          let fontSample = textureSample(fontTexture, fontSampler, input.texCoord);
          let finalColor = mix(input.bgColor.rgb, input.fgColor.rgb, fontSample.a);
          let finalAlpha = mix(input.bgColor.a, input.fgColor.a, fontSample.a);
          return vec4<f32>(finalColor * finalAlpha, finalAlpha);
        }
      `,
    });

    // Create Render Pipeline (for main scene)
    this.pipeline = this.device.createRenderPipeline({
      label: 'Text Rendering Pipeline',
      layout: 'auto', 
      vertex: {
        module: mainRenderShaderModule,
        entryPoint: 'vs_main',
        buffers: [
          { // Quad vertex buffer (input.quadPos)
            arrayStride: 2 * 4, // 2 floats, 4 bytes each
            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
          },
          { // Instance data buffer
            arrayStride: instanceDataStride, 
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 1, offset: 0, format: 'uint32' },    // charId
              { shaderLocation: 2, offset: 4, format: 'float32x2' }, // gridPos (x, y)
              { shaderLocation: 3, offset: 4 + 8, format: 'float32x4' }, // fgColor
              { shaderLocation: 4, offset: 4 + 8 + 16, format: 'float32x4' }, // bgColor
            ],
          },
        ],
      },
      fragment: {
        module: mainRenderShaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: 'rgba16float' }], // Render to HDR texture
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
    
    // Create bind groups for uniforms, texture, sampler
    // Group 0: Uniforms
    this.uniformBufferScreen = this.device.createBuffer({
        size: 2 * 4, // vec2<f32> for screenDimensions
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.uniformBufferCharSize = this.device.createBuffer({
        size: 2 * 4, // vec2<f32> for characterPixelSize
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.uniformBufferFontAtlasSize = this.device.createBuffer({
        size: 2 * 4, // vec2<f32> for fontAtlasTextureSize
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(this.uniformBufferScreen, 0, new Float32Array([this.canvas.width, this.canvas.height]));
    this.device.queue.writeBuffer(this.uniformBufferCharSize, 0, new Float32Array([this.characterWidth, this.characterHeight]));
    this.device.queue.writeBuffer(this.uniformBufferFontAtlasSize, 0, new Float32Array([this.fontTexture.width, this.fontTexture.height]));

    this.bindGroup0 = this.device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: this.uniformBufferScreen } },
            { binding: 1, resource: { buffer: this.uniformBufferCharSize } },
            { binding: 2, resource: { buffer: this.uniformBufferFontAtlasSize } },
        ],
    });

    // Group 1: Font Texture & Sampler
    this.bindGroup1 = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(1),
      entries: [
        { binding: 0, resource: this.fontSampler },
        { binding: 1, resource: this.fontTexture.createView() },
      ],
    });

    // --- Tone Mapping Setup ---
    const toneMapShaderModule = this.device.createShaderModule({
        label: 'Tone Mapping Shader',
        code: `
            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) texCoord: vec2<f32>,
            };

            @vertex
            fn vs_fullscreen_triangle(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
                var output: VertexOutput;
                // Generates a large triangle that covers the screen:
                // Vertices in NDC: (-1,-1), (3,-1), (-1,3)
                let positions = array<vec2<f32>, 3>(
                    vec2<f32>(-1.0, -1.0),
                    vec2<f32>( 3.0, -1.0),
                    vec2<f32>(-1.0,  3.0)
                );
                output.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
                // Calculate UVs to cover the texture [0,0] to [1,1]
                // map NDC to UV [0,1] range.
                let uv = positions[vertexIndex] * 0.5 + 0.5;
                // Flip the Y-coordinate for texture sampling, as textures often have (0,0) at top-left.
                output.texCoord = vec2<f32>(uv.x, 1.0 - uv.y);
                return output;
            }

            @group(0) @binding(0) var hdrSampler: sampler;
            @group(0) @binding(1) var hdrTexture: texture_2d<f32>;

            // Simple Reinhard tone mapping (temporary for testing contrast)
            fn reinhardToneMap(color: vec3<f32>) -> vec3<f32> {
                return color / (color + vec3<f32>(1.0));
            }

            // Exposure control - kept from previous adjustment
            const exposure: f32 = 2.5;

            @fragment
            fn fs_tone_map(input: VertexOutput) -> @location(0) vec4<f32> {
                var hdrColor = textureSample(hdrTexture, hdrSampler, input.texCoord).rgb;
                hdrColor *= exposure;
                // Using Reinhard for now
                let ldrColor = reinhardToneMap(hdrColor);
                // Re-adding manual gamma correction, assuming preferredFormat is often not sRGB.
                let gammaCorrected = pow(ldrColor, vec3<f32>(1.0/2.2));
                return vec4<f32>(gammaCorrected, 1.0);
            }
        `,
    });

    this.toneMapPipeline = this.device.createRenderPipeline({
        label: "Tone Mapping Pipeline",
        layout: 'auto',
        vertex: {
            module: toneMapShaderModule,
            entryPoint: 'vs_fullscreen_triangle', // Changed entry point
        },
        fragment: {
            module: toneMapShaderModule,
            entryPoint: 'fs_tone_map',
            targets: [{ format: this.displayFormat }], // Output to canvas display format
        },
        primitive: {
            topology: 'triangle-list', // Draw 3 vertices for a fullscreen triangle, or 6 for two triangles
        },
    });

    this.toneMapBindGroup = this.device.createBindGroup({
        label: "Tone Map Bind Group",
        layout: this.toneMapPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: this.device.createSampler({magFilter: 'linear', minFilter: 'linear'}) }, // Use linear for HDR texture
            { binding: 1, resource: this.hdrTexture.createView() },
        ],
    });

    console.log("WebGPURenderer fully initialized with pipeline, bind groups, and tone mapping setup.");
    return Promise.resolve();
  }

  presentToScreen(charBuffer, colourBuffer) {
    if (!this.device || !this.context || !this.pipeline || !this.toneMapPipeline) {
      console.warn("WebGPURenderer not fully initialized or present called too early.");
      return;
    }
    const instanceDataStride = 4 + (2 * 4) + (4 * 4) + (4 * 4); // 44 bytes
    const instanceDataArray = new ArrayBuffer(this.numInstances * instanceDataStride);
    const instanceDataView = new DataView(instanceDataArray);

    for (let i = 0; i < this.numInstances; i++) {
      const charId = charBuffer[i];
      const colorId = colourBuffer[i];
      
      const gridX = i % this.charsWide;
      const gridY = Math.floor(i / this.charsWide);

      const fgPaletteIndex = colorId & 0x0F;
      const bgPaletteIndex = (colorId >> 4) & 0x0F;

      const fgColor = this.#HDR_COLOR_PALETTE[fgPaletteIndex];
      const bgColor = this.#HDR_COLOR_PALETTE[bgPaletteIndex];

      let offset = i * instanceDataStride;
      instanceDataView.setUint32(offset, charId, true); offset += 4;
      instanceDataView.setFloat32(offset, gridX, true); offset += 4;
      instanceDataView.setFloat32(offset, gridY, true); offset += 4;
      for(let c = 0; c < 4; c++) { instanceDataView.setFloat32(offset + c * 4, fgColor[c], true); } offset += 16;
      for(let c = 0; c < 4; c++) { instanceDataView.setFloat32(offset + c * 4, bgColor[c], true); } 
    }
    this.device.queue.writeBuffer(this.instanceDataBuffer, 0, instanceDataArray);

    // 1. Main Render Pass (to HDR texture)
    const commandEncoder = this.device.createCommandEncoder();
    const hdrTextureView = this.hdrTexture.createView();
    
    const mainRenderPassDescriptor = {
      colorAttachments: [
        {
          view: hdrTextureView, // Render to our HDR texture
          clearValue: { r: 0.01, g: 0.01, b: 0.02, a: 1.0 }, // Dark clear for HDR
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };
    
    const mainPassEncoder = commandEncoder.beginRenderPass(mainRenderPassDescriptor);
    mainPassEncoder.setPipeline(this.pipeline);
    mainPassEncoder.setVertexBuffer(0, this.quadVertexBuffer);
    mainPassEncoder.setVertexBuffer(1, this.instanceDataBuffer);
    mainPassEncoder.setBindGroup(0, this.bindGroup0);
    mainPassEncoder.setBindGroup(1, this.bindGroup1);
    mainPassEncoder.draw(6, this.numInstances, 0, 0);
    mainPassEncoder.end();

    // 2. Tone Mapping Pass (to canvas)
    const canvasTextureView = this.context.getCurrentTexture().createView();
    const toneMapPassDescriptor = {
        colorAttachments: [
            {
                view: canvasTextureView, // Render to the canvas's current texture
                loadOp: 'clear', // Clear canvas before drawing tonemapped result (or 'load' if overdrawing)
                clearValue: {r: 0, g: 0, b: 0, a: 1}, // Not strictly needed if always overdrawn by quad
                storeOp: 'store',
            },
        ],
    };
    const toneMapPassEncoder = commandEncoder.beginRenderPass(toneMapPassDescriptor);
    toneMapPassEncoder.setPipeline(this.toneMapPipeline);
    toneMapPassEncoder.setBindGroup(0, this.toneMapBindGroup);
    toneMapPassEncoder.draw(3, 1, 0, 0); // Draw a single fullscreen triangle

    toneMapPassEncoder.end();
    
    this.device.queue.submit([commandEncoder.finish()]);
  }
}

class TextModeScreen {
  constructor(charsWide, charsHigh) {
    this.charsWide = charsWide;
    this.charsHigh = charsHigh;
    this.charBuffer = new Uint8Array(charsWide * charsHigh);
    this.colourBuffer = new Uint8Array(charsWide * charsHigh);
    this.renderer = null; // Will be set by init
  }

  async init(canvas, sourceFont, rendererType = "2d") {
    if (!canvas) {
      alert("Canvas element not provided to TextModeScreen init.");
      throw new Error("Canvas not provided for TextModeScreen initialization.");
    }
    if (!sourceFont && (rendererType === "2d" || rendererType === "webgpu")) { // sourceFont needed for both current renderers
        alert("sourceFont not provided to TextModeScreen init.");
        throw new Error("sourceFont not provided for TextModeScreen initialization.");
    }

    // Set canvas physical dimensions
    canvas.width = this.charsWide * CHARACTER_WIDTH;
    canvas.height = this.charsHigh * CHARACTER_HEIGHT;

    if (rendererType === "webgpu") {
      this.renderer = new WebGPURenderer(canvas, sourceFont, this.charsWide, this.charsHigh);
    } else if (rendererType === "2d") {
      this.renderer = new Canvas2DRenderer(canvas, sourceFont, this.charsWide, this.charsHigh);
    } else {
      alert(`Unknown renderer type: ${rendererType}`);
      throw new Error(`Unknown renderer type: ${rendererType}`);
    }

    await this.renderer.initialize();
    return this;
  }

  presentToScreen() {
    if (this.renderer) {
      this.renderer.presentToScreen(this.charBuffer, this.colourBuffer);
    } else {
      console.warn("TextModeScreen renderer not initialized before calling presentToScreen.");
    }
  }

  /**
   * Print a string
   */
  print(x, y, text, color) {
    if (y < 0 || y >= this.charsHigh) return;

    for (let i = 0; i < text.length; i++) {
      if (x + i < 0 || this.charsWide <= x + i) continue;

      const writePosition = (x + i) + y * this.charsWide;
      if (writePosition >= 0 && writePosition < this.charBuffer.length) {
      this.charBuffer[writePosition] = text.charCodeAt(i);
      this.colourBuffer[writePosition] = color;
      }
    }
  }

  /**
   * Print an outlined box
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number} color - Color
   */
  printBox(x, y, width, height, color) {
    const topLeft = String.fromCharCode(201);
    const top = String.fromCharCode(205);
    const topRight = String.fromCharCode(187);
    const left = String.fromCharCode(186);
    const right = String.fromCharCode(186);
    const bottomLeft = String.fromCharCode(200);
    const bottom = String.fromCharCode(205);
    const bottomRight = String.fromCharCode(188);

    const innerWidth = Math.max(0, width - 2); // Ensure non-negative

    this.print(
      x,
      y,
      `${topLeft}${top.repeat(innerWidth)}${topRight}`,
      color,
    );
    for (let j = 1; j < height - 1; j++) { // Iterate from 1 up to height-2 for sides
      this.print(
        x,
        y + j,
        `${left}${" ".repeat(innerWidth)}${right}`,
        color,
      );
    }
    if (height > 1) { // Only print bottom if height > 1
    this.print(
      x,
      y + height - 1,
          `${bottomLeft}${bottom.repeat(innerWidth)}${bottomRight}`,
      color,
    );
    } else if (height === 1) { // If height is 1, top and bottom are the same line
        // Already printed by the first print call if width > 0
        // If width is 1, it's just topLeft/bottomLeft etc. which is fine.
        // If width is 2, topLeft+topRight.
        // This case is mostly handled by the initial print.
        // Smallest box: 1x1 is just one char. 2x1 is two chars.
        // A 1x1 box would be just the topLeft char if we followed strict box logic.
        // Current printBox is more like "print line with corners".
        // For a 1x1 box: topLeft+""+topRight if innerWidth is 0.
        // This might need more thought if strict 1x1 or 1xW boxes are needed.
        // For now, let's assume width/height >= 2 for full box.
        // If height is 1, the initial print covers it.
    }
  }

  /**
   * Process a group of characters with a user defined function
   */
  processBox(x, y, w, h, func) {
    for (let sy_offset = 0; sy_offset < h; sy_offset++) {
      const currentY = y + sy_offset;
      if (currentY < 0 || this.charsHigh <= currentY) continue;

      for (let sx_offset = 0; sx_offset < w; sx_offset++) {
        const currentX = x + sx_offset;
        const readWritePos = currentX + currentY * this.charsWide;

        if (currentX < 0 || this.charsWide <= currentX) continue;
        if (readWritePos < 0 || readWritePos >= this.charBuffer.length) continue;


        const charId = this.charBuffer[readWritePos];
        const colorId = this.colourBuffer[readWritePos];
        const results = func(charId, colorId, currentX, currentY); // Pass coords too
        if (results) { // Allow func to return null/undefined to skip write
        this.charBuffer[readWritePos] = results[0];
        this.colourBuffer[readWritePos] = results[1];
        }
      }
    }
  }
}
