/* Matcha Mochi — the customer shop.
   /<store> (store.html) runs it as that store's shop; /<store>?edit=1 runs it as the still preview inside the admin
   text editor; /<store>/admin (admin.html) loads it with window.MM_LIB set, only to borrow the texts and drawings. */
{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const L='#3a3631',MAXQ=3;
const rand=a=>a[Math.floor(Math.random()*a.length)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const LIB=!!window.MM_LIB;
/* which store this is: the first part of the link (/matcha-mochi, /matcha-mochi/admin). The admin page at a bare
   /admin has none. Every call to the server and everything saved in the browser belongs to this store only. */
const SLUG=(()=>{const p=location.pathname.split('/').filter(Boolean);if(LIB&&p.length<2)return '';try{return decodeURIComponent(p[0]||'').normalize('NFKC').toLowerCase()}catch(e){return ''}})();
const API='/api/'+encodeURIComponent(SLUG)+'/';
const lsK=k=>SLUG+':'+k;
const lsGet=(k,d)=>{try{const v=localStorage.getItem(lsK(k));return v===null?d:JSON.parse(v)}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(lsK(k),JSON.stringify(v))}catch(e){}};
const lsDel=k=>{try{localStorage.removeItem(lsK(k))}catch(e){}};
const EDIT=!LIB&&new URLSearchParams(location.search).has('edit');
const clone=o=>JSON.parse(JSON.stringify(o));

/* ================= every customer-facing text: [English, Arabic] =================
   Words in {curly brackets} are filled in by the shop (a name, a price…). The admin text editor can change any of these. */
let LANG=lsGet('mm-lang','ar')==='en'?'en':'ar';
const TX={
 brand:['{shop}','{shop}'],t1:['{shopA}','{shopA}'],t2:['{shopB}','{shopB}'],
 tick1:[' ✿ Freshly whisked every day ♡ Strawberry season is here ♡ 100% real matcha ♡ Not too sweet ♡ Made with love',' ✿ نخفقه طازج كل يوم ♡ موسم الفراولة وصل ♡ ماتشا أصلي 100% ♡ مو حالي مرّة ♡ مسوّى بحب'],
 tick2:[' ♡ いちご抹茶 ♡ A love story in every sip ♡ Rolled with love',' ♡ いちご抹茶 ♡ قصة حب في كل رشفة ♡ ملفوف بحب'],
 stampJp:['抹茶','抹茶'],pct:['100%','100%'],real:['real matcha','ماتشا أصلي'],seasonJp:['季節 限定','季節 限定'],
 say:['come have a sip! ♡','تعال ذوق! ♡'],oval:['not too sweet ♡','مو حالي مرّة ♡'],
 lead:['Spin the menu, pump your flavours, and watch your smiley cup come to life.','لفّ المنيو، اضغط نكهاتك، وشوف كوبك المبتسم يصحى قدامك.'],
 start:['Start my order ♡','ابدأ طلبي ♡'],
 todays:["today's",'اليوم'],peekH:['Menu peek','لمحة من المنيو'],easy:['easy peasy','سهلة مرّة'],howH:['How it works','كيف تطلب'],
 h1b:['Spin the menu','لفّ المنيو'],h1p:['Swipe the cards and tap the drink you love.','اسحب البطاقات واضغط على المشروب اللي تحبه.'],
 h2b:['Pump the machine','اضغط المضخة'],h2p:['Each pump pours a flavour into your cup.','كل ضغطة تصب نكهة في كوبك.'],
 h3b:['Tap to order','اضغط واطلب'],h3p:['Add as many drinks as you like, then send your order and Mochi says thank you.','أضف كم مشروب تبي، أرسل طلبك، وموتشي يقولك شكراً.'],
 note:['Psst… this shop is full of secrets. Tap things. And keep an eye out for Mochi the cat, he loves to repaint things ♡','بسّ… هالمحل مليان أسرار. اضغط على الأشياء. وانتبه لموتشي القطو، يحب يلوّن الأشياء ♡'],
 foot:['Made with love · {shop} ♡','مسوّى بحب · {shop} ♡'],
 pick:['Pick','اختر'],make:['Make','حضّر'],cartS:['Cart','السلة'],payS:['Order','اطلب'],
 swipe:['swipe me~','اسحبني~'],pickH:['Pick your drink','اختر مشروبك'],
 newT:['季節限定 new','季節限定 جديد'],fav:['♡ favourite','♡ مفضّل'],
 startsAt:['Starts at','يبدأ من'],thisOne:['This one! ♡','هذا هو! ♡'],yourTotal:['Your total','مجموعك'],cur:['SAR {n}','{n} ر.س'],
 poof:['Poof! Hi, I’m your {drink} ♡','بوف! هلا، أنا {drink} حقّك ♡'],into:['Into the machine ✦','يلا على المكينة ✦'],
 machJp:['抹茶マシン','抹茶マシン'],tip:['Press a pump to pour a flavour ♡ up to {max} each','اضغط المضخة عشان تصب نكهة ♡ لين {max} من كل وحدة'],
 pump:['Pump','ضخ'],noTags:['Press a pump to add a flavour','اضغط مضخة عشان تضيف نكهة'],
 size:['Size','الحجم'],milk:['Milk','الحليب'],free:['free','مجاناً'],
 addToCart:['Add to cart ♡','أضف للسلة ♡'],saveItem:['Update my drink ♡','حدّث مشروبي ♡'],
 cartSub:['almost there~','قرّبنا~'],cartH:['Your cart','سلتك'],cartEmpty:['Your cart is empty, let’s fill it with matcha ♡','سلتك فاضية، خلنا نعبيها ماتشا ♡'],browse:['See the menu ♡','شوف المنيو ♡'],
 addAnother:['+ Add another drink','+ أضف مشروب ثاني'],edit:['Change','تعديل'],remove:['Remove','حذف'],goCheckout:['Checkout ♡','إتمام الطلب ♡'],
 receipt:['RECEIPT ♡','الفاتورة ♡'],total:['Total','المجموع'],paid:['ORDERED ♡','تم الطلب ♡'],
 thx:['Thank you sooo much, {name}!! ♡ I’m making your drinks right meow~','شكراً مرّة يا {name}!! ♡ قاعد أسوي مشروباتك الحين، مياو~'],
 friend:['friend','صديقي'],thanksH:['Thank you!','شكراً!'],yourOrder:['Your order','طلبك'],
 etaWill:['⏱ Will take around 30m to be ready','⏱ بياخذ حوالي 30 دقيقة ويجهز'],etaReady:['Ready around {from} to {to}','جاهز تقريباً من {from} إلى {to}'],
 stampCard:['Your stamp card','بطاقة الأختام'],cardFull:['Card full! Your next drink is on Mochi ♡','البطاقة كملت! مشروبك الجاي على حساب موتشي ♡'],
 more:['{count} more stamps for a free drink','باقي {count} أختام وتاخذ مشروب مجاني'],again:['Order another ♡','اطلب مرة ثانية ♡'],
 almost:['Almost yours! Tell me where to send it ♡','قرّب يصير لك! قولي وين أرسله ♡'],
 howWant:['How do you want it?','كيف تبيه؟'],pickup:['Pickup','استلام'],delivery:['Delivery','توصيل'],
 name:['Your name','الاسم'],namePh:['Sara','سارة'],phone:['Phone','الجوال'],phonePh:['05x xxx xxxx','05x xxx xxxx'],
 addr:['Delivery address','عنوان التوصيل'],addrPh:['Street, building, district','الشارع، المبنى، الحي'],
 pickNote:['Pick up at the {shop} counter. We’ll text you when it’s ready ♡','استلم من كاونتر {shop}. بنرسل لك رسالة لما يجهز ♡'],
 notes:['Notes for us (optional)','ملاحظات لنا (اختياري)'],notesPh:['Less ice, extra hot, a birthday message…','ثلج خفيف، حار زيادة، رسالة عيد ميلاد…'],
 payWith:['How will you pay?','كيف بتدفع؟'],cash:['Cash','كاش'],card:['Card / mada','بطاقة / مدى'],
 payNote:['You pay when you receive your order ♡','تدفع لما تستلم طلبك ♡'],
 placeBtn:['Send my order · {total} ♡','أرسل طلبي · {total} ♡'],placing:['Sending… ♡','جاري الإرسال… ♡'],
 holdNote:['Tap or hold the button to send your order.','اضغط الزر أو اضغط عليه مطوّل عشان ترسل طلبك.'],
 eName:['Please add your name ♡','اكتب اسمك لو سمحت ♡'],ePhone:['Please add a phone number so we can text you','اكتب رقم جوالك عشان نرسل لك'],eAddr:['Where should we deliver it?','وين نوصّله؟'],
 eMenu:['The menu just changed, please check your cart again ♡','المنيو تغيّر الحين، راجع سلتك مرة ثانية ♡'],eServer:['We couldn’t send your order. Check your internet and try again.','ما قدرنا نرسل طلبك. تأكد من الإنترنت وجرّب مرة ثانية.'],
 missing:['Hmm, one tiny thing is missing~','امم، ناقص شي صغير~'],nearly:['Ooh, almost there!! ♡','أوه، قرّبنا!! ♡'],
 catPaint1:['new colour!','لون جديد!'],catPaint2:['paint time~','وقت التلوين~'],catPaint3:['prettier now, nya','صار أحلى، مياو'],
 catPeek1:['psst… catch me!','بسّ… امسكني!'],catPeek2:['nya?','مياو؟'],catPeek3:['peekaboo ♡','بيكابو ♡'],
 catGot1:['you got me! ♡','مسكتني! ♡'],catGot2:['nyaaa!','ميااااو!'],catGot3:['ok ok, you win~','طيب طيب، فزت~'],
 pawLeft:['left a paw on your cup ♡','تركت بصمة على كوبك ♡'],
 caught:['Times you caught Mochi','كم مرة مسكت موتشي'],catTap:['Mochi the cat is here! Tap to catch him','موتشي القطو هنا! اضغط عشان تمسكه'],
 back:['Back','رجوع'],prev:['Previous drink','المشروب السابق'],next:['Next drink','المشروب التالي'],home:['{shop} home','الرئيسية'],
 cartLabel:['Open my cart','افتح السلة'],langBtn:['ع','EN'],langLabel:['التبديل للعربية','Switch to English'],
 waOrder:['Hi {name} ♡ This is {shop} about your order {order}:\n{items}\nTotal: {total}','هلا {name} ♡ معك {shop} بخصوص طلبك {order}:\n{items}\nالمجموع: {total}'],
 waReady:['Hi {name}! Your order is ready! ♡ ({order})','هلا {name}! طلبك جاهز! ♡ ({order})'],
 waWay:['Hi {name}! Your order is on the way! ♡ ({order})','هلا {name}! طلبك في الطريق! ♡ ({order})'],
 waFee:['Delivery fee: {fee}','رسوم التوصيل: {fee}'],
 subtotal:['Drinks','المشروبات'],feeL:['Delivery fee','رسوم التوصيل'],feeNote:['Delivery fee: {fee}, added to your total','رسوم التوصيل: {fee}، تنضاف على مجموعك'],
 transfer:['Bank transfer','تحويل بنكي'],applepay:['Apple Pay','Apple Pay'],transferNote:['Please transfer the total to:','حوّل المبلغ على:'],
 whereH:['Pick up from here ♡','استلم طلبك من هنا ♡'],openG:['Google Maps','قوقل ماب'],openA:['Apple Maps','خرائط أبل'],
 outside:['I’m outside 🚗','أنا برا المحل 🚗'],outsideHint:['When you arrive, tap the button and we’ll bring your order out to you ♡','لما توصل اضغط الزر ونطلع لك طلبك ♡'],
 notified:['Store notified ✓','وصل الخبر للمحل ✓'],outsideErr:['We couldn’t reach the store. Try again.','ما قدرنا نوصل للمحل. جرّب مرة ثانية.'],
 myOrder:['Your order {order}','طلبك {order}'],seeOrder:['See my order','شوف طلبي'],
 eSettings:['The shop just updated its options, please check your order again ♡','المحل غيّر الخيارات الحين، راجع طلبك مرة ثانية ♡'],
 cpAsk:['Have a discount code?','عندك كود خصم؟'],cpPh:['Type the code','اكتب الكود'],cpApply:['Apply','طبّق'],cpChecking:['Checking…','جاري التحقق…'],
 cpOn:['Code {code} applied ♡','تم تطبيق الكود {code} ♡'],cpSave:['You save {amount}','وفّرت {amount}'],cpRemove:['Remove','شيل الكود'],
 discL:['Discount ({code})','خصم ({code})'],waDisc:['Discount ({code}): {amount}','خصم ({code}): {amount}'],
 cpNone:['We couldn’t find this code. Check how it’s written ♡','ما لقينا هذا الكود. تأكد من كتابته ♡'],cpEnded:['Sorry, this code has ended','للأسف هذا الكود انتهى'],
 cpUsed:['Sorry, this code has been used up','للأسف هذا الكود خلص'],cpOnce:['You already used this code before','استخدمت هذا الكود من قبل'],
 cpMin:['This code works when your drinks add up to {n} or more','هذا الكود يشتغل لما تكون مشروباتك بـ {n} أو أكثر'],
 cpGone:['Your discount code was removed and your total changed. Please check it and send again.','انشال كود الخصم وتغيّر المجموع. راجعه وأرسل مرة ثانية.']};

/* what each {word} means, for the admin text editor */
const TOKENS={shop:'اسم المحل',shopA:'أول جزء من اسم المحل',shopB:'باقي اسم المحل',n:'المبلغ',drink:'اسم المشروب',max:'أكثر عدد',name:'اسم العميل',from:'من الساعة',to:'إلى الساعة',count:'عدد الأختام الباقية',total:'المجموع',order:'رقم الطلب',items:'قائمة المشروبات',fee:'رسوم التوصيل',code:'كود الخصم',amount:'مبلغ الخصم'};

let OV={};/* the admin's published text changes: {key:[english, arabic]} */
const ix=()=>LANG==='ar'?1:0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* the store's own name and logo, set by the owner in the admin; empty = the template's default */
let BRAND={name:'',ar:'',logo:''};
const DEF_NAME=['Matcha Mochi','ماتشا موتشي'];
const bName=i=>(i?BRAND.ar||BRAND.name:BRAND.name||BRAND.ar)||DEF_NAME[i?1:0];
/* the big two-line title on the home page: the name split in two halves */
const halves=s=>{const w=String(s).trim().split(/\s+/),k=Math.ceil(w.length/2);return [w.slice(0,k).join(' '),w.slice(k).join(' ')]};
const brandFill=(s,i)=>String(s).replace(/\{(shop|shopA|shopB)\}/g,(m,n)=>n==='shop'?bName(i):halves(bName(i))[n==='shopA'?0:1]);
/* order numbers start with the store's initials: Matcha Mochi -> #MM-1234 */
const code=()=>((BRAND.name||(BRAND.ar?'':DEF_NAME[0])).match(/[A-Za-z0-9]+/g)||[]).slice(0,3).map(w=>w[0].toUpperCase()).join('');
const orderNo=no=>'#'+(code()?code()+'-':'')+no;
const rawL=(k,i)=>{const o=OV[k];if(o&&typeof o[i]==='string')return brandFill(o[i],i);const v=TX[k];return v?brandFill(v[i],i):k};
const fill=(s,vars,wrap)=>s.replace(/\{(\w+)\}/g,(m,n)=>vars&&n in vars?wrap(vars[n]):m);
/* t: safe HTML; tp: plain text */
const t=(k,vars,bold)=>fill(esc(rawL(k,ix())),vars,v=>bold?`<b>${esc(v)}</b>`:String(v));
const tp=(k,vars)=>fill(rawL(k,ix()),vars,v=>String(v));
/* in the editor preview every text says which one it is, so arrows can point at it */
const X=k=>EDIT?` data-tx="${k}"`:'';
const XP=k=>EDIT?` data-txph="${k}"`:'';
const nm=x=>(LANG==='ar'&&x&&x.ar)?x.ar:(x?x.name:'');
const dsc=x=>(LANG==='ar'&&x&&x.descAr)?x.descAr:(x?x.desc:'');
const ICON0=document.querySelector('link[rel=icon]')?.href||'';
function applyLang(){const h=document.documentElement;h.lang=LANG;h.dir=LANG==='ar'?'rtl':'ltr';if(!LIB)document.title=tp('brand')}
function setBrand(b){BRAND={name:String(b?.name||''),ar:String(b?.ar||''),logo:String(b?.logo||'')};const l=document.querySelector('link[rel=icon]');if(l)l.href=BRAND.logo||ICON0;if(!LIB)applyLang()}
if(!LIB)applyLang();

/* ================= how the store takes orders (set by the owner in the admin) ================= */
const PAYS=['cash','card','transfer','applepay'];
let SET={pickup:true,delivery:true,fee:0,pay:['cash','card'],transfer:'',loc:null,logoSize:1};
const modesOn=()=>{const m=['pickup','delivery'].filter(k=>SET[k]);return m.length?m:['pickup']};
const paysOn=()=>{const p=PAYS.filter(k=>(SET.pay||[]).includes(k));return p.length?p:['cash']};
/* the logo is drawn at the size the owner picked, everywhere it shows */
const setLogoSize=n=>{n=Math.min(1.6,Math.max(.7,+n||1));document.documentElement.style.setProperty('--lgs',String(n))};
function setSettings(s){SET=Object.assign({pickup:true,delivery:true,fee:0,pay:['cash','card'],transfer:'',loc:null,logoSize:1},s||{});setLogoSize(SET.logoSize)}
/* the store's pin: a little map and buttons that open the phone's maps app */
const mapLinks=l=>({g:`https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`,a:`https://maps.apple.com/?ll=${l.lat},${l.lng}&q=${encodeURIComponent(bName(LANG==='ar'?1:0))}`});
/* a still map: the few map squares around the pin, drawn right on the page */
const mapEmbed=(l,z=16)=>{const n=2**z,x=(l.lng+180)/360*n,r=l.lat*Math.PI/180,y=(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n,tx=Math.floor(x),ty=Math.floor(y),fx=(x-tx)*256,fy=(y-ty)*256;let h='';
 for(let dy=-1;dy<=1;dy++)for(let dx=-2;dx<=2;dx++)h+=`<img src="https://tile.openstreetmap.org/${z}/${tx+dx}/${ty+dy}.png" style="left:${Math.round(dx*256-fx)}px;top:${Math.round(dy*256-fy)}px" alt="" loading="lazy" draggable="false">`;
 return `<span class="tiles" dir="ltr">${h}</span><span class="tpin" aria-hidden="true">📍</span><span class="tattr" dir="ltr">© OpenStreetMap</span>`};

/* ================= menu (comes from the server) ================= */
let STORE={drinks:[],sizes:[],milks:[],addons:[]};
const D=id=>STORE.drinks.find(d=>d.id===id);
const A=id=>STORE.addons.find(a=>a.id===id);
const SZ=id=>STORE.sizes.find(s=>s.id===id)||STORE.sizes[0];
const MK=id=>STORE.milks.find(m=>m.id===id)||null;
const dSizes=d=>STORE.sizes.filter(s=>!d||!Array.isArray(d.sizes)||d.sizes.includes(s.id));
const dAddons=d=>STORE.addons.filter(a=>!d||d.addonMode!=='some'||(d.addons||[]).includes(a.id));
const numStr=n=>{n=+n||0;return n%1?n.toFixed(2):String(n)};
const moneyL=(n,i)=>fill(rawL('cur',i),{n:numStr(n)},String);
const money=n=>esc(moneyL(n,ix()));
const lum=h=>{h=String(h||'#fff').replace('#','');if(h.length===3)h=[...h].map(c=>c+c).join('');const v=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]};
const onC=h=>lum(h)>.35?'#33402a':'#fff';
const clock=d=>{let h=d.getHours(),m=d.getMinutes(),pm=h>=12;h=h%12||12;const mm=String(m).padStart(2,'0');return LANG==='ar'?`${h}:${mm} ${pm?'م':'ص'}`:`${h}:${mm}${pm?'pm':'am'}`};
const readyWin=()=>{const a=new Date(Date.now()+30*60000);a.setSeconds(0,0);a.setMinutes(Math.ceil(a.getMinutes()/5)*5);return [a.getTime(),a.getTime()+30*60000]};
function newOrder(drink){const d=D(drink),ss=dSizes(d);return {drink:drink||null,size:(ss.find(s=>s.id==='m')||ss[0]||{}).id,milk:STORE.milks[0]?.id||null,ad:{},qty:1}}
const savedPay=lsGet('mm-pay',{});
const S={step:'land',o:newOrder(null),cf:0,cart:EDIT?[]:lsGet('mm-cart',[]),edit:null,
 pay:{mode:savedPay.mode==='delivery'?'delivery':'pickup',method:PAYS.includes(savedPay.method)?savedPay.method:'cash',name:savedPay.name||'',phone:savedPay.phone||'',addr:savedPay.addr||'',notes:''},
 paid:false,last:null,sending:false,caught:lsGet('mm-caught',0),paw:lsGet('mm-paw',false),stamps:lsGet('mm-stamps',0),
 /* the discount code the customer applied (kept with the cart), whether the code box is open, and the store has any codes at all */
 coupon:EDIT?null:lsGet('mm-coupon',null),cpOpen:false,cpBusy:false,hasCp:false};
const qty=id=>S.o.ad[id]||0;
const chosen=(o=S.o)=>Object.entries(o.ad||{}).map(([k,q])=>[A(k),q]).filter(([a,q])=>a&&q>0);
function total(o=S.o){const d=D(o.drink);if(!d)return 0;let t=+d.price+ +(SZ(o.size)?.add||0)+ +(MK(o.milk)?.add||0);for(const[a,q]of chosen(o))t+=a.price*q;return t}
const cartCount=()=>S.cart.reduce((s,c)=>s+c.qty,0);
const cartTotal=(c=S.cart)=>c.reduce((s,i)=>s+total(i)*i.qty,0);
const saveCart=()=>{if(!EDIT)lsSet('mm-cart',S.cart)};
/* keep the cart honest when the admin changes the menu */
function fixCart(){S.cart=(Array.isArray(S.cart)?S.cart:[]).filter(c=>c&&D(c.drink)).map(c=>{const d=D(c.drink),ss=dSizes(d).map(s=>s.id),al=dAddons(d).map(a=>a.id),ad={};
 for(const[k,q]of Object.entries(c.ad||{}))if(al.includes(k)&&q>0)ad[k]=Math.min(MAXQ,q|0);
 return {drink:c.drink,size:ss.includes(c.size)?c.size:newOrder(c.drink).size,milk:MK(c.milk)?c.milk:(STORE.milks[0]?.id||null),ad,qty:Math.max(1,Math.min(20,c.qty|0||1))}});saveCart()}
/* the order as the server and WhatsApp messages describe it */
const snap=cart=>cart.map(c=>{const d=D(c.drink),s=SZ(c.size),m=MK(c.milk);return {drink:d.id,name:d.name,ar:d.ar,img:d.img,color:d.color,under:d.under||'',size:{name:s.name,ar:s.ar},milk:m?{name:m.name,ar:m.ar}:null,addons:chosen(c).map(([a,q])=>({name:a.name,ar:a.ar,q,price:a.price})),qty:c.qty,unit:total(c),line:total(c)*c.qty}});
/* delivery orders get their fee as its own line under the drinks */
function waItems(o,i){const n=x=>(i&&x.ar)?x.ar:x.name;const l=o.items.map(it=>{const p=[n(it.size)];if(it.milk)p.push(n(it.milk));(it.addons||[]).forEach(a=>p.push(n(a)+(a.q>1?' ×'+a.q:'')));return `• ${it.qty}× ${n(it)} (${p.join(i?'، ':', ')})`});
 if(+o.discount>0)l.push('• '+fill(rawL('waDisc',i),{code:cpCode(o),amount:moneyL(o.discount,i)},String));
 if(+o.fee>0)l.push('• '+fill(rawL('waFee',i),{fee:moneyL(o.fee,i)},String));return l.join('\n')}
/* an order's discount code: the server keeps {code,…}, the shop keeps just the code */
const cpCode=o=>typeof o.coupon==='string'?o.coupon:(o.coupon&&o.coupon.code)||'';
/* the same sum the server does: a % or an amount off the drinks, never more than the drinks */
const discOf=(c,sub)=>{if(!c||(+c.min&&sub<+c.min))return 0;const d=c.kind==='amt'?+c.value:sub*(+c.value)/100;return Math.round(Math.min(sub,d)*100)/100};
function waText(k,o){const i=o.lang==='en'?0:1;return fill(rawL(k,i),{name:o.name,order:orderNo(o.no),items:waItems(o,i),total:moneyL(o.total,i),fee:moneyL(o.fee||0,i)},String)}

/* ================= drawings ================= */
let uid=0;
const face=(x,y,s=1)=>`<g class="fc"><g class="ey"><circle cx="${x-18*s}" cy="${y}" r="${5.5*s}" fill="${L}"/><circle cx="${x+18*s}" cy="${y}" r="${5.5*s}" fill="${L}"/><circle cx="${x-16*s}" cy="${y-2*s}" r="${1.9*s}" fill="#fff"/><circle cx="${x+20*s}" cy="${y-2*s}" r="${1.9*s}" fill="#fff"/></g><ellipse cx="${x-31*s}" cy="${y+12*s}" rx="${9*s}" ry="${5*s}" fill="#ff8fab" opacity=".8"/><ellipse cx="${x+31*s}" cy="${y+12*s}" rx="${9*s}" ry="${5*s}" fill="#ff8fab" opacity=".8"/><path d="M${x-6*s} ${y+9*s}q${6*s} ${6*s} ${12*s} 0" fill="none" stroke="${L}" stroke-width="${3.5*s}" stroke-linecap="round"/></g>`;
const pawPath=(x,y,s,c)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="6" rx="9" ry="7.5" fill="${c}"/><circle cx="-9" cy="-5" r="4" fill="${c}"/><circle cx="-3" cy="-10" r="4" fill="${c}"/><circle cx="4" cy="-10" r="4" fill="${c}"/><circle cx="10" cy="-5" r="4" fill="${c}"/></g>`;
function cupSVG(o=S.o){
 const u='k'+(uid++),d=D(o.drink),m=MK(o.milk),ads=chosen(o);
 const lvl=92,sc={s:.74,m:.87,l:1}[o.size]??.87;
 const foam=ads.filter(([a])=>a.kind==='foam'),foamH=foam.length?22:0;
 const bands=[];
 ads.filter(([a])=>a.kind==='syrup').forEach(([a,q])=>bands.push([a.color,9*q]));
 if(d&&d.under)bands.push([d.under,26]);
 if(d&&m&&m.color)bands.push([m.color,44]);
 const bottom=256,avail=bottom-lvl-foamH,sum=bands.reduce((s,b)=>s+b[1],0),k=sum>avail*.72?avail*.72/sum:1;
 let y=bottom,r='';
 if(d){
  for(const[c,h]of bands){const hh=h*k;y-=hh;r+=`<rect x="0" y="${y}" width="200" height="${hh+.6}" fill="${c}"/>`}
  const tt=lvl+foamH;r+=`<rect x="0" y="${tt}" width="200" height="${Math.max(0,y-tt)+.6}" fill="${d.color}"/>`;
  r+=`<rect x="60" y="${tt+14}" width="26" height="24" rx="6" fill="#fff" opacity=".35" transform="rotate(-14 73 ${tt+26})"/><rect x="108" y="${tt+22}" width="24" height="22" rx="6" fill="#fff" opacity=".3" transform="rotate(10 120 ${tt+33})"/>`;
  if(foamH)r+=`<path d="M0 ${lvl+foamH+2}V${lvl+6}${' q12.5 -9 25 0'.repeat(8)}V${lvl+foamH+2}z" fill="${foam[0][0].color}"/>`;
  let pi=0;ads.filter(([a])=>a.kind==='pearls').forEach(([a,q])=>{for(let i=0;i<q*6;i++){const row=Math.floor(pi/8),col=pi%8,cx=58+col*12+(row%2)*6,cy=bottom-8-row*10;r+=`<circle cx="${cx}" cy="${cy}" r="6" fill="${a.color}" stroke="#0002"/><circle cx="${cx-2}" cy="${cy-2}" r="1.8" fill="#fff" opacity=".6"/>`;pi++}});
  let ti=0;ads.filter(([a])=>a.kind==='topping').forEach(([a,q])=>{for(let i=0;i<q*5;i++){const x=48+((ti*37)%100),yy=lvl+1+((ti*13)%9);r+=`<rect x="${x}" y="${yy}" width="10" height="10" rx="3.5" fill="${a.color}" stroke="#0003" transform="rotate(${(ti*23)%60-30} ${x+5} ${yy+5})"/>`;ti++}});
 }
 const cup='M28 62H172L154 248Q152 258 142 258H58Q48 258 46 248Z';
 return `<svg viewBox="0 0 200 272" class="cup" role="img" aria-label="${d?esc(nm(d)):''}"><defs><clipPath id="${u}"><path d="${cup}"/></clipPath></defs>
<g transform="translate(100 268) scale(${sc}) translate(-100 -268)">
<ellipse cx="100" cy="264" rx="64" ry="7" fill="#0002"/>
<g transform="rotate(14 118 40)"><rect x="111" y="2" width="14" height="74" rx="6" fill="#fff" stroke="${L}" stroke-width="3.5"/><path d="M112 12l12-6M112 26l12-6M112 40l12-6M112 54l12-6" stroke="#ff8fab" stroke-width="5"/></g>
<path d="${cup}" fill="#ffffff8c"/><g clip-path="url(#${u})">${r}</g>
<path d="M44 80L56 236" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".55"/>
<path d="${cup}" fill="none" stroke="${L}" stroke-width="4.5" stroke-linejoin="round"/>
${face(100,188)}
${S.paw?pawPath(140,226,.9,'#ff4f86'):''}
<path d="M40 52Q100 16 160 52" fill="#ffffffb3" stroke="${L}" stroke-width="4"/>
<path d="M20 63Q21 50 34 50H166Q179 50 180 63Z" fill="#fff" stroke="${L}" stroke-width="4.5" stroke-linejoin="round"/>
<path d="M86 34q-8-12 2-16q8-2 12 8q4-10 12-8q10 4 2 16l-14 12z" fill="#ff8fb1" stroke="${L}" stroke-width="2.5" transform="translate(-40 6) scale(.6)"/></g></svg>`}

function icon(a,s=60){const c=a.color;let g='';
 const eyes=(x,y)=>`<circle cx="${x-5}" cy="${y}" r="2.4" fill="${L}"/><circle cx="${x+5}" cy="${y}" r="2.4" fill="${L}"/><path d="M${x-2.5} ${y+4}q2.5 2.5 5 0" stroke="${L}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
 if(a.kind==='syrup')g=`<rect x="24" y="5" width="12" height="11" rx="3" fill="#ff8fab" stroke="${L}" stroke-width="3"/><path d="M16 22Q16 15 24 15H36Q44 15 44 22V50Q44 55 39 55H21Q16 55 16 50Z" fill="#fffc"/><path d="M17.5 29H42.5V50Q42.5 53.5 39 53.5H21Q17.5 53.5 17.5 50Z" fill="${c}"/><path d="M16 22Q16 15 24 15H36Q44 15 44 22V50Q44 55 39 55H21Q16 55 16 50Z" fill="none" stroke="${L}" stroke-width="3"/>${eyes(30,40)}`;
 else if(a.kind==='pearls')g=`<path d="M8 34H52Q50 55 30 55Q10 55 8 34Z" fill="#fff" stroke="${L}" stroke-width="3"/>${[[21,30],[39,30],[30,19]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="10" fill="${c}" stroke="${L}" stroke-width="3"/><circle cx="${x-3}" cy="${y-3}" r="2.6" fill="#fff" opacity=".7"/>`).join('')}${eyes(30,44)}`;
 else if(a.kind==='foam')g=`<path d="M12 48A9 9 0 0 1 12 30A12 12 0 0 1 30 16A12 12 0 0 1 48 30A9 9 0 0 1 48 48Z" fill="${c}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>${eyes(30,36)}`;
 else g=`<path d="M8 36H52Q50 55 30 55Q10 55 8 36Z" fill="#fff" stroke="${L}" stroke-width="3"/>${[[18,28,-14],[31,22,10],[42,30,-6],[25,33,20]].map(([x,y,rt])=>`<rect x="${x-6}" y="${y-6}" width="12" height="12" rx="4" fill="${c}" stroke="${L}" stroke-width="2.5" transform="rotate(${rt} ${x} ${y})"/>`).join('')}${eyes(30,46)}`;
 return `<svg viewBox="0 0 60 60" width="${s}" height="${s}" aria-hidden="true">${g}</svg>`}

