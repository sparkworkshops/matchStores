/* Matcha Mochi admin: orders, menu, and the visual text editor. Arabic only, written for a non-technical shop owner. */
{
const M=window.MM,esc=M.esc;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
/* saved in the browser for this store only */
const ls={get:M.lsGet,set:M.lsSet};
const clone=o=>JSON.parse(JSON.stringify(o));
const money=n=>M.numStr(n)+' ر.س';
const root=$('#root');
const A={me:null,menu:null,texts:{},orders:null,seen:null,fresh:new Set(),filter:'all',olimit:30,page:'orders',dtab:'drinks',work:null,dirty:false,brand:{},order:null,orderDirty:false,
 v:'',fullAt:0,loading:false,again:false,mutAt:0,outSeen:new Map(),set:null,sw:null,sdirty:false,cards:null,coupons:null,q:'',climit:60};

const I=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO={orders:I('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>'),cup:I('<path d="M5 8h14l-1.5 12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z"/><path d="M4 8h16M13 8l2-6"/>'),
 text:I('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),user:I('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6 8-6s7 1.5 8 6"/>'),
 wa:I('<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9.5 9c0 3 2.5 5.5 5.5 5.5"/>'),check:I('<path d="M5 12.5l4.5 4.5L19 7"/>'),cam:I('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
 help:I('<circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.4a2.9 2.9 0 1 1 4 2.6c-.8.4-1.2 1-1.2 1.9v.3"/><path d="M12 17.3v.2"/>'),
 sort:I('<path d="M8 4v16M4.5 7.5L8 4l3.5 3.5M16 20V4M12.5 16.5L16 20l3.5-3.5"/>'),
 up:I('<path d="M6 15l6-6 6 6"/>'),down:I('<path d="M6 9l6 6 6-6"/>'),
 ticket:I('<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M9.5 14.5l5-5"/><circle cx="9.7" cy="9.7" r=".6"/><circle cx="14.3" cy="14.3" r=".6"/>'),
 stamp:I('<circle cx="12" cy="12" r="9.5"/><path d="M12 7.2l1.5 3 3.3.4-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.4z"/>'),
 gear:I('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>')};

/* the store's link for customers: it only exists once the store has a name ("" before that) */
const shopUrl=()=>A.me&&A.me.slug?'/'+encodeURIComponent(A.me.slug):'';
const shopShown=()=>location.host+decodeURIComponent(shopUrl());

/* ---------- talking to the server ----------
   The admin always talks to the store it's logged into (/api/~/…); "/api/_/…" paths are the site's own. */
async function api(path,{method='GET',body,raw,type,keepalive}={}){
 const o={method,headers:{},keepalive:!!keepalive};
 if(raw){o.body=raw;o.headers['content-type']=type}else if(body!==undefined){o.body=JSON.stringify(body);o.headers['content-type']='application/json'}
 let r;try{r=await fetch(path[0]==='/'?path:'/api/~/'+path,o)}catch(e){throw Object.assign(new Error('net'),{code:'net'})}
 let j={};try{j=await r.json()}catch(e){}
 if(r.status===401&&path[0]!=='/'&&path!=='password'){A.me={admin:false};showLogin();throw Object.assign(new Error('auth'),{code:'auth'})}
 if(!r.ok)throw Object.assign(new Error(j.error||'http'),{code:j.error||'http'});
 return j}
const errMsg=e=>({net:'ما فيه اتصال بالإنترنت. جرّب مرة ثانية.',server:'صار خطأ عندنا. جرّب بعد شوي.',size:'الصورة كبيرة مرّة. جرّب صورة ثانية.',auth:'انتهى الدخول. سجّل دخول مرة ثانية.',nostore:'ما فيه محل بهذا الاسم. تأكد من الرابط.'})[e.code]||'ما قدرنا نحفظ. جرّب مرة ثانية.';
function toast(msg,bad){$$('.atoast').forEach(e=>e.remove());const e=document.createElement('div');e.className='atoast'+(bad?' bad':'');e.setAttribute('role','status');e.textContent=msg;document.body.appendChild(e);setTimeout(()=>e.remove(),2800)}
function ask({title,body,ok='تأكيد',cancel='إلغاء',danger}){return new Promise(res=>{const m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div class="mbox" role="dialog" aria-modal="true" aria-labelledby="mt"><h2 id="mt">${esc(title)}</h2>${body?`<p>${esc(body)}</p>`:''}<div class="mrow"><button class="btn" data-r="0">${esc(cancel)}</button><button class="btn ${danger?'danger':'p'}" data-r="1">${esc(ok)}</button></div></div>`;
 const done=v=>{m.remove();removeEventListener('keydown',kd);res(v)};const kd=e=>{if(e.key==='Escape')done(false)};addEventListener('keydown',kd);
 m.addEventListener('click',e=>{if(e.target===m)return done(false);const b=e.target.closest('[data-r]');if(b)done(b.dataset.r==='1')});document.body.appendChild(m);m.querySelector('[data-r="1"]').focus()})}

/* ---------- login ---------- */
/* /admin is where every owner logs in, and where a new owner makes an account (the store gets its name and link
   right after, in the setup) */
function showLogin(setup=false){stopPoll();
 root.innerHTML=`<div class="login"><form class="lbox" id="lf" novalidate>${M.catSVG(setup?'happy':'hi')}<h1>${setup?'افتح متجرك ♡':'دخول الإدارة'}</h1><p>${setup?'اختر اسم مستخدم وكلمة مرور. بتحتاجها كل مرة تدخل، فاحفظها في مكان آمن.':'اكتب اسم المستخدم وكلمة المرور'}</p>
<label class="fld">اسم المستخدم<input name="user" autocomplete="username" autocapitalize="off" spellcheck="false" dir="auto"></label>
<label class="fld">كلمة المرور<input name="pass" type="password" autocomplete="${setup?'new-password':'current-password'}" dir="ltr"></label>
${setup?'<label class="fld">اكتب كلمة المرور مرة ثانية<input name="pass2" type="password" autocomplete="new-password" dir="ltr"></label>':''}
<p class="lerr" id="lerr" role="alert"></p><button class="btn p" type="submit">${setup?'إنشاء الحساب والدخول':'دخول'}</button>
<p class="lswap">${setup?'عندك حساب؟':'ما عندك متجر؟'} <button type="button" class="lnk" id="lswap">${setup?'سجّل دخول':'أنشئ حساب جديد'}</button></p></form></div>`;
 $('#lswap').addEventListener('click',()=>showLogin(!setup));
 const f=$('#lf');f.user.focus();
 f.addEventListener('submit',async e=>{e.preventDefault();const u=f.user.value.trim(),p=f.pass.value,er=$('#lerr');
  if(u.length<3){er.textContent='اسم المستخدم لازم يكون 3 أحرف أو أكثر';f.user.focus();return}
  if(p.length<6){er.textContent='كلمة المرور لازم تكون 6 أحرف أو أكثر';f.pass.focus();return}
  if(setup&&p!==f.pass2.value){er.textContent='كلمتا المرور مو متطابقتين';f.pass2.focus();return}
  const b=f.querySelector('button[type=submit]');b.disabled=true;er.textContent='';
  try{await api(setup?'/api/_/signup':'/api/_/login',{method:'POST',body:{user:u,pass:p}});A.me=await api('me');await start()}
  catch(x){b.disabled=false;
   if(x.code==='taken'){er.textContent='اسم المستخدم هذا مأخوذ. اختر اسم ثاني.';f.user.focus();return}
   er.textContent=x.code==='login'?'اسم المستخدم أو كلمة المرور غلط':errMsg(x)}})}

/* ---------- shell + pages ---------- */
/* [page, name, icon, short name for the phone's bottom bar] */
const NAV=[['orders','الطلبات',ICO.orders],['drinks','المشروبات',ICO.cup,'مشروبات'],['stamps','الأختام',ICO.stamp],['coupons','الكوبونات',ICO.ticket,'الخصم'],['settings','الإعدادات',ICO.gear],['texts','نصوص الموقع',ICO.text,'النصوص'],['account','الحساب',ICO.user]];
const navLinks=bottom=>NAV.map(([k,n,ic,sh])=>`<a href="#${k}" data-nav="${k}">${ic}<span>${bottom&&sh?sh:n}</span>${k==='orders'?'<span class="bd" data-bd></span>':''}</a>`).join('');
function shell(){root.innerHTML=`<header class="ah"><div class="ah-in"><a class="logo" href="#orders">${M.logoHTML()}<b>${esc(M.bName(1))}</b></a><nav class="nav" aria-label="أقسام الإدارة">${navLinks()}</nav><a class="shopl" id="shopl" href="${shopUrl()}" target="_blank" rel="noopener"${shopUrl()?'':' hidden'}>افتح المتجر ↗</a></div><div id="outbar"></div></header><main class="page" id="page"></main><nav class="nav bnav" aria-label="أقسام الإدارة">${navLinks(true)}</nav>`}
const page=()=>$('#page');
function route(){const h=location.hash.slice(1);A.page=NAV.some(n=>n[0]===h)?h:'orders';
 $$('[data-nav]').forEach(a=>{const on=a.dataset.nav===A.page;a.classList.toggle('on',on);on?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current')});
 if(A.page!=='texts')leaveEditor();
 ({orders:renderOrders,drinks:renderDrinks,stamps:renderStamps,coupons:renderCoupons,settings:renderSettings,texts:renderTexts,account:renderAccount})[A.page]();scrollTo(0,0)}
addEventListener('hashchange',()=>{if(A.me&&A.me.admin)route()});
async function start(){const j=await api('shop');A.menu=j.menu;A.texts=j.texts||{};A.brand=j.brand||{};A.set=j.settings||null;M.setTexts(A.texts);M.setMenu(A.menu);M.setBrand(A.brand);M.setSettings(A.set);shell();route();loadOrders(true,true);startPoll();
 /* a new store: ask for its name and logo, then show how to add the first drink */
 if(!A.brand.done)runWizard()}

/* ================= orders ================= */
/* One timer only. Each check first asks "did anything change?" (one tiny read); the full list is only
   fetched when something did, or once a minute to be safe. While a pickup customer might be on the way,
   it checks every few seconds so "I'm outside" shows up fast. */
let pollT=0;
const watching=()=>(A.orders||[]).some(o=>o.mode==='pickup'&&Date.now()-Date.parse(o.createdAt)<3*3600e3);
function startPoll(){stopPoll();pollT=setTimeout(tickPoll,watching()?5000:15000)}
function stopPoll(){clearTimeout(pollT);pollT=0}
async function tickPoll(){pollT=0;if(!A.me||!A.me.admin)return;await loadOrders(true);if(A.me&&A.me.admin&&!pollT)pollT=setTimeout(tickPoll,watching()&&!document.hidden?5000:15000)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&A.me&&A.me.admin)loadOrders(true)});
addEventListener('online',()=>{if(A.me&&A.me.admin)loadOrders(true,true)});
/* sounds: one shared player. Browsers only allow sound after the first tap on the page. */
let AC=null;
const audio=()=>{try{AC=AC||new (window.AudioContext||window.webkitAudioContext)()}catch(e){}return AC};
const soundOK=()=>!!AC&&AC.state==='running';
function soundBtn(){$$('.sndb').forEach(b=>b.hidden=soundOK())}
addEventListener('pointerdown',()=>{const c=audio();if(!c)return;if(c.state==='running')setTimeout(soundBtn,0);else c.resume().then(soundBtn).catch(()=>{})},true);
function tone(seq,vol=.25){const c=audio();if(!c)return;if(c.state!=='running')c.resume().catch(()=>{});const now=c.currentTime;
 seq.forEach(([f,at,d,type])=>{const o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.value=f;o.connect(g);g.connect(c.destination);const t0=now+at;g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+.02);g.gain.exponentialRampToValueAtTime(.0001,t0+d);o.start(t0);o.stop(t0+d+.03)})}
const ding=()=>tone([[880,0,.3],[1320,.18,.3]]);
/* the "I'm outside" alarm: louder and longer than a new-order ding, so it's clearly different */
const siren=()=>{const s=[];for(let i=0;i<3;i++)s.push([988,i*.5,.22,'square'],[740,i*.5+.25,.22,'square']);tone(s,.16)};
async function loadOrders(quiet,full){
 if(A.loading){A.again=true;return}
 A.loading=true;const t0=Date.now();
 try{const useV=!full&&A.v&&A.orders&&Date.now()-A.fullAt<60000;
  const j=await api('orders'+(useV?'?v='+encodeURIComponent(A.v):''));
  /* a tap on an order happened while this was loading: this answer may be older, so ask again */
  if(A.mutAt>t0){A.again=true;return}
  if(j.same){outsideCheck();return}
  A.v=j.v||'';A.fullAt=Date.now();
  /* every order shows once, whatever the server sends */
  const ids=new Set(),list=[];for(const o of j.orders||[]){if(!o||!o.id)continue;const k=o.cid||o.id;if(ids.has(o.id)||ids.has(k))continue;ids.add(o.id);ids.add(k);list.push(o)}
  const before=JSON.stringify(A.orders);const prev=A.seen;A.orders=list;A.seen=ids;
  const fresh=prev?A.orders.filter(o=>!prev.has(o.id)):[];
  if(fresh.length){fresh.forEach(o=>A.fresh.add(o.id));ding();toast(fresh.length===1?'وصل طلب جديد ♡':`وصلت ${fresh.length} طلبات جديدة ♡`)}
  badge();outsideCheck();if(A.page==='orders'&&before!==JSON.stringify(A.orders))renderOrders()}
 catch(e){if(!quiet&&e.code!=='auth')toast(errMsg(e),true);if(A.page==='orders'&&!A.orders)renderOrders()}
 finally{A.loading=false;if(A.again){A.again=false;setTimeout(()=>loadOrders(true,true),50)}}}
/* customers who tapped "I'm outside" and nobody answered yet */
const isOut=o=>o.mode==='pickup'&&!!o.outsideAt&&o.outsideAck!==o.outsideAt&&Date.now()-Date.parse(o.outsideAt)<2*3600e3;
const ago=iso=>{const m=Math.max(0,Math.round((Date.now()-Date.parse(iso))/60000));return m<1?'الحين':m===1?'قبل دقيقة':m===2?'قبل دقيقتين':m<11?`قبل ${m} دقايق`:`قبل ${m} دقيقة`};
function outsideCheck(){const list=(A.orders||[]).filter(isOut),now=Date.now();let fresh=null,play=false;
 for(const o of list){let s=A.outSeen.get(o.id);if(!s||s.at!==o.outsideAt){s={at:o.outsideAt,plays:0,last:0};A.outSeen.set(o.id,s);fresh=o}
  /* ring again every 15 seconds until someone taps "on my way", a few times at most */
  if(s.plays<4&&now-s.last>=15000){s.plays++;s.last=now;play=true}}
 if(play){siren();try{navigator.vibrate&&navigator.vibrate([300,120,300,120,300])}catch(e){}}
 if(fresh){toast(`🚗 ${fresh.name} برا المحل!`);if(A.page==='orders')renderOrders()}
 const bar=$('#outbar');if(bar)bar.innerHTML=list.map(o=>`<div class="oalert" role="alert"><span class="car" aria-hidden="true">🚗</span><button class="oa-t" data-o="goto" data-id="${o.id}"><b>${esc(o.name)} برا المحل</b><small>طلب ${esc(M.orderNo(o.no))} · ${ago(o.outsideAt)}${o.outsideCount>1?` · ضغط ${o.outsideCount} مرات`:''}</small></button><button class="btn" data-o="ack" data-id="${o.id}">${ICO.check}تمام، طالع له</button></div>`).join('');
 badge()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-o]');if(!b)return;const id=b.dataset.id;
 if(b.dataset.o==='ack')ackOut(id);
 if(b.dataset.o==='goto'){if(A.page!=='orders'){location.hash='#orders'}setTimeout(()=>{const c=$('#o-'+id);c?.scrollIntoView({block:'center',behavior:'smooth'});c?.classList.add('flash');setTimeout(()=>c?.classList.remove('flash'),1600)},80)}});
function ackOut(id){const o=(A.orders||[]).find(x=>x.id===id);if(!o)return;const was=o.outsideAck;o.outsideAck=o.outsideAt;outsideCheck();if(A.page==='orders')renderOrders();A.mutAt=Date.now();
 api('orders/'+id,{method:'POST',body:{outsideAck:true},keepalive:true}).then(()=>{A.mutAt=Date.now()}).catch(e=>{o.outsideAck=was;outsideCheck();if(A.page==='orders')renderOrders();if(e.code!=='auth')toast(errMsg(e),true)})}
function badge(){const n=(A.orders||[]).filter(o=>o.status==='new').length;$$('[data-bd]').forEach(b=>b.textContent=n||'');document.title=((A.orders||[]).some(isOut)?'🚗 ':'')+(n?`(${n}) `:'')+'إدارة '+M.bName(1)}
/* WhatsApp wants the number with its country code; Saudi numbers like 05x… become 9665x… */
const waNum=p=>{let d=String(p||'').replace(/\D/g,'');if(d.startsWith('00'))d=d.slice(2);if(d.length===10&&d.startsWith('05'))d='966'+d.slice(1);else if(d.length===9&&d.startsWith('5'))d='966'+d;return d.length>=10?d:''};
const waURL=(o,k)=>{const n=waNum(o.phone);return n?`https://wa.me/${n}?text=${encodeURIComponent(M.waText(k,o))}`:''};
const tf=new Intl.DateTimeFormat('ar-u-nu-latn',{hour:'numeric',minute:'2-digit'}),df=new Intl.DateTimeFormat('ar-u-nu-latn',{weekday:'long',day:'numeric',month:'long'});
function when(iso){const d=new Date(iso),now=new Date(),y=new Date();y.setDate(now.getDate()-1);const same=(a,b)=>a.toDateString()===b.toDateString();return (same(d,now)?'اليوم':same(d,y)?'أمس':df.format(d))+' · '+tf.format(d)}
const an=x=>x?(x.ar||x.name):'';
const PAYL={cash:'كاش',card:'بطاقة / مدى',transfer:'تحويل بنكي',applepay:'Apple Pay'};
/* the same customer key the server uses for stamp cards */
const pkey=p=>{let d=String(p||'').replace(/\D/g,'');if(d.startsWith('00'))d=d.slice(2);if(d.length===10&&d.startsWith('05'))d='966'+d.slice(1);else if(d.length===9&&d.startsWith('5'))d='966'+d;return d.slice(0,20)};
function orderCard(o){const done=o.status==='done',dl=o.mode==='delivery',wo=waURL(o,'waOrder'),wr=waURL(o,dl?'waWay':'waReady'),out=isOut(o),fee=+o.fee||0,disc=+o.discount||0;
 /* pickup: "ready" sends "your order is ready"; delivery: "out for delivery" sends "your order is on the way" */
 const doneL=dl?'طلع للتوصيل':'تم التجهيز';
 return `<article class="ocard ${done?'done':''} ${A.fresh.has(o.id)?'fresh':''} ${out?'outside':''}" id="o-${esc(o.id)}" aria-label="طلب ${esc(o.no)}">
 ${out?`<div class="oout" role="alert"><span class="car" aria-hidden="true">🚗</span><span><b>العميل برا المحل الحين!</b><small>${ago(o.outsideAt)}، طلع له طلبه</small></span><button class="btn" data-a="ack" data-id="${o.id}">${ICO.check}تمام، طالع له</button></div>`
  :o.outsideAt?`<div class="oouted">🚗 قال إنه برا المحل الساعة ${tf.format(new Date(o.outsideAt))} ✓</div>`:''}
 <div class="oh"><span class="ono">${esc(M.orderNo(o.no))}</span><span class="otime">${when(o.createdAt)}</span><span class="ost ${done?'d':''}">${done?'تم ✓':'جديد'}</span></div>
 <div class="ocust"><span class="nm">${esc(o.name)}</span><a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>
 <span class="omode ${dl?'dl':''}">${dl?'توصيل: '+esc(o.addr):'استلام من المحل'}</span></div>
 ${(+o.cardBefore||0)>=8?(o.freeUsed?'<div class="ofree used">🎁 استخدم مشروبه المجاني في هذا الطلب ✓</div>':`<div class="ofree"><span>🎁 بطاقة أختامه كاملة: له مشروب مجاني</span><button class="btn" data-a="redeem" data-id="${o.id}">استخدم المشروب المجاني</button></div>`):''}
 <ul class="oitems">${o.items.map(it=>`<li><img src="${it.img||M.drinkArt({id:it.drink,color:it.color,under:it.under||''},0)}" alt=""><div><b><span class="q">×${it.qty}</span>${esc(an(it))}</b><span class="sz">${esc(an(it.size))}${it.milk?' · '+esc(an(it.milk)):''}</span>${it.addons&&it.addons.length?`<span class="ads">${it.addons.map(a=>`<span>${esc(an(a))}${a.q>1?' ×'+a.q:''}</span>`).join('')}</span>`:''}</div><span class="lp">${money(it.line)}</span></li>`).join('')}</ul>
 ${o.notes?`<div class="onote"><small>ملاحظات العميل</small>${esc(o.notes)}</div>`:''}
 ${fee>0||disc>0?`<div class="ofee"><span>المشروبات <b>${money(o.subtotal??(o.total-fee+disc))}</b></span>${disc>0?`<span class="odisc">🎟️ خصم <bdi dir="ltr">${esc(M.cpCode(o))}</bdi> <b>${money(disc)}</b></span>`:''}${fee>0?`<span>رسوم التوصيل <b>${money(fee)}</b></span>`:''}</div>`:''}
 <div class="ofoot"><span class="otot">المجموع <b>${money(o.total)}</b></span><button class="pay ${o.paid?'y':''}" data-a="paid" data-id="${o.id}">${o.paid?'مدفوع ✓':'لم يُدفع بعد'}<small>${o.paid?'اضغط إذا ما دفع':'اضغط إذا دفع'}</small></button><span class="ometh">طريقة الدفع: ${PAYL[o.method]||'كاش'}${o.method==='transfer'?'':dl?'، عند التوصيل':'، عند الاستلام'}</span></div>
 <div class="oact">${wo?`<a class="btn wa" href="${wo}" target="_blank" rel="noopener">${ICO.wa}واتساب</a>`:'<span class="btn wa" aria-disabled="true">رقم غير صالح</span>'}
 ${done?`<span class="btn g" aria-disabled="true">${ICO.check}${doneL}</span><button class="lnk mut oundo" data-a="undo" data-id="${o.id}">إرجاعه لطلب جديد</button>`:wr?`<a class="btn g" href="${wr}" target="_blank" rel="noopener" data-a="done" data-id="${o.id}">${ICO.check}${doneL}</a>`:`<button class="btn g" data-a="done" data-id="${o.id}">${ICO.check}${doneL}</button>`}</div></article>`}
function renderOrders(){const p=page();if(!p)return;
 if(!A.orders){p.innerHTML='<div class="tload">جاري تحميل الطلبات… ♡</div>';return}
 const n=A.orders.filter(o=>o.status==='new').length,list=A.orders.filter(o=>A.filter==='all'||o.status===A.filter);
 p.innerHTML=`<div class="ph1"><h1>الطلبات</h1><div class="seg2" role="group" aria-label="عرض">${[['all','الكل'],['new',`جديدة (${n})`],['done','منجزة']].map(([k,l])=>`<button class="${A.filter===k?'on':''}" aria-pressed="${A.filter===k}" data-a="filter" data-v="${k}">${l}</button>`).join('')}</div><button class="btn sndb" data-a="sound" ${soundOK()?'hidden':''}>🔔 شغّل صوت التنبيهات</button><p>الأحدث فوق. الصفحة تتحدّث لحالها، وتسمع صوت لما يوصل طلب جديد، وصوت تنبيه أعلى لما عميل يقول إنه برا المحل.</p></div>
 ${list.length?`<div class="olist">${list.slice(0,A.olimit).map(orderCard).join('')}</div>${list.length>A.olimit?'<div class="more"><button class="btn" data-a="omore">عرض طلبات أقدم</button></div>':''}`
 :`<div class="empty">${M.catSVG('hi')}${A.filter==='new'?'ما فيه طلبات جديدة الحين':A.filter==='done'?'ما فيه طلبات منجزة بعد':'ما وصلت طلبات بعد. أول ما يطلب أحد بيظهر هنا ♡'}</div>`}`}
async function setOrder(id,patch){const o=A.orders.find(x=>x.id===id);if(!o)return;const old={status:o.status,paid:o.paid};Object.assign(o,patch);A.fresh.delete(id);A.mutAt=Date.now();badge();renderOrders();
 try{const j=await api('orders/'+id,{method:'POST',body:patch,keepalive:true});A.mutAt=Date.now();Object.assign(o,j.order);badge();if(A.page==='orders')renderOrders()}
 catch(e){Object.assign(o,old);badge();renderOrders();if(e.code!=='auth')toast(errMsg(e),true)}}
/* the free drink from a full stamp card, used on this order */
async function redeemOn(id){const o=A.orders.find(x=>x.id===id);if(!o)return;
 if(!(await ask({title:`تستخدم المشروب المجاني لـ${o.name}؟`,body:'بطاقة أختامه ترجع تبدأ من جديد. لا تنسى تخصم سعر مشروب واحد من حسابه.',ok:'استخدمه'})))return;
 try{await api('loyalty/'+pkey(o.phone),{method:'POST',body:{redeem:true,order:o.id}});o.freeUsed=true;A.mutAt=Date.now();A.cards=null;renderOrders();toast('تم ✓ البطاقة رجعت من الصفر')}
 catch(e){if(e.code==='notfull'){toast('البطاقة مو كاملة الحين، يمكن انستخدم المشروب من قبل',true);return}if(e.code!=='auth')toast(errMsg(e),true)}}

document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||!$('#page')?.contains(b))return;const a=b.dataset.a,id=b.dataset.id;
 if(a==='filter'){A.filter=b.dataset.v;renderOrders()}
 if(a==='omore'){A.olimit+=30;renderOrders()}
 if(a==='paid'){const o=A.orders.find(x=>x.id===id);if(o)setOrder(id,{paid:!o.paid})}
 /* "done" is a link to WhatsApp: the browser opens the chat, we save the new status alongside */
 if(a==='done')setOrder(id,{status:'done'});
 if(a==='undo')setOrder(id,{status:'new'});
 if(a==='ack')ackOut(id);
 if(a==='redeem')redeemOn(id);
 if(a==='sound'){const c=audio();if(c)c.resume().then(()=>{ding();soundBtn();toast('صوت التنبيهات شغّال ✓')}).catch(()=>{})}
 if(a==='logout')logout()});

/* ================= drinks & menu ================= */
const imgOf=d=>d.img||M.drinkArt(d,A.menu.drinks.indexOf(d)<0?0:A.menu.drinks.indexOf(d));
const KIND=[['syrup','طبقة صوص'],['pearls','لآلئ / جيلي'],['foam','رغوة'],['topping','رشّات']];
/* the sample drinks a new store starts with; the first drink the owner saves in the setup replaces them */
const DEMO=['straw','classic','mango','sakura','coco','hoji'];
const isDemo=()=>A.menu.drinks.every(d=>DEMO.includes(d.id));
/* draw a cup the way the shop does, with a menu made up just for the drawing */
function withMenu(m,f){M.setMenu(m);try{return f()}finally{M.setMenu(A.menu)}}
function sampleCup({drink,addons=[],ad={},milks=[],milk=null,size='l'}={}){const d=drink||{id:'_s',color:'#9ccf5e',price:0};
 return withMenu({drinks:[d],sizes:A.menu.sizes,milks,addons},()=>M.cupSVG({drink:d.id,size,milk,ad}))}
const fromPrice=d=>{const ss=A.menu.sizes.filter(s=>(d.sizes||[]).includes(s.id));return (+d.price||0)+(ss.length?Math.min(...ss.map(s=>+s.add||0)):0)};
const HELP={drinks:'كيف تضيف وترتّب المشروبات؟',addons:'كيف تستخدم الإضافات؟',milks:'كيف تستخدم أنواع الحليب؟',sizes:'كيف تستخدم الأحجام؟'};
const helpBtn=k=>`<button class="helpb" data-d="help">${ICO.help}<span><b>${HELP[k]}</b><small>اضغط هنا ونشرح لك كل شي خطوة بخطوة</small></span><i aria-hidden="true">←</i></button>`;
function renderDrinks(){const p=page(),tab=A.dtab;
 p.innerHTML=`<div class="ph1"><h1>المشروبات والقائمة</h1><div class="seg2" role="group" aria-label="القسم">${[['drinks','المشروبات'],['addons','الإضافات'],['milks','الحليب'],['sizes','الأحجام']].map(([k,l])=>`<button class="${tab===k?'on':''}" aria-pressed="${tab===k}" data-d="tab" data-v="${k}">${l}</button>`).join('')}</div><p>${tab==='drinks'?'اضغط على أي مشروب عشان تعدّله، أو أضف مشروب جديد. الرقم على كل مشروب هو مكانه في المنيو.':'عدّل اللي تبي، وبعدين اضغط «حفظ التغييرات».'}</p></div>${helpBtn(tab)}<div id="dpane"></div>`;
 tab==='drinks'?drinksPane():listPane(tab)}
function drinkSummary(d){const sz=A.menu.sizes.filter(s=>d.sizes.includes(s.id)).map(s=>esc(s.ar||s.name)).join('، ');
 const ads=d.addonMode!=='some'?'كل الإضافات':!d.addons.length?'بدون إضافات':(()=>{const n=d.addons.map(id=>A.menu.addons.find(a=>a.id===id)).filter(Boolean).map(a=>esc(a.ar||a.name));return 'إضافات محددة: '+n.slice(0,3).join('، ')+(n.length>3?` و${n.length-3} غيرها`:'')})();
 return `الأحجام: ${sz}<br>${ads}`}
function drinksPane(){if(A.order)return orderPane();
 $('#dpane').innerHTML=`<div class="dtools"><button class="btn" data-d="sort" ${A.menu.drinks.length<2?'disabled':''}>${ICO.sort}ترتيب المشروبات</button></div>
<div class="dgrid">${A.menu.drinks.map((d,i)=>`<button class="dcard" data-d="open" data-v="${d.id}"><span class="dimg"><img src="${imgOf(d)}" alt=""><span class="dnum" aria-label="رقم ${i+1} في المنيو">${i+1}</span></span><span><h3>${esc(d.ar||d.name)}</h3><span class="en">${esc(d.name)}</span><span class="pr">${money(d.price)}</span><span class="sm" style="display:block">${drinkSummary(d)}</span><span class="ed">تعديل</span></span></button>`).join('')}<button class="dnew" data-d="open" data-v="">+ مشروب جديد</button></div>`}

/* --- the order of the drinks in the menu: arrows, or drag by the handle --- */
function orderPane(){const ds=A.order.map(id=>A.menu.drinks.find(d=>d.id===id)).filter(Boolean),n=ds.length;
 $('#dpane').innerHTML=`<div class="ordbox"><h2>${ICO.sort}رتّب المشروبات</h2><p class="hint">المشروب رقم 1 يطلع أول واحد في المنيو عند العميل، وأول 3 مشروبات تطلع في الصفحة الرئيسية. اضغط الأسهم ▲▼، أو امسك ⠿ واسحب المشروب لمكانه.</p>
<ol class="olist2" id="olist2">${ds.map((d,i)=>`<li class="orow ${i<3?'top3':''}" data-id="${d.id}"><span class="grip" title="اسحب من هنا">⠿</span><span class="onum">${i+1}</span><img src="${imgOf(d)}" alt=""><b>${esc(d.ar||d.name)}${i<3?'<small>يطلع في الصفحة الرئيسية</small>':''}</b><span class="oarr"><button class="btn ic" data-d="mv" data-v="${i}:-1" aria-label="${esc(d.ar||d.name)}: فوق" ${i?'':'disabled'}>${ICO.up}</button><button class="btn ic" data-d="mv" data-v="${i}:1" aria-label="${esc(d.ar||d.name)}: تحت" ${i<n-1?'':'disabled'}>${ICO.down}</button></span></li>`).join('')}</ol>
<div class="savebar"><span>${A.orderDirty?'الترتيب تغيّر وما انحفظ بعد':'غيّر الترتيب، وبعدين اضغط حفظ'}</span><button class="btn" data-d="sortcancel">إلغاء</button><button class="btn p" data-d="sortsave" ${A.orderDirty?'':'disabled'}>حفظ الترتيب</button></div></div>`}
function moveDrink(i,dir){const j=i+dir;if(j<0||j>=A.order.length)return;[A.order[i],A.order[j]]=[A.order[j],A.order[i]];A.orderDirty=true;orderPane();
 const r=$$('.orow')[j];if(r){r.classList.add('moved');($(`[data-v="${j}:${dir}"]:not([disabled])`,r)||$(`[data-v="${j}:${-dir}"]`,r))?.focus()}}
let drag=null;
document.addEventListener('pointerdown',e=>{const g=e.target.closest('.orow .grip');if(!g)return;e.preventDefault();const row=g.closest('.orow');drag={row,list:row.parentElement,id:e.pointerId};row.classList.add('lift');try{g.setPointerCapture(e.pointerId)}catch(x){}});
document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const y=e.clientY;let before=null;
 for(const r of drag.list.children){if(r===drag.row)continue;const b=r.getBoundingClientRect();if(y<b.top+b.height/2){before=r;break}}
 if(drag.row.nextElementSibling!==before&&before!==drag.row)drag.list.insertBefore(drag.row,before);
 $$('.onum',drag.list).forEach((x,i)=>x.textContent=i+1);
 if(y<90)scrollBy(0,-10);else if(y>innerHeight-160)scrollBy(0,10)});
const endDrag=e=>{if(!drag||e.pointerId!==drag.id)return;const ids=[...drag.list.children].map(r=>r.dataset.id),row=drag.row;drag=null;row.classList.remove('lift');
 if(ids.join()!==A.order.join()){A.order=ids;A.orderDirty=true}orderPane()};
document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);

