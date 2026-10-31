/* Lion’s Legacy — 3D-baggrund
   Løven fra logoet i poleret guld, gnister og en glødende guld/orange strøm.
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
    "uniform vec3 uLight;",
    "uniform mat3 uDrej;",    // løvens drejning mod markøren (beregnes i JavaScript)
    "uniform sampler2D uLogo;", // løvens omrids som afstandsfelt (se logoFelt)
    "uniform float uLogoN;",  // feltets størrelse i pixels

    "const float FL = 2.2;",
    "const int STEP = 40;",
    "const vec3 RO = vec3(0.0, 0.0, 6.0);",

    "float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);",
    "  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}",
    "float fbm(vec2 p){float v=0.0,a=0.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);",
    "  for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=0.5;}return v;}",

    // Guld/orange farveskala til strømmen (sRGB)
    "vec3 ramp(float x){",
    "  vec3 c0=vec3(0.035,0.031,0.027),c1=vec3(0.20,0.075,0.025),c2=vec3(0.66,0.25,0.06),c3=vec3(0.95,0.56,0.18),c4=vec3(1.0,0.86,0.58);",
    "  x=clamp(x,0.0,1.0);",
    "  if(x<0.3)return mix(c0,c1,x/0.3);",
    "  if(x<0.6)return mix(c1,c2,(x-0.3)/0.3);",
    "  if(x<0.82)return mix(c2,c3,(x-0.6)/0.22);",
    "  return mix(c3,c4,(x-0.82)/0.18);}",

    // Løvens omrids: afstand til logoet i planet (negativ inde i stregerne).
    // Feltet dækker -1..1. Til lysberegningen læses det blødt (bloedt), så guldet ikke får små riller.
    "vec4 kub(float v){vec4 n=vec4(1.0,2.0,3.0,4.0)-v;vec4 s=n*n*n;",
    "  float x=s.x,y=s.y-4.0*s.x,z=s.z-4.0*s.y+6.0*s.x;return vec4(x,y,z,6.0-x-y-z)/6.0;}",
    "vec4 bloedt(vec2 uv){",
    "  vec2 st=uv*uLogoN-0.5;vec2 f=fract(st);st-=f;",
    "  vec4 xc=kub(f.x),yc=kub(f.y);",
    "  vec4 c=st.xxyy+vec2(-0.5,1.5).xyxy;",
    "  vec4 s=vec4(xc.xz+xc.yw,yc.xz+yc.yw);",
    "  vec4 o=(c+vec4(xc.yw,yc.yw)/s)/uLogoN;",
    "  vec4 a=texture2D(uLogo,o.xz),b=texture2D(uLogo,o.yz),e=texture2D(uLogo,o.xw),d=texture2D(uLogo,o.yw);",
    "  float sx=s.x/(s.x+s.y),sy=s.z/(s.z+s.w);",
    "  return mix(mix(d,e,sx),mix(b,a,sx),sy);}",
    "vec2 feltUV(vec2 q){return clamp(vec2(0.5+q.x*0.5,0.5-q.y*0.5),0.001,0.999);}",
    "float logo(vec4 t,vec2 q){",
    "  float fin=(t.a-0.5)*0.04;",
    "  float d=abs(fin)<0.0195?fin:(t.r-0.5)*0.25;",
    "  vec2 o=abs(q)-0.999;",
    "  return max(d,length(max(o,0.0)));}",
    // Løven, regnet i dens eget koordinatsystem (q): logoets streger som afrundet,
    // poleret guld, hvor en bølge af lys løber op. l er afstanden til logoet i planet.
    "float form(vec3 q,float l){",
    "  float flow=pow(0.5+0.5*sin(q.y*3.0-uTime*1.4),8.0);",
    "  float H=0.05+0.01*flow;",
    "  l=l*1.12-0.016-0.006*flow;",
    "  return (length(vec2(max(l+H,0.0),q.z))-H)*0.9;}",
    "float map(vec3 q){vec2 s=q.xy/1.12;return form(q,logo(texture2D(uLogo,feltUV(s)),s));}",
    "float mapGlat(vec3 q){vec2 s=q.xy/1.12;return form(q,logo(bloedt(feltUV(s)),s));}",

    // Fladens retning i verden (prøverne tages langs verdens akser, regnet om til løvens)
    "vec3 normal(vec3 q){vec2 e=vec2(0.002,-0.002);",
    "  return normalize(e.xyy*mapGlat(q+uDrej*e.xyy)+e.yyx*mapGlat(q+uDrej*e.yyx)+e.yxy*mapGlat(q+uDrej*e.yxy)+e.xxx*mapGlat(q+uDrej*e.xxx));}",

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
    // Strålen regnes om til løvens eget koordinatsystem (afstande i løvens mål).
    // Løven er flad, så strålen springer direkte frem til løvens tykkelse (|z| < 0.08)
    // og skal kun tage få skridt. Det holder arbejdet for grafikkortet lille.
    "  vec3 ro=uDrej*((RO-uCenter)/uScale),rl=uDrej*rd;",
    "  float iz=1.0/(abs(rl.z)>0.001?rl.z:0.001);",
    "  float s0=(-0.08-ro.z)*iz,s1=(0.08-ro.z)*iz;",
    "  float a0=max(max(tc-sqrt(max(h2,0.0)),0.0)/uScale,min(s0,s1));",
    "  float a1=min((tc+sqrt(max(h2,0.0)))/uScale,max(s0,s1));",
    "  if(h2>0.0&&a1>a0&&uDim>0.01){",
    "    float px=1.0/(uRes.y*FL);",
    "    float t=a0,best=1e9,bt=a0;bool hit=false;",
    "    for(int i=0;i<STEP;i++){",
    "      float h=map(ro+rl*t);",
    "      float k=h/(px*t);",
    "      if(k<best){best=k;bt=t;}",
    "      if(k<0.3){hit=true;break;}",
    "      t+=h;if(t>a1)break;",
    "    }",
    // Bløde kanter: pixels, der næsten rammer, blandes delvist
    "    float cov=hit?1.0:1.0-smoothstep(0.3,1.5,best);",
    "    if(cov>0.0){",
    "      if(!hit)t=bt;",
    "      vec3 q=ro+rl*t,n=normal(q);",
    "      vec3 r=reflect(rd,n);",
    "      float ndv=max(dot(n,-rd),0.0);",
    "      vec3 gold=vec3(1.0,0.71,0.29);",
    "      vec3 F=gold+(1.0-gold)*pow(1.0-ndv,5.0);",
    "      float ao=clamp(map(q+(uDrej*n)*0.09)/0.09,0.0,1.0);",
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

  /* ---------- Løven fra logoet ----------
     Stregerne er kopieret fra assets/img/maerke.svg. Ændres logoet, så kopier
     de nye d-værdier hertil: den første sti tegnes som streg, resten fyldes. */

  var LOGO_STREG = "M49.6 75.8C49.4 75.7 49 75.5 48.7 75.4C48.5 75.3 48.1 75.2 48 75.1C47.8 75 47.6 74.9 46.7 74.6C45.8 74.3 44.1 73.5 43.5 73.1C43.3 73 43 72.8 42.8 72.7C40.7 71.6 38.1 69.2 36.9 67.3C36.8 67.1 36.6 66.8 36.5 66.6C36 65.8 35.4 64.5 35.2 63.5C35.1 63.1 35 62.9 34.8 61.9C34.7 61.4 34.6 59.6 34.6 58.2C34.5 57.5 34.5 53.4 34.5 49.1L34.5 41.3L34.6 40.9C34.7 40.6 34.7 40.3 34.7 40.3C34.7 40 34.8 40.1 34.9 40.5C35.1 40.9 35.2 41.1 35.3 41.4C35.6 42 35.9 42.5 36 42.8C36.1 42.9 36.2 43.1 36.2 43.1C36.2 43.1 36.5 43.6 36.9 44.1C37.3 44.6 37.8 45.1 39.5 46.6C39.9 47.1 40.3 47.5 40.4 47.6L40.5 47.7L40.4 48.0C40.3 48.3 39.9 49.1 39 51.1C38.5 51.9 38.2 53 38 53.9C38 54.4 38 55.7 38 56.2C38.3 57.6 39.1 59.1 40.2 59.8C40.9 60.4 41.3 60.5 42 60.5C42.7 60.5 43.6 60.3 45.5 59.4C45.7 59.4 46.2 59.2 46.6 59.0C48 58.4 49.1 57.8 49.3 57.5C49.4 57.4 49.4 57.3 49.4 56.7C49.4 55.9 49.3 55.7 49.1 55.1C48.8 54.5 48 53.7 47.3 53.2C46.9 52.9 45.9 52.2 45.4 51.8C44.5 51.1 44.2 50.6 44.1 50.0C44 49.5 44.1 49.5 44.3 49.7C44.6 49.9 44.9 50 45.9 50.1C46.2 50.2 46.6 50.2 46.7 50.2C46.9 50.3 47.2 50.3 47.4 50.3C47.7 50.4 47.9 50.4 47.9 50.4C48 50.5 49.2 50.6 50 50.6C50.7 50.6 52 50.5 52.1 50.4C52.1 50.4 52.3 50.4 52.5 50.3C52.8 50.3 53.1 50.3 53.2 50.2C53.4 50.2 53.8 50.2 54.1 50.1C55.1 50 55.4 49.9 55.6 49.7C55.9 49.5 55.9 49.5 55.9 50.0C55.8 50.6 55.4 51.1 54.6 51.8C54 52.2 53 52.9 52.7 53.2C52 53.7 51.2 54.5 50.9 55.1C50.6 55.7 50.6 55.9 50.6 56.7C50.6 57.3 50.6 57.4 50.7 57.5C50.9 57.8 52 58.4 53.4 59.0C53.8 59.2 54.3 59.4 54.4 59.4C56.3 60.3 57.2 60.5 58 60.5C58.6 60.5 59.1 60.4 59.8 59.8C60.8 59.1 61.7 57.6 61.9 56.2C62 55.7 62 54.4 61.9 53.9C61.8 53 61.4 51.9 61 51.1C60 49.1 59.6 48.3 59.5 48.0L59.4 47.7L59.6 47.6C59.6 47.5 60 47.1 60.5 46.6C62.1 45.1 62.6 44.6 63 44.1C63.4 43.6 63.7 43.1 63.7 43.1C63.7 43.1 63.8 42.9 63.9 42.8C64.1 42.5 64.4 42 64.7 41.4C64.8 41.1 64.9 40.9 65 40.5C65.1 40.1 65.2 40 65.2 40.3C65.2 40.3 65.3 40.6 65.3 40.9L65.4 41.3L65.4 49.1C65.4 53.4 65.4 57.5 65.4 58.2C65.4 59.6 65.2 61.4 65.1 61.9C64.9 62.9 64.9 63.1 64.8 63.5C64.5 64.5 64 65.8 63.5 66.6C63.4 66.8 63.2 67.1 63 67.3C61.9 69.2 59.3 71.6 57.2 72.7C57 72.8 56.6 73 56.5 73.1C55.9 73.5 54.2 74.3 53.3 74.6C52.4 74.9 52.2 75 52 75.1C51.8 75.2 51.5 75.3 51.2 75.4C50.9 75.5 50.5 75.7 50.3 75.8C50.1 75.8 50 75.9 50 75.9C50 75.9 49.8 75.8 49.6 75.8ZM50.1 72.3C50.4 71.5 52.1 69.5 53.5 68.3C55.5 66.7 56.3 65.9 56.6 65.2C56.9 64.6 57.2 63.6 57.2 63.0C57.2 62.8 57.2 62.7 57.1 62.6C57 62.5 56.1 61.9 56 61.9C55.9 61.8 55.8 61.8 55.7 61.7C55.6 61.6 55.3 61.5 55.1 61.4C54.8 61.2 54.4 61 54.1 60.9C53.7 60.6 52.8 60.2 52.4 60.1C51.9 59.9 51.4 59.8 51.2 59.7C51.1 59.7 50.9 59.7 50.7 59.6C50.5 59.6 50.2 59.6 50 59.6C49.7 59.6 49.4 59.6 49.3 59.6C49.1 59.7 48.9 59.7 48.7 59.7C48.5 59.8 48.1 59.9 47.5 60.1C47.1 60.2 46.3 60.6 45.8 60.9C45.6 61 45.1 61.2 44.9 61.4C44.7 61.5 44.4 61.6 44.3 61.7C44.1 61.8 44 61.8 44 61.9C43.9 61.9 43 62.5 42.9 62.6C42.6 62.9 42.9 64.3 43.3 65.2C43.7 65.9 44.4 66.7 46.4 68.3C47.9 69.5 49.6 71.5 49.9 72.3C49.9 72.4 50 72.4 50 72.4C50 72.4 50 72.4 50.1 72.3ZM22.5 66.8C22.5 66.6 22.2 66.2 22 65.8C20.9 63.7 20.2 61.8 19.8 60.3C19.8 60.2 19.8 59.9 19.7 59.7C19.7 59.5 19.6 59 19.5 58.6C19.5 58.3 19.4 57.7 19.4 57.5C19.3 57.1 19.3 56.8 19.3 55.6C19.4 53.5 19.6 52.1 20.2 49.8C20.2 49.7 20.4 49.2 20.5 48.8C21.1 47.2 21.1 47.4 22 45.4C22.6 44.2 24.1 41.9 25 40.9C25.1 40.7 25.4 40.4 25.6 40.2L25.9 39.9L26.6 39.8C27.8 39.8 28.3 39.9 28.8 40.3C29 40.5 29.1 40.7 29.3 41.2C29.4 41.5 29.4 41.5 29.4 43.7C29.4 45.9 29.3 46.3 29.1 47.1C29.1 47.2 29.1 47.4 29 47.5C28.8 48.2 28.2 49.8 27.9 50.1C27.9 50.2 27.8 50.3 27.8 50.4C27.7 50.6 27.5 50.9 27.3 51.2C27.1 51.5 26.8 52.1 26.5 52.6C26.2 53 25.9 53.5 25.9 53.5C25.8 53.7 25.7 53.8 25.5 54.2C25.3 54.7 25.1 54.9 24.9 55.2C24.6 55.8 24.1 56.9 24 57.3C24 57.3 23.9 57.5 23.9 57.6C23.4 58.9 22.8 61.3 22.8 62.1C22.8 62.2 22.8 62.5 22.7 62.8C22.6 63.5 22.6 65.2 22.7 66.1C22.8 67 22.8 67.1 22.7 67.1C22.7 67.1 22.6 66.9 22.5 66.8ZM77.2 66.9C77.2 66.9 77.2 66.5 77.2 66.1C77.3 65.2 77.3 63.5 77.2 62.8C77.2 62.5 77.2 62.2 77.2 62.1C77.2 61.3 76.6 58.9 76.1 57.6C76 57.5 76 57.3 76 57.3C75.8 56.9 75.3 55.8 75 55.2C74.9 54.9 74.7 54.6 74.5 54.2C74.2 53.8 74.2 53.7 74.1 53.5C74 53.5 73.8 53 73.5 52.6C73.2 52.1 72.8 51.5 72.6 51.2C72.5 50.9 72.3 50.6 72.2 50.4C72.1 50.3 72 50.2 72 50.1C71.8 49.8 71.1 48.2 70.9 47.5C70.9 47.4 70.8 47.2 70.8 47.1C70.6 46.3 70.6 45.9 70.6 43.7C70.6 41.5 70.6 41.5 70.7 41.2C70.8 40.7 70.9 40.5 71.2 40.3C71.7 39.9 72.1 39.8 73.4 39.8L74 39.9L74.4 40.2C74.5 40.4 74.8 40.7 75 40.9C75.8 41.9 77.3 44.2 77.9 45.4C78.9 47.4 78.8 47.2 79.4 48.8C79.6 49.2 79.7 49.7 79.8 49.9C80 50.5 80 50.6 80.1 51.1C80.3 51.8 80.4 52.7 80.5 53.7C80.7 54.6 80.7 56.9 80.6 57.5C80.5 57.7 80.5 58.3 80.4 58.6C80.4 59 80.3 59.5 80.2 59.7C80.2 59.9 80.1 60.2 80.1 60.3C79.8 61.8 79 63.7 78 65.8C77.7 66.2 77.5 66.6 77.4 66.8C77.3 67.1 77.2 67.1 77.2 66.9ZM44.9 45.9C44.9 43.8 44.6 42.6 43.8 41.5C43.5 41.2 43.4 41.1 42.4 41.1C40.5 41 39.7 40.5 37.7 38.2C37.4 37.9 37.1 37.6 37 37.5C37 37.5 36.9 37.4 36.9 37.4C36.9 37.3 37.9 37.3 38.8 37.4C39.2 37.4 39.8 37.4 40.3 37.5C42.5 37.6 43.7 37.9 44.5 38.7C44.8 39 45 39.2 45.2 39.6C45.8 40.8 46 43.1 45.6 44.8C45.5 45.1 45.5 45.4 45.5 45.4C45.5 45.5 45.4 45.7 45.3 46.0C45 46.7 45 46.7 45 46.8C44.9 46.8 44.9 46.8 44.9 45.9ZM55 46.8C54.9 46.6 54.5 45.6 54.5 45.4C54.5 45.4 54.4 45.1 54.4 44.8C54 43.1 54.1 40.8 54.8 39.6C55 39.2 55.1 39 55.4 38.7C56.3 37.9 57.5 37.6 59.6 37.5C60.1 37.4 60.8 37.4 61.1 37.4C62 37.3 63 37.3 63 37.4C63 37.4 63 37.5 62.9 37.5C62.9 37.6 62.6 37.9 62.3 38.2C60.2 40.5 59.5 41 57.5 41.1C56.6 41.1 56.5 41.2 56.2 41.5C55.4 42.6 55.1 43.8 55.1 45.8C55.1 46.4 55.1 46.8 55.1 46.8C55.1 46.8 55 46.8 55 46.8ZM18.7 46.3C18.7 45.1 18.9 43.7 19 42.8C19.3 41.2 19.9 39.2 20.4 38.1C20.5 37.8 20.6 37.5 20.6 37.5C20.6 37.4 21.4 36 21.6 35.6C21.7 35.6 21.7 35.5 21.7 35.5C21.7 35.4 21.8 35.3 21.8 35.2C21.9 35.1 22 35 22 34.9C22.2 34.6 22.6 34 22.8 33.8C23 33.6 23.3 33.3 23.5 33.0C23.7 32.7 24 32.3 24.1 32.2C24.4 31.9 25.6 30.8 26.1 30.4C26.2 30.2 26.5 30 26.6 29.9C26.8 29.7 28.2 28.9 28.3 28.9C28.3 28.9 28.5 28.8 28.6 28.7C29.1 28.4 30.2 27.9 30.7 27.8C31.2 27.7 31.4 27.6 31.7 27.5C32 27.5 32.4 27.4 32.6 27.3C32.8 27.3 33.1 27.2 33.3 27.2C33.8 27.1 36 27.1 36.7 27.2C37.4 27.3 38.2 27.4 38.4 27.5C38.8 27.6 39.4 27.8 39.5 27.8C39.7 27.8 39.7 27.9 39.5 28.0C39.4 28 39.3 28.1 39.2 28.1C39.1 28.2 38.6 28.4 38.1 28.6C37.6 28.8 37.1 29 36.8 29.1C35.7 29.8 35.6 29.8 35.4 29.9C34.5 30.5 33.3 31.4 32.2 32.3C31.5 32.9 31.4 33 30.7 33.6C30.1 34 28.7 35 27.6 35.6C26.9 36 26.9 36.1 26.8 36.1C26.8 36.1 26.6 36.3 26.3 36.4C26.1 36.6 25.7 36.9 25.4 37.1C23.4 38.5 21.8 40.4 20.4 42.9C19.9 43.9 19.1 45.6 18.9 46.1C18.8 46.4 18.7 46.5 18.7 46.3ZM81.1 46.3C81.1 46.3 81.1 46.3 81.1 46.2C81.1 46 80.3 44.4 79.9 43.5C79.2 42.2 79.2 42.3 78.7 41.6C77.6 39.8 76.2 38.3 74.5 37.1C74.2 36.9 73.8 36.6 73.6 36.4C73.4 36.3 73.2 36.1 73.1 36.1C73.1 36.1 73 36 72.3 35.6C71.7 35.3 71.6 35.2 70.4 34.4C69.7 33.9 69.4 33.7 67.8 32.3C66.7 31.4 65.5 30.5 64.5 29.9C64.4 29.8 64.3 29.8 63.1 29.1C62.9 29 62.3 28.8 61.8 28.6C61.3 28.4 60.9 28.2 60.8 28.1C60.7 28.1 60.5 28 60.5 28.0C60.3 27.9 60.3 27.8 60.4 27.8C60.5 27.8 61.1 27.6 61.5 27.5C61.8 27.4 62.6 27.3 63.2 27.2C64 27.1 66.1 27.1 66.7 27.2C66.8 27.2 67.1 27.3 67.4 27.3C67.6 27.4 68 27.5 68.2 27.5C68.6 27.6 68.8 27.7 69.2 27.8C69.8 27.9 70.9 28.4 71.3 28.7C71.5 28.8 71.6 28.9 71.7 28.9C71.7 28.9 73.1 29.7 73.3 29.9C73.5 30 73.7 30.2 73.9 30.4C74.4 30.8 75.6 31.9 75.8 32.2C76 32.3 76.3 32.7 76.5 33.0C76.7 33.3 77 33.6 77.1 33.8C77.3 34 77.7 34.6 77.9 34.9C78 35.1 78.1 35.3 78.3 35.5C78.3 35.6 78.3 35.6 78.4 35.7C78.4 35.7 78.5 35.9 78.6 36.0C78.7 36.2 79.3 37.5 79.3 37.5C79.3 37.5 79.4 37.8 79.6 38.1C80.1 39.2 80.7 41.2 80.9 42.8C81.1 43.7 81.2 45.1 81.2 46.2C81.2 46.4 81.2 46.4 81.1 46.3ZM49 30.2C48.6 29.7 47.2 28.7 46.2 28.1C45.3 27.5 43.7 26.9 42.4 26.7C42 26.6 39.2 25.9 39.1 25.9C39 25.8 37.5 25.5 36.4 25.4C34.4 25.1 32 25.1 30.3 25.4C29.2 25.7 28.9 25.8 28.4 26.0C28.4 26 28.1 26.1 27.8 26.2C27.3 26.4 27 26.6 25.9 27.1C25.3 27.5 24.5 28 23.8 28.5C23.6 28.7 23.4 28.8 23.4 28.8C23.3 28.8 23.4 28.6 23.5 28.5C23.6 28.3 23.7 28.1 23.7 28.0C23.9 27.7 24.3 27 24.4 26.8C24.5 26.7 24.5 26.6 24.5 26.6C24.5 26.6 25.4 25.3 25.8 24.8C27.2 23 29.5 21.3 31.3 20.8C32.1 20.5 32.7 20.4 33.4 20.2C34.1 20.1 36.1 20.1 36.7 20.2C39 20.7 40.5 21.2 42.4 22.3C43.1 22.6 44.3 23.4 44.7 23.8C45.2 24.2 46.3 25.4 46.6 25.8C46.7 25.9 47 26.1 47.1 26.3C47.3 26.5 47.6 26.9 47.8 27.2C48 27.5 48.1 27.8 48.2 27.9C48.2 27.9 48.3 28.1 48.4 28.3C48.5 28.5 48.7 28.9 48.8 29.1C49 29.6 49.3 30.3 49.3 30.4C49.3 30.4 49.2 30.4 49 30.2ZM50.6 30.4C50.6 30.3 50.9 29.6 51.2 29.1C51.3 28.9 51.5 28.5 51.5 28.3C51.6 28.1 51.7 27.9 51.8 27.9C51.8 27.8 52 27.5 52.2 27.2C52.4 26.9 52.7 26.5 52.8 26.3C53 26.1 53.2 25.9 53.3 25.8C53.6 25.4 54.8 24.2 55.2 23.8C55.7 23.4 56.9 22.6 57.5 22.3C59.4 21.2 60.9 20.7 63.3 20.2C63.9 20.1 65.8 20.1 66.5 20.2C67.2 20.4 67.8 20.5 68.7 20.8C70.4 21.3 72.7 23 74.1 24.8C74.5 25.3 75.4 26.6 75.4 26.6C75.4 26.6 75.5 26.7 75.5 26.8C75.7 27 76 27.7 76.2 28.0C76.3 28.1 76.4 28.3 76.5 28.5C76.6 28.6 76.6 28.8 76.6 28.8C76.6 28.8 76.4 28.7 76.2 28.5C75.5 28 74.7 27.5 74 27.1C72.9 26.6 72.6 26.4 72.2 26.2C71.9 26.1 71.6 26 71.5 26.0C71.1 25.8 70.7 25.7 69.6 25.4C67.9 25.1 65.6 25.1 63.5 25.4C62.5 25.5 60.9 25.8 60.8 25.9C60.8 25.9 58 26.6 57.5 26.7C56.2 26.9 54.7 27.5 53.7 28.1C52.8 28.7 51.4 29.7 50.9 30.2C50.7 30.4 50.6 30.4 50.6 30.4ZM49.8 28.7C49.8 28.6 49.8 28.5 49.7 28.3C49.5 27.6 48.7 25.9 48.4 25.4C48.3 25.2 48 24.9 47.9 24.6C47.3 23.6 46.4 22.7 45.4 21.8C45.1 21.5 44.4 21 44.4 21.0C44.4 21 44.3 20.9 44.2 20.9C43.3 20.2 42.3 19.7 41.3 19.4C39 18.6 37.4 18.4 34.1 18.5C33.1 18.5 32.3 18.5 32.3 18.5C32.2 18.5 33.2 18 33.6 17.8C33.8 17.8 34 17.7 34.2 17.6C34.4 17.5 34.7 17.4 34.9 17.3C35.1 17.3 35.5 17.1 35.7 17.1C35.9 17 36.3 16.9 36.5 16.8C36.9 16.7 38.1 16.3 38.4 16.2C38.4 16.1 38.8 16 39.2 15.9C39.5 15.8 40.1 15.6 40.4 15.5C40.9 15.3 41 15.2 41.3 15.1C41.6 15 41.9 14.9 42.2 14.8C42.4 14.7 42.7 14.6 42.8 14.6C42.9 14.5 43 14.5 43.1 14.4C43.2 14.4 43.5 14.3 43.7 14.2C43.8 14.1 44.2 13.9 44.5 13.8C45.1 13.6 45.9 13.2 46.4 12.9C46.4 12.8 46.5 12.8 46.5 12.8C46.6 12.7 46.7 12.7 46.7 12.6C46.8 12.6 47 12.5 47.1 12.4C47.8 12 48.9 10.9 49.5 10.2C49.6 10.1 49.7 10 49.7 10.0C49.7 9.9 49.8 10 49.8 10.1L50 10.2L50.1 10.1C50.2 10 50.3 9.9 50.3 10.0C50.3 10 50.4 10.1 50.5 10.2C51 10.9 52.2 12 52.8 12.4C53 12.5 53.2 12.6 53.2 12.6C53.3 12.7 53.4 12.7 53.4 12.8C53.5 12.8 53.6 12.8 53.6 12.9C54.1 13.2 54.8 13.6 55.5 13.8C55.7 13.9 56.1 14.1 56.3 14.2C56.5 14.3 56.7 14.4 56.8 14.4C56.9 14.5 57.1 14.5 57.2 14.6C57.3 14.6 57.5 14.7 57.7 14.8C58 14.9 58.4 15 58.7 15.1C58.9 15.2 59.1 15.3 59.6 15.5C59.9 15.6 60.4 15.8 60.8 15.9C61.1 16 61.5 16.1 61.6 16.2C61.8 16.3 63 16.7 63.5 16.8C63.7 16.9 64.1 17 64.3 17.1C64.5 17.1 64.8 17.3 65 17.3C65.2 17.4 65.6 17.5 65.7 17.6C65.9 17.7 66.2 17.8 66.3 17.8C66.8 18 67.7 18.5 67.7 18.5C67.7 18.5 66.8 18.5 65.8 18.5C62.5 18.4 60.9 18.6 58.7 19.4C57.7 19.7 56.7 20.2 55.7 20.9C55.7 20.9 55.6 21 55.6 21.0C55.5 21 54.9 21.5 54.5 21.8C53.5 22.7 52.7 23.6 52.1 24.6C51.9 24.9 51.7 25.2 51.6 25.4C51.2 25.9 50.4 27.6 50.2 28.3C50.1 28.7 50.1 28.7 50 28.8C49.9 28.8 49.9 28.7 49.8 28.7Z";
  var LOGO_FYLD = ["M40.2 91.5C40 89 40.4 86.9 41.5 84.9C42 83.8 42.3 83.3 43.5 82.1C43.9 81.7 43.9 81.7 44 81.7C44.1 81.7 44.4 81.7 44.7 81.8C45.9 82 46.8 82.1 48.1 82.5C48.7 82.6 49.2 82.8 49.2 82.8C49.2 82.8 49.2 82.8 48.7 83.0C47.9 83.3 47.3 83.6 46.8 84.0C46.7 84.1 46.4 84.2 46.2 84.4C45.4 84.9 44.2 85.9 43.6 86.6C42.2 88.2 41.2 89.6 40.5 91.3C40.4 91.7 40.3 91.9 40.2 91.9C40.2 92 40.2 91.8 40.2 91.5ZM63 81.5C62.5 81.5 62.3 81.5 62.3 81.4C62.3 81.4 62.3 81.3 62.4 81.3C62.4 81.3 62.7 81.2 62.9 81.0C63.1 80.9 63.4 80.7 63.5 80.7C63.8 80.5 64.3 80.2 64.6 79.9C64.9 79.7 65.9 78.8 66 78.5C66.2 78.2 66.3 77.8 66.5 77.2L66.6 76.6L66.6 73.3C66.6 67.6 66.5 40.7 66.5 40.2C66.4 39.5 66.3 38.9 66 38.0C65.6 36.9 65.2 36 63.7 33.8C63.5 33.4 63.2 33 63.1 32.8C63 32.6 62.9 32.4 62.9 32.4C62.8 32.4 62.8 32.2 62.7 32.1C62.6 32 62.5 31.7 62.4 31.6C62.2 31.2 61.8 30.5 61.8 30.5C61.9 30.4 63.3 31 64.1 31.5C64.2 31.6 64.4 31.7 64.4 31.7C64.4 31.7 65.3 32.3 65.7 32.6C66.4 33.1 66.6 33.3 67.5 34.1C68.1 34.5 68.5 34.9 68.6 35.0C68.7 35.1 69 35.3 69.2 35.5C69.5 35.7 69.8 36.1 70.1 36.2C70.4 36.6 71 37.1 71.5 37.6C71.7 37.7 72 38 72.2 38.1C72.4 38.3 72.6 38.6 72.8 38.7C72.9 38.8 73.1 39 73.2 39.1C73.6 39.4 73.6 39.4 72.6 39.4C71.1 39.4 70.7 39.6 70.2 40.4C70 41 70 40.4 70 50.6C70 70.9 70 74.8 70.1 76.0C70.2 76.6 70.4 77.4 70.6 77.9C71.1 79.2 72.4 80.4 74 81.2C74.5 81.5 74.4 81.5 73.2 81.5C72.7 81.5 70.3 81.5 68 81.5C65.7 81.5 63.4 81.5 63 81.5ZM56.2 81.0C56 80.9 55.7 80.7 55.5 80.5C55.2 80.3 54.9 80.1 54.7 80.0C54.3 79.7 53.6 79.2 53 78.9C52.5 78.7 51.8 78.4 51.7 78.4C51.7 78.4 51.5 78.3 51.2 78.2C51 78.1 50.8 78 50.8 78.0C50.7 78 50.7 77.9 50.8 77.8C51 77.8 51.1 77.8 51.6 77.6C51.8 77.5 52.1 77.4 52.4 77.3C53 77 53.5 76.9 53.7 76.8C53.9 76.7 54 76.6 54.1 76.6C54.2 76.6 54.3 76.5 54.5 76.5C54.6 76.4 54.9 76.3 55.3 76.1C56.5 75.6 58.2 74.7 59.1 74.1C60 73.5 60.6 73 61.4 72.2C62.7 70.9 63.4 69.9 64.4 68.0C64.6 67.6 64.8 67.2 64.8 67.2C64.9 67.2 65 69.5 65 71.7C65 74.3 64.9 74.9 64.5 76.0C64.1 77.1 62.9 78.5 61.9 79.2C61.8 79.3 61.5 79.4 61.4 79.5C61.2 79.6 61.1 79.7 61 79.7C61 79.7 60.9 79.8 60.8 79.8C60.4 80.1 59.4 80.5 58.6 80.7C57.9 80.9 57.6 81 56.8 81.1C56.7 81.1 56.5 81.1 56.5 81.2C56.4 81.2 56.3 81.1 56.2 81.0ZM71.2 74.9C71.2 74.7 71.2 73.2 71.1 69.6C71.1 67.1 71.1 63.4 71 61.3C71 55.6 71 52.2 71 52.2C71 52.2 71.1 52.3 71.2 52.5C71.3 52.6 71.5 52.9 71.6 53.1C71.9 53.4 72.5 54.4 72.5 54.4C72.5 54.4 72.6 54.7 72.8 55.0C73.1 55.5 73.5 56.3 73.5 56.4C73.5 56.4 73.8 57 74 57.5C74.2 57.7 74.3 58 74.4 58.2C75.4 60.9 75.8 62.9 75.8 65.3C75.8 66.9 75.6 68.2 75.1 69.6C74.8 70.5 73.9 72.1 73.1 73.1C72.4 73.9 71.2 75 71.2 74.9Z", "M59.6 91.8C59.6 91.7 59.4 91.4 59.3 91.1C59.1 90.6 58.9 90.2 58.6 89.7C58 88.6 57.3 87.6 56.4 86.6C55.8 85.9 54.5 84.9 53.8 84.4C53.6 84.2 53.3 84.1 53.2 84.0C52.6 83.6 52 83.3 51.3 83.0C51 82.9 50.5 82.7 50.3 82.6C49.7 82.4 49.5 82.3 48.3 82.0C47 81.7 46.3 81.6 45.1 81.4C44.8 81.3 44.4 81.3 44.1 81.2C42.5 81 41.8 80.9 40.7 80.5C40.2 80.3 39.4 80 39.1 79.8C39 79.8 38.9 79.7 38.9 79.7C38.9 79.7 38.7 79.6 38.6 79.5C38.4 79.4 38.2 79.3 38 79.2C37 78.5 35.9 77.1 35.5 76.0C35.1 74.9 35 74.3 35 71.7C35 69.5 35.1 67.2 35.2 67.2C35.2 67.2 35.4 67.6 35.6 68.0C36.5 69.9 37.2 70.9 38.5 72.2C39.4 73 40 73.5 40.8 74.1C41.8 74.7 43.5 75.6 44.7 76.1C45 76.3 45.4 76.4 45.5 76.5C45.6 76.5 45.8 76.6 45.9 76.6C45.9 76.6 46.1 76.7 46.2 76.8C46.5 76.9 46.9 77 47.6 77.3C47.8 77.4 48.2 77.5 48.4 77.6C48.7 77.7 48.7 77.7 49.6 78.0C50.2 78.3 50.4 78.4 50.9 78.6C51.1 78.7 51.3 78.8 51.3 78.8C51.4 78.8 52.1 79.1 52.6 79.3C53.5 79.8 54.2 80.2 55.6 81.3C56.2 81.7 57.3 83 57.9 83.9C58.3 84.4 58.9 85.7 59.1 86.3C59.7 88 59.9 89.6 59.8 91.5C59.8 92 59.7 92 59.6 91.8ZM26.7 81.5C25.5 81.5 25.5 81.5 26 81.2C27.5 80.4 28.8 79.2 29.3 77.9C29.5 77.4 29.7 76.6 29.8 76.0C29.9 74.8 30 70.9 30 50.6C30 40.4 30 41 29.7 40.4C29.3 39.6 28.8 39.4 27.3 39.4C26.4 39.4 26.4 39.4 26.7 39.1C26.8 39 27 38.8 27.2 38.7C27.3 38.6 27.6 38.3 27.8 38.1C28 38 28.3 37.7 28.4 37.6C28.9 37.1 29.5 36.6 29.9 36.2C30.1 36.1 30.5 35.7 30.7 35.5C31 35.3 31.2 35.1 31.3 35.0C31.4 34.9 31.9 34.5 32.4 34.1C33.4 33.3 33.6 33.1 34.3 32.6C34.7 32.3 35.5 31.7 35.6 31.7C35.6 31.7 35.7 31.6 35.9 31.5C36.7 31 38 30.4 38.1 30.5C38.2 30.5 37.8 31.2 37.6 31.6C37.5 31.7 37.3 32 37.3 32.1C37.2 32.2 37.1 32.4 37.1 32.4C37.1 32.4 37 32.6 36.9 32.8C36.8 33 36.5 33.4 36.2 33.8C34.8 36 34.3 36.9 33.9 38.0C33.7 38.9 33.5 39.5 33.5 40.2C33.4 40.7 33.3 67.6 33.4 73.3L33.4 76.6L33.5 77.2C33.6 77.8 33.8 78.2 33.9 78.5C34.1 78.8 35 79.7 35.3 79.9C35.7 80.2 36.1 80.5 36.4 80.7C36.6 80.7 36.9 80.9 37.1 81.0C37.3 81.2 37.5 81.3 37.6 81.3C37.7 81.4 37.7 81.4 37.6 81.5C37.6 81.5 28.6 81.5 26.7 81.5ZM28.2 74.5C27.3 73.7 26.7 73 26.1 72.0C24.7 69.9 24.2 68 24.2 65.3C24.2 62.9 24.5 60.9 25.6 58.2C25.7 58 25.8 57.7 25.9 57.5C26.2 57 26.4 56.4 26.4 56.4C26.4 56.3 26.8 55.5 27.1 55.0C27.3 54.7 27.5 54.4 27.5 54.4C27.5 54.4 28.1 53.4 28.3 53.1C28.4 52.9 28.6 52.6 28.7 52.5C28.8 52.3 28.9 52.2 28.9 52.2C29 52.2 29 55.6 28.9 61.3C28.9 63.4 28.9 67.1 28.8 69.6C28.8 74.5 28.8 74.8 28.7 74.9C28.7 74.9 28.5 74.7 28.2 74.5Z"];
  var INF_L = 1e20;                   // "uendelig" afstand

  // Tegner løven og regner for hver pixel afstanden til nærmeste kant ud.
  // Grafikkortet bruger feltet til at forme løven i 3D.
  function logoFelt(n) {
    var c = document.createElement("canvas");
    c.width = c.height = n;
    var x = c.getContext("2d", { willReadFrequently: true }); // tegnes i hukommelsen, så den hurtigt kan læses
    var k = n / 2 / 46;                 // logoets viewBox (7..93) fylder lidt mindre end feltet
    x.setTransform(k, 0, 0, k, n / 2 - 50 * k, n / 2 - 50 * k);
    x.fillStyle = x.strokeStyle = "#fff";
    x.lineWidth = 1.15; x.lineJoin = "round"; x.lineCap = "round";
    x.stroke(new Path2D(LOGO_STREG));
    LOGO_FYLD.forEach(function (d) { x.fill(new Path2D(d)); });
    var a = x.getImageData(0, 0, n, n).data;

    var N = n * n, ude = new Float32Array(N), inde = new Float32Array(N), fyldt = 0, i, al, e;
    for (i = 0; i < N; i++) {
      // Kantpixels tæller med en brøkdel, så kanten bliver præcis. Den mindste støj, som
      // nogle browsere lægger på tegningen mod sporing, tæller ikke med.
      al = Math.min(Math.max((a[i * 4 + 3] - 3) / 249, 0), 1);
      e = 0.5 - al;
      ude[i] = al >= 1 ? 0 : al <= 0 ? INF_L : e > 0 ? e * e : 0;
      inde[i] = al >= 1 ? INF_L : al <= 0 ? 0 : e < 0 ? e * e : 0;
      fyldt += al;
    }
    // Blokerer browseren for at læse tegningen (fx af hensyn til sporing), vises baggrunden uden 3D
    if (fyldt < N * 0.03 || fyldt > N * 0.6) throw new Error("logo");
    afstand(ude, n); afstand(inde, n);

    // Afstanden i pixels, udglattet en smule, så kanten ikke får små trappetrin
    var d = new Float32Array(N), t = new Float32Array(N);
    for (i = 0; i < N; i++) d[i] = Math.sqrt(ude[i]) - Math.sqrt(inde[i]);
    glat(d, t, n, 1); glat(t, d, n, n); glat(d, t, n, 1); glat(t, d, n, n);

    // To kanaler: en grov til afstande langt fra løven og en fin tæt på kanten
    // (Uint8ClampedArray runder og holder selv værdierne mellem 0 og 255)
    var ud = new Uint8ClampedArray(N * 2), grov = 255 * 2 / n / 0.25, fin = 255 * 2 / n / 0.04;
    for (i = 0; i < N; i++) {
      ud[i * 2] = 127.5 + d[i] * grov;
      ud[i * 2 + 1] = 127.5 + d[i] * fin;
    }
    return ud;
  }

  // Udglatning langs én retning (trin 1 = vandret, trin n = lodret) med vægtene 1-4-6-4-1
  function glat(fra, til, n, trin) {
    var lodret = trin !== 1;
    for (var r = 0; r < n; r++) {
      var base = lodret ? r : r * n;
      for (var j = 0; j < n; j++) {
        var i = base + j * trin;
        var m2 = j > 1 ? i - 2 * trin : base, m1 = j > 0 ? i - trin : base;
        var p1 = j < n - 1 ? i + trin : i, p2 = j < n - 2 ? i + 2 * trin : p1;
        til[i] = (fra[m2] + 4 * fra[m1] + 6 * fra[i] + 4 * fra[p1] + fra[p2]) / 16;
      }
    }
  }

  // Afstand til nærmeste fyldte pixel (Felzenszwalb og Huttenlocher), først lodret, så vandret
  function afstand(g, n) {
    var f = new Float32Array(n), d = new Float32Array(n), v = new Int32Array(n), z = new Float32Array(n + 1), x, y;
    for (x = 0; x < n; x++) { for (y = 0; y < n; y++) f[y] = g[y * n + x]; linje(f, d, v, z, n); for (y = 0; y < n; y++) g[y * n + x] = d[y]; }
    for (y = 0; y < n; y++) { for (x = 0; x < n; x++) f[x] = g[y * n + x]; linje(f, d, v, z, n); for (x = 0; x < n; x++) g[y * n + x] = d[x]; }
  }
  function linje(f, d, v, z, n) {
    var k = 0, q, s, r;
    v[0] = 0; z[0] = -INF_L; z[1] = INF_L;
    for (q = 1; q < n; q++) {
      do { r = v[k]; s = (f[q] + q * q - f[r] - r * r) / (2 * q - 2 * r); } while (s <= z[k] && --k >= 0);
      k++; v[k] = q; z[k] = s; z[k + 1] = INF_L;
    }
    for (k = 0, q = 0; q < n; q++) { while (z[k + 1] < q) k++; r = q - v[k]; d[q] = r * r + f[v[k]]; }
  }

  var logoTex = null, logoN = 0;
  function logoTekstur() {
    // Feltets opløsning: mindre på mobil, hvor løven er mindre. En potens af 2 (256, 512),
    // som alle grafikkort håndterer ens.
    var n = logoN = lille ? 256 : 512;
    var data = logoFelt(n);
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA, n, n, 0, gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /* ---------- Opsætning ---------- */

  var lille = window.matchMedia("(max-width: 760px)").matches;
  var ANTAL_GNISTER = lille ? 150 : 280;
  var sceneProg, sparkProg, uS, uP, triBuf, seedBuf, aPos, aSeed;

  function init() {
    sceneProg = program(VERT_SCENE, FRAG_SCENE);
    sparkProg = program(VERT_SPARK, FRAG_SPARK);
    uS = uniforms(sceneProg, ["uRes", "uTime", "uMouse", "uCenter", "uScale", "uDim", "uFlow", "uLight", "uDrej", "uLogo", "uLogoN"]);
    logoTex = logoTekstur();
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
  var kvalLoft = KVAL_MAX;            // sænkes, hvis browseren har måttet stoppe tegningen
  var W = 0, H = 0;

  // Tiden følger uret, så skulpturen står samme sted, når man skifter side
  var tid = rolig ? 14 : (PRECISION === "highp" ? (Date.now() / 1000) % 3600 : 0);
  var sidst = 0;
  var raf = 0;

  // Markøren: mål og blødt fulgt værdi. Uden mus svæver den af sig selv.
  var mus = { x: 0, y: 0, sidst: -1e9 };
  var harMus = false;
  var m = { x: svaevX(tid), y: svaevY(tid) };
  var cur = { cx: 0, cy: 0, sc: 1, dim: 1, flow: 1 };
  var forste = true;
  var holdTil = 0, glidTil = 0;

  // Den langsomme svæven, løven kigger efter, når der ikke er en mus (fx på mobil)
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
    // (lidt hurtigere lige efter skiftet, så den er på plads, når indholdet er)
    var a = forste ? 1 : (tid < holdTil ? 0 : 1 - Math.exp(-dt * (tid < glidTil ? 5.5 : 3.2)));
    forste = false;
    cur.cx += (mal.cx + m.x * 0.06 * mal.halvH - cur.cx) * a;
    cur.cy += (mal.cy + m.y * 0.05 * mal.halvH - cur.cy) * a;
    cur.sc += (mal.sc - cur.sc) * a;
    cur.dim += (mal.dim - cur.dim) * a;
    cur.flow += (mal.flow - cur.flow) * a;

    // Markør: brug musen. Uden mus (fx på mobil) svæver punktet roligt rundt om løven.
    var tomgang = rolig ? 0 : (!harMus && tid - mus.sidst > 4 ? 1 : 0);
    var tx = tomgang ? mal.cx / mal.halvB + svaevX(tid) * 0.6 : mus.x;
    var ty = tomgang ? mal.cy / mal.halvH + svaevY(tid) * 0.6 : mus.y;
    // Står baggrunden stille (pause eller reduceret bevægelse), bliver løven, hvor den er
    var b = koerer() ? 1 - Math.exp(-dt * (tomgang ? 0.8 : 5)) : 0;
    m.x += (tx - m.x) * b;
    m.y += (ty - m.y) * b;
    return mal;
  }

  // Løven drejer sig, så den kigger mod markøren. Drejningen samles i én matrix,
  // så grafikkortet slipper for at regne den pr. pixel.
  var M = new Float32Array(9);
  function drejMatrix(ay, ax) {
    var c1 = Math.cos(ay), s1 = Math.sin(ay), c2 = Math.cos(ax), s2 = Math.sin(ax);
    // Først om den lodrette akse (ay), så om den vandrette (ax). Gemmes kolonne for kolonne.
    M[0] = c1;  M[3] = 0;   M[6] = s1;
    M[1] = -s2 * s1; M[4] = c2; M[7] = s2 * c1;
    M[2] = -c2 * s1; M[5] = -s2; M[8] = c2 * c1;
    return M;
  }

  function tegn(mal) {
    resize();
    gl.viewport(0, 0, W, H);

    var aspect = mal.aspect;
    var mux = m.x * 0.5 * aspect, muy = m.y * 0.5;           // markør i skærmkoordinater
    var mwx = m.x * mal.halvB, mwy = m.y * mal.halvH;          // markør i verden
    // Løven kigger mod et punkt lidt foran markøren, så den vender ansigtet derhen,
    // hvor musen er, men aldrig så meget, at den ses fra kanten.
    // Ved reduceret bevægelse står den stille og kigger frem.
    var dx = rolig ? 0 : mwx - cur.cx, dy = rolig ? 0 : mwy - cur.cy, D = 2.4;
    var ay = Math.max(-0.95, Math.min(0.95, -Math.atan2(dx, D)));
    var ax = Math.max(-0.7, Math.min(0.7, -Math.atan2(dy, Math.sqrt(dx * dx + D * D))));
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
    gl.uniform3f(uS.uLight, lx / ll, ly / ll, lz / ll);
    gl.uniformMatrix3fv(uS.uDrej, false, drejMatrix(ay, ax));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, logoTex);
    gl.uniform1i(uS.uLogo, 0);
    gl.uniform1f(uS.uLogoN, logoN);
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
    else if (snit < 18 && kvalitet < kvalLoft) { if (++gode >= 3) { kvalitet = Math.min(kvalLoft, kvalitet * 1.08); gode = 0; } }
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
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "touch") harMus = true;
    peg(e.clientX, e.clientY);
  }, { passive: true });
  // Efter et sideskift ved browseren, hvor musen står, før den flyttes
  window.addEventListener("pointerover", function (e) {
    if (e.pointerType !== "touch") { harMus = true; peg(e.clientX, e.clientY); }
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

  // Stopper browseren 3D-tegningen (Safari gør det fx, hvis grafikkortet bruger for lang tid),
  // starter den igen med lavere opløsning. Sker det flere gange, vises den rolige reservebaggrund.
  var tabt = 0;
  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    tabt++;
    kvalitet = kvalLoft = Math.max(0.4, dpr * kvalitet * 0.55);
    dpr = 1;
  }, false);
  canvas.addEventListener("webglcontextrestored", function () {
    if (tabt > 2) { opgiv(); return; }
    try { init(); W = H = 0; forste = true; start(); } catch (err) { opgiv(); }
  }, false);
  function opgiv() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    canvas.remove();
    if (knap.parentNode) knap.parentNode.removeChild(knap);
    document.documentElement.classList.remove("har-scene");
  }

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
    var start0 = maal(fra === "forside", 0);
    if (r && r.width) { harMus = true; peg(r.left + r.width / 2, r.top + r.height / 2); m.x = mus.x; m.y = mus.y; }
    else { m.x = start0.cx / start0.halvB + svaevX(tid) * 0.6; m.y = start0.cy / start0.halvH + svaevY(tid) * 0.6; }
    cur.cx = start0.cx + m.x * 0.06 * start0.halvH;
    cur.cy = start0.cy + m.y * 0.05 * start0.halvH;
    cur.sc = start0.sc; cur.dim = start0.dim; cur.flow = start0.flow;
    forste = false;
    holdTil = tid + 0.2;
    glidTil = tid + 1.4;
  } else {
    var start1 = maal(forside, window.scrollY);
    m.x = start1.cx / start1.halvB + svaevX(tid) * 0.6;
    m.y = start1.cy / start1.halvH + svaevY(tid) * 0.6;
    forste = true;
  }
  // Første billede tegnes med det samme, så baggrunden er klar, når siden vises
  frame(performance.now());
})();
