import * as T from './three/three.module.min.js';
import { GLTFLoader } from './three/GLTFLoader.js';
import { MeshoptDecoder } from './three/meshopt_decoder.module.js';

// Mark VII sculpt by jcp0072 (@jordi_creates). Original textures and panel geometry,
// regrouped around anatomical pivots for the scrolling assembly.
export async function createArmor(scene) {
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const {scene: model} = await loader.loadAsync(new URL('./mark-vii.glb', import.meta.url).href);
    const root = new T.Group();
    scene.add(root);
    const movements = [], plates = [];
    const vec = (x,y,z) => new T.Vector3(x,y,z);
    const families = new Map();
    for (const piece of model.children) {
        const name = piece.userData.assembly;
        if (!families.has(name)) families.set(name, []);
        families.get(name).push(piece);
    }

    // Pivots are given in the assembled model's coordinate system. Each joint
    // inherits the rotation of its parent, so the elbow and wrist stay connected.
    function joint(parent, at) {
        const g = new T.Group();
        g.position.copy(at).sub(parent.userData.bind || vec(0,0,0));
        g.userData.bind = at;
        parent.add(g);
        return g;
    }
    function mount(name, pivot, offset, turn=0) {
        const pieces = families.get(name);
        const carrier = new T.Group();
        carrier.position.copy(pivot.userData.bind || vec(0,0,0)).multiplyScalar(-1);
        pivot.add(carrier);
        const bounds = new T.Box3();
        for (const piece of pieces) bounds.expandByObject(piece);
        const middle = bounds.getCenter(vec(0,0,0));
        for (const piece of pieces) {
            const size = new T.Box3().setFromObject(piece).getSize(vec(0,0,0));
            const home = piece.position.clone();
            carrier.add(piece);
            const spread = home.clone().sub(middle);
            // Fan front and rear layers into distinct screen positions.
            const side = middle.x < 0 ? -1 : 1;
            spread.x = spread.x * 1.35 + side * spread.z * 1.2;
            spread.y = spread.y * .95 + spread.z * .40;
            spread.z *= 1.5;
            const target = home.clone().add(offset).add(spread);
            plates.push({piece, home, offset, target, spread,
                radius:T.MathUtils.clamp(Math.hypot(size.x,size.y)*.35,.072,.52),
                delay:T.MathUtils.clamp(.19 - home.z*.19 + .09*Math.cos(plates.length*2.4),.015,.49),
                tilt:.14*Math.sin(plates.length*2.4), yaw:side*(.13+.26*Math.cos(plates.length))
            });
        }
        movements.push({carrier, home:carrier.position.clone(), offset, pivot, turn});
    }

    const painted = new Set();
    model.traverse(node => {
        if (!node.isMesh) return;
        node.castShadow = node.receiveShadow = true;
        const material = node.material;
        if (painted.has(material)) return;
        painted.add(material);
        const lacquer = /granate|piernas_plata/.test(material.name);
        const gold = material.name.includes('dorado');
        if (lacquer || gold) {
            material.color.set(lacquer ? 0x94161d : 0xc9a36a);
            material.metalness = lacquer ? .71 : .90;
            material.roughness = lacquer ? .40 : .37;
            // Keep the authored scratches and relief under the opening's approved finish.
            material.onBeforeCompile = shader => {
                shader.fragmentShader = shader.fragmentShader
                    .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuse, diffuseColor.rgb, 0.32);')
                    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughness, roughnessFactor, 0.35);');
            };
        }
        if (/^(ojoscasco|propulsor)_1$/.test(material.name)) {
            material.color.set(0x374348);
            material.metalness=.80;
            material.roughness=.32;
            material.emissiveIntensity=0;
        }
        if (/^(ojoscasco|propulsor)_2$/.test(material.name)) {
            material.color.set(0xa2efff);
            material.emissive.set(0x61d9ff);
            material.emissiveIntensity = 1.35;
        }
        if(material.name==='dedos') material.color.set(0x383a3c);
    });

    const neck = joint(root,vec(0,5.50,-.02));
    for (const [name, y, dy, dz] of [
        ['helmet',5.90,1.35,-.17], ['visor',5.87,1.42,.83],
        ['back',4.91,.54,-1.10], ['chest',4.91,.56,.28],
        ['ribs',4.43,.32,.74], ['abdomen',4.13,.09,.81],
        ['waist',3.86,-.16,.69], ['pelvis',3.53,-.32,-.34]
    ]) {
        const parent=name==='helmet'||name==='visor'?neck:root;
        mount(name,joint(parent,vec(0,y,0)),vec(0,dy,dz),name==='visor'?-.18:.05);
    }

    let shoulder, elbow, wrist, repulsor;
    for (const [side,s] of [['R',-1],['L',1]]) {
        const arm = joint(root,vec(s*.89,5.20,-.11));
        const forearm = joint(arm,vec(s*1.09,4.39,-.17));
        const hand = joint(forearm,vec(s*1.23,3.60,.02));
        mount('pauldron'+side,joint(root,vec(s*.81,5.25,-.05)),vec(s*1.38,.83,-.16),s*.24);
        mount('bicep'+side,arm,vec(s*1.17,.31,.22),s*.17);
        mount('bracer'+side,forearm,vec(s*1.53,-.12,.56),s*.21);
        mount('palm'+side,hand,vec(s*1.84,-.48,.72),s*.18);
        mount('thigh'+side,joint(root,vec(s*.38,2.68,0)),vec(s*.84,-.27,-.22),s*.19);
        mount('shin'+side,joint(root,vec(s*.49,1.23,0)),vec(s*1.17,-.51,.23),s*.15);
        mount('boot'+side,joint(root,vec(s*.52,.32,0)),vec(s*1.34,-.74,.57),s*.14);
        if(side==='R'){
            shoulder=arm; elbow=forearm; wrist=hand;
            repulsor=new T.Object3D();
            repulsor.position.copy(vec(-1.137,3.329,.063)).sub(hand.userData.bind);
            hand.add(repulsor);
            const spill=new T.PointLight(0x77deff,.38,1.4);
            spill.position.x=.12; repulsor.add(spill);
        }
    }
    // Arrange the exploded view once, keeping neighbouring parts from hiding
    // each other. Small fittings move aside more easily than large shells.
    for (let pass=0; pass<42; pass++) {
        for (let i=0; i<plates.length; i++) {
            const a=plates[i];
            for (let j=i+1; j<plates.length; j++) {
                const b=plates[j];
                const dx=a.target.x-b.target.x, dy=a.target.y-b.target.y;
                const distance=Math.hypot(dx,dy);
                const overlap=a.radius+b.radius+.05-distance;
                if (overlap<=0) continue;
                const nx=distance>1e-6?dx/distance:Math.cos(i+j);
                const ny=distance>1e-6?dy/distance:Math.sin(i+j);
                const share=b.radius/(a.radius+b.radius);
                const step=overlap*.6;
                a.target.x+=nx*step*share; a.target.y+=ny*step*share;
                b.target.x-=nx*step*(1-share); b.target.y-=ny*step*(1-share);
            }
            a.target.x=T.MathUtils.clamp(a.target.x,-4.15,4.15);
            a.target.y=T.MathUtils.clamp(a.target.y,-.74,8.02);
        }
    }
    for (const plate of plates) plate.spread.copy(plate.target).sub(plate.home).sub(plate.offset);
    const desiredPalm = new T.Quaternion().setFromEuler(new T.Euler(0,Math.PI*.55,Math.PI,'YXZ'));
    const parentRotation = new T.Quaternion();
    const wristTarget = new T.Quaternion();
    return {root, repulsor, update(explode,aim,progress) {
        for (const {carrier,home,offset,pivot,turn} of movements) {
            carrier.position.copy(home).addScaledVector(offset,explode);
            pivot.rotation.y=turn*explode;
        }
        for (const {piece,home,spread,delay,tilt,yaw} of plates) {
            const travel=T.MathUtils.smoothstep(explode,delay,1);
            piece.position.copy(home).addScaledVector(spread,travel);
            piece.rotation.set(tilt*travel,yaw*travel,-tilt*.55*travel);
        }
        shoulder.rotation.x=-1.04*aim;
        elbow.rotation.x=-.79*aim;
        parentRotation.copy(shoulder.quaternion).multiply(elbow.quaternion);
        wristTarget.copy(parentRotation).invert().multiply(desiredPalm);
        wrist.quaternion.identity().slerp(wristTarget,aim);
        neck.rotation.set(.035*(1-explode),-.32*aim+.13*(1-aim)*(1-explode),-.025*aim);
        root.rotation.y=-.24+.34*Math.sin(progress*Math.PI)+.13*aim;
    }};
}
