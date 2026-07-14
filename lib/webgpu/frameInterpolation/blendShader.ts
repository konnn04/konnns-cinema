// It's BETA, not PRODUCTION, not suitable for reference purposes

// Plain temporal cross-fade -- no motion estimation pass at all, so it skips
// the compute cost that made 'motion' mode contend with hardware video
// decode for GPU time (the likely cause of the reported HLS buffer stalls
// while a BETA effect was active). Ghosts more on fast motion than the
// motion-compensated mode, but is far cheaper and never mispredicts.
export const BLEND_SHADER = /* wgsl */ `
@group(0) @binding(0) var prevTex: texture_2d<f32>;
@group(0) @binding(1) var currTex: texture_2d<f32>;
@group(0) @binding(2) var outTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var samp: sampler;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = vec2<u32>(textureDimensions(outTex));
  if (gid.x >= dims.x || gid.y >= dims.y) {
    return;
  }
  let uv = (vec2<f32>(gid.xy) + 0.5) / vec2<f32>(dims);
  let fromPrev = textureSampleLevel(prevTex, samp, uv, 0.0);
  let fromCurr = textureSampleLevel(currTex, samp, uv, 0.0);
  textureStore(outTex, gid.xy, mix(fromPrev, fromCurr, 0.5));
}
`;
