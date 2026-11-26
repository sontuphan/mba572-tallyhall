import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as k from '/Users/tuphan/.gemini/config/skills/anatomy/kit/iso-kit.mjs';
import * as A from '/Users/tuphan/.gemini/config/skills/anatomy/kit/audit.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const P=k.fitProjection([...k.boxCorners({x:-69,y:-47,w:138,d:143,r:0},-10,143)],520,420,{pad:30,azimuth:42,elevation:32});
const R=A.recorder(P);
const parts=[];let count=0;
function box(name,x,y,z,w,d,h,tone='mid',drawer=-1,inner=''){
 const plan={x,y,w,d,r:Math.min(1.2,w/5,d/5)};
 const center=[x+w/2,y+d/2,z+h/2];
 if(h>70)inner+=k.lineSvg(k.sideSeam(plan,z+h*.25,P,4),{tone:'faint'});
 if(name==='Lid')inner+=k.lineSvg(k.planOutline(k.insetPlan(plan,4),z+h,P,4),{tone:'faint'});
 const svg=k.solidSvg(k.slabOf(plan,z,h,P,4,Math.min(.5,h/4)),{tone,crease:'faint',inner});
 const id='cab-'+count++;
 const item=R.put({name:id,at:center,piece:drawer<0?'case':'drawer'+drawer,move:drawer<0?[0,0,0]:[0,36,0],svg,shapes:[R.solid(A.slab(plan,z,h,{name:id+'.'+name,ground:name==='Rubber foot'},4))]});
 parts.push({id,name,center,drawer,key:item.key,svg,item});
}
function dotsOn(x,y,z,w,d){return k.dotsSvg([[x+2,y+2],[x+w-2,y+2],[x+2,y+d-2],[x+w-2,y+d-2]].map(([a,b])=>k.iso([a,b,z],P)),{size:.5,tone:'mid'})}
for(const x of [-60,49])for(const y of [-39,29]){box('Rubber foot',x,y,-10,11,10,5,'lo');box('Foot mounting pad',x-1,y-1,-5,13,12,2,'lo')}
box('Plinth',-68,-46,-3,136,92,5,'lo');
box('Base plate',-67,-45,2,134,90,4,'mid',-1,dotsOn(-67,-45,6,134,90));
box('Rear panel',-64,-44,6,128,3,130,'lo');
box('Left case side',-67,-44,6,3,87,130,'mid');
box('Right case side',64,-44,6,3,87,130,'mid');
box('Lid',-68,-45,136,136,90,4,'hi',-1,dotsOn(-68,-45,140,136,90));
box('Top rolled lip',-68,45,136,136,1.5,4,'mid');
for(let j=0;j<3;j++){
 const z=8+j*42;
 box('Shelf '+j,-64,-41,z,128,84,2,'lo');
 for(const x of [-58,55])box('Drawer slide '+j,x,-39,z+2,3,77,3,'lo');
 // The whole drawer is open-front sheet metal; its moving floor rests on the rails.
 box('Drawer floor '+j,-59,-38,z+5,118,76,2,'mid',j);
 box('Drawer left wall '+j,-59,-38,z+7,2,76,31,'mid',j);
 box('Drawer right wall '+j,57,-38,z+7,2,76,31,'mid',j);
 box('Drawer rear '+j,-57,-38,z+7,114,2,31,'lo',j);
 for(let p=0;p<3;p++){
  const py=10+p*12;
  const paper={x:-51,y:py,w:102,d:1.3,r:.3};
  // Rules stand for printing on the paper face, the one intentional free-line type.
  let inner='';
  for(let r=0;r<4;r++)inner+=k.lineSvg(k.segment([-44,py+1.3,z+21+r*3],[-16+(r%2)*12,py+1.3,z+21+r*3],P),{tone:'faint',free:true});
  box('Index card '+j+' '+p,-51,py,z+7,102,1.3,29,'hi',j,inner);
  box('Divider tab '+j+' '+p,-48+p*28,py,z+36,18,1.3,4,'hi',j);
 }
 box('Drawer face '+j,-61,38,z+4,122,3,35,'hi',j);
 box('Label surround '+j,-17,41,z+22,34,1,10,'mid',j);
 const rules=k.lineSvg(k.segment([-11,42.4,z+27],[11,42.4,z+27],P),{tone:'faint',free:true});
 box('Label insert '+j,-15,42,z+24,30,.4,6,'hi',j,rules);
 box('Left pull mount '+j,-23,41,z+11,4,5,5,'mid',j);
 box('Right pull mount '+j,19,41,z+11,4,5,5,'mid',j);
 box('Pull bar '+j,-23,46,z+11,46,3,5,'hi',j);
}
const states=[0];
for(let from=0;from<3;from++)for(let to=0;to<3;to++)if(from!==to)for(let i=0;i<=10;i++){
 const shares={drawer0:0,drawer1:0,drawer2:0,case:0};
 shares['drawer'+from]=1-i/10;shares['drawer'+to]=i/10;
 states.push({label:from+' to '+to+' @ '+i,shares});
}
A.settle(R,P,{states});
for(const p of parts)p.key=p.item.key;
A.auditOrExit(R,P,{frames:states,apart:false});
const at0=k.iso([0,0,0],P),at1=k.iso([0,1,0],P);
const svg=k.figureSvg({width:520,height:420,label:'A crafted three-drawer index-card cabinet. Drawers group the same local tuition records into needs action, awaiting funding, and settled. Select a drawer to filter the records.',body:['<path class="iso-halo" d="'+k.haloOf({x:-68,y:-46,w:136,d:92,r:3},-10,10,P)+'"/>',...parts.sort((a,b)=>a.key-b.key).map(p=>'<g id="'+p.id+'" class="cab-part" data-drawer="'+p.drawer+'">'+p.svg+'</g>')]});
const template=readFileSync(join(here,'shell.html'),'utf8');
const fontLicense=readFileSync(join(here,'fonts/OFL.txt'),'utf8');
const fontStyles=[['normal','InterVariable.woff2'],['italic','InterVariable-Italic.woff2']].map(([style,file])=>'@font-face{font-family:"Inter";font-style:'+style+';font-weight:100 900;font-display:swap;src:url("data:font/woff2;base64,'+readFileSync(join(here,'fonts',file)).toString('base64')+'") format("woff2")}').join('\n');
const styles='/* '+fontLicense+' */\n'+fontStyles+'\n'+readFileSync(join(here,'style.css'),'utf8');
const icons=readFileSync(join(here,'lucide-icons.json'),'utf8');
const license=readFileSync(join(here,'LUCIDE-LICENSE.txt'),'utf8');
const script='/* Lucide icons — '+license+' */\nconst LUCIDE_ICONS='+icons+';\n'+readFileSync(join(here,'model.js'),'utf8')+'\n'+readFileSync(join(here,'app.js'),'utf8');
mkdirSync(join(here,'dist'),{recursive:true});
for(const theme of ['light']){
 const html=template.replaceAll('%%THEME%%',theme).replace('%%STYLES%%',k.ISO_CSS+'\n'+styles).replace('%%CABINET%%',svg)
 .replace('%%SCRIPT%%',()=>'window.CABINET='+JSON.stringify({parts:parts.map(({svg,item,...p})=>p),vector:[at1[0]-at0[0],at1[1]-at0[1]],P})+';\n'+script);
 writeFileSync(join(here,'dist',theme==='light'?'index.html':'index-dark.html'),html);
}
rmSync(join(here,'dist/index-dark.html'),{force:true});
console.log('Built light theme. Cabinet solids:',parts.length);
