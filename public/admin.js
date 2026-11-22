/* Matcha Mochi admin: orders, menu, and the visual text editor. Arabic only, written for a non-technical shop owner. */
{
const M=window.MM,esc=M.esc;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const ls={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const clone=o=>JSON.parse(JSON.stringify(o));
const money=n=>M.numStr(n)+' ر.س';
const root=$('#root');
const A={me:null,menu:null,texts:{},orders:null,seen:null,fresh:new Set(),filter:'all',olimit:30,page:'orders',dtab:'drinks',work:null,dirty:false};

const I=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO={orders:I('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>'),cup:I('<path d="M5 8h14l-1.5 12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z"/><path d="M4 8h16M13 8l2-6"/>'),
 text:I('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),user:I('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6 8-6s7 1.5 8 6"/>'),
 wa:I('<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9.5 9c0 3 2.5 5.5 5.5 5.5"/>'),check:I('<path d="M5 12.5l4.5 4.5L19 7"/>'),cam:I('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>')};

/* ---------- talking to the server ---------- */
async function api(path,{method='GET',body,raw,type,keepalive}={}){
 const o={method,headers:{},keepalive:!!keepalive};
 if(raw){o.body=raw;o.headers['content-type']=type}else if(body!==undefined){o.body=JSON.stringify(body);o.headers['content-type']='application/json'}
 let r;try{r=await fetch('/api/'+path,o)}catch(e){throw Object.assign(new Error('net'),{code:'net'})}
 let j={};try{j=await r.json()}catch(e){}
 if(r.status===401&&!['login','setup','password'].includes(path)){A.me={setup:false};showLogin();throw Object.assign(new Error('auth'),{code:'auth'})}
 if(!r.ok)throw Object.assign(new Error(j.error||'http'),{code:j.error||'http'});
 return j}
const errMsg=e=>({net:'ما فيه اتصال بالإنترنت. جرّب مرة ثانية.',server:'صار خطأ عندنا. جرّب بعد شوي.',size:'الصورة كبيرة مرّة. جرّب صورة ثانية.',auth:'انتهى الدخول. سجّل دخول مرة ثانية.'})[e.code]||'ما قدرنا نحفظ. جرّب مرة ثانية.';
function toast(msg,bad){$$('.atoast').forEach(e=>e.remove());const e=document.createElement('div');e.className='atoast'+(bad?' bad':'');e.setAttribute('role','status');e.textContent=msg;document.body.appendChild(e);setTimeout(()=>e.remove(),2800)}
function ask({title,body,ok='تأكيد',cancel='إلغاء',danger}){return new Promise(res=>{const m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div class="mbox" role="dialog" aria-modal="true" aria-labelledby="mt"><h2 id="mt">${esc(title)}</h2>${body?`<p>${esc(body)}</p>`:''}<div class="mrow"><button class="btn" data-r="0">${esc(cancel)}</button><button class="btn ${danger?'danger':'p'}" data-r="1">${esc(ok)}</button></div></div>`;
 const done=v=>{m.remove();removeEventListener('keydown',kd);res(v)};const kd=e=>{if(e.key==='Escape')done(false)};addEventListener('keydown',kd);
 m.addEventListener('click',e=>{if(e.target===m)return done(false);const b=e.target.closest('[data-r]');if(b)done(b.dataset.r==='1')});document.body.appendChild(m);m.querySelector('[data-r="1"]').focus()})}

/* ---------- login ---------- */
function showLogin(){stopPoll();const setup=!!(A.me&&A.me.setup);
 root.innerHTML=`<div class="login"><form class="lbox" id="lf" novalidate>${M.catSVG(setup?'happy':'hi')}<h1>${setup?'أهلاً! أنشئ حساب المدير':'إدارة ماتشا موتشي'}</h1><p>${setup?'اختر اسم مستخدم وكلمة مرور. بتحتاجها كل مرة تدخل، فاحفظها في مكان آمن.':'اكتب اسم المستخدم وكلمة المرور'}</p>
<label class="fld">اسم المستخدم<input name="user" autocomplete="username" autocapitalize="off" spellcheck="false" dir="auto"></label>
<label class="fld">كلمة المرور<input name="pass" type="password" autocomplete="${setup?'new-password':'current-password'}" dir="ltr"></label>
${setup?'<label class="fld">اكتب كلمة المرور مرة ثانية<input name="pass2" type="password" autocomplete="new-password" dir="ltr"></label>':''}
<p class="lerr" id="lerr" role="alert"></p><button class="btn p" type="submit">${setup?'إنشاء الحساب والدخول':'دخول'}</button></form></div>`;
 const f=$('#lf');f.user.focus();
 f.addEventListener('submit',async e=>{e.preventDefault();const u=f.user.value.trim(),p=f.pass.value,er=$('#lerr');
  if(u.length<3){er.textContent='اسم المستخدم لازم يكون 3 أحرف أو أكثر';f.user.focus();return}
  if(p.length<6){er.textContent='كلمة المرور لازم تكون 6 أحرف أو أكثر';f.pass.focus();return}
  if(setup&&p!==f.pass2.value){er.textContent='كلمتا المرور مو متطابقتين';f.pass2.focus();return}
  const b=f.querySelector('button[type=submit]');b.disabled=true;er.textContent='';
  try{await api(setup?'setup':'login',{method:'POST',body:{user:u,pass:p}});A.me=await api('me');await start()}
  catch(x){b.disabled=false;
   if(x.code==='exists'){er.textContent='فيه حساب مدير من قبل. سجّل دخول.';A.me.setup=false;setTimeout(showLogin,1600);return}
   er.textContent=x.code==='login'?'اسم المستخدم أو كلمة المرور غلط':errMsg(x)}})}

/* ---------- shell + pages ---------- */
const NAV=[['orders','الطلبات',ICO.orders],['drinks','المشروبات',ICO.cup],['texts','نصوص الموقع',ICO.text],['account','الحساب',ICO.user]];
const navLinks=()=>NAV.map(([k,n,ic])=>`<a href="#${k}" data-nav="${k}">${ic}<span>${n}</span>${k==='orders'?'<span class="bd" data-bd></span>':''}</a>`).join('');
function shell(){root.innerHTML=`<header class="ah"><div class="ah-in"><a class="logo" href="#orders">${M.LOGO}<b>${esc(M.rawL('brand',1))}</b></a><nav class="nav" aria-label="أقسام الإدارة">${navLinks()}</nav><a class="shopl" href="/" target="_blank" rel="noopener">افتح المتجر ↗</a></div></header><main class="page" id="page"></main><nav class="nav bnav" aria-label="أقسام الإدارة">${navLinks()}</nav>`}
const page=()=>$('#page');
function route(){const h=location.hash.slice(1);A.page=NAV.some(n=>n[0]===h)?h:'orders';
 $$('[data-nav]').forEach(a=>{const on=a.dataset.nav===A.page;a.classList.toggle('on',on);on?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current')});
 if(A.page!=='texts')leaveEditor();
 ({orders:renderOrders,drinks:renderDrinks,texts:renderTexts,account:renderAccount})[A.page]();scrollTo(0,0)}
addEventListener('hashchange',()=>{if(A.me&&A.me.admin)route()});
async function start(){const j=await api('shop');A.menu=j.menu;A.texts=j.texts||{};M.setTexts(A.texts);M.setMenu(A.menu);shell();route();loadOrders(true);startPoll()}

/* ================= orders ================= */
let pollT=0;
function startPoll(){stopPoll();pollT=setInterval(()=>{if(!document.hidden)loadOrders(true)},15000)}
function stopPoll(){clearInterval(pollT)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&A.me&&A.me.admin)loadOrders(true)});
function ding(){try{const c=new (window.AudioContext||window.webkitAudioContext)();[880,1320].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;o.connect(g);g.connect(c.destination);const t0=c.currentTime+i*.18;g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(.25,t0+.02);g.gain.exponentialRampToValueAtTime(.0001,t0+.3);o.start(t0);o.stop(t0+.32)})}catch(e){}}
async function loadOrders(quiet){try{const j=await api('orders');const before=JSON.stringify(A.orders);const prev=A.seen;A.orders=j.orders;A.seen=new Set(A.orders.map(o=>o.id));
  const fresh=prev?A.orders.filter(o=>!prev.has(o.id)):[];
  if(fresh.length){fresh.forEach(o=>A.fresh.add(o.id));ding();toast(fresh.length===1?'وصل طلب جديد ♡':`وصلت ${fresh.length} طلبات جديدة ♡`)}
  badge();if(A.page==='orders'&&before!==JSON.stringify(A.orders))renderOrders()}
 catch(e){if(!quiet&&e.code!=='auth')toast(errMsg(e),true);if(A.page==='orders'&&!A.orders)renderOrders()}}
function badge(){const n=(A.orders||[]).filter(o=>o.status==='new').length;$$('[data-bd]').forEach(b=>b.textContent=n||'');document.title=(n?`(${n}) `:'')+'إدارة ماتشا موتشي'}
/* WhatsApp wants the number with its country code; Saudi numbers like 05x… become 9665x… */
const waNum=p=>{let d=String(p||'').replace(/\D/g,'');if(d.startsWith('00'))d=d.slice(2);if(d.length===10&&d.startsWith('05'))d='966'+d.slice(1);else if(d.length===9&&d.startsWith('5'))d='966'+d;return d.length>=10?d:''};
const waURL=(o,k)=>{const n=waNum(o.phone);return n?`https://wa.me/${n}?text=${encodeURIComponent(M.waText(k,o))}`:''};
const tf=new Intl.DateTimeFormat('ar-u-nu-latn',{hour:'numeric',minute:'2-digit'}),df=new Intl.DateTimeFormat('ar-u-nu-latn',{weekday:'long',day:'numeric',month:'long'});
function when(iso){const d=new Date(iso),now=new Date(),y=new Date();y.setDate(now.getDate()-1);const same=(a,b)=>a.toDateString()===b.toDateString();return (same(d,now)?'اليوم':same(d,y)?'أمس':df.format(d))+' · '+tf.format(d)}
const an=x=>x?(x.ar||x.name):'';
function orderCard(o){const done=o.status==='done',wo=waURL(o,'waOrder'),wr=waURL(o,'waReady');
 return `<article class="ocard ${done?'done':''} ${A.fresh.has(o.id)?'fresh':''}" aria-label="طلب ${esc(o.no)}">
 <div class="oh"><span class="ono">#MM-${esc(o.no)}</span><span class="otime">${when(o.createdAt)}</span><span class="ost ${done?'d':''}">${done?'تم ✓':'جديد'}</span></div>
 <div class="ocust"><span class="nm">${esc(o.name)}</span><a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>
 <span class="omode ${o.mode==='delivery'?'dl':''}">${o.mode==='delivery'?'توصيل: '+esc(o.addr):'استلام من المحل'}</span></div>
 <ul class="oitems">${o.items.map(it=>`<li><img src="${it.img||M.drinkArt({id:it.drink,color:it.color,under:it.under||''},0)}" alt=""><div><b><span class="q">×${it.qty}</span>${esc(an(it))}</b><span class="sz">${esc(an(it.size))}${it.milk?' · '+esc(an(it.milk)):''}</span>${it.addons&&it.addons.length?`<span class="ads">${it.addons.map(a=>`<span>${esc(an(a))}${a.q>1?' ×'+a.q:''}</span>`).join('')}</span>`:''}</div><span class="lp">${money(it.line)}</span></li>`).join('')}</ul>
 ${o.notes?`<div class="onote"><small>ملاحظات العميل</small>${esc(o.notes)}</div>`:''}
 <div class="ofoot"><span class="otot">المجموع <b>${money(o.total)}</b></span><button class="pay ${o.paid?'y':''}" data-a="paid" data-id="${o.id}">${o.paid?'مدفوع ✓':'لم يُدفع بعد'}<small>${o.paid?'اضغط إذا ما دفع':'اضغط إذا دفع'}</small></button><span class="ometh">طريقة الدفع: ${o.method==='card'?'بطاقة / مدى':'كاش'}، عند الاستلام</span></div>
 <div class="oact">${wo?`<a class="btn wa" href="${wo}" target="_blank" rel="noopener">${ICO.wa}واتساب</a>`:'<span class="btn wa" aria-disabled="true">رقم غير صالح</span>'}
 ${done?`<span class="btn g" aria-disabled="true">${ICO.check}تم التجهيز</span><button class="lnk mut oundo" data-a="undo" data-id="${o.id}">إرجاعه لطلب جديد</button>`:wr?`<a class="btn g" href="${wr}" target="_blank" rel="noopener" data-a="done" data-id="${o.id}">${ICO.check}تم التجهيز</a>`:`<button class="btn g" data-a="done" data-id="${o.id}">${ICO.check}تم التجهيز</button>`}</div></article>`}
function renderOrders(){const p=page();if(!p)return;
 if(!A.orders){p.innerHTML='<div class="tload">جاري تحميل الطلبات… ♡</div>';return}
 const n=A.orders.filter(o=>o.status==='new').length,list=A.orders.filter(o=>A.filter==='all'||o.status===A.filter);
 p.innerHTML=`<div class="ph1"><h1>الطلبات</h1><div class="seg2" role="group" aria-label="عرض">${[['all','الكل'],['new',`جديدة (${n})`],['done','منجزة']].map(([k,l])=>`<button class="${A.filter===k?'on':''}" aria-pressed="${A.filter===k}" data-a="filter" data-v="${k}">${l}</button>`).join('')}</div><p>الأحدث فوق. الصفحة تتحدّث لحالها، وتسمع صوت لما يوصل طلب جديد.</p></div>
 ${list.length?`<div class="olist">${list.slice(0,A.olimit).map(orderCard).join('')}</div>${list.length>A.olimit?'<div class="more"><button class="btn" data-a="omore">عرض طلبات أقدم</button></div>':''}`
 :`<div class="empty">${M.catSVG('hi')}${A.filter==='new'?'ما فيه طلبات جديدة الحين':A.filter==='done'?'ما فيه طلبات منجزة بعد':'ما وصلت طلبات بعد. أول ما يطلب أحد بيظهر هنا ♡'}</div>`}`}
async function setOrder(id,patch){const o=A.orders.find(x=>x.id===id);if(!o)return;const old={status:o.status,paid:o.paid};Object.assign(o,patch);A.fresh.delete(id);badge();renderOrders();
 try{const j=await api('orders/'+id,{method:'POST',body:patch,keepalive:true});Object.assign(o,j.order)}
 catch(e){Object.assign(o,old);badge();renderOrders();if(e.code!=='auth')toast(errMsg(e),true)}}

document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||!$('#page')?.contains(b))return;const a=b.dataset.a,id=b.dataset.id;
 if(a==='filter'){A.filter=b.dataset.v;renderOrders()}
 if(a==='omore'){A.olimit+=30;renderOrders()}
 if(a==='paid'){const o=A.orders.find(x=>x.id===id);if(o)setOrder(id,{paid:!o.paid})}
 /* "done" is a link to WhatsApp: the browser opens the chat, we save the new status alongside */
 if(a==='done')setOrder(id,{status:'done'});
 if(a==='undo')setOrder(id,{status:'new'});
 if(a==='logout')logout()});

/* ================= drinks & menu ================= */
const imgOf=d=>d.img||M.drinkArt(d,A.menu.drinks.indexOf(d)<0?0:A.menu.drinks.indexOf(d));
const KIND=[['syrup','طبقة صوص'],['pearls','لآلئ / جيلي'],['foam','رغوة'],['topping','رشّات']];
function renderDrinks(){const p=page(),tab=A.dtab;
 p.innerHTML=`<div class="ph1"><h1>المشروبات والقائمة</h1><div class="seg2" role="group" aria-label="القسم">${[['drinks','المشروبات'],['addons','الإضافات'],['milks','الحليب'],['sizes','الأحجام']].map(([k,l])=>`<button class="${tab===k?'on':''}" aria-pressed="${tab===k}" data-d="tab" data-v="${k}">${l}</button>`).join('')}</div><p>${tab==='drinks'?'اضغط على أي مشروب عشان تعدّله، أو أضف مشروب جديد.':'عدّل اللي تبي، وبعدين اضغط «حفظ التغييرات».'}</p></div><div id="dpane"></div>`;
 tab==='drinks'?drinksPane():listPane(tab)}
function drinkSummary(d){const sz=A.menu.sizes.filter(s=>d.sizes.includes(s.id)).map(s=>esc(s.ar||s.name)).join('، ');
 const ads=d.addonMode!=='some'?'كل الإضافات':!d.addons.length?'بدون إضافات':(()=>{const n=d.addons.map(id=>A.menu.addons.find(a=>a.id===id)).filter(Boolean).map(a=>esc(a.ar||a.name));return 'إضافات محددة: '+n.slice(0,3).join('، ')+(n.length>3?` و${n.length-3} غيرها`:'')})();
 return `الأحجام: ${sz}<br>${ads}`}
function drinksPane(){$('#dpane').innerHTML=`<div class="dgrid">${A.menu.drinks.map((d,i)=>`<button class="dcard" data-d="open" data-v="${d.id}"><img src="${imgOf(d)}" alt=""><span><h3>${esc(d.ar||d.name)}</h3><span class="en">${esc(d.name)}</span><span class="pr">${money(d.price)}</span><span class="sm" style="display:block">${drinkSummary(d)}</span><span class="ed">تعديل</span></span></button>`).join('')}<button class="dnew" data-d="open" data-v="">+ مشروب جديد</button></div>`}

/* --- one drink, in a sheet --- */
function openDrink(id){const src=A.menu.drinks.find(d=>d.id===id),isNew=!src;
 const d=src?clone(src):{id:'d'+Date.now().toString(36),name:'',ar:'',desc:'',descAr:'',price:20,color:'#9ccf5e',img:'',sizes:A.menu.sizes.map(s=>s.id),addonMode:'all',addons:[]};
 const start=JSON.stringify(d);let busy=false;
 const sh=document.createElement('div');sh.className='sheet';document.body.appendChild(sh);document.body.style.overflow='hidden';
 const close=async force=>{if(!force&&JSON.stringify(d)!==start&&!(await ask({title:'تطلع بدون حفظ؟',body:'التعديلات على هذا المشروب بتضيع.',ok:'اطلع بدون حفظ',cancel:'ارجع',danger:true})))return;sh.remove();document.body.style.overflow='';removeEventListener('keydown',kd)};
 const kd=e=>{if(e.key==='Escape'&&!$('.modal'))close()};addEventListener('keydown',kd);
 const draw=()=>{sh.innerHTML=`<div class="sbox" role="dialog" aria-modal="true" aria-labelledby="sh"><div class="shd"><h2 id="sh">${isNew?'مشروب جديد':'تعديل: '+esc(d.ar||d.name)}</h2><button class="btn" data-s="close" aria-label="إغلاق">✕</button></div>
<div class="sbd">
<section class="sec"><h3><i>1</i>الصورة</h3><p class="hint">تظهر للعملاء في المنيو وفي السلة.</p><div class="phrow"><img id="dimg" src="${d.img||M.drinkArt(d,0)}" alt="صورة المشروب"><div class="pc"><label class="btn">${ICO.cam}<span>${d.img?'تغيير الصورة':'اختر صورة'}</span><input type="file" accept="image/*" id="dfile" class="hide"></label>${d.img?'<button class="lnk mut" data-s="noimg">شيل الصورة واستخدم الرسمة</button>':'<span class="hint" style="margin:0">بدون صورة، يظهر كوب مرسوم بلون المشروب</span>'}<span class="hint" id="dup" style="margin:0"></span></div></div></section>
<section class="sec"><h3><i>2</i>الاسم والسعر</h3><div class="g2" style="margin-top:8px">
 <label class="fld">الاسم بالعربي<input data-f="ar" value="${esc(d.ar)}" dir="rtl" maxlength="60"></label>
 <label class="fld">الاسم بالإنجليزي<input data-f="name" value="${esc(d.name)}" dir="ltr" maxlength="60"></label>
 <label class="fld">وصف قصير بالعربي<input data-f="descAr" value="${esc(d.descAr)}" dir="rtl" maxlength="160"></label>
 <label class="fld">وصف قصير بالإنجليزي<input data-f="desc" value="${esc(d.desc)}" dir="ltr" maxlength="160"></label>
 <label class="fld">السعر الأساسي (ر.س)<input data-f="price" type="number" min="0" step="0.5" inputmode="decimal" value="${d.price}" dir="ltr"></label>
 <label class="fld">لون المشروب<span class="colr"><input type="color" data-f="color" value="${d.color}"><span class="hint" style="margin:0">لون الكوب المرسوم</span></span></label>
</div><p class="lerr" id="dnerr"></p></section>
<section class="sec"><h3><i>3</i>الأحجام المتوفرة</h3><p class="hint">العميل يشوف بس الأحجام اللي عليها صح.</p><div class="sizes">${A.menu.sizes.map((s,i)=>`<label class="tog"><input type="checkbox" data-size="${s.id}" ${d.sizes.includes(s.id)?'checked':''}><span class="tk">✓</span><span class="mini-cup" style="width:${14+i*4}px;height:${16+i*6}px"></span>${esc(s.ar||s.name)}<small>${s.add?'+'+money(s.add):'بدون زيادة'}</small></label>`).join('')}</div><p class="lerr" id="dserr"></p></section>
<section class="sec"><h3><i>4</i>الإضافات</h3><p class="hint">وش الإضافات اللي يقدر العميل يحطها في هذا المشروب؟</p><div class="rad"><label><input type="radio" name="am" value="all" ${d.addonMode!=='some'?'checked':''}><span>كل الإضافات مسموحة<small>وأي إضافة جديدة تضيفها بعدين</small></span></label><label><input type="radio" name="am" value="some" ${d.addonMode==='some'?'checked':''}><span>إضافات محددة فقط<small>تختارها من القائمة</small></span></label></div>
<div id="alw" class="${d.addonMode==='some'?'':'hide'}"><div class="arow2"><button type="button" class="lnk" data-s="all">تحديد الكل</button><button type="button" class="lnk mut" data-s="none">إلغاء الكل</button></div><div class="alist">${A.menu.addons.map(a=>`<label><input type="checkbox" data-ad="${a.id}" ${d.addons.includes(a.id)?'checked':''}>${M.icon(a,40)}<span>${esc(a.ar||a.name)}<small>+${money(a.price)}</small></span></label>`).join('')}</div><p class="hint" id="anone" style="margin-top:8px">${d.addons.length?'':'ما اخترت ولا إضافة، فالعميل ما بيشوف المضخات لهذا المشروب.'}</p></div></section>
</div>
<div class="sft"><button class="btn p" data-s="save">حفظ المشروب</button><button class="btn" data-s="close">إلغاء</button>${isNew?'':'<button class="lnk red" data-s="del">حذف المشروب</button>'}</div></div>`};
 draw();
 sh.addEventListener('input',e=>{const t=e.target;
  if(t.dataset.f){d[t.dataset.f]=t.dataset.f==='price'?Math.max(0,parseFloat(t.value)||0):t.value;if(t.dataset.f==='color'&&!d.img)$('#dimg',sh).src=M.drinkArt(d,0)}
  if(t.dataset.size){d.sizes=A.menu.sizes.map(s=>s.id).filter(id=>$(`[data-size="${id}"]`,sh).checked);$('#dserr',sh).textContent=d.sizes.length?'':'لازم تختار حجم واحد على الأقل'}
  if(t.name==='am'){d.addonMode=t.value;$('#alw',sh).classList.toggle('hide',t.value!=='some')}
  if(t.dataset.ad){d.addons=$$('[data-ad]',sh).filter(x=>x.checked).map(x=>x.dataset.ad);$('#anone',sh).textContent=d.addons.length?'':'ما اخترت ولا إضافة، فالعميل ما بيشوف المضخات لهذا المشروب.'}});
 sh.addEventListener('change',async e=>{const t=e.target;if(t.id!=='dfile'||!t.files[0])return;const up=$('#dup',sh);up.textContent='جاري رفع الصورة…';busy=true;
  try{const blob=await shrink(t.files[0]);const j=await api('images',{method:'POST',raw:blob,type:'image/jpeg'});d.img=j.url;draw()}
  catch(x){up.textContent=x.code==='img'?'ما قدرنا نقرأ هالملف كصورة':errMsg(x)}finally{busy=false}});
 sh.addEventListener('click',async e=>{if(e.target===sh)return close();const b=e.target.closest('[data-s]');if(!b)return;const s=b.dataset.s;
  if(s==='close')close();
  if(s==='noimg'){d.img='';draw()}
  if(s==='all'||s==='none'){$$('[data-ad]',sh).forEach(x=>x.checked=s==='all');d.addons=s==='all'?A.menu.addons.map(a=>a.id):[];$('#anone',sh).textContent=d.addons.length?'':'ما اخترت ولا إضافة، فالعميل ما بيشوف المضخات لهذا المشروب.'}
  if(s==='del'){if(A.menu.drinks.length<=1){toast('لازم يبقى مشروب واحد على الأقل',true);return}
   if(!(await ask({title:'حذف '+(d.ar||d.name)+'؟',body:'المشروب بيختفي من المنيو. الطلبات القديمة تبقى زي ما هي.',ok:'احذف',danger:true})))return;
   const m=clone(A.menu);m.drinks=m.drinks.filter(x=>x.id!==d.id);if(await saveMenu(m,'تم حذف المشروب'))close(true)}
  if(s==='save'){if(busy){toast('انتظر لين يخلص رفع الصورة');return}
   if(!d.ar.trim()&&!d.name.trim()){$('#dnerr',sh).textContent='اكتب اسم المشروب';$('[data-f=ar]',sh).focus();return}
   if(!d.sizes.length){$('#dserr',sh).textContent='لازم تختار حجم واحد على الأقل';return}
   if(!d.name.trim())d.name=d.ar;if(!d.ar.trim())d.ar=d.name;
   const m=clone(A.menu),i=m.drinks.findIndex(x=>x.id===d.id);if(i<0)m.drinks.push(d);else m.drinks[i]=d;
   b.disabled=true;if(await saveMenu(m,isNew?'تمت إضافة المشروب ✓ وصار يظهر للعملاء':'تم الحفظ ✓ والعملاء يشوفون التغيير الحين'))close(true);else b.disabled=false}});
 setTimeout(()=>$('[data-f=ar]',sh)?.focus({preventScroll:true}),50)}
/* photos are cropped to the menu card shape and kept small */
function shrink(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=()=>rej({code:'img'});fr.onload=()=>{const im=new Image();im.onerror=()=>rej({code:'img'});im.onload=()=>{const W=600,H=720,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);const s=Math.max(W/im.width,H/im.height),w=im.width*s,h=im.height*s;x.drawImage(im,(W-w)/2,(H-h)/2,w,h);c.toBlob(b=>b?res(b):rej({code:'img'}),'image/jpeg',.85)};im.src=fr.result};fr.readAsDataURL(file)})}
async function saveMenu(m,ok){try{const j=await api('menu',{method:'PUT',body:m});A.menu=j.menu;M.setMenu(A.menu);if(A.page==='drinks'&&A.dtab==='drinks')drinksPane();toast(ok);return true}catch(e){if(e.code!=='auth')toast(errMsg(e),true);return false}}

