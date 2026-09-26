/** FVの波紋。画像は ripple-texture.js、動きの強さは下記 SETTINGS を編集。 */
(() => {
  const SETTINGS = {
    strength: 0.006, interval: 5.8, duration: 3.2, pointerInterval: 100,
    // 秒数: 余韻 → フェードイン → 静止 → 落下 → 着水後の余韻。
    appearDelay: 0.9, fadeIn: 0.9, fallStart: 3.5, fallDuration: 1.1
  };
  let stop = () => {};
  window.stopRippleHero = () => stop();
  window.startRippleHero = () => {
    stop();
    const host = document.querySelector('.hero__background #water-surface');
    if (!host) return;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    // テクスチャの準備まではCSSの背景を見せ、黒い画面を挟まない。
    canvas.style.opacity = '0';
    host.replaceChildren(canvas);
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) { canvas.remove(); return; }
    const shaders = [];
    const shader = (type, source) => {
      const s = gl.createShader(type); shaders.push(s); gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, `attribute vec2 position; varying vec2 uv;
      void main(){uv=position*.5+.5; gl_Position=vec4(position,0.,1.);}`));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `precision mediump float;
      varying vec2 uv; uniform sampler2D picture; uniform vec2 size; uniform vec2 imageSize;
      uniform float time; uniform float strength; uniform vec3 waves[8];
      uniform vec4 dropTiming; uniform float fallDuration;
      void main(){
        vec2 p=vec2(uv.x,1.-uv.y); vec2 offset=vec2(0.); float light=0.;
        float ratio=size.x/size.y;
        for(int i=0;i<8;i++){
          float age=time-waves[i].z;
          if(waves[i].z>=0. && age>0. && age<3.2){
            vec2 d=(p-waves[i].xy)*vec2(ratio,1.8); float dist=length(d);
            float front=dist-age*.52; float envelope=exp(-front*front*95.)*exp(-age*.9);
            float wave=sin(front*65.)*envelope;
            offset+=normalize(d+vec2(.0001))*wave*strength;
            light+=cos(front*65.)*envelope*.10;
          }
        }
        vec2 cover=vec2(1.); float imageRatio=imageSize.x/imageSize.y;
        if(ratio>imageRatio) cover.y=imageRatio/ratio; else cover.x=ratio/imageRatio;
        vec2 sampleUV=(p-.5)*cover+.5+offset;
        vec3 color=texture2D(picture,clamp(sampleUV,0.,1.)).rgb;
        // 元画像の雫を同じテクスチャから取り出し、落下位置へ描画。
        vec2 dropCenter=vec2(.501,.346);
        vec2 dropRadius=vec2(.018,.030);
        float originalMask=1.-smoothstep(.88,1.12,length((sampleUV-dropCenter)/dropRadius));
        // 雫が消えている間も黒い抜け跡を残さず、周囲の水面で補う。
        vec3 behindDrop=(texture2D(picture,sampleUV-vec2(.045,0.)).rgb
          +texture2D(picture,sampleUV+vec2(.045,0.)).rgb)*.5;
        color=mix(color,behindDrop,originalMask);
        float phase=mod(time,dropTiming.x);
        float fall=clamp((phase-dropTiming.w)/fallDuration,0.,1.);
        // 出現時はゆっくり、着水時は水面に吸収されるように消す。
        float opacity=smoothstep(dropTiming.y,dropTiming.y+dropTiming.z,phase);
        opacity*=1.-smoothstep(.88,1.,fall);
        vec2 movingCenter=dropCenter+vec2(0.,.226*fall*fall);
        vec2 dropUV=(p-.5)*cover+.5;
        float movingMask=(1.-smoothstep(.88,1.12,length((dropUV-movingCenter)/dropRadius)));
        vec3 dropColor=texture2D(picture,dropUV-movingCenter+dropCenter).rgb;
        color=mix(color,dropColor,movingMask*opacity);
        color+=light*(.15+color*.5);
        gl_FragColor=vec4(max(color,0.),1.);
      }`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(program);
    gl.uniform4f(gl.getUniformLocation(program,'dropTiming'), SETTINGS.interval, SETTINGS.appearDelay, SETTINGS.fadeIn, SETTINGS.fallStart);
    gl.uniform1f(gl.getUniformLocation(program,'fallDuration'), SETTINGS.fallDuration);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position'); gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const uniform = name => gl.getUniformLocation(program,name);
    const timeUniform=uniform('time'), wavesUniform=uniform('waves[0]');
    const texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const waves=new Float32Array(24).fill(-10);
    let frame=0, slot=0, ready=false, disposed=false, active=true, lastPointer=0, lastDrop=-1;
    const origin=performance.now();
    const now=()=> (performance.now()-origin)/1000;
    function addWave(x,y,t) { waves.set([x,y,t],slot*3); slot=(slot+1)%8; }
    function resize(){
      const rect=host.getBoundingClientRect(); const dpr=Math.min(devicePixelRatio||1,1.5);
      canvas.width=Math.max(1,Math.round(rect.width*dpr)); canvas.height=Math.max(1,Math.round(rect.height*dpr));
      gl.viewport(0,0,canvas.width,canvas.height); gl.uniform2f(uniform('size'),rect.width,rect.height);
      if(ready) draw();
    }
    function draw(){
      if(disposed || !ready) return;
      const t=now();
      const impact = SETTINGS.fallStart + SETTINGS.fallDuration;
      const cycle = Math.floor((t - impact) / SETTINGS.interval);
      if (!motion.matches && cycle >= 0 && cycle > lastDrop) {
        const landedAt = cycle * SETTINGS.interval + impact;
        // タブに戻ったとき、過去の着水を新しい波紋として再生しない。
        if (t - landedAt < SETTINGS.duration) {
          const ratio = canvas.width / canvas.height;
          const imageRatio = img.naturalWidth / img.naturalHeight;
          const coverX = Math.min(1, ratio / imageRatio);
          const coverY = Math.min(1, imageRatio / ratio);
          addWave((.501 - .5) / coverX + .5, (.572 - .5) / coverY + .5, landedAt);
        }
        lastDrop = cycle;
      }
      gl.uniform1f(timeUniform,motion.matches?SETTINGS.appearDelay+SETTINGS.fadeIn:t); gl.uniform1f(uniform('strength'),motion.matches?0:SETTINGS.strength);
      gl.uniform3fv(wavesUniform,motion.matches?new Float32Array(24).fill(-10):waves);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    function tick(){frame=0; if(disposed || !active || document.hidden) return; draw();
      if(!motion.matches) frame=requestAnimationFrame(tick);
    }
    function resume(){cancelAnimationFrame(frame); frame=0; tick();}
    function pointer(event){
      if(motion.matches || !ready) return;
      const timestamp=performance.now();
      if(event.type==='pointermove' && timestamp-lastPointer<SETTINGS.pointerInterval) return;
      lastPointer=timestamp; const r=host.getBoundingClientRect();
      addWave((event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height,now());
    }
    const hero=host.closest('.hero');
    hero.addEventListener('pointermove',pointer,{passive:true}); hero.addEventListener('pointerdown',pointer,{passive:true});
    const ro=new ResizeObserver(resize); ro.observe(host);
    const io=new IntersectionObserver(entries=>{active=entries[0].isIntersecting;resume();}); io.observe(hero);
    document.addEventListener('visibilitychange',resume); motion.addEventListener('change',resume);
    const img=new Image();
    img.onload=()=>{if(disposed)return; gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
      gl.uniform2f(uniform('imageSize'),img.naturalWidth,img.naturalHeight); ready=true; resize(); draw(); canvas.style.opacity='1'; resume();};
    img.onerror=()=>{ canvas.remove(); };
    img.src=window.portfolioRippleTexture || new URL('images/home/ripple-grid.png',window.portfolioRootURL).href;
    stop=()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();
      hero.removeEventListener('pointermove',pointer);hero.removeEventListener('pointerdown',pointer);
      document.removeEventListener('visibilitychange',resume);motion.removeEventListener('change',resume);
      gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));canvas.remove();};
  };
})();