/* --- one drink, in a sheet. opts.guided: the first-drink walkthrough; opts.onDone(savedDrink|null) --- */
function openDrink(id,opts={}){const src=A.menu.drinks.find(d=>d.id===id),isNew=!src,guided=!!opts.guided;
 const d=src?clone(src):{id:'d'+Date.now().toString(36),name:'',ar:'',desc:'',descAr:'',price:20,color:'#9ccf5e',img:'',sizes:A.menu.sizes.map(s=>s.id),addonMode:'all',addons:[]};
 const start=JSON.stringify(d);let busy=false,T=null;
 const sh=document.createElement('div');sh.className='sheet';document.body.appendChild(sh);document.body.style.overflow='hidden';
 const close=async(force,saved)=>{if(!force&&JSON.stringify(d)!==start&&!(await ask({title:'تطلع بدون حفظ؟',body:'التعديلات على هذا المشروب بتضيع.',ok:'اطلع بدون حفظ',cancel:'ارجع',danger:true})))return;T?.end();sh.remove();document.body.style.overflow='';removeEventListener('keydown',kd);opts.onDone?.(saved||null)};
 const kd=e=>{if(e.key==='Escape'&&!$('.modal')&&!$('.tour'))close()};addEventListener('keydown',kd);
 const pv=()=>{const q=s=>$(s,sh);if(!q('#pv-name'))return;const n=d.ar.trim()||d.name.trim();q('#pv-name').textContent=n||'اسم المشروب';q('#pv-name').classList.toggle('ph',!n);
  q('#pv-desc').textContent=d.descAr.trim()||d.desc.trim();q('#pv-img').src=d.img||M.drinkArt(d,0);q('#pv-price').textContent=money(fromPrice(d));
  const m0=A.menu.milks.find(m=>m.color);q('#pv-cup').innerHTML=sampleCup({drink:d,milks:m0?[m0]:[],milk:m0?.id||null})};
 const draw=()=>{sh.innerHTML=`<div class="sbox" role="dialog" aria-modal="true" aria-labelledby="sh"><div class="shd"><h2 id="sh">${guided?'أول مشروب لك ♡':isNew?'مشروب جديد':'تعديل: '+esc(d.ar||d.name)}</h2>${guided?'':'<button class="btn" data-s="tour" aria-label="اشرح لي هذي الصفحة">'+ICO.help+'<span class="hide-s">شرح</span></button>'}<button class="btn" data-s="close" aria-label="إغلاق">✕</button></div>
<div class="sbd">
<section class="sec dprev" id="dprev"><h3>كيف يشوفه العميل</h3><p class="hint">يتغيّر على طول وأنت تعدّل تحت</p><div class="pvrow"><figure><div class="pvcard"><img id="pv-img" alt=""><div class="pvinfo"><b id="pv-name"></b><span id="pv-desc"></span><span class="price" id="pv-price"></span></div></div><figcaption>في المنيو</figcaption></figure><figure><div class="pvcup" id="pv-cup"></div><figcaption>لما يختاره ويحضّره</figcaption></figure></div></section>
<section class="sec" id="sec-photo"><h3><i>1</i>الصورة</h3><p class="hint">تظهر للعملاء في المنيو وفي السلة.</p><div class="phrow"><img id="dimg" src="${d.img||M.drinkArt(d,0)}" alt="صورة المشروب"><div class="pc"><label class="btn">${ICO.cam}<span>${d.img?'تغيير الصورة':'اختر صورة'}</span><input type="file" accept="image/*" id="dfile" class="hide"></label>${d.img?'<button class="lnk mut" data-s="noimg">شيل الصورة واستخدم الرسمة</button>':'<span class="hint" style="margin:0">بدون صورة، يظهر كوب مرسوم بلون المشروب</span>'}<span class="hint" id="dup" style="margin:0"></span></div></div></section>
<section class="sec" id="sec-name"><h3><i>2</i>الاسم والسعر</h3><div class="g2" style="margin-top:8px">
 <label class="fld">الاسم بالعربي<input data-f="ar" value="${esc(d.ar)}" dir="rtl" maxlength="60" placeholder="مثال: ماتشا لاتيه"></label>
 <label class="fld">الاسم بالإنجليزي<input data-f="name" value="${esc(d.name)}" dir="ltr" maxlength="60" placeholder="e.g. Matcha Latte"></label>
 <label class="fld">وصف قصير بالعربي<input data-f="descAr" value="${esc(d.descAr)}" dir="rtl" maxlength="160"></label>
 <label class="fld">وصف قصير بالإنجليزي<input data-f="desc" value="${esc(d.desc)}" dir="ltr" maxlength="160"></label>
 <label class="fld">السعر الأساسي (ر.س)<input data-f="price" type="number" min="0" step="0.5" inputmode="decimal" value="${d.price}" dir="ltr"></label>
 <label class="fld">لون المشروب<span class="colr"><input type="color" data-f="color" value="${d.color}"><span class="hint" style="margin:0">لون الكوب المرسوم</span></span></label>
</div><p class="lerr" id="dnerr"></p></section>
<section class="sec" id="sec-sizes"><h3><i>3</i>الأحجام المتوفرة</h3><p class="hint">العميل يشوف بس الأحجام اللي عليها صح.</p><div class="sizes">${A.menu.sizes.map((s,i)=>`<label class="tog"><input type="checkbox" data-size="${s.id}" ${d.sizes.includes(s.id)?'checked':''}><span class="tk">✓</span><span class="mini-cup" style="width:${14+i*4}px;height:${16+i*6}px"></span>${esc(s.ar||s.name)}<small>${s.add?'+'+money(s.add):'بدون زيادة'}</small></label>`).join('')}</div><p class="lerr" id="dserr"></p></section>
<section class="sec" id="sec-addons"><h3><i>4</i>الإضافات</h3><p class="hint">وش الإضافات اللي يقدر العميل يحطها في هذا المشروب؟</p><div class="rad"><label><input type="radio" name="am" value="all" ${d.addonMode!=='some'?'checked':''}><span>كل الإضافات مسموحة<small>وأي إضافة جديدة تضيفها بعدين</small></span></label><label><input type="radio" name="am" value="some" ${d.addonMode==='some'?'checked':''}><span>إضافات محددة فقط<small>تختارها من القائمة</small></span></label></div>
<div id="alw" class="${d.addonMode==='some'?'':'hide'}"><div class="arow2"><button type="button" class="lnk" data-s="all">تحديد الكل</button><button type="button" class="lnk mut" data-s="none">إلغاء الكل</button></div><div class="alist">${A.menu.addons.map(a=>`<label><input type="checkbox" data-ad="${a.id}" ${d.addons.includes(a.id)?'checked':''}>${M.icon(a,40)}<span>${esc(a.ar||a.name)}<small>+${money(a.price)}</small></span></label>`).join('')}</div><p class="hint" id="anone" style="margin-top:8px">${d.addons.length?'':'ما اخترت ولا إضافة، فالعميل ما بيشوف المضخات لهذا المشروب.'}</p></div></section>
</div>
<div class="sft"><button class="btn p" data-s="save">حفظ المشروب</button><button class="btn" data-s="close">إلغاء</button>${isNew?'':'<button class="lnk red" data-s="del">حذف المشروب</button>'}</div></div>`;pv()};
 draw();
 sh.addEventListener('input',e=>{const t=e.target;
  if(t.dataset.f){d[t.dataset.f]=t.dataset.f==='price'?Math.max(0,parseFloat(t.value)||0):t.value;if(t.dataset.f==='color'&&!d.img)$('#dimg',sh).src=M.drinkArt(d,0);pv()}
  if(t.dataset.size){d.sizes=A.menu.sizes.map(s=>s.id).filter(id=>$(`[data-size="${id}"]`,sh).checked);$('#dserr',sh).textContent=d.sizes.length?'':'لازم تختار حجم واحد على الأقل';pv()}
  if(t.name==='am'){d.addonMode=t.value;$('#alw',sh).classList.toggle('hide',t.value!=='some')}
  if(t.dataset.ad){d.addons=$$('[data-ad]',sh).filter(x=>x.checked).map(x=>x.dataset.ad);$('#anone',sh).textContent=d.addons.length?'':'ما اخترت ولا إضافة، فالعميل ما بيشوف المضخات لهذا المشروب.'}});
 sh.addEventListener('change',async e=>{const t=e.target;if(t.id!=='dfile'||!t.files[0])return;const up=$('#dup',sh);up.textContent='جاري رفع الصورة…';busy=true;
  try{const blob=await shrink(t.files[0]);const j=await api('images',{method:'POST',raw:blob,type:'image/jpeg'});d.img=j.url;const y=$('.sbd',sh).scrollTop;draw();$('.sbd',sh).scrollTop=y;T?.place()}
  catch(x){up.textContent=x.code==='img'?'ما قدرنا نقرأ هالملف كصورة':errMsg(x)}finally{busy=false}});
 sh.addEventListener('click',async e=>{if(e.target===sh)return close();const b=e.target.closest('[data-s]');if(!b)return;const s=b.dataset.s;
  if(s==='close')close();
  if(s==='tour'){T=tour(drinkSteps(sh))}
  if(s==='noimg'){d.img='';draw();T?.place()}
  if(s==='all'||s==='none'){$$('[data-ad]',sh).forEach(x=>x.checked=s==='all');d.addons=s==='all'?A.menu.addons.map(a=>a.id):[];$('#anone',sh).textContent=d.addons.length?'':'ما اخترت ولا إضافة، فالعميل ما بيشوف المضخات لهذا المشروب.'}
  if(s==='del'){if(A.menu.drinks.length<=1){toast('لازم يبقى مشروب واحد على الأقل',true);return}
   if(!(await ask({title:'حذف '+(d.ar||d.name)+'؟',body:'المشروب بيختفي من المنيو. الطلبات القديمة تبقى زي ما هي.',ok:'احذف',danger:true})))return;
   const m=clone(A.menu);m.drinks=m.drinks.filter(x=>x.id!==d.id);if(await saveMenu(m,'تم حذف المشروب'))close(true)}
  if(s==='save'){if(busy){toast('انتظر لين يخلص رفع الصورة');return}
   if(!d.ar.trim()&&!d.name.trim()){T?.end();$('#dnerr',sh).textContent='اكتب اسم المشروب';$('[data-f=ar]',sh).focus();return}
   if(!d.sizes.length){T?.end();$('#dserr',sh).textContent='لازم تختار حجم واحد على الأقل';return}
   if(!d.name.trim())d.name=d.ar;if(!d.ar.trim())d.ar=d.name;
   const m=clone(A.menu),i=m.drinks.findIndex(x=>x.id===d.id);
   /* the store's first own drink takes the place of the sample drinks */
   if(guided&&isNew&&isDemo())m.drinks=[d];else if(i<0)m.drinks.push(d);else m.drinks[i]=d;
   b.disabled=true;if(await saveMenu(m,isNew?'تمت إضافة المشروب ✓ وصار يظهر للعملاء':'تم الحفظ ✓ والعملاء يشوفون التغيير الحين'))close(true,d);else b.disabled=false}});
 if(guided)setTimeout(()=>{if(sh.isConnected)T=tour(drinkSteps(sh))},380);
 else setTimeout(()=>$('[data-f=ar]',sh)?.focus({preventScroll:true}),50)}
