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
@group(0) @binding(2) var motionOut: texture_storage_2d<rgba32float, write>;
@group(0) @binding(3) var<uniform> params: Params;

fn luma(c: vec4<f32>) -> f32 {
  return dot(c.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn blockSad(dims: vec2<i32>, blockOrigin: vec2<i32>, offset: vec2<i32>, blockSize: i32, sampleStep: i32) -> f32 {
  var sad = 0.0;
  var sy = 0;
  loop {
    if (sy >= blockSize) { break; }
    var sx = 0;
    loop {
      if (sx >= blockSize) { break; }
      let curr = clamp(blockOrigin + vec2<i32>(sx, sy), vec2<i32>(0), dims - 1);
      let prev = clamp(blockOrigin + vec2<i32>(sx, sy) + offset, vec2<i32>(0), dims - 1);
      sad += abs(luma(textureLoad(currTex, curr, 0)) - luma(textureLoad(prevTex, prev, 0)));
      sx += sampleStep;
    }
    sy += sampleStep;
  }
  return sad;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.blocksX || gid.y >= params.blocksY) {
    return;
  }

  let dims = vec2<i32>(textureDimensions(currTex));
  let blockOrigin = vec2<i32>(gid.xy * params.blockSize);
  let blockSize = i32(params.blockSize);
  let sampleStep = 4; // sparse sample grid within the block to keep this cheap

  // Three-step search instead of an exhaustive scan over the full radius --
  // the exhaustive version was ~289 candidates x 64 samples = ~18.5k texture
  // reads *per block, per real frame*, which is what was causing the severe
  // lag. This does ~4 rounds x 8 neighbors = ~32 candidates x 16 samples.
  var best = vec2<i32>(0, 0);
  var bestSad = blockSad(dims, blockOrigin, best, blockSize, sampleStep);

  var step = i32(params.searchRadius);
  loop {
    if (step < 1) { break; }

    var i = 0;
    loop {
      if (i >= 8) { break; }
      var offset = vec2<i32>(0, 0);
      switch (i) {
        case 0: { offset = vec2<i32>(-step, -step); }
        case 1: { offset = vec2<i32>(0, -step); }
        case 2: { offset = vec2<i32>(step, -step); }
        case 3: { offset = vec2<i32>(-step, 0); }
        case 4: { offset = vec2<i32>(step, 0); }
        case 5: { offset = vec2<i32>(-step, step); }
        case 6: { offset = vec2<i32>(0, step); }
        default: { offset = vec2<i32>(step, step); }
      }

      let candidate = best + offset;
      let sad = blockSad(dims, blockOrigin, candidate, blockSize, sampleStep);
      if (sad < bestSad) {
        bestSad = sad;
        best = candidate;
      }
      i += 1;
    }

    step = step / 2;
  }

  // Match quality (average per-sample luma error) travels with the vector so
  // the interpolation pass can back off the warp where the match is
  // untrustworthy (fast motion, occlusion) instead of confidently displaying
  // a wrong guess -- that overconfident wrong-guess warping is what read as
  // "rỗ ảnh"/noise during fast motion.
  let stepsPerAxis = (blockSize + sampleStep - 1) / sampleStep;
  let sampleCount = f32(stepsPerAxis * stepsPerAxis);
  let avgError = bestSad / max(sampleCount, 1.0);

  textureStore(motionOut, gid.xy, vec4<f32>(f32(best.x), f32(best.y), avgError, 0.0));
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

fn loadMV(coord: vec2<i32>, blocksMax: vec2<i32>) -> vec3<f32> {
  // .xy = motion vector, .z = average match error (lower is more trustworthy)
  return textureLoad(motionTex, clamp(coord, vec2<i32>(0), blocksMax), 0).xyz;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.outWidth || gid.y >= params.outHeight) {
    return;
  }

  // Bilinearly blend the 4 nearest blocks' motion vectors (and their match
  // error) instead of taking one block's vector verbatim -- a hard per-block
  // lookup draws a visible seam at every block boundary (reported as "rỗ
  // ảnh", a pockmarked grid pattern), because neighboring blocks routinely
  // disagree on motion by a few pixels even on smooth, continuous motion.
  let blocksMax = vec2<i32>(textureDimensions(motionTex)) - vec2<i32>(1);
  let blockSizeF = f32(params.blockSize);
  let blockPos = (vec2<f32>(gid.xy) + 0.5) / blockSizeF - 0.5;
  let blockBase = vec2<i32>(floor(blockPos));
  let blockFrac = fract(blockPos);

  let mv00 = loadMV(blockBase, blocksMax);
  let mv10 = loadMV(blockBase + vec2<i32>(1, 0), blocksMax);
  let mv01 = loadMV(blockBase + vec2<i32>(0, 1), blocksMax);
  let mv11 = loadMV(blockBase + vec2<i32>(1, 1), blocksMax);
  let top = mix(mv00, mv10, blockFrac.x);
  let bottom = mix(mv01, mv11, blockFrac.x);
  let blended = mix(top, bottom, blockFrac.y);
  let mv = blended.xy;
  let avgError = blended.z;

  let dims = vec2<f32>(f32(params.outWidth), f32(params.outHeight));
  let uv = (vec2<f32>(gid.xy) + 0.5) / dims;

  // Shrink the warp toward zero (falling back to a plain temporal
  // cross-fade at low confidence) instead of fully trusting a bad match --
  // a wrong motion vector confidently applied is what produced visible
  // noise/pockmarking on fast-moving footage.
  let confidence = clamp(1.0 - avgError * 8.0, 0.0, 1.0);
  let halfMv = (mv * 0.5 * confidence) / dims;

  // Sample each source half a motion-vector away from the midpoint, in
  // opposite directions, and blend -- the textbook block-matching midpoint
  // interpolation. Ghosts wherever the block match was wrong (mitigated by
  // the confidence damping above, not eliminated).
  let fromPrev = textureSampleLevel(prevTex, samp, uv + halfMv, 0.0);
  let fromCurr = textureSampleLevel(currTex, samp, uv - halfMv, 0.0);

  textureStore(outTex, gid.xy, mix(fromPrev, fromCurr, 0.5));
}
`;
