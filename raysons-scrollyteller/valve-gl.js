// ============================================================
//  RAYSONS — valve-gl.js  ·  the twin-bore pump body, real-time
//
//  EXPERIMENT: acts 2/3/4/6/7 of the Overview film are shots of an OBJECT being
//  examined — deconstructed, orbited, its bore inspected. Those are the acts where
//  scrubbed footage can only *depict* control. This renders that casting live so
//  the viewer actually has it: drag to turn, and the explode follows the scroll.
//  Acts 0/1/5 (pour, forge, bridge) stay as film — a pour is an EVENT, and footage
//  of real molten iron beats anything drawn in a shader.
//
//  No mesh, no GLB, no UVs. The part is a signed-distance field: rounded boxes and
//  cylinders unioned with smooth-min (a cast fillet) and cut with hard max (a
//  machined edge). Surface detail is triplanar — ambientCG Metal009, CC0, packed
//  normal.xy in RG and roughness in B so one ~20 KB image carries both.
//
//  Driven entirely by cinema.js: window.RaysonsValve.render(act, local, t).
//  Remove the <script> tag and the film falls back to footage untouched.
// ============================================================
(function(){
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.getElementById('valveGL');
  if(!cv) return;

  let gl = null;
  try{ gl = cv.getContext('webgl2', {antialias:false, alpha:false, powerPreference:'high-performance'}); }catch(e){}
  if(!gl || REDUCED){ window.RaysonsValve = { ok:false }; return; }

  const SURFACE_MAP = `data:image/jpeg;base64,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`;
  const VS = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.0-1.0,0.,1.); }`;
  const FS = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2  uRes;
uniform float uTime, uExplode, uSpin, uYaw, uPitch, uDolly, uOfs, uMacro;

// The centre body's half-height is 0.46, so the casting sits on the surface at ≈-0.46.
// The floor must track this: lower and the part hovers, higher and it sinks through.
const float FLOOR = -0.475;

float sdRoundBox(vec3 p, vec3 b, float r){
  vec3 q = abs(p)-b+r; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;
}
float sdCylX(vec3 p, float h, float r){
  vec2 d = abs(vec2(length(p.yz), p.x)) - vec2(r,h);
  return min(max(d.x,d.y),0.) + length(max(d,0.));
}
float sdCylY(vec3 p, float h, float r){
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r,h);
  return min(max(d.x,d.y),0.) + length(max(d,0.));
}
float sdCylZ(vec3 p, float h, float r){
  vec2 d = abs(vec2(length(p.xy), p.z)) - vec2(r,h);
  return min(max(d.x,d.y),0.) + length(max(d,0.));
}
float smin(float a, float b, float k){
  float h = clamp(.5+.5*(b-a)/k, 0., 1.); return mix(b,a,h) - k*h*(1.-h);
}
vec2 U(vec2 a, vec2 b){ return a.x<b.x ? a : b; }

// mat: 0 = warm copper frame plate · 1 = dark steel (bolts, hub, shafts)
//      2 = bright machined (rotor journals, pilot) · 3 = gunmetal body castings
// The reference photo is TWO-TONE — a coppery frame plate standing proud of a darker,
// greyer body and end blocks. One uniform bronze is what made mine read as a toy.
vec2 mapPart(vec3 p){
  float ex = uExplode;
  vec2 res = vec2(1e9, 0.0);

  // ─── MAIN BODY ────────────────────────────────────────────────────────────
  // Proportions from the reference frame: distinctly WIDER than tall (~1.7:1), not a
  // cube. The read of this part comes from one feature — a bolted frame plate on the
  // face, with a window cut through it and the rotors sitting behind.
  {
    vec3 q = p;
    // gunmetal body behind the frame, with a raised gasket pad on top the ports open through.
    // THE CENTRE IS TALLER THAN THE ENDS — in the reference the frame rises above and hangs
    // below the end blocks, and that stepped silhouette is what makes the part read.
    float b = sdRoundBox(q, vec3(0.60,0.46,0.29), 0.035);
    b = smin(b, sdRoundBox(q - vec3(0.,0.445,0.), vec3(0.50,0.035,0.245), 0.02), 0.03);

    // Window shortened so the front ports clear it. In the reference the ports sit in
    // SOLID plate above the window — overlapping them into the opening (as mine did)
    // reads as a manufacturing impossibility: a bore breaking into the rotor chamber.
    float win = sdRoundBox(q, vec3(0.35,0.185,0.9), 0.028);
    b = max(b, -win);

    // PORTS ON THE FRONT FACE, above the window. In the reference these two big bores
    // sit straight on and dominate the upper silhouette. On the top deck (where I had
    // them) they vanish at eye level, which is why the head of the part read blank.
    vec3 fp2 = q - vec3(0.,0.330,0.); fp2.x = abs(fp2.x) - 0.200;
    b = max(b, -sdCylZ(fp2, 1.0, 0.110));
    // small tapped holes down through the top deck
    vec3 tp = q; tp.x = abs(tp.x) - 0.36;
    b = max(b, -sdCylY(tp, 1.0, 0.048));
    res = U(res, vec2(b, 3.0));

    // ─── FRAME PLATE — separate surface, warmer copper (the two-tone read) ───
    // Its holes cut the plate only; the darker body showing through the openings is
    // exactly how the reference's recessed holes go dark.
    float plate = sdRoundBox(q - vec3(0.,0.,0.30), vec3(0.58,0.455,0.045), 0.030);
    plate = max(plate, -win);
    plate = max(plate, -sdCylZ(fp2, 1.0, 0.110));      // ports cut the plate too
    // Chamfered corners. Zoomed in, the plate outline is octagonal — the corners are
    // cut off at 45°, not simply rounded. It reads as a machined plate, not a slab.
    // Corner chamfer. The plate's half-extents are 0.58 x 0.455, so a corner sits at
    // x+y = 1.035; the cut has to sit just under that or it slices the plate in half.
    vec3 ch = q; ch.xy = abs(ch.xy);
    plate = max(plate, -(0.935 - (ch.x + ch.y)));

    // Hole pattern read off the zoom: FOUR evenly spaced along the bottom, two at the
    // upper outer corners flanking the ports, one mid-height on each side edge.
    vec3 hb1 = q - vec3(0.,-0.355,0.); hb1.x = abs(hb1.x) - 0.140;
    plate = max(plate, -sdCylZ(hb1, 1.0, 0.043));
    vec3 hb2 = q - vec3(0.,-0.355,0.); hb2.x = abs(hb2.x) - 0.395;
    plate = max(plate, -sdCylZ(hb2, 1.0, 0.043));
    vec3 hc = q - vec3(0.,0.355,0.); hc.x = abs(hc.x) - 0.455;
    plate = max(plate, -sdCylZ(hc, 1.0, 0.040));
    vec3 hm = q; hm.x = abs(hm.x) - 0.485;
    plate = max(plate, -sdCylZ(hm, 1.0, 0.038));
    res = U(res, vec2(plate, 0.0));

    // ─── TWIN ROTORS — bright machined journals on a stepped centre shaft ───
    // The reference shows smooth stepped cylinders catching the light, not lobes;
    // the sine-lobe version read as dark stripes and is gone.
    vec3 r = q; r.y = abs(r.y) - 0.118;
    // fine teeth, shallow enough to stay bright — and the pair COUNTER-ROTATES
    // (sign(q.y)) so scrolling meshes them like a real gear set
    float ang = atan(r.z, r.y) + uSpin*sign(q.y);
    float rot = sdCylX(r, 0.300, 0.128) - 0.007*sin(ang*12.0);
    rot = min(rot, sdCylX(r, 0.130, 0.150));           // centre sleeve step
    res = U(res, vec2(rot, 2.0));
    res = U(res, vec2(sdCylX(r, 0.52, 0.048), 1.0));   // dark shaft ends
  }

  // ─── DRIVE END (travels -x) ───────────────────────────────────────────────
  {
    vec3 q = p; q.x += ex*0.62;
    // deeper housing — the end blocks carry real length along the axis in the reference,
    // which is what stretches the whole part into its wide 1.7:1 stance
    float f = sdRoundBox(q - vec3(-0.72,0.,0.), vec3(0.13,0.34,0.27), 0.03);
    f = smin(f, sdCylX(q - vec3(-0.92,0.,0.), 0.09, 0.155), 0.04);
    f = smin(f, sdCylX(q - vec3(-1.02,0.,0.), 0.05, 0.098), 0.03);   // stepped nose
    vec3 bh = q - vec3(-0.72,0.,0.); bh.yz = abs(bh.yz) - vec2(0.25,0.19);
    f = max(f, -sdCylX(bh, 0.5, 0.040));
    res = U(res, vec2(f, 4.0));
    // socket heads sit recessed in the counterbores — in the photo the end blocks show
    // their dark bolt heads even assembled. They ride with the block when it explodes.
    res = U(res, vec2(sdCylX(bh - vec3(-0.11,0.,0.), 0.022, 0.030), 1.0));
    if(ex > 0.01){
      vec3 bo = q - vec3(-0.72 - ex*0.34, 0., 0.); bo.yz = abs(bo.yz) - vec2(0.25,0.19);
      float bolt = min(sdCylX(bo, 0.075, 0.038), sdCylX(bo - vec3(-0.09,0.,0.), 0.028, 0.062));
      res = U(res, vec2(bolt, 1.0));
    }
  }

  // ─── COVER END (travels +x): the steel hub with its bolt circle ───────────
  {
    vec3 q = p; q.x -= ex*0.62;
    float f = sdRoundBox(q - vec3(0.72,0.,0.), vec3(0.13,0.34,0.27), 0.03);
    vec3 bh = q - vec3(0.72,0.,0.); bh.yz = abs(bh.yz) - vec2(0.25,0.19);
    f = max(f, -sdCylX(bh, 0.5, 0.040));
    res = U(res, vec2(f, 4.0));
    res = U(res, vec2(sdCylX(bh - vec3(0.11,0.,0.), 0.022, 0.030), 1.0)); // recessed heads

    // hub — STEPPED, like the photo: big flange w/ bolt circle, mid step, bright pilot
    // with a dark centre hole. Shifted out with the deeper housing.
    vec3 hp = q - vec3(0.93,0.,0.);
    float hub = sdCylX(hp, 0.075, 0.165);
    float a = atan(hp.z, hp.y), sect = 6.2831853/6.0;
    a = mod(a + sect*0.5, sect) - sect*0.5;
    float rr = length(hp.yz);
    vec3 pb = vec3(hp.x, cos(a)*rr, sin(a)*rr);
    hub = max(hub, -sdCylX(pb - vec3(0.,0.115,0.), 0.5, 0.026));
    hub = min(hub, sdCylX(q - vec3(1.015,0.,0.), 0.045, 0.102));          // mid step
    res = U(res, vec2(hub, 1.0));
    float pil = sdCylX(q - vec3(1.075,0.,0.), 0.032, 0.058);
    pil = max(pil, -sdCylX(q - vec3(1.115,0.,0.), 0.05, 0.020));          // centre hole
    res = U(res, vec2(pil, 2.0));

    if(ex > 0.01){
      vec3 bo = q - vec3(0.72 + ex*0.34, 0., 0.); bo.yz = abs(bo.yz) - vec2(0.25,0.19);
      float bolt = min(sdCylX(bo, 0.075, 0.038), sdCylX(bo - vec3(0.09,0.,0.), 0.028, 0.062));
      res = U(res, vec2(bolt, 1.0));
    }
  }
  return res;
}

// ── TRIPLANAR TEXTURE ────────────────────────────────────────────────────────
// An SDF has no UVs, so a texture cannot be wrapped on the normal way. Instead the
// map is projected along the three world axes and blended by the surface normal —
// works on arbitrary implicit geometry with no parameterisation at all.
// Source: ambientCG Metal046A (CC0). Normal XY packed into RG, roughness into B,
// so one 22 KB image carries what would otherwise be two files.
// Two maps, as the reference actually has: the valve body and its frame plate are
// finish-machined and comparatively polished, while the end housings are raw sand-cast
// and heavily worn. One texture across the whole part is what flattened it before.
uniform sampler2D uTex;     // Metal009  — polished, for body + frame + spools
uniform sampler2D uTexW;    // Metal046A — worn cast, for the end housings
vec3 triplanar(vec3 p, vec3 n, float s){
  vec3 w = pow(abs(n), vec3(4.0));
  w /= max(w.x+w.y+w.z, 1e-4);
  return textureLod(uTex, p.yz*s, 0.0).rgb * w.x
       + textureLod(uTex, p.zx*s, 0.0).rgb * w.y
       + textureLod(uTex, p.xy*s, 0.0).rgb * w.z;
}
vec3 triplanarW(vec3 p, vec3 n, float s){
  vec3 w = pow(abs(n), vec3(4.0));
  w /= max(w.x+w.y+w.z, 1e-4);
  return textureLod(uTexW, p.yz*s, 0.0).rgb * w.x
       + textureLod(uTexW, p.zx*s, 0.0).rgb * w.y
       + textureLod(uTexW, p.xy*s, 0.0).rgb * w.z;
}

float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float vnoise(vec3 p){
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){ float s=0.,a=.5; for(int i=0;i<3;i++){ s+=a*vnoise(p); p*=2.03; a*=.5; } return s; }

vec2 march(vec3 ro, vec3 rd, int steps, float far){
  float t=0.0, mat=-1.0;
  for(int i=0;i<110;i++){
    if(i>=steps) break;
    vec3 p = ro+rd*t;
    vec2 h = mapPart(p);
    if(h.x < 0.0009*t){ mat=h.y; break; }
    t += h.x*0.88;
    if(t>far) break;
  }
  return vec2(t, mat);
}
vec3 normalAt(vec3 p){
  vec2 e = vec2(1.,-1.)*0.0010;
  return normalize(e.xyy*mapPart(p+e.xyy).x + e.yyx*mapPart(p+e.yyx).x +
                   e.yxy*mapPart(p+e.yxy).x + e.xxx*mapPart(p+e.xxx).x);
}
float shadow(vec3 ro, vec3 rd){
  float res=1., t=0.03;
  for(int i=0;i<22;i++){
    float h = mapPart(ro+rd*t).x;
    res = min(res, 9.*h/t); t += clamp(h,0.015,0.24);
    if(res<0.005||t>3.5) break;
  }
  return clamp(res,0.,1.);
}
float ao(vec3 p, vec3 n){
  float o=0., s=1.;
  for(int i=0;i<5;i++){ float hr=.012+.13*float(i)/4.; o += (hr-mapPart(p+n*hr).x)*s; s*=.82; }
  return clamp(1.-2.3*o, 0., 1.);
}

// Studio: one big warm key upper-left, a cool rim behind-right, near-black elsewhere.
// This is the lighting in the clips — most of the frame is black and the metal carries it.
vec3 env(vec3 r){
  float up = r.y*.5+.5;
  // Lifted ambient. The reference is soft top-lit and legible EDGE TO EDGE — nothing on
  // the casting falls to black. Mine was reading murky because the fill was too low for
  // a metal, which has no diffuse term to catch stray light.
  vec3 c = mix(vec3(.040,.037,.034), vec3(.190,.194,.208), pow(up,1.3));
  // OVERHEAD SOFTBOX — in the reference the single brightest thing in frame is the top
  // deck of the casting. That only happens with a broad source almost directly above,
  // separate from the angled key. Without it the top face goes as dark as the sides.
  c += vec3(1.0,.94,.86) * pow(max(r.y,0.), 2.0) * 2.30;
  // BOUNCE from the mirror floor — a real black-glass table throws a surprising amount
  // back up into the underside of the part. This is what stops the lower half going dead.
  c += vec3(1.0,.86,.70) * pow(max(-r.y,0.), 2.0) * 0.55;
  c += vec3(1.0,.88,.70) * pow(max(dot(r, normalize(vec3(-.45,.68,.42))),0.), 26.0) * 3.6;
  c += vec3(.45,.62,1.0) * pow(max(dot(r, normalize(vec3(.72,.16,-.55))),0.), 8.0) * 1.05;
  c += vec3(1.0,.80,.58) * pow(max(dot(r, normalize(vec3(.35,-.30,.60))),0.), 5.0) * .22;
  return c;
}
vec3 bg(vec3 r){
  float up = r.y*.5+.5;
  return mix(vec3(.006,.006,.006), vec3(.022,.023,.027), pow(up,1.8));
}

vec3 shadePart(vec3 p, vec3 rd, float mat){
  vec3 n = normalAt(p);
  float grain = fbm(p*38.0);
  if(mat < 0.5 || mat > 2.5)
    n = normalize(n + (vec3(fbm(p*38.+7.1),fbm(p*38.+21.3),fbm(p*38.+37.9))-.5)*0.11);

  // ── MICRO-FINISH ──────────────────────────────────────────────────────────
  // There is no texture file here and no UVs to wrap one onto — an SDF has no
  // surface parameterisation. So the finish is procedural and triplanar: very high
  // frequency noise STRETCHED along X, the axis this part was turned and bored on,
  // which reads as directional machining marks. This is what breaks up an otherwise
  // perfect specular and stops polished metal looking like moulded plastic.
  float aniso = (mat > 0.5 && mat < 2.5) ? 190.0 : 120.0;   // machined finer than cast
  float amp   = (mat > 0.5 && mat < 2.5) ? 0.028 : 0.055;
  vec3  ap = p * vec3(aniso*0.045, aniso, aniso);
  float m1 = fbm(ap), m2 = fbm(ap + 19.7);
  n = normalize(n + vec3(m1-0.5, m2-0.5, (m1+m2)*0.5-0.5) * amp);

  // ── SCANNED WEAR (ambientCG Metal046A, triplanar) ─────────────────────────
  // Noise can generate roughness but it cannot invent the irregular blotching and
  // scratch history of metal that has actually been handled. That is what this adds.
  bool machined = (mat > 0.5 && mat < 2.5);
  bool worn     = (mat > 2.5);               // body AND housings are raw sand-cast
  // SCALE, in repeats per world unit. The part is ~2 units wide and the reference's
  // cast pebbles are about 1/60th of it, which works out near 0.5 repeats/unit. At 5.2
  // each texel fell below a screen pixel and averaged into flat noise.
  vec3  tex = worn ? triplanarW(p, n, 0.60) : triplanar(p, n, machined ? 1.6 : 0.85);
  vec2  tn  = (tex.rg - 0.5) * 2.0;
  vec3  upv = abs(n.y) < 0.9 ? vec3(0.,1.,0.) : vec3(1.,0.,0.);
  vec3  tg  = normalize(cross(upv, n)), bt = cross(n, tg);
  // GAIN. Measured, these maps decode to only +/-0.11 (worn) and +/-0.06 (polished) --
  // they are very low-amplitude. At a strength near 1.0 the perturbation is invisible,
  // which is exactly what happened. The cast skin needs roughly 40x that to read.
  float tstr = worn ? 1.4 : (machined ? 0.6 : 0.9);
  n = normalize(n + (tg*tn.x + bt*tn.y) * tstr);
  float rough = worn ? min(1.0, tex.b*1.1 + 0.18) : clamp(tex.b*1.05, 0.0, 1.0);

  float o = ao(p,n);
  vec3  kd = normalize(vec3(-.45,.68,.42));
  float sh = shadow(p+n*0.012, kd);
  vec3  ref = reflect(rd,n);

  // ── METAL, not plastic ──────────────────────────────────────────────────
  // This is the difference between bronze and orange paint. A metal has NO diffuse
  // lobe: its albedo is F0, the colour it tints its own reflection with. Light it
  // like a dielectric — albedo × N·L — and it reads as painted plastic every time.
  // So: reflection is the whole image, tinted by F0, with Fresnel to white at grazing.
  // Desaturated. The reference metal is a brown-grey bronze that only goes warm where a
  // highlight lands — a saturated orange F0 reads as decorative copper, not a casting.
  // ONE COPPER FAMILY, not a hard two-tone. The reference is essentially all copper with
  // darker recesses — pushing the body to gunmetal made the end housings read as separate
  // grey blocks bolted on. The body is now only a shade cooler and darker than the plate.
  // Hue measured off the reference itself: mean metal rgb(93,75,65), R:G:B = 1:0.80:0.70.
  // A desaturated warm grey-copper, NOT the orange I had at 1:0.65:0.38. Sampling the
  // client's own render beats guessing at it.
  vec3 bronze = vec3(0.80,0.53,0.31) * (0.88+0.26*grain);   // frame plate
  vec3 steel  = vec3(0.40,0.38,0.37);                       // bolts, shafts, hub
  vec3 machd  = vec3(0.80,0.79,0.78);                       // spool lands — bright
  vec3 gun    = vec3(0.66,0.46,0.29) * (0.88+0.24*grain);   // body — a shade deeper
  vec3 cast_  = vec3(0.60,0.42,0.26) * (0.82+0.34*grain);   // end housings — raw, darker
  vec3 F0 = mat<0.5 ? bronze : (mat<1.5 ? steel : (mat<2.5 ? machd : (mat<3.5 ? gun : cast_)));

  float fres = pow(1.0 - max(dot(n,-rd),0.0), 5.0);
  vec3  F    = F0 + (vec3(1.0)-F0)*fres;

  // Roughness from the map drives the reflection: polished areas mirror the room,
  // worn areas scatter it. This variation across one surface is the tell that a
  // material is real rather than a single uniform shader value.
  vec3 col = env(ref) * F * (0.30 + 0.70*sh) * mix(1.20, 0.62, rough);

  // ── MICRO-SHADING ──
  // The environment here is three smooth lobes, and a smooth environment physically
  // CANNOT reveal normal-map detail — reflecting off a bump just slides along a
  // gradient, which is why the cast skin stayed invisible however hard I drove it.
  // Real cast surfaces read through micro-shadowing, so brightness is modulated by
  // the perturbed normal against the key. This is what makes the pebbling visible.
  float mshade = 0.50 + 0.50*max(dot(n, kd), 0.0);
  col *= mix(1.0, mshade, 0.22);

  // ── CAST SKIN ─────────────────────────────────────────────────────────────
  // The scanned normal map measures out at only +/-0.06 — Metal046A's worn character
  // lives in its colour and roughness, not its relief, so it physically cannot produce
  // the pebbling the reference has. That comes from a height field I control instead:
  // fbm at pebble scale, its gradient bending the normal, and the pits darkened. The
  // scanned map still drives roughness variation, which is what it is actually good for.
  if(worn){
    float e = 0.010;
    float h0 = fbm(p*23.0);
    vec3  g  = vec3(fbm((p+vec3(e,0.,0.))*23.0) - h0,
                    fbm((p+vec3(0.,e,0.))*23.0) - h0,
                    fbm((p+vec3(0.,0.,e))*23.0) - h0) / e;
    vec3  nb = normalize(n - g*0.022);
    col *= (0.94 + 0.14*h0)                       // a whisper of cast tooth, not mud
         * (0.92 + 0.12*max(dot(nb, kd), 0.0));
    col += F0 * env(nb) * 0.10;
  }

  // a sharp key highlight — polished metal has a small hot spot, not a broad sheen,
  // and the map widens it exactly where the surface is worn
  vec3  hv = normalize(kd - rd);
  float sp = (mat<0.5 ? 110.0 : (mat<2.5 ? 190.0 : 120.0)) * mix(1.7, 0.40, rough);
  col += F * vec3(1.0,0.92,0.80) * pow(max(dot(n,hv),0.0), sp) * sh * 2.4 * mix(1.3,0.55,rough);

  // faint grounding term so pockets that see no environment don't go pure black
  // Grounding term, lifted. The rotors sit deep in the window where they see almost no
  // environment, and the reference shows them BRIGHT — they're the detail that proves
  // the window isn't just a hole. AO is also softened so recesses read instead of crush.
  col += F0 * env(n) * (mat>1.5 && mat<2.5 ? 0.55 : 0.16);
  return col * mix(1.0, o, 0.78);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y;
  uv.x -= uOfs;

  float cy=cos(uYaw), sy=sin(uYaw), cp=cos(uPitch), sp=sin(uPitch);
  vec3 ro = vec3(sy*cp, sp, cy*cp)*uDolly;
  vec3 ta = vec3(0., -0.02, 0.);
  vec3 ww = normalize(ta-ro), uu = normalize(cross(ww,vec3(0,1,0))), vv = cross(uu,ww);
  // uMacro tightens the lens instead of moving the camera — a longer lens, like the macro clip
  vec3 rd = normalize(uv.x*uu + uv.y*vv + (1.75 + uMacro*1.5)*ww);

  vec3 col = bg(rd);
  vec2 h = march(ro, rd, 96, 14.0);

  // ─── FLOOR: only if the part was not hit first ───
  float tf = (rd.y < -0.0001) ? (FLOOR - ro.y)/rd.y : -1.0;
  bool hitPart  = h.y >= 0.0;
  bool hitFloor = tf > 0.0 && (!hitPart || tf < h.x);

  if(hitPart && !hitFloor){
    col = shadePart(ro+rd*h.x, rd, h.y);
    col = mix(col, bg(rd), smoothstep(4.0, 9.0, h.x));
  } else if(hitFloor){
    vec3 fp = ro + rd*tf;
    vec3 rr = vec3(rd.x, -rd.y, rd.z);                 // mirror
    vec2 h2 = march(fp + vec3(0.,0.002,0.), rr, 56, 9.0);
    vec3 refl = bg(rr);
    if(h2.y >= 0.0) refl = shadePart(fp + rr*h2.x + vec3(0.,0.002,0.), rr, h2.y);

    // A real floor is not a perfect mirror: reflection strength climbs with grazing angle,
    // and blurs/fades with distance from the object.
    // The reference floor is close to a true mirror: the reflection stays bright and
    // legible for the full height of the part before it falls away. Earlier values
    // killed it within a fraction of that, which read as damp stone, not polished black.
    // A reflection must stay clearly DIMMER than the object. Push it to parity and the
    // eye stops reading "mirror" and starts reading "a second part floating below".
    float grazing = pow(1.0 - max(-rd.y,0.0), 2.0);
    float fade    = exp(-max(0.0, length(fp.xz) - 0.70)*0.80);
    float dist    = exp(-tf*0.11);
    refl *= 0.38;
    col = mix(bg(rd), refl, clamp(grazing*0.94 + 0.04, 0., 1.) * fade * dist);

    // ── CONTACT SHADOW ──
    // March from the floor point toward the key light; where the part blocks it, the
    // floor darkens. The reflection alone makes the object look like it is hovering
    // over a mirror — this is what actually sets it down on the surface.
    float fsh = shadow(fp + vec3(0.,0.006,0.), normalize(vec3(-.45,.68,.42)));
    col *= mix(0.16, 1.0, fsh);
  }

  // Output LINEAR HDR — no tonemap, no gamma. Bloom has to be gathered in linear light
  // or bright areas bleed the wrong colour, and tonemapping first would clip the very
  // highlights bloom is supposed to pick up. The composite pass finishes the image.
  // Alpha carries scene distance (normalised) so depth of field has something to read.
  float sceneT = (hitPart && !hitFloor) ? h.x : (hitFloor ? tf : 40.0);
  O = vec4(max(col,0.0), clamp(sceneT/40.0, 0.0, 1.0));
}`;
  const FS_BRIGHT = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uTexel;