const strawSVG=(face=true)=>`<svg viewBox="0 0 60 64" aria-hidden="true"><path d="M30 16C12 15 6 28 11 41C15 52 25 60 30 60C35 60 45 52 49 41C54 28 48 15 30 16Z" fill="#ff6b8f" stroke="${L}" stroke-width="3"/>${[[20,28],[38,27],[29,24],[16,40],[44,39],[24,49],[36,49]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="1.6" ry="2.4" fill="#ffe9a8"/>`).join('')}<path d="M16 18L24 12L30 4L36 12L44 18L35 20L30 15L25 20Z" fill="#7cc04b" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/>${face?`<circle cx="24" cy="36" r="2.4" fill="${L}"/><circle cx="36" cy="36" r="2.4" fill="${L}"/><path d="M27.5 40q2.5 2.5 5 0" stroke="${L}" stroke-width="2" fill="none" stroke-linecap="round"/>`:''}</svg>`;
const starSVG=(c='#fff')=>`<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 4L37 21L55 22L41 34L46 52L30 42L14 52L19 34L5 22L23 21Z" fill="${c}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/></svg>`;
const heartSVG=(c='#ff8fb1')=>`<svg viewBox="0 0 60 56" aria-hidden="true"><path d="M30 52C10 38 4 28 6 18C8 8 20 4 30 15C40 4 52 8 54 18C56 28 50 38 30 52Z" fill="${c}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="17" cy="18" rx="4" ry="6" fill="#fff" opacity=".6" transform="rotate(30 17 18)"/></svg>`;
const rollSVG=()=>`<svg viewBox="0 0 70 70" aria-hidden="true"><circle cx="35" cy="35" r="30" fill="#9ccf5e" stroke="${L}" stroke-width="3"/><path d="M35 35m-4 0a4 4 0 1 1 8 0a9 9 0 1 1-17 0a14 14 0 1 1 27 0a19 19 0 1 1-37 0" fill="none" stroke="#fff4e8" stroke-width="5"/><circle cx="35" cy="35" r="5" fill="#ff8fab"/></svg>`;
const daifukuSVG=()=>`<svg viewBox="0 0 70 60" aria-hidden="true"><path d="M8 48C4 30 18 12 35 12C52 12 66 30 62 48C60 54 10 54 8 48Z" fill="#dff1c8" stroke="${L}" stroke-width="3"/><path d="M26 16C26 8 44 8 44 16" fill="#ff6b8f" stroke="${L}" stroke-width="3"/><circle cx="27" cy="34" r="2.5" fill="${L}"/><circle cx="43" cy="34" r="2.5" fill="${L}"/><ellipse cx="20" cy="40" rx="5" ry="3" fill="#ff8fab"/><ellipse cx="50" cy="40" rx="5" ry="3" fill="#ff8fab"/><path d="M32 38q3 3 6 0" stroke="${L}" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
const sparkSVG=(c='#fff')=>`<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2Q22 18 38 20Q22 22 20 38Q18 22 2 20Q18 18 20 2Z" fill="${c}" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
const pawSVG=(c='#ff8fb1')=>`<svg viewBox="-16 -18 32 32" aria-hidden="true">${pawPath(0,0,1,c)}</svg>`;
function catSVG(m='hi'){
 const eyes=m==='happy'?`<path d="M62 98q9-12 18 0M120 98q9-12 18 0" fill="none" stroke="${L}" stroke-width="5.5" stroke-linecap="round"/>`
 :m==='wink'?`<circle cx="71" cy="95" r="8" fill="${L}"/><circle cx="73.5" cy="92" r="2.6" fill="#fff"/><path d="M120 98q9-12 18 0" fill="none" stroke="${L}" stroke-width="5.5" stroke-linecap="round"/>`
 :`<circle cx="71" cy="95" r="8" fill="${L}"/><circle cx="129" cy="95" r="8" fill="${L}"/><circle cx="73.5" cy="92" r="2.6" fill="#fff"/><circle cx="131.5" cy="92" r="2.6" fill="#fff"/>`;
 return `<svg viewBox="0 0 200 182" class="cat" role="img" aria-label="Mochi"><path d="M42 80L50 18L92 48ZM158 80L150 18L108 48Z" fill="#fffaf5" stroke="${L}" stroke-width="5" stroke-linejoin="round"/><path d="M53 58L56 33L74 46ZM147 58L144 33L126 46Z" fill="#ffb3c4"/><ellipse cx="100" cy="104" rx="78" ry="60" fill="#fffaf5" stroke="${L}" stroke-width="5"/><path d="M88 49q12-24 32-11q-13 15-32 11z" fill="#8cc152" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/><path d="M124 46l10-8l4 12z" fill="#ff8fb1" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><path d="M144 54l10-12l-4 14z" fill="#ff8fb1" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>${eyes}<ellipse cx="52" cy="118" rx="13" ry="8" fill="#ff9fb4" opacity=".8"/><ellipse cx="148" cy="118" rx="13" ry="8" fill="#ff9fb4" opacity=".8"/><path d="M90 114q5 7 10 0q5 7 10 0" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round"/><path d="M28 106H6M28 117H8M172 106H194M172 117H192" stroke="${L}" stroke-width="3" stroke-linecap="round"/><ellipse cx="66" cy="166" rx="20" ry="13" fill="#fffaf5" stroke="${L}" stroke-width="5"/><ellipse cx="134" cy="166" rx="20" ry="13" fill="#fffaf5" stroke="${L}" stroke-width="5"/>${pawPath(66,166,.45,'#ffb3c4')}${pawPath(134,166,.45,'#ffb3c4')}</svg>`}