/* --- add-ons, milks and sizes: edit in place, then one save --- */
function listPane(kind){const W=A.work||(A.work=clone(A.menu)),rows=W[kind];
 const pv=(x,i)=>kind==='addons'?M.icon(x,60):kind==='milks'?`<span class="sw" style="background:${x.color||'repeating-linear-gradient(45deg,#fff 0 6px,#eee 6px 12px)'}"></span>`:`<span class="mini-cup" style="width:${18+i*6}px;height:${22+i*8}px;margin:8px auto 0;color:var(--leaf)"></span>`;
 const f=(i,k,label,type='text',extra='')=>`<label class="fld">${label}<input data-w="${kind}:${i}:${k}" type="${type}" value="${esc(type==='color'?(rows[i][k]||'#ffffff'):rows[i][k])}" ${extra}></label>`;
 $('#dpane').innerHTML=`<div class="rows">${rows.map((x,i)=>`<div class="irow"><span class="pv" id="pv-${i}">${pv(x,i)}</span><div><div class="g2">
 ${f(i,'ar','الاسم بالعربي','text','dir="rtl" maxlength="60"')}${f(i,'name','الاسم بالإنجليزي','text','dir="ltr" maxlength="60"')}
 ${kind==='addons'?f(i,'price','السعر (ر.س)','number','min="0" step="0.5" inputmode="decimal" dir="ltr"'):f(i,'add',kind==='sizes'?'زيادة على السعر (ر.س)':'زيادة على السعر (ر.س)','number','min="0" step="0.5" inputmode="decimal" dir="ltr"')}
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
 if(a==='rm'){const k=A.dtab;if(A.work[k].length<=1&&k==='milks'){toast('خلّ نوع حليب واحد على الأقل',true);return}A.work[k].splice(+v,1);markDirty();listPane(k)}
 if(a==='addrow'){const k=A.dtab,id='x'+Date.now().toString(36);A.work[k].push(k==='addons'?{id,name:'New treat',ar:'إضافة جديدة',price:3,color:'#c9b3ff',kind:'topping'}:{id,name:'New milk',ar:'حليب جديد',add:2,color:'#f5ecd9'});markDirty();listPane(k);const r=$$('.irow').pop();r?.scrollIntoView({block:'center'});r?.querySelector('input')?.select()}
 if(a==='undo'){A.work=null;A.dirty=false;listPane(A.dtab)}
 if(a==='savework'){b.disabled=true;const m=clone(A.menu);for(const k of ['addons','milks','sizes'])m[k]=A.work[k];
  if(await saveMenu(m,'تم الحفظ ✓')){A.work=null;A.dirty=false;listPane(A.dtab)}else b.disabled=false}});