/* photos are cropped to the menu card shape and kept small */
const readImg=file=>new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=()=>rej({code:'img'});fr.onload=()=>{const im=new Image();im.onerror=()=>rej({code:'img'});im.onload=()=>res(im);im.src=fr.result};fr.readAsDataURL(file)});
async function shrink(file){const im=await readImg(file);const W=600,H=720,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);const s=Math.max(W/im.width,H/im.height),w=im.width*s,h=im.height*s;x.drawImage(im,(W-w)/2,(H-h)/2,w,h);
 return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej({code:'img'}),'image/jpeg',.85))}
/* logos keep their whole shape and any see-through background */
async function shrinkLogo(file){const im=await readImg(file);const S=256,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d'),s=Math.min(S/im.width,S/im.height),w=im.width*s,h=im.height*s;x.drawImage(im,(S-w)/2,(S-h)/2,w,h);
 return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej({code:'img'}),'image/png'))}
async function saveMenu(m,ok){try{const j=await api('menu',{method:'PUT',body:m});A.menu=j.menu;M.setMenu(A.menu);if(A.page==='drinks'&&A.dtab==='drinks')drinksPane();toast(ok);return true}catch(e){if(e.code!=='auth')toast(errMsg(e),true);return false}}

/* --- add-ons, milks and sizes: edit in place, then one save --- */
function listPane(kind){const W=A.work||(A.work=clone(A.menu)),rows=W[kind];
 const pv=(x,i)=>kind==='addons'?M.icon(x,60):kind==='milks'?`<span class="sw" style="background:${x.color||'repeating-linear-gradient(45deg,#fff 0 6px,#eee 6px 12px)'}"></span>`:`<span class="mini-cup" style="width:${18+i*6}px;height:${22+i*8}px;margin:8px auto 0;color:var(--leaf)"></span>`;
 const f=(i,k,label,type='text',extra='')=>`<label class="fld">${label}<input data-w="${kind}:${i}:${k}" type="${type}" value="${esc(type==='color'?(rows[i][k]||'#ffffff'):rows[i][k])}" ${extra}></label>`;
 $('#dpane').innerHTML=`<div class="rows">${rows.map((x,i)=>`<div class="irow"><span class="pv" id="pv-${i}">${pv(x,i)}</span><div><div class="g2">
 ${f(i,'ar','الاسم بالعربي','text','dir="rtl" maxlength="60"')}${f(i,'name','الاسم بالإنجليزي','text','dir="ltr" maxlength="60"')}
 ${kind==='addons'?f(i,'price','السعر (ر.س)','number','min="0" step="0.5" inputmode="decimal" dir="ltr"'):f(i,'add','زيادة على السعر (ر.س)','number','min="0" step="0.5" inputmode="decimal" dir="ltr"')}
 ${kind!=='sizes'?`<label class="fld">اللون<span class="colr"><input type="color" data-w="${kind}:${i}:color" value="${x.color||'#ffffff'}"></span></label>`:''}
 ${kind==='addons'?`<label class="fld">الشكل في الكوب<select data-w="${kind}:${i}:kind">${KIND.map(([v,l])=>`<option value="${v}" ${x.kind===v?'selected':''}>${l}</option>`).join('')}</select></label>`:''}
 </div></div>${kind!=='sizes'?`<button class="lnk red del" data-d="rm" data-v="${i}">حذف</button>`:''}</div>`).join('')}</div>
 ${kind!=='sizes'?`<div style="margin-top:14px"><button class="btn" data-d="addrow">+ ${kind==='addons'?'إضافة جديدة':'نوع حليب جديد'}</button></div>`:'<p class="hint" style="margin-top:12px">الأحجام ثابتة (صغير، وسط، كبير). تقدر تغيّر أسماءها وأسعارها، وتختار لكل مشروب أحجامه من صفحة المشروب.</p>'}
 <div class="savebar ${A.dirty?'':'hide'}" id="sbar"><span>عندك تغييرات ما انحفظت</span><button class="btn" data-d="undo">تراجع</button><button class="btn p" data-d="savework">حفظ التغييرات</button></div>`}
function markDirty(){A.dirty=true;$('#sbar')?.classList.remove('hide')}
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset.w)return;const[kind,i,k]=t.dataset.w.split(':'),row=A.work[kind][+i];
 row[k]=t.type==='number'?Math.max(0,parseFloat(t.value)||0):t.value;markDirty();
 if(k==='color'||k==='kind'){const p=$('#pv-'+i);if(p&&kind==='addons')p.innerHTML=M.icon(row,60);if(p&&kind==='milks')p.firstChild.style.background=row.color}});
document.addEventListener('change',e=>{if(e.target.dataset.w)e.target.dispatchEvent(new Event('input',{bubbles:true}))});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-d]');if(!b||!$('#page')?.contains(b))return;const a=b.dataset.d,v=b.dataset.v;
 if(a==='tab'){A.dtab=v;renderDrinks()}
 if(a==='open')openDrink(v);
 if(a==='help')tour(helpSteps(A.dtab));
 if(a==='sort'){A.order=A.menu.drinks.map(d=>d.id);A.orderDirty=false;drinksPane();$('.ordbox')?.scrollIntoView({block:'start',behavior:'smooth'})}
 if(a==='mv'){const[i,dir]=v.split(':').map(Number);moveDrink(i,dir)}
 if(a==='sortcancel'){A.order=null;A.orderDirty=false;drinksPane()}
 if(a==='sortsave'){b.disabled=true;const m=clone(A.menu),by=Object.fromEntries(m.drinks.map(d=>[d.id,d]));
  m.drinks=[...A.order.map(id=>by[id]).filter(Boolean),...m.drinks.filter(d=>!A.order.includes(d.id))];
  const keep=[A.order,A.orderDirty];A.order=null;A.orderDirty=false;
  if(!(await saveMenu(m,'تم حفظ الترتيب ✓ والمنيو صار بالترتيب الجديد'))){[A.order,A.orderDirty]=keep;drinksPane()}}
 if(a==='rm'){const k=A.dtab;if(A.work[k].length<=1&&k==='milks'){toast('خلّ نوع حليب واحد على الأقل',true);return}A.work[k].splice(+v,1);markDirty();listPane(k)}
 if(a==='addrow'){const k=A.dtab,id='x'+Date.now().toString(36);A.work[k].push(k==='addons'?{id,name:'New treat',ar:'إضافة جديدة',price:3,color:'#c9b3ff',kind:'topping'}:{id,name:'New milk',ar:'حليب جديد',add:2,color:'#f5ecd9'});markDirty();listPane(k);const r=$$('.irow').pop();r?.scrollIntoView({block:'center'});r?.querySelector('input')?.select()}
 if(a==='undo'){A.work=null;A.dirty=false;listPane(A.dtab)}
 if(a==='savework'){b.disabled=true;const m=clone(A.menu);for(const k of ['addons','milks','sizes'])m[k]=A.work[k];
  if(await saveMenu(m,'تم الحفظ ✓')){A.work=null;A.dirty=false;listPane(A.dtab)}else b.disabled=false}});
addEventListener('beforeunload',e=>{if(A.dirty||A.orderDirty||A.sdirty){e.preventDefault();e.returnValue=''}});

/* ================= guided tours =================
   One thing on the page is lit up at a time, everything else is dimmed, and a speech bubble explains it.
   The lit-up part still works, so the owner can try it while reading. */
function tour(steps){let i=0,tgt=null;$$('.tour').forEach(x=>x.remove());
 const ov=document.createElement('div');ov.className='tour';
 ov.innerHTML='<div class="tblock"></div><div class="tspot"></div><div class="tbub" role="dialog" aria-modal="true" aria-labelledby="tbt"></div>';
 document.body.appendChild(ov);const blk=ov.children[0],spot=ov.children[1],bub=ov.children[2];
 const find=()=>{const s=steps[i];let el=typeof s.el==='function'?s.el():s.el?$(s.el):null;if(Array.isArray(el)){el=el.filter(Boolean);if(!el.length)el=null}return el};
 const rectOf=el=>{const rs=(Array.isArray(el)?el:[el]).map(x=>x.getBoundingClientRect());return {left:Math.min(...rs.map(r=>r.left)),top:Math.min(...rs.map(r=>r.top)),right:Math.max(...rs.map(r=>r.right)),bottom:Math.max(...rs.map(r=>r.bottom))}};
 const alive=el=>el&&(Array.isArray(el)?el.every(x=>x.isConnected):el.isConnected);
 const place=()=>{if(!ov.isConnected)return;if(tgt&&!alive(tgt))tgt=find();const vw=innerWidth,vh=innerHeight,W=Math.min(440,vw-20);bub.style.width=W+'px';const bh=bub.offsetHeight;
  if(!tgt){spot.style.display='none';blk.style.clipPath='';blk.classList.add('dim');bub.style.left=(vw-W)/2+'px';bub.style.top=Math.max(10,(vh-bh)/2)+'px';return}
  const r=rectOf(tgt),p=8,x1=Math.max(4,r.left-p),y1=Math.max(4,r.top-p),x2=Math.min(vw-4,r.right+p),y2=Math.min(vh-4,r.bottom+p);
  blk.classList.remove('dim');spot.style.display='block';Object.assign(spot.style,{left:x1+'px',top:y1+'px',width:Math.max(0,x2-x1)+'px',height:Math.max(0,y2-y1)+'px'});
  blk.style.clipPath=`polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,${x1}px ${y1}px,${x2}px ${y1}px,${x2}px ${y2}px,${x1}px ${y2}px,${x1}px ${y1}px)`;
  bub.style.left=Math.max(10,Math.min(vw-W-10,(x1+x2)/2-W/2))+'px';
  const below=vh-y2-14,above=y1-14;bub.style.top=(below>=bh?y2+12:above>=bh?y1-12-bh:below>=above?vh-bh-10:10)+'px'};
 const show=()=>{const s=steps[i],last=i===steps.length-1;tgt=find();
  bub.innerHTML=`<button class="tx" data-tr="end" aria-label="إغلاق الشرح">✕</button><div class="thd">${M.catSVG(last?'happy':'hi')}<span class="tcount">${steps.length>1?`${i+1} من ${steps.length}`:'شرح'}</span></div><h3 id="tbt">${s.title}</h3><div class="tbody">${s.body}</div>
<div class="tdots" aria-hidden="true">${steps.length>1?steps.map((x,j)=>`<i class="${j===i?'on':j<i?'done':''}"></i>`).join(''):''}</div>
<div class="tnav">${i?'<button class="btn" data-tr="prev">→ السابق</button>':''}${(s.extra||[]).map((x,j)=>`<button class="btn ${x.p?'p':''}" data-tr="x${j}">${x.label}</button>`).join('')}<button class="btn ${s.extra?'':'p'}" data-tr="next">${last?(s.finish||'تمام، فهمت ✓'):'التالي ←'}</button></div>`;
  bub.style.width=Math.min(440,innerWidth-20)+'px';
  if(tgt){const el0=Array.isArray(tgt)?tgt[0]:tgt,me=i,r=rectOf(tgt);
   /* bring it near the top so the bubble fits underneath it, unless it is too tall for that */
   const block=s.block||(r.bottom-r.top+bub.offsetHeight+120<=innerHeight?'start':'center');
   el0.style.scrollMarginTop='84px';el0.scrollIntoView({block,behavior:'smooth'});
   /* if the smooth scroll got cut short, jump there */
   setTimeout(()=>{if(i!==me||!el0.isConnected)return;const r=rectOf(tgt),b=bub.getBoundingClientRect(),hidden=r.bottom<0||r.top>innerHeight-60,covered=block==='start'&&r.top<b.bottom&&r.bottom>b.top;
    if(hidden||covered){el0.scrollIntoView({block});place()}},650)}
  place();setTimeout(place,350);setTimeout(place,700);bub.querySelector('[data-tr=next]').focus({preventScroll:true})};
 const end=()=>{if(!ov.isConnected)return;ov.remove();removeEventListener('resize',place);removeEventListener('scroll',place,true);removeEventListener('keydown',kd,true)};
 const kd=e=>{if(e.key==='Escape'){e.stopPropagation();end()}};
 addEventListener('resize',place);addEventListener('scroll',place,true);addEventListener('keydown',kd,true);
 bub.addEventListener('click',e=>{const b=e.target.closest('[data-tr]');if(!b)return;const a=b.dataset.tr;
  if(a==='end')end();if(a==='prev'&&i>0){i--;show()}
  if(a==='next'){if(i<steps.length-1){i++;show()}else end()}
  if(a[0]==='x'){const x=steps[i].extra[+a.slice(1)];end();x.fn()}});
 /* a tap on the dimmed part gives the bubble a little shake, so it's clear where to look */
 blk.addEventListener('click',()=>bub.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'none'}],{duration:260}));
 show();return {end,place}}