const LOGO=`<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M18 6q7-5 10 2q-7 3-10-2z" fill="#4a8420"/><circle cx="20" cy="22" r="16" fill="#8cc152" stroke="${L}" stroke-width="3"/><g class="ey"><circle cx="14" cy="22" r="2.4" fill="${L}"/><circle cx="26" cy="22" r="2.4" fill="${L}"/></g><path d="M17 27q3 3 6 0" stroke="${L}" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="10" cy="27" rx="3" ry="2" fill="#ff9fb4"/><ellipse cx="30" cy="27" rx="3" ry="2" fill="#ff9fb4"/></svg>`;
const logoHTML=(src=BRAND.logo)=>src?`<img class="blogo" src="${esc(src)}" alt="">`:LOGO;

/* default menu card art, used until the owner uploads a photo */
const artCache={};
function drinkArt(d,i){const key=[d.id,d.color,d.under,i%2].join();if(artCache[key])return artCache[key];
 const bg=i%2?['#e9f6d9','#cfe9b0']:['#ffe6ee','#ffc9da'],u=d.under;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360"><defs><pattern id="p" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="3.4" fill="${bg[1]}"/><circle cx="19" cy="19" r="3.4" fill="${bg[1]}"/></pattern><clipPath id="g"><path d="M86 96H214L200 318Q198 332 184 332H116Q102 332 100 318Z"/></clipPath></defs>
<rect width="300" height="360" fill="${bg[0]}"/><rect width="300" height="360" fill="url(#p)"/>
<circle cx="150" cy="210" r="122" fill="#fff" opacity=".75"/>
<g fill="none" stroke="#fff" stroke-width="10" opacity=".9"><path d="M0 40h300M0 320h300"/></g>
<rect x="125" y="14" width="18" height="120" rx="8" fill="#fff" stroke="${L}" stroke-width="4" transform="rotate(12 134 74)"/>
<g clip-path="url(#g)"><rect x="0" y="90" width="300" height="260" fill="#fff"/>
<path d="M0 ${u?268:300}q30-10 60 0t60 0t60 0t60 0t60 0V360H0Z" fill="${u||'#fdf6ea'}"/>
<path d="M0 ${u?230:250}q30-10 60 0t60 0t60 0t60 0t60 0V${u?272:304}H0Z" fill="#fdf6ea"/>
<path d="M0 122q30-8 60 0t60 0t60 0t60 0t60 0V${u?234:254}H0Z" fill="${d.color}"/>
<rect x="110" y="150" width="34" height="32" rx="8" fill="#fff" opacity=".45" transform="rotate(-12 127 166)"/><rect x="158" y="170" width="30" height="28" rx="8" fill="#fff" opacity=".4" transform="rotate(14 173 184)"/>
</g>
<path d="M86 96H214L200 318Q198 332 184 332H116Q102 332 100 318Z" fill="none" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>
<path d="M102 116L112 300" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".6"/>
<circle cx="132" cy="268" r="6" fill="${L}"/><circle cx="168" cy="268" r="6" fill="${L}"/><ellipse cx="118" cy="282" rx="10" ry="6" fill="#ff8fab"/><ellipse cx="182" cy="282" rx="10" ry="6" fill="#ff8fab"/><path d="M143 278q7 7 14 0" stroke="${L}" stroke-width="4" fill="none" stroke-linecap="round"/>
${u?`<g transform="translate(196 72) rotate(18)"><path d="M0 40A40 40 0 0 1 80 40Z" fill="${u}" stroke="${L}" stroke-width="4"/><path d="M8 40A32 32 0 0 1 72 40Z" fill="#fff" opacity=".5"/>${[16,30,44,58].map(x=>`<ellipse cx="${x+4}" cy="28" rx="2" ry="3" fill="#fff6c8"/>`).join('')}</g>`:`<path d="M196 86q24-40 60-20q-22 34-60 20z" fill="#7cc04b" stroke="${L}" stroke-width="4"/>`}
${[[40,70,1],[262,170,.8],[44,250,.7],[250,300,1]].map(([x,y,s])=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0-18Q2-2 18 0Q2 2 0 18Q-2 2-18 0Q-2-2 0-18Z" fill="#fff" stroke="${L}" stroke-width="3"/>`).join('')}
<path transform="translate(54 150)" d="M0 14C-10 6-12 0-10-5C-8-10-2-11 0-5C2-11 8-10 10-5C12 0 10 6 0 14Z" fill="#ff8fab" stroke="${L}" stroke-width="2.5"/></svg>`;
 return artCache[key]='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
const imgOf=(d,i=STORE.drinks.indexOf(d))=>d.img||drinkArt(d,i);

const BAG=`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 11h18l-2 16H9z" fill="#ffd3e0" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 11V9a4 4 0 0 1 8 0v2" fill="none" stroke="${L}" stroke-width="2.5" stroke-linecap="round"/><path d="M13 19q3 3 6 0" fill="none" stroke="${L}" stroke-width="2.2" stroke-linecap="round"/></svg>`;

/* the admin page borrows these */
window.MM={TX,TOKENS,esc,drinkArt,icon,cupSVG,catSVG,LOGO,logoHTML,pawSVG,waText,moneyL,numStr,orderNo,bName,halves,DEF_NAME,cpCode,
 SLUG,API,lsGet,lsSet,setTexts:o=>{OV=o||{}},setMenu:m=>{STORE=m},setBrand,getBrand:()=>BRAND,rawL,lum,onC,setSettings,setLogoSize,mapLinks,mapEmbed,PAYS};
if(LIB){/* library only */}else{

/* ================= shared bits ================= */
/* Arabic letters must stay joined, so Arabic words bounce as one piece */
const letters=w=>LANG==='ar'?`<span class="lt" data-act="boing">${w}</span>`:[...w].map(c=>`<span class="lt" data-act="boing">${esc(c)}</span>`).join('');
const pearls=c=>{let h='';for(let r=0;r<4;r++)for(let k=0;k<(r%2?2:3);k++)h+=`<i class="pearl" style="--c:${c};left:${(r%2?9:3)+k*12}px;bottom:${2+r*9.5}px"></i>`;return h};
const dots=q=>Array.from({length:MAXQ},(_,i)=>`<i class="${i<q?'on':''}"></i>`).join('');
const tagsHTML=()=>chosen().map(([a,q])=>`<span class="tg"><i class="sw" style="background:${a.color}"></i>${esc(nm(a))}${q>1?' ×'+q:''}</span>`).join('')||`<span class="small"${X('noTags')}>${t('noTags')}</span>`;
const milkChips=()=>STORE.milks.map(m=>`<button class="chip ${S.o.milk===m.id?'on':''}" aria-pressed="${S.o.milk===m.id}" data-act="milk" data-a="${m.id}"><span class="sw" style="background:${m.color||'transparent'}"></span>${esc(nm(m))}${m.add?` <small>+${money(m.add)}</small>`:''}</button>`).join('');
const sizeSeg=()=>{const ss=dSizes(D(S.o.drink)),all=STORE.sizes;return ss.map(s=>{const i=all.indexOf(s);return `<button class="${S.o.size===s.id?'on':''}" aria-pressed="${S.o.size===s.id}" data-act="size" data-a="${s.id}"><span class="mini-cup" style="width:${14+i*4}px;height:${16+i*6}px"></span>${esc(nm(s))}<small${s.add?'':X('free')}>${s.add?'+'+money(s.add):t('free')}</small></button>`}).join('')};
const LIVE={cup:()=>cupSVG(),total:()=>money(total()),tags:tagsHTML,milk:milkChips,size:sizeSeg};
const prog=()=>{const st=['drink','machine','cart','pay'],n=['pick','make','cartS','payS'],i=st.indexOf(S.step);return `<div class="prog">${n.map((k,j)=>`${j?'<i></i>':''}<span class="${j===i?'on':j<i?'done':''}"${X(k)}>${j<i?'✓ ':''}${t(k)}</span>`).join('')}</div>`};
const topbar=()=>`<header class="top">${S.step!=='land'&&!S.paid?`<button class="pill backb" data-act="back" aria-label="${t('back')}">${LANG==='ar'?'›':'‹'}</button>`:''}<button class="logo" data-act="logo" aria-label="${t('home')}">${logoHTML()}<b${X('brand')}>${t('brand')}</b></button><span class="pill paws" title="${t('caught')}" aria-label="${t('caught')}: ${S.caught}">${pawSVG()}<span id="caught">${S.caught}</span></span><button class="pill cartp" id="cartp" data-act="gocart" aria-label="${t('cartLabel')}">${BAG}<span class="n" id="cartn">${cartCount()||''}</span></button><button class="pill lang" data-act="lang" aria-label="${t('langLabel')}" lang="${LANG==='ar'?'en':'ar'}"${X('langBtn')}>${t('langBtn')}</button></header>`;
/* the last order this phone sent, kept so a pickup customer can still say "I'm outside" after closing the page */
const LASTK='mm-last',PENDK='mm-pending',OUT_COOL=45000;
const recentPickup=()=>{if(EDIT)return null;const L=lsGet(LASTK,null);return L&&L.mode==='pickup'&&L.id&&L.cid&&Date.now()-(+L.at||0)<3*3600e3?L:null};
const outCool=L=>!!(L&&L.outAt&&Date.now()-L.outAt<OUT_COOL);
const outBtn=L=>{const c=outCool(L);return `<button class="cta outb ${c?'sent':''}" data-act="outside" ${c?'disabled':''}${X(c?'notified':'outside')}>${c?t('notified'):t('outside')}</button>`};
const payFee=()=>S.pay.mode==='delivery'&&(EDIT||SET.delivery)?(+SET.fee||0):0;
const payDisc=()=>discOf(S.coupon,cartTotal());
const payTotal=()=>cartTotal()-payDisc()+payFee();
const saveCp=()=>{if(EDIT)return;if(S.coupon)lsSet('mm-coupon',S.coupon);else lsDel('mm-coupon')};
const CPMSG={none:'cpNone',off:'cpEnded',ended:'cpEnded',used:'cpUsed',once:'cpOnce',min:'cpMin'};
const cpMsg=(why,min)=>CPMSG[why]?tp(CPMSG[why],{n:moneyL(min||0,ix())}):tp('eServer');
/* the discount code box on the order page */
function cpBox(){const c=S.coupon,sub=cartTotal();
 if(c){const d=discOf(c,sub);return `<div class="cpon"><span class="cpi" aria-hidden="true">🎟️</span><span><b${X('cpOn')}>${t('cpOn',{code:c.code})}</b>${d>0?`<small${X('cpSave')}>${t('cpSave',{amount:moneyL(d,ix())},true)}</small>`:`<small class="cpwarn">${esc(cpMsg('min',c.min))}</small>`}</span><button type="button" class="lnk mut" data-act="cpoff"${X('cpRemove')}>${t('cpRemove')}</button></div>`}
 if(!S.hasCp&&!EDIT)return '';
 if(!S.cpOpen&&!EDIT)return `<button type="button" class="lnk cpask" data-act="cpopen"${X('cpAsk')}>🎟️ ${t('cpAsk')}</button>`;
 return `<div class="cpbox"><label><span${X('cpAsk')}>${t('cpAsk')}</span><span class="cprow"><input id="cpin" dir="ltr" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="30" enterkeyhint="go" placeholder="${t('cpPh')}"${XP('cpPh')}><button type="button" class="ghost" data-act="cpapply" id="cpgo"${X('cpApply')}>${t('cpApply')}</button></span></label><p class="err" id="cperr" role="alert"></p></div>`}
function locCard(){const l=SET.loc;if(!l)return '';const m=mapLinks(l);
 return `<div class="where"><h3${X('whereH')}>${t('whereH')}</h3><a class="wmap" href="${esc(m.g)}" target="_blank" rel="noopener" aria-label="${esc(tp('openG'))}">${mapEmbed(l)}</a>${l.note?`<p class="wnote">${esc(l.note)}</p>`:''}<div class="mapbtns"><a class="ghost" href="${esc(m.g)}" target="_blank" rel="noopener"${X('openG')}>📍 ${t('openG')}</a><a class="ghost" href="${esc(m.a)}" target="_blank" rel="noopener"${X('openA')}>🧭 ${t('openA')}</a></div></div>`}
/* bottom bar: k = label text key */
const bbar=({k,act,small,amount,live,flat})=>`<div class="bbar ${flat?'flat':''}"><div class="tot"><small${X(small)}>${t(small)}</small><b ${live?'data-live="total"':''} id="btot">${money(amount)}</b></div><button class="cta wig" data-act="${act}"${X(k)}>${t(k)}</button></div>`;
const fromPrice=d=>d?+d.price+Math.min(...dSizes(d).map(s=>+s.add||0)):0;

/* ================= views ================= */
function landView(){const ds=STORE.drinks,L=recentPickup();return `
${L?`<div class="lastbar"><div><b>${t('myOrder',{order:`<bdi dir="ltr">${esc(orderNo(L.no))}</bdi>`})}</b><button class="lnk" data-act="myorder">${t('seeOrder')}</button></div>${outBtn(L)}</div>`:''}
<div class="lace"></div>
<div class="ticker"><div${X('tick1')}>${t('tick1').repeat(4)}</div></div>
<section class="hero ging">
 <div class="tit"><div class="t1 bub-g" data-paint${X('t1')}>${letters(t('t1'))}</div>${t('t2').trim()?`<div class="t2 bub-p" data-paint${X('t2')}>${letters(t('t2'))}</div>`:''}<span class="stamp" data-act="spin" data-paint${X('stampJp')}>${t('stampJp')}</span></div>
 <div class="stage">
  <div class="bigcup" data-act="tickle">${cupSVG({drink:ds[0].id,size:'l',milk:STORE.milks.find(m=>m.id==='oat')?'oat':STORE.milks[0]?.id,ad:Object.fromEntries(dAddons(ds[0]).filter(a=>a.kind!=='syrup').slice(0,2).map((a,i)=>[a.id,i?1:2]))})}</div>
  <button class="badge b100" data-act="hundred" data-paint aria-label="${t('pct')} ${t('real')}"><span id="h100"${X('pct')}>${t('pct')}</span><small${X('real')}>${t('real')}</small></button>
  <span class="badge bseason" data-paint${X('seasonJp')}>${t('seasonJp').replace(' ','<br>')}</span>
  <span class="say" data-paint${X('say')}>${t('say')}</span>
  <span class="oval" data-paint${X('oval')}>${t('oval')}</span>
  <button class="stk" data-act="pop" style="left:6%;top:120px;width:54px;height:58px" aria-hidden="true" tabindex="-1">${strawSVG()}</button>
  <button class="stk" data-act="pop" style="right:16%;top:250px;width:48px;height:52px;transform:rotate(18deg)" aria-hidden="true" tabindex="-1">${strawSVG()}</button>
  <button class="stk" data-act="spin" style="left:14%;top:228px;width:62px;height:62px" aria-hidden="true" tabindex="-1">${rollSVG()}</button>
  <button class="stk" data-act="star" style="right:4%;top:14px;width:38px;height:38px" aria-hidden="true" tabindex="-1">${starSVG('#fff6b0')}</button>
  <button class="stk" data-act="pop" style="right:2%;top:96px;width:34px;height:32px" aria-hidden="true" tabindex="-1">${heartSVG()}</button>
  <span class="stk" style="left:30%;top:0;width:26px;height:26px">${sparkSVG()}</span>
  <span class="stk" style="left:66%;top:300px;width:22px;height:22px">${sparkSVG('#ffd3e0')}</span>
 </div>
 <p class="lead" data-paint${X('lead')}>${t('lead')}</p>
 <button class="cta wig" data-act="start" style="font-size:20px;padding:14px 34px"${X('start')}>${t('start')}</button>
</section>
<div class="ticker p"><div${X('tick2')}>${t('tick2').repeat(5)}</div></div>
<section class="band dots">
 <div class="sec-h"><span class="script"${X('todays')}>${t('todays')}</span><h2 class="bub-g" data-paint${X('peekH')}>${t('peekH')}</h2></div>
 <div class="pola">${ds.slice(0,3).map((d,i)=>`<button data-act="peekmenu" data-a="${i}" aria-label="${esc(nm(d))}"><img src="${imgOf(d,i)}" alt=""><span>${esc(nm(d))}</span></button>`).join('')}</div>
</section>
<section class="band ging">
 <div class="sec-h"><span class="script"${X('easy')}>${t('easy')}</span><h2 class="bub-p" data-paint${X('howH')}>${t('howH')}</h2></div>
 <div class="how">
  <div><svg viewBox="0 0 64 64"><rect x="6" y="14" width="22" height="30" rx="6" fill="#ffd3e0" stroke="${L}" stroke-width="3" transform="rotate(-12 17 29)"/><rect x="36" y="14" width="22" height="30" rx="6" fill="#dff1c8" stroke="${L}" stroke-width="3" transform="rotate(12 47 29)"/><rect x="20" y="10" width="24" height="34" rx="6" fill="#fff" stroke="${L}" stroke-width="3"/><path d="M14 54h36" stroke="${L}" stroke-width="3" stroke-linecap="round"/></svg><p><b${X('h1b')}>${t('h1b')}</b><span${X('h1p')}>${t('h1p')}</span></p></div>
  <div><svg viewBox="0 0 64 64"><rect x="8" y="6" width="48" height="40" rx="12" fill="#ffd3e0" stroke="${L}" stroke-width="3"/><rect x="16" y="14" width="10" height="16" rx="4" fill="#f47a8c" stroke="${L}" stroke-width="2.5"/><rect x="38" y="14" width="10" height="16" rx="4" fill="#8cc152" stroke="${L}" stroke-width="2.5"/><path d="M26 46h12v6H26z" fill="#8cc152" stroke="${L}" stroke-width="3"/></svg><p><b${X('h2b')}>${t('h2b')}</b><span${X('h2p')}>${t('h2p')}</span></p></div>
  <div><svg viewBox="0 0 64 64"><rect x="6" y="16" width="52" height="32" rx="16" fill="#ff4f86" stroke="${L}" stroke-width="3"/><path d="M32 42C22 35 20 30 21 26C22 22 28 21 32 26C36 21 42 22 43 26C44 30 42 35 32 42Z" fill="#fff"/></svg><p><b${X('h3b')}>${t('h3b')}</b><span${X('h3p')}>${t('h3p')}</span></p></div>
 </div>
</section>
<section class="band dots">
 <div class="secret">
  <svg class="dango" viewBox="0 0 90 120" aria-hidden="true"><path d="M45 20V116" stroke="#c9a46b" stroke-width="5" stroke-linecap="round"/><circle data-act="dango" cx="45" cy="26" r="20" fill="#ffb3c8" stroke="${L}" stroke-width="3"/><circle data-act="dango" cx="45" cy="62" r="20" fill="#fff" stroke="${L}" stroke-width="3"/><circle data-act="dango" cx="45" cy="98" r="20" fill="#9ccf5e" stroke="${L}" stroke-width="3"/></svg>
  <p class="note"${X('note')}>${t('note')}</p>
 </div>
</section>
<div class="lace"></div>
<footer${X('foot')}>${t('foot')}</footer>`}

function drinkView(){const ds=STORE.drinks;S.cf=Math.max(0,Math.min(ds.length-1,Math.round(S.cf)));return `${prog()}
<div class="mhead"><span class="script"${X('swipe')}>${t('swipe')}</span><h1 class="bub-g" data-paint${X('pickH')}>${t('pickH')}</h1></div>
<div class="cf" id="cf" dir="ltr"><button class="cf-arrow l" data-act="cfstep" data-a="-1" aria-label="${t('prev')}">‹</button>${ds.map((d,i)=>`<button class="cf-item" data-act="cfpick" data-a="${i}" aria-label="${esc(nm(d))}"><img src="${imgOf(d,i)}" alt="${esc(nm(d))}" draggable="false"></button>`).join('')}<button class="cf-arrow r" data-act="cfstep" data-a="1" aria-label="${t('next')}">›</button></div>
<div class="info" id="cfinfo" aria-live="polite">${cfInfo()}</div>
<div class="cfdots" id="cfdots" dir="ltr">${ds.map((d,i)=>`<i class="${i===S.cf?'on':''}"></i>`).join('')}</div>
${bbar({k:'thisOne',act:'choose',small:'startsAt',amount:fromPrice(ds[S.cf])})}`}
function cfInfo(){const i=Math.round(S.cf),d=STORE.drinks[i];if(!d)return '';const tg=i===0?'newT':'fav';return `<span class="tags2"${X(tg)}>${t(tg)}</span><h2 data-paint>${esc(nm(d))}</h2><p>${esc(dsc(d))}</p><span class="price"${X('cur')}>${money(fromPrice(d))}</span>`}

function machineView(){const d=D(S.o.drink),ads=dAddons(d),ss=dSizes(d);return `${prog()}
<section class="mach" data-paint>
 <div class="bulbs">${'<i></i>'.repeat(10)}</div>
 <div class="mscreen"><span class="meyes"><i></i><i></i></span><b>${esc(nm(d))}</b><span class="jp"${X('machJp')}>${t('machJp')}</span></div>
 ${ads.length?`<p class="tip"${X('tip')}>${t('tip',{max:MAXQ})}</p>
 <div class="tanks">${ads.map((a,i)=>`<div class="tank ${qty(a.id)?'on':''}" data-qwrap="${a.id}"><button class="minus" data-act="sub" data-a="${a.id}" aria-label="− ${esc(nm(a))}">−</button><div class="glass">${a.kind==='pearls'?pearls(a.color):`<div class="fill" style="background:${a.color}"></div><i class="bubl" style="left:${14+(i*11)%18}px;animation-delay:${(i*.4)%2}s"></i>`}</div><b>${esc(nm(a))}</b><span class="pr">+${money(a.price)}</span><span class="qd" data-dots="${a.id}">${dots(qty(a.id))}</span><button class="pump" data-act="add" data-a="${a.id}" style="--c:${a.color};color:${onC(a.color)}" aria-label="${t('pump')}: ${esc(nm(a))}"${i?'':X('pump')}>${t('pump')}</button></div>`).join('')}</div>`:''}
 <div class="pourz"><div class="nozzle"></div><i class="stream"></i><div class="cupspot"><div data-live="cup" data-act="tickle">${cupSVG()}</div><div class="grill"></div></div></div>
 ${ads.length?`<div class="mtags" data-live="tags">${tagsHTML()}</div>`:''}
</section>
<section class="levers"><h3${X('size')}>${t('size')}</h3><div class="seg" data-live="size" style="grid-template-columns:repeat(${Math.max(1,ss.length)},1fr)">${sizeSeg()}</div>${STORE.milks.length?`<h3${X('milk')}>${t('milk')}</h3><div class="hscroll" data-live="milk">${milkChips()}</div>`:''}</section>
${bbar({k:S.edit!=null?'saveItem':'addToCart',act:'addcart',small:'yourTotal',amount:total(),live:true,flat:true})}`}

const optsLine=c=>{const s=SZ(c.size),m=MK(c.milk),p=[esc(nm(s))];if(m)p.push(esc(nm(m)));chosen(c).forEach(([a,q])=>p.push(esc(nm(a))+(q>1?' ×'+q:'')));return p.join(' · ')};
function cartEmptyHTML(){return `<div class="cempty">${catSVG('hi')}<p${X('cartEmpty')}>${t('cartEmpty')}</p><button class="cta g" data-act="more"${X('browse')}>${t('browse')}</button></div>`}
function cartView(){const c=S.cart;return `${prog()}
<div class="mhead"><span class="script"${X('cartSub')}>${t('cartSub')}</span><h1 class="bub-p" data-paint${X('cartH')}>${t('cartH')}</h1></div>
${c.length?`<div class="cartl">${c.map((it,i)=>{const d=D(it.drink);return `<div class="citem"><div class="cimg"><img src="${imgOf(d)}" alt=""></div><div><h3>${esc(nm(d))}</h3><div class="opts">${optsLine(it)}</div>
<div class="crow"><span class="qty"><button data-act="qminus" data-a="${i}" aria-label="−">−</button><span>${it.qty}</span><button data-act="qplus" data-a="${i}" aria-label="+">+</button></span><span class="cprice">${money(total(it)*it.qty)}</span></div>
<div class="crow" style="margin-top:2px"><button class="lnk" data-act="edititem" data-a="${i}"${i?'':X('edit')}>${t('edit')}</button><button class="lnk mut" data-act="remove" data-a="${i}"${i?'':X('remove')}>${t('remove')}</button></div></div></div>`}).join('')}</div>
<div class="addmore"><button class="ghost" data-act="more"${X('addAnother')}>${t('addAnother')}</button></div>
${bbar({k:'goCheckout',act:'topay',small:'yourTotal',amount:cartTotal(),flat:true})}`:cartEmptyHTML()}`}

/* fee: the delivery fee, disc: the discount from a code; each shown as its own line above the total */
function receiptHTML(items,tot,stamped,fee=0,disc=0,code=''){items=items.filter(c=>D(c.drink));return `<div class="slot" data-l="${t('receipt')}"${X('receipt')}></div><div class="receipt" id="receipt"><h3${X('brand')}>${t('brand')}</h3><div class="rcs">${items.slice(0,4).map(c=>`<div class="rc">${cupSVG(c)}</div>`).join('')}</div><ul class="rl">${items.map(c=>`<li><span><span class="q">${c.qty}×</span> ${esc(nm(D(c.drink)))}<small>${optsLine(c)}</small></span><b>${money(total(c)*c.qty)}</b></li>`).join('')}</ul>${+fee>0||+disc>0?`<div class="rsub"><span${X('subtotal')}>${t('subtotal')}</span><span>${money(tot-fee+ +disc)}</span></div>`:''}${+disc>0?`<div class="rsub rdisc"><span${X('discL')}>${t('discL',{code})}</span><span>${money(disc)}</span></div>`:''}${+fee>0?`<div class="rsub"><span${X('feeL')}>${t('feeL')}</span><span>${money(fee)}</span></div>`:''}<div class="rtot"><span${X('total')}>${t('total')}</span><span>${money(tot)}</span></div>${stamped?`<div class="paid"${X('paid')}>${t('paid')}</div>`:''}</div>`}
function payView(){const P=S.pay,MODES=EDIT?['pickup','delivery']:modesOn(),METHODS=EDIT?PAYS:paysOn();
 if(S.paid&&S.last){const o=S.last,pick=(o.mode||'pickup')==='pickup';return `${receiptHTML(o.items,o.total,true,o.fee||0,o.discount||0,cpCode(o))}<div class="cheer"><div>${catSVG('happy')}</div><div class="bubble"${X('thx')}>${t('thx',{name:o.name||tp('friend')},true)}</div></div>
<div class="thanks"><h2 class="bub-p"${X('thanksH')}>${t('thanksH')}</h2><div class="ticket"><small${X('yourOrder')}>${t('yourOrder')}</small><b>${esc(orderNo(o.no))}</b><small${X('etaReady')}>${t('etaReady',{from:clock(new Date(S.ready[0])),to:clock(new Date(S.ready[1]))})}</small></div>
${pick&&(o.id||EDIT)?`<div class="outbox"><p${X('outsideHint')}>${t('outsideHint')}</p>${outBtn(o)}<p class="err" id="outerr" role="alert"></p></div>`:''}
<p style="font-weight:900;margin:8px 0 2px"${X('stampCard')}>${t('stampCard')}</p><div class="scard">${Array.from({length:8},(_,i)=>`<i class="${i<S.stamps?'st':''}">${i<S.stamps?pawSVG('#ff4f86'):''}</i>`).join('')}</div><p class="small"${X(S.stamps>=8?'cardFull':'more')}>${S.stamps>=8?t('cardFull'):t('more',{count:8-S.stamps})}</p><button class="cta g" data-act="again"${X('again')}>${t('again')}</button></div>${pick?locCard():''}${EDIT?`<span${X('friend')} class="small" style="display:block;text-align:center;margin-top:8px;opacity:.7">${t('friend')}</span>`:''}<div style="height:30px"></div>`}
 return `${prog()}${receiptHTML(S.cart,payTotal(),false,payFee(),payDisc(),S.coupon?.code||'')}
<div class="cheer"><div>${catSVG('hi')}</div><div class="bubble" id="catsay"${X('almost')}>${t('almost')}</div></div>
<form class="form" data-form="pay" novalidate><h2${X('howWant')}>${t('howWant')}</h2>
${MODES.length>1?`<div class="switch ${P.mode==='delivery'?'r':''}" role="group"><span class="knob"></span>${MODES.map(k=>`<button type="button" class="${P.mode===k?'on':''}" aria-pressed="${P.mode===k}" data-act="mode" data-a="${k}"${X(k)}>${t(k)}</button>`).join('')}</div>`
 :`<div class="onemode"${X(MODES[0])}>${MODES[0]==='delivery'?'🛵':'🛍️'} ${t(MODES[0])}</div>`}
<label><span${X('name')}>${t('name')}</span><input data-pf="name" value="${esc(P.name)}" autocomplete="name" placeholder="${t('namePh')}"${XP('namePh')}></label>
<label><span${X('phone')}>${t('phone')}</span><input data-pf="phone" value="${esc(P.phone)}" inputmode="tel" autocomplete="tel" placeholder="${t('phonePh')}"${XP('phonePh')}></label>
${P.mode==='delivery'?`<label><span${X('addr')}>${t('addr')}</span><input data-pf="addr" value="${esc(P.addr)}" autocomplete="street-address" placeholder="${t('addrPh')}"${XP('addrPh')}></label>${payFee()>0?`<p class="feen"${X('feeNote')}>🛵 ${t('feeNote',{fee:moneyL(payFee(),ix())},true)}</p>`:''}`:`<p class="small" style="margin-top:-2px"${X('pickNote')}>${t('pickNote')}</p>${locCard()}`}
<label><span${X('notes')}>${t('notes')}</span><textarea data-pf="notes" rows="3" maxlength="500" placeholder="${t('notesPh')}"${XP('notesPh')}>${esc(P.notes)}</textarea></label>
${cpBox()}
<h2 style="font-size:18px;margin:6px 0 10px"${X('payWith')}>${t('payWith')}</h2>
<div class="meth ${METHODS.length===1?'one':''}" role="group">${METHODS.map(k=>`<button type="button" class="${P.method===k?'on':''}" aria-pressed="${P.method===k}" data-act="method" data-a="${k}"${X(k)}>${t(k)}</button>`).join('')}</div>
${P.method==='transfer'&&!EDIT?`<div class="tapbox tr"><span><b${X('transferNote')}>${t('transferNote')}</b>${SET.transfer?`<span class="trinfo">${esc(SET.transfer)}</span>`:''}</span></div>`
 :`<div class="tapbox"><svg viewBox="0 0 52 64"><rect x="6" y="4" width="40" height="56" rx="9" fill="#fff" stroke="${L}" stroke-width="3"/><path d="M26 40C17 34 15 29 16 26C17 22 23 21 26 26C29 21 35 22 36 26C37 29 35 34 26 40Z" fill="#ff8fb1" stroke="${L}" stroke-width="2"/><path d="M20 10h12" stroke="${L}" stroke-width="3" stroke-linecap="round"/></svg><span${X('payNote')}>${t('payNote')}</span></div>`}
<p class="eta"${X('etaWill')}>${t('etaWill')}</p>
<p class="err" id="perr" role="alert"></p>
<button class="hold" id="hold" type="button"><span class="hf" id="hf"></span><span class="ht" id="ht"${X('placeBtn')}>${t('placeBtn',{total:moneyL(payTotal(),ix())})}</span></button>
<p class="small" style="text-align:center;margin:10px 0 0"${X('holdNote')}>${t('holdNote')}</p>
</form><div style="height:30px"></div>`}

/* ---- editor-only pages: things that only show up now and then, and the WhatsApp messages ---- */
function galleryView(){const card=(cap,body)=>`<div class="gc"><h3>${cap}</h3>${body}</div>`;
 const peek=(k,m)=>`<div class="peekbox"><span class="ps"${X(k)}>${t(k)}</span>${catSVG(m)}</div>`;
 const bub=k=>`<div class="cheer" style="margin:0 0 6px"><div class="bubble"${X(k)}>${t(k)}</div></div>`;
 return `<div class="mhead"><h1 class="bub-g">رسائل تظهر أحياناً</h1></div><div class="gal">
 ${card('موتشي القطو يطلع فجأة ويقول',`<div class="row">${['catPeek1','catPeek2','catPeek3'].map(k=>peek(k,'hi')).join('')}</div>`)}
 ${card('لما يلوّن شي في الصفحة',`<div class="row">${['catPaint1','catPaint2','catPaint3'].map(k=>peek(k,'wink')).join('')}</div>`)}
 ${card('لما العميل يمسكه',`<div class="row">${['catGot1','catGot2','catGot3','pawLeft'].map(k=>peek(k,'happy')).join('')}</div>`)}
 ${card('لما العميل يختار مشروب من المنيو',`<div style="text-align:center;background:radial-gradient(circle,#fff 0 30%,#ffc4d6 100%);border-radius:18px;padding:16px"><div class="poof-say" style="opacity:1;display:inline-block;margin:0 0 10px"${X('poof')}>${t('poof',{drink:nm(STORE.drinks[0])},true)}</div><br><button class="cta"${X('into')}>${t('into')}</button></div>`)}
 ${card('القطو في صفحة الدفع',bub('missing')+bub('nearly'))}
 ${card('إذا نقص شي في صفحة الدفع',['eName','ePhone','eAddr','eMenu','eServer'].map(k=>`<p class="err"${X(k)}>${t(k)}</p>`).join(''))}
 ${card('زر الطلب وهو يرسل',`<button class="hold go" type="button"><span class="hf" style="width:60%"></span><span class="ht"${X('placing')}>${t('placing')}</span></button>`)}
 ${card('السلة وهي فاضية',cartEmptyHTML())}
 ${card('شارة المشروب في المنيو',`<div class="row" style="gap:20px;padding:10px 0"><span class="info" style="margin:0;padding:10px 16px;box-shadow:none"><span class="tags2" style="position:static;display:inline-block"${X('fav')}>${t('fav')}</span></span><span class="info" style="margin:0;padding:10px 16px;box-shadow:none"><span class="tags2" style="position:static;display:inline-block"${X('newT')}>${t('newT')}</span></span></div>`)}
 ${card('زر حفظ المشروب لما العميل يعدّل مشروب في السلة',`<div style="text-align:center"><button class="cta wig"${X('saveItem')}>${t('saveItem')}</button></div>`)}
 ${card('لما تكمل بطاقة الأختام',`<p class="small"${X('cardFull')}>${t('cardFull')}</p>`)}
 ${card('زر «أنا برا المحل» بعد ما يضغطه العميل',`<div style="text-align:center"><button class="cta outb sent" type="button"${X('notified')}>${t('notified')}</button></div><p class="err"${X('outsideErr')}>${t('outsideErr')}</p>`)}
 ${card('شريط الطلب في الصفحة الرئيسية (لطلبات الاستلام)',`<div class="lastbar" style="margin:0"><div><b${X('myOrder')}>${t('myOrder',{order:`<bdi dir="ltr">${esc(orderNo('1234'))}</bdi>`})}</b><span class="lnk"${X('seeOrder')}>${t('seeOrder')}</span></div></div>`)}
 ${card('رسوم التوصيل (تطلع لطلبات التوصيل لما يكون لها رسوم)',`<p class="feen"${X('feeNote')}>🛵 ${t('feeNote',{fee:moneyL(+SET.fee||10,ix())},true)}</p><div class="rsub"><span${X('subtotal')}>${t('subtotal')}</span><span>${money(52)}</span></div><div class="rsub"><span${X('feeL')}>${t('feeL')}</span><span>${money(+SET.fee||10)}</span></div>`)}
 ${card('الدفع بالتحويل البنكي',`<div class="tapbox tr" style="margin:0"><span><b${X('transferNote')}>${t('transferNote')}</b><span class="trinfo">${esc(SET.transfer||'…')}</span></span></div>`)}
 ${card('موقع المحل لطلبات الاستلام',`<div class="where" style="margin:0"><h3${X('whereH')}>${t('whereH')}</h3><div class="mapbtns"><span class="ghost"${X('openG')}>📍 ${t('openG')}</span><span class="ghost"${X('openA')}>🧭 ${t('openA')}</span></div></div>`)}
 ${card('كود الخصم (يطلع في صفحة الطلب لما يكون عندك كوبونات شغّالة)',(()=>{const keep=S.coupon,ex={code:'MATCHA10',kind:'pct',value:10,min:0};S.coupon=ex;const on=cpBox();S.coupon=keep;
  return `<button type="button" class="lnk cpask"${X('cpAsk')}>🎟️ ${t('cpAsk')}</button><button type="button" class="ghost" style="margin:6px 0 10px"${X('cpChecking')}>${t('cpChecking')}</button>${on}<div class="rsub rdisc" style="margin-top:10px"><span${X('discL')}>${t('discL',{code:ex.code})}</span><span>${money(5)}</span></div>`})())}
 ${card('لما كود الخصم ما يشتغل',['cpNone','cpEnded','cpUsed','cpOnce'].map(k=>`<p class="err"${X(k)}>${t(k)}</p>`).join('')+`<p class="err"${X('cpMin')}>${t('cpMin',{n:moneyL(50,ix())})}</p><p class="oops" style="margin:8px 0 0"${X('cpGone')}>${t('cpGone')}</p>`)}
 ${card('لما المحل يغيّر طرق الاستلام أو الدفع والعميل في صفحة الطلب',`<p class="err"${X('eSettings')}>${t('eSettings')}</p>`)}
 ${card('كلمات ما تنشاف، يقرأها الجوال بصوت عالي للمكفوفين',`<div class="row">${['home','back','prev','next','cartLabel','langLabel','caught','catTap'].map(k=>`<span class="chip"${X(k)}>${t(k)}</span>`).join('')}</div>`)}
 </div>`}
function waView(){const o={no:'1234',name:LANG==='ar'?'سارة':'Sara',lang:LANG,items:snap(S.cart),total:cartTotal()},fee=+SET.fee||10,od=Object.assign({},o,{fee,total:o.total+fee});
 return `<div class="mhead"><h1 class="bub-g">رسائل واتساب</h1></div><div class="gal">
 <div class="gc"><h3>زر «واتساب» في صفحة الطلبات (مثال بطلب تجريبي)</h3><div class="wa"><span class="wh">${esc(o.name)}</span><div class="wb"${X('waOrder')}>${esc(waText('waOrder',o))}</div></div></div>
 <div class="gc"><h3>نفس الرسالة لطلب توصيل: سطر رسوم التوصيل ينضاف تحت المشروبات</h3><div class="wa"><span class="wh">${esc(o.name)}</span><div class="wb"><span${X('waFee')}>${esc(waText('waOrder',od))}</span></div></div></div>
 <div class="gc"><h3>طلب فيه كود خصم: سطر الخصم ينضاف تحت المشروبات</h3><div class="wa"><span class="wh">${esc(o.name)}</span><div class="wb"><span${X('waDisc')}>${esc(waText('waOrder',Object.assign({},o,{coupon:'MATCHA10',discount:5,total:o.total-5})))}</span></div></div></div>
 <div class="gc"><h3>طلب استلام: زر «تم التجهيز» يرسل هذي الرسالة</h3><div class="wa"><span class="wh">${esc(o.name)}</span><div class="wb"${X('waReady')}>${esc(waText('waReady',o))}</div></div></div>
 <div class="gc"><h3>طلب توصيل: زر «طلع للتوصيل» يرسل هذي الرسالة</h3><div class="wa"><span class="wh">${esc(o.name)}</span><div class="wb"${X('waWay')}>${esc(waText('waWay',o))}</div></div></div>
 <p class="small" style="text-align:center">العميل يستلم الرسالة باللغة اللي طلب فيها</p></div>`}

/* ================= render ================= */
const LOADER=()=>`<div class="loading"><div>${logoHTML()}<p>♡</p></div></div>`;
function render(toTop){
 if(!STORE.drinks.length){$('#app').innerHTML=LOADER();return}
 if(S.step==='machine'&&!D(S.o.drink))S.step='drink';
 const V={drink:drinkView,machine:machineView,cart:cartView,pay:payView,msgs:galleryView,wa:waView}[S.step]||landView;
 $('#app').innerHTML=topbar()+'<main>'+V()+'</main>';
 if(toTop)scrollTo(0,0);
 if(S.step==='drink'){layoutCF();if(!EDIT)bindCF()}
 if(S.step==='pay'&&!S.paid&&!EDIT)bindPay();
 if(EDIT)edited()}
function updateLive(){
 $$('[data-live]').forEach(e=>{const f=LIVE[e.dataset.live];if(f)e.innerHTML=f()});
 $$('[data-qwrap]').forEach(e=>e.classList.toggle('on',qty(e.dataset.qwrap)>0));
 $$('[data-dots]').forEach(e=>e.innerHTML=dots(qty(e.dataset.dots)))}
function bump(sel='[data-live=cup]'){const t=$(sel);if(!t||RM)return;t.animate([{transform:'scale(1)'},{transform:'scale(1.07,.93)'},{transform:'scale(.97,1.04)'},{transform:'scale(1)'}],{duration:380})}
function burst(x,y,n=8,kind){if(RM||EDIT)return;for(let i=0;i<n;i++){const f=document.createElement('span');f.className='fx';const k=kind||rand(['h','s','p']);f.innerHTML=k==='h'?heartSVG(rand(['#ff8fb1','#ff4f86','#ffd3e0'])):k==='s'?sparkSVG(rand(['#fff','#fff6b0','#dff1c8'])):k==='b'?strawSVG(false):pawSVG(rand(['#ff8fb1','#8cc152']));f.style.left=x-13+'px';f.style.top=y-13+'px';document.body.appendChild(f);const ang=Math.random()*Math.PI*2,dist=50+Math.random()*70;f.animate([{transform:'scale(.3)',opacity:1},{transform:`translate(${Math.cos(ang)*dist}px,${Math.sin(ang)*dist-30}px) scale(1) rotate(${Math.random()*180}deg)`,opacity:1,offset:.6},{transform:`translate(${Math.cos(ang)*dist}px,${Math.sin(ang)*dist+40}px) scale(.6)`,opacity:0}],{duration:900+Math.random()*400,easing:'ease-out'}).onfinish=()=>f.remove()}}
function rain(kind,n=40){if(RM||EDIT)return;for(let i=0;i<n;i++){const f=document.createElement('span');f.className='fx';const k=kind==='mix'?rand(['h','s','b']):kind;f.innerHTML=k==='h'?heartSVG(rand(['#ff8fb1','#ff4f86','#ffd3e0','#8cc152'])):k==='s'?sparkSVG(rand(['#fff','#fff6b0','#ffd3e0'])):k==='b'?strawSVG(false):`<svg viewBox="0 0 30 30"><path d="M15 2C20 8 26 10 15 28C4 10 10 8 15 2Z" fill="#ffc2d4" stroke="${L}" stroke-width="1.5"/></svg>`;const s=18+Math.random()*18;f.style.width=f.style.height=s+'px';f.style.left=Math.random()*innerWidth+'px';f.style.top='-40px';document.body.appendChild(f);f.animate([{transform:'translate(0,0) rotate(0)'},{transform:`translate(${(Math.random()-.5)*160}px,${innerHeight+80}px) rotate(${Math.random()*720-360}deg)`}],{duration:2200+Math.random()*2200,delay:Math.random()*900,easing:'linear',fill:'backwards'}).onfinish=()=>f.remove()}}

/* ================= cover flow ================= */
function layoutCF(){const cf=$('#cf');if(!cf)return;const W=cf.clientWidth;
 $$('.cf-item').forEach((el,i)=>{const off=i-S.cf,a=Math.abs(off),s=Math.sign(off);const x=s*(Math.min(a,1)*W*.33+Math.max(0,a-1)*W*.12);const ry=-Math.max(-1,Math.min(1,off))*55,z=-Math.min(a,4)*120+(a<.5?40:0);
  el.style.transform=`translateX(${x}px) translateZ(${z}px) rotateY(${ry}deg)`;el.style.zIndex=100-Math.round(a*10);el.style.opacity=a>3.3?0:1;el.classList.toggle('on',a<.5);el.tabIndex=a<.5?0:-1})}
function cfSet(i,fromDrag){const n=STORE.drinks.length;const prev=Math.round(S.cf);S.cf=Math.max(0,Math.min(n-1,i));layoutCF();const r=Math.round(S.cf);
 const info=$('#cfinfo');if(info&&(r!==prev||!fromDrag)){info.innerHTML=cfInfo();info.classList.remove('anim-in');void info.offsetWidth;info.classList.add('anim-in')}
 $$('#cfdots i').forEach((e,j)=>e.classList.toggle('on',j===r));const bt=$('#btot');if(bt&&S.step==='drink')bt.innerHTML=money(fromPrice(STORE.drinks[r]))}
let supp=false;
function bindCF(){const cf=$('#cf');if(!cf)return;const n=STORE.drinks.length;let x0=null,c0=0,start=0,moved=0,dx=0,lastX=0,lastT=0,vel=0;
 const mv=e=>{if(x0===null)return;dx=e.clientX-x0;moved=Math.max(moved,Math.abs(dx));if(moved<6)return;cf.classList.add('drag');const now=performance.now();vel=(e.clientX-lastX)/Math.max(1,now-lastT);lastX=e.clientX;lastT=now;
  const lo=Math.max(-.35,start-1.15),hi=Math.min(n-.65,start+1.15);S.cf=Math.max(lo,Math.min(hi,c0-dx/(cf.clientWidth*.33)));layoutCF()};
 const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);if(x0===null)return;x0=null;cf.classList.remove('drag');
  if(moved>=6){supp=true;setTimeout(()=>supp=false,80);let to=start;if(Math.abs(dx)>cf.clientWidth*.1||Math.abs(vel)>.35)to=start-Math.sign(dx||-vel);cfSet(to)}};
 cf.addEventListener('pointerdown',e=>{if(e.target.closest('.cf-arrow'))return;x0=lastX=e.clientX;lastT=performance.now();c0=S.cf;start=Math.round(S.cf);moved=0;dx=0;vel=0;addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up)});
 let wLock=0;cf.addEventListener('wheel',e=>{if(Math.abs(e.deltaX)>Math.abs(e.deltaY)&&Math.abs(e.deltaX)>12){e.preventDefault();const now=performance.now();if(now-wLock<450)return;wLock=now;cfSet(Math.round(S.cf)+Math.sign(e.deltaX))}},{passive:false})}

/* the chosen card turns into the smiley cup */
function poof(){const d=D(S.o.drink),img=$('.cf-item.on img'),r=img?img.getBoundingClientRect():{left:innerWidth/2-100,top:innerHeight/2-120,width:200,height:240};
 const go=()=>{if(!ov.isConnected)return;ov.classList.add('out');setTimeout(()=>ov.remove(),350);S.step='machine';render(true)};
 if(RM){S.step='machine';render(true);return}
 const ov=document.createElement('div');ov.className='poof';ov.setAttribute('role','dialog');ov.setAttribute('aria-label',nm(d));
 ov.innerHTML=`<div class="rays"></div><img class="poof-img" src="${imgOf(d)}" alt="" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px"><div class="cloud">${[[-70,-40,70],[10,-70,80],[50,-10,70],[-30,20,80],[-90,30,56],[80,40,60]].map(([x,y,s],i)=>`<i style="left:${x-s/2}px;top:${y-s/2}px;width:${s}px;height:${s}px;animation-delay:${.55+i*.04}s"></i>`).join('')}</div><div class="poof-c"><div class="poof-say">${t('poof',{drink:nm(d)},true)}</div>${cupSVG()}<button class="cta" id="poofgo">${t('into')}</button></div>`;
 document.body.appendChild(ov);
 const pi=ov.querySelector('.poof-img'),ddx=innerWidth/2-(r.left+r.width/2),ddy=innerHeight*.45-(r.top+r.height/2);
 pi.animate([{transform:'none'},{transform:`translate(${ddx}px,${ddy}px) rotate(360deg) scale(.7)`,offset:.7},{transform:`translate(${ddx}px,${ddy}px) rotate(400deg) scale(0)`,opacity:0}],{duration:900,easing:'cubic-bezier(.5,0,.3,1)',fill:'forwards'});
 setTimeout(()=>burst(innerWidth/2,innerHeight*.45,14),900);
 ov.querySelector('#poofgo').addEventListener('click',go);
 setTimeout(()=>ov.querySelector('#poofgo')?.focus(),1800)}

/* ================= send the order: tap OR hold ================= */
let holdActive=false;
function validate(){const f=$('[data-form=pay]'),P=S.pay,g=k=>(f.querySelector(`[data-pf=${k}]`)?.value||'').trim();
 if(g('name').length<2)return['name',tp('eName')];if(g('phone').replace(/\D/g,'').length<8)return['phone',tp('ePhone')];
 if(P.mode==='delivery'&&g('addr').length<5)return['addr',tp('eAddr')];
 return null}
function showErr(v){const h=$('#hold');$('#perr').textContent=v[1];if(h){h.classList.remove('shake');void h.offsetWidth;h.classList.add('shake')}const i=v[0]&&$(`[data-pf=${v[0]}]`);i&&i.focus();const c=$('#catsay');if(c)c.textContent=tp('missing')}
/* from the first tap until the shop answers, the button is locked and shows it's working */
function lockHold(on){const h=$('#hold'),ht=$('#ht');if(!h)return;h.disabled=on;h.classList.toggle('busy',on);h.setAttribute('aria-busy',on?'true':'false');if(on){h.classList.add('go');ht.innerHTML=`<i class="spin" aria-hidden="true"></i>${t('placing')}`}}
function bindPay(){const h=$('#hold');if(!h)return;let t0=0,raf=0;const hf=$('#hf'),ht=$('#ht');
 const stop=()=>{holdActive=false;cancelAnimationFrame(raf);lockHold(false);h.classList.remove('go');hf.style.transition='';hf.style.width='0';ht.innerHTML=t('placeBtn',{total:moneyL(payTotal(),ix())})};
 const go=()=>{lockHold(true);sendOrder().then(ok=>{if(!ok&&h.isConnected)stop()})};
 const finish=()=>{holdActive=false;cancelAnimationFrame(raf);hf.style.transition='width .18s';hf.style.width='100%';go()};
 const tick=()=>{const p=Math.min(1,(performance.now()-t0)/900);hf.style.width=p*100+'%';if(p>=1){finish();return}raf=requestAnimationFrame(tick)};
 h.addEventListener('pointerdown',e=>{e.preventDefault();if(holdActive||S.sending||h.disabled)return;const v=validate();if(v){showErr(v);return}$('#perr').textContent='';holdActive=true;h.classList.add('go');ht.textContent=tp('placing');$('#catsay').textContent=tp('nearly');t0=performance.now();raf=requestAnimationFrame(tick)});
 /* letting go early still sends: a quick tap works the same as a full hold */
 h.addEventListener('pointerup',()=>{if(holdActive)finish()});
 ['pointerleave','pointercancel'].forEach(ev=>h.addEventListener(ev,()=>{if(holdActive)stop()}));
 h.addEventListener('contextmenu',e=>e.preventDefault());
 h.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(S.sending||holdActive||h.disabled)return;const v=validate();if(v)showErr(v);else{hf.style.width='100%';go()}}})}
