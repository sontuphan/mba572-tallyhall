
(() => {
const $=(q,r=document)=>r.querySelector(q),$$=(q,r=document)=>[...r.querySelectorAll(q)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Lucide SVG subset, bundled locally by build.mjs.
const icon=n=>LUCIDE_ICONS[n]||LUCIDE_ICONS.file;
function hydrate(root=document){$$('[data-icon]',root).forEach(e=>e.innerHTML=icon(e.dataset.icon))}
const KEY='tallyhall.local.prototype.v1';
let state=Model.seed(),loadWarning='';
try{const raw=localStorage.getItem(KEY);if(raw){state=Model.validate(JSON.parse(raw));state.day=Model.localDay()}}catch{loadWarning='Stored data could not be loaded. Demo records are shown; export a backup before replacing stored data.'}
let page='today',currentJobId=null,jobFilter='active',jobView='list',accountFilter='all',calOffset=0,pendingImport=null,toastTimer,returnFocus;
const date=(s,full=false)=>new Date(s+'T12:00:00').toLocaleDateString('en-US',full?{weekday:'long',month:'long',day:'numeric'}:{month:'short',day:'numeric'});
const badge=(text,kind='')=>'<span class="badge '+kind+'">'+esc(text)+'</span>';
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200)}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('#saved-state').textContent='Saved on this device'}catch{$('#saved-state').textContent='Not saved — export a backup';toast('Local storage is unavailable. Export a backup before closing.')}render()}
function statHTML(){const s=Model.summary(state);return [
 ['ledger','Tuition collected',s.received,'Confirmed receipts · excludes unmatched'],
 ['clock','Awaiting funding',s.funding,'Program balances, separate from family dues'],
 ['mail','Overdue tuition',s.overdue,'Review before preparing a reminder']
 ].map(([i,l,v,n])=>'<div class="stat"><div class="stat-label">'+icon(i)+l+'</div><div class="stat-value">'+Model.money(v)+'</div><div class="stat-note">'+n+'</div></div>').join('')}
function render(){
 const n=Model.jobs(state).filter(j=>['To do','Needs approval'].includes(j.status)&&j.pic==='Alex').length;
 $('#stats').innerHTML=statHTML();$('#tuition-stats').innerHTML=statHTML();
 $('#day-intro').textContent=n?n+' '+(n===1?'job is':'jobs are')+' ready for your attention. Let’s take them one at a time.':'Your drafting jobs are up to date. Keep an eye on waiting payments.';
 $('#nav-count').textContent=n;$('#today-date').textContent=date(state.day,true).toUpperCase();$('#footer-date').textContent='Local records · '+date(state.day);
 renderJobs();renderAccounts();updateCabinetReadout();
}
function navigate(next){
 if(next==='assistant'){toggleAssistant(true);return}
 page=next;$$('.page').forEach(e=>e.hidden=e.id!=='page-'+page);$$('nav [data-page]').forEach(e=>e.classList.toggle('active',e.dataset.page===page));$('#crumb').textContent={today:'Today',tuition:'Tuition & payments',tools:'External tools'}[page]||'Today';window.scrollTo({top:0,behavior:'instant'})
}
function toggleAssistant(forceOpen){
 const bar=$('#agent-sidebar');if(!bar)return;
 const willOpen=forceOpen!==undefined?forceOpen:bar.classList.contains('collapsed');
 bar.classList.toggle('collapsed',!willOpen);
 $('#assistant-toggle-btn')?.classList.toggle('active',willOpen);
 if(willOpen){setTimeout(()=>$('#assistant-query')?.focus(),100)}
}

const externalTools=[
 {id:'brightwheel',name:'Brightwheel',mark:'bw',category:'School management',description:'Bring tuition records into the same place as your daily follow-ups.',example:'Student records, invoices, and payment status'},
 {id:'venmo',name:'Venmo',mark:'V',category:'Payments',description:'See how payment records could be matched to student balances.',example:'Payment references and transaction amounts'},
 {id:'zelle',name:'Zelle',mark:'Z',category:'Payments',description:'Keep a place for bank-transfer records in your tuition workflow.',example:'Bank-provided payment records and references'},
 {id:'revolut',name:'Revolut',mark:'R',category:'Banking & payments',description:'Explore bringing account transactions into payment reconciliation.',example:'Transaction records and payment references'}
];
// shortcut: connection state is a local mockup; replace it with approved provider authorization when a real connector is scoped.
let demoConnections=new Set();
try{const saved=JSON.parse(localStorage.getItem(KEY+'.demoConnections')||'[]');if(Array.isArray(saved))demoConnections=new Set(saved.filter(id=>externalTools.some(t=>t.id===id)))}catch{}
function renderTools(){
 $('#tools-connected-count').textContent=demoConnections.size+' demo '+(demoConnections.size===1?'connection':'connections');
 $('#tools-grid').innerHTML=externalTools.map(t=>{const connected=demoConnections.has(t.id);return '<article class="tool-card" data-tool-card="'+t.id+'"><div class="tool-card-top"><span class="tool-mark tool-'+t.id+'" aria-hidden="true">'+t.mark+'</span><span class="tool-status '+(connected?'demo-connected':'')+'">'+(connected?'Connected · demo':'Not connected')+'</span></div><div class="tool-category">'+t.category+'</div><h2>'+t.name+'</h2><p>'+t.description+'</p><div class="tool-card-bottom"><span>Demo only</span><button class="'+(connected?'secondary':'primary')+'" data-action="tool-details" data-tool="'+t.id+'" aria-label="'+(connected?'Manage':'Connect')+' '+t.name+' demo">'+(connected?'Manage':'Connect')+'</button></div></article>'}).join('');
}
function toolModal(id){
 const t=externalTools.find(t=>t.id===id);if(!t)return;const connected=demoConnections.has(id);
 modal((connected?'Manage ':'Connect ')+t.name,'Demo connection · no sign-in required','<div class="tool-modal-heading"><span class="tool-mark tool-'+t.id+'" aria-hidden="true">'+t.mark+'</span><div><h3>'+t.name+'</h3><p>'+t.category+'</p></div></div><div class="detail-label">Example data to assess during setup</div><p>'+t.example+'.</p><div class="form-note">These are proposed connection examples, not verified provider capabilities. A real setup depends on the provider’s API, account type, and permissions.</div><p class="tool-demo-explanation">'+(connected?'This card is marked connected for the demo. It has not accessed an external account.':'Continue to show how the connected state would look. This will not open a sign-in page, request credentials, or change tuition records.')+'</p>','<button class="secondary" data-action="close">Cancel</button><button class="primary" data-action="'+(connected?'tool-disconnect':'tool-connect')+'" data-tool="'+id+'">'+(connected?'Disconnect demo':'Connect demo')+'</button>');
}
function setDemoConnection(id,connected){
 if(!externalTools.some(t=>t.id===id))throw Error('Unknown demo tool.');
 if(connected)demoConnections.add(id);else demoConnections.delete(id);
 let saved=true;try{localStorage.setItem(KEY+'.demoConnections',JSON.stringify([...demoConnections]))}catch{saved=false}
 renderTools();closeDialog();toast((connected?'Demo connection added.':'Demo connection removed.')+(saved?' No external account was changed.':' Browser storage is unavailable; this change will not persist.'));
}

