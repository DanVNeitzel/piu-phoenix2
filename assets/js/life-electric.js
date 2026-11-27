/* Shared electric paint used by the approved preview and the gameplay texture. */
(function(root){
 'use strict';
function rng(seed){return()=>{seed|=0;seed=seed+0x6d2b79f5|0;let x=Math.imul(seed^seed>>>15,1|seed);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296;};}
 function draw(ctx,rect,t,fill=1){
 const {x,y,width:bw,height:bh}=rect;
 const ix=x+bw*.023,iy=y+bh*.25,iw=bw*.954,ih=bh*.5;
 const random=rng(Math.floor(t*15)+510),pulse=.75+.25*Math.sin(t*17);
 ctx.save();ctx.globalCompositeOperation='screen';
 const energy=ctx.createLinearGradient(ix,0,ix+iw,0);[[0,'#ed25fa'],[.2,'#823dff'],[.4,'#30e7ff'],[.6,'#71fff7'],[.78,'#f0ffb0'],[1,'#ff589f']].forEach(([p,c])=>energy.addColorStop(p,c));ctx.fillStyle=energy;ctx.globalAlpha=.8;ctx.fillRect(ix,iy,iw*fill,ih);ctx.globalAlpha=1;
 // Cyan bloom surrounds the entire meter; a thin white core keeps the arcs sharp.
 function stroke(points,width,color,blur){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(p=>ctx.lineTo(...p));ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowColor='#16d9ff';ctx.shadowBlur=blur;ctx.stroke();}
 const top=[],bottom=[];for(let i=0;i<=26;i++){const px=x+bw*i/26;top.push([px,y+(random()-.5)*bh*.16]);bottom.push([px,y+bh+(random()-.5)*bh*.16]);}
 for(const points of [top,bottom,[[x,y],[x-bh*.025,y+bh*.4],[x+bh*.04,y+bh*.75],[x,y+bh]],[[x+bw,y],[x+bw+bh*.04,y+bh*.3],[x+bw-bh*.04,y+bh*.7],[x+bw,y+bh]]]){stroke(points,bh*.16,'#04b7ff99',14);stroke(points,bh*.065,'#64faff',7);stroke(points,Math.max(.7,bh*.022),'#eaffff',3);}
 // Branching bolts move along the fill instead of using a single blinking outline.
 for(let n=0;n<7;n++){const start=x+bw*(n/8+random()*.065),end=Math.min(x+bw,start+bw*(.12+random()*.18)),middle=y+bh*(.2+random()*.6),points=[];for(let j=0;j<7;j++)points.push([start+(end-start)*j/6,middle+(random()-.5)*bh*.7]);ctx.globalAlpha=.55+random()*.45;stroke(points,Math.max(1,bh*.07),'#3feeff',10);stroke(points,Math.max(.6,bh*.025),'#ecffff',3);if(n%2===0){const p=points[3];stroke([p,[p[0]+bw*.035,p[1]-bh*.35],[p[0]+bw*.055,p[1]-bh*.1]],Math.max(.6,bh*.023),'#aeffff',4);}}
 ctx.globalAlpha=.35*pulse;const sweep=x+((t*.55)%1)*bw,glow=ctx.createRadialGradient(sweep,y+bh/2,0,sweep,y+bh/2,bh*2.5);glow.addColorStop(0,'#d6ffff');glow.addColorStop(.35,'#39f2ff88');glow.addColorStop(1,'#00baff00');ctx.fillStyle=glow;ctx.fillRect(sweep-bh*2.5,y-bh*2,bh*5,bh*5);
 ctx.globalAlpha=1;ctx.shadowBlur=5;ctx.fillStyle='#eaffff';for(let n=0;n<12;n++){const px=x+random()*bw,py=y+(random()>.5?bh+3:-3)+(random()-.5)*7;ctx.fillRect(px,py,random()*1.5+.5,1);}
 ctx.restore();
 }
 root.PiuLifeElectric={draw};
})(globalThis);