/* every order gets its own id here, before it is sent. The same id goes with every retry, so the shop
   saves it once even if the internet is slow, the button is tapped twice, or the page is reloaded mid-send. */
const newCid=()=>{try{if(crypto.randomUUID)return crypto.randomUUID()}catch(e){}const a=new Uint8Array(16);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,'0')).join('')};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function postOrder(body){let last={r:null,j:{}};
 for(let i=0;i<3;i++){if(i)await sleep(1500*i);
  const ac=window.AbortController?new AbortController():null,to=setTimeout(()=>ac&&ac.abort(),15000);
  try{const r=await fetch(API+'orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:ac?.signal});const j=await r.json().catch(()=>({}));
   if(r.status>=500||r.status===408||r.status===429){last={r,j};continue}
   return {r,j}}
  catch(e){last={r:null,j:{}}}
  finally{clearTimeout(to)}}
 return last}
async function sendOrder(){if(S.sending||S.paid)return false;S.sending=true;lockHold(true);const P=S.pay;
 const items=S.cart.map(c=>({drink:c.drink,size:c.size,milk:c.milk,ad:c.ad,qty:c.qty})),sig=JSON.stringify([items,P.mode]);
 /* same drinks as an unfinished try: it's the same order, so it keeps the same id */
 let pend=lsGet(PENDK,null);if(!pend||pend.sig!==sig||Date.now()-(+pend.at||0)>6*3600e3){pend={cid:newCid(),sig,at:Date.now()};lsSet(PENDK,pend)}
 const body={cid:pend.cid,at:pend.at,name:P.name,phone:P.phone,mode:P.mode,addr:P.addr,notes:P.notes,method:P.method,lang:LANG,items,coupon:payDisc()>0?S.coupon.code:''};
 const {r,j}=await postOrder(body);
 if(!r||!r.ok){S.sending=false;
  /* the code stopped working since it was applied: take it off, show the new total, and let the customer decide */
  if(r&&j.error==='coupon'){S.coupon=null;saveCp();render(true);const p=document.createElement('p');p.className='oops';p.textContent=cpMsg(j.why,j.min)+' '+tp('cpGone');$('main')?.prepend(p);return false}
  if(r&&(j.error==='menu'||j.error==='items')){await loadShop().catch(()=>{});fixCart();S.step='cart';render(true);const p=document.createElement('p');p.className='oops';p.textContent=tp('eMenu');$('main')?.prepend(p);return false}
  if(r&&(j.error==='mode'||j.error==='method')){await loadShop().catch(()=>{});render(true);const p=document.createElement('p');p.className='oops';p.textContent=tp('eSettings');$('main')?.prepend(p);return false}
  const map=r&&{name:['name','eName'],phone:['phone','ePhone'],addr:['addr','eAddr']}[j.error];showErr(map?[map[0],tp(map[1])]:['',tp('eServer')]);return false}
 lsDel(PENDK)
 S.ready=readyWin();
 S.last={id:j.id,cid:pend.cid,no:j.no,items:clone(S.cart),total:j.total,fee:+j.fee||0,discount:+j.discount||0,coupon:j.coupon||'',mode:j.mode||P.mode,name:P.name,at:Date.now(),ready:S.ready};lsSet(LASTK,S.last);
 S.cart=[];saveCart();S.pay.notes='';S.coupon=null;S.cpOpen=false;saveCp();
 S.paid=true;S.stamps=typeof j.stamps==='number'?j.stamps:Math.min(8,S.stamps+1);lsSet('mm-stamps',S.stamps);S.sending=false;render(true);setTimeout(()=>rain('mix',60),200);return true}
/* the stamp count the shop has for this order's phone (the admin can change it) */
async function refreshTrack(L){if(!L||!L.id||!L.cid)return;try{const r=await fetch(`${API}track/${encodeURIComponent(L.id)}?k=${encodeURIComponent(L.cid)}`,{cache:'no-store'});if(!r.ok)return;const j=await r.json();
 if(typeof j.stamps==='number'&&j.stamps!==S.stamps){S.stamps=j.stamps;lsSet('mm-stamps',S.stamps);if(S.paid&&S.step==='pay'&&S.last&&S.last.id===L.id){const y=scrollY;render();scrollTo(0,y)}}}catch(e){}}

/* ================= Mochi's mischief: he only repaints things, nothing moves ================= */
const MI={t:0,busy:false};
function sched(){if(EDIT)return;clearTimeout(MI.t);MI.t=setTimeout(mischief,9000+Math.random()*11000)}
const inView=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.top>80&&r.bottom<innerHeight-100};
function mischief(){if(document.hidden||MI.busy||holdActive||$('.poof')){sched();return}
 MI.busy=true;const paint=$$('[data-paint]').filter(e=>inView(e)&&!e.classList.contains('painted'));
 const kind=paint.length&&Math.random()<.75?'paint':'peek';
 const tgt=kind==='paint'?rand(paint):null,app=$('#app').getBoundingClientRect();
 const el=document.createElement('button');let side='b';
 if(tgt){const r=tgt.getBoundingClientRect();side=(r.left+r.width/2)<(app.left+app.width/2)?'l':'r';el.style.top=Math.max(70,Math.min(innerHeight-170,r.top+r.height/2-60))+'px';if(side==='l')el.style.left=app.left+'px';else el.style.left=(app.right-110)+'px'}
 else el.style.left=(app.left+20+Math.random()*Math.max(10,app.width-160))+'px';
 el.className='peek '+side;el.setAttribute('aria-label',tp('catTap'));
 const line=t(rand(kind==='paint'?['catPaint1','catPaint2','catPaint3']:['catPeek1','catPeek2','catPeek3']));
 el.innerHTML=`<span class="ps">${line}</span>${catSVG(kind==='peek'?'hi':'wink')}`;document.body.appendChild(el);
 let caught=false;
 const leave=d=>setTimeout(()=>{el.classList.remove('in');setTimeout(()=>{el.remove();MI.busy=false;sched()},550)},d);
 el.addEventListener('click',()=>{if(caught)return;caught=true;S.caught++;lsSet('mm-caught',S.caught);const c=$('#caught');if(c)c.textContent=S.caught;el.classList.add('got');
  let say=t(rand(['catGot1','catGot2','catGot3']));if(S.caught===3&&!S.paw){S.paw=true;lsSet('mm-paw',true);updateLive();say=t('pawLeft')}
  el.innerHTML=`<span class="ps">${say}</span>${catSVG('happy')}`;const r=el.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/3,10,'p');leave(1100)});
 requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('in')));
 setTimeout(()=>{if(!el.isConnected||caught)return;
  if(kind==='paint'&&tgt.isConnected){tgt.style.setProperty('--hue',(60+Math.random()*240|0)+'deg');tgt.classList.add('painted')}},650);
 leave(2600)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sched()});

