const stage = document.querySelector('.stage');
const visual = document.querySelector('.visual');
const canvas = visual.querySelector('canvas');
const fallback = visual.querySelector('img');
const handStill = visual.querySelector('.hand-still');
const palm = document.querySelector('.palm');
const advance = document.querySelector('#advance');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, min=0, max=1) => Math.max(min, Math.min(max,v));
const smooth = v => v*v*(3-2*v);
const labels = ['Armadura montada','Peças em suspensão','Repulsor ativo'];
const hints = ['Role para desmontar a armadura.','Continue rolando para remontar a armadura.','Toque no repulsor azul para entrar no catálogo.'];
let drawArmor, queued=false;
let phase=-1;
let limit=1;

function placePalm(x, y, diameter){
    palm.style.left = (visual.offsetLeft+x)+'px';
    palm.style.top = (visual.offsetTop+y)+'px';
    palm.style.setProperty('--diam',diameter+'px');
}

function drawFallback(p,closeUp){
    const frame = p < .26 ? 'inicial' : p < .70 ? 'aberta' : 'final';
    const path = 'assets/armadura-'+frame+'.png';
    if(fallback.getAttribute('src') !== path) fallback.src=path;
    // The stills share a square frame, centered by object-fit: contain.
    const w=visual.clientWidth,h=visual.clientHeight,size=Math.min(w,h);
    const dx=size*(.5-.271),dy=size*(.5-.258);
    fallback.style.transformOrigin=(w/2-dx)+'px '+(h/2-dy)+'px';
    const portraitScale=Math.min(1.18,Math.max(1,h/w));
    const zoom=Math.pow(2.74*portraitScale,closeUp);
    fallback.style.transform='translate('+dx*closeUp+'px,'+dy*closeUp+'px) scale('+zoom+')';
    const blend=smooth(clamp((closeUp-.35)/.65));
    fallback.style.opacity=1-blend;
    // The close-up still includes overscan so the shoulder and torso continue
    // to the viewport edges in both portrait and landscape layouts.
    handStill.style.transform='translate('+(-dx*(1-closeUp))+'px,'+(-dy*(1-closeUp))+'px) scale('+(2*zoom/2.74)+')';
    handStill.style.opacity=blend;
    placePalm(w/2-dx*(1-closeUp),h/2-dy*(1-closeUp),size*.034*zoom);
}

function update(){
    queued=false;
    const p=clamp((scrollY-stage.parentElement.offsetTop)/limit);
    const closeUp=reduced.matches?Number(p>=.98):smooth(clamp((p-.78)/.20));
    stage.style.setProperty('--frame',1-closeUp);
    stage.style.setProperty('--surroundings',1-smooth(clamp(closeUp/.82)));
    stage.classList.toggle('hand-only',closeUp>=.82);
    const nextPhase=p<.24?0:p<.98?1:2;
    if(nextPhase!==phase){
        phase=nextPhase;
        document.querySelector('#instruction').textContent=hints[phase];
        document.querySelector('#phase').textContent=labels[phase];
        document.querySelector('#number').textContent='0'+(phase+1);
        document.querySelector('#state').textContent=['ONLINE','MODULAR','PRONTO'][phase];
        advance.querySelector('span').textContent=['Rolar para explorar','Remontar armadura','Voltar ao início'][phase];
        advance.querySelector('b').textContent=phase===2?'↑':'↓';
        palm.hidden=phase!==2;
        if(phase===2 && document.activeElement===advance) palm.focus({preventScroll:true});
    }
    stage.style.setProperty('--p',p.toFixed(4));
    if(drawArmor) drawArmor(p,closeUp);
    else drawFallback(p,closeUp);
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(update);}}
function resize(){limit=Math.max(1,stage.parentElement.offsetHeight-stage.offsetHeight);schedule();}
advance.addEventListener('click',()=>scrollTo({top:phase===2?0:phase===0?limit*.39:limit,behavior:reduced.matches?'instant':'smooth'}));
window.addEventListener('scroll',schedule,{passive:true});
window.addEventListener('resize',resize);
reduced.addEventListener('change',schedule);
resize();