const fldOf=sel=>()=>$(sel)?.closest('.fld');
const fldsOf=(...sels)=>()=>sels.map(s=>$(s)?.closest('.fld'));
/* what a sample add-on looks like inside a cup, for each "shape" */
function kindDemo(){const W=A.work||A.menu,DC={syrup:'#f47a8c',pearls:'#6b4226',foam:'#fff4e2',topping:'#ffd6e3'};
 return `<div class="kdemo">${KIND.map(([k,l])=>{const a=W.addons.find(x=>x.kind===k)||{id:'_k',name:'',ar:'',price:0,color:DC[k]};const ad={...a,id:'_k',kind:k};
  return `<figure>${sampleCup({addons:[ad],ad:{_k:2}})}<figcaption>${l}</figcaption></figure>`}).join('')}</div>`}
const saveStep=()=>({el:()=>$('#sbar:not(.hide)')||$('[data-d=addrow]')||$('.rows'),title:'لا تنسى تحفظ',
 body:`<p>أي تعديل تسويه ما يوصل للعملاء إلا لما تضغط <b>«حفظ التغييرات»</b>. الزر يطلع في شريط تحت أول ما تغيّر أي شي، كذا:</p><div class="sbmock"><span>عندك تغييرات ما انحفظت</span><b>تراجع</b><b class="p">حفظ التغييرات</b></div><p class="hx-tip">غلطت؟ اضغط «تراجع» ويرجع كل شي زي ما كان.</p>`});
function helpSteps(kind){const W=A.work||A.menu,first='.irow:first-child',w=k=>`[data-w="${kind}:0:${k}"]`;
 if(kind==='drinks')return [
  {el:'.dcard',title:'هذي مشروباتك',body:'<p>كل بطاقة هنا مشروب يشوفه العميل في المنيو. اضغط على أي مشروب عشان تغيّر صورته أو اسمه أو سعره، أو تحذفه.</p><p class="hx-tip">الرقم على صورة المشروب هو مكانه في المنيو.</p>'},
  {el:'.dnew',title:'مشروب جديد',body:'<p>اضغط هنا عشان تضيف مشروب جديد للمنيو.</p>'},
  {el:'[data-d=sort]',title:'ترتيب المشروبات',body:'<p>تبي مشروب يطلع أول؟ اضغط هنا ورتّبهم بالأسهم أو بالسحب.</p><p class="hx-tip">أول مشروب يطلع أول واحد في المنيو، وأول 3 يطلعون في الصفحة الرئيسية.</p>'},
  {title:'تبي نوريك كيف تضيف مشروب؟',body:'<p>نفتح لك مشروب جديد، ونشرح لك كل جزء فيه خطوة بخطوة، وأنت تشوف شكله عند العميل.</p>',extra:[{label:'إيه، وريني',p:true,fn:()=>openDrink('',{guided:true})}],finish:'لا، خلاص'}];
 if(kind==='addons')return [
  {title:'وش هي الإضافات؟',body:`<p>الإضافات هي اللي يزيدها العميل على مشروبه: سيرب، بوبا، رغوة، رشّات…</p><p>العميل يشوفها كمضخات في «مكينة» تحضير المشروب. كل ضغطة على زر <b>«ضخ»</b> تزيد وحدة (لين 3)، وتنصب في الكوب قدامه.</p><div class="hx-icons">${W.addons.slice(0,4).map(a=>`<span>${M.icon(a,46)}<small>${esc(a.ar||a.name)}</small></span>`).join('')}</div>`},
  {el:`${first} .pv`,title:'صورة الإضافة',body:'<p>هذي الصورة الصغيرة تطلع للعميل على المضخة. تتلوّن باللون اللي تختاره، وشكلها يتغيّر حسب «الشكل في الكوب».</p>'},
  {el:fldsOf(w('ar'),w('name')),title:'اسم الإضافة',body:'<p>اكتب الاسم بالعربي والإنجليزي. العميل يشوف الاسم باللغة اللي اختارها.</p>'},
  {el:fldOf(w('price')),title:'السعر',body:'<p>كم تزيد الإضافة على سعر المشروب. إذا العميل ضغط المضخة مرتين، تنحسب مرتين.</p><p class="hx-tip">إضافة مجانية؟ اكتب 0</p>'},
  {el:fldOf(w('color')),title:'اللون',body:'<p>لون الإضافة داخل الكوب وعلى المضخة. اختار لون قريب من لونها الحقيقي، مثلاً وردي للفراولة وبني للبوبا.</p>'},
  {el:fldOf(w('kind')),title:'الشكل في الكوب',body:`<p>يحدد كيف تطلع الإضافة داخل كوب العميل:</p>${kindDemo()}`},
  {el:`${first} .del`,title:'حذف إضافة',body:'<p>خلصت عندك إضافة أو ما تبيها؟ احذفها من هنا. الطلبات القديمة ما تتأثر.</p>'},
  {el:'[data-d=addrow]',title:'إضافة جديدة',body:'<p>اضغط هنا عشان تضيف إضافة جديدة. تنزل آخر القائمة، وتكتب اسمها وسعرها.</p><p class="hx-tip">وتقدر تختار لكل مشروب إضافاته من صفحة المشروب نفسه.</p>'},
  saveStep()];
 if(kind==='milks'){const m0=W.milks.filter(m=>m.color).sort((a,b)=>M.lum(a.color)-M.lum(b.color))[0]||{id:'_m',name:'',ar:'',add:0,color:'#f1e2c6'};return [
  {title:'أنواع الحليب',body:`<p>العميل يختار نوع حليب واحد لمشروبه، من أزرار مثل هذي:</p><div class="hx-chips">${W.milks.map((m,i)=>`<span class="chip ${i?'':'on'}"><span class="sw" style="background:${m.color||'transparent'}"></span>${esc(m.ar||m.name)}${m.add?` <small>+${money(m.add)}</small>`:''}</span>`).join('')}</div><p class="hx-tip">أول نوع في القائمة هو اللي يكون مختار من البداية.</p>`},
  {el:`${first} .pv`,title:'لون الحليب',body:`<p>الدائرة تبيّن لون الحليب. هذا اللون يطلع كطبقة داخل كوب العميل:</p><div class="kdemo two"><figure>${sampleCup({milks:[m0],milk:m0.id})}<figcaption>مع ${esc(m0.ar||m0.name||'حليب')}</figcaption></figure><figure>${sampleCup()}<figcaption>بدون حليب</figcaption></figure></div>`},
  {el:fldsOf(w('ar'),w('name')),title:'اسم الحليب',body:'<p>اكتب الاسم بالعربي والإنجليزي، مثل «شوفان» و «Oat».</p>'},
  {el:fldOf(w('add')),title:'زيادة السعر',body:'<p>كم يزيد هذا الحليب على سعر المشروب.</p><p class="hx-tip">حليب عادي بدون زيادة؟ خلها 0، ويطلع للعميل بدون سعر.</p>'},
  {el:fldOf(w('color')),title:'اللون',body:'<p>اختار لون قريب من لون الحليب الحقيقي. الحليب العادي أبيض، الشوفان بيج…</p>'},
  {el:`${first} .del`,title:'حذف نوع',body:'<p>ما عندك هذا النوع؟ احذفه من هنا. لازم يبقى نوع واحد على الأقل.</p>'},
  {el:'[data-d=addrow]',title:'نوع حليب جديد',body:'<p>اضغط هنا عشان تضيف نوع حليب جديد، وبعدين اكتب اسمه وسعره واختار لونه.</p>'},
  saveStep()]}
 const d0=A.menu.drinks[0],s1=W.sizes[1]||W.sizes[0];return [
  {title:'الأحجام',body:`<p>عندك 3 أحجام ثابتة. تقدر تغيّر أسماءها وكم تزيد على السعر، بس ما تنحذف.</p><div class="kdemo three">${W.sizes.map(s=>`<figure>${sampleCup({size:s.id})}<figcaption>${esc(s.ar||s.name)}</figcaption></figure>`).join('')}</div>`},
  {el:fldsOf('[data-w="sizes:0:ar"]','[data-w="sizes:0:name"]'),title:'اسم الحجم',body:'<p>تقدر تسمّي الأحجام زي ما تبي، مثل «صغير» أو «12 أونصة».</p>'},
  {el:fldOf('[data-w="sizes:0:add"]'),title:'زيادة السعر',body:`<p>كم يزيد هذا الحجم على سعر المشروب. الحجم الصغير عادة 0.</p>${d0&&s1?`<p class="hx-tip">مثال: ${esc(d0.ar||d0.name)} سعره ${money(d0.price)}. لو العميل اختار «${esc(s1.ar||s1.name)}» يصير ${money((+d0.price||0)+(+s1.add||0))}.</p>`:''}`},
  {title:'كل مشروب وأحجامه',body:'<p>ما لازم كل مشروب يكون له 3 أحجام. افتح أي مشروب من «المشروبات» واختار الأحجام اللي تبيعها له (القسم 3).</p>'},
  saveStep()]}
/* the walkthrough of one drink's page, for the first drink (or any time from the "شرح" button) */
function drinkSteps(sh){const q=s=>()=>$(s,sh),qf=(...ss)=>()=>ss.map(s=>$(s,sh)?.closest('.fld'));
 return [
  {el:q('#dprev'),title:'هذا شكل مشروبك عند العميل',body:'<p>في المنيو يطلع كبطاقة فيها الصورة والاسم والسعر. ولما العميل يختاره، يصير كوب مبتسم يتعبّى قدامه.</p><p class="hx-tip">كل شي تكتبه تحت، يتغيّر هنا على طول.</p>'},
  {el:q('#sec-photo'),title:'صورة المشروب',body:'<p>اضغط <b>«اختر صورة»</b> وحط صورة مشروبك. الصور الطولية تطلع أحلى.</p><p class="hx-tip">ما عندك صورة الحين؟ عادي، نرسم كوب بلون المشروب، وتقدر تحط الصورة بعدين.</p>'},
  {el:qf('[data-f=ar]','[data-f=name]'),title:'اسم المشروب',body:'<p>اكتب الاسم بالعربي والإنجليزي. جرّب تكتب الحين، وشوف البطاقة فوق تتغيّر.</p>'},
  {el:qf('[data-f=descAr]','[data-f=desc]'),title:'وصف قصير',body:'<p>جملة صغيرة تطلع تحت الاسم، مثل «ماتشا مع حليب الشوفان». تقدر تخليها فاضية.</p>'},
  {el:qf('[data-f=price]'),title:'السعر',body:'<p>سعر أصغر حجم بدون إضافات. الحجم الأكبر والحليب والإضافات تنزاد عليه، والعميل يشوف المجموع وهو يختار.</p>'},
  {el:qf('[data-f=color]'),title:'لون المشروب',body:'<p>يلوّن الكوب المبتسم اللي يتعبّى قدام العميل. اختار لون قريب من لون مشروبك.</p>'},
  {el:q('#sec-sizes'),title:'الأحجام',body:'<p>اختار الأحجام اللي تبيعها لهذا المشروب. اللي عليه علامة ✓ يطلع للعميل.</p>'},
  {el:q('#sec-addons'),title:'الإضافات',body:'<p><b>«كل الإضافات»</b> يعني العميل يقدر يحط أي إضافة في هذا المشروب. أو اختار <b>«إضافات محددة»</b> وحدد اللي تناسبه بس.</p>'},
  {el:q('.sft .btn.p'),title:'آخر شي: احفظ',body:'<p>لما تخلص اضغط <b>«حفظ المشروب»</b>، ويطلع للعملاء على طول.</p>'}]}

/* ================= the store's name and logo ================= */
const initials=b=>((b.name||(b.ar?'':M.DEF_NAME[0])).match(/[A-Za-z0-9]+/g)||[]).slice(0,3).map(w=>w[0].toUpperCase()).join('');
function brandPreview(b){const ar=b.ar.trim()||b.name.trim()||M.DEF_NAME[1],en=b.name.trim()||b.ar.trim()||M.DEF_NAME[0],[h1,h2]=M.halves(ar),lg=M.logoHTML(b.logo),c=initials(b);
 return `<div class="bprev" aria-hidden="true"><div class="bp-top">${lg}<b>${esc(ar)}</b><span class="bp-pills"><i></i><i></i></span></div>
<div class="bp-hero"><div class="tit"><div class="t1 bub-g">${esc(h1)}</div>${h2?`<div class="t2 bub-p">${esc(h2)}</div>`:''}</div></div>
<div class="bp-top bp-en" dir="ltr">${lg}<b>${esc(en)}</b><small>English</small></div>
<p class="bp-no">رقم الطلب يطلع كذا: <b dir="ltr">#${c?c+'-':''}1234</b></p></div>`}
function brandForm(b,{name=true,logo=true}={}){
 return `${name?`<label class="fld">اسم المحل بالعربي<input data-b="ar" value="${esc(b.ar)}" dir="rtl" maxlength="40" placeholder="مثال: ماتشا موتشي"></label>
<label class="fld">اسم المحل بالإنجليزي<input data-b="name" value="${esc(b.name)}" dir="ltr" maxlength="40" placeholder="e.g. Matcha Mochi"></label>`:''}
${logo?`<div class="blrow"><span class="blimg">${M.logoHTML(b.logo)}</span><div class="pc"><label class="btn ${name?'':'p'}">${ICO.cam}<span>${b.logo?'غيّر الشعار':'اختر صورة الشعار'}</span><input type="file" accept="image/*" data-b="file" class="hide"></label>${b.logo?'<button type="button" class="lnk mut" data-b="nologo">شيل الشعار وارجع للشعار الأصلي</button>':'<span class="hint" style="margin:0">بدون شعار، يطلع الشعار الأصلي ♡</span>'}<span class="hint" data-b="up" style="margin:0"></span></div></div>`:''}
<p class="lerr" data-b="err" role="alert"></p>
<h3 class="bsub">كذا يشوفه العميل:</h3><div data-b="prev">${brandPreview(b)}</div>`}
/* listens once on a box that stays; redraw() paints the form again after a logo change */
function bindBrand(box,b,redraw){
 box.addEventListener('input',e=>{const k=e.target.dataset?.b;if(k!=='ar'&&k!=='name')return;b[k]=e.target.value;const p=$('[data-b=prev]',box);if(p)p.innerHTML=brandPreview(b);const er=$('[data-b=err]',box);if(er)er.textContent=''});
 box.addEventListener('change',async e=>{if(e.target.dataset?.b!=='file'||!e.target.files[0])return;const up=$('[data-b=up]',box);up.textContent='جاري رفع الشعار…';b.busy=true;
  try{const blob=await shrinkLogo(e.target.files[0]);const j=await api('images',{method:'POST',raw:blob,type:'image/png'});b.logo=j.url;b.busy=false;redraw()}
  catch(x){b.busy=false;up.textContent=x.code==='img'?'ما قدرنا نقرأ هالملف كصورة':errMsg(x)}});
 box.addEventListener('click',e=>{if(e.target.closest('[data-b=nologo]')){b.logo='';redraw()}})}
const brandOK=(b,box)=>{if(b.ar.trim()||b.name.trim())return true;const er=$('[data-b=err]',box);if(er)er.textContent='اكتب اسم المحل';$('[data-b=ar]',box)?.focus();return false};
async function saveBrand(b,ok){try{const j=await api('brand',{method:'PUT',body:{name:b.name.trim(),ar:b.ar.trim(),logo:b.logo,done:!!b.done}});A.brand=j.brand;M.setBrand(A.brand);
  /* the first name the store gets also makes its link */
  const had=shopUrl();if(j.slug)A.me.slug=j.slug;const sl=$('#shopl');if(sl&&shopUrl()){sl.href=shopUrl();sl.hidden=false}
  if(!had&&shopUrl()&&A.page==='account'&&!$('.wiz'))renderAccount();
  const l=$('.ah .logo');if(l)l.innerHTML=`${M.logoHTML()}<b>${esc(M.bName(1))}</b>`;badge();if(ok)toast(ok);return true}
 catch(e){if(e.code!=='auth')toast(errMsg(e),true);return false}}

/* ================= first-time setup =================
   A new store is asked for its name and logo, then walked through adding its first drink. */