/* ================= actions ================= */
let h100=0,stars=0,dangoLeft=3;
const bumpCart=()=>{const c=$('#cartp');if(c&&!RM){c.classList.remove('bump');void c.offsetWidth;c.classList.add('bump')}};
const ACT={
 start:()=>{S.step='drink';render(true)},
 back:()=>{if(S.step==='machine'&&S.edit!=null){S.edit=null;S.step='cart'}else S.step={drink:'land',machine:'drink',cart:'drink',pay:'cart'}[S.step]||'land';render(true)},
 lang:()=>{LANG=LANG==='ar'?'en':'ar';lsSet('mm-lang',LANG);applyLang();const y=scrollY;render();scrollTo(0,y)},
 logo:(a,el)=>{if(S.step!=='land'){S.step='land';S.paid=false;S.edit=null;render(true);return}const r=el.getBoundingClientRect();burst(r.left+20,r.top+20,6,'h')},
 peekmenu:a=>{S.cf=+a;S.step='drink';render(true)},
 cfpick:a=>{if(supp)return;a=+a;if(a===Math.round(S.cf))ACT.choose();else cfSet(a)},
 cfstep:a=>cfSet(Math.round(S.cf)+ +a),
 choose:()=>{const d=STORE.drinks[Math.round(S.cf)];if(!d)return;if(!(S.edit!=null&&S.o.drink===d.id))S.o=newOrder(d.id);poof()},
 add:(a,el)=>{const x=A(a);if(!x)return;if(qty(a)>=MAXQ){const w=el.closest('[data-qwrap]');w&&w.animate([{transform:'rotate(-4deg)'},{transform:'rotate(4deg)'},{transform:'none'}],{duration:300});return}
  S.o.ad[a]=qty(a)+1;updateLive();const s=$('.stream'),tk=el.closest('.tank');if(x.kind==='pearls'){const pz=$('.pourz');if(pz&&!RM)for(let j=0;j<5;j++){const b=document.createElement('i');b.className='drop';b.style.background=x.color;pz.appendChild(b);b.animate([{transform:`translate(${(j%3-1)*5}px,0)`,opacity:1},{transform:`translate(${(j%3-1)*14}px,140px)`,opacity:1,offset:.85},{transform:`translate(${(j%3-1)*14}px,150px)`,opacity:0}],{duration:620,delay:j*90,easing:'cubic-bezier(.5,0,1,1)',fill:'backwards'}).onfinish=()=>b.remove()}}
  else if(s&&!RM){s.style.background=x.color;s.classList.remove('go');void s.offsetWidth;s.classList.add('go')}if(tk){tk.classList.remove('glug');void tk.offsetWidth;tk.classList.add('glug')}setTimeout(()=>{bump();const c=$('[data-live=cup]');if(c){const r=c.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height*.3,4,'s')}},420)},
 sub:a=>{if(qty(a)>0){S.o.ad[a]--;if(!S.o.ad[a])delete S.o.ad[a]}updateLive()},
 size:a=>{S.o.size=a;updateLive();bump()},
 milk:a=>{S.o.milk=a;updateLive();bump()},
 addcart:()=>{const it=clone(S.o);if(S.edit!=null&&S.cart[S.edit]){it.qty=S.cart[S.edit].qty;S.cart[S.edit]=it}else{const same=S.cart.find(c=>c.drink===it.drink&&c.size===it.size&&c.milk===it.milk&&JSON.stringify(Object.entries(c.ad).sort())===JSON.stringify(Object.entries(it.ad).sort()));if(same)same.qty=Math.min(20,same.qty+1);else S.cart.push(Object.assign(it,{qty:1}))}
  S.edit=null;saveCart();S.o=newOrder(null);S.step='cart';render(true);setTimeout(bumpCart,60)},
 gocart:()=>{S.edit=null;if(S.paid){S.paid=false}S.step='cart';render(true)},
 more:()=>{S.edit=null;S.paid=false;S.step='drink';render(true)},
 qplus:a=>{const c=S.cart[+a];if(c){c.qty=Math.min(20,c.qty+1);saveCart();render()}},
 qminus:a=>{const c=S.cart[+a];if(c&&c.qty>1){c.qty--;saveCart();render()}},
 remove:a=>{S.cart.splice(+a,1);saveCart();render()},
 edititem:a=>{const c=S.cart[+a];if(!c)return;S.edit=+a;S.o=clone(c);S.step='machine';render(true)},
 topay:()=>{if(!S.cart.length)return;S.step='pay';S.paid=false;render(true)},
 mode:a=>{S.pay.mode=a;keepPay();render()},
 /* discount codes: open the box, check the code with the shop, take it off */
 cpopen:()=>{S.cpOpen=true;keepRender();setTimeout(()=>$('#cpin')?.focus(),30)},
 cpoff:()=>{S.coupon=null;S.cpOpen=true;saveCp();keepRender()},
 cpapply:async()=>{const inp=$('#cpin'),er=$('#cperr'),go=$('#cpgo');if(!inp||S.cpBusy)return;const code=inp.value.trim();if(!code){inp.focus();return}
  S.cpBusy=true;go.disabled=true;go.textContent=tp('cpChecking');er.textContent='';let j={},r=null;
  try{r=await fetch(API+'coupon',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,subtotal:cartTotal(),phone:S.pay.phone})});j=await r.json().catch(()=>({}))}catch(e){}
  S.cpBusy=false;
  if(r&&r.ok&&j.coupon){S.coupon=j.coupon;saveCp();keepRender();const b=$('.cpon');if(b){const q=b.getBoundingClientRect();burst(q.left+30,q.top+20,8,'h')}return}
  if(!go.isConnected)return;go.disabled=false;go.textContent=tp('cpApply');er.textContent=r&&j.error==='coupon'?cpMsg(j.why,j.min):tp('eServer');inp.focus()},
 method:a=>{S.pay.method=a;keepPay();render()},
 again:()=>{S.paid=false;S.o=newOrder(null);S.step='drink';render(true)},
 /* the pickup order from earlier, opened from the bar on the home page */
 myorder:()=>{const L=recentPickup();if(!L)return;S.last=L;S.ready=L.ready||readyWin();S.paid=true;S.edit=null;S.step='pay';render(true);refreshTrack(L)},
 /* "I'm outside": tells the store once, then rests for a short while so it can't be spammed */
 outside:async(a,el)=>{const L=S.paid&&S.last&&S.last.id?S.last:recentPickup();if(!L||!L.id||!L.cid||outCool(L)||el.disabled)return;
  el.disabled=true;el.classList.add('busy');const er=$('#outerr');if(er)er.textContent='';let ok=false;
  try{const r=await fetch(API+'track/'+encodeURIComponent(L.id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({k:L.cid,outside:true})});const j=await r.json().catch(()=>({}));ok=r.ok;if(ok&&typeof j.stamps==='number'){S.stamps=j.stamps;lsSet('mm-stamps',S.stamps)}}catch(e){}
  if(!ok){el.disabled=false;el.classList.remove('busy');const e2=$('#outerr');if(e2)e2.textContent=tp('outsideErr');else alert(tp('outsideErr'));return}
  L.outAt=Date.now();const st=lsGet(LASTK,null);if(st&&st.id===L.id){st.outAt=L.outAt;lsSet(LASTK,st)}if(S.last&&S.last.id===L.id)S.last.outAt=L.outAt;
  const swap=()=>$$('[data-act=outside]').forEach(b=>{b.outerHTML=outBtn(L)});swap();
  const r=el.getBoundingClientRect();burst(r.left+r.width/2,r.top,8,'h');setTimeout(swap,OUT_COOL+200)},
 boing:(a,el)=>{el.classList.remove('boing');void el.offsetWidth;el.classList.add('boing')},
 spin:(a,el)=>{el.classList.remove('spin');void el.offsetWidth;el.classList.add('spin')},
 pop:(a,el)=>{const r=el.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,8,'h');el.classList.add('popped');setTimeout(()=>el.classList.remove('popped'),2600)},
 star:(a,el)=>{stars++;ACT.spin(a,el);if(stars%5===0)rain('petal',50)},
 hundred:(a,el)=>{h100++;const t=$('#h100');if(h100%3===0){const was=t.textContent;t.textContent='1000%';setTimeout(()=>t.textContent=was,2500)}ACT.spin(a,el)},
 tickle:(a,el)=>{bump();const r=el.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height*.6,5,'h')},
 dango:(a,el)=>{if(el.style.opacity==='0')return;el.style.opacity='0';el.style.transform='scale(0)';dangoLeft--;const r=el.getBoundingClientRect();burst(r.left+20,r.top+20,5,'s');if(dangoLeft===0){setTimeout(()=>{$$('.dango circle').forEach(c=>{c.style.opacity='';c.style.transform=''});dangoLeft=3},1500)}}};