out vec4 O;
void main(){
  vec3 c = textureLod(uTex, gl_FragCoord.xy*uTexel, 0.0).rgb;
  float l = dot(c, vec3(0.2126,0.7152,0.0722));
  O = vec4(c * smoothstep(0.50, 1.60, l), 1.0);   // soft knee
}`;
  const FS_BLUR = `#version 300 es
precision highp float;
// uTexel is the SOURCE texel (tap spacing); uDstTexel is the DESTINATION texel (uv).
// These differ whenever a pass downsamples, and using the source size for uv makes
// gl_FragCoord — which is in destination space — cover only part of the source.
uniform sampler2D uTex; uniform vec2 uTexel; uniform vec2 uDstTexel; uniform vec2 uDir;
out vec4 O;
void main(){
  vec2 uv = gl_FragCoord.xy*uDstTexel;
  vec2 d  = uDir*uTexel;
  vec4 s  = textureLod(uTex, uv, 0.0)*0.2270270270;
  s += (textureLod(uTex, uv+d*1.3846153846, 0.0) + textureLod(uTex, uv-d*1.3846153846, 0.0))*0.3162162162;
  s += (textureLod(uTex, uv+d*3.2307692308, 0.0) + textureLod(uTex, uv-d*3.2307692308, 0.0))*0.0702702703;
  O = s;
}`;
  const FS_COMP = `#version 300 es
