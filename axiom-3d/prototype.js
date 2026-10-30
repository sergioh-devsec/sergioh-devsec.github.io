/**
 * Original, procedural Axiom prototype. This is a stylized reconstruction,
 * not an image-to-3D conversion of the reference illustration.
 * Units are arbitrary; feet rest at y=0 and the character faces +Z.
 * All geometry/materials are local and deterministic. No DOM or textures.
 */
export function createPrototype(THREE) {
  const root = new THREE.Group();
  root.name = 'Axiom_Prototype';
  root.userData = {kind: 'original-stylized-prototype', forward: '+Z', author: 'CyberSerchMX', version: 1};
  const materials = {
    skin: new THREE.MeshStandardMaterial({color: 0xf7e7dd, roughness: .62}),
    muzzle: new THREE.MeshStandardMaterial({color: 0xffeee5, roughness: .64}),
    blush: new THREE.MeshStandardMaterial({color: 0xe3a69e, roughness: .8}),
    mouth: new THREE.MeshStandardMaterial({color: 0x76443f, roughness: .8}),
    dark: new THREE.MeshStandardMaterial({color: 0x15242d, roughness: .72}),
    sole: new THREE.MeshStandardMaterial({color: 0x69777b, roughness: .8}),
    jacket: new THREE.MeshStandardMaterial({color: 0x087f8b, roughness: .67}),
    jacketLight: new THREE.MeshStandardMaterial({color: 0x16a6b2, roughness: .58}),
    trim: new THREE.MeshStandardMaterial({color: 0x3cd9df, roughness: .36, metalness: .12}),
    gill: new THREE.MeshStandardMaterial({color: 0x33bfd0, roughness: .56}),
    gillLight: new THREE.MeshStandardMaterial({color: 0x9ff0ee, roughness: .65}),
    eyes: new THREE.MeshStandardMaterial({color: 0x061016, roughness: .12, metalness: .08}),
    iris: new THREE.MeshStandardMaterial({color: 0x146574, roughness: .24}),
    glint: new THREE.MeshBasicMaterial({color: 0xf4ffff}),
    screen: new THREE.MeshStandardMaterial({color: 0x071820, roughness: .35}),
    glow: new THREE.MeshStandardMaterial({color: 0x55f2e9, emissive: 0x2bded7, emissiveIntensity: .65, roughness: .4}),
    fin: new THREE.MeshStandardMaterial({color: 0x25b9ca, roughness: .56, side: THREE.DoubleSide}),
  };
  for(const [name,material] of Object.entries(materials)) material.name=`Axiom_${name}`;
  const sphere = new THREE.SphereGeometry(1, 24, 16);
  const detailSphere = new THREE.SphereGeometry(1, 12, 8);
  const leafSphere = new THREE.SphereGeometry(1, 10, 6);
  const vec = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
  function ellipsoid(parent, name, position, scale, material, geometry=sphere) {
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;
    mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function box(parent,name,position,scale,material,bevel=.04) {
    // A low-poly bevel gives the wardrobe and equipment a made object silhouette.
    const [w,h,d]=scale,shape=new THREE.Shape(),r=Math.min(bevel,w/3,h/3);
    shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
    shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);
    shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.002,d-r),bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:r*.35,bevelThickness:r*.5,curveSegments:3});
    geometry.translate(0,0,-d/2);
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function rod(parent,name,a,b,radius,material,radiusEnd=radius) {
    const start=vec(...a),end=vec(...b),delta=end.clone().sub(start);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radiusEnd,radius,delta.length(),12,1),material);
    mesh.name=name;mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(vec(0,1,0),delta.normalize());mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  function stroke(parent,name,points,radius,material) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>vec(...p)));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,24,radius,6,false),material);mesh.name=name;parent.add(mesh);return mesh;
  }
  function bone(parent,name,position) {
    const joint=new THREE.Bone();joint.name=name;joint.position.set(...position);parent.add(joint);return joint;
  }
  const rig=bone(root,'Root',[0,0,0]);
  const hips=bone(rig,'Hips',[0,.88,0]);
  const chest=bone(hips,'Chest',[0,.55,0]);
  const head=bone(chest,'Head',[0,.98,.035]);

  // Dark trousers, shaped knees and small technical boots.
  ellipsoid(hips,'Trousers',[0,-.02,0],[.40,.32,.25],materials.dark);
  const legs=[];
  [-1,1].forEach((side,index)=>{
    const leg=bone(hips,index?'Leg_R':'Leg_L',[side*.225,-.12,0]);legs.push(leg);
    ellipsoid(leg,'Trouser_leg',[0,-.17,0],[.185,.33,.21],materials.dark);
    box(leg,'Cargo_pocket',[side*.14,-.08,.08],[.115,.23,.19],materials.dark,.025);
    rod(leg,'Pocket_trim',[side*.195,.005,.10],[side*.195,-.15,.10],.012,materials.trim);
    const foot=bone(leg,index?'Foot_R':'Foot_L',[0,-.57,.04]);
    ellipsoid(foot,'Boot_sole',[0,-.12,.075],[.23,.073,.35],materials.sole,detailSphere);
    ellipsoid(foot,'Boot',[0,-.065,.07],[.21,.115,.32],materials.dark,detailSphere);
    box(foot,'Boot_tongue',[0,.01,.04],[.13,.11,.15],materials.dark,.02);
    for(let lace=0;lace<3;lace++)rod(foot,'Boot_lace',[-.065,.015,.15+lace*.035],[.065,.015,.15+lace*.035],.009,lace===0?materials.trim:materials.sole);
  });
  // A black inner shirt and two padded jacket fronts give the torso depth.
  ellipsoid(chest,'Inner_shirt',[0,-.04,.01],[.40,.52,.265],materials.dark);
  [-1,1].forEach(side=>{
    const front=ellipsoid(chest,'Jacket_front',[side*.255,-.02,.06],[.225,.50,.265],materials.jacket);
    front.rotation.z=-side*.055;
    const collar=box(chest,'Raised_collar',[side*.21,.405,.18],[.25,.19,.12],materials.jacketLight,.04);collar.rotation.z=side*.35;
    rod(chest,'Zipper_edge',[side*.10,-.43,.305],[side*.10,.31,.325],.012,materials.trim);
    const pocket=box(chest,'Jacket_pocket',[side*.28,-.20,.29],[.20,.18,.035],materials.jacketLight,.02);pocket.rotation.z=-side*.13;
    rod(chest,'Pocket_opening',[side*.18,-.14,.32],[side*.36,-.18,.32],.008,materials.dark);
    box(chest,'Backpack_strap',[side*.34,.07,.28],[.085,.61,.06],materials.dark,.02);
    box(chest,'Strap_clip',[side*.34,.12,.325],[.075,.11,.026],materials.trim,.01);
  });
  box(chest,'Jacket_hem',[0,-.45,.02],[.78,.085,.48],materials.jacket,.025);
  ellipsoid(chest,'Backpack',[0,.03,-.24],[.40,.43,.14],materials.dark,detailSphere);
  ellipsoid(chest,'Neck',[0,.52,.025],[.17,.20,.16],materials.skin);

  // Shoulder and elbow bones keep the tablet and welcoming hand articulated.
  const arms=[];
  [-1,1].forEach(side=>{
    const shoulder=bone(chest,side<0?'Shoulder_L':'Shoulder_R',[side*.48,.29,0]);
    const elbow=bone(shoulder,side<0?'Elbow_L':'Elbow_R',[side*.14,-.35,.08]);
    const palmPosition=side<0?[.015,-.10,.29]:[.25,.13,.17];
    const hand=bone(elbow,side<0?'Hand_L':'Hand_R',palmPosition);arms.push({shoulder,elbow,hand});
    rod(shoulder,'Upper_sleeve',[0,0,0],[side*.14,-.35,.08],.155,materials.jacket,.18);
    ellipsoid(shoulder,'Shoulder_seam',[0,-.025,0],[.18,.19,.18],materials.jacket,detailSphere);
    rod(elbow,'Forearm_sleeve',[0,0,0],palmPosition,.145,materials.jacketLight,.115);
    ellipsoid(elbow,'Elbow',[0,0,0],[.15,.14,.15],materials.jacket,detailSphere);
    ellipsoid(hand,'Wrist_cuff',[0,-.015,-.03],[.125,.12,.115],materials.dark,detailSphere);
    if(side>0){
      ellipsoid(hand,'Open_palm',[.075,.05,.025],[.16,.07,.13],materials.skin,detailSphere);
      for(let finger=0;finger<4;finger++){
        const y=.07+finger*.012,z=-.055+finger*.053;
        rod(hand,'Finger',[.16,y,z],[.26+Math.sin(finger/3*Math.PI)*.03,y+.06,z+.015],.026,materials.skin,.022);
        ellipsoid(hand,'Fingertip',[.26+Math.sin(finger/3*Math.PI)*.03,y+.06,z+.015],[.024,.027,.025],materials.skin,leafSphere);
      }
      ellipsoid(hand,'Thumb',[.05,.07,.15],[.08,.035,.037],materials.skin,detailSphere).rotation.z=.55;
    }else{
      ellipsoid(hand,'Holding_palm',[0,.025,.08],[.12,.12,.09],materials.skin,detailSphere);
    }
  });
  const tablet=new THREE.Group();tablet.name='Tablet';tablet.position.set(-.63,-.10,.49);tablet.rotation.z=.13;tablet.rotation.y=-.06;chest.add(tablet);
  box(tablet,'Tablet_case',[0,0,0],[.48,.65,.07],materials.sole,.035);
  box(tablet,'Tablet_screen',[0,.006,.045],[.414,.552,.012],materials.screen,.018);
  for(let line=0;line<5;line++)box(tablet,'Code_line',[-.005-(line%2)*.035,.15-line*.072,.063],[line%2?.16:.27,.017,.006],line===0?materials.glow:materials.trim,.004);
  for(let dot=0;dot<3;dot++)ellipsoid(tablet,'Status_light',[-.15+dot*.036,.285,.044],[.010,.010,.006],materials.glow,leafSphere);
  // The fingers wrap around the frame, not through the screen.
  for(let finger=0;finger<3;finger++)ellipsoid(tablet,'Grip_finger',[-.19,-.14-finger*.035,.07],[.066,.021,.035],materials.skin,leafSphere).rotation.z=.25;

  // Broad cream head, soft cheeks, subtle smile and nostrils.
  ellipsoid(head,'Head_skin',[0,0,0],[.78,.57,.51],materials.skin,new THREE.SphereGeometry(1,32,20));
  ellipsoid(head,'Lower_face',[0,-.245,.18],[.65,.265,.43],materials.muzzle);
  ellipsoid(head,'Muzzle',[0,-.06,.39],[.36,.19,.20],materials.muzzle);
  [-1,1].forEach(side=>{
    ellipsoid(head,'Cheek',[side*.51,-.17,.31],[.20,.15,.20],materials.skin,detailSphere);
    ellipsoid(head,'Cheek_blush',[side*.57,-.10,.46],[.11,.045,.012],materials.blush,detailSphere);
    ellipsoid(head,'Nostril',[side*.105,-.012,.579],[.029,.022,.011],materials.blush,detailSphere);
  });
  stroke(head,'Smile',[[-.54,-.16,.445],[-.42,-.195,.52],[-.23,-.16,.57],[0,-.135,.596],[.23,-.16,.57],[.42,-.195,.52],[.54,-.16,.445]],.012,materials.mouth);
  // Deterministic blue flecks; grouped on the forehead to leave the face clear.
  for(let i=0;i<24;i++){
    const x=Math.sin(i*2.39996)*(.12+.31*Math.sqrt(i/24)),y=.23+(i%5)*.048;
    const r=Math.max(0,1-(x*x)/(.78*.78)-(y*y)/(.57*.57));
    ellipsoid(head,'Freckle',[x,y,Math.sqrt(r)*.51+.007],[.007+(i%3)*.002,.009,.006],materials.gillLight,leafSphere);
  }
  const eyes=[];
  [-1,1].forEach(side=>{
    const eye=bone(head,side<0?'Eye_L':'Eye_R',[side*.405,.115,.40]);eyes.push(eye);
    eye.rotation.y=side*.13;
    ellipsoid(eye,'Eye_rim',[0,0,0],[.242,.29,.135],materials.muzzle);
    ellipsoid(eye,'Eye_dark',[0,0,.051],[.211,.254,.124],materials.eyes);
    ellipsoid(eye,'Iris_lower',[0,-.08,.148],[.153,.115,.034],materials.iris);
    ellipsoid(eye,'Pupil',[0,.025,.15],[.164,.201,.055],materials.eyes);
    ellipsoid(eye,'Eye_catchlight',[-.055,.12,.204],[.045,.064,.013],materials.glint,detailSphere).rotation.z=-.32;
    ellipsoid(eye,'Eye_catchlight_small',[.077,-.07,.193],[.017,.019,.008],materials.glint,leafSphere);
  });

  // Six articulated soft gills. Each has a trunk and compact featherlets.
  const gills=[];
  [-1,1].forEach(side=>{
    for(let row=0;row<3;row++){
      const gill=bone(head,`Gill_${side<0?'L':'R'}_${row}`,[side*.65,.16-row*.20,-.13]);gills.push(gill);
      const end=vec(side*(.48+row*.045),.45-row*.39,-.02);
      rod(gill,'Gill_stem',[0,0,0],end.toArray(),.082,materials.gill,.018);
      const axis=end.clone().normalize(),cross=vec(-axis.y,axis.x,0);
      for(let branch=1;branch<=5;branch++){
        const f=branch/6,center=end.clone().multiplyScalar(f);
        [-1,1].forEach(edge=>{
          const tip=center.clone().addScaledVector(cross,edge*(.15*(1-f)+.055)).addScaledVector(axis,.09);
          const middle=center.clone().lerp(tip,.55),direction=tip.clone().sub(center);
          const feather=ellipsoid(gill,'Gill_feather',middle.toArray(),[.049,direction.length()*.7,.027],branch%3===0?materials.gillLight:materials.gill,leafSphere);
          feather.quaternion.setFromUnitVectors(vec(0,1,0),direction.normalize());
        });
      }
      ellipsoid(gill,'Gill_tip',end.toArray(),[.04,.065,.025],materials.gillLight,leafSphere).quaternion.setFromUnitVectors(vec(0,1,0),axis);
    }
  });

  // A real skin with four bones: the curve is deformable, not a flat image.
  const tailOrigin=vec(0,.94,-.16);
  const curve=new THREE.CatmullRomCurve3([vec(),vec(-.12,-.14,-.36),vec(-.47,-.22,-.69),vec(-.85,-.13,-.82),vec(-1.10,.10,-.71),vec(-1.20,.37,-.54)]);
  const tail=bone(rig,'Tail',tailOrigin.toArray()),tailBones=[tail];
  for(let i=1;i<4;i++){
    const delta=curve.getPoint(i/3).sub(curve.getPoint((i-1)/3));
    tailBones.push(bone(tailBones[i-1],`Tail_${i}`,delta.toArray()));
  }
  function addSkinAttributes(geometry,ratios){
    const indices=[],weights=[];
    for(const ratio of ratios){const p=Math.min(2.999999,ratio*3),a=Math.floor(p),b=a+1,w=p-a;indices.push(a+1,b+1,0,0);weights.push(1-w,w,0,0);}
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
    return geometry;
  }
  const ringCount=28,radial=12,positions=[],triangles=[],ratios=[];
  for(let ring=0;ring<=ringCount;ring++){
    const ratio=ring/ringCount,center=curve.getPoint(ratio).add(tailOrigin),tangent=curve.getTangent(ratio).normalize();
    const normal=vec(0,1,0).cross(tangent).normalize(),binormal=tangent.clone().cross(normal).normalize();
    const radius=.12*Math.pow(1-ratio,.70)+.012;
    for(let j=0;j<=radial;j++){
      const angle=j/radial*Math.PI*2,vertex=center.clone().addScaledVector(normal,Math.cos(angle)*radius).addScaledVector(binormal,Math.sin(angle)*radius);
      positions.push(...vertex.toArray());ratios.push(ratio);
      if(ring<ringCount&&j<radial){const a=ring*(radial+1)+j,b=a+radial+1;triangles.push(a,b,a+1,b,b+1,a+1);}
    }
  }
  const tailGeometry=new THREE.BufferGeometry();tailGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));tailGeometry.setIndex(triangles);tailGeometry.computeVertexNormals();addSkinAttributes(tailGeometry,ratios);
  const tailMesh=new THREE.SkinnedMesh(tailGeometry,materials.skin);tailMesh.name='Tail_skin';tailMesh.castShadow=true;root.add(tailMesh);
  const fp=[],fi=[],fr=[];
  for(let i=0;i<=ringCount;i++){
    const ratio=i/ringCount,p=curve.getPoint(ratio).add(tailOrigin),width=Math.sin(Math.PI*ratio)*.33;
    fp.push(p.x,p.y-width*.30,p.z,p.x,p.y+width,p.z-.015);fr.push(ratio,ratio);
    if(i<ringCount){const a=i*2;fi.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const finGeometry=new THREE.BufferGeometry();finGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fp,3));finGeometry.setIndex(fi);finGeometry.computeVertexNormals();addSkinAttributes(finGeometry,fr);
  const finMesh=new THREE.SkinnedMesh(finGeometry,materials.fin);finMesh.name='Tail_fin';root.add(finMesh);
  root.updateMatrixWorld(true);
  // Root must precede all joints: glTF's skeleton root must be their common
  // ancestor. The weighted tail joints occupy indices 1–4. Include the rigid
  // articulated bones as joints too, so glTF preserves their Bone identity
  // for inspection and future skinning instead of exporting plain nodes.
  const skeletonBones=[rig,...tailBones];
  root.traverse(object=>{if(object.isBone&&!skeletonBones.includes(object))skeletonBones.push(object);});
  const skeleton=new THREE.Skeleton(skeletonBones);
  tailMesh.bind(skeleton);finMesh.bind(skeleton);
  tailMesh.normalizeSkinWeights();finMesh.normalizeSkinWeights();
  // Bake static pieces sharing a joint/material into one mesh. Bones remain
  // separate so tracking, limbs and gill movement still work after GLB export.
  const parents=[];root.traverse(object=>parents.push(object));
  for(const parent of parents){
    const batches=new Map();
    for(const child of parent.children){
      if(!child.isMesh||child.isSkinnedMesh||Array.isArray(child.material))continue;
      if(!batches.has(child.material))batches.set(child.material,[]);
      batches.get(child.material).push(child);
    }
    for(const [material,meshes] of batches){
      if(meshes.length<2)continue;
      const p=[],n=[],uv=[],indices=[];let offset=0;
      for(const mesh of meshes){
        mesh.updateMatrix();const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrix);
        const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),tex=geometry.getAttribute('uv');
        for(let i=0;i<position.count;i++){
          p.push(position.getX(i),position.getY(i),position.getZ(i));
          n.push(normal.getX(i),normal.getY(i),normal.getZ(i));uv.push(tex?tex.getX(i):0,tex?tex.getY(i):0);
        }
        const index=geometry.getIndex();
        for(let i=0;i<(index?index.count:position.count);i++)indices.push(offset+(index?index.getX(i):i));
        offset+=position.count;geometry.dispose();parent.remove(mesh);
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
      const merged=new THREE.Mesh(geometry,material);merged.name=`${parent.name}_${material.name}`;merged.castShadow=true;merged.receiveShadow=true;parent.add(merged);
    }
  }
  // Rest quaternions are deliberately stored as values, not a second hierarchy.
  const animatedParts={rig,hips,chest,head,eyes,tail,tailBones,gills,arms,legs};
  root.traverse(object=>{if(object.isBone)object.userData.restQuaternion=object.quaternion.toArray();});
  return {root,head,eyes,tail,animatedParts};
}