/* draw again without jumping, keeping what the customer typed (it's already saved in S.pay) */
const keepRender=()=>{const y=scrollY;render();scrollTo(0,y)};
const keepPay=()=>{const P=S.pay;lsSet('mm-pay',{name:P.name,phone:P.phone,addr:P.addr,mode:P.mode,method:P.method})};

/* ================= data ================= */
async function loadShop(){const r=await fetch(API+'shop',{cache:'no-store'});if(!r.ok)throw Object.assign(new Error('shop '+r.status),{status:r.status});const j=await r.json();if(!EDIT)lsSet('mm-shop',j);
 /* the link the customer typed may differ in capitals: show the store's own one */
 if(j.slug&&j.slug!==SLUG&&!EDIT)try{history.replaceState(null,'','/'+encodeURIComponent(j.slug)+location.search+location.hash)}catch(e){}
 return useShop(j)}
function useShop(j){const before=JSON.stringify([STORE,OV,BRAND,SET,S.hasCp]);STORE=j.menu;if(!EDIT)OV=j.texts||{};setBrand(j.brand);setSettings(j.settings);
 /* the code box only shows when the store has codes switched on */
 S.hasCp=!!j.coupons;if(!S.hasCp&&S.coupon){S.coupon=null;saveCp()}
 fixCart();fixPay();if(S.o.drink&&!D(S.o.drink))S.o=newOrder(null);return before!==JSON.stringify([STORE,OV,BRAND,SET,S.hasCp])}
