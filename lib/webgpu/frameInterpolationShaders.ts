// Naive block-matching optical flow + midpoint interpolation.
//
// Explicitly NOT comparable to ML-based interpolators (RIFE/DAIN) that TVs'
// "motion smoothing" and modern GPU frame-gen use -- this is the "gradient/
// block-matching cơ bản" approach the feasibility report called out as
// expected to ghost on fast motion, mishandle occlusion, and produce garbage
// across scene cuts. It doubles the perceived frame rate (one generated
// midpoint frame per real frame) rather than hitting an exact 24->60fps
// conversion, which would need a non-uniform insertion schedule.

export const MOTION_ESTIMATION_SHADER = /* wgsl */ `
struct Params {
  blockSize: u32,
  searchRadius: u32,
  blocksX: u32,
  blocksY: u32,
};

@group(0) @binding(0) var prevTex: texture_2d<f32>;
@group(0) @binding(1) var currTex: texture_2d<f32>;
@group(0) @binding(2) var motionOut: texture_storage_2d<rg32float, write>;
@group(0) @binding(3) var<uniform> params: Params;

fn luma(c: vec4<f32>) -> f32 {
  return dot(c.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.blocksX || gid.y >= params.blocksY) {
    return;
  }

  let dims = vec2<i32>(textureDimensions(currTex));
  let blockOrigin = vec2<i32>(gid.xy * params.blockSize);

  var bestSad = 1e9;
  var bestOffset = vec2<i32>(0, 0);

  let radius = i32(params.searchRadius);
  let step = 2; // sparse sample grid within the block to keep this cheap

  var dy = -radius;
  loop {
    if (dy > radius) { break; }
    var dx = -radius;
    loop {
      if (dx > radius) { break; }

      var sad = 0.0;
      var sy = 0;
      loop {
        if (sy >= i32(params.blockSize)) { break; }
        var sx = 0;
        loop {
          if (sx >= i32(params.blockSize)) { break; }
          let curr = clamp(blockOrigin + vec2<i32>(sx, sy), vec2<i32>(0), dims - 1);
          let prev = clamp(blockOrigin + vec2<i32>(sx + dx, sy + dy), vec2<i32>(0), dims - 1);
          sad += abs(luma(textureLoad(currTex, curr, 0)) - luma(textureLoad(prevTex, prev, 0)));
          sx += step;
        }
        sy += step;
      }

      // Slight bias toward zero motion so static/near-static regions don't
      // pick up noise-driven "phantom" motion vectors.
      let biased = sad + f32(abs(dx) + abs(dy)) * 0.02;
      if (biased < bestSad) {
        bestSad = biased;
        bestOffset = vec2<i32>(dx, dy);
      }

      dx += 1;
    }
    dy += 1;
  }

  textureStore(motionOut, gid.xy, vec4<f32>(f32(bestOffset.x), f32(bestOffset.y), 0.0, 0.0));
}
`;

export const INTERPOLATE_SHADER = /* wgsl */ `
struct Params {
  blockSize: u32,
  outWidth: u32,
  outHeight: u32,
  _pad: u32,
};

@group(0) @binding(0) var prevTex: texture_2d<f32>;
@group(0) @binding(1) var currTex: texture_2d<f32>;
@group(0) @binding(2) var motionTex: texture_2d<f32>;
@group(0) @binding(3) var outTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(4) var<uniform> params: Params;
@group(0) @binding(5) var samp: sampler;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.outWidth || gid.y >= params.outHeight) {
    return;
  }

  let blockCoord = vec2<i32>(gid.xy) / i32(params.blockSize);
  let mv = textureLoad(motionTex, blockCoord, 0).xy;

  let dims = vec2<f32>(f32(params.outWidth), f32(params.outHeight));
  let uv = (vec2<f32>(gid.xy) + 0.5) / dims;
  let halfMv = (mv * 0.5) / dims;

  // Sample each source half a motion-vector away from the midpoint, in
  // opposite directions, and blend -- the textbook block-matching midpoint
  // interpolation. Ghosts wherever the block match was wrong.
  let fromPrev = textureSampleLevel(prevTex, samp, uv + halfMv, 0.0);
  let fromCurr = textureSampleLevel(currTex, samp, uv - halfMv, 0.0);

  textureStore(outTex, gid.xy, mix(fromPrev, fromCurr, 0.5));
}
`;
