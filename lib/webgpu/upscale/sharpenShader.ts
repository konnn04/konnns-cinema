// 'sharpen' mode: a single-pass Laplacian unsharp mask, no resolution
// change. Boosts contrast right at edges (where the 4-neighbor sum diverges
// from 4x center) without touching flat regions, so it reads as "sharper"
// without the cost of a bicubic upscale pass -- useful when that extra
// compute contends with hardware video decode.
export const SHARPEN_SHADER = /* wgsl */ `
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

  let dims = vec2<i32>(params.size) - 1;
  let c = textureLoad(srcTex, p, 0);
  let n = textureLoad(srcTex, clamp(p + vec2<i32>(0, -1), vec2<i32>(0), dims), 0);
  let s = textureLoad(srcTex, clamp(p + vec2<i32>(0, 1), vec2<i32>(0), dims), 0);
  let e = textureLoad(srcTex, clamp(p + vec2<i32>(1, 0), vec2<i32>(0), dims), 0);
  let w = textureLoad(srcTex, clamp(p + vec2<i32>(-1, 0), vec2<i32>(0), dims), 0);

  let edge = 4.0 * c.rgb - n.rgb - s.rgb - e.rgb - w.rgb;
  let sharpened = c.rgb + params.sharpness * edge;

  // Anti-ringing: clamp to the local neighborhood's own min/max, same
  // reasoning as RCAS -- otherwise this amplifies compression noise into
  // visible speckling instead of staying invisible like it is untouched.
  let minRgb = min(min(min(n.rgb, s.rgb), min(e.rgb, w.rgb)), c.rgb);
  let maxRgb = max(max(max(n.rgb, s.rgb), max(e.rgb, w.rgb)), c.rgb);
  let clamped = clamp(sharpened, minRgb, maxRgb);

  textureStore(outTex, vec2<u32>(gid.xy), vec4<f32>(clamp(clamped, vec3<f32>(0.0), vec3<f32>(1.0)), c.a));
}
`;