function runWizard(){$$('.wiz').forEach(x=>x.remove());
 const b={name:A.brand.name||'',ar:A.brand.ar||'',logo:A.brand.logo||''},Z={step:0,drink:null};
 const el=document.createElement('div');el.className='wiz';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','تجهيز المحل');
 document.body.appendChild(el);document.body.style.overflow='hidden';
 const steps=['اسم المحل','الشعار','أول مشروب'];
 const head=()=>`<ol class="wsteps">${steps.map((s,i)=>`<li class="${Z.step===i+1?'on':Z.step>i+1?'done':''}"><i>${Z.step>i+1?'✓':i+1}</i>${s}</li>`).join('')}</ol>`;
 const card=d=>{const m0=A.menu.milks.find(m=>m.color);return `<div class="pvrow wcard"><figure><div class="pvcard"><img src="${d.img||M.drinkArt(d,0)}" alt=""><div class="pvinfo"><b>${esc(d.ar||d.name)}</b><span>${esc(d.descAr||d.desc)}</span><span class="price">${money(fromPrice(d))}</span></div></div><figcaption>في المنيو</figcaption></figure><figure><div class="pvcup">${sampleCup({drink:d,milks:m0?[m0]:[],milk:m0?.id||null})}</div><figcaption>لما يحضّره</figcaption></figure></div>`};
 const draw=()=>{const s=Z.step;let h='';
  if(s===0)h=`<div class="wbox wcenter">${M.catSVG('happy')}<h1>أهلاً فيك! ♡</h1><p>هذي لوحة التحكم حقت محلك. خلنا نجهّزه سوا في 3 خطوات بسيطة:</p>
<ol class="wlist">${steps.map((x,i)=>`<li><i>${i+1}</i>${x}</li>`).join('')}</ol><button class="btn p big" data-z="next">يلا نبدأ ←</button></div>`;
  if(s===1)h=`<div class="wbox">${head()}<h2>وش اسم محلك؟</h2><p class="hint">يطلع فوق في كل صفحة، وفي العنوان الكبير بالصفحة الرئيسية، وفي رسائل الواتساب للعملاء.</p>${brandForm(b,{logo:false})}
<div class="wnav"><button class="btn" data-z="back">→ رجوع</button><button class="btn p" data-z="next">التالي ←</button></div></div>`;
  if(s===2)h=`<div class="wbox">${head()}<h2>حط شعار محلك</h2>${shopUrl()?`<div class="wlink">صار لمحلك رابط ♡ أرسله لعملائك عشان يطلبون منه:<a href="${shopUrl()}" target="_blank" rel="noopener" dir="ltr">${esc(shopShown())}</a></div>`:''}<p class="hint">الشعار يطلع جنب اسم المحل فوق كل صفحة، وعلى أيقونة الموقع في المتصفح. الصور المربعة أو الدائرية تطلع أحلى.</p>${brandForm(b,{name:false})}
<div class="wnav"><button class="btn" data-z="back">→ رجوع</button><button class="btn p" data-z="next">${b.logo?'التالي ←':'تخطَّ، بحطه بعدين ←'}</button></div></div>`;
  if(s===3)h=`<div class="wbox">${head()}<h2>أضف أول مشروب ♡</h2><p>بنفتح لك صفحة المشروب، ونشرح لك كل جزء فيها خطوة بخطوة. وأنت تكتب، تشوف شكل مشروبك عند العميل على طول. مثلاً كذا:</p>
${card(A.menu.drinks[0])}
${isDemo()?'<p class="wnote">المشروبات اللي في المنيو الحين أمثلة بس. أول ما تحفظ مشروبك، نشيلها ويبقى مشروبك.</p>':''}
<div class="wnav"><button class="btn" data-z="back">→ رجوع</button><button class="btn p big" data-z="drink">يلا، أضيف مشروبي ←</button></div>
<button class="lnk mut wskip" data-z="skip">${isDemo()?'بعدين، خلّ المشروبات التجريبية الحين':'عندي مشروبات من قبل، تخطَّ'}</button></div>`;
  if(s===4)h=`<div class="wbox wcenter">${M.catSVG('happy')}<h1>محلك جاهز! ♡</h1>${Z.drink?`<p>مشروبك صار في المنيو، وكذا يشوفه العميل:</p>${card(Z.drink)}`:''}
<ul class="wtips"><li><b>ترتيب المشروبات:</b> من «المشروبات» اضغط «ترتيب المشروبات».</li><li><b>الإضافات والحليب والأحجام:</b> فيها أمثلة جاهزة. افتح أي واحد منها واضغط الزر الأصفر الكبير، ونشرح لك كيف تعدّلها.</li><li><b>اسم المحل والشعار:</b> تغيّرها متى ما تبي من «الحساب».</li><li><b>الاستلام والتوصيل والدفع وموقع المحل وحجم الشعار:</b> من «الإعدادات».</li><li><b>الطلبات:</b> توصلك في «الطلبات» مع صوت تنبيه.</li></ul>
${shopUrl()?`<div class="wlink">رابط متجرك:<a href="${shopUrl()}" target="_blank" rel="noopener" dir="ltr">${esc(shopShown())}</a></div>`:''}<div class="wnav"><a class="btn" href="${shopUrl()}" target="_blank" rel="noopener">افتح المتجر وشوفه ↗</a><button class="btn p big" data-z="finish">ابدأ ♡</button></div></div>`;
  el.innerHTML=h;el.scrollTop=0;
  if(s===1)setTimeout(()=>$('[data-b=ar]',el)?.focus(),60);else el.querySelector('.btn.p')?.focus({preventScroll:true})};
 bindBrand(el,b,draw);
 const done=async()=>{if(await saveBrand({...b,done:true})){Z.step=4;draw()}};
 el.addEventListener('click',async e=>{const t=e.target.closest('[data-z]');if(!t)return;const a=t.dataset.z;
  if(a==='back'){Z.step--;draw()}
  if(a==='next'){if(Z.step===1&&!brandOK(b,el))return;
   /* saving the name here is what gives the store its link */
   if(Z.step===1){t.disabled=true;if(!(await saveBrand(b))){t.disabled=false;return}}
   if(Z.step===2){if(b.busy){toast('انتظر لين يخلص رفع الشعار');return}t.disabled=true;if(!(await saveBrand(b))){t.disabled=false;return}}
   Z.step++;draw()}
  if(a==='drink'){openDrink('',{guided:true,onDone:d=>{document.body.style.overflow='hidden';if(d){Z.drink=d;done()}else toast('ما انحفظ المشروب. اضغط الزر وجرّب مرة ثانية ♡')}})}
  if(a==='skip')done();
  if(a==='finish'){el.remove();document.body.style.overflow='';if(Z.drink){A.dtab='drinks';location.hash='#drinks';route()}}});
 draw()}

/* ================= the visual text editor =================
   The real shop page runs inside a frame in "edit" mode. Every text in it is tagged, so each one gets a box
   beside the page with an arrow pointing at it. Typing changes the frame straight away; customers only see it after "نشر". */
const STATES=[['land','الصفحة الرئيسية'],['drink','اختيار المشروب'],['machine','تحضير المشروب'],['cart','السلة'],['pickup','الطلب: استلام'],['delivery','الطلب: توصيل'],['done','بعد إرسال الطلب'],['msgs','رسائل تظهر أحياناً'],['wa','رسائل واتساب']];
const E={st:'land',lang:'ar',draft:ls.get('mm-tdraft',{}),T:[],built:'',h:800,active:null,ready:false};
const li=()=>E.lang==='ar'?1:0;
const orig=(k,i)=>(M.TX[k]||['',''])[i];
const pub=(k,i)=>{const o=A.texts[k];return o&&typeof o[i]==='string'?o[i]:orig(k,i)};
const cur=(k,i)=>{const d=E.draft[k];return d&&typeof d[i]==='string'?d[i]:pub(k,i)};
const effective=()=>{const out={};for(const k of new Set([...Object.keys(A.texts),...Object.keys(E.draft)]))out[k]=[cur(k,0),cur(k,1)];return out};
const changes=()=>Object.entries(E.draft).reduce((n,[k,v])=>n+[0,1].filter(i=>typeof v[i]==='string'&&v[i]!==pub(k,i)).length,0);
function setDraft(k,i,v){const d=E.draft[k]||[null,null];d[i]=v===pub(k,i)?null:v;if(d[0]===null&&d[1]===null)delete E.draft[k];else E.draft[k]=d;ls.set('mm-tdraft',E.draft);counter()}
function counter(){const n=changes(),c=$('#tcnt');if(c){c.textContent=!n?'كل التعديلات منشورة ✓':n===1?'تعديل واحد ما انتشر بعد':n===2?'تعديلين ما انتشروا بعد':`${n} تعديلات ما انتشرت بعد`;c.classList.toggle('has',!!n)}
 $$('[data-t=publish],[data-t=discard]').forEach(b=>b.disabled=!n);const fl=$('#tfloat');if(fl)fl.classList.toggle('hide',!n)}
const frame=()=>$('#pvf');
let syncT=0;
function sync(force){clearTimeout(syncT);syncT=setTimeout(()=>{const f=frame();if(f&&E.ready)f.contentWindow.postMessage({mm:'set',ov:effective(),lang:E.lang,st:E.st,force},location.origin)},force?0:40)}
function renderTexts(){E.ready=false;E.built='';E.T=[];
 page().innerHTML=`<div class="ph1"><h1>نصوص الموقع</h1><p>كل كلمة في الموقع لها مربع وسهم يأشّر عليها. اكتب النص الجديد في المربع وشوف التغيير على طول. العملاء ما يشوفون شي إلا لما تضغط «نشر».</p></div>
<div class="tbar"><div class="states" role="group" aria-label="أي صفحة">${STATES.map(([k,l])=>`<button data-t="st" data-v="${k}" class="${E.st===k?'on':''}" aria-pressed="${E.st===k}">${l}</button>`).join('')}</div>
<div class="trow"><span class="lsw" role="group" aria-label="لغة النصوص">${[['ar','عربي'],['en','English']].map(([k,l])=>`<button data-t="lang" data-v="${k}" class="${E.lang===k?'on':''}" aria-pressed="${E.lang===k}">${l}</button>`).join('')}</span><span class="cnt" id="tcnt" aria-live="polite"></span><button class="btn" data-t="discard">تراجع عن التعديلات</button><button class="btn p" data-t="publish">نشر للعملاء</button></div></div>
<p class="thelp">تقدر تضغط على أي كلمة في الصفحة عشان تروح لمربعها.</p>
<div class="tstage" id="stage"><div class="pvw" id="pvw"><iframe id="pvf" title="معاينة الموقع كما يشوفه العميل" src="${shopUrl()||'/~'}?edit=1" tabindex="-1"></iframe></div><div id="slices"></div><svg class="arr" id="arr" aria-hidden="true"></svg><div id="tcs"></div></div>
<div class="savebar hide" id="tfloat" style="position:fixed;left:12px;right:12px;bottom:84px;z-index:45"><span id="tfn">تعديلات ما انتشرت</span><button class="btn p" data-t="publish">نشر</button></div>`;
 if(matchMedia('(min-width:821px)').matches)$('#tfloat').remove();
 counter()}
function leaveEditor(){E.ready=false}
addEventListener('message',e=>{if(e.origin!==location.origin||!e.data||!frame()||e.source!==frame().contentWindow)return;const m=e.data;
 if(m.mm==='ready'){E.ready=true;sync(true)}
 if(m.mm==='rendered'){E.h=m.h;const key=E.st+'|'+E.lang+'|'+m.keys;if(E.built!==key)build(key);else layout()}
 if(m.mm==='pick')pickKey(m.key)});
function pickKey(k){const c=$(`.tc[data-k="${k}"] textarea`);if(c){activate(c.closest('.tc'));c.focus({preventScroll:true});c.closest('.tc').scrollIntoView({block:'center',behavior:'smooth'})}}
/* one box per text found on the page that is showing */
function build(key){const f=frame(),doc=f.contentDocument;if(!doc)return;E.built=key;const seen=new Set();E.T=[];
 doc.querySelectorAll('[data-tx],[data-txph]').forEach(el=>{const k=el.dataset.tx||el.dataset.txph;if(seen.has(k)||!M.TX[k])return;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return;seen.add(k);E.T.push({k,el,ph:!!el.dataset.txph})});
 const box=$('#tcs');box.innerHTML='';const i=li();
 for(const t of E.T){const c=document.createElement('div');c.className='tc';c.dataset.k=t.k;const toks=(orig(t.k,0)+orig(t.k,1)).match(/\{(\w+)\}/g);
  c.innerHTML=`${t.ph?'<div class="ph">نص يظهر داخل الخانة قبل ما العميل يكتب</div>':''}<textarea rows="1" dir="${E.lang==='ar'?'rtl':'ltr'}" lang="${E.lang}" aria-label="نص"></textarea>${toks?`<div class="tks">${[...new Set(toks)].map(x=>`<button type="button" data-tok="${x}" title="اضغط عشان تحطها في النص">${x} = ${esc(M.TOKENS[x.slice(1,-1)]||'')}</button>`).join('')}</div>`:''}<button type="button" class="rs hide">رجّع النص الأصلي</button>`;
  const ta=c.querySelector('textarea');ta.value=cur(t.k,i);box.appendChild(c);t.card=c;t.ta=ta;mark(t)}
 $$('#tcs textarea').forEach(grow);layout();
 if(E.active){const t=E.T.find(x=>x.k===E.active);if(t)t.ta.focus({preventScroll:true})}}
function mark(t){const i=li(),v=cur(t.k,i);t.card.classList.toggle('ch',typeof E.draft[t.k]?.[i]==='string');t.card.querySelector('.rs').classList.toggle('hide',v===orig(t.k,i));
 $$('[data-tok]',t.card).forEach(b=>{const miss=!v.includes(b.dataset.tok);b.style.background=miss?'#fff1f3':'';b.style.borderColor=miss?'#d6245b':'';b.title=miss?'هذي الكلمة ناقصة من النص. اضغط عشان ترجعها':'اضغط عشان تحطها في النص'})}
const grow=ta=>{ta.style.height='auto';ta.style.height=ta.scrollHeight+'px'};
document.addEventListener('input',e=>{const ta=e.target;if(!ta.closest?.('#tcs'))return;const c=ta.closest('.tc'),t=E.T.find(x=>x.card===c);if(!t)return;setDraft(t.k,li(),ta.value);mark(t);grow(ta);sync()});
function activate(c){if(!c||E.active===c.dataset.k&&c.classList.contains('on'))return;E.active=c.dataset.k;$$('#tcs .tc').forEach(x=>x.classList.toggle('on',x===c));frame()?.contentWindow.postMessage({mm:'hl',key:E.active},location.origin);arrows()}
document.addEventListener('focusin',e=>activate(e.target.closest?.('#tcs .tc')));
document.addEventListener('pointerdown',e=>activate(e.target.closest?.('#tcs .tc')));
document.addEventListener('click',async e=>{const tok=e.target.closest('[data-tok]');if(tok){const c=tok.closest('.tc'),ta=c.querySelector('textarea'),s=ta.selectionStart??ta.value.length;ta.focus();ta.setRangeText(tok.dataset.tok,s,ta.selectionEnd??s,'end');ta.dispatchEvent(new Event('input',{bubbles:true}));return}
 const rs=e.target.closest('#tcs .rs');if(rs){const c=rs.closest('.tc'),t=E.T.find(x=>x.card===c);t.ta.value=orig(t.k,li());t.ta.dispatchEvent(new Event('input',{bubbles:true}));return}
 const b=e.target.closest('[data-t]');if(!b)return;const a=b.dataset.t;
 if(a==='st'&&b.dataset.v!==E.st){E.st=b.dataset.v;$$('[data-t=st]').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});E.active=null;sync(true)}
 if(a==='lang'&&b.dataset.v!==E.lang){E.lang=b.dataset.v;$$('[data-t=lang]').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});sync(true)}
 if(a==='discard'){const n=changes();if(!n)return;if(!(await ask({title:'تتراجع عن كل التعديلات؟',body:`بترجع ${n} ${n===1?'تعديل':'تعديلات'} للنص المنشور حالياً.`,ok:'تراجع',danger:true})))return;E.draft={};ls.set('mm-tdraft',E.draft);E.built='';counter();sync(true)}
 if(a==='publish'){const n=changes();if(!n){toast('ما فيه تعديلات جديدة');return}
  if(!(await ask({title:'تنشر التعديلات للعملاء؟',body:`فيه ${n} ${n===1?'تعديل':'تعديلات'}. بعد النشر العملاء يشوفونها على طول.`,ok:'نشر'})))return;
  const out={};for(const[k,v]of Object.entries(effective()))if(v[0]!==orig(k,0)||v[1]!==orig(k,1))out[k]=v;
  b.disabled=true;try{const j=await api('texts',{method:'PUT',body:{texts:out}});A.texts=j.texts;M.setTexts(A.texts);E.draft={};ls.set('mm-tdraft',E.draft);E.T.forEach(mark);counter();toast('تم النشر ✓ الموقع صار يعرض النصوص الجديدة')}
  catch(x){b.disabled=false;if(x.code!=='auth')toast(errMsg(x),true)}}});
/* where everything goes: the page in the middle (or on the left on a phone), boxes beside it, lined up with their texts */
const G={};
function layout(){const st=$('#stage'),f=frame();if(!st||!f||!E.T.length&&!E.built)return;const pe=st.parentElement,pcs=getComputedStyle(pe),W=pe.clientWidth-parseFloat(pcs.paddingLeft)-parseFloat(pcs.paddingRight),two=W>=980;
 if(!two)return layoutSlices(W);
 let gap=60,cw=Math.min(340,Math.floor((W-480-gap*2)/2)),s=1;if(cw<230){cw=230;s=Math.max(.55,(W-2*cw-2*gap)/480)}
 const pw=480*s,ph=E.h*s,pvX=cw+gap,side={L:0,R:pvX+pw+gap};
 Object.assign(G,{s,pvX,pw,two,cw});
 st.style.width=(cw*2+gap*2+pw)+'px';$('#slices').innerHTML='';
 const pv=$('#pvw');pv.classList.remove('ghost');pv.style.left=pvX+'px';pv.style.width=pw+'px';pv.style.height=ph+'px';f.style.height=E.h+'px';f.style.transform=`scale(${s})`;
 const items=E.T.map(t=>{const r=t.el.getBoundingClientRect();const x0=Math.max(0,r.left),x1=Math.min(480,r.right);return {t,x:pvX+x0*s,y:r.top*s,w:Math.max(4,(x1-x0)*s),h:r.height*s}}).filter(o=>o.t.el.isConnected);
 items.forEach(o=>{o.t.card.style.width=cw+'px'});
 const bottom={L:0,R:0};items.sort((a,b)=>a.y-b.y||a.x-b.x);
 for(const o of items){const H=o.t.card.offsetHeight,want=o.y+o.h/2-Math.min(26,H/2);let sd='R';
  if(two){const pl=Math.max(want,bottom.L),pr=Math.max(want,bottom.R);sd=Math.abs(pl-pr)<6?((o.x+o.w/2)<(pvX+pw/2)?'L':'R'):(pl<pr?'L':'R')}
  const top=Math.max(0,want,bottom[sd]);bottom[sd]=top+H+8;o.top=top;o.H=H;o.sd=sd;o.t.card.style.left=side[sd]+'px';o.t.card.style.top=top+'px'}
 st.style.height=Math.max(ph,bottom.L,bottom.R)+30+'px';G.items=items;arrows()}
/* On a phone the boxes need more height than the shrunken page has, so the page is cut into slices,
   each shown right beside its own boxes. The slices are still copies of the real page in edit mode. */
function layoutSlices(W){const st=$('#stage'),f=frame(),gap=W<520?16:32,cw=Math.round(Math.min(320,Math.max(150,W*.46))),s=Math.min(1,(W-cw-gap)/480),pw=480*s;
 st.style.width=W+'px';
 const pv=$('#pvw');pv.classList.add('ghost');pv.style.left='0';pv.style.width='480px';pv.style.height=E.h+'px';f.style.height=E.h+'px';f.style.transform='none';
 const items=E.T.filter(t=>t.el.isConnected).map(t=>{const r=t.el.getBoundingClientRect(),x0=Math.max(0,r.left),x1=Math.min(480,r.right);return {t,py:r.top,pb:r.bottom,px:x0,pw2:Math.max(4,x1-x0)}}).sort((a,b)=>a.py-b.py||a.px-b.px);
 items.forEach(o=>o.t.card.style.width=cw+'px');
 const sl=[];let cur=null,maxB=0;
 items.forEach((o,i)=>{if(!cur)cur={y0:sl.length?sl[sl.length-1].y1:0,items:[]};cur.items.push(o);maxB=Math.max(maxB,o.pb);const nx=items[i+1];
  if(!nx){cur.y1=E.h;sl.push(cur);cur=null;return}
  const ch=cur.items.reduce((h,x)=>h+x.t.card.offsetHeight+8,0);
  if(nx.py>=maxB){const cut=(maxB+nx.py)/2;if(ch-(cut-cur.y0)*s>110){cur.y1=cut;sl.push(cur);cur=null}}});
 if(!sl.length)sl.push({y0:0,y1:E.h,items:[]});
 const box=$('#slices');while(box.children.length>sl.length)box.lastChild.remove();while(box.children.length<sl.length){const w=document.createElement('div');w.className='slice';w.innerHTML='<iframe tabindex="-1" aria-hidden="true"></iframe>';box.appendChild(w)}
 let top=0;const placed=[];
 sl.forEach((c,i)=>{const el=box.children[i],h=(c.y1-c.y0)*s,fr=el.firstChild;el.style.top=top+'px';el.style.width=pw+'px';el.style.height=h+'px';fr.style.height=E.h+'px';fr.style.transform=`translateY(${-c.y0*s}px) scale(${s})`;
  let b=top;c.items.forEach(o=>{const H=o.t.card.offsetHeight,y=top+(o.py-c.y0)*s,hh=(o.pb-o.py)*s,t=Math.max(y+hh/2-Math.min(26,H/2),b);
   o.t.card.style.left=(pw+gap)+'px';o.t.card.style.top=t+'px';b=t+H+8;placed.push({t:o.t,x:o.px*s,y,w:o.pw2*s,h:hh,top:t,H,sd:'R'})});
  top=Math.max(top+h,b)+(i<sl.length-1?22:0)});
 st.style.height=top+20+'px';Object.assign(G,{s,pvX:0,pw,two:false,cw,items:placed});arrows();syncSlices()}
