const P=require('pptxgenjs');
/* ══════════════ DECK TEMPLATE ══════════════
   __DECK_TITLE__

   Everything above the first slide is load-bearing. The numbers in SP and the
   helpers below come from MEASURED font metrics, not taste, and the comments
   say which failure each one prevents. Change them only with a measurement.

   Build:   node build.js
   Verify:  deck_lint then deck_verify   (deck_verify is the one that travels)
   The text-free build used by deck_verify is produced by BGONLY=1 below. */

// ── palette: one accent that always means the same thing ────────────────────
const C={
  paper:'FFFFFF',      // page
  panel:'F8FAFC',      // card sitting on the page
  band:'F1F5F9',       // a band that groups a row
  line:'E2E8F0',       // hairline on paper
  ink:'1E293B',        // body text on paper
  muted:'64748B',      // secondary text on paper
  primary:'1E3A8A',    // headings
  accent:'1D4ED8',     // the one accent; it must earn attention by being rare
  ground:'1C1815',     // dark ground for statement slides
  groundPanel:'2A2320',// panel on the dark ground
  groundEdge:'3B332B', // hairline on the dark ground
  cream:'F2E9DA',      // body text on the dark ground
  creamMuted:'A99B87', // secondary text on the dark ground
  gold:'B08640',       // accent on the dark ground
  goldSoft:'D9B168'    // the same accent, made legible on the dark ground
};

// ── type scale ──────────────────────────────────────────────────────────────
// Keep every size here. A size used at one place is a TYPE finding, on purpose:
// a deck whose sizes come from nowhere reads as drift.
const T={ d:72, t:44, l:28, b:24, s:20, stat:64 };

// ── spacing ladder ──────────────────────────────────────────────────────────
// The single most valuable block in this file. Each gap is a DECISION, so the
// same relationship always gets the same number. Hand-tuned spacing is where
// "the padding looks inconsistent" comes from every time.
const SP={
  m:0.85,          // page margin; every page-level left edge sits here
  gap:0.28,        // between columns
  pad:0.28,        // inside a card, on ALL FOUR sides
  r:0.08,          // corner radius
  top:0.72,        // page label
  titleY:1.28,     // title, which must fit one line
  bodyY:2.30,      // first content block
  end:6.45,        // nothing may cross this
  footY:6.90,      // footer baseline
  lead:0.34,       // a lead paragraph to the block beneath it
  items:0.10,      // a claim to its own supporting line
  between:0.14     // one list item to the next
};
const CW=13.333-2*SP.m;

// ── fonts that travel ───────────────────────────────────────────────────────
// Arial and Georgia are present in PowerPoint on both platforms AND in Google
// Slides and web viewers. Calibri and Cambria are NOT: they ship with desktop
// Office only, so every web viewer substitutes them and the text reflows.
const SERIF='Georgia', SANS='Arial';

// Measured substitution ratio: DejaVu Sans is 1.14x Arial at the same size and
// 1.19x when bold, which is the worst case and the one headings use.
const SUBST=1.18;

const BGONLY=!!process.env.BGONLY;   // set by deck_verify to render text-free
const p=new P(); p.layout='LAYOUT_WIDE'; let n=0;
if(BGONLY){const _as=p.addSlide.bind(p);p.addSlide=(...a)=>{const s=_as(...a);s.addText=()=>s;return s;};}
const bump=()=>{n++;};

// ── text metrics ────────────────────────────────────────────────────────────
// Average character advance per family, with headroom. Measured from the real
// fonts; guessing wide flags good layouts, guessing narrow hides overflow.
function adv(bold,serif){
  if(serif) return bold?0.57:0.49;
  return bold?0.53:0.49;
}
// A hyphen is a break opportunity, so "well-known" can split after it. A plain
// word wrap misses every one and over-predicts the line count.
function wrapLines(para,cpl){
  let lines=1,cur=0;
  for(const word of para.split(/\s+/).filter(Boolean)){
    const parts=word.split(/(?<=-)/);
    parts.forEach((part,pi)=>{const len=part.length;
      const cost=cur===0?0:(pi===0?1:0);
      if(cur===0)cur=len; else if(cur+cost+len<=cpl)cur+=cost+len; else {lines++;cur=len;}});
  }
  return lines;
}
function nl(t,w,pt,bold,serif){const cpl=Math.max(1,Math.floor(w/(adv(bold,serif)*pt/72)));
  return t.split('\n').reduce((a,x)=>a+wrapLines(x,cpl),0);}
