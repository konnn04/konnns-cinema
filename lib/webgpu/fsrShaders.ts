// WebGPU upscale/sharpen pipeline loosely modeled on AMD FSR 1.0 (EASU + RCAS).
//
// Honest disclosure: this is NOT a byte-exact port of AMD's published FSR
// EASU algorithm (that is a much longer 12-tap lobe-fitting routine). This
// implements the same *idea* -- detect local edge direction/strength and bias
// the resample toward it instead of plain bilinear -- in a compact form that's
// realistic to validate without a GPU-attached debugging session. RCAS (the
// sharpening pass) is a faithful, standard local-contrast-adaptive sharpen.
//
// Also deviates from a texture_external + importExternalTexture design:
// texture_external support inside *compute* shaders is inconsistent across
// browsers today, so frames are copied into a plain sampled texture via
// device.queue.copyExternalImageToTexture() instead, which is broadly
// supported and lets both passes use ordinary texture_2d<f32> bindings.

export const EASU_SHADER = /* wgsl */ `
struct Dimensions {
  srcSize: vec2<f32>,
  dstSize: vec2<f32>,
};

@group(0) @binding(0) var srcSampler: sampler;
@group(0) @binding(1) var srcTex: texture_2d<f32>;
@group(0) @binding(2) var outTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var<uniform> dims: Dimensions;

fn luma(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dst = vec2<u32>(gid.xy);
  if (f32(dst.x) >= dims.dstSize.x || f32(dst.y) >= dims.dstSize.y) {
    return;
  }

  let uv = (vec2<f32>(dst) + 0.5) / dims.dstSize;
  let texel = 1.0 / dims.srcSize;

  let c = textureSampleLevel(srcTex, srcSampler, uv, 0.0);
  let n = textureSampleLevel(srcTex, srcSampler, uv + vec2<f32>(0.0, -texel.y), 0.0);
  let s = textureSampleLevel(srcTex, srcSampler, uv + vec2<f32>(0.0, texel.y), 0.0);
  let e = textureSampleLevel(srcTex, srcSampler, uv + vec2<f32>(texel.x, 0.0), 0.0);
  let w = textureSampleLevel(srcTex, srcSampler, uv + vec2<f32>(-texel.x, 0.0), 0.0);

  let lc = luma(c.rgb);
  let ln = luma(n.rgb);
  let ls = luma(s.rgb);
  let le = luma(e.rgb);
  let lw = luma(w.rgb);

  let gx = abs(le - lw);
  let gy = abs(ln - ls);
  let edgeStrength = clamp((gx + gy) * 3.0, 0.0, 1.0);

  // Bias the resample toward whichever neighbor continues the local edge,
  // instead of blending all four (which is what smears edges under bilinear).
  var directional: vec3<f32>;
  if (gx > gy) {
    directional = mix(w.rgb, e.rgb, select(0.0, 1.0, le > lw));
  } else {
    directional = mix(n.rgb, s.rgb, select(0.0, 1.0, ls > ln));
  }
  directional = mix(c.rgb, directional, 0.5);

  let result = mix(c.rgb, directional, edgeStrength);
  textureStore(outTex, dst, vec4<f32>(result, c.a));
}
`;

export const RCAS_SHADER = /* wgsl */ `
struct Params {
  size: vec2<f32>,
  sharpness: f32,
  _pad: f32,
};

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var outTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let p = vec2<i32>(gid.xy);
  if (f32(p.x) >= params.size.x || f32(p.y) >= params.size.y) {
    return;
  }

  let c = textureLoad(srcTex, p, 0);
  let n = textureLoad(srcTex, clamp(p + vec2<i32>(0, -1), vec2<i32>(0), vec2<i32>(params.size) - 1), 0);
  let s = textureLoad(srcTex, clamp(p + vec2<i32>(0, 1), vec2<i32>(0), vec2<i32>(params.size) - 1), 0);
  let e = textureLoad(srcTex, clamp(p + vec2<i32>(1, 0), vec2<i32>(0), vec2<i32>(params.size) - 1), 0);
  let w = textureLoad(srcTex, clamp(p + vec2<i32>(-1, 0), vec2<i32>(0), vec2<i32>(params.size) - 1), 0);

  // Standard RCAS: sharpen proportional to how much the center pixel stands
  // out from its local min/max, so flat regions stay untouched and noisy
  // regions don't get over-amplified.
  let minRgb = min(min(min(n.rgb, s.rgb), min(e.rgb, w.rgb)), c.rgb);
  let maxRgb = max(max(max(n.rgb, s.rgb), max(e.rgb, w.rgb)), c.rgb);

  let hitMin = minRgb / max(vec3<f32>(4.0 * maxRgb), vec3<f32>(1e-4));
  let hitMax = (vec3<f32>(1.0) - maxRgb) / max(vec3<f32>(4.0 * (vec3<f32>(1.0) - minRgb)), vec3<f32>(1e-4));
  let lobe = max(-hitMin, -hitMax) * params.sharpness;

  let weighted = (n.rgb + s.rgb + e.rgb + w.rgb) * lobe.x + c.rgb;
  let normalizer = 1.0 + 4.0 * lobe.x;
  let sharpened = weighted / max(normalizer, 1e-4);

  textureStore(outTex, vec2<u32>(gid.xy), vec4<f32>(clamp(sharpened, vec3<f32>(0.0), vec3<f32>(1.0)), c.a));
}
`;

export const BLIT_SHADER = /* wgsl */ `
struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOut {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0),
  );
  var out: VertexOut;
  out.position = vec4<f32>(pos[idx], 0.0, 1.0);
  out.uv = (pos[idx] * vec2<f32>(0.5, -0.5)) + vec2<f32>(0.5, 0.5);
  return out;
}

@group(0) @binding(0) var blitSampler: sampler;
@group(0) @binding(1) var blitTex: texture_2d<f32>;

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  return textureSampleLevel(blitTex, blitSampler, in.uv, 0.0);
}
`;