function filteredJobs(){const pic=$('#pic-filter').value;return Model.jobs(state).filter(j=>(pic==='all'||j.pic===pic)&&(jobFilter==='active'?['To do','Needs approval'].includes(j.status):jobFilter==='waiting'?j.status==='Waiting':jobFilter==='done'?['Done','Cancelled'].includes(j.status):true))}
function invoiceSummary(a){
 return Model.outstanding(state,a).map(i=>'<span class="invoice-line">'+esc(Model.monthLabel(i.month))+' · '+Model.money(i.balance)+' · original due '+esc(i.due)+' · '+i.daysPastDue+' days past due<small>Last reminder: '+esc(Model.lastReminder(state,a.id,i.id)||'None recorded')+'</small></span>').join('')||'<span class="invoice-line">No outstanding invoices</span>';
}
function renderJobs(){
 const js=filteredJobs();$('#job-count').textContent=js.length;
 $$('[data-job-filter]').forEach(e=>e.classList.toggle('active',e.dataset.jobFilter===jobFilter));$$('[data-view]').forEach(e=>{const b=e.dataset.view===jobView;e.classList.toggle('selected',b);e.setAttribute('aria-pressed',String(b))});
 if(jobView==='calendar'){renderCalendar(js);return}
 if(!js.length){$('#jobs-content').innerHTML='<div class="empty"><div class="empty-icon">'+icon('check')+'</div><h3>All clear here.</h3><p>Try another filter, or check waiting jobs for the next follow-up.</p></div>';return}
 const topics=[...new Set(js.map(j=>j.title))];
 $('#jobs-content').innerHTML=topics.map((title,index)=>'<details class="job-topic" '+(index===0?'open':'')+'><summary>'+esc(title)+'<span>'+js.filter(j=>j.title===title).length+(js.filter(j=>j.title===title).length===1?' student':' students')+'</span></summary><div class="job-head"><span></span><span>STUDENT / BALANCE</span><span>PIC</span><span>ACTIONS</span></div>'+js.filter(j=>j.title===title).map(j=>{
 const ended=['Done','Cancelled'].includes(j.status),cta=ended?'View':j.type==='draft'?(state.drafts[j.account]?'Review':'Draft email'):j.type==='funding'?'Review':'Record';
 return '<div class="job-row"><div class="job-type '+j.type+'">'+icon(ended?'check':j.type==='draft'?'mail':j.type==='funding'?'clock':'ledger')+'</div><div class="job-main"><button class="job-title student-link" data-account="'+j.account+'">'+esc(j.student)+'</button><div class="job-meta"><span>'+esc(j.code)+'</span><span class="sep">·</span><span>'+Model.money(j.amount)+'</span></div><div class="job-meta">'+badge(j.status,j.status==='Needs approval'?'warning':ended?'paid':'')+'<span>'+esc('Next check: '+(j.due===state.day?'Today':date(j.due)))+'</span>'+(j.stale?badge('Records changed','warning'):'')+'</div><div class="job-invoices">'+invoiceSummary(state.accounts.find(a=>a.id===j.account))+'</div></div><div class="job-pic"><span class="avatar" title="'+esc(j.pic)+'">'+esc(j.pic==='Alex'?'AL':j.pic==='Sam'?'SW':j.pic.slice(0,2))+'</span></div><div class="job-cta"><button class="small-button" data-job="'+j.id+'">'+cta+'</button></div></div>';
 }).join('')+'</details>').join('');
}
function renderCalendar(js){
 const [y,m]=state.day.split('-').map(Number),month=new Date(y,m-1+calOffset,1,12),start=new Date(month);start.setDate(1-((start.getDay()+6)%7));
 let html='<div class="calendar"><div class="calendar-title"><strong>'+month.toLocaleDateString('en-US',{month:'long',year:'numeric'})+'</strong><div><button class="icon-button" data-cal="-1" aria-label="Previous month">'+icon('chevronLeft')+'</button><button class="icon-button" data-cal="1" aria-label="Next month">'+icon('chevronRight')+'</button></div></div><div class="calendar-grid">'+['M','T','W','T','F','S','S'].map(d=>'<div class="weekday">'+d+'</div>').join('');
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const day=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');html+='<div class="cal-day '+(d.getMonth()!==month.getMonth()?'outside ':'')+(day===state.day?'today':'')+'"><span class="day-num">'+d.getDate()+'</span>'+js.filter(j=>j.due===day).map(j=>'<button class="cal-job" title="'+esc(j.title+' — '+j.student)+'" data-job="'+j.id+'">'+esc(j.student.split(' ')[0])+' · '+esc(j.type==='draft'?'Draft':j.type==='funding'?'Funding':'Payment')+'</button>').join('')+'</div>'}
 $('#jobs-content').innerHTML=html+'</div></div>';
}
function renderAccounts(){
 const q=$('#account-search').value.toLowerCase(),as=state.accounts.filter(a=>(accountFilter==='all'||Model.bucket(state,a)===accountFilter)&&[a.name,a.code,a.payer,a.pic,a.contact].join(' ').toLowerCase().includes(q));
 $$('[data-account-filter]').forEach(e=>e.classList.toggle('active',e.dataset.accountFilter===accountFilter));$('#record-count').textContent=as.length+' students';
 $('#accounts-body').innerHTML=as.map(a=>{const st=Model.status(state,a);return '<tr role="row"><td role="cell" data-label="Student"><div class="student-name"><span class="avatar">'+esc(a.initials)+'</span><div><button class="student-link" data-account="'+a.id+'">'+esc(a.name)+'</button><small>'+esc(a.code)+' · '+esc(a.pic)+'</small></div></div></td><td role="cell" data-label="Payer">'+esc(a.program||'Family')+'</td><td role="cell" data-label="Balance" class="money">'+Model.money(Model.balance(state,a))+'</td><td role="cell" data-label="Status">'+badge(st,st==='Paid'?'paid':a.payer!=='Family'?'funding':st==='Overdue'?'warning':'')+'</td><td role="cell" data-label="Outstanding invoices">'+invoiceSummary(a)+'</td><td role="cell" data-label="Actions"><button class="small-button" data-account="'+a.id+'">Details</button></td></tr>'}).join('')||'<tr><td colspan="6"><div class="empty"><h3>No matching students</h3><p>Try another name or filter.</p></div></td></tr>';
 const rs=state.receipts.filter(r=>!r.account);$('#unmatched-banner').innerHTML=rs.length?'<div class="unmatched-banner"><span>'+rs.length+' receipt needs a match · '+Model.money(rs.reduce((n,r)=>n+r.amount,0))+'</span><button data-action="reconcile">Review receipt</button></div>':'';
}
const dialog=$('#dialog');
function closeDialog(){dialog.close();returnFocus?.focus?.()}
function modal(title,sub,body,foot=''){if(!dialog.open)returnFocus=document.activeElement;$('#dialog-content').innerHTML='<div class="dialog-head"><div><h2 id="dialog-title">'+esc(title)+'</h2>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div><button class="icon-button" data-action="close" aria-label="Close dialog">'+icon('close')+'</button></div><div class="dialog-body">'+body+'<div class="form-error" id="form-error" role="alert"></div></div>'+(foot?'<div class="dialog-foot">'+foot+'</div>':'');if(!dialog.open)dialog.showModal();hydrate(dialog)}
function fail(e){if(dialog.open&&$('#form-error'))$('#form-error').textContent=e.message||String(e);else toast(e.message||String(e))}
const field=(label,id,value='',type='text',attrs='')=>'<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" value="'+esc(value)+'" '+attrs+'></div>';
function options(id=''){return state.accounts.map(a=>'<option value="'+a.id+'" '+(id===a.id?'selected':'')+'>'+esc(a.name)+' · '+Model.money(Model.balance(state,a))+'</option>').join('')}
function paymentModal(id='',amount=''){
 modal('Record a payment','Only enter a receipt you have checked.','<form id="payment-form"><div class="field"><label for="payment-student">Student</label><select id="payment-student">'+options(id)+'</select></div><div class="field-row">'+field('Amount received ($)','payment-amount',amount,'number','min="0.01" step="0.01" required')+field('Payment date','payment-date',state.day,'date','required')+'</div><div class="field"><label for="payment-channel">Payment channel</label><select id="payment-channel">'+['Bank transfer','Cash','Check','Venmo','Zelle','Apple Pay','Charter funding','ESA funding','Other'].map(v=>'<option>'+v+'</option>').join('')+'</select></div>'+field('Source / receipt reference','payment-source','','text','placeholder="e.g. Bank statement, transaction #241" required')+'<label class="checkbox-field"><input type="checkbox" id="payment-verified" required> I checked this receipt and the student it belongs to.</label><div class="form-note">This updates your local balance and jobs. TallyHall does not check your bank or payment provider.</div></form>','<button class="secondary" data-action="close">Cancel</button><button class="primary" type="submit" form="payment-form">Confirm payment</button>');
 $('#payment-form').onsubmit=e=>{e.preventDefault();try{if(!$('#payment-verified').checked)throw Error('Confirm the receipt.');Model.recordPayment(state,$('#payment-student').value,Model.cents($('#payment-amount').value),$('#payment-date').value,$('#payment-channel').value,$('#payment-source').value);save();closeDialog();toast('Payment recorded. Balances and jobs updated.')}catch(e){fail(e)}};
}
function accountModal(id){
 const a=state.accounts.find(a=>a.id===id);if(!a)return;const rs=state.receipts.filter(r=>r.account===id);
 const communications=[...(state.communications||[]).filter(c=>c.account===id)];
 const legacy=state.drafts[id];if(legacy&&!communications.some(c=>c.id===legacy.id))communications.push({...legacy,type:'draft',date:legacy.created?.slice(0,10)||state.day,invoices:Model.outstanding(state,a)});
 const history=communications.sort((a,b)=>b.date.localeCompare(a.date)||(b.at||b.created||'').localeCompare(a.at||a.created||'')).map(c=>'<div class="history-row">'+badge(c.type==='sent'?'Sent · staff confirmed':c.type==='draft'?(c.reviewed?'Draft · reviewed':'Draft · unreviewed'):'Follow-up note',c.type==='sent'?'paid':'')+' <strong>'+esc(c.date)+'</strong><p>'+esc(c.subject||c.body)+'</p><small>'+esc((c.invoices||[]).map(i=>Model.monthLabel(i.month)).join(', '))+'</small><details><summary>Read record</summary><p class="communication-body">'+esc(c.body)+'</p></details></div>').join('');
 modal(a.name,a.code+' · '+a.payer+' · PIC: '+a.pic,'<div class="details-grid">'+[['Tuition charges',Model.money(a.charge)],['Remaining balance',Model.money(Model.balance(state,a))],['Confirmed receipts',Model.money(Model.paid(state,id))],['Status',Model.status(state,a)],['Payer contact',a.contact],['Record source',a.source],['Last reminder sent',Model.lastReminder(state,id)||'None recorded'],['Last updated',a.updated]].map(([k,v])=>'<div><div class="detail-label">'+esc(k)+'</div><div class="detail-value">'+esc(v)+'</div></div>').join('')+'</div><div class="account-section"><h3>Outstanding balances</h3><button class="text-button" data-action="add-invoice" data-id="'+id+'">Add tuition month</button></div>'+invoiceSummary(a)+'<div class="form-note">Confirmed receipts are applied to the oldest invoice first. Original invoice due dates stay fixed when follow-ups are rescheduled.</div><h3>Payment history</h3>'+rs.map(r=>'<div class="receipt-row"><span>'+esc(r.channel)+'<small>'+esc(r.source)+' · '+esc(r.date)+'</small></span><strong>'+Model.money(r.amount)+'</strong><button class="text-button" data-action="correct-receipt" data-id="'+r.id+'">Correct</button></div>').join('')+(!rs.length?'<p class="form-note">No confirmed receipts yet.</p>':'')+'<div class="account-section"><h3>Communication history</h3><button class="text-button" data-action="followup-note" data-id="'+id+'">Add note</button></div>'+(history||'<p class="form-note">No reminders or notes recorded.</p>')+'<div class="form-note">Sending dates are staff-reported. Copying or exporting a draft does not record sending.</div>',
 '<button class="secondary" data-action="job-settings" data-id="'+id+'">Job details</button>'+(a.payer!=='Family'?'<button class="secondary" data-action="funding" data-id="'+id+'">Update funding</button>':'')+(Model.balance(state,a)>0&&(a.payer==='Family'||a.approval==='Pending')?'<button class="secondary" data-action="draft" data-id="'+id+'">Reminder</button>':'')+(Model.balance(state,a)>0?'<button class="primary" data-action="payment" data-id="'+id+'">Record payment</button>':'<button class="primary" data-action="close">Done</button>'));
}
function invoiceModal(id){
 modal('Add tuition month','Keep the original due date with this invoice.','<form id="invoice-form"><div class="field-row">'+field('Tuition month','invoice-month',state.day.slice(0,7),'month','required')+field('Charge ($)','invoice-amount','','number','min="0.01" step="0.01" required')+'</div>'+field('Original due date','invoice-due',state.day,'date','required')+field('Source record','invoice-source','','text','required')+'</form>','<button class="secondary" data-action="close">Cancel</button><button class="primary" form="invoice-form" type="submit">Add invoice</button>');
 $('#invoice-form').onsubmit=e=>{e.preventDefault();try{Model.addInvoice(state,id,$('#invoice-month').value,Model.cents($('#invoice-amount').value),$('#invoice-due').value,$('#invoice-source').value);save();accountModal(id);toast('Tuition month added. Jobs updated.')}catch(e){fail(e)}};
}
function followupNoteModal(id){
 modal('Add follow-up note','Linked to this student’s outstanding invoices.','<form id="note-form"><div class="field"><label for="followup-note">Note</label><textarea id="followup-note" required></textarea></div></form>','<button class="secondary" data-action="close">Cancel</button><button class="primary" form="note-form" type="submit">Save note</button>');
 $('#note-form').onsubmit=e=>{e.preventDefault();try{Model.addFollowup(state,id,$('#followup-note').value);save();accountModal(id)}catch(e){fail(e)}};
}
function sentModal(id){
 checkedDraft(id);
 modal('Record reminder sent','Confirm only after sending from your own email app.','<form id="sent-form">'+field('Actual sent date','sent-date',state.day,'date','required max="'+state.day+'"')+'<label class="checkbox-field"><input id="sent-confirm" type="checkbox" required> I sent this reviewed reminder to the displayed recipient outside TallyHall.</label><div class="form-note">'+esc(state.drafts[id].to)+' · '+esc(state.drafts[id].subject)+'</div></form>','<button class="secondary" data-action="close">Cancel</button><button class="primary" form="sent-form" type="submit">Confirm sent date</button>');
 $('#sent-form').onsubmit=e=>{e.preventDefault();try{if(!$('#sent-confirm').checked)throw Error('Confirm the reminder was sent.');Model.confirmSent(state,id,$('#sent-date').value);save();accountModal(id);toast('Staff-confirmed sending recorded.')}catch(e){fail(e)}};
}
function correctionModal(id){
 const r=state.receipts.find(r=>r.id===id);
 modal('Correct a receipt','Changes are kept in the activity history.','<form id="correct-form"><div class="field-row">'+field('Correct amount ($)','correct-amount',r.amount/100,'number','min="0.01" step="0.01" required')+field('Payment date','correct-date',r.date,'date','required')+'</div>'+field('Source','correct-source',r.source,'text','required')+field('Reason for correction','correct-reason','','text','required')+'<div class="form-note">A correction can reopen a collection job or make an old draft out of date.</div></form>','<button class="secondary" data-action="close">Cancel</button><button class="primary" form="correct-form" type="submit">Confirm correction</button>');
 $('#correct-form').onsubmit=e=>{e.preventDefault();try{Model.correctReceipt(state,id,Model.cents($('#correct-amount').value),$('#correct-date').value,$('#correct-source').value,$('#correct-reason').value);save();closeDialog();toast('Receipt corrected. Jobs recalculated.')}catch(e){fail(e)}};
}
function fundingModal(id){
 const a=state.accounts.find(a=>a.id===id);
 modal('Update funding',a.name+' · '+a.program,'<form id="funding-form"><div class="field"><label for="funding-approval">Approval</label><select id="funding-approval"><option '+(a.approval==='Pending'?'selected':'')+'>Pending</option><option '+(a.approval==='Approved'?'selected':'')+'>Approved</option></select></div><label class="checkbox-field"><input id="funding-submitted" type="checkbox" '+(a.submitted?'checked':'')+'> Invoice was submitted externally</label>'+field('Confirmation source','funding-source',a.source,'text','required')+'<div class="form-note">Check your program portal or correspondence first. This only records the result locally.</div></form>','<button class="secondary" data-action="close">Cancel</button><button class="primary" type="submit" form="funding-form">Confirm update</button>');
 $('#funding-form').onsubmit=e=>{e.preventDefault();try{Model.updateFunding(state,id,$('#funding-approval').value,$('#funding-submitted').checked,$('#funding-source').value);save();closeDialog();toast('Funding updated. Jobs recalculated.')}catch(e){fail(e)}};
}
function draftModal(id){
 const a=state.accounts.find(a=>a.id===id);if(!a)return;if(!Model.balance(state,a)||(a.payer!=='Family'&&a.approval!=='Pending')){accountModal(id);return}
 let d=state.drafts[id];if(!d){try{d=Model.makeDraft(state,id);save()}catch(e){toast(e.message);return}}
 const stale=d.fingerprint!==Model.fingerprint(state,a);
 modal('Prepare an email',a.name+' · '+(a.payer==='Family'?'Family payment':'Program follow-up'),'<div class="form-note">Last reminder sent: '+esc(Model.lastReminder(state,id)||'None recorded')+'. Check communication history before following up. <button class="text-button" data-account="'+id+'">View history</button></div><form id="draft-form">'+field('Recipient','draft-to',d.to,'email','required')+field('Subject','draft-subject',d.subject,'text','required')+'<div class="field"><label for="draft-body">Message</label><textarea id="draft-body" required>'+esc(d.body)+'</textarea></div>'+(stale?'<div class="form-note warning">Records changed. Regenerate this draft before reviewing.</div>':'')+'<label class="checkbox-field"><input type="checkbox" id="draft-reviewed" '+(d.reviewed&&!stale?'checked':'')+'> I reviewed the recipient, amount, and message against current records.</label><div class="form-note">Copy or export this draft and send it from your email app. “Done” means ready, not sent or paid.</div></form>','<button class="secondary" data-action="record-sent" data-id="'+id+'" '+(!d.reviewed||stale?'disabled':'')+'>Record sent</button><button class="secondary" data-action="job-settings" data-id="'+id+'">Schedule</button><button class="secondary" data-action="regenerate" data-id="'+id+'">Regenerate</button><button class="secondary" data-action="export-draft" data-id="'+id+'">Export .txt</button><button class="secondary" data-action="copy-draft" data-id="'+id+'">Copy draft</button><button class="primary" form="draft-form" type="submit">Mark reviewed & ready</button>');
 $('#draft-form').onsubmit=e=>{e.preventDefault();try{if(!$('#draft-reviewed').checked)throw Error('Review the draft and tick the confirmation.');Model.reviewDraft(state,id,{to:$('#draft-to').value,subject:$('#draft-subject').value,body:$('#draft-body').value});save();draftModal(id);toast('Draft reviewed and ready. Drafting job marked Done.')}catch(e){fail(e)}};
}
function checkedDraft(id){const d=state.drafts[id],a=state.accounts.find(a=>a.id===id);if(!d?.reviewed||d.fingerprint!==Model.fingerprint(state,a)||!Model.balance(state,a))throw Error('Mark the current draft reviewed and ready first.');if($('#draft-to')&&($('#draft-to').value!==d.to||$('#draft-subject').value!==d.subject||$('#draft-body').value!==d.body))throw Error('The draft has edits. Review and save them first.');return 'To: '+d.to+'\nSubject: '+d.subject+'\n\n'+d.body}
function jobSettings(id,due=null){const a=state.accounts.find(a=>a.id===id),j=Model.jobs(state).find(j=>j.id===currentJobId&&j.account===id)||Model.jobs(state).find(j=>j.account===id&&j.type==='draft')||Model.jobs(state).find(j=>j.account===id);
 modal('Job details',a.name,'<form id="job-settings-form"><div class="field-row">'+field('Person in charge','job-pic',j.pic,'text','required')+field('Next-check date','job-due',due||j.due,'date','required')+'</div><div class="form-note"><strong>What counts as Done</strong><br>'+esc(j.condition)+'<br><br><strong>Next actor:</strong> '+esc(j.next)+'</div>'+field('Reason for this change','job-reason','','text','required')+'</form>','<button class="secondary" data-action="close">Cancel</button><button class="primary" type="submit" form="job-settings-form">Save changes</button>');
 $('#job-settings-form').onsubmit=e=>{e.preventDefault();try{const pic=$('#job-pic').value.trim(),reason=$('#job-reason').value.trim(),due=$('#job-due').value;if(!pic||!reason||!Model.validDate(due))throw Error('Complete the owner, date, and reason.');state.overrides[j.id]={pic,due};Model.log(state,'Updated '+j.title+': '+reason,{account:id});save();closeDialog();toast('Job updated in list and calendar.')}catch(e){fail(e)}};
}
function openJob(id){currentJobId=id;const j=Model.jobs(state).find(j=>j.id===id);if(!j)return;if(j.type==='draft'&&j.status!=='Cancelled')draftModal(j.account);else if((j.type==='funding'||j.type==='approval')&&j.status!=='Done')fundingModal(j.account);else if(j.type==='collection'&&j.status!=='Done')paymentModal(j.account,(j.amount/100).toString());else accountModal(j.account)}
function reconcileModal(){
 const rs=state.receipts.filter(r=>!r.account);if(!rs.length){toast('All receipts are matched.');return}
 modal('Match a receipt','Confirm the student from the original payment record.','<form id="match-form"><div class="field"><label for="match-receipt">Receipt</label><select id="match-receipt">'+rs.map(r=>'<option value="'+r.id+'">'+Model.money(r.amount)+' · '+esc(r.source)+'</option>').join('')+'</select></div><div class="field"><label for="match-account">Student</label><select id="match-account"><option value="">Choose after checking the source</option>'+options()+'</select></div><label class="checkbox-field"><input type="checkbox" id="match-confirm" required> I confirmed this receipt belongs to the selected student.</label></form>','<button class="secondary" data-action="close">Cancel</button><button class="primary" type="submit" form="match-form">Confirm match</button>');
 $('#match-form').onsubmit=e=>{e.preventDefault();try{if(!$('#match-confirm').checked)throw Error('Confirm the receipt match.');Model.matchReceipt(state,$('#match-receipt').value,$('#match-account').value);save();closeDialog();toast('Receipt matched. Balances updated.')}catch(e){fail(e)}};
}
function download(name,text,type='text/plain'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
const csvCell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
function exportRecords(){const rows=[['student','payer','tuition_month','charge','received','balance','original_due','days_past_due','last_reminder_sent','status','source','updated'],...state.accounts.flatMap(a=>Model.invoices(state,a).map(i=>[a.name,a.program||a.payer,i.month,i.charge/100,i.paid/100,i.balance/100,i.due,i.daysPastDue,Model.lastReminder(state,a.id,i.id)||'',Model.status(state,a),i.source,a.updated]))];download('tallyhall-tuition-'+state.day+'.csv',rows.map(r=>r.map(csvCell).join(',')).join('\n'),'text/csv');Model.log(state,'Exported tuition summary.');save();toast('Tuition summary exported.')}
function importModal(){
 pendingImport=null;modal('Import payment records','Preview every row before changing local records.','<p>Payments must match an existing student. Required columns: <strong>student, amount, date, source</strong>. Optional: channel and id.</p><button class="secondary" data-action="sample-csv">Download sample CSV</button><div class="dropzone"><label for="import-file">Choose a CSV file</label><br><br><input id="import-file" type="file" accept=".csv,text/csv"></div><div id="import-preview"></div><label class="checkbox-field"><input type="checkbox" id="import-confirm"> I checked these records against their sources.</label>','<button class="secondary" data-action="close">Cancel</button><button class="primary" id="apply-import" data-action="apply-import" disabled>Import verified payments</button>');
 $('#import-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error('Choose a CSV under 2 MB.');pendingImport=Model.importPreview(state,await file.text());$('#import-preview').innerHTML='<div class="form-note">Field mapping: Student → account · Amount → receipt · Date → payment date · Source → evidence</div><div class="table-scroll"><table class="statement"><tr><th>Student</th><th>Amount</th><th>Check</th></tr>'+pendingImport.map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+Model.money(r.amount)+'</td><td class="'+(r.error?'invalid':'')+'">'+esc(r.error||'Ready')+'</td></tr>').join('')+'</table></div>';$('#apply-import').disabled=pendingImport.some(r=>r.error)||!pendingImport.length}catch(e){pendingImport=null;$('#apply-import').disabled=true;fail(e)}};
}
function addAccountModal(){
 modal('Add a student','Create a local tuition account for this billing cycle.','<form id="account-form"><div class="field-row">'+field('Student name','new-name','','text','required')+field('Tuition charge ($)','new-charge','','number','min="0.01" step="0.01" required')+'</div><div class="field-row">'+field('Due date','new-due',state.day,'date','required')+field('Person in charge','new-pic','Alex','text','required')+'</div><div class="field"><label for="new-payer">Payer</label><select id="new-payer"><option>Family</option><option>Charter program</option><option>ESA program</option></select></div>'+field('Family or program contact','new-contact','','text','required')+field('Contact email','new-email','','email','required')+field('Source record','new-source','','text','required')+'</form>','<button class="secondary" data-action="close">Cancel</button><button class="primary" type="submit" form="account-form">Create account</button>');
 $('#account-form').onsubmit=e=>{e.preventDefault();try{const name=$('#new-name').value.trim(),payer=$('#new-payer').value;if(state.accounts.some(a=>a.name.toLowerCase()===name.toLowerCase()))throw Error('A student with this name already exists.');const a={id:Model.uid(),name,code:'Student '+(state.accounts.length+1),initials:name.split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase(),charge:Model.cents($('#new-charge').value),due:$('#new-due').value,pic:$('#new-pic').value.trim(),payer,program:payer==='Family'?null:payer,contact:$('#new-contact').value.trim(),email:$('#new-email').value.trim(),source:$('#new-source').value.trim(),approval:payer==='Family'?'Not required':'Pending',submitted:false,updated:state.day};if(!Model.validDate(a.due)||!a.name||!a.pic||!a.contact||!a.source)throw Error('Complete all the fields.');state.accounts.push(a);Model.log(state,'Created tuition account for '+a.name,{account:a.id});save();closeDialog();toast('Student added. Tuition jobs created.')}catch(e){fail(e)}};
}
function historyModal(){modal('Activity','Actions recorded on this device.',state.history.length?state.history.map(h=>'<div class="history-row">'+esc(h.text)+'<small>'+new Date(h.at).toLocaleString()+(h.source?' · '+esc(h.source):'')+'</small></div>').join(''):'<p>No changes yet. Try preparing a draft or recording a payment.</p>','<button class="primary" data-action="close">Close</button>')}
function settingsModal(){
 modal('Local data','Stored in this browser on this device.','<p>Back up your records before clearing browser storage or moving to another device.</p><div class="button-row"><button class="secondary" data-action="backup">Export backup</button><button class="secondary" data-action="export">Export tuition CSV</button></div><div class="field" style="margin-top:22px"><label for="restore-file">Restore a TallyHall JSON backup</label><input id="restore-file" type="file" accept=".json,application/json"></div><div id="restore-preview"></div><div class="form-note">The assistant is a local intent demo for common tuition requests. No AI service or email integration is connected.</div><button class="text-button danger" data-action="reset">Reset fictional demo records</button>','<button class="primary" data-action="close">Done</button>');
 $('#restore-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>3000000)throw Error('Backup must be under 3 MB.');const restored=Model.validate(JSON.parse(await file.text()));$('#restore-preview').innerHTML='<div class="form-note warning">Replace local data with '+restored.accounts.length+' students and '+restored.receipts.length+' receipts? Export your current backup first.</div><button class="secondary" id="confirm-restore">Replace with this backup</button>';$('#confirm-restore').onclick=()=>{state=restored;state.day=Model.localDay();save();closeDialog();toast('Backup restored.')}}catch(e){fail(e)}};
}
function assistantAsk(text){
 toggleAssistant(true);
 text=text.trim();if(!text)return;const conv=$('#conversation');conv.insertAdjacentHTML('beforeend','<div class="message user">'+esc(text)+'</div>');
 const q=text.toLowerCase(),as=state.accounts.filter(a=>q.includes(a.name.toLowerCase())||q.includes(a.code.toLowerCase())||q.includes(a.name.split(' ')[0].toLowerCase()));let r='',act='';
 if(/schedule|reschedule|plan.*follow|follow.*tomorrow/.test(q)){
 if(as.length!==1)r='Name one student and a date, for example “Schedule a follow-up for Student A tomorrow”.';
 else{let due=q.match(/\d{4}-\d{2}-\d{2}/)?.[0]||(/tomorrow/.test(q)?Model.shift(state.day,1):state.day);
 const weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],wi=weekdays.findIndex(d=>q.includes(d));if(wi>=0){let delta=(wi-new Date(state.day+'T12:00:00').getDay()+7)%7;if(!delta&&q.includes('next'))delta=7;due=Model.shift(state.day,delta)}
 if(!Model.validDate(due))r='Use a valid date, such as tomorrow or 2026-11-27.';
 else{r='Plan a follow-up for '+as[0].name+' on '+due+'. Review the owner, date, and reason before saving. This does not schedule email delivery.';act='<button data-action="schedule" data-id="'+as[0].id+'" data-date="'+due+'">Review follow-up date</button>';}
 }
 }
 else if(/record|add.*payment|paid/.test(q)&&/\$|\d/.test(q)){const n=text.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);if(as.length!==1||!n)r='Please name one student and an amount, for example “Record $200 for Student A”.';else{r='Prepare a '+Model.money(Model.cents(n[1]))+' payment for '+as[0].name+'. Check the receipt, date, and source before confirming.';act='<button data-action="payment" data-id="'+as[0].id+'" data-amount="'+n[1]+'">Review payment</button>'}}
 else if(/draft|reminder|email/.test(q)){if(as.length!==1)r='Name one student, for example “Draft a reminder for Student A”.';else if(!Model.balance(state,as[0]))r=as[0].name+' has no outstanding balance. No reminder is needed.';else{r='Prepare a draft for '+as[0].name+'. '+(as[0].payer==='Family'?'The family balance is '+Model.money(Model.balance(state,as[0]))+'.':'This goes to the funding contact, not the family.');act='<button data-action="draft" data-id="'+as[0].id+'">Prepare draft</button>'}}
 else if(/overdue|late|owes|owe/.test(q)){const rows=state.accounts.filter(a=>a.payer==='Family'&&Model.originalDue(state,a)<state.day&&Model.balance(state,a)>0);r=rows.length?rows.map(a=>a.name+': '+Model.money(Model.outstanding(state,a).filter(i=>i.due<state.day).reduce((n,i)=>n+i.balance,0))+' overdue since '+date(Model.originalDue(state,a))+'. Source: '+a.source+'.').join('\n'):'No overdue family balances in the current local records.';act='<button data-action="show-records" data-filter="action">Open family balances</button>'}
 else if(/funding|charter|esa|pending/.test(q)){const rows=state.accounts.filter(a=>a.payer!=='Family'&&Model.balance(state,a)>0);r=(rows.length?rows.map(a=>a.name+': '+Model.money(Model.balance(state,a))+' — '+Model.status(state,a)+'.').join('\n'):'No program balances are outstanding.')+'\nProgram follow-ups are separate from family reminders.';act='<button data-action="show-records" data-filter="funding">Open funding records</button>'}
 else if(/summary|report|export|total/.test(q)){const s=Model.summary(state);r='Confirmed receipts: '+Model.money(s.received)+'\nAwaiting program funding: '+Model.money(s.funding)+'\nOverdue tuition: '+Model.money(s.overdue)+'\nUnmatched receipts: '+Model.money(s.unmatched)+'\nBased on local records dated '+state.day+'.';act='<button data-action="export">Export tuition CSV</button>'}
 else if(as.length===1){const a=as[0];r=a.name+': '+Model.money(Model.balance(state,a))+' remaining. '+Model.status(state,a)+'. PIC: '+a.pic+'. Source: '+a.source+'. Updated: '+a.updated+'.';act='<button data-account="'+a.id+'">Open account</button>'}
 else r='This local demo understands overdue balances, pending funding, summaries, drafts, and payments for a named student. Try “Show overdue balances” or “Record $200 for Student A”.';
 conv.insertAdjacentHTML('beforeend','<div class="message assistant">'+esc(r)+(act?'<div class="message-actions">'+act+'</div>':'')+'</div>');conv.lastElementChild.scrollIntoView({block:'nearest',behavior:'smooth'});
}
const order=['settled','funding','action'];let selected='action',target=2,frame=0,last=0,visible=true,idle=0,touched=performance.now(),positions=[0,0,36],lastOrder='';
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),parts=window.CABINET.parts.map(p=>({...p,el:$('#'+p.id)}));
function updateCabinetReadout(){for(const key of order)$('#count-'+key).textContent=state.accounts.filter(a=>Model.bucket(state,a)===key).length;const n=state.accounts.filter(a=>Model.bucket(state,a)===selected).length;$('#cabinet-readout').textContent=n+' '+(n===1?'record':'records');$$('[data-drawer-key]').forEach(e=>e.classList.toggle('selected',e.dataset.drawerKey===selected))}
function chooseCabinet(key,commit=false){selected=key;target=order.indexOf(key);touched=performance.now();updateCabinetReadout();runCabinet();if(commit){accountFilter=key;navigate('tuition');renderAccounts()}}
function tickCabinet(now){
 const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
 if(!reduced.matches&&now-touched>6000){idle+=dt;if(idle>3.4){idle=0;target=(target+1)%3;selected=order[target];updateCabinetReadout()}}
 let moving=false;positions=positions.map((p,i)=>{const want=i===target?36:0;let v=reduced.matches?want:p+(want-p)*(1-Math.exp(-dt/.22));if(Math.abs(v-want)<.005)v=want;else moving=true;return v});
 const vec=window.CABINET.vector,P=window.CABINET.P,depthY=Math.sin(P.azimuth*Math.PI/180)*Math.cos(P.elevation*Math.PI/180);
 for(const p of parts){const t=p.drawer>=0?positions[p.drawer]:0;p.el.setAttribute('transform','translate('+(vec[0]*t).toFixed(3)+' '+(vec[1]*t).toFixed(3)+')');p.el.classList.toggle('chosen',p.drawer===target);
 const paper=p.name.match(/^(?:Index card|Divider tab) \d (\d)$/);if(paper){const n=state.accounts.filter(a=>Model.bucket(state,a)===order[p.drawer]).length;p.el.style.display=+paper[1]<n?'':'none'}
 p.currentKey=p.key+t*depthY}
 const sorted=[...parts].sort((a,b)=>a.currentKey-b.currentKey),ids=sorted.map(p=>p.id).join(',');if(ids!==lastOrder){const frag=document.createDocumentFragment();sorted.forEach(p=>frag.append(p.el));$('#cabinet-stage svg').append(frag);lastOrder=ids}
 $('#cabinet-hint').textContent=moving?'Opening drawer…':'Select a drawer to explore';
 frame=visible&&!document.hidden&&!reduced.matches?requestAnimationFrame(tickCabinet):0;
}
function runCabinet(){if(!frame){last=0;frame=requestAnimationFrame(tickCabinet)}}
new IntersectionObserver(es=>{visible=es.at(-1).isIntersecting;if(visible)runCabinet()},{rootMargin:'100px'}).observe($('#cabinet-stage'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&visible)runCabinet()});reduced.addEventListener('change',runCabinet);
$('#cabinet-stage').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(e.key)){e.preventDefault();let n=target;if(e.key==='ArrowLeft')n=(n+2)%3;if(e.key==='ArrowRight')n=(n+1)%3;if(e.key==='Home')n=0;if(e.key==='End')n=2;chooseCabinet(order[n],['Enter',' '].includes(e.key))}});
$('#cabinet-stage').addEventListener('pointermove',e=>{const p=e.target.closest('.cab-part');if(p&&+p.dataset.drawer>=0&&+p.dataset.drawer!==target)chooseCabinet(order[+p.dataset.drawer])});
$('#cabinet-stage').addEventListener('click',e=>{const p=e.target.closest('.cab-part');if(p&&+p.dataset.drawer>=0)chooseCabinet(order[+p.dataset.drawer],true)});
$('#assistant-form').onsubmit=e=>{e.preventDefault();try{assistantAsk($('#assistant-query').value);$('#assistant-query').value=''}catch(e){toast(e.message)}};
$('#pic-filter').onchange=renderJobs;$('#account-search').oninput=renderAccounts;
dialog.addEventListener('click',e=>{if(e.target===dialog)closeDialog()});dialog.addEventListener('cancel',()=>returnFocus?.focus?.());
document.addEventListener('click',async e=>{
 const t=e.target.closest('button,a');if(!t)return;
 try{
 if(t.dataset.page){e.preventDefault();navigate(t.dataset.page)}
 else if(t.dataset.jobFilter){jobFilter=t.dataset.jobFilter;renderJobs()}
 else if(t.dataset.view){jobView=t.dataset.view;renderJobs()}
 else if(t.dataset.accountFilter){accountFilter=t.dataset.accountFilter;renderAccounts()}
 else if(t.dataset.cal){calOffset+=+t.dataset.cal;renderJobs()}
 else if(t.dataset.drawerKey)chooseCabinet(t.dataset.drawerKey,true);
 else if(t.dataset.job)openJob(t.dataset.job);
 else if(t.dataset.account)accountModal(t.dataset.account);
 else if(t.dataset.prompt){navigate('assistant');assistantAsk(t.dataset.prompt)}
 else switch(t.dataset.action){
 case 'close':closeDialog();break;
 case 'toggle-assistant':toggleAssistant();break;
 case 'clear-chat':$('#conversation').innerHTML='';break;
 case 'payment':paymentModal(t.dataset.id||'',t.dataset.amount||'');break;
 case 'correct-receipt':correctionModal(t.dataset.id);break;
 case 'funding':fundingModal(t.dataset.id);break;
 case 'add-invoice':invoiceModal(t.dataset.id);break;
 case 'followup-note':followupNoteModal(t.dataset.id);break;
 case 'record-sent':sentModal(t.dataset.id);break;
 case 'draft':draftModal(t.dataset.id);break;
 case 'job-settings':jobSettings(t.dataset.id);break;
 case 'schedule':currentJobId='draft:'+t.dataset.id;jobSettings(t.dataset.id,t.dataset.date);break;
 case 'regenerate':Model.makeDraft(state,t.dataset.id);save();draftModal(t.dataset.id);break;
 case 'copy-draft':{const text=checkedDraft(t.dataset.id);try{await navigator.clipboard.writeText(text)}catch{const a=document.createElement('textarea');a.value=text;dialog.append(a);a.select();const ok=document.execCommand('copy');a.remove();if(!ok)throw Error('Copy is unavailable. Export the draft instead.')}Model.log(state,'Copied reviewed email draft',{account:t.dataset.id});save();toast('Draft copied. Send it from your own email app.');break}
 case 'export-draft':download('tuition-draft-'+t.dataset.id+'.txt',checkedDraft(t.dataset.id));Model.log(state,'Exported reviewed email draft',{account:t.dataset.id});save();toast('Draft exported for manual sending.');break;
 case 'backup':download('tallyhall-backup-'+state.day+'.json',JSON.stringify(state,null,2),'application/json');toast('Local backup exported.');break;
 case 'export':exportRecords();break;
 case 'import':importModal();break;
 case 'sample-csv':download('tallyhall-payments-sample.csv','student,amount,date,source,channel,id\nStudent A,50.00,'+state.day+',Bank statement row 25,Bank transfer,sample-001\n','text/csv');break;
 case 'apply-import':if(!$('#import-confirm').checked)throw Error('Confirm you checked the import sources.');Model.applyImport(state,pendingImport||[]);save();closeDialog();toast('Payments imported. Balances and jobs updated.');break;
 case 'reconcile':reconcileModal();break;
 case 'add-account':addAccountModal();break;
 case 'history':historyModal();break;
 case 'settings':settingsModal();break;
 case 'tool-details':toolModal(t.dataset.tool);break;
 case 'tool-connect':setDemoConnection(t.dataset.tool,true);break;
 case 'tool-disconnect':setDemoConnection(t.dataset.tool,false);break;
 case 'show-records':accountFilter=t.dataset.filter||'all';navigate('tuition');renderAccounts();break;
 case 'reset':modal('Reset demo records?','This replaces data stored in this browser.','<p>Export a backup first to keep your changes.</p>','<button class="secondary" data-action="close">Cancel</button><button class="primary" data-action="confirm-reset">Reset demo</button>');break;
 case 'confirm-reset':state=Model.seed();save();closeDialog();toast('Fictional demo records reset.');break;
 case 'help':modal('A local TallyHall prototype','Three features. One set of records.','<p>Today shows automatic tuition jobs. Tuition & payments holds balances, confirmed receipts, and CSV imports. The local assistant opens the same actions through common phrases.</p><div class="form-note">No bank, portal, email, or AI service is connected. You review drafts and send them manually. All students and contacts are fictional.</div><p><strong>Try:</strong> Draft Maya’s reminder, mark it reviewed and ready, then record her remaining $200. The collection job finishes automatically.</p>','<button class="primary" data-action="close">Got it</button>');break;
 }
 }catch(err){fail(err)}
});
hydrate();render();renderTools();runCabinet();if(loadWarning)toast(loadWarning);
window.TallyHall={get state(){return state},Model,render,navigate,chooseCabinet,openJob,accountModal,paymentModal,draftModal,assistantAsk,save,toggleAssistant};
setInterval(()=>{const day=Model.localDay();if(day!==state.day){state.day=day;render()}},60000);
})();