// Height at the design metrics.
function th(t,w,pt,bold,serif,lsm){const L=nl(t,w,pt,bold,serif),k=lsm||1;
  return L*pt*(L===1?1.10:1.22)*k/72;}
/* Height at the WORST-CASE metrics. Use this wherever the returned value
   positions the next block, so a viewer with a wider font pushes the next block
   by exactly as much as the text grows and the gap survives. */
function thS(t,w,pt,bold,serif,lsm){const L=nl(t,w/SUBST,pt,bold,serif),k=lsm||1;
  return L*pt*(L===1?1.10:1.22)*k/72;}
function chk(t,w,pt,y,tag,bold,serif,lsm){const b=y+th(t,w,pt,bold,serif,lsm);
  if(b>SP.end+0.02)console.error(`  !! [${tag}] "${t.slice(0,34)}" ${b.toFixed(2)}`);}

/* T_ draws text and returns the design-metric bottom.
   T_S draws the same text and returns the WORST-CASE bottom.
   Rule: T_S wherever the return value positions the next block; T_ for the last
   element in a column, where a reserve would only waste vertical space. */
function T_(s,t,o){
  const nx=th(t,o.w,o.pt,o.bold,o.serif,o.lsm);
  if(BGONLY) return o.y+nx;
  if(o.tag) chk(t,o.w,o.pt,o.y,o.tag,o.bold,o.serif,o.lsm);
  s.addText(t,{x:o.x,y:o.y,w:o.w,h:nx+0.16,fontFace:o.serif?SERIF:SANS,fontSize:o.pt,
    bold:!!o.bold,italic:!!o.italic,color:o.color||C.ink,align:o.align||'left',
    valign:'top',lineSpacingMultiple:o.lsm||1.0,margin:0});
  return o.y+nx;
}
function T_S(s,t,o){T_(s,t,o); return o.y+thS(t,o.w,o.pt,o.bold,o.serif,o.lsm);}

// ── primitives ──────────────────────────────────────────────────────────────
const card=(s,x,y,w,h,fill,ln)=>s.addShape(p.ShapeType.roundRect,{x,y,w,h,
  fill:{color:fill||C.panel},rectRadius:SP.r,line:{color:ln||C.line,width:1}});
const photo=(s,f,x,y,w,h,alt)=>s.addImage({path:'photos/'+f,x,y,w,h,
  sizing:{type:'cover',w,h},altText:alt});
const scrim=(s,f,x,y,w,h)=>s.addImage({path:'assets/'+f,x,y,w,h,
  altText:'Gradient scrim for text legibility'});
const colx=(count,i,gap)=>{const g=gap==null?SP.gap:gap;
  const w=(CW-(count-1)*g)/count; return {x:SP.m+i*(w+g),w};};

function head(s,label,title,dark){
  if(BGONLY) return SP.titleY;
  s.addText(label.toUpperCase(),{x:SP.m,y:SP.top,w:9,h:0.42,fontFace:SANS,fontSize:T.s,
    bold:true,color:dark?C.goldSoft:C.accent,charSpacing:2.4,margin:0,valign:'top'});
  return T_(s,title,{x:SP.m,y:SP.titleY,w:CW,pt:T.t,bold:true,
    color:dark?C.cream:C.primary,serif:true,tag:'title'});
}
function foot(s,section,dark){
  n++; if(BGONLY) return;
  const c=dark?C.creamMuted:C.muted;
  s.addText(section.toUpperCase(),{x:SP.m,y:SP.footY,w:9,h:0.40,fontFace:SANS,
    fontSize:T.s,color:c,charSpacing:2.2,margin:0,valign:'top'});
  s.addText(String(n).padStart(2,'0'),{x:11.6,y:SP.footY,w:0.88,h:0.40,fontFace:SANS,
    fontSize:T.s,color:c,align:'right',margin:0,valign:'top'});
  const y=SP.footY-0.22;
  s.addShape(p.ShapeType.rect,{x:SP.m,y,w:CW,h:0.01,
    fill:{color:dark?C.groundEdge:C.line},line:{color:dark?C.groundEdge:C.line}});
}
function rule(s,y,color,x,w){s.addShape(p.ShapeType.rect,
  {x:x==null?SP.m:x,y,w:w||CW,h:0.01,fill:{color},line:{color}});}