function syncSlices(){const md=frame()?.contentDocument;if(!md||!md.getElementById('app'))return;const html=md.getElementById('app').innerHTML;
 $$('#slices iframe').forEach(fr=>{const d=fr.contentDocument;if(!d)return;
  if(!fr.dataset.ok){d.open();d.write('<!DOCTYPE html>'+md.documentElement.outerHTML.replace(/<script\b[\s\S]*?<\/script>/gi,''));d.close();fr.dataset.ok='1';
   d.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const el=e.target.closest('[data-tx],[data-txph]');if(el)pickKey(el.dataset.tx||el.dataset.txph)},true)}
  else{d.documentElement.lang=md.documentElement.lang;d.documentElement.dir=md.documentElement.dir;const a=d.getElementById('app');if(a&&a.innerHTML!==html)a.innerHTML=html}})}
function arrows(){const svg=$('#arr');if(!svg||!G.items)return;const C='#ff4f86',c2='#ff8fb1';
 const one=(o,on)=>{const L=o.sd==='L',sx=L?G.cw+parseFloat(o.t.card.style.left):parseFloat(o.t.card.style.left),sy=o.top+Math.min(26,o.H/2);
  const ex=L?o.x-3:o.x+o.w+3,ey=o.y+o.h/2,dx=ex-sx;
  return `<rect x="${o.x-3}" y="${o.y-3}" width="${o.w+6}" height="${o.h+6}" rx="6" fill="${on?'#ff4f8614':'none'}" stroke="${on?C:c2}" stroke-width="${on?2.5:1.5}" stroke-dasharray="${on?'':'5 4'}" opacity="${on?1:.75}"/><circle cx="${sx}" cy="${sy}" r="${on?4.5:3.5}" fill="${on?C:c2}"/><path d="M${sx},${sy} C${sx+dx*.5},${sy} ${ex-dx*.5},${ey} ${ex},${ey}" fill="none" stroke="${on?C:c2}" stroke-width="${on?3:2}" marker-end="url(#${on?'ha':'hb'})" opacity="${on?1:.8}"/>`};
 svg.innerHTML=`<defs><marker id="ha" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${C}"/></marker><marker id="hb" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${c2}"/></marker></defs>`
  +G.items.filter(o=>o.t.k!==E.active).map(o=>one(o,false)).join('')+G.items.filter(o=>o.t.k===E.active).map(o=>one(o,true)).join('')}
let rzT=0;addEventListener('resize',()=>{clearTimeout(rzT);rzT=setTimeout(()=>{if(A.page==='texts')layout()},120)});

/* ================= account ================= */
function renderAccount(){page().innerHTML=`<div class="ph1"><h1>الحساب</h1></div><div class="acct">
<section class="sec" id="brandsec"></section>
<section class="sec"><h3>دخلت باسم «${esc(A.me.user||'')}»</h3><p class="hint">${shopUrl()?`رابط متجرك للعملاء: <a href="${shopUrl()}" target="_blank" rel="noopener" dir="ltr">${esc(shopShown())}</a>`:'متجرك ما له رابط للحين: اكتب اسم المحل فوق واحفظه، ويصير لك رابط.'}</p><p class="hint">احفظ رابط هذي الصفحة عشان ترجع لها: <b dir="ltr">${esc(location.host)}/admin</b></p><button class="btn" data-a="logout">تسجيل الخروج</button></section>
<form class="sec" id="pwf" novalidate><h3>تغيير كلمة المرور</h3><p class="hint">بعد التغيير، أي جهاز ثاني داخل بالحساب يطلع ويحتاج يدخل من جديد.</p>
<label class="fld">كلمة المرور الحالية<input name="cur" type="password" autocomplete="current-password" dir="ltr"></label>
<label class="fld">كلمة المرور الجديدة<input name="nw" type="password" autocomplete="new-password" dir="ltr"></label>
<label class="fld">اكتب الجديدة مرة ثانية<input name="nw2" type="password" autocomplete="new-password" dir="ltr"></label>
<label class="fld">اسم مستخدم جديد (اختياري)<input name="user" autocomplete="username" placeholder="${esc(A.me.user||'')}" dir="auto"></label>
<p class="lerr" id="pwerr" role="alert"></p><button class="btn p" type="submit">حفظ كلمة المرور</button></form></div>`;
 /* the store's name and logo */
 const bs=$('#brandsec'),bb={name:A.brand.name||'',ar:A.brand.ar||'',logo:A.brand.logo||'',done:true};
 const bdraw=()=>{bs.innerHTML=`<h3>محلك</h3><p class="hint">اسم المحل وشعاره يطلعون للعملاء فوق كل صفحة.</p>${brandForm(bb)}<div class="wnav" style="justify-content:flex-start"><button class="btn p" data-b="save">حفظ اسم المحل والشعار</button></div><p class="hint">تبي الشعار أكبر أو أصغر؟ غيّر حجمه من <a href="#settings">«الإعدادات»</a>.</p><button class="lnk wskip" data-b="rewiz">شغّل الإعداد والشرح من البداية</button>`};
 bdraw();bindBrand(bs,bb,bdraw);
 bs.addEventListener('click',async e=>{const t=e.target.closest('[data-b]');if(!t)return;
  if(t.dataset.b==='save'){if(!brandOK(bb,bs))return;if(bb.busy){toast('انتظر لين يخلص رفع الشعار');return}t.disabled=true;await saveBrand(bb,'تم الحفظ ✓ والعملاء يشوفون الاسم والشعار الجديد');t.disabled=false}
  if(t.dataset.b==='rewiz')runWizard()});
 const f=$('#pwf');f.addEventListener('submit',async e=>{e.preventDefault();const er=$('#pwerr');er.textContent='';
  if(f.nw.value.length<6){er.textContent='كلمة المرور الجديدة لازم تكون 6 أحرف أو أكثر';return}if(f.nw.value!==f.nw2.value){er.textContent='كلمتا المرور الجديدة مو متطابقتين';return}
  const u=f.user.value.trim();if(u&&u.length<3){er.textContent='اسم المستخدم لازم يكون 3 أحرف أو أكثر';return}
  try{await api('password',{method:'POST',body:{current:f.cur.value,next:f.nw.value,user:u||undefined}});A.me=await api('me');toast('تم تغيير كلمة المرور ✓');renderAccount()}
  catch(x){er.textContent=x.code==='login'?'كلمة المرور الحالية غلط':x.code==='taken'?'اسم المستخدم هذا مأخوذ. اختر اسم ثاني.':errMsg(x)}})}
async function logout(){if(!(await ask({title:'تسجيل الخروج؟',ok:'خروج'})))return;try{await api('logout',{method:'POST'})}catch(e){}A.me={admin:false};A.orders=null;A.seen=null;showLogin()}

/* ================= stamp cards =================
   Every order gives the customer's phone number one stamp. A full card (8) means the next drink is free. */
const FULL=8;
function stampDots(n){return Array.from({length:FULL},(_,i)=>`<i class="${i<n?'st':''}">${i<n?M.pawSVG('#ff4f86'):''}</i>`).join('')}
function renderStamps(){const p=page();
 p.innerHTML=`<div class="ph1"><h1>بطاقات الأختام</h1><p>كل طلب يعطي العميل ختم على رقم جواله. لما تكمل ${FULL} أختام، مشروبه الجاي مجاني. هنا تشوف أختام كل عميل وتعدّلها، والعميل يشوف نفس العدد.</p></div>
<button class="helpb" data-l="help">${ICO.help}<span><b>كيف تستخدم بطاقات الأختام؟</b><small>اضغط هنا ونشرح لك كل شي خطوة بخطوة</small></span><i aria-hidden="true">←</i></button>
<label class="ssearch"><span class="hide">ابحث برقم الجوال</span><input type="search" id="sq" inputmode="tel" dir="ltr" placeholder="🔍 ابحث برقم الجوال" value="${esc(A.q)}" autocomplete="off"></label>
<div id="slist">${A.cards?'':'<div class="tload">جاري التحميل… ♡</div>'}</div>`;
 if(A.cards)drawCards();
 loadCards().catch(e=>{if(A.page==='stamps'&&!A.cards)$('#slist').innerHTML=`<div class="empty">${esc(errMsg(e))}</div>`})}
const cardMatch=(c,q)=>{if(!q)return true;const d=q.replace(/\D/g,'');if(!d)return (c.name||'').includes(q.trim());return c.key.includes(d)||c.key.includes(pkey(d))||String(c.phone).replace(/\D/g,'').includes(d)||('0'+c.key.slice(3)).includes(d)};
function cardHTML(c){const full=c.stamps>=FULL;
 return `<article class="lcard ${full?'full':''}" data-k="${esc(c.key)}"><div class="lh"><span><b class="lph" dir="ltr">${esc(c.phone)}</b><span class="lnm">${esc(c.name||'')}</span></span>${full?'<span class="lfull">🎁 له مشروب مجاني</span>':''}</div>
<div class="scard lst" aria-hidden="true">${stampDots(c.stamps)}</div>
<div class="lctl"><button class="btn ic" data-l="minus" aria-label="شيل ختم من ${esc(c.phone)}" ${c.stamps<=0?'disabled':''}>−</button><span class="lcount" aria-live="polite"><b>${c.stamps}</b> من ${FULL} أختام</span><button class="btn ic" data-l="plus" aria-label="زيد ختم لـ ${esc(c.phone)}" ${full?'disabled':''}>+</button></div>
<p class="lstats"><span>كسب مشروب مجاني: <b>${c.earned||0}</b> ${c.earned===1?'مرة':'مرات'}</span><span>استخدمه: <b>${c.redeemed||0}</b> ${c.redeemed===1?'مرة':'مرات'}</span><span>الطلبات: <b>${c.orders||0}</b></span></p>
<div class="lact">${full?'<button class="btn g" data-l="redeem">🎁 استخدم المشروب المجاني</button>':''}<button class="lnk red" data-l="reset" ${c.stamps?'':'disabled'}>تصفير الأختام</button></div></article>`}
function drawCards(){const box=$('#slist');if(!box||!A.cards)return;const list=A.cards.filter(c=>cardMatch(c,A.q)),full=A.cards.filter(c=>c.stamps>=FULL).length;
 if(!A.cards.length){box.innerHTML=`<div class="empty">${M.catSVG('hi')}ما فيه عملاء بعد. أول ما يطلب أحد، يطلع رقمه هنا مع أختامه ♡</div>`;return}
 box.innerHTML=`<p class="lsum">${A.cards.length} ${A.cards.length===1?'عميل':'عملاء'}${full?` · ${full} عندهم مشروب مجاني الحين`:''}</p>`+(list.length?`<div class="lgrid">${list.slice(0,A.climit).map(cardHTML).join('')}</div>${list.length>A.climit?'<div class="more"><button class="btn" data-l="more">عرض المزيد</button></div>':''}`
  :`<div class="empty">ما لقينا رقم فيه «${esc(A.q)}»</div>`)}
/* every change saves straight away; changes to the same customer go one after the other */
const cardQ={},cardN={},cardT={};
/* a fresh list from the server (asked for at time t0), except customers changed here since then keep what's on screen */
const mergeCards=(list,t0)=>(list||[]).map(s=>cardN[s.key]>0||cardT[s.key]>=t0?(A.cards||[]).find(x=>x.key===s.key)||s:s);
function loadCards(){const t0=Date.now();return api('loyalty').then(j=>{A.cards=mergeCards(j.cards,t0);if(A.page==='stamps')drawCards()})}
function saveCard(key,body,undo){cardN[key]=(cardN[key]||0)+1;cardT[key]=Date.now();const cur=()=>A.cards.find(x=>x.key===key);
 /* the server's answer only replaces what's on screen once no newer tap is still waiting to save */
 cardQ[key]=(cardQ[key]||Promise.resolve()).then(()=>api('loyalty/'+key,{method:'POST',body})).then(j=>{if(--cardN[key]===0&&j.card){const c=cur();if(c){Object.assign(c,j.card);redrawCard(key)}}})
  .catch(e=>{if(--cardN[key]===0){const c=cur();if(c&&undo)Object.assign(c,undo);cardT[key]=0;loadCards().catch(()=>{})}if(e.code!=='auth')toast(errMsg(e),true)});return cardQ[key]}
function redrawCard(key){const el=$(`.lcard[data-k="${key}"]`),c=A.cards.find(x=>x.key===key);if(el&&c){const f=document.activeElement?.dataset?.l;el.outerHTML=cardHTML(c);if(f)$(`.lcard[data-k="${key}"] [data-l="${f}"]`)?.focus()}}
document.addEventListener('input',e=>{if(e.target.id==='sq'){A.q=e.target.value;A.climit=60;drawCards()}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-l]');if(!b||!$('#page')?.contains(b))return;const a=b.dataset.l;
 if(a==='help')return tour(stampSteps());
 if(a==='more'){A.climit+=60;drawCards();return}
 const key=b.closest('.lcard')?.dataset.k,c=A.cards?.find(x=>x.key===key);if(!c)return;const undo={...c};
 if(a==='plus'||a==='minus'){const n=Math.max(0,Math.min(FULL,c.stamps+(a==='plus'?1:-1)));if(n===c.stamps)return;c.stamps=n;redrawCard(key);saveCard(key,{stamps:n},undo)}
 if(a==='reset'){if(!(await ask({title:'تصفّر أختام '+(c.name||c.phone)+'؟',body:'البطاقة ترجع صفر أختام.',ok:'صفّر',danger:true})))return;c.stamps=0;redrawCard(key);saveCard(key,{reset:true},undo).then(()=>toast('تم التصفير ✓'))}
 if(a==='redeem'){if(!(await ask({title:'تستخدم المشروب المجاني لـ'+(c.name||c.phone)+'؟',body:'البطاقة ترجع تبدأ من جديد. لا تنسى تخصم سعر مشروب واحد من حسابه.',ok:'استخدمه'})))return;c.stamps=Math.max(0,c.stamps-FULL);c.redeemed=(c.redeemed||0)+1;redrawCard(key);saveCard(key,{redeem:true},undo).then(()=>toast('تم ✓ استخدم مشروبه المجاني'))}});
function stampSteps(){return [
 {title:'بطاقات الأختام',body:`<p>كل ما يطلب العميل، ياخذ ختم على رقم جواله. لما تكمل ${FULL} أختام يصير له مشروب مجاني.</p><p class="hx-tip">العميل يشوف بطاقته بعد ما يرسل طلبه، بنفس العدد اللي هنا.</p>`},
 {el:'#sq',title:'دوّر على عميل',body:'<p>اكتب رقم جواله أو جزء منه، وتطلع بطاقته.</p>'},
 {el:()=>$('.lctl'),title:'زيد أو نقّص الأختام',body:'<p>اضغط <b>+</b> أو <b>−</b>. التغيير ينحفظ على طول، ما تحتاج زر حفظ.</p>'},
 {el:()=>$('.lstats'),title:'كم مرة أخذ مشروب مجاني',body:'<p>«كسب» يعني كم مرة كمّل البطاقة، و«استخدمه» كم مرة أخذ المشروب المجاني.</p>'},
 {el:()=>$('.lact'),title:'المشروب المجاني والتصفير',body:'<p>لما تكمل البطاقة يطلع زر <b>«استخدم المشروب المجاني»</b>. اضغطه لما تعطيه المشروب، والبطاقة ترجع من الصفر.</p><p class="hx-tip">ويطلع لك نفس الزر على الطلب نفسه في صفحة الطلبات.</p>'}]}

/* ================= discount codes =================
   The owner makes a code (like MATCHA10), shares it, and the customer types it when ordering.
   The discount comes off the drinks only, never the delivery fee. The server counts every use. */
const cdf=new Intl.DateTimeFormat('ar-u-nu-latn',{day:'numeric',month:'long',year:'numeric'});
const dayStr=d=>cdf.format(new Date(d+'T12:00:00+03:00'));
const todayStr=()=>{const d=new Date(Date.now()+3*3600e3);return d.toISOString().slice(0,10)};
const normCode=v=>String(v||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).toUpperCase().replace(/[\s_-]+/g,'');
const deal=c=>c.kind==='amt'?`خصم ${money(c.value)}`:`خصم ${M.numStr(c.value)}%`;
/* is the code working right now? [css class, words] */
function cpState(c){if(!c.on)return ['off','موقّف'];if(c.until&&Date.now()>Date.parse(c.until+'T23:59:59.999+03:00'))return ['end','انتهى'];if(c.limit&&c.uses>=c.limit)return ['end','خلص'];return ['on','شغّال']}
const usesAr=n=>n===0?'ولا مرة':n===1?'مرة وحدة':n===2?'مرتين':`${n} ${n<=10?'مرات':'مرة'}`;
function cpRules(c){const r=[];
 r.push(c.min?`للطلبات اللي مشروباتها ${money(c.min)} أو أكثر`:'على أي طلب');
 if(c.once)r.push('مرة وحدة لكل عميل (رقم جوال)');
 if(c.limit)r.push(c.limit===1?'استخدام واحد بس':c.limit===2?'استخدامين بس':`أول ${c.limit} ${c.limit<=10?'استخدامات':'استخدام'} بس`);
 r.push(c.until?`آخر يوم: ${dayStr(c.until)}`:'بدون تاريخ نهاية');return r}