/* the customer only gets the ways to receive and pay that the store has turned on */
function fixPay(){if(EDIT)return;const m=modesOn(),p=paysOn();if(!m.includes(S.pay.mode))S.pay.mode=m[0];if(!p.includes(S.pay.method))S.pay.method=p[0]}

/* ================= editor preview (index.html?edit=1 inside the admin's text editor) ================= */
let EST='land';
function editState(st){EST=st;S.paid=false;S.edit=null;
 const d0=STORE.drinks[0],d1=STORE.drinks[1]||d0;
 const a=newOrder(d0.id),al=dAddons(d0);if(al[0])a.ad[al[0].id]=1;
 S.cart=[a,Object.assign(newOrder(d1.id),{qty:2})];
 S.pay={mode:st==='delivery'?'delivery':'pickup',method:'cash',name:'',phone:'',addr:'',notes:''};
 S.step={land:'land',drink:'drink',machine:'machine',cart:'cart',pickup:'pay',delivery:'pay',done:'pay',msgs:'msgs',wa:'wa'}[st]||'land';
 S.cf=0;S.o=newOrder(d0.id);
 if(st==='done'){S.paid=true;S.last={no:'1234',items:S.cart,total:cartTotal(),name:'',mode:'pickup',fee:0};S.ready=readyWin();S.stamps=3}
 render(true)}
