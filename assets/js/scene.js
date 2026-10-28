/* Lion’s Legacy — 3D-baggrund
   En skulptur af flydende guld, gnister og en glødende guld/orange strøm.
   Tegnes med WebGL direkte i browseren: ingen biblioteker, ingen tredjepart,
   ingen cookies. Følger musen, stopper når fanen er skjult, og står stille
   for besøgende, der har slået bevægelse fra (prefers-reduced-motion). */
(function () {
  "use strict";

  var canvas = document.createElement("canvas");
  canvas.className = "scene";
  canvas.id = "scene";
  canvas.setAttribute("aria-hidden", "true");

  var opts = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" };
  var gl = null;
  try { gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts); } catch (e) { gl = null; }
  if (!gl) return; // Siden har en rolig CSS-gradient som reserve

  var hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  var PRECISION = hp && hp.precision > 0 ? "highp" : "mediump";

  /* ---------- Shadere ---------- */

  var VERT_SCENE = "attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.,1.);}";

  var FRAG_SCENE = [
    "precision " + PRECISION + " float;",
    "uniform vec2 uRes;",
    "uniform float uTime;",
    "uniform vec2 uMouse;",   // markør i skærmkoordinater (y fra -0.5 til 0.5)
    "uniform vec3 uCenter;",  // skulpturens midte i verden
    "uniform float uScale;",
    "uniform float uDim;",    // skulpturens lysstyrke
    "uniform float uFlow;",   // strømmens lysstyrke
    "uniform vec3 uDrop;",    // dråben, der trækkes mod markøren
    "uniform vec3 uLight;",
    "uniform mat3 uBand;",    // båndets drejning (beregnes i JavaScript)
    "uniform vec4 uOrb0;",    // dråber i kredsløb: position og radius
    "uniform vec4 uOrb1;",
    "uniform vec4 uOrb2;",

    "const float FL = 2.2;",
    "const vec3 RO = vec3(0.0, 0.0, 6.0);",

    "float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);",
    "  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}",
    "float fbm(vec2 p){float v=0.0,a=0.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);",
    "  for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=0.5;}return v;}",
    "mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}",
    "float smin(float a,float b,float k){float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}",

    // Guld/orange farveskala til strømmen (sRGB)
    "vec3 ramp(float x){",
    "  vec3 c0=vec3(0.035,0.031,0.027),c1=vec3(0.20,0.075,0.025),c2=vec3(0.66,0.25,0.06),c3=vec3(0.95,0.56,0.18),c4=vec3(1.0,0.86,0.58);",
    "  x=clamp(x,0.0,1.0);",
    "  if(x<0.3)return mix(c0,c1,x/0.3);",
    "  if(x<0.6)return mix(c1,c2,(x-0.3)/0.3);",
    "  if(x<0.82)return mix(c2,c3,(x-0.6)/0.22);",
    "  return mix(c3,c4,(x-0.82)/0.18);}",

    // Skulpturen: en flydende kerne, et snoet bånd og dråber
    "float band(vec3 p){",
    "  float a=atan(p.z,p.x);",
    "  vec2 q=vec2(length(p.xz)-1.0,p.y);",
    "  q=rot(a*1.5+uTime*0.35)*q;",
    "  vec2 d=abs(q)-vec2(0.17,0.032);",
    "  return length(max(d,0.0))+min(max(d.x,d.y),0.0)-0.022;}",

    "float map(vec3 w){",
    "  vec3 p=(w-uCenter)/uScale;",
    "  float t=uTime;",
    // Kernen ånder
    "  float core=length(p)-0.56;",
    "  core+=0.022*sin(5.0*p.x+t*1.1)*sin(5.0*p.y+t*0.8)*sin(5.0*p.z+t*0.9);",
    // Dråben ved markøren trækkes ud af kernen
    "  float d=smin(core,length(p-uDrop)-0.105,0.24);",
    // Dråber i kredsløb, der smelter sammen med kernen
    "  d=smin(d,length(p-uOrb0.xyz)-uOrb0.w,0.26);",
    "  d=smin(d,length(p-uOrb1.xyz)-uOrb1.w,0.26);",
    "  d=smin(d,length(p-uOrb2.xyz)-uOrb2.w,0.26);",
    // Båndet drejer med musen og langsomt af sig selv
    "  d=min(d,band(uBand*p)*0.75);",
    "  return d*uScale;}",

    "vec3 normal(vec3 p){vec2 e=vec2(0.0015,-0.0015)*uScale;",
    "  return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}",

    // Et mørkt fotostudie med varme lyskasser, som guldet spejler
    "vec3 env(vec3 r){",
    "  vec3 c=vec3(0.004,0.003,0.002);",
    "  c+=vec3(1.0,0.84,0.6)*smoothstep(0.62,0.8,r.y)*2.4;",
    "  c+=vec3(0.6,0.3,0.08)*smoothstep(0.0,0.6,r.y)*0.18;",
    "  c+=vec3(1.0,0.36,0.06)*pow(max(dot(r,normalize(vec3(-0.85,0.15,-0.35))),0.0),6.0)*2.6;",
    "  c+=vec3(1.0,0.55,0.16)*pow(max(dot(r,normalize(vec3(0.9,-0.15,-0.4))),0.0),10.0)*1.6;",
    "  c+=vec3(0.35,0.13,0.03)*smoothstep(-0.2,-0.9,r.y)*0.7;",
    "  c+=vec3(1.0,0.72,0.38)*smoothstep(0.16,0.0,abs(r.y-0.1+0.07*sin(r.x*3.0+uTime*0.25)))*0.55;",
    "  c+=vec3(1.0,0.93,0.78)*pow(max(dot(r,uLight),0.0),60.0)*6.0;",
    "  c+=vec3(1.0,0.66,0.3)*pow(max(dot(r,uLight),0.0),5.0)*0.35;",
    "  return c;}",

    "vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}",

    "vec3 backdrop(vec2 uv){",
    "  float t=uTime;",
    "  vec2 dm=uv-uMouse;float md=dot(dm,dm);",
    "  vec2 p=uv+dm*0.18*exp(-md*6.0);",
    "  float f=fbm(p*0.9+vec2(t*0.02,-t*0.015));",
    "  float g=fbm(p*1.8-vec2(t*0.03,0.0)+f);",
    // Bløde silkebånd af lys, der bugter sig diagonalt hen over siden
    "  float s=p.x*0.55-p.y+0.35*sin(p.x*1.7+t*0.11)+0.22*sin(p.y*2.3-t*0.09)+(f-0.5)*1.1;",
    "  float w=sin(s*3.1+t*0.05);",
    "  float ribbon=exp(-abs(w)*9.0);",
    "  float sheen=exp(-abs(w)*2.2);",
    "  float w2=sin(s*3.1*1.9+1.7+t*0.07+(g-0.5)*1.5);",
    "  float fine=exp(-abs(w2)*26.0);",
    "  vec2 c2=uCenter.xy/(RO.z/FL);",
    "  float r=length(uv-c2);",
    "  float mask=exp(-r*r*1.6);",
    "  float edge=smoothstep(1.3,0.1,length(uv*vec2(0.7,1.0)));",
    "  float v=0.04+0.1*g+0.1*sheen*g+0.38*ribbon*(0.45+0.55*g)+0.18*fine*g;",
    "  v*=mix(0.32,1.0,mask)*mix(0.6,1.0,edge);",
    "  v+=0.12*exp(-md*8.0);",
    "  return ramp(v*uFlow);}",

    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;",
    "  vec3 rd=normalize(vec3(uv,-FL));",
    "  vec3 col=backdrop(uv);",
    // Gylden aura om skulpturen
    "  vec3 oc=uCenter-RO;",
    "  float tc=dot(oc,rd);",
    "  float dc=length(oc-rd*tc)/uScale;",
    "  col+=vec3(1.0,0.45,0.12)*0.22*uDim*exp(-max(dc-0.9,0.0)*2.6);",
    // Ram kun pixels, hvis stråle rammer skulpturens kugle
    "  float R=1.32*uScale;",
    "  float h2=R*R-(dot(oc,oc)-tc*tc);",
    "  if(h2>0.0&&uDim>0.01){",
    "    float t0=max(tc-sqrt(h2),0.0),t1=tc+sqrt(h2);",
    "    float px=1.0/(uRes.y*FL);",
    "    float t=t0,best=1e9,bt=t0;bool hit=false;",
    "    for(int i=0;i<90;i++){",
    "      vec3 p=RO+rd*t;float h=map(p);",
    "      float k=h/(px*t);",
    "      if(k<best){best=k;bt=t;}",
    "      if(k<0.3){hit=true;break;}",
    "      t+=h;if(t>t1)break;",
    "    }",
    // Bløde kanter: pixels, der næsten rammer, blandes delvist
    "    float cov=hit?1.0:1.0-smoothstep(0.3,1.5,best);",
    "    if(cov>0.0){",
    "      if(!hit)t=bt;",
    "      vec3 p=RO+rd*t;vec3 n=normal(p);",
    "      vec3 r=reflect(rd,n);",
    "      float ndv=max(dot(n,-rd),0.0);",
    "      vec3 gold=vec3(1.0,0.71,0.29);",
    "      vec3 F=gold+(1.0-gold)*pow(1.0-ndv,5.0);",
    "      float ao=clamp(map(p+n*0.09*uScale)/(0.09*uScale),0.0,1.0);",
    "      vec3 c=env(r)*F*mix(0.35,1.0,ao);",
    "      c+=vec3(1.0,0.35,0.06)*pow(1.0-ndv,3.0)*0.35;",
    "      c+=vec3(0.9,0.3,0.05)*(1.0-ao)*0.25;",
    "      c=pow(aces(c*1.25),vec3(0.4545));",
    "      col=mix(col,c,uDim*cov);",
    "    }",
    "  }",
    // Korn, så gradienten ikke laver striber
    "  col+=(hash(gl_FragCoord.xy+fract(uTime)*91.7)-0.5)*0.022;",
    "  gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("\n");

  var VERT_SPARK = [
    "precision " + PRECISION + " float;",
    "attribute vec4 aSeed;",
    "uniform float uTime;",
    "uniform vec2 uRes;",
    "uniform vec2 uMouse;",
    "uniform vec2 uFocus;",
    "uniform float uPx;",
    "uniform float uAmount;",
    "varying float vAlpha;",
    "varying float vHeat;",
    "void main(){",
    "  float aspect=uRes.x/uRes.y;",
    "  float speed=0.025+0.06*aSeed.y;",
    "  float y=mod(aSeed.z*1.4+uTime*speed,1.4)-0.7;",
    "  float near=step(0.45,aSeed.w);",
    "  float x=mix((aSeed.x-0.5)*aspect,uFocus.x+(aSeed.x-0.5)*0.9,near);",
    "  x+=0.05*sin(uTime*0.5+aSeed.w*40.0+y*5.0)+0.03*sin(uTime*1.3+aSeed.y*20.0);",
    "  vec2 pos=vec2(x,y);",
    "  vec2 d=pos-uMouse;float m=exp(-dot(d,d)*40.0);",
    "  pos+=normalize(d+1e-4)*m*0.07;",
    "  float life=smoothstep(-0.7,-0.5,y)*smoothstep(0.7,0.35,y);",
    "  float tw=0.6+0.4*sin(uTime*(1.5+aSeed.y*3.0)+aSeed.x*30.0);",
    "  vAlpha=life*tw*uAmount*mix(0.5,1.0,near);",
    "  vHeat=aSeed.y;",
    "  gl_PointSize=(1.4+aSeed.w*aSeed.w*4.0)*uPx;",
    "  gl_Position=vec4(pos.x*2.0/aspect,pos.y*2.0,0.0,1.0);",
    "}"
  ].join("\n");

  var FRAG_SPARK = [
    "precision " + PRECISION + " float;",
    "varying float vAlpha;",
    "varying float vHeat;",
    "void main(){",
    "  vec2 c=gl_PointCoord-0.5;float r=dot(c,c)*4.0;",
    "  float a=exp(-r*3.5)*vAlpha;",
    "  vec3 col=mix(vec3(1.0,0.45,0.1),vec3(1.0,0.85,0.55),vHeat);",
    "  gl_FragColor=vec4(col*a,a);",
    "}"
  ].join("\n");

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      throw new Error(gl.getShaderInfoLog(s) || "shader");
    }
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
      throw new Error(gl.getProgramInfoLog(p) || "program");
    }
    return p;
  }
  function uniforms(p, names) {
    var u = {};
    names.forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    return u;
  }

  /* ---------- Opsætning ---------- */

  var lille = window.matchMedia("(max-width: 760px)").matches;
  var ANTAL_GNISTER = lille ? 150 : 280;
  var sceneProg, sparkProg, uS, uP, triBuf, seedBuf, aPos, aSeed;

  function init() {
    sceneProg = program(VERT_SCENE, FRAG_SCENE);
    sparkProg = program(VERT_SPARK, FRAG_SPARK);
    uS = uniforms(sceneProg, ["uRes", "uTime", "uMouse", "uCenter", "uScale", "uDim", "uFlow", "uDrop", "uLight", "uBand", "uOrb0", "uOrb1", "uOrb2"]);
    uP = uniforms(sparkProg, ["uTime", "uRes", "uMouse", "uFocus", "uPx", "uAmount"]);
    aPos = gl.getAttribLocation(sceneProg, "aPos");
    aSeed = gl.getAttribLocation(sparkProg, "aSeed");

    triBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    var seeds = new Float32Array(ANTAL_GNISTER * 4);
    var s = 7;
    function rnd() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    for (var i = 0; i < seeds.length; i++) seeds[i] = rnd();
    seedBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
  }

  try { init(); } catch (e) { return; }

  document.body.insertBefore(canvas, document.body.firstChild);
  document.documentElement.classList.add("har-scene");

  /* ---------- Tilstand ---------- */

  var forside = document.body.getAttribute("data-scene") === "forside";
  var roligMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var rolig = roligMQ.matches;
  var pauset = false;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var kvalitet = lille ? 0.8 : 0.85;
  var KVAL_MIN = 0.45, KVAL_MAX = 1;
  var W = 0, H = 0;

  // Tiden følger uret, så skulpturen står samme sted, når man skifter side
  var tid = rolig ? 14 : (PRECISION === "highp" ? (Date.now() / 1000) % 3600 : 0);
  var sidst = 0;
  var raf = 0;

  // Markøren: mål og blødt fulgt værdi. Uden mus svæver den af sig selv.
  var mus = { x: 0, y: 0, sidst: -1e9 };
  var m = { x: svaevX(tid), y: svaevY(tid) };
  var cur = { cx: 0, cy: 0, sc: 1, dim: 1, flow: 1, spin: 0 };
  var forste = true;
  var holdTil = 0;

  // Den langsomme svæven, markøren følger, når musen står stille
  function svaevX(t) { return Math.sin(t * 0.23) * 0.55 + Math.sin(t * 0.11 + 1.3) * 0.2; }
  function svaevY(t) { return Math.sin(t * 0.17 + 0.7) * 0.4; }

  function resize() {
    var w = Math.max(1, Math.round(window.innerWidth * dpr * kvalitet));
    var h = Math.max(1, Math.round(window.innerHeight * dpr * kvalitet));
    if (w !== W || h !== H) {
      W = canvas.width = w;
      H = canvas.height = h;
    }
  }

  function maal(erForside, scroll) {
    // Hvor skulpturen skal stå, ud fra skærm, side og hvor langt man har scrollet
    var vw = window.innerWidth, vh = window.innerHeight;
    var aspect = vw / vh;
    var halvH = 6 * 0.5 / 2.2, halvB = halvH * aspect;
    var s = Math.min(Math.max(scroll / vh, 0), 3);
    var k = Math.min(s, 1);
    var e = k * k * (3 - 2 * k);
    var bred = aspect >= 1.05;
    var r, cx, cy, dim, flow;

    if (erForside) {
      if (bred) {
        r = Math.min(0.74 * halvH, 0.42 * halvB);
        cx = halvB * 0.46; cy = -0.02;
        cx += (halvB * 0.78 - cx) * e; cy += 0.25 * e;
        r *= 1 - 0.25 * e;
        dim = 1 - 0.55 * e;
      } else {
        r = Math.min(0.4 * halvH, 0.8 * halvB);
        cx = 0; cy = halvH * 0.44;
        cx += halvB * 0.55 * e; cy += 0.35 * e;
        r *= 1 - 0.2 * e;
        dim = 1 - 0.65 * e;
      }
      flow = 1 - 0.3 * e;
    } else {
      if (bred) {
        r = Math.min(0.42 * halvH, 0.3 * halvB);
        cx = halvB * 0.66; cy = halvH * 0.3;
        cx += halvB * 0.12 * e; cy += 0.2 * e;
        dim = 0.9 - 0.45 * e;
      } else {
        r = Math.min(0.24 * halvH, 0.55 * halvB);
        cx = halvB * 0.66; cy = halvH * 0.66;
        cy += halvH * 0.9 * e; // glider op og ud af billedet, så teksten står frit
        dim = 0.55 - 0.3 * e;
      }
      flow = 0.85 - 0.2 * e;
    }
    return { cx: cx, cy: cy, sc: r / 1.2, dim: dim, flow: flow, aspect: aspect, halvH: halvH, halvB: halvB, s: s };
  }

  function opdater(dt) {
    var mal = maal(forside, window.scrollY);
    // Efter et sideskift står skulpturen et øjeblik, hvor den stod, og glider så på plads
    var a = forste ? 1 : (tid < holdTil ? 0 : 1 - Math.exp(-dt * 3.2));
    forste = false;
    cur.cx += (mal.cx + m.x * 0.06 * mal.halvH - cur.cx) * a;
    cur.cy += (mal.cy + m.y * 0.05 * mal.halvH - cur.cy) * a;
    cur.sc += (mal.sc - cur.sc) * a;
    cur.dim += (mal.dim - cur.dim) * a;
    cur.flow += (mal.flow - cur.flow) * a;

    // Markør: brug den rigtige, ellers en langsom svæven
    var tomgang = rolig ? 0 : (tid - mus.sidst > 4 ? 1 : 0);
    var tx = tomgang ? svaevX(tid) : mus.x, ty = tomgang ? svaevY(tid) : mus.y;
    var b = 1 - Math.exp(-dt * (tomgang ? 0.8 : 4.5));
    m.x += (tx - m.x) * b;
    m.y += (ty - m.y) * b;

    cur.spin = tid * 0.12 + mal.s * 1.6;
    return mal;
  }

  // Drejningen af båndet samles i én matrix, så grafikkortet slipper for at regne den pr. pixel
  var M = new Float32Array(9);
  function drej(a, x, y) { var c = Math.cos(a), s = Math.sin(a); return [c * x + s * y, -s * x + c * y]; }
  function baandMatrix(a1, a2, a3) {
    for (var k = 0; k < 3; k++) {
      var x = k === 0 ? 1 : 0, y = k === 1 ? 1 : 0, z = k === 2 ? 1 : 0, q;
      q = drej(a1, y, z); y = q[0]; z = q[1];
      q = drej(a2, x, y); x = q[0]; y = q[1];
      q = drej(a3, x, z); x = q[0]; z = q[1];
      M[k * 3] = x; M[k * 3 + 1] = y; M[k * 3 + 2] = z;
    }
    return M;
  }

  function tegn(mal) {
    resize();
    gl.viewport(0, 0, W, H);

    var aspect = mal.aspect;
    var mux = m.x * 0.5 * aspect, muy = m.y * 0.5;           // markør i skærmkoordinater
    var mwx = m.x * mal.halvB, mwy = m.y * mal.halvH;          // markør i verden
    var dx = (mwx - cur.cx) / cur.sc, dy = (mwy - cur.cy) / cur.sc, dz = 0.9;
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    var naer = Math.min(Math.sqrt(dx * dx + dy * dy), 3) / 3;
    var rk = 0.8 + 0.34 * naer;
    var lx = m.x * 1.3, ly = 0.55 + m.y * 0.6, lz = 0.85;
    var ll = Math.sqrt(lx * lx + ly * ly + lz * lz);

    gl.disable(gl.BLEND);
    gl.useProgram(sceneProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(uS.uRes, W, H);
    gl.uniform1f(uS.uTime, tid);
    gl.uniform2f(uS.uMouse, mux, muy);
    gl.uniform3f(uS.uCenter, cur.cx, cur.cy, 0);
    gl.uniform1f(uS.uScale, cur.sc);
    gl.uniform1f(uS.uDim, cur.dim);
    gl.uniform1f(uS.uFlow, cur.flow);
    gl.uniform3f(uS.uDrop, dx / len * rk, dy / len * rk, dz / len * rk);
    gl.uniform3f(uS.uLight, lx / ll, ly / ll, lz / ll);
    gl.uniformMatrix3fv(uS.uBand, false, baandMatrix(m.y * 0.45 + 0.5, m.x * 0.36 - 0.35, cur.spin));
    for (var i = 0; i < 3; i++) {
      var ang = tid * (0.45 + 0.12 * i) + i * 2.1;
      var rad = 0.74 + 0.16 * Math.sin(tid * 0.6 + i * 1.7);
      gl.uniform4f(uS["uOrb" + i], Math.cos(ang) * rad, Math.sin(ang * 1.3 + i) * 0.32, Math.sin(ang) * rad, 0.075 + 0.025 * i);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(aPos);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(sparkProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 4, gl.FLOAT, false, 0, 0);
    gl.uniform1f(uP.uTime, tid);
    gl.uniform2f(uP.uRes, W, H);
    gl.uniform2f(uP.uMouse, mux, muy);
    gl.uniform2f(uP.uFocus, cur.cx / (mal.halvH * 2), cur.cy / (mal.halvH * 2));
    gl.uniform1f(uP.uPx, H / window.innerHeight);
    gl.uniform1f(uP.uAmount, 0.55 + 0.45 * cur.dim);
    gl.drawArrays(gl.POINTS, 0, ANTAL_GNISTER);
    gl.disableVertexAttribArray(aSeed);
  }

  // Tilpas opløsningen, så animationen kører glat på svage maskiner
  var maalinger = 0, sum = 0, gode = 0, traege = 0;
  function tilpas(dt) {
    sum += dt; maalinger++;
    if (maalinger < 40) return;
    var snit = sum / maalinger * 1000;
    sum = 0; maalinger = 0;
    // Er maskinen for svag selv ved laveste opløsning, står baggrunden stille i stedet
    if (kvalitet <= KVAL_MIN && snit > 45) {
      if (++traege >= 3) { pauset = true; opdaterKnap(); }
      return;
    }
    traege = 0;
    if (snit > 24 && kvalitet > KVAL_MIN) { kvalitet = Math.max(KVAL_MIN, kvalitet * 0.85); gode = 0; }
    else if (snit < 18 && kvalitet < KVAL_MAX) { if (++gode >= 3) { kvalitet = Math.min(KVAL_MAX, kvalitet * 1.08); gode = 0; } }
    else gode = 0;
  }

  function koerer() { return !rolig && !pauset && !document.hidden && !gl.isContextLost(); }

  function frame(nu) {
    raf = 0;
    var raa = sidst ? Math.max((nu - sidst) / 1000, 0) : 1 / 60;
    var dt = Math.min(raa, 0.1);
    sidst = nu;
    // Tiden går som uret, så skulpturen står det samme sted på næste side.
    // Efter en lang pause (fx en skjult fane) fortsætter den roligt i stedet for at springe.
    if (koerer()) { tid += raa > 0.25 ? dt : raa; tilpas(dt); }
    tegn(opdater(dt));
    if (koerer()) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!raf && !gl.isContextLost()) { sidst = 0; raf = requestAnimationFrame(frame); }
  }
  function tegnEnGang() {
    if (!raf && !gl.isContextLost()) raf = requestAnimationFrame(frame);
  }

  /* ---------- Hændelser ---------- */

  function peg(x, y) {
    mus.x = x / window.innerWidth * 2 - 1;
    mus.y = -(y / window.innerHeight * 2 - 1);
    mus.sidst = tid;
  }
  window.addEventListener("pointermove", function (e) { peg(e.clientX, e.clientY); }, { passive: true });
  // Efter et sideskift ved browseren, hvor musen står, før den flyttes
  window.addEventListener("pointerover", function (e) {
    if (e.pointerType !== "touch") peg(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener("resize", function () { if (!koerer()) { forste = true; tegnEnGang(); } }, { passive: true });
  window.addEventListener("scroll", function () { if (!koerer()) { forste = true; tegnEnGang(); } }, { passive: true });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });

  function skiftRolig(e) {
    rolig = e.matches;
    opdaterKnap();
    rolig ? tegnEnGang() : start();
  }
  if (roligMQ.addEventListener) roligMQ.addEventListener("change", skiftRolig);
  else if (roligMQ.addListener) roligMQ.addListener(skiftRolig);

  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); if (raf) cancelAnimationFrame(raf); raf = 0; }, false);
  canvas.addEventListener("webglcontextrestored", function () {
    try { init(); W = H = 0; forste = true; start(); } catch (err) { canvas.remove(); }
  }, false);

  /* ---------- Pauseknap (WCAG 2.2.2: bevægelse skal kunne stoppes) ---------- */

  var knap = document.createElement("button");
  knap.type = "button";
  knap.className = "scene-knap";
  knap.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path class="ikon-pause" d="M6 4h2.5v12H6zM11.5 4H14v12h-2.5z"/><path class="ikon-start" d="M6 4l10 6-10 6z"/></svg><span class="skjult"></span>';
  var knapTekst = knap.querySelector("span");
  function opdaterKnap() {
    var stille = pauset || rolig;
    knapTekst.textContent = stille ? "Start animationen i baggrunden" : "Stop animationen i baggrunden";
    knap.title = stille ? "Start animationen" : "Stop animationen";
    knap.classList.toggle("er-stoppet", stille);
  }
  knap.addEventListener("click", function () {
    if (rolig) { rolig = false; pauset = false; }
    else pauset = !pauset;
    opdaterKnap();
    if (!pauset) start();
  });
  opdaterKnap();
  // Knappen står i menulinjen, så den altid er inden for rækkevidde
  var plads = document.querySelector(".top__handling");
  if (plads) plads.insertBefore(knap, plads.firstChild);
  else { knap.classList.add("scene-knap--fast"); document.body.appendChild(knap); }

  // Kom man fra en anden side, starter skulpturen, hvor den stod dér
  var fra = document.documentElement.getAttribute("data-fra");
  if (fra && !rolig) {
    // Musen står sandsynligvis på det menupunkt, der blev klikket på
    var punkt = document.querySelector('.nav [aria-current="page"]') || (forside && document.querySelector(".brand"));
    var r = punkt && window.matchMedia("(hover: hover) and (pointer: fine)").matches ? punkt.getBoundingClientRect() : null;
    if (r && r.width) { peg(r.left + r.width / 2, r.top + r.height / 2); m.x = mus.x; m.y = mus.y; }
    var start0 = maal(fra === "forside", 0);
    cur.cx = start0.cx + m.x * 0.06 * start0.halvH;
    cur.cy = start0.cy + m.y * 0.05 * start0.halvH;
    cur.sc = start0.sc; cur.dim = start0.dim; cur.flow = start0.flow;
    forste = false;
    holdTil = tid + 0.35;
  } else {
    forste = true;
  }
  // Første billede tegnes med det samme, så baggrunden er klar, når siden vises
  frame(performance.now());
})();
