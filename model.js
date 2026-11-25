'use strict';
const Model = (() => {
  const localDay=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
  const shift=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n%100?2:0}).format(n/100);
  const cents=v=>{if(!/^\d+(?:\.\d{1,2})?$/.test(String(v).trim()))throw Error('Enter a positive amount with up to two decimal places.');const n=Math.round(Number(v)*100);if(!Number.isSafeInteger(n)||n<=0||n>100000000)throw Error('Enter an amount between $0.01 and $1,000,000.');return n};
  const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
  const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
  const seed=(day=localDay())=>({version:1,day,accounts:[
    {id:'a',name:'Maya Chen',code:'Student A',initials:'MC',contact:'Jamie Chen',email:'jamie@example.test',payer:'Family',pic:'Alex',charge:50000,due:shift(day,-3),program:null,approval:'Not required',submitted:false,source:'November tuition sheet',updated:day},
    {id:'b',name:'Noah Williams',code:'Student B',initials:'NW',contact:'Charter funding team',email:'funding@example.test',payer:'Charter program',pic:'Alex',charge:75000,due:shift(day,-2),program:'Oak Charter',approval:'Pending',submitted:false,source:'Manually entered approval notes',updated:day},
    {id:'c',name:'Sofia Martinez',code:'Student C',initials:'SM',contact:'Taylor Martinez',email:'taylor@example.test',payer:'Family',pic:'Alex',charge:50000,due:shift(day,-3),program:null,approval:'Not required',submitted:false,source:'November tuition sheet',updated:day},
    {id:'d',name:'Leo Park',code:'Student D',initials:'LP',contact:'Morgan Park',email:'morgan@example.test',payer:'Family',pic:'Alex',charge:45000,due:day,program:null,approval:'Not required',submitted:false,source:'November tuition sheet',updated:day},
    {id:'e',name:'Amelia Brooks',code:'Student E',initials:'AB',contact:'ESA program team',email:'esa@example.test',payer:'ESA program',pic:'Sam',charge:60000,due:shift(day,4),program:'Learning ESA',approval:'Approved',submitted:true,source:'Staff-confirmed funding record',updated:day},
    {id:'f',name:'Oliver Reed',code:'Student F',initials:'OR',contact:'Jordan Reed',email:'jordan@example.test',payer:'Family',pic:'Sam',charge:50000,due:shift(day,-1),program:null,approval:'Not required',submitted:false,source:'November tuition sheet',updated:day}
  ],receipts:[
    {id:'r1',account:'a',amount:30000,date:shift(day,-5),channel:'Bank transfer',source:'Bank statement, row 14'},
    {id:'r2',account:'c',amount:50000,date:shift(day,-4),channel:'Cash',source:'Receipt #104'},
    {id:'r3',account:'d',amount:22500,date:shift(day,-2),channel:'Venmo',source:'Staff-confirmed Venmo record'},
    {id:'r4',account:'f',amount:50000,date:shift(day,-2),channel:'Check',source:'Check #826'},
    {id:'r5',account:null,amount:7500,date:shift(day,-1),channel:'Bank transfer',source:'Bank statement: missing student name'}
  ],drafts:{},overrides:{},history:[],settings:{school:'Willow Creek Microschool',operator:'Alex'}});
  const paid=(s,id)=>s.receipts.filter(r=>r.account===id).reduce((n,r)=>n+r.amount,0);
  const balance=(s,a)=>Math.max(0,a.charge-paid(s,a.id));
  const credit=(s,a)=>Math.max(0,paid(s,a.id)-a.charge);
  const bucket=(s,a)=>balance(s,a)===0?'settled':a.payer==='Family'?'action':'funding';
  const status=(s,a)=>balance(s,a)===0?'Paid':a.payer!=='Family'?(a.approval==='Pending'?'Approval pending':a.submitted?'Awaiting funding':'Invoice not submitted'):a.due<s.day?'Overdue':a.due===s.day?'Due today':'Upcoming';
  const fingerprint=(s,a)=>[balance(s,a),a.contact,a.email,a.approval,a.submitted,a.due].join('|');
  const summary=s=>({billed:s.accounts.reduce((n,a)=>n+a.charge,0),received:s.receipts.filter(r=>r.account).reduce((n,r)=>n+r.amount,0),outstanding:s.accounts.reduce((n,a)=>n+balance(s,a),0),funding:s.accounts.filter(a=>a.payer!=='Family').reduce((n,a)=>n+balance(s,a),0),overdue:s.accounts.filter(a=>a.payer==='Family'&&a.due<s.day).reduce((n,a)=>n+balance(s,a),0),unmatched:s.receipts.filter(r=>!r.account).reduce((n,r)=>n+r.amount,0)});
  function jobs(s) {
    const out=[];
    for(const a of s.accounts){
      const bal=balance(s,a), draft=s.drafts[a.id], fp=fingerprint(s,a), relevant=bal>0&&(a.payer==='Family'?a.due<=s.day:a.approval==='Pending');
      const common={account:a.id,student:a.name,code:a.code,pic:a.pic,amount:bal,due:a.due,updated:a.updated};
      if(a.payer==='Family')out.push({...common,id:'collect:'+a.id,type:'collection',title:'Collect tuition balance',status:bal===0?'Done':'Waiting',next:a.contact,reason:bal===0?'Confirmed receipts cover tuition.':'Waiting for a family payment.',condition:'Confirmed receipts cover the full balance.'});
      else {
out.push({...common,id:'approval:'+a.id,type:'approval',title:'Confirm program approval',status:a.approval==='Approved'?'Done':'Waiting',next:a.contact,reason:a.approval==='Pending'?'Program approval is incomplete.':'Staff confirmed program approval.',condition:'Staff records approval and its source.'});
out.push({...common,id:'fund:'+a.id,type:'funding',title:a.approval==='Pending'?'Await program approval':a.submitted?'Check funding payment':'Record invoice submission',status:bal===0?'Done':'Waiting',next:a.contact,reason:a.approval==='Pending'?'Approval is needed before invoicing.':a.submitted?'Program funding has not arrived.':'Invoice still needs to be submitted externally.',condition:'Staff records the funding receipt.'});
}
      if(relevant||draft){
        const valid=!!draft&&draft.fingerprint===fp;
        const done=valid&&draft.reviewed;
        out.push({...common,id:'draft:'+a.id,type:'draft',title:a.payer==='Family'?'Prepare tuition reminder':'Prepare funding follow-up',status:bal===0?(draft?.reviewed?'Done':'Cancelled'):done?'Done':draft?'Needs approval':'To do',next:a.pic,reason:bal===0?'Balance settled; no follow-up needed.':a.payer==='Family'?'Family balance is due.':'Contact the program, not the family.',condition:'The current draft is reviewed and ready.',stale:!!draft&&!valid,draftReady:done});
      }
    }
    return out.map(j=>({...j,...s.overrides[j.id]})).sort((a,b)=>a.due.localeCompare(b.due)||a.type.localeCompare(b.type));
  }
  function log(s,text,meta={}){s.history.unshift({id:uid(),at:new Date().toISOString(),text,...meta});s.history=s.history.slice(0,200)}
  function recordPayment(s,id,amount,date,channel,source){
    const a=s.accounts.find(a=>a.id===id);if(!a)throw Error('Choose a student.');if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Amount must be positive.');if(!source?.trim())throw Error('Add the record you checked.');if(!validDate(date))throw Error('Choose a valid payment date.');if(amount>balance(s,a))throw Error('This exceeds the remaining balance. Review the account first.');
    if(s.receipts.some(r=>r.account===id&&r.amount===amount&&r.date===date&&r.source.toLowerCase()===source.trim().toLowerCase()))throw Error('This receipt is already recorded.');
const r={id:uid(),account:id,amount,date,channel,source:source.trim()};s.receipts.push(r);a.updated=localDay();log(s,'Recorded '+money(amount)+' for '+a.name,{account:id,source:r.source});return r;
  }
  function updateFunding(s,id,approval,submitted,source){const a=s.accounts.find(a=>a.id===id);if(!a||a.payer==='Family')throw Error('Choose a funding account.');if(!source?.trim())throw Error('Add the approval or submission record you checked.');if(!['Pending','Approved'].includes(approval))throw Error('Choose an approval status.');if(approval==='Pending'&&submitted)throw Error('Confirm approval before recording submission.');const wasPending=a.approval==='Pending';a.approval=approval;a.submitted=!!submitted;a.source=source.trim();a.updated=localDay();log(s,'Updated funding record for '+a.name,{account:id,source});if(wasPending&&approval==='Approved')log(s,'Approval job completed for '+a.name,{account:id});}
  function makeDraft(s,id){const a=s.accounts.find(a=>a.id===id);if(!a)throw Error('Choose a student.');if(balance(s,a)===0)throw Error('This account is paid. No reminder is needed.');const family=a.payer==='Family';if(!family&&a.approval!=='Pending')throw Error('This account needs a funding-status check, not a family reminder.');
    const amount=money(balance(s,a));const d={id:uid(),account:id,to:a.email,subject:family?'Tuition balance for '+a.name:'Funding approval for '+a.name,body:family?'Hi '+a.contact+',\n\nOur current records show '+amount+' remaining for '+a.name+'’s tuition, due '+a.due+'. If you have already paid, please share the date and payment reference so we can check our records.\n\nThank you,\n'+a.pic+'\n'+s.settings.school:'Hello '+a.contact+',\n\nCould you help us confirm the approval status for '+a.name+'? Our local record shows '+amount+' awaiting program approval. Please let us know if any documents or steps are still needed.\n\nThank you,\n'+a.pic+'\n'+s.settings.school,fingerprint:fingerprint(s,a),reviewed:false,created:new Date().toISOString()};
    s.drafts[id]=d;log(s,'Prepared a draft for '+a.name,{account:id});return d;
  }
  function reviewDraft(s,id,changes){const a=s.accounts.find(a=>a.id===id),d=s.drafts[id];if(!a||!d)throw Error('Prepare a draft first.');if(balance(s,a)===0)throw Error('Payment was recorded. This draft is no longer needed.');if(d.fingerprint!==fingerprint(s,a))throw Error('Records changed. Regenerate and review this draft.');if(!changes.to?.includes('@')||!changes.subject?.trim()||!changes.body?.trim())throw Error('Check the recipient, subject and message.');Object.assign(d,changes,{reviewed:true,reviewedAt:new Date().toISOString()});log(s,'Reviewed draft for '+a.name+' — ready for manual sending',{account:id});return d}
  function correctReceipt(s,receiptId,amount,date,source,reason){
const r=s.receipts.find(r=>r.id===receiptId);if(!r)throw Error('Receipt not found.');
if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Amount must be positive.');
if(!source?.trim()||!reason?.trim())throw Error('Add a source and a reason for the correction.');
if(!validDate(date))throw Error('Choose a valid date.');
const a=s.accounts.find(a=>a.id===r.account);if(a&&paid(s,a.id)-r.amount+amount>a.charge)throw Error('Corrected receipts would exceed tuition.');
const oldAmount=r.amount;Object.assign(r,{amount,date,source:source.trim()});if(a)a.updated=localDay();log(s,'Corrected receipt from '+money(oldAmount)+' to '+money(amount)+': '+reason.trim(),{account:r.account,source:r.source});
}
function matchReceipt(s,receiptId,accountId){const r=s.receipts.find(r=>r.id===receiptId),a=s.accounts.find(a=>a.id===accountId);if(!r||r.account||!a)throw Error('Choose an unmatched receipt and a student.');if(r.amount>balance(s,a))throw Error('Receipt exceeds this balance. Review the match.');r.account=accountId;a.updated=localDay();log(s,'Matched '+money(r.amount)+' to '+a.name,{account:accountId,source:r.source})}
  function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===','&&!quoted){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}else cell+=ch}if(quoted)throw Error('A CSV quote is not closed.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows}
  function importPreview(s,text){const rows=parseCSV(text);if(rows.length<2)throw Error('CSV needs a header and at least one payment.');const head=rows.shift().map(x=>x.trim().toLowerCase().replace(/^\uFEFF/,''));for(const key of ['student','amount','date','source'])if(!head.includes(key))throw Error('Required columns: student, amount, date, source. Optional: channel, id.');const seen=new Set(s.receipts.map(r=>r.importKey).filter(Boolean));const running={};return rows.map((row,i)=>{const get=k=>(row[head.indexOf(k)]||'').trim();const name=get('student'),matches=s.accounts.filter(a=>a.name.toLowerCase()===name.toLowerCase()||a.code.toLowerCase()===name.toLowerCase());let amount=0,error='';try{amount=cents(get('amount'))}catch(e){error=e.message}if(matches.length!==1)error='Student must match one existing account.';const date=get('date'),source=get('source');if(!validDate(date))error='Use a valid YYYY-MM-DD date.';if(!source)error='Source is required.';const key=get('id')||[name.toLowerCase(),amount,date,source.toLowerCase()].join('|');if(seen.has(key))error='Duplicate payment.';seen.add(key);const a=matches[0];if(a){running[a.id]=(running[a.id]||0)+amount;if(running[a.id]>balance(s,a))error='Payments exceed the remaining balance.'}return {line:i+2,account:a?.id,name,amount,date,source,channel:get('channel')||'Import',importKey:key,error}})}
  function applyImport(s,rows){if(!rows.length||rows.some(r=>r.error))throw Error('Fix every flagged CSV row before importing.');const copy=structuredClone(s);for(const row of rows){const r=recordPayment(copy,row.account,row.amount,row.date,row.channel,row.source);r.importKey=row.importKey}Object.assign(s,copy);log(s,'Imported '+rows.length+' verified payment records.');}
  function validate(s){
    if(!s||s.version!==1||!Array.isArray(s.accounts)||!Array.isArray(s.receipts)||!s.drafts||typeof s.drafts!=='object'||!s.overrides||typeof s.overrides!=='object'||!Array.isArray(s.history)||typeof s.settings?.school!=='string'||typeof s.settings?.operator!=='string')throw Error('This is not a TallyHall v1 backup.');
    const ids=new Set(),rids=new Set();
    for(const a of s.accounts){if(!a.id||ids.has(a.id)||!['name','code','initials','pic','contact','email','source','updated'].every(k=>typeof a[k]==='string'&&a[k].length>0)||!Number.isSafeInteger(a.charge)||a.charge<=0||!['Family','Charter program','ESA program'].includes(a.payer)||!validDate(a.due)||!['Pending','Approved','Not required'].includes(a.approval)||typeof a.submitted!=='boolean')throw Error('Invalid student account.');ids.add(a.id)}
    for(const r of s.receipts){if(!r.id||rids.has(r.id)||!Number.isSafeInteger(r.amount)||r.amount<=0||(r.account&&!ids.has(r.account))||typeof r.source!=='string'||!validDate(r.date)||typeof r.channel!=='string')throw Error('Invalid receipt.');rids.add(r.id)}
    for(const [id,d] of Object.entries(s.drafts)){if(!ids.has(id)||!['to','subject','body','fingerprint'].every(k=>typeof d[k]==='string')||typeof d.reviewed!=='boolean')throw Error('Invalid saved draft.')}
    for(const o of Object.values(s.overrides)){if(!o||Object.keys(o).some(k=>!['pic','due'].includes(k))||(o.pic!==undefined&&typeof o.pic!=='string')||(o.due!==undefined&&!validDate(o.due)))throw Error('Invalid saved job.')}
    for(const h of s.history)if(typeof h.text!=='string'||typeof h.at!=='string')throw Error('Invalid activity history.');
    return s;
  }
  return {localDay,validDate,shift,money,cents,uid,seed,paid,balance,credit,bucket,status,fingerprint,summary,jobs,log,recordPayment,updateFunding,makeDraft,reviewDraft,correctReceipt,matchReceipt,parseCSV,importPreview,applyImport,validate};
})();
if(typeof module!=='undefined')module.exports=Model;