let postT=0;
function edited(){clearTimeout(postT);postT=setTimeout(()=>{const app=$('#app');const keys=[...new Set($$('[data-tx],[data-txph]').map(e=>e.dataset.tx||e.dataset.txph))].join();parent.postMessage({mm:'rendered',st:EST,keys,h:Math.ceil(app.getBoundingClientRect().height)},location.origin)},30)}
if(EDIT){document.documentElement.classList.add('edit');
 addEventListener('message',e=>{if(e.origin!==location.origin||!e.data)return;const m=e.data;
  if(m.mm==='set'){OV=m.ov||{};if(m.lang&&m.lang!==LANG){LANG=m.lang;applyLang()}if(m.st&&m.st!==EST||m.force)editState(m.st||EST);else render()}
  if(m.mm==='hl'){$$('.txon').forEach(e=>e.classList.remove('txon'));if(m.key){const el=document.querySelector(`[data-tx="${m.key}"],[data-txph="${m.key}"]`);el&&el.classList.add('txon')}}});
 /* the preview is for looking: a tap on a text picks it in the editor, nothing else reacts */
 const pick=e=>{e.preventDefault();e.stopPropagation();if(e.type!=='click')return;const el=e.target.closest('[data-tx],[data-txph]');if(el)parent.postMessage({mm:'pick',key:el.dataset.tx||el.dataset.txph},location.origin)};
 ['click','pointerdown','submit','keydown'].forEach(ev=>addEventListener(ev,pick,true));
 document.fonts?.ready.then(edited);addEventListener('load',edited,true)}

/* ================= events ================= */
document.addEventListener('click',e=>{
 const pt=e.target.closest('.painted');if(pt&&!e.target.closest('[data-act]')){pt.classList.remove('painted');return}
 const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const f=ACT[b.dataset.act];if(f){e.preventDefault();f(b.dataset.a,b)}});
document.addEventListener('input',e=>{const tg=e.target;if(tg.dataset.pf&&tg.dataset.pf in S.pay){S.pay[tg.dataset.pf]=tg.value;if(tg.dataset.pf!=='notes')keepPay()}});
document.addEventListener('submit',e=>e.preventDefault());
document.addEventListener('keydown',e=>{if(e.target.id==='cpin'&&e.key==='Enter'){e.preventDefault();ACT.cpapply();return}if(S.step==='drink'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||'')){if(e.key==='ArrowLeft')cfSet(Math.round(S.cf)-1);if(e.key==='ArrowRight')cfSet(Math.round(S.cf)+1)}});
addEventListener('resize',()=>layoutCF());
/* the dotted wall beside the phone column on big screens */
if(!EDIT)$('#wall').innerHTML=[[4,10,90,'b'],[12,62,70,'r'],[6,80,110,'c'],[86,8,80,'d'],[90,46,90,'b'],[82,74,70,'h'],[16,34,50,'s'],[78,30,46,'s'],[22,88,60,'h'],[92,90,60,'r']].map(([x,y,s,k],i)=>`<button class="stk" data-act="${k==='b'||k==='h'?'pop':'spin'}" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;transform:rotate(${(i*23)%40-20}deg)" aria-hidden="true" tabindex="-1">${k==='b'?strawSVG():k==='r'?rollSVG():k==='c'?catSVG('happy'):k==='d'?daifukuSVG():k==='h'?heartSVG():sparkSVG('#fff6b0')}</button>`).join('');
/* the cups blink now and then */
if(!EDIT)setInterval(()=>{if(RM)return;const eyes=$$('.cup .ey, .logo .ey');eyes.forEach(g=>{g.style.transformBox='fill-box';g.style.transformOrigin='center';g.animate([{transform:'scaleY(1)'},{transform:'scaleY(.1)'},{transform:'scaleY(1)'}],{duration:220})})},3800);

/* ================= start ================= */
if(EDIT){loadShop().then(()=>parent.postMessage({mm:'ready'},location.origin)).catch(()=>{$('#app').innerHTML='<p class="oops">تعذّر تحميل المعاينة</p>'})}
else{const cached=lsGet('mm-shop',null);
 if(cached&&cached.menu){useShop(cached);render()}else render();
 const fail=e=>{if(e&&e.status===404){$('#app').innerHTML=`<div class="loading"><div>${logoHTML()}<p>${esc(LANG==='ar'?'ما فيه محل بهذا الاسم. تأكد من الرابط.':'There’s no shop with this name. Check the link.')}</p><p><a href="/">${esc(LANG==='ar'?'الصفحة الرئيسية':'Home page')}</a></p></div></div>`;return}
  if(!STORE.drinks.length)$('#app').innerHTML=`<div class="loading"><div>${logoHTML()}<p>${esc(LANG==='ar'?'تعذّر فتح المحل. تأكد من الإنترنت وحدّث الصفحة.':'We couldn’t open the shop. Check your internet and refresh.')}</p></div></div>`};
 loadShop().then(ch=>{if(ch&&!S.sending&&!holdActive){const y=scrollY;render();scrollTo(0,y)}}).catch(fail);
 sched()}
}
}
