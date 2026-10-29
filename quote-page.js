/* Small DOM helpers for the estimate page; external integrations have separate consent gates. */
(() => {
  'use strict';
  function el(tag,cls='',text){const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;}
  function link(text,value,cls='text-link'){
    try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)return null;
      const node=el('a',cls,text);node.href=url.href;node.target='_blank';node.rel='noopener noreferrer';return node;
    }catch{return null;}
  }
  window.Site={el,link};
})();
