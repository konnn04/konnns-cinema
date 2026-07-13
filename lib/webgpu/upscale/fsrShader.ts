// WebGPU upscale/sharpen pipeline loosely modeled on AMD FSR 1.0 (EASU + RCAS).
//
// Honest disclosure: this is NOT a byte-exact port of AMD's published FSR
// EASU algorithm (that is a much longer 12-tap lobe-fitting routine).
//
// v1 of this file tried to fake edge-adaptive resampling with a hand-rolled
// "snap to whichever single neighbor the edge points toward" heuristic. That
// is a *binary* choice between two texels, which produces visible blocky/
// pockmarked edges -- especially on anime line art, which is exactly what
// got reported. It's been replaced with a standard Catmull-Rom bicubic
// resample (well-defined, no ad-hoc edge detection to get wrong), which is
// the safe way to get "sharper than bilinear" without inventing new
// artifacts. RCAS still does the actual sharpening pass afterward.
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

// Catmull-Rom bicubic via the standard "9-tap using bilinear taps" reduction:
// each texel weight pair (w1,w2) is fetched as a single bilinearly-filtered
// sample at the weight-proportional offset between them, so 3x3 sample
// positions reproduce a full 4x4 bicubic footprint.
fn sampleCatmullRom(uv: vec2<f32>, texSize: vec2<f32>) -> vec4<f32> {
  let samplePos = uv * texSize;
  let texPos1 = floor(samplePos - vec2<f32>(0.5)) + vec2<f32>(0.5);
  let f = samplePos - texPos1;

  let w0 = f * (vec2<f32>(-0.5) + f * (vec2<f32>(1.0) - f * 0.5));
  let w1 = vec2<f32>(1.0) + f * f * (vec2<f32>(-2.5) + f * 1.5);
  let w2 = f * (vec2<f32>(0.5) + f * (vec2<f32>(2.0) - f * 1.5));
  let w3 = f * f * (vec2<f32>(-0.5) + f * 0.5);

  let w12 = w1 + w2;
  let offset12 = w2 / w12;

  let texPos0 = (texPos1 - vec2<f32>(1.0)) / texSize;
  let texPos3 = (texPos1 + vec2<f32>(2.0)) / texSize;
  let texPos12 = (texPos1 + offset12) / texSize;

  var result = vec4<f32>(0.0);
  result += textureSampleLevel(srcTex, srcSampler, vec2<f32>(texPos0.x, texPos0.y), 0.0) * w0.x * w0.y;
  result += textureSampleLevel(srcTex, srcSampler, vec2<f32>(texPos12.x, texPos0.y), 0.0) * w12.x * w0.y;
  result += textureSampleLevel(srcTex, srcSampler, vec2<f32>(texPos3.x, texPos0.y), 0.0) * w3.x * w0.y;

  result += textureSampleLevel(srcTex, srcSampler, vec2<f32>(texPos0.x, texPos12.y), 0.0) * w0.x * w12.y;
  result += textureSampleLevel(srcTex, srcSampler, vec2<f32>(texPos12.x, texPos12.y), 0.0) * w12.x * w12.y;
  result += textureSampleLevel(srcTex, srcSampler, vec2<f32>(texPos3.x, texPos12.y), 0.0) * w3.x * w12.y;

  result += textureSampleLevel(srcTex, srcSampler, vec2<f32>(texPos0.x, texPos3.y), 0.0) * w0.x * w3.y;
  result += textureSampleLevel(srcTex, srcSampler, vec2<f32>(texPos12.x, texPos3.y), 0.0) * w12.x * w3.y;
  result += textureSampleLevel(srcTex, srcSampler, vec2<f32>(texPos3.x, texPos3.y), 0.0) * w3.x * w3.y;

  return result;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dst = vec2<u32>(gid.xy);
  if (f32(dst.x) >= dims.dstSize.x || f32(dst.y) >= dims.dstSize.y) {
    return;
  }

  let uv = (vec2<f32>(dst) + 0.5) / dims.dstSize;
  let result = sampleCatmullRom(uv, dims.srcSize);
  textureStore(outTex, dst, result);
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

  // Anti-ringing: never let the sharpen push a pixel outside the range its
  // own neighborhood already has. Without this, compression noise (very
  // common in flat anime color fields) gets amplified into visible speckling
  // instead of staying invisible the way it is in the untouched source.
  let clamped = clamp(sharpened, minRgb, maxRgb);

  textureStore(outTex, vec2<u32>(gid.xy), vec4<f32>(clamp(clamped, vec3<f32>(0.0), vec3<f32>(1.0)), c.a));
}
`;