function couponCard(c){const [st,stl]=cpState(c);
 return `<article class="lcard ccard ${st}" data-c="${esc(c.code)}"><div class="lh"><b class="ccode" dir="ltr">${esc(c.code)}</b><span class="cst ${st}">${stl}</span></div>
<p class="cdeal">${deal(c)} <small>على المشروبات</small></p>
<ul class="crules">${cpRules(c).map(x=>`<li>${x}</li>`).join('')}</ul>
<p class="lstats"><span>استخدموه: <b>${usesAr(c.uses||0)}</b>${c.limit?` من ${c.limit}`:''}</span><span>مجموع الخصم: <b>${money(c.given||0)}</b></span></p>
<div class="lact"><button class="btn ${c.on?'':'g'}" data-cp="toggle">${c.on?'⏸ أوقف الكود':'▶ شغّل الكود'}</button><button class="btn" data-cp="share">📤 شارك الكود</button><button class="btn" data-cp="edit">✏️ تعديل</button></div></article>`}
function renderCoupons(){const p=page();
 p.innerHTML=`<div class="ph1"><h1>كوبونات الخصم</h1><p>سوّ كود خصم وأرسله لعملائك (في إنستقرام أو واتساب مثلاً). العميل يكتب الكود وقت الطلب، والخصم ينقص من سعر المشروبات.</p></div>
<button class="helpb" data-cp="help">${ICO.help}<span><b>كيف تستخدم كوبونات الخصم؟</b><small>اضغط هنا ونشرح لك كل شي خطوة بخطوة</small></span><i aria-hidden="true">←</i></button>
<div id="clist">${A.coupons?'':'<div class="tload">جاري التحميل… ♡</div>'}</div>`;
 if(A.coupons)drawCoupons();
 api('coupons').then(j=>{A.coupons=j.coupons||[];if(A.page==='coupons')drawCoupons()}).catch(e=>{if(A.page==='coupons'&&!A.coupons)$('#clist').innerHTML=`<div class="empty">${esc(errMsg(e))}</div>`})}
function drawCoupons(){const box=$('#clist');if(!box||!A.coupons)return;const n=A.coupons.filter(c=>cpState(c)[0]==='on').length;
 box.innerHTML=`<div class="lgrid"><button class="dnew cnew" data-cp="new">+ كوبون جديد</button>${A.coupons.map(couponCard).join('')}</div>`+
  (A.coupons.length?`<p class="lsum" style="margin-top:12px">${A.coupons.length} ${A.coupons.length===1?'كوبون':'كوبونات'} · ${n?`${n} شغّال الحين`:'ولا واحد شغّال الحين، فالعملاء ما يشوفون خانة الكود'}</p>`
  :`<div class="empty">${M.catSVG('hi')}ما سوّيت كوبونات بعد. اضغط «كوبون جديد» وسوّ أول كود خصم ♡</div>`)}
async function saveCoupon(c,isNew){const j=await api('coupons/'+encodeURIComponent(c.code),{method:'PUT',body:{...c,new:isNew}});const i=A.coupons.findIndex(x=>x.code===j.coupon.code);
 if(i<0)A.coupons.unshift(j.coupon);else A.coupons[i]=j.coupon;if(A.page==='coupons')drawCoupons();return j.coupon}
const shareText=c=>`استخدم الكود ${c.code} وخذ ${deal(c)} على طلبك من ${M.bName(1)} ♡${c.min?`\n(للطلبات من ${money(c.min)} وفوق)`:''}${c.until?`\nإلى ${dayStr(c.until)}`:''}${shopUrl()?'\n'+location.origin+shopUrl():''}`;
async function shareCoupon(c){const text=shareText(c);
 try{if(navigator.share){await navigator.share({text});return}}catch(e){if(e&&e.name==='AbortError')return}
 try{await navigator.clipboard.writeText(text);toast('تم نسخ رسالة الكوبون ✓ الصقها في واتساب أو إنستقرام')}catch(e){prompt('انسخ هذي الرسالة:',text)}}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-cp]');if(!b||!$('#page')?.contains(b))return;const a=b.dataset.cp;
 if(a==='help')return tour(couponSteps());
 if(a==='new')return couponSheet(null);
 const code=b.closest('.ccard')?.dataset.c,c=A.coupons?.find(x=>x.code===code);if(!c)return;
 if(a==='edit')couponSheet(c);
 if(a==='share')shareCoupon(c);
 if(a==='toggle'){if(c.on&&!(await ask({title:`توقف الكود ${c.code}؟`,body:'العملاء ما يقدرون يستخدمونه لين تشغّله مرة ثانية.',ok:'أوقفه'})))return;
  b.disabled=true;try{await saveCoupon({...c,on:!c.on},false);toast(c.on?'تم ✓ الكود موقّف':'تم ✓ الكود شغّال الحين')}catch(x){b.disabled=false;if(x.code!=='auth')toast(errMsg(x),true)}}});
/* the form for a new code, or for changing one */
const CPWORDS=['MATCHA','SWEET','MOCHI','HELLO','YUMMY','SIP','LOVE','TREAT'];
const suggestCode=v=>CPWORDS[Math.floor(Math.random()*CPWORDS.length)]+(v&&v<100?v:Math.floor(10+Math.random()*89));
function couponSheet(src){const isNew=!src;const c=src?clone(src):{code:'',kind:'pct',value:10,min:0,limit:0,once:false,until:'',on:true};
 const start=JSON.stringify(c);let T=null;
 const sh=document.createElement('div');sh.className='sheet';document.body.appendChild(sh);document.body.style.overflow='hidden';
 const close=async force=>{if(!force&&JSON.stringify(c)!==start&&!(await ask({title:'تطلع بدون حفظ؟',body:'التعديلات على هذا الكوبون بتضيع.',ok:'اطلع بدون حفظ',cancel:'ارجع',danger:true})))return;T?.end();sh.remove();document.body.style.overflow='';removeEventListener('keydown',kd)};
 const kd=e=>{if(e.key==='Escape'&&!$('.modal')&&!$('.tour'))close()};addEventListener('keydown',kd);
 const ex=()=>{const q=$('#cpex',sh);if(!q)return;const sub=c.min>50?c.min:50,d=Math.min(sub,c.kind==='amt'?+c.value||0:sub*(+c.value||0)/100);
  q.innerHTML=+c.value>0?`مثال: عميل طلب مشروبات بـ <b>${money(sub)}</b>، يوفّر <b>${money(Math.round(d*100)/100)}</b> ويدفع <b>${money(Math.round((sub-d)*100)/100)}</b>${'<br><small>رسوم التوصيل ما يشملها الخصم</small>'}`:'اكتب قيمة الخصم فوق'};
 sh.innerHTML=`<div class="sbox" role="dialog" aria-modal="true" aria-labelledby="csh"><div class="shd"><h2 id="csh">${isNew?'كوبون جديد':'تعديل الكوبون '+esc(c.code)}</h2><button class="btn" data-k="close" aria-label="إغلاق">✕</button></div>
<div class="sbd">
<section class="sec" id="k-code"><h3><i>1</i>الكود</h3>${isNew?`<p class="hint">الكلمة اللي يكتبها العميل. حروف إنجليزية وأرقام بس، من 3 إلى 20.</p>
<span class="lrow"><input id="kcode" class="kcode" dir="ltr" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="MATCHA10" value="${esc(c.code)}" aria-label="الكود"><button type="button" class="btn" data-k="suggest">🎲 اقترح كود</button></span>`
 :`<p class="kcode ro" dir="ltr">${esc(c.code)}</p><p class="hint">الكود نفسه ما يتغيّر. تبي كود ثاني؟ سوّ كوبون جديد.</p>`}<p class="lerr" id="kcerr" role="alert"></p></section>
<section class="sec" id="k-deal"><h3><i>2</i>كم الخصم؟</h3>
<div class="rad">${[['pct','نسبة مئوية %','مثال: 10% من سعر المشروبات'],['amt','مبلغ ثابت (ر.س)','مثال: 5 ر.س من سعر المشروبات']].map(([v,l,s])=>`<label><input type="radio" name="kkind" value="${v}" ${c.kind===v?'checked':''}><span>${l}<small>${s}</small></span></label>`).join('')}</div>
<label class="fld" style="margin-top:12px"><span id="kvl">${c.kind==='amt'?'مبلغ الخصم (ر.س)':'نسبة الخصم (%)'}</span><input type="number" min="0" ${c.kind==='pct'?'max="100"':''} step="${c.kind==='pct'?1:0.5}" inputmode="decimal" dir="ltr" data-k="value" value="${c.value||''}"></label>
<p class="cpex" id="cpex"></p><p class="lerr" id="kverr" role="alert"></p></section>
<section class="sec" id="k-rules"><h3><i>3</i>شروط (اختياري)</h3><p class="hint">خلّ الخانة فاضية إذا ما تبي الشرط.</p>
<div class="g2"><label class="fld">أقل مبلغ للمشروبات (ر.س)<input type="number" min="0" step="1" inputmode="decimal" dir="ltr" data-k="min" value="${c.min||''}" placeholder="بدون حد"></label>
<label class="fld">كم مرة يُستخدم الكود كله؟<input type="number" min="0" step="1" inputmode="numeric" dir="ltr" data-k="limit" value="${c.limit||''}" placeholder="بدون حد"></label></div>
<div class="rad k1"><label><input type="checkbox" data-k="once" ${c.once?'checked':''}><span>مرة وحدة لكل عميل<small>نعرف العميل من رقم جواله</small></span></label></div>
<label class="fld" style="margin-top:12px">آخر يوم يشتغل فيه الكود<span class="lrow"><input type="date" data-k="until" dir="ltr" min="${todayStr()}" value="${esc(c.until)}"><button type="button" class="btn" data-k="nountil" ${c.until?'':'hidden'}>شيل التاريخ</button></span></label>
<p class="hint" id="kuntil">${c.until?`يشتغل لين آخر يوم ${dayStr(c.until)}`:'بدون تاريخ: يشتغل لين توقفه أنت'}</p></section>
</div>
<div class="sft"><button class="btn p" data-k="save">${isNew?'إنشاء الكوبون':'حفظ الكوبون'}</button><button class="btn" data-k="close">إلغاء</button>${isNew?'':'<button class="lnk red" data-k="del">حذف الكوبون</button>'}</div></div>`;
 ex();
 sh.addEventListener('input',e=>{const t=e.target,k=t.dataset.k;
  if(t.id==='kcode'){c.code=normCode(t.value);$('#kcerr',sh).textContent=''}
  if(t.name==='kkind'){c.kind=t.value;const v=$('[data-k=value]',sh);$('#kvl',sh).textContent=c.kind==='amt'?'مبلغ الخصم (ر.س)':'نسبة الخصم (%)';v.step=c.kind==='pct'?1:0.5;c.kind==='pct'?v.max=100:v.removeAttribute('max');ex()}
  if(k==='value'){c.value=Math.max(0,parseFloat(t.value)||0);$('#kverr',sh).textContent='';ex()}
  if(k==='min'){c.min=Math.max(0,parseFloat(t.value)||0);ex()}
  if(k==='limit')c.limit=Math.max(0,Math.floor(parseFloat(t.value)||0));
  if(k==='once')c.once=t.checked;
  if(k==='until'){c.until=t.value||'';$('[data-k=nountil]',sh).hidden=!c.until;$('#kuntil',sh).textContent=c.until?`يشتغل لين آخر يوم ${dayStr(c.until)}`:'بدون تاريخ: يشتغل لين توقفه أنت'}});
 sh.addEventListener('change',e=>{if(e.target.name==='kkind'||e.target.dataset.k==='once'||e.target.dataset.k==='until')e.target.dispatchEvent(new Event('input',{bubbles:true}))});
 sh.addEventListener('click',async e=>{if(e.target===sh)return close();const b=e.target.closest('[data-k]');if(!b||b.tagName==='INPUT')return;const k=b.dataset.k;
  if(k==='close')close();
  if(k==='suggest'){c.code=suggestCode(c.kind==='pct'?c.value:0);$('#kcode',sh).value=c.code;$('#kcerr',sh).textContent=''}
  if(k==='nountil'){c.until='';const i=$('[data-k=until]',sh);i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))}
  if(k==='del'){if(!(await ask({title:`حذف الكوبون ${c.code}؟`,body:'العملاء ما يقدرون يستخدمونه بعدها. الطلبات اللي استخدمته تبقى زي ما هي.',ok:'احذف',danger:true})))return;
   try{await api('coupons/'+encodeURIComponent(c.code),{method:'DELETE'});A.coupons=A.coupons.filter(x=>x.code!==c.code);drawCoupons();toast('تم حذف الكوبون');close(true)}catch(x){if(x.code!=='auth')toast(errMsg(x),true)}}
  if(k==='save'){
   if(!/^[A-Z0-9]{3,20}$/.test(c.code)){$('#kcerr',sh).textContent='الكود لازم يكون من 3 إلى 20 حرف إنجليزي أو رقم، بدون مسافات';$('#kcode',sh)?.focus();return}
   if(!(c.value>0)){$('#kverr',sh).textContent='اكتب كم الخصم';$('[data-k=value]',sh).focus();return}
   if(c.kind==='pct'&&c.value>100){$('#kverr',sh).textContent='النسبة ما تزيد عن 100%';$('[data-k=value]',sh).focus();return}
   b.disabled=true;
   try{await saveCoupon(c,isNew);toast(isNew?`تم ✓ الكود ${c.code} شغّال، شاركه مع عملائك`:'تم الحفظ ✓');close(true)}
   catch(x){b.disabled=false;if(x.code==='exists'){$('#kcerr',sh).textContent='فيه كوبون بنفس هذا الكود. اختر كود ثاني.';$('#kcode',sh)?.focus();return}if(x.code!=='auth')toast(errMsg(x),true)}}});
 setTimeout(()=>(isNew?$('#kcode',sh):$('[data-k=value]',sh))?.focus({preventScroll:true}),50)}
function couponSteps(){return [
 {title:'كوبونات الخصم',body:'<p>الكوبون كلمة زي <b dir="ltr">MATCHA10</b> تعطيها لعملائك. العميل يكتبها في صفحة الطلب، والخصم ينقص من سعر المشروبات على طول.</p><p class="hx-tip">خانة الكود تطلع للعملاء بس لما يكون عندك كوبون واحد شغّال على الأقل.</p>'},
 {el:'.cnew',title:'سوّ كوبون',body:'<p>اضغط هنا، اكتب الكود (أو اضغط <b>«اقترح كود»</b>)، واختار الخصم: نسبة مثل 10%، أو مبلغ مثل 5 ر.س.</p><p class="hx-tip">وتقدر تحط شروط: أقل مبلغ للطلب، أو عدد مرات، أو مرة لكل عميل، أو آخر يوم.</p>'},
 {el:()=>$('.ccard .lstats'),title:'كم مرة استخدموه',body:'<p>تشوف كم طلب استخدم الكود، وكم مجموع الخصم اللي أعطيته.</p>'},
 {el:()=>$('.ccard .lact'),title:'أوقف، شارك، عدّل',body:'<p><b>«أوقف الكود»</b> يوقفه على طول بدون ما تحذفه. <b>«شارك الكود»</b> يجهّز لك رسالة ترسلها في واتساب أو إنستقرام.</p>'},
 {title:'في صفحة الطلبات',body:'<p>الطلب اللي فيه كود يطلع عليه سطر الخصم واسم الكود، والمجموع بعد الخصم. وسطر الخصم يطلع بعد في رسالة الواتساب.</p>'}]}

/* ================= store settings: logo size, pickup/delivery, payment, location ================= */
const PAYICO={cash:'💵',card:'💳',transfer:'🏦',applepay:''};
const DEF_SET={pickup:true,delivery:true,fee:0,pay:['cash','card'],transfer:'',loc:null,logoSize:1};
const SIZES=[['صغير',.8],['وسط',1],['كبير',1.3]];
function renderSettings(){const W=A.sw||(A.sw=Object.assign(clone(DEF_SET),clone(A.set||{}),{note:A.set?.loc?.note||''}));
 const mode=W.pickup&&W.delivery?'both':W.delivery?'delivery':'pickup';
 page().innerHTML=`<div class="ph1"><h1>إعدادات المحل</h1><p>كيف يستلم العميل طلبه، وكيف يدفع، ووين محلك، وحجم الشعار. عدّل اللي تبي، وبعدين اضغط «حفظ الإعدادات».</p></div>
<button class="helpb" data-s2="help">${ICO.help}<span><b>كيف تستخدم الإعدادات؟</b><small>اضغط هنا ونشرح لك كل شي خطوة بخطوة</small></span><i aria-hidden="true">←</i></button>
<div class="setg">
<section class="sec" id="s-modes"><h3><i>1</i>كيف يستلم العميل طلبه؟</h3><p class="hint">العميل يشوف بس الطريقة اللي تختارها.</p>
<div class="rad">${[['both','الاثنين','العميل يختار استلام أو توصيل'],['pickup','استلام من المحل فقط','بدون توصيل'],['delivery','توصيل فقط','بدون استلام من المحل']].map(([v,l,s])=>`<label><input type="radio" name="smode" value="${v}" ${mode===v?'checked':''}><span>${l}<small>${s}</small></span></label>`).join('')}</div>
<div id="feebox" class="${W.delivery?'':'hide'}" style="margin-top:12px"><label class="fld">رسوم التوصيل (ر.س)<input type="number" min="0" step="0.5" inputmode="decimal" dir="ltr" data-s2="fee" value="${W.fee}"></label><p class="hint">تنضاف على فاتورة العميل في سطر لحالها، وتطلع في الطلب ورسالة الواتساب. خلها 0 إذا التوصيل مجاني.</p></div></section>
<section class="sec" id="s-pay"><h3><i>2</i>طرق الدفع اللي تقبلها</h3><p class="hint">العميل يشوف بس الطرق اللي عليها ✓. لازم تختار وحدة على الأقل.</p>
<div class="sizes paysel">${M.PAYS.map(k=>`<label class="tog"><input type="checkbox" data-pay="${k}" ${W.pay.includes(k)?'checked':''}><span class="tk">✓</span><span class="pico">${PAYICO[k]||'<b class="apl">Pay</b>'}</span>${PAYL[k]}<small>${k==='transfer'?'قبل الاستلام':W.delivery&&!W.pickup?'عند التوصيل':'عند الاستلام'}</small></label>`).join('')}</div><p class="lerr" id="payerr"></p>
<div id="trbox" class="${W.pay.includes('transfer')?'':'hide'}" style="margin-top:10px"><label class="fld">بيانات التحويل اللي يشوفها العميل<textarea data-s2="transfer" rows="3" maxlength="400" placeholder="اسم البنك&#10;رقم الآيبان: SA…&#10;اسم صاحب الحساب">${esc(W.transfer)}</textarea></label></div></section>
<section class="sec" id="s-loc"><h3><i>3</i>موقع المحل</h3><p class="hint">يطلع للعميل لما يختار «استلام»، مع أزرار تفتح الخريطة في جواله.</p>
<button class="btn" data-s2="here">📍 أنا في المحل الحين، استخدم موقعي</button>
<label class="fld" style="margin-top:12px">أو الصق رابط قوقل ماب أو الإحداثيات<span class="lrow"><input id="maplink" dir="ltr" placeholder="https://maps.app.goo.gl/…" autocomplete="off"><button type="button" class="btn" data-s2="link">حط الموقع</button></span></label>
<p class="hint">أو اضغط على الخريطة في مكان المحل بالضبط. تقدر تسحب الدبوس بعدين.</p>
<div id="lmap" class="lmap"></div><p class="lerr" id="locerr" role="alert"></p>
<label class="fld">وصف المكان (اختياري)<input data-s2="note" maxlength="160" value="${esc(W.note)}" placeholder="مثال: جنب صيدلية النهدي، الباب الأخضر"></label>
<div id="locprev"></div></section>
<section class="sec" id="s-logo"><h3><i>4</i>حجم الشعار</h3><p class="hint">كبّر أو صغّر شعار المحل. يتغيّر في كل مكان يطلع فيه الشعار في الموقع ولوحة التحكم.</p>
<div class="lsz"><div class="seg2" role="group" aria-label="حجم الشعار">${SIZES.map(([l,v])=>`<button type="button" data-s2="lsz" data-v="${v}" class="${Math.abs(W.logoSize-v)<.01?'on':''}">${l}</button>`).join('')}</div>
<label class="lrange"><span>أصغر</span><input type="range" min="0.7" max="1.6" step="0.05" data-s2="logoSize" value="${W.logoSize}" aria-label="حجم الشعار"><span>أكبر</span></label></div>
<h4 class="bsub">كذا يطلع للعميل:</h4><div id="lgprev"></div></section>
<section class="sec" id="s-ntfy"><h3><i>5</i>تنبيهات على جوالك</h3><p class="hint">يوصلك تنبيه على الجوال مع كل طلب جديد، ولما عميل يقول إنه برا المحل، حتى لو لوحة التحكم مسكّرة. نستخدم تطبيق مجاني اسمه <b dir="ltr">ntfy</b>.</p><div id="ntbox"><p class="hint">لحظة…</p></div></section>
</div>
<div class="savebar ${A.sdirty?'':'hide'}" id="ssbar"><span>عندك تغييرات ما انحفظت</span><button class="btn" data-s2="undo">تراجع</button><button class="btn p" data-s2="save">حفظ الإعدادات</button></div>`;
 logoPrev();locPrev();initMap();ntDraw();ntLoad()}