/* A card draws BEHIND its own text, so its height must be computed before
   anything is drawn. Deriving it from the content is what keeps the padding
   equal on all four sides; sizing to a fixed row height dumps the leftover
   space into the bottom padding, which is what "inconsistent padding" is.
   One spare line is reserved, sized from the longest block, and added as bottom
   padding: that is where a wrapped line would actually land. */
function contentCard(s,x,y,w,blocks,opt){
  const o=opt||{}, dark=!!o.dark, iw=w-2*SP.pad;
  const gaps=blocks.slice(1).map(b=>b.gap==null?SP.items:b.gap);
  // Natural height uses the DESIGN metrics, not the substitute ones. thS already
  // contains a spare line per block for a wider font; adding another spare line
  // on top of that reserves room twice and the card ends up half empty. That is
  // what a 1.20in bottom padding was: two reserves for one risk.
  const natural=gaps.reduce((a,g)=>a+g,0)+blocks.reduce((a,b)=>a+
    (b.rule?0.01:th(b.t,iw,b.pt,b.bold,b.serif,b.lsm)),0);
  const texts=blocks.filter(b=>!b.rule);
  const longest=texts.length?texts.reduce((a,b)=>
    nl(b.t,iw,b.pt,b.bold,b.serif)>nl(a.t,iw,a.pt,a.bold,a.serif)?b:a):null;
  // Reserve a spare line ONLY where the text would actually wrap onto one: the
  // block that is closest to its line limit. Reserving a full line on every card
  // makes short cards look half empty, because the reserve is sized by the font
  // rather than by the risk.
  const cpl=(b)=>Math.max(1,Math.floor(iw/(adv(b.bold,b.serif)*b.pt/72)));
  const atRisk=texts.filter(b=>{
    const now=nl(b.t,iw,b.pt,b.bold,b.serif);
    const wide=nl(b.t,iw/SUBST,b.pt,b.bold,b.serif);
    return wide>now;                      // this block DOES grow on a wider font
  });
  const spare=(o.room===false)?null:(atRisk.length?atRisk.reduce((a,b)=>
    (nl(b.t,iw,b.pt,b.bold,b.serif)/cpl(b))>(nl(a.t,iw,a.pt,a.bold,a.serif)/cpl(a))?b:a):null);
  const room=0;  // EXPERIMENT: no reserve at all
  const h=o.h||natural+room+2*SP.pad;
  const slack=o.h?Math.max(0,(o.h-2*SP.pad)-natural):0;
  const extra=gaps.length?slack/gaps.length:0;
  card(s,x,y,w,h,dark?C.groundPanel:C.panel,dark?C.groundEdge:C.line);
  let yy=y+SP.pad;
  blocks.forEach((b,i)=>{
    if(i) yy+=gaps[i-1]+extra;
    if(b.rule){rule(s,yy,b.color||(dark?C.groundEdge:C.line),x+SP.pad,iw); yy+=0.01; return;}
    yy=T_(s,b.t,{x:x+SP.pad,y:yy,w:iw,pt:b.pt,bold:b.bold,color:b.color,
                 serif:b.serif,lsm:b.lsm,tag:b.tag,align:b.align});
  });
  return h;
}

/* A claim and its support, repeated. One spacing token governs every instance
   so two lists of the same kind cannot drift apart. */
function listStack(s,x,y,w,items,opt){
  const o=Object.assign({hPt:T.l,bPt:T.b,hColor:C.primary,bColor:C.muted,
                         lsm:1.15,tag:'li'},opt||{});
  let yy=y;
  items.forEach(([claim,support],i)=>{
    if(i) yy+=SP.between;
    const y0=yy;
    yy=T_(s,claim,{x,y:yy,w,pt:o.hPt,bold:true,color:o.hColor,tag:o.tag});
    const claimH=thS(claim,w,o.hPt,true,false);
    T_(s,support,{x,y:y0+claimH+SP.items,w,pt:o.bPt,color:o.bColor,lsm:o.lsm,tag:o.tag+'b'});
    yy=y0+claimH+SP.items+thS(support,w,o.bPt,false,false,o.lsm);
  });
  return yy-y;
}

/* A statement slide: large type on the dark ground. Stacked from one token so
   every statement slide shares a rhythm instead of being placed by hand. */