addEventListener('beforeunload',e=>{if(A.dirty){e.preventDefault();e.returnValue=''}});

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
<div class="tstage" id="stage"><div class="pvw" id="pvw"><iframe id="pvf" title="معاينة الموقع كما يشوفه العميل" src="/?edit=1" tabindex="-1"></iframe></div><div id="slices"></div><svg class="arr" id="arr" aria-hidden="true"></svg><div id="tcs"></div></div>
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
<section class="sec"><h3>دخلت باسم «${esc(A.me.user||'')}»</h3><p class="hint">احفظ رابط هذي الصفحة عشان ترجع لها: <b dir="ltr">${esc(location.origin)}/admin</b></p><button class="btn" data-a="logout">تسجيل الخروج</button></section>
<form class="sec" id="pwf" novalidate><h3>تغيير كلمة المرور</h3><p class="hint">بعد التغيير، أي جهاز ثاني داخل بالحساب يطلع ويحتاج يدخل من جديد.</p>
<label class="fld">كلمة المرور الحالية<input name="cur" type="password" autocomplete="current-password" dir="ltr"></label>
<label class="fld">كلمة المرور الجديدة<input name="nw" type="password" autocomplete="new-password" dir="ltr"></label>
<label class="fld">اكتب الجديدة مرة ثانية<input name="nw2" type="password" autocomplete="new-password" dir="ltr"></label>
<label class="fld">اسم مستخدم جديد (اختياري)<input name="user" autocomplete="username" placeholder="${esc(A.me.user||'')}" dir="auto"></label>
<p class="lerr" id="pwerr" role="alert"></p><button class="btn p" type="submit">حفظ كلمة المرور</button></form></div>`;
 const f=$('#pwf');f.addEventListener('submit',async e=>{e.preventDefault();const er=$('#pwerr');er.textContent='';
  if(f.nw.value.length<6){er.textContent='كلمة المرور الجديدة لازم تكون 6 أحرف أو أكثر';return}if(f.nw.value!==f.nw2.value){er.textContent='كلمتا المرور الجديدة مو متطابقتين';return}
  const u=f.user.value.trim();if(u&&u.length<3){er.textContent='اسم المستخدم لازم يكون 3 أحرف أو أكثر';return}
  try{await api('password',{method:'POST',body:{current:f.cur.value,next:f.nw.value,user:u||undefined}});A.me=await api('me');toast('تم تغيير كلمة المرور ✓');renderAccount()}
  catch(x){er.textContent=x.code==='login'?'كلمة المرور الحالية غلط':errMsg(x)}})}
async function logout(){if(!(await ask({title:'تسجيل الخروج؟',ok:'خروج'})))return;try{await api('logout',{method:'POST'})}catch(e){}A.me={setup:false,admin:false};A.orders=null;A.seen=null;showLogin()}

/* ================= go ================= */
(async()=>{try{A.me=await api('me');if(A.me.admin)await start();else showLogin()}catch(e){root.innerHTML=`<div class="login"><div class="lbox">${M.catSVG('hi')}<h1>ما قدرنا نفتح الإدارة</h1><p>${esc(errMsg(e))}</p><button class="btn p" onclick="location.reload()">حاول مرة ثانية</button></div></div>`}})();
}