function sDirty(){A.sdirty=true;$('#ssbar')?.classList.remove('hide')}
function logoPrev(){const W=A.sw,b=$('#lgprev');if(!b)return;b.innerHTML=brandPreview({name:A.brand.name||'',ar:A.brand.ar||'',logo:A.brand.logo||''});b.firstElementChild.style.setProperty('--lgs',W.logoSize);
 $$('[data-s2=lsz]').forEach(x=>x.classList.toggle('on',Math.abs(W.logoSize-+x.dataset.v)<.01))}
function locPrev(){const W=A.sw,b=$('#locprev');if(!b)return;
 if(!W.loc){b.innerHTML='<p class="hint" style="margin:0">ما حددت موقع المحل بعد. بدون موقع، العميل يشوف «استلم من كاونتر المحل» بس.</p>';return}
 const m=M.mapLinks(W.loc);b.innerHTML=`<h4 class="bsub">كذا يشوفه العميل لما يختار «استلام»:</h4><div class="lprev"><b>استلم طلبك من هنا ♡</b>${W.note?`<span>${esc(W.note)}</span>`:''}<div class="lbtns"><a class="btn" href="${esc(m.g)}" target="_blank" rel="noopener">📍 قوقل ماب</a><a class="btn" href="${esc(m.a)}" target="_blank" rel="noopener">🧭 خرائط أبل</a></div></div><button class="lnk red" data-s2="noloc">شيل الموقع</button>`}
/* the map comes from the internet only when this page opens */
let LP=null;
const leaflet=()=>LP||(LP=new Promise((res,rej)=>{const c=document.createElement('link');c.rel='stylesheet';c.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(c);
 const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.onload=()=>window.L?res(window.L):rej();s.onerror=()=>{LP=null;s.remove();rej()};document.head.appendChild(s)}));
const MAP={map:null,mk:null};
function setLoc(lat,lng,zoom){const W=A.sw;if(!W)return;W.loc={lat:Math.round(lat*1e6)/1e6,lng:Math.round(lng*1e6)/1e6};$('#locerr')&&($('#locerr').textContent='');sDirty();locPrev();
 const L=window.L;if(MAP.map&&L){if(!MAP.mk){MAP.mk=L.marker([lat,lng],{icon:pinIcon(),draggable:true}).addTo(MAP.map);MAP.mk.on('dragend',()=>{const p=MAP.mk.getLatLng();setLoc(p.lat,p.lng)})}else MAP.mk.setLatLng([lat,lng]);if(zoom)MAP.map.setView([lat,lng],17)}}
const pinIcon=()=>window.L.divIcon({className:'pin',html:'<span>📍</span>',iconSize:[44,44],iconAnchor:[22,40]});
async function initMap(){const el=$('#lmap');if(!el)return;MAP.map=null;MAP.mk=null;let L;
 try{L=await leaflet()}catch(e){el.innerHTML='<p class="hint" style="padding:14px">ما قدرنا نفتح الخريطة. تقدر تلصق رابط قوقل ماب فوق، أو تستخدم موقعك.</p>';return}
 if(!el.isConnected||A.page!=='settings')return;const W=A.sw,c=W.loc||{lat:24.7136,lng:46.6753};
 const map=L.map(el,{scrollWheelZoom:false,tap:true}).setView([c.lat,c.lng],W.loc?16:11);MAP.map=map;
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
 if(W.loc){MAP.mk=L.marker([W.loc.lat,W.loc.lng],{icon:pinIcon(),draggable:true}).addTo(map);MAP.mk.on('dragend',()=>{const p=MAP.mk.getLatLng();setLoc(p.lat,p.lng)})}
 map.on('click',e=>setLoc(e.latlng.lat,e.latlng.lng));setTimeout(()=>map.invalidateSize(),250)}
/* a pasted link or "24.71, 46.67": the pin is often right in the link; short links are opened by the server */
function coordsIn(t){try{t=decodeURIComponent(t)}catch(e){}for(const p of [/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/,/[?&](?:q|query|ll|sll|center|destination|daddr)=(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/,/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,/^\s*(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)\s*$/]){const m=t.match(p);if(m&&Math.abs(+m[1])<=90&&Math.abs(+m[2])<=180)return {lat:+m[1],lng:+m[2]}}return null}
document.addEventListener('input',e=>{const t=e.target;if(!A.sw||!$('#page')?.contains(t))return;const W=A.sw;
 if(t.name==='smode'){W.pickup=t.value!=='delivery';W.delivery=t.value!=='pickup';$('#feebox').classList.toggle('hide',!W.delivery);sDirty()}
 if(t.dataset.pay){W.pay=M.PAYS.filter(k=>$(`[data-pay="${k}"]`)?.checked);$('#trbox').classList.toggle('hide',!W.pay.includes('transfer'));$('#payerr').textContent=W.pay.length?'':'لازم تختار طريقة دفع وحدة على الأقل';sDirty()}
 const k=t.dataset.s2;if(!k)return;
 if(k==='fee'){W.fee=Math.max(0,parseFloat(t.value)||0);sDirty()}
 if(k==='transfer'){W.transfer=t.value;sDirty()}
 if(k==='note'){W.note=t.value;sDirty();locPrev()}
 if(k==='logoSize'){W.logoSize=+t.value;sDirty();logoPrev()}});
document.addEventListener('change',e=>{if(e.target.name==='smode'||e.target.dataset?.pay)e.target.dispatchEvent(new Event('input',{bubbles:true}))});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-s2]');if(!b||!$('#page')?.contains(b)||b.tagName==='INPUT'||b.tagName==='TEXTAREA')return;const a=b.dataset.s2,W=A.sw;if(!W)return;
 if(a==='help')return tour(settingSteps());
 if(a==='lsz'){W.logoSize=+b.dataset.v;$('[data-s2=logoSize]').value=W.logoSize;sDirty();logoPrev()}
 if(a==='noloc'){W.loc=null;if(MAP.mk){MAP.mk.remove();MAP.mk=null}sDirty();locPrev()}
 if(a==='here'){const er=$('#locerr');if(!navigator.geolocation){er.textContent='جهازك ما يقدر يحدد الموقع. الصق رابط قوقل ماب بدالها.';return}b.disabled=true;er.textContent='';
  navigator.geolocation.getCurrentPosition(p=>{b.disabled=false;setLoc(p.coords.latitude,p.coords.longitude,true);toast('تم تحديد موقعك ✓ تأكد إن الدبوس على المحل')},()=>{b.disabled=false;er.textContent='ما قدرنا نعرف موقعك. اسمح للمتصفح يعرف الموقع، أو الصق رابط قوقل ماب.'},{enableHighAccuracy:true,timeout:15000})}
 if(a==='link'){const v=$('#maplink').value.trim(),er=$('#locerr');er.textContent='';if(!v){er.textContent='الصق الرابط في الخانة أول';return}
  let c=coordsIn(v);if(!c&&/^https?:\/\//i.test(v)){b.disabled=true;try{c=await api('maplink',{method:'POST',body:{url:v}})}catch(x){if(x.code==='auth')return}b.disabled=false}
  if(c&&Number.isFinite(c.lat)){setLoc(c.lat,c.lng,true);$('#maplink').value='';toast('تم ✓ شيك إن الدبوس على المحل')}else er.textContent='ما لقينا الموقع في هذا الرابط. جرّب تضغط على مكان المحل في الخريطة.'}
 if(a==='undo'){A.sw=null;A.sdirty=false;renderSettings()}
 if(a==='save'){if(!W.pay.length){$('#payerr').textContent='لازم تختار طريقة دفع وحدة على الأقل';$('#s-pay').scrollIntoView({block:'center',behavior:'smooth'});return}
  b.disabled=true;const body={pickup:W.pickup,delivery:W.delivery,fee:W.fee,pay:W.pay,transfer:W.transfer,logoSize:W.logoSize,loc:W.loc?{...W.loc,note:W.note}:null};
  try{const j=await api('settings',{method:'PUT',body});A.set=j.settings;M.setSettings(A.set);A.sw=null;A.sdirty=false;renderSettings();toast('تم الحفظ ✓ والعملاء يشوفون التغيير الحين')}
  catch(x){b.disabled=false;if(x.code!=='auth')toast(errMsg(x),true)}}});
/* ---------- phone notifications (ntfy). Saved on their own, right away, apart from «حفظ الإعدادات». ---------- */
const NTAPP={android:'https://play.google.com/store/apps/details?id=io.heckel.ntfy',ios:'https://apps.apple.com/app/ntfy/id1625396347'};
function ntLoad(){if(A.nt!==undefined)return;api('ntfy').then(j=>{A.nt=j.ntfy;ntDraw()}).catch(e=>{const b=$('#ntbox');if(b&&e.code!=='auth')b.innerHTML=`<p class="lerr">${esc(errMsg(e))}</p>`})}
function ntDraw(){const b=$('#ntbox');if(!b||A.nt===undefined)return;const n=A.nt,apps=`<div class="lbtns"><a class="btn" href="${NTAPP.android}" target="_blank" rel="noopener">أندرويد</a><a class="btn" href="${NTAPP.ios}" target="_blank" rel="noopener">آيفون</a></div>`;
 if(!n||!n.topic){b.innerHTML=`<ol class="ntst"><li><b>ثبّت تطبيق ntfy على جوالك</b>${apps}</li><li><b>اضغط الزر هنا</b> ونعطيك اسم خاص بمحلك تشترك فيه من التطبيق.<div><button class="btn p" data-nt="new">🔔 فعّل التنبيهات على جوالي</button></div></li></ol>`;return}
 const link=n.server+'/'+n.topic;
 b.innerHTML=`<ol class="ntst"><li><b>ثبّت تطبيق ntfy على جوالك</b>${apps}</li>
<li><b>في التطبيق اضغط ➕ واكتب هذا الاسم</b><span class="lrow ntt"><input readonly dir="ltr" value="${esc(n.topic)}" aria-label="اسم التنبيهات" onclick="this.select()"><button type="button" class="btn" data-nt="copy">نسخ</button></span>${n.server!=='https://ntfy.sh'?`<small class="hint">واكتب السيرفر: <bdi dir="ltr">${esc(n.server)}</bdi></small>`:''}<small class="hint">أو افتح هذا الرابط من جوالك: <a href="${esc(link)}" target="_blank" rel="noopener" dir="ltr">${esc(link.replace(/^https?:\/\//,''))}</a></small><small class="hint">⚠️ لا تعطي الاسم لأحد: اللي يعرفه يشوف طلباتك.</small></li>
<li><b>جرّب</b><div><button class="btn p" data-nt="test">أرسل تنبيه تجربة</button></div></li></ol>
<h4 class="bsub">وش يوصلك؟</h4><div class="rad"><label><input type="checkbox" data-ntk="orders" ${n.orders?'checked':''}><span>طلب جديد<small>اسم العميل والمشروبات والمبلغ</small></span></label><label><input type="checkbox" data-ntk="outside" ${n.outside?'checked':''}><span>العميل برا المحل 🚗<small>تنبيه عالي لما يضغط «أنا برا المحل»</small></span></label></div>
<details class="ntadv"><summary>إعدادات متقدمة</summary><p class="hint">لو عندك سيرفر ntfy خاص. إذا ما تعرف وش هذا، خلّها مثل ما هي.</p>
<label class="fld">السيرفر<input dir="ltr" id="ntsrv" value="${esc(n.server)}" placeholder="https://ntfy.sh" autocomplete="off"></label>
<label class="fld">رمز الدخول (Access token)<input dir="ltr" id="nttok" type="password" placeholder="${n.hasToken?'محفوظ ••••• (اتركه فاضي عشان يبقى)':'اختياري'}" autocomplete="off"></label>
${n.hasToken?'<label class="hint"><input type="checkbox" id="ntnotok"> شيل رمز الدخول</label>':''}
<div class="wnav" style="justify-content:flex-start"><button class="btn" data-nt="adv">حفظ</button><button class="btn" data-nt="new">اسم جديد للتنبيهات</button></div></details>
<button class="lnk red" data-nt="off">أوقف التنبيهات على الجوال</button>`}
async function ntSave(body,ok){try{const j=await api('ntfy',{method:'PUT',body});A.nt=j.ntfy;ntDraw();if(ok)toast(ok);return true}catch(e){if(e.code!=='auth')toast(errMsg(e),true);ntDraw();return false}}
const ntBody=(x={})=>({server:A.nt.server,topic:A.nt.topic,orders:A.nt.orders,outside:A.nt.outside,...x});
document.addEventListener('change',e=>{const k=e.target.dataset?.ntk;if(!k||!A.nt)return;ntSave(ntBody({[k]:e.target.checked}),'تم ✓')});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-nt]');if(!b||!$('#ntbox')?.contains(b))return;const a=b.dataset.nt;
 if(a==='copy'){const v=A.nt?.topic||'';try{await navigator.clipboard.writeText(v);toast('تم النسخ ✓ الصقه في التطبيق')}catch(x){$('.ntt input')?.select();toast('اضغط مطوّل على الاسم وانسخه')}return}
 if(a==='new'){if(A.nt?.topic&&!await ask({title:'اسم جديد للتنبيهات؟',body:'الاسم القديم يوقف، ولازم تشترك بالاسم الجديد في التطبيق مرة ثانية.',ok:'أعطني اسم جديد'}))return;
  b.disabled=true;if(await ntSave(A.nt?.topic?ntBody({topic:'new'}):{topic:'new'},'تم ✓ الحين اشترك بالاسم في التطبيق'))$('#ntbox')?.scrollIntoView({block:'center',behavior:'smooth'});return}
 if(a==='test'){b.disabled=true;try{await api('ntfy/test',{method:'POST'});toast('أرسلنا التنبيه ✓ شيك جوالك')}catch(x){if(x.code!=='auth')toast(x.code==='send'?'ما قدرنا نرسل التنبيه. شيك إعدادات السيرفر.':errMsg(x),true)}b.disabled=false;return}
 if(a==='adv'){const tok=$('#nttok').value.trim(),body=ntBody({server:$('#ntsrv').value.trim()});if(tok)body.token=tok;else if($('#ntnotok')?.checked)body.token='';b.disabled=true;await ntSave(body,'تم الحفظ ✓');return}
 if(a==='off'){if(!await ask({title:'توقف التنبيهات على الجوال؟',body:'ما بيوصلك تنبيه على الجوال بعدها. تقدر تشغلها مرة ثانية متى ما تبي.',ok:'أوقفها',danger:true}))return;b.disabled=true;await ntSave({off:true},'وقّفنا التنبيهات')}});
function settingSteps(){return [
 {el:'#s-modes .rad',title:'استلام أو توصيل؟',body:'<p>اختار إذا محلك يسوي استلام من المحل، أو توصيل، أو الاثنين. العميل يشوف بس اللي تختاره.</p>'},
 {el:()=>$('#feebox:not(.hide)')||$('#s-modes'),title:'رسوم التوصيل',body:'<p>المبلغ اللي ينضاف على كل طلب توصيل. يطلع للعميل في سطر لحاله في الفاتورة، ويطلع لك في الطلب ورسالة الواتساب.</p>'},
 {el:'.paysel',title:'طرق الدفع',body:'<p>حط ✓ على الطرق اللي تقبلها. لو اخترت <b>تحويل بنكي</b>، اكتب بيانات حسابك في الخانة اللي تطلع، والعميل يشوفها وقت الطلب.</p>'},
 {el:'#lmap',title:'موقع المحل',body:'<p>اضغط على مكان محلك في الخريطة، أو اضغط <b>«أنا في المحل الحين»</b> وأنت في المحل، أو الصق رابط قوقل ماب.</p><p class="hx-tip">العميل اللي يختار «استلام» يشوف الخريطة وأزرار تفتحها في جواله.</p>'},
 {el:'#s-logo',title:'حجم الشعار',body:'<p>اختار صغير أو وسط أو كبير، أو حرّك الشريط. تشوف الشكل تحت على طول.</p>'},
 {el:'#s-ntfy',title:'تنبيهات على جوالك',body:'<p>ثبّت تطبيق <b>ntfy</b> المجاني، واضغط <b>«فعّل التنبيهات»</b>، وبعدين اشترك بالاسم اللي يطلع لك. يوصلك تنبيه مع كل طلب حتى لو الصفحة مسكّرة.</p><p class="hx-tip">هذا القسم ينحفظ لحاله على طول، ما يحتاج «حفظ الإعدادات».</p>'},
 {el:()=>$('#ssbar:not(.hide)')||$('#s-logo'),title:'لا تنسى تحفظ',body:'<p>التغييرات ما توصل للعملاء إلا لما تضغط <b>«حفظ الإعدادات»</b>. الزر يطلع تحت أول ما تغيّر أي شي.</p>'}]}

/* ================= go ================= */
/* the admin lives at /admin; old /<store>/admin links land here too */
if(location.pathname!=='/admin')try{history.replaceState(null,'','/admin'+location.hash)}catch(e){}
(async()=>{try{A.me=await api('me');if(A.me.admin)await start();else showLogin(location.hash==='#new')}catch(e){root.innerHTML=`<div class="login"><div class="lbox">${M.catSVG('hi')}<h1>ما قدرنا نفتح الإدارة</h1><p>${esc(errMsg(e))}</p><button class="btn p" onclick="location.reload()">حاول مرة ثانية</button></div></div>`}})();
}