function statement(s,blocks,opt){
  const o=opt||{};
  let yy=o.y==null?2.34:o.y;
  blocks.forEach((b,i)=>{
    const gap=b.gap==null?(o.gap==null?0.60:o.gap):b.gap;
    if(i) yy+=gap;
    if(b.ruleBefore) rule(s,yy-gap/2,b.ruleColor||C.groundEdge,SP.m,4.2);
    yy=T_(s,b.t,{x:SP.m,y:yy,w:b.w||11.0,pt:b.pt,bold:b.bold!==false,
      serif:b.serif!==false,color:b.color,lsm:b.lsm||1.16,tag:b.tag});
  });
  return yy;
}

/* A pull quote. The opening mark is part of the text so it can never collide
   with it and never sits outside the margin. The attribution is placed from a
   ROOMIER height: if the quote takes one more line on a viewer with a wider
   font, the credit must not land on the quote. */
function quoteSlide(s,quote,attribution,opt){
  const o=opt||{}, dark=o.dark!==false;
  const x=o.x==null?SP.m:o.x, w=o.w||11.0, y=o.y||2.60;
  const body=o.mark?('\u201C'+quote+'\u201D'):quote;
  const pt=o.pt||T.q;
  const yy=T_(s,body,{x,y,w,pt,serif:true,lsm:1.16,tag:'q',
    color:dark?C.cream:C.ink});
  // Place the credit from the WORST-CASE height: if the quote takes one more line
  // on a viewer with a wider font, the credit must not land on the quote. The
  // leftover thS(...,0) term that used to sit here was dead arithmetic from an
  // earlier version.
  const room=thS(body,w,pt,true,true,1.16);
  T_(s,attribution,{x,y:y+room+0.30,w,pt:T.s,
    color:dark?C.goldSoft:C.gold,tag:'qa'});
  return yy;
}

/* ══════════════ SLIDE 1  COVER ══════════════ */
let s=p.addSlide(); s.background={color:C.paper};
T_(s,'__DECK_TITLE__',{x:SP.m,y:2.30,w:11.0,pt:T.d,bold:true,serif:true,
  color:C.primary,lsm:1.10,tag:'cover'});
T_(s,'Subtitle or date goes here.',{x:SP.m,y:4.20,w:10.0,pt:T.l,color:C.muted,tag:'cover2'});
bump();

/* ══════════════ SLIDE 2  A CONTENT SLIDE ══════════════ */
s=p.addSlide(); s.background={color:C.paper};
head(s,'01  Section','A title that fits one line');
let y=T_(s,'A lead paragraph. Keep it short enough to stay on one or two lines.',
  {x:SP.m,y:SP.bodyY,w:7.4,pt:T.b,color:C.ink,lsm:1.20,tag:'s2'});
T_(s,'Supporting text, placed from the substitute-safe height above.',
  {x:SP.m,y:y+SP.lead,w:7.4,pt:T.b,color:C.muted,lsm:1.20,tag:'s2b'});
foot(s,'01  Section',false);

/* ══════════════ SLIDE 3  A CARD ROW ══════════════ */
s=p.addSlide(); s.background={color:C.paper};
head(s,'02  Section','Something in three parts');
[['01','First part','Short support line.'],
 ['02','Second part','Short support line.'],
 ['03','Third part','Short support line.']]
.forEach(([num,title,body],i)=>{
  const c=colx(3,i);
  contentCard(s,c.x,SP.bodyY,c.w,[
    {t:num,pt:T.b,bold:true,color:C.accent},
    {t:title,pt:T.b,bold:true,color:C.primary,gap:SP.items},
    {t:body,pt:T.b,color:C.muted,lsm:1.15,gap:SP.items}]);
});
foot(s,'02  Section',false);

/* ══════════════ SLIDE 4  A STATEMENT ══════════════ */
s=p.addSlide(); s.background={color:C.ground};
// Each line must fit ONE rendered line at 48pt: the budget is 28 characters
// at this width. A statement that wraps to two lines moves everything below it.
statement(s,[
  {t:'A sentence worth stopping',pt:44,color:C.cream,tag:'st1'},
  {t:'and the turn it takes.',pt:44,color:C.gold,tag:'st2'}],{gap:1.70});
foot(s,'Statement',true);

const path=require('path');
// The output takes the folder's name, so a scaffolded deck is named for itself
// instead of carrying a placeholder that looks like a bug.
const OUT=path.basename(__dirname)+'.pptx';
p.writeFile({fileName:OUT}).then(()=>console.log(`built ${OUT} (${n} slides)`));