async function init(){
    const [T,{createArmor},{RGBELoader}]=await Promise.all([import('./three/three.module.min.js'),import('./armadura.js'),import('./three/RGBELoader.js')]);
    const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setClearColor(0,0);
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=.98;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFShadowMap;
    const scene=new T.Scene();
    const camera=new T.PerspectiveCamera(32,1,.1,80);
    // Studio Small 09, Poly Haven (CC0). Prefilter the HDR panorama for each roughness level.
    const tex=await new RGBELoader().loadAsync(new URL('./studio-small-09.hdr',import.meta.url).href);
    tex.mapping=T.EquirectangularReflectionMapping;
    const pmrem=new T.PMREMGenerator(renderer);
    const env=pmrem.fromEquirectangular(tex);scene.environment=env.texture;tex.dispose();pmrem.dispose();
    function key(x,y,z,color,power){
        const light=new T.DirectionalLight(color,power);
        light.position.set(x,y,z);light.target.position.set(0,3,0);
        scene.add(light,light.target);return light;
    }
    const main=key(-3.8,9,4.2,0xffead7,2.4);
    main.castShadow=true;
    Object.assign(main.shadow.camera,{left:-5,right:5,top:6,bottom:-5,near:.3,far:22});
    const shadowSize=matchMedia('(max-width:700px)').matches?1024:2048;
    main.shadow.mapSize.set(shadowSize,shadowSize);
    main.shadow.normalBias=.009;main.shadow.bias=-.00018;main.shadow.radius=2.8;
    key(3,6,-4,0xff9777,3.1);
    key(4,4,4,0xb8d7ff,.65);
    const ground=new T.Mesh(new T.PlaneGeometry(22,22),new T.ShadowMaterial({opacity:.24,depthWrite:false}));
    ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
    const armor=await createArmor(scene);
    const center=new T.Vector3(),edge=new T.Vector3(),target=new T.Vector3();
    let previousW=0,previousH=0;
    drawArmor=(p,closeUp)=>{
        const w=visual.clientWidth,h=visual.clientHeight;
        if(!w || !h)return;
        if(w!==previousW || h!==previousH){
            renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
            renderer.setSize(w,h,false);camera.aspect=w/h;previousW=w;previousH=h;
        }
        const t=reduced.matches?(p<.24?0:p<.70?.5:1):Math.min(p/.78,1);
        const explode=smooth(clamp(t/.49))*(1-smooth(clamp((t-.52)/.43)));
        const aim=smooth(clamp((t-.57)/.39));
        armor.update(explode,aim,t);
        ground.position.y=.127-.80*explode;
        const cy=3.24+.40*explode+.80*aim;
        armor.repulsor.getWorldPosition(center);
        target.set(-.03*aim,cy,0).lerp(center,closeUp);
        const wide=Math.max(12.2+5.6*explode-1.2*aim,(7.2+10.8*explode)/camera.aspect);
        const tight=2.95/Math.min(1,1.18*camera.aspect);
        const distance=wide*Math.pow(tight/wide,closeUp);
        camera.position.copy(target);
        camera.position.z+=distance;
        // Look back along the raised arm so the helmet stays in the background.
        camera.position.x-=distance*.43*closeUp;
        camera.position.y-=distance*.11*closeUp;
        camera.lookAt(target);camera.updateProjectionMatrix();
        renderer.render(scene,camera);
        edge.copy(center);edge.x+=.095;
        center.project(camera);edge.project(camera);
        placePalm((center.x+1)*w/2,(1-center.y)*h/2,Math.abs(edge.x-center.x)*w);
    };
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();drawArmor=null;stage.classList.remove('ready');schedule();});
    update();stage.classList.add('ready');
}
init().catch(()=>{drawArmor=null;update();});
