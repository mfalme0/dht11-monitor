class Dht11NotBoringCard extends HTMLElement{
  set hass(hass){
    if(!this.shadowRoot){
      this.attachShadow({mode:'open'});
      this.shadowRoot.innerHTML=`
<style>
:host{display:block;border-radius:24px;overflow:hidden}
.card{position:relative;min-height:320px;padding:24px;display:flex;flex-direction:column;justify-content:space-between;color:#fff;overflow:hidden}
canvas.bg{position:absolute;inset:0;width:100%;height:100%}
.noise{position:absolute;inset:0;pointer-events:none;opacity:0.035;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.content{position:relative;z-index:1;display:flex;flex-direction:column;height:100%}
.hdr{display:flex;justify-content:space-between;align-items:center}
.lbl{font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;opacity:0.5}
.dot{width:7px;height:7px;border-radius:50%;background:#34D399;box-shadow:0 0 10px rgba(52,211,153,0.7);transition:all .4s}
.dot.off{background:#F97316;box-shadow:0 0 10px rgba(249,115,22,0.7);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
.hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;gap:2px}
.orb{position:absolute;border-radius:50%;pointer-events:none}
.orb.a{width:120px;height:120px;top:-10px;right:-20px;background:radial-gradient(circle at 30% 30%,rgba(96,165,250,0.35),rgba(96,165,250,0.05));animation:of 8s ease-in-out infinite}
.orb.b{width:100px;height:100px;bottom:10px;left:-15px;background:radial-gradient(circle at 30% 30%,rgba(251,191,36,0.3),rgba(251,191,36,0.03));animation:of 11s ease-in-out infinite reverse}
@keyframes of{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-10px,-14px) scale(1.04)}66%{transform:translate(6px,8px) scale(0.97)}}
.temp{font-size:88px;font-weight:900;letter-spacing:-3px;line-height:1;text-shadow:0 8px 40px rgba(0,0,0,0.2)}
.temp .d{font-size:.35em;font-weight:700;vertical-align:super;letter-spacing:0;margin-left:-2px;opacity:0.7}
.cond{font-size:18px;font-weight:600;opacity:0.75;margin-top:4px;text-shadow:0 2px 12px rgba(0,0,0,0.1);letter-spacing:0.5px}
.rng{font-size:14px;font-weight:500;opacity:0.4;margin-top:4px;font-variant-numeric:tabular-nums}
.metrics{display:flex;gap:8px;margin-top:4px}
.m{flex:1;padding:12px;border-radius:16px;backdrop-filter:blur(20px) saturate(1.5);-webkit-backdrop-filter:blur(20px) saturate(1.5);background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;gap:10px}
.m-i{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;background:rgba(255,255,255,0.08);flex-shrink:0}
.m-d{display:flex;flex-direction:column;line-height:1.2}
.m-v{font-size:17px;font-weight:800;font-variant-numeric:tabular-nums}
.m-l{font-size:9px;font-weight:600;opacity:0.45;text-transform:uppercase;letter-spacing:0.08em}
.bar-t{margin-top:10px;height:4px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden}
.bar-f{height:100%;border-radius:2px;background:linear-gradient(90deg,rgba(96,165,250,0.3),#60A5FA);transition:width .5s cubic-bezier(.22,1,.36,1);box-shadow:0 0 10px rgba(96,165,250,0.3)}
.rain{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}
.drop{position:absolute;width:1.5px;background:linear-gradient(180deg,transparent,rgba(96,165,250,0.5));border-radius:0 0 2px 2px;opacity:0;animation:fall linear infinite}
@keyframes fall{0%{transform:translateY(-20px) rotate(8deg);opacity:0}8%{opacity:1}92%{opacity:0.8}100%{transform:translateY(calc(100% + 20px)) rotate(8deg);opacity:0}}
</style>
<div class="card">
  <canvas class="bg"></canvas>
  <div class="noise"></div>
  <div class="rain" id="rain"></div>
  <div class="content">
    <div class="hdr"><span class="lbl">Living Room</span><div class="dot" id="dot"></div></div>
    <div class="hero">
      <div class="orb a"></div><div class="orb b"></div>
      <div class="temp" id="temp">--<span class="d">°</span></div>
      <div class="cond" id="cond">Waiting for data</div>
      <div class="rng" id="rng"></div>
    </div>
    <div class="metrics">
      <div class="m"><div class="m-i">💧</div><div class="m-d"><span class="m-v" id="hum">--%</span><span class="m-l">Humidity</span></div></div>
      <div class="m"><div class="m-i">🌡️</div><div class="m-d"><span class="m-v" id="dew">--°</span><span class="m-l">Dew Point</span></div></div>
      <div class="m"><div class="m-i">🫁</div><div class="m-d"><span class="m-v" id="comf">--</span><span class="m-l">Comfort</span></div></div>
    </div>
    <div class="bar-t"><div class="bar-f" id="hbar"></div></div>
  </div>
</div>`;
      this._initCanvas();this._initRain();
    }
    const ts=hass.states['sensor.dht11_sensor_dht11_temperature'];
    const hs=hass.states['sensor.dht11_sensor_dht11_humidity'];
    const t=ts?parseFloat(ts.state):null,h=hs?parseFloat(hs.state):null;
    const ok=v=>v!==null&&!isNaN(v);
    this.shadowRoot.getElementById('dot').classList.toggle('off',!ok(t));
    if(ok(t)){this.shadowRoot.getElementById('temp').innerHTML=Math.round(t)+'<span class="d">°</span>';this._drawBg(t)}
    if(ok(h)){this.shadowRoot.getElementById('hum').textContent=Math.round(h)+'%';this.shadowRoot.getElementById('hbar').style.width=h+'%';this._rain(h)}
    if(ok(t)&&ok(h)){
      this.shadowRoot.getElementById('dew').textContent=Math.round(this._dp(t,h))+'°';
      this.shadowRoot.getElementById('comf').textContent=this._cf(h,t);
      let c='Comfortable';if(h>80)c='Muggy';else if(h>60)c='Mild';else if(h<=25)c='Dry';
      if(t>33)c='Hot';if(t<5)c='Cold';
      this.shadowRoot.getElementById('cond').textContent=c;
    }
  }
  _dp(t,h){const a=17.27,b=237.7,v=(a*t)/(b+t)+Math.log(h/100);return(b*v)/(a-v)}
  _cf(h,t){if(h<30)return'Dry';if(h<=60&&t>=18&&t<=26)return'Ideal';if(h<=70)return'OK';if(h>80)return'Muggy';return'Humid'}
  _initCanvas(){
    const c=this.shadowRoot.querySelector('canvas.bg');this._cx=c.getContext('2d');
    const r=()=>{const p=c.parentElement,d=devicePixelRatio||1;
    c.width=p.offsetWidth*d;c.height=p.offsetHeight*d;
    c.style.width=p.offsetWidth+'px';c.style.height=p.offsetHeight+'px';
    this._cx.setTransform(d,0,0,d,0,0);this._w=p.offsetWidth;this._h=p.offsetHeight};
    r();new ResizeObserver(r).observe(c.parentElement);
    this._temp=null;const loop=t=>{this._drawBg(this._temp,t);requestAnimationFrame(loop)};requestAnimationFrame(loop);
  }
  _initRain(){
    const el=this.shadowRoot.getElementById('rain');
    for(let i=0;i<30;i++){const d=document.createElement('div');d.className='drop';
    d.style.left=Math.random()*100+'%';d.style.height=(8+Math.random()*14)+'px';
    d.style.animationDuration=(.6+Math.random()*.8)+'s';d.style.animationDelay=Math.random()*2+'s';
    el.appendChild(d)}
  }
  _rain(h){
    const drops=this.shadowRoot.querySelectorAll('.drop');
    const vis=Math.floor(drops.length*Math.min((h-40)/60,1));
    drops.forEach((d,i)=>{const show=h>40&&i<vis;d.style.opacity=show?'1':'0';d.style.animationPlayState=show?'running':'paused'});
  }
  _lerp(a,b,t){return a+(b-a)*t}
  _lerpHex(a,b,t){
    const ah=parseInt(a.slice(1),16),bh=parseInt(b.slice(1),16);
    const ar=(ah>>16)&0xff,ag=(ah>>8)&0xff,ab=ah&0xff;
    const br=(bh>>16)&0xff,bg=(bh>>8)&0xff,bb=bh&0xff;
    const r=Math.round(ar+(br-ar)*t),g=Math.round(ag+(bg-ag)*t),bl=Math.round(ab+(bb-ab)*t);
    return'#'+((1<<24)+(r<<16)+(g<<8)+bl).toString(16).slice(1);
  }
  _getTod(){
    const h=new Date().getHours()+new Date().getMinutes()/60;
    const stops=[
      {t:0,  top:'#080E1A',bot:'#0D1B2A',star:1.0,sun:0,cloud:0.03},
      {t:5,  top:'#1A2744',bot:'#3D2B5A',star:0.3,sun:0,cloud:0.06},
      {t:6.5,top:'#4A3060',bot:'#E8734A',star:0,  sun:0.1,cloud:0.10},
      {t:8,  top:'#6BA3D6',bot:'#A8D8F0',star:0,  sun:0.6,cloud:0.12},
      {t:12, top:'#4A9AD9',bot:'#87CEEB',star:0,  sun:1.0,cloud:0.10},
      {t:16, top:'#D98040',bot:'#F5A66E',star:0,  sun:0.5,cloud:0.10},
      {t:18.5,top:'#C0503A',bot:'#D06040',star:0,  sun:0.05,cloud:0.09},
      {t:20, top:'#3A2050',bot:'#2A2050',star:0.6,sun:0,cloud:0.05},
      {t:22, top:'#0A1020',bot:'#151A30',star:0.9,sun:0,cloud:0.04},
      {t:24, top:'#080E1A',bot:'#0D1B2A',star:1.0,sun:0,cloud:0.03},
    ];
    let a=stops[0],b=stops[1];
    for(let i=0;i<stops.length-1;i++){if(h>=stops[i].t&&h<=stops[i+1].t){a=stops[i];b=stops[i+1];break}}
    const p=(h-a.t)/(b.t-a.t||1);
    return{top:this._lerpHex(a.top,b.top,p),bot:this._lerpHex(a.bot,b.bot,p),
      star:this._lerp(a.star,b.star,p),sun:this._lerp(a.sun,b.sun,p),cloud:this._lerp(a.cloud,b.cloud,p)};
  }
  _tempSky(t){
    if(t==null)return{top:'#000',bot:'#000',a:0};
    if(t<5)return{top:'#2C3E6B',bot:'#1A2744',a:0.2};
    if(t<12)return{top:'#5B7FA5',bot:'#8BA5BE',a:0.15};
    if(t<20)return{top:'#6AAFE0',bot:'#A8D8F0',a:0.1};
    if(t<26)return{top:'#4A9AD9',bot:'#7EC8E3',a:0};
    if(t<32)return{top:'#E8734A',bot:'#F5A66E',a:0.15};
    if(t<38)return{top:'#D94F3B',bot:'#E8874A',a:0.25};
    return{top:'#B71C1C',bot:'#E53935',a:0.35};
  }
  _blendCol(base,ov,a){
    if(a<0.01)return base;
    const bh=parseInt(base.slice(1),16),oh=parseInt(ov.slice(1),16);
    const r=Math.round(((bh>>16)&0xff)+(((oh>>16)&0xff)-((bh>>16)&0xff))*a);
    const g=Math.round(((bh>>8)&0xff)+(((oh>>8)&0xff)-((bh>>8)&0xff))*a);
    const bl=Math.round((bh&0xff)+((oh&0xff)-(bh&0xff))*a);
    return'#'+((1<<24)+(r<<16)+(g<<8)+bl).toString(16).slice(1);
  }
  _drawBg(temp,time){
    this._temp=temp;const ctx=this._cx;if(!ctx)return;
    const w=this._w||300,h=this._h||320,t=time||0;
    const tod=this._getTod();
    const ts=this._tempSky(temp);
    const top=this._blendCol(tod.top,ts.top,ts.a);
    const bot=this._blendCol(tod.bot,ts.bot,ts.a);
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,top);g.addColorStop(1,bot);
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    // stars
    if(tod.star>0.01){
      ctx.save();
      for(let i=0;i<30;i++){
        const sx=(i*97.3%100)/100*w,sy=(i*61.7%60)/100*h;
        const twinkle=Math.sin(t*0.001*(0.5+i%3)+i*2.1)*0.3+0.7;
        ctx.globalAlpha=tod.star*twinkle;ctx.fillStyle='#fff';
        ctx.beginPath();ctx.arc(sx,sy,0.8+i%2*0.6,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    // moon
    if(tod.star>0.1){
      const mx=w*0.15,my=h*0.08,mr=10;
      ctx.save();ctx.globalAlpha=tod.star*0.15;
      const mg=ctx.createRadialGradient(mx,my,mr*0.5,mx,my,mr*3);
      mg.addColorStop(0,'rgba(200,220,255,0.5)');mg.addColorStop(1,'transparent');
      ctx.fillStyle=mg;ctx.fillRect(0,0,w,h);
      ctx.globalAlpha=tod.star*0.9;ctx.fillStyle='#D8E8F8';
      ctx.beginPath();ctx.arc(mx,my,mr,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=tod.star*0.6;ctx.fillStyle='#0C1525';
      ctx.beginPath();ctx.arc(mx-mr*0.3,my-mr*0.1,mr*0.75,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    // sun
    if(tod.sun>0.01){
      const h2=new Date().getHours()+new Date().getMinutes()/60;
      const angle=((h2-6)/12)*Math.PI;
      const sx2=w*0.15+w*0.7*(h2-6)/12;
      const sy2=h*0.55-h*0.55*Math.sin(angle);
      const pulse=Math.sin(t*.0008)*.1+.9;
      ctx.save();ctx.globalAlpha=tod.sun*0.3*pulse;
      const sg=ctx.createRadialGradient(sx2,sy2,0,sx2,sy2,80);
      sg.addColorStop(0,'rgba(255,220,100,0.8)');sg.addColorStop(.4,'rgba(255,180,50,0.2)');sg.addColorStop(1,'transparent');
      ctx.fillStyle=sg;ctx.fillRect(0,0,w,h);ctx.restore();
    }
    // clouds
    const isNight=tod.star>0.3;
    ctx.save();
    for(let i=0;i<5;i++){
      const cx=((t*.003*(i+1)+i*w*.25)%(w+200))-100;
      const cy=h*.08+i*h*.05;
      const cw=40+i*15,ch=12+i*3;
      ctx.globalAlpha=tod.cloud*(isNight?0.3:1)*0.8;
      ctx.fillStyle=isNight?'#8090B0':'#fff';
      ctx.beginPath();ctx.ellipse(cx,cy,cw,ch,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(cx-cw*0.3,cy+ch*0.3,cw*0.6,ch*0.6,0,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  getCardSize(){return 3}
  setConfig(c){this._config=c}
  static getStubConfig(){return{}}
}
customElements.define('dht11-not-boring-card',Dht11NotBoringCard);
window.customCards=window.customCards||[];
window.customCards.push({type:'dht11-not-boring-card',name:'DHT11 Not Boring Card',description:'Weather-reactive DHT11 card styled after Not Boring Weather',preview:true,configurable:true});
