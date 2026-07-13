// Fullscreen-triangle blit: samples a source texture and draws it to the
// canvas. Shared by every upscale mode (each mode only has to produce a
// `finalTexture`; this is how it gets to screen).
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
