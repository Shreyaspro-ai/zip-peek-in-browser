/* Native layout measurements use the 1536 × 1024 reference coordinate system.
   Photographs are isolated artwork assets; every interface remains HTML/SVG. */
window.AquaReference={apply(key){
 const widths={command:219,map:206,water:219,sanitation:230,planning:210,projects:220,crisis:213,missions:219,simulator:226,learning:210,progress:249};
 const sw=widths[key],page=document.getElementById('page'),sb=document.getElementById('sidebar'),canvas=document.getElementById('canvas');
 canvas.dataset.reference=key;canvas.style.setProperty('--sidebar-width',sw+'px');
 const place=(el,x,y,w,h)=>{if(!el)return;Object.assign(el.style,{left:(x-sw)+'px',top:y+'px'});if(w)el.style.width=w+'px';if(h)el.style.height=h+'px';};
 // Preserve template composition while putting every primary panel on its measured bounds.
 const coords={command:[[252,589,766,298],[1027,591,497,304],[252,891,1272,116]],map:[[861,116,648,39],[1174,174,352,772]],water:[[241,186,928,102],[1183,111,337,197],[1183,326,337,232],[1190,570,323,151],[1183,729,337,243]],sanitation:[[1247,486,263,88],[256,681,516,293],[786,681,408,293],[1207,681,304,293]],planning:[[870,122,652,63],[1187,206,340,491],[222,810,456,179],[900,656,361,241],[1022,909,501,86]],projects:[[240,411,302,554],[548,411,302,554],[856,411,302,554],[1159,329,371,662]],crisis:[[240,199,568,57],[233,277,575,298],[233,589,540,395],[780,593,740,390]],missions:[[239,354,414,469],[663,354,414,469],[1087,354,428,469],[239,837,1276,173]],simulator:[[251,573,300,180],[571,573,941,180],[251,753,1261,183]],learning:[[234,688,267,294],[520,688,279,294],[819,688,267,294],[1095,337,438,648]],progress:[[263,647,1257,377]]};
 [...page.querySelectorAll(':scope > .box')].forEach((el,i)=>{const r=coords[key][i];if(r)place(el,...r)});
 const heads={command:[252,24,64,700],map:[265,17,54,400],water:[245,89,60,700],sanitation:[265,15,74,500],planning:[248,19,64,400],projects:[240,79,80,400],crisis:[240,41,86,700],missions:[250,103,76,400],simulator:[258,16,52,400],learning:[252,23,102,700],progress:[281,22,70,700]};
 const [hx,hy,fs,fw]=heads[key],head=page.querySelector('.heading');place(head,hx,hy);Object.assign(head.querySelector('h1').style,{fontSize:fs+'px',fontWeight:fw});
 page.querySelector('.scene')?.remove();
 const data=AquaReferenceData[key];
 page.querySelectorAll('.reference-photo').forEach(e=>e.remove());
 const badges=document.querySelector('.sdgs');badges.style.display='contents';[...badges.children].forEach((img,i)=>{const [file,x,y,x2,y2]=data.badges[i];img.src='assets/'+file;Object.assign(img.style,{position:'absolute',left:x+'px',top:y+'px',width:(x2-x)+'px',height:(y2-y)+'px',margin:0,border:0,borderRadius:0})});
 sb.querySelector('.logo svg')?.remove();let logo=sb.querySelector('.logo img');if(!logo){logo=document.createElement('img');sb.querySelector('.logo').prepend(logo)}logo.src=`assets/ref-${key}-logo.webp`;logo.alt='';
 sb.querySelectorAll('.reference-side-art').forEach(e=>e.remove());
 if(!sb.querySelector('.welcome-label')){const w=document.createElement('a');w.href='welcome.html';w.className='welcome-label';w.setAttribute('aria-hidden','true');w.tabIndex=-1;w.style.visibility='hidden';w.style.pointerEvents='none';w.innerHTML=icon('home')+'<span>Welcome</span>';sb.querySelector('.nav').prepend(w)}
 const navs={command:[95,55,46],map:[99,55,50],water:[99,61,54],sanitation:[98,51,47],planning:[85,58,55],projects:[95,57,50],crisis:[94,57,56],missions:[108,57,49],simulator:[97,54,52],learning:[97,58,50],progress:[93,54,49]};
 const [nt,step,nh]=navs[key];Object.assign(sb.querySelector('.nav').style,{marginTop:0,position:'absolute',top:nt+'px',left:'8px',right:'8px',display:'block'});
 const centers={command:[119,169,222,277,333,388,443,499,553,608,663,719],map:[123,175,227,281,335,390,445,501,556,612,668,723],water:[122,182,241,300,361,422,483,544,605,664,726,787],sanitation:[123,173,223,274,324,376,428,479,530,582,634,686],planning:[108,165,222,280,336,393,452,511,568,627,684,742],projects:[119,175,230,285,341,397,454,512,568,626,684,742],crisis:[119,175,230,285,342,400,456,517,575,632,689,747],missions:[135,191,247,304,361,418,475,532,591,650,708,764],simulator:[120,172,225,277,329,384,435,490,544,597,653,708],learning:[121,177,235,293,350,408,467,524,582,640,700,758],progress:[116,169,223,278,332,386,441,495,550,605,659,715]};
 [...sb.querySelectorAll('.welcome-label,.nav a')].forEach((el,i)=>{Object.assign(el.style,{height:nh+'px',marginBottom:0,position:'absolute',top:(centers[key][i]-nt-nh/2)+'px',left:0,width:'100%'});el.querySelector('svg')?.remove();let glyph=el.querySelector('.nav-glyph');if(!glyph){glyph=document.createElement('img');glyph.className='nav-glyph';glyph.alt='';el.prepend(glyph)}glyph.src=`assets/ref-${key}-nav-${i}.png`;if(key==='crisis'){let n=el.querySelector('.nav-index');if(!n){n=document.createElement('span');n.className='nav-index';el.querySelector('span').before(n)}n.textContent=String(i+1).padStart(2,'0')}else el.querySelector('.nav-index')?.remove();});
 const graphic=(el,name,i,cls='reference-glyph')=>{if(!el)return;const img=document.createElement('img');img.src=`assets/ref-${name}-${i}.webp`;img.className=cls;img.alt='';el.replaceWith(img);return img};
 if(key==='command'){[...page.querySelectorAll('.overview .stat-top > svg')].forEach((el,i)=>graphic(el,'command-stat',i));[...page.querySelectorAll('.priority>svg')].forEach((el,i)=>graphic(el,'command-priority',i));page.querySelectorAll('.overview .stat').forEach(el=>el.insertAdjacentHTML('beforeend','<small class="simulated-note">Simulated</small>'));}
 if(key==='sanitation')[...page.querySelectorAll(':scope > .grid .stat-top > svg')].forEach((el,i)=>graphic(el,'sanitation-stat',i));
 if(key==='planning')graphic(page.querySelector(':scope > .box:nth-of-type(3) > .row > svg'),'planning-area',0);
 if(key==='missions'){page.querySelectorAll('.mission-card').forEach((el,i)=>{const img=document.createElement('img');img.src=`assets/ref-mission-icon-${i}.webp`;img.className='mission-photo-icon';img.alt='';el.append(img)});[...page.querySelectorAll('.medal')].forEach((el,i)=>graphic(el,'mission-medal',i,'reference-medal'));}
 if(key==='progress')[...page.querySelectorAll('.medal')].forEach((el,i)=>graphic(el,'progress-medal',i,'reference-medal'));
 const pn=sb.querySelector('.page-number');pn.style.cssText='';pn.innerHTML=`<span>${pages.find(p=>p[0]===key)[3]} / 12</span><div class="track"><span style="width:${pages.find(p=>p[0]===key)[3]/12*100}%"></span></div>`;
 if(key==='learning')pn.innerHTML='Page 11/12';if(key==='planning'||key==='simulator')pn.style.display='none';
 if(key==='sanitation'){
  const grid=page.querySelector(':scope > .grid');place(grid,256,136,1255,122);
  [...grid.children].forEach((el,i)=>{el.style.padding='13px 19px';el.querySelector('.stat-top').style.gap='28px'});
 }
 if(key==='planning'){
  place(page.querySelector(':scope > p'),249,134,515);head.querySelector('.eyebrow').textContent='6/12';
  [...page.querySelectorAll(':scope > .label-chip')].forEach((el,i)=>place(el,...[[424,290],[800,321],[408,540],[1072,557]][i]));
  const top=page.querySelector(':scope > .box');[...top.querySelectorAll('.grid > .row')].forEach((el,i)=>{const note=document.createElement('span');note.className='reference-delta';note.textContent=['+2.1%','','+4'][i];el.append(note)});
  const info=document.createElement('span');info.className='budget-info';info.textContent='i';info.setAttribute('aria-label','Budget information');top.append(info);
 }
 if(key==='map'){
  [...page.querySelectorAll('.chip-large')].forEach((el,i)=>{const r=[[428,213,149,67],[892,329,158,71],[408,550,168,70],[944,740,161,67]][i];place(el,...r);el.insertAdjacentHTML('afterbegin',icon(['drop','leaf','wave','wave'][i],'class="district-icon"'))});
 }
 if(key==='command'){
  [...page.querySelectorAll(':scope > .label-chip')].forEach((el,i)=>place(el,...[[370,196],[880,194],[689,458],[1283,417]][i]));
 }
 if(key==='water'){
  [...page.querySelectorAll(':scope > .label-chip')].forEach((el,i)=>place(el,...[[315,351],[385,577],[942,594],[814,818],[765,674]][i]));
 }
 if(key==='projects'){
  place(page.querySelector(':scope > .tabs'),240,354,452);
  
 }
 if(key==='crisis'){
  [...page.querySelectorAll(':scope > .label-chip')].forEach((el,i)=>{place(el,...[[902,287,111,30],[1355,305,114,30],[902,442,136,30],[1340,513,125,30]][i]);el.textContent=el.textContent.replace('● ','')});
 }
 if(key==='missions'){
  [...page.querySelectorAll(':scope > .label-chip')].forEach((el,i)=>place(el,...[[720,105],[1055,115],[1172,191],[1417,257]][i]));
 }
 if(key==='simulator'||key==='progress'){
  const compare=page.querySelector('.compare');place(compare,...(key==='simulator'?[227,140,1309,423]:[249,223,1287,424]));compare.style.gridTemplateColumns=key==='simulator'?'47% 53%':'35% 65%';compare.querySelector('.compare-handle').style.removeProperty('left');
  if(key==='simulator'){const nodes=[...page.children].filter(e=>e.tagName==='DIV'&&e.style.top==='950px');if(nodes[0])place(nodes[0],253,950,278)}
 }
 if(key==='learning'){
  const arrows=page.querySelector(':scope > svg');if(arrows)arrows.style.display='none';
  [...page.querySelectorAll('.cycle-label')].forEach((el,i)=>place(el,...[[883,141,120,49],[1167,166,143,49],[576,303,163,49],[740,506,235,49]][i]));
  place(page.querySelector(':scope > .eyebrow'),243,667);
 }
 if(key==='progress'){
  [...page.querySelectorAll(':scope > .label-chip')].forEach((el,i)=>place(el,...[[859,249,112,25],[1293,277,91,25],[914,463,112,25],[1366,468,103,25]][i]));
  const motto=document.createElement('div');motto.className='progress-motto';motto.innerHTML='CLEAN WATER<br>STRONGER COMMUNITIES<br>BRIGHTER TOMORROWS';place(motto,1294,114);page.append(motto);sb.querySelector('.logo span').innerHTML='Aqua<span style="color:#0aafd0">City</span>';
 }else sb.querySelector('.logo span').textContent='AquaCity';
 if(key==='simulator'){
  const motto=document.createElement('div');motto.className='simulator-motto';motto.innerHTML='Plan Today<br>for a Brighter<br>Tomorrow';place(motto,1388,108);page.append(motto);
  const slogan=document.createElement('div');slogan.className='sidebar-motto';slogan.innerHTML='GREENER<br>WATER SAFER<br>CITIES BRIGHTER<br>PEOPLE HAPPIER';sb.querySelector('.sidebar-motto')?.remove();sb.append(slogan);
  [...page.querySelectorAll('.box:nth-of-type(2) .range-labels')].forEach((el,i)=>el.innerHTML=[['-50%','0%','+50%'],['-20%','0%','+50%'],['60','120','200'],['500','1,800','3,000']][i].map(s=>'<span>'+s+'</span>').join(''));
 }
 if(key!=='simulator')sb.querySelector('.sidebar-motto')?.remove();
 AquaReferenceCharts(key,page);
 const component=(nodes,name)=>[...nodes].forEach((el,i)=>{const img=document.createElement('img');img.className='component-icon';img.alt='';img.src=`assets/component-${name}-${i}.webp`;el.replaceWith(img)});
 if(key==='map')component(page.querySelectorAll('.box:last-child .grid.three>div>svg'),'map-metric');
 if(key==='planning'){
  component(page.querySelectorAll(':scope>.box:first-of-type .grid>.row>svg'),'planning-top');
  component(page.querySelectorAll('.box:has(.small) .grid>.row>svg'),'planning-selected');
  component(page.querySelectorAll('.tool>svg'),'planning-tool');
 }
 if(key==='projects'){
  page.querySelectorAll('.table').forEach(table=>component(table.querySelectorAll('svg'),'project-table'));
  page.querySelectorAll('.effects>svg').forEach(el=>component([el],'project-effect'));
 }
 if(key==='crisis')component(page.querySelectorAll('.box:has(.eyebrow) .grid>.row>svg'),'crisis-stat');
 if(key==='simulator')page.querySelectorAll('.compare-bar').forEach(bar=>component(bar.querySelectorAll('svg'),'simulator-stat'));
 if(key==='progress')component(page.querySelectorAll('.outcome .row>svg'),'progress-outcome');
},panel(el){
 const key=document.getElementById('page').dataset.page,sw=parseInt(getComputedStyle(document.getElementById('sidebar')).width);
 const r=el?.classList.contains('project-panel')?[1159,329,371,662]:el?.classList.contains('lesson-detail')?[1095,337,438,648]:key==='map'?[1174,174,352,772]:null;
 if(r)Object.assign(el.style,{left:(r[0]-sw)+'px',top:r[1]+'px',width:r[2]+'px',height:r[3]+'px'});
 
}};
