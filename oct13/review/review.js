'use strict';
(function(){
var cls={"Ready":"s-ready","Playable":"s-playable","QA in progress":"s-qa","Failed":"s-failed"};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function render(d){
 document.getElementById('upd').textContent='Status as of '+d.updated+'. Review builds only; not public.';
 var root=document.getElementById('list');root.textContent='';
 [['A','Batch A'],['B','Batch B']].forEach(function(g){
  var its=d.items.filter(function(i){return i.batch===g[0]});if(!its.length)return;
  root.appendChild(el('h2',null,g[1]+' ('+its.length+')'));var ul=el('ul');
  its.forEach(function(i){
   var li=el('li'),top=el('div','top'),n=el('span','name',i.name);n.appendChild(el('span','id',i.id));
   top.appendChild(n);top.appendChild(el('span','badge '+(cls[i.status]||'s-none'),i.status));li.appendChild(top);
   li.appendChild(el('p','desc',i.description));if(i.note)li.appendChild(el('p','note',i.note));
   if(i.limitations&&i.limitations.length){var l=el('ul','lim');i.limitations.forEach(function(x){l.appendChild(el('li',null,x))});li.appendChild(l)}
   if(i.url&&/^(https:\/\/|\.\.\/[a-z-]+\/$)/.test(i.url)){var a=el('a','play','Play '+i.name);a.href=i.url;a.rel='noopener noreferrer';li.appendChild(a)}
   else li.appendChild(el('span','nolink','No link yet'));
   ul.appendChild(li)});
  root.appendChild(ul)})}
var emb=JSON.parse(document.getElementById('data').textContent);render(emb);
})();
