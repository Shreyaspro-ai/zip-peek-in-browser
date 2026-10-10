/* Real photographs and native labels; the interface is never rasterised. */
const basePhotoApply=AquaReference.apply.bind(AquaReference);
const basePhotoPanel=AquaReference.panel.bind(AquaReference);
const photoScenes={command:['city_sunset',0],map:['park',129],water:['barrage',290],sanitation:['treatment',260],planning:['park',195],projects:['city_sunset',0],crisis:['city',0],missions:['city_sunset',0],learning:['park',0]};
function photoPanel(el){if(!el)return;el.querySelectorAll('img.picture').forEach(img=>{if(img.src.includes('recycling-detail'))img.src='assets/photo-treatment.webp'});if(document.getElementById('page').dataset.page==='map'){const h=el.querySelector('h2');h.lastChild.textContent=' Greenbank';el.querySelector('h3').textContent='Local Infrastructure';}if(el.classList.contains('lesson-detail'))el.querySelector('img.picture').src='assets/photo-'+['pipe','treatment','park'][selectedLesson]+'.webp';}
AquaReference.panel=function(el){basePhotoPanel(el);photoPanel(el)};
AquaReference.apply=function(key){
 if(key==='water'){document.querySelector('.photo-credit-button')?.remove();PreviousWaterReference.apply(key);return;}
 basePhotoApply(key);
 const page=document.getElementById('page'),sw=parseInt(getComputedStyle(document.getElementById('sidebar')).width);
 const q=s=>page.querySelector(s);
 const pos=(el,x,y,w,h)=>{Object.assign(el.style,{left:(x-sw)+'px',top:y+'px'});if(w)el.style.width=w+'px';if(h)el.style.height=h+'px';};
 page.querySelectorAll(':scope>.label-chip').forEach(e=>e.remove());
 page.querySelectorAll('.reference-side-art').forEach(e=>e.remove());
 document.querySelectorAll('.reference-side-art').forEach(e=>e.remove());
 if(photoScenes[key]){const [photo,y]=photoScenes[key],im=document.createElement('img');im.className='real-scene';im.src='assets/photo-'+photo+'.webp';im.alt=photo==='park'?'River and urban green space':photo==='treatment'?'Wastewater treatment facility':'AquaCity waterfront';pos(im,sw,y,1536-sw,1024-y);if(key==='learning'){im.style.width=(1095-sw)+'px';im.style.height='647px';}page.prepend(im);const wash=document.createElement('div');wash.className='photo-wash';page.prepend(wash);}
 function tag(text,x,y){const el=document.createElement('div');el.className='place-tag';el.textContent=text;pos(el,x,y);page.append(el);return el;}
 if(key==='command'){tag('Waterfront Homes',318,289);tag('Canal District',768,411);tag('Ripple Bay',1156,308);}
 if(key==='planning'){tag('Greenbank',285,221);tag('Residential blocks',366,359);tag('River corridor',669,462);tag('Parkland',986,500);q('.plan-modal p').innerHTML='Apply housing, green space, drainage and<br>permeable-path changes to the selected area?';}
 if(key==='map'){tag('Greenbank',280,166);[['Residential blocks',362,344],['Naturalised river',720,411],['Urban green space',867,644]].forEach(([s,x,y])=>{let el=tag(s,x,y);el.outerHTML=el.outerHTML.replace('<div','<button type="button" data-action="district" data-district="Greenbank"').replace('</div>','</button>')});photoPanel(q(':scope>.box:last-of-type'));}
 if(key==='water'){tag('Water infrastructure',280,303);[['Supply Node',315,351],['Central Zone',385,577],['River Zone',942,594],['Coastal Zone',814,818],['Leak detected',765,674]].forEach(([s,x,y])=>tag(s,x,y));}
 if(key==='sanitation'){tag('Treatment facility',285,280);}
 if(key==='projects'){page.querySelectorAll('.project-card').forEach((el,i)=>pos(el,240+i*426,411,414,554));}
 
 if(key==='crisis'){tag('Riverside (flood-prone)',950,287);const map=q('img[src$="photo-park.webp"]');map.insertAdjacentHTML('afterend','<svg class="risk-overlay" viewBox="0 0 506 332" aria-hidden="true"><path fill="#e7614f88" d="M190 25L330 48 305 130 230 165 174 91Z M270 195L410 190 462 294 335 312Z"/><path fill="#eab73588" d="M83 135L186 111 233 205 122 253Z"/></svg>');}
 if(key==='learning'){const arrows=q(':scope>svg');if(arrows)arrows.style.display='block';tag('Water infrastructure',270,590);}
 if(key==='simulator'||key==='progress'){q('.compare-handle').textContent='↔';if(key==='simulator'){q('.simulator-motto').innerHTML='Plan Today<br>Build Tomorrow';page.querySelectorAll('.compare-bar .muted').forEach(e=>e.textContent='');}else q('.progress-motto').innerHTML='CLEAN WATER<br>HEALTHY COMMUNITIES<br>RESILIENT CITIES';}
 page.querySelectorAll('.simulated-note').forEach(e=>e.remove());
 const credits=document.createElement('button');credits.className='photo-credit-button';credits.textContent='Photo credits';credits.onclick=()=>document.getElementById('photo-credits').showModal();document.querySelector('.photo-credit-button')?.remove();document.getElementById('sidebar').append(credits);
};
