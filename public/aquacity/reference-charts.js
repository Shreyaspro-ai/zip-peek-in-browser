function AquaReferenceCharts(key,page){
 const D=AquaChartData,svg=(body,w,h,label)=>`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
 // Separate colored curves from the translucent top-series fill.
 D.trend1=[[0,103],[12,98],[24,91],[43,87],[64,84],[83,80],[102,77],[121,73],[141,65],[162,61],[181,58],[202,54],[220,50],[242,46],[270,44]];
 D.trend2=[[0,117],[18,113],[39,106],[60,102],[81,97],[102,93],[122,88],[142,84],[161,78],[181,77],[203,72],[223,68],[242,65],[270,62]];
 D.trend3=[[0,124],[18,121],[40,118],[61,113],[82,115],[104,109],[124,107],[145,104],[165,102],[185,98],[206,97],[228,93],[245,87],[270,83]];
 D.trend4=[[0,135],[18,131],[41,128],[61,125],[82,124],[103,120],[124,118],[145,115],[165,114],[186,111],[207,111],[228,108],[246,107],[270,103]];
 const path=(points,x=0,y=0)=>points.map(([px,py],i)=>(i?'L':'M')+(px+x)+' '+(py+y)).join('');
 const line=(name,color,x,y,fill=false,h=0)=>{const d=path(D[name],x,y);return (fill?`<path d="${d}L${D[name].at(-1)[0]+x} ${h}H${x}Z" fill="${color}" opacity=".15"/>`:'')+`<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6"/>`};
 if(key==='sanitation'){
  const chart=page.querySelector('.chart');let b='<g stroke="#e8e3d8" stroke-width=".7">';for(let i=0;i<5;i++)b+=`<path d="M58 ${7+i*36.5}H480"/>`;for(let i=0;i<13;i++)b+=`<path d="M${58+i*35.16} 7V153"/>`;b+='</g><g font-size="12" fill="#41434b" font-family="Arial">';for(let i=0;i<5;i++)b+=`<text x="48" y="${11+i*36.5}" text-anchor="end">${600-i*150}</text>`;b+='<text transform="translate(11 108) rotate(-90)">m³/day</text>';['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].forEach((m,i)=>b+=`<text x="${68+i*34.4}" y="174">${m}</text>`);b+='</g>'+line('load','#c4982c',58,7,true,153)+line('capacity','#10af9e',58,7);
  ['load','capacity'].forEach((name,j)=>{for(let i=0;i<14;i++){const x=Math.round(i*420/13),point=D[name].reduce((a,p)=>Math.abs(p[0]-x)<Math.abs(a[0]-x)?p:a);b+=`<circle cx="${point[0]+58}" cy="${point[1]+7}" r="2.7" fill="${j?'#10af9e':'#c4982c'}"/>`}});
  chart.outerHTML=svg(b,480,195,'Treatment capacity and sewage load over twelve months').replace('<svg ','<svg class="reference-capacity" ');
 }
 if(key==='water'){
  const chart=page.querySelector('.chart');let b='<g stroke="#e5e0d5" stroke-width=".6">';for(let i=0;i<5;i++)b+=`<path d="M41 ${10+i*26.25}H302"/>`;b+='<path d="M175 10V115"/></g><g font-family="Arial" font-size="12" fill="#555">';for(let i=0;i<5;i++)b+=`<text x="30" y="${14+i*26.25}" text-anchor="end">${100-i*25}%</text>`;b+='<text x="41" y="135">7 days ago</text><text x="272" y="135">Today</text></g>'+line('reservoir','#08949a',41,10,true,115);chart.outerHTML=svg(b,302,145,'Reservoir storage over seven days').replace('<svg ','<svg class="reference-reservoir" ');
 }
 if(key==='progress'){
  page.querySelectorAll('.outcome .spark').forEach((el,i)=>{const color=i===3?'#bb891e':i===4?'#397c19':'#07bca8';el.outerHTML=svg(line('outcome'+i,color,0,0,true,39),120,39,'Outcome trend').replace('<svg ','<svg class="spark" ')});
  const chart=page.querySelector('.box > .grid > div:last-child > svg');let b='<g stroke="#e7e4db" stroke-width=".65">';for(let i=0;i<5;i++)b+=`<path d="M25 ${14+i*35.25}H296"/>`;for(let i=0;i<24;i++)b+=`<path d="M${25+i*11.78} 14V155"/>`;b+='</g><g font-family="Arial" font-size="9" fill="#53565d">';for(let i=0;i<5;i++)b+=`<text x="16" y="${18+i*35.25}" text-anchor="end">${200-i*50}</text>`;['Year 1','5','10','15','20'].forEach((n,i)=>b+=`<text x="${[12,81,139,195,252][i]}" y="171">${n}</text>`);b+='</g>';const cs=['#0cbaa6','#438b2c','#5ac4e9','#c19422','#658946'];cs.forEach((c,i)=>{b+=line('trend'+i,c,25,14,i===0,155);b+=`<circle cx="328" cy="${35+i*21}" r="4.5" fill="${c}"/><text x="341" y="${38+i*21}" font-size="10" font-family="Arial" fill="#50505a">${['Water Efficiency','Sanitation Coverage','Flood Readiness','Budget Health','Resident Wellbeing'][i]}</text>`});chart.outerHTML=svg(b,438,180,'City trends from year one to year twenty').replace('<svg ','<svg class="reference-trends" ');
 }
 if(key==='simulator'){
  const sparks=page.querySelectorAll('.spark');if(sparks[0])sparks[0].outerHTML=svg('<path d="M0 16Q22 6 48 25T97 29T148 25T202 25T250 20V48H0Z" fill="#22b6bd" opacity=".3"/><path d="M0 16Q22 6 48 25T97 29T148 25T202 25T250 20" fill="none" stroke="#22b6bd"/>',250,48,'Projected water demand').replace('<svg ','<svg class="spark" ');
  if(sparks[1])sparks[1].outerHTML=svg([27,45,30,18,36,48,30,26].map((h,i)=>`<rect x="${i*30}" y="${49-h}" width="17" height="${h}" fill="${[2,3,5,6].includes(i)?'#c6a044':'#11b5a7'}"/>`).join(''),250,54,'Projected budget use').replace('<svg ','<svg class="spark" ');
  if(sparks[2])sparks[2].outerHTML=svg('<path d="M0 46Q25 25 58 25T120 18T170 9T256 0V54H0Z" fill="#25bbc4" opacity=".28"/><path d="M0 46Q25 25 58 25T120 18T170 9T256 0" fill="none" stroke="#0ca9b0"/><circle cx="162" cy="11" r="3" fill="#007e66"/>',256,54,'Projected citizen wellbeing').replace('<svg ','<svg class="spark" ');
  page.querySelectorAll('.box:nth-of-type(3) .variable .row.between').forEach(el=>{el.lastElementChild.insertAdjacentHTML('beforeend','<small style="display:block;color:#888;font-size:11px;margin-top:4px">vs. current plan</small>')});
 }
}
