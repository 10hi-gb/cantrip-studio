'use strict';
(function(){
var cls={"Ready":"s-ready","Playable":"s-playable","QA in progress":"s-qa","Failed":"s-failed"};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function render(d){
 document.getElementById('upd').textContent='Status as of '+d.updated+'. Review builds only; not public.';
 var root=document.getElementById('list');root.textContent='';
 [['A','Batch A'],['B','Batch B'],['C','Added Oct 14']].forEach(function(g){
  var its=d.items.filter(function(i){return i.batch===g[0]});if(!its.length)return;
  root.appendChild(el('h2',null,g[1]+' ('+its.length+')'));var ul=el('ul');
  its.forEach(function(i){
   var li=el('li'),top=el('div','top'),n=el('span','name',i.name);n.appendChild(el('span','id',i.id));
   top.appendChild(n);var q=i.qa||{};top.appendChild(el('span','badge '+(q.verdict==='QA passed'?'s-ready':q.verdict==='QA failed'?'s-failed':q.verdict?'s-playable':'s-none'),q.verdict||q.label||'No QA verdict'));li.appendChild(top);
   var v=el('p','qa');v.appendChild(el('strong',null,'QA verdict: '));v.appendChild(document.createTextNode((q.verdict||'none yet')+(q.ledger?' (QA ledger, '+q.ledger+')':'')));li.appendChild(v);
   if(q.untested&&q.untested.length){var u=el('ul','lim qa-lim');q.untested.forEach(function(x){u.appendChild(el('li',null,x))});li.appendChild(u)}
   li.appendChild(el('p','desc',i.description));if(i.note){var se=el('p','note self');se.appendChild(el('span','badge s-none',i.status||'Engineer self-check'));se.appendChild(document.createTextNode(' '+i.note));li.appendChild(se)}
   if(i.limitations&&i.limitations.length){var l=el('ul','lim');i.limitations.forEach(function(x){l.appendChild(el('li',null,x))});li.appendChild(el('p','limh','Known limitations'));li.appendChild(l)}
   if(i.url&&/^(https:\/\/|\.\.\/[a-z-]+\/$)/.test(i.url)){var a=el('a','play','Play '+i.name);a.href=i.url;a.rel='noopener noreferrer';li.appendChild(a)}
   else li.appendChild(el('span','nolink','No link yet'));
   ul.appendChild(li)});
  root.appendChild(ul)})}
var emb=JSON.parse(document.getElementById('data').textContent);render(emb);
})();