precision highp float;
uniform sampler2D uScene, uBloom, uBlur;
uniform vec2 uTexel; uniform float uTime, uFocus, uBloomAmt;
uniform vec2 uMouse; uniform float uMouseAmt;
out vec4 O;
void main(){
  vec2 uv = gl_FragCoord.xy*uTexel;
  vec4 sc = texture(uScene, uv);
  float dist = sc.a*40.0;

  // DEPTH OF FIELD — circle of confusion grows away from the focal plane, which is
  // pinned to the object. Squared so the casting itself stays genuinely sharp and
  // only the floor running away from it goes soft.
  //
  // The blurred buffer is a blur of the WHOLE scene, so near the silhouette its taps
  // include the object. Mix that into empty background — which sits at max depth and
  // therefore max CoC — and the part smears a huge ghost across the sky. So the empty
  // background is excluded from DOF entirely; it is flat black and gains nothing anyway.
  float isBg = step(39.0, dist);
  float coc  = clamp(abs(dist - uFocus)/3.4, 0.0, 1.0);
  vec3 col = mix(sc.rgb, texture(uBlur, uv).rgb, coc*coc*0.90*(1.0 - isBg));

  col += texture(uBloom, uv).rgb * uBloomAmt;

  // ── CURSOR SHEEN ──
  // A warm light rides the cursor, only on the metal (background sits at max depth).
  // MULTIPLICATIVE, not additive: it must brighten the metal's own detail like a lamp
  // moving over it — a flat additive glow just reads as fog parked on the lens.
  // Masked by DISTANCE TO THE FOCAL PLANE, not just "hit something" — the far floor is
  // also "something", and lighting it paints a grey blob in what reads as empty space.
  float onPart = 1.0 - smoothstep(uFocus+1.2, uFocus+2.8, dist);
  vec2 md = uv - uMouse; md.x *= uTexel.y/uTexel.x;          // aspect-corrected
  float glow = exp(-dot(md,md)*95.0) * onPart * uMouseAmt;
  col *= 1.0 + glow*1.15;
  col += vec3(1.0,0.80,0.55) * glow * 0.035;

  col = max(col, 0.0);
  col = (col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14);   // filmic
  col = pow(col, vec3(0.4545));
  float gn = fract(sin(dot(gl_FragCoord.xy + uTime*60., vec2(12.9898,78.233)))*43758.5453);
  col += (gn-0.5)*0.020;
  O = vec4(col,1.);
}`;

  function sh(t,src){ const o=gl.createShader(t); gl.shaderSource(o,src); gl.compileShader(o);
    if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){ console.error('valve-gl:', gl.getShaderInfoLog(o)); return null; } return o; }
  const vsh = sh(gl.VERTEX_SHADER, VS);
  if(!vsh){ window.RaysonsValve = { ok:false }; return; }
  function prog(fsSrc){ const f=sh(gl.FRAGMENT_SHADER,fsSrc); if(!f) return null;
    const p=gl.createProgram(); gl.attachShader(p,vsh); gl.attachShader(p,f); gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)){ console.error('valve-gl:', gl.getProgramInfoLog(p)); return null; } return p; }
  const pScene=prog(FS), pBright=prog(FS_BRIGHT), pBlur=prog(FS_BLUR), pComp=prog(FS_COMP);
  if(!pScene||!pBright||!pBlur||!pComp){ window.RaysonsValve = { ok:false }; return; }

  const uni=(p,n)=>{const o={};n.forEach(k=>o[k]=gl.getUniformLocation(p,k));return o;};
  const U  = uni(pScene, ['uRes','uTime','uExplode','uSpin','uYaw','uPitch','uDolly','uOfs','uMacro','uTex']);
  const UB = uni(pBright,['uTex','uTexel']);
  const UL = uni(pBlur,  ['uTex','uTexel','uDstTexel','uDir']);
  const UC = uni(pComp,  ['uScene','uBloom','uBlur','uTexel','uTime','uFocus','uBloomAmt','uMouse','uMouseAmt']);

  const surfTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, surfTex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,128,255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  (function(){ const img=new Image(); img.onload=()=>{
      gl.bindTexture(gl.TEXTURE_2D, surfTex);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
    }; img.src = SURFACE_MAP; })();

  const hasFloat = !!gl.getExtension('EXT_color_buffer_float');
  const FMT = hasFloat ? {i:gl.RGBA16F, t:gl.HALF_FLOAT} : {i:gl.RGBA8, t:gl.UNSIGNED_BYTE};
  function makeFBO(w,h){
    const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texImage2D(gl.TEXTURE_2D,0,FMT.i,w,h,0,gl.RGBA,FMT.t,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const fb=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    return {tex,fb,w,h};
  }
  let scale=0.80, W=0,H=0,HW=0,HH=0, fScene=null,fA=null,fB=null,fC=null,fD=null;
  const kill=f=>{ if(f){ gl.deleteTexture(f.tex); gl.deleteFramebuffer(f.fb); } };
  function resize(){
    const dpr=Math.min(devicePixelRatio||1,1.5);
    W=Math.max(2,Math.floor(innerWidth*dpr*scale)); H=Math.max(2,Math.floor(innerHeight*dpr*scale));
    cv.width=W; cv.height=H; HW=Math.max(1,W>>1); HH=Math.max(1,H>>1);
    [fScene,fA,fB,fC,fD].forEach(kill);
    fScene=makeFBO(W,H); fA=makeFBO(HW,HH); fB=makeFBO(HW,HH); fC=makeFBO(HW,HH); fD=makeFBO(HW,HH);
  }
  resize(); addEventListener('resize', resize);

  function pass(p,tgt,setup){
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgt?tgt.fb:null);
    gl.viewport(0,0, tgt?tgt.w:W, tgt?tgt.h:H);
    if(setup) setup();
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
  const bindTex=(u,t,l)=>{ gl.activeTexture(gl.TEXTURE0+u); gl.bindTexture(gl.TEXTURE_2D,t); gl.uniform1i(l,u); };

  // ── drag: the whole point of the experiment ──
  let dY=0,dYT=0,dP=0,dPT=0, dragging=false, lx=0,ly=0, velY=0, spinV=0, lastMv=0, touched=false;
  let mx=0.5,my=0.5,mxS=0.5,myS=0.5,mAmt=0,mAmtT=0, live=false;
  addEventListener('pointerdown', e=>{
    if(!live) return;
    if(e.target.closest && e.target.closest('a,button,[data-ui]')) return;
    dragging=true; touched=true; lx=e.clientX; ly=e.clientY; lastMv=performance.now(); spinV=0; velY=0;
    if(e.pointerType!=='touch') e.preventDefault();
  });
  addEventListener('pointermove', e=>{
    mx=e.clientX/innerWidth; my=1-e.clientY/innerHeight; mAmtT=1;
    if(!dragging) return;
    const d=-(e.clientX-lx)*0.0090, n=performance.now();
    dYT+=d; dPT+=(e.clientY-ly)*0.0058; dPT=Math.max(-0.85,Math.min(0.85,dPT));
    lx=e.clientX; ly=e.clientY; velY=d*Math.min(3,16/Math.max(1,n-lastMv)); lastMv=n;
  });
  const endP=()=>{ if(dragging) spinV=velY; dragging=false; };
  addEventListener('pointerup', endP); addEventListener('pointercancel', endP);

  const ss=(a,b,x)=>{ const t=Math.min(Math.max((x-a)/(b-a),0),1); return t*t*(3-2*t); };
  const t0=performance.now();
  let frames=0, acc=0, last=t0;

  // ACT CHOREOGRAPHY — each film act asks a different question of the part.
  //   2 deconstruct · 3 reassemble · 4 orbit (every side) · 6 the bore · 7 reveal
  function poseFor(act, local){
    switch(act){
      case 2: return { explode: ss(0.05,0.85,local),        macro:0,                    yaw:-0.45+local*0.5, ofs: 0.30 };
      case 3: return { explode: 1-ss(0.15,0.95,local),      macro:0,                    yaw: 0.10+local*0.5, ofs: 0.30 };
      case 4: return { explode: 0,                          macro:0,                    yaw:-0.9+local*2.6,  ofs: 0.00 };
      case 6: return { explode: 0,                          macro: ss(0.10,0.90,local), yaw: 0.35+local*0.3, ofs:-0.26 };
      case 7: return { explode: 0,                          macro: 1-ss(0.10,0.90,local), yaw:0.65-local*0.4, ofs:-0.20 };
      default:return { explode: 0, macro:0, yaw:0, ofs:0 };
    }
  }

  let ofs = 0.30;
  function render(act, local, tsec){
    const dt = Math.min((performance.now()-last)/1000, 0.05); last = performance.now();
    if(!dragging && spinV!==0){ dYT+=spinV; spinV*=Math.pow(0.93,dt*60); if(Math.abs(spinV)<0.0001) spinV=0; }
    dY+=(dYT-dY)*0.09; dP+=(dPT-dP)*0.09;
    mxS+=(mx-mxS)*0.10; myS+=(my-myS)*0.10; mAmt+=(mAmtT-mAmt)*0.06;

    const P = poseFor(act, local);
    ofs += (P.ofs-ofs)*0.06;
    const yaw   = P.yaw + dY;
    const pitch = 0.24 + Math.sin(Math.PI*local)*0.14 - P.macro*0.10 + Math.sin(tsec*0.19)*0.02 + dP;
    const dolly = 8.20 - P.macro*1.90;
    const HT = [1/HW, 1/HH];

    pass(pScene, fScene, ()=>{
      gl.uniform2f(U.uRes,W,H); gl.uniform1f(U.uTime,tsec);
      gl.uniform1f(U.uExplode,P.explode);
      gl.uniform1f(U.uSpin, tsec*0.22 + local*4.0);
      gl.uniform1f(U.uYaw,yaw); gl.uniform1f(U.uPitch,pitch);
      gl.uniform1f(U.uDolly,dolly); gl.uniform1f(U.uOfs,ofs); gl.uniform1f(U.uMacro,P.macro);
      bindTex(3, surfTex, U.uTex);
    });
    pass(pBright, fA, ()=>{ bindTex(0,fScene.tex,UB.uTex); gl.uniform2f(UB.uTexel,HT[0],HT[1]); });
    pass(pBlur, fB, ()=>{ bindTex(0,fA.tex,UL.uTex);
      gl.uniform2f(UL.uTexel,HT[0],HT[1]); gl.uniform2f(UL.uDstTexel,HT[0],HT[1]); gl.uniform2f(UL.uDir,1,0); });
    pass(pBlur, fA, ()=>{ bindTex(0,fB.tex,UL.uTex);
      gl.uniform2f(UL.uTexel,HT[0],HT[1]); gl.uniform2f(UL.uDstTexel,HT[0],HT[1]); gl.uniform2f(UL.uDir,0,1); });
    pass(pBlur, fD, ()=>{ bindTex(0,fScene.tex,UL.uTex);
      gl.uniform2f(UL.uTexel,1/W,1/H);     gl.uniform2f(UL.uDstTexel,HT[0],HT[1]); gl.uniform2f(UL.uDir,1,0); });
    pass(pBlur, fC, ()=>{ bindTex(0,fD.tex,UL.uTex);
      gl.uniform2f(UL.uTexel,HT[0],HT[1]); gl.uniform2f(UL.uDstTexel,HT[0],HT[1]); gl.uniform2f(UL.uDir,0,1); });
    pass(pComp, null, ()=>{
      bindTex(0,fScene.tex,UC.uScene); bindTex(1,fA.tex,UC.uBloom); bindTex(2,fC.tex,UC.uBlur);
      gl.uniform2f(UC.uTexel,1/W,1/H); gl.uniform1f(UC.uTime,tsec);
      gl.uniform1f(UC.uFocus,dolly); gl.uniform1f(UC.uBloomAmt,0.55);
      gl.uniform2f(UC.uMouse,mxS,myS); gl.uniform1f(UC.uMouseAmt,mAmt);
    });

    // adaptive resolution — the raymarch is fill-rate bound, so trade pixels for frames
    frames++; acc+=dt;
    if(acc>1.0){
      const fps=frames/acc;
      if(fps<45 && scale>0.5){ scale=Math.max(0.5,scale-0.12); resize(); }
      else if(fps>58 && scale<0.88){ scale=Math.min(0.88,scale+0.06); resize(); }
      frames=0; acc=0;
    }
  }

  window.RaysonsValve = {
    ok: true,
    // cinema.js owns the scroll; this only ever draws what it is told to draw
    render: (act, local)=> render(act, local, (performance.now()-t0)/1000),
    setLive: (b)=>{ live = b; cv.style.opacity = b ? '1' : '0'; if(!b){ dragging=false; } },
    dragged: ()=> touched
  };
})();
