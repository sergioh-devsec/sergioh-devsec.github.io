/* Hypothetical monthly gross revenue, not an earnings forecast. */
(() => {
  'use strict';
  function calculateScenario(followers,conversion,ticket,exchange=1){
    const values=[followers,conversion,ticket,exchange];if(values.some(n=>typeof n!=='number'||!Number.isFinite(n)))return null;
    if(followers<500||followers>500000||conversion<1||conversion>5||ticket<5||ticket>50||exchange<1||exchange>100)return null;
    const subscribers=Math.floor(followers*conversion/100),gross=subscribers*ticket*exchange;
    const improvedSubscribers=Math.floor(followers*Math.min(5,conversion+1)/100);
    return {subscribers,gross,improvedSubscribers,improvedGross:improvedSubscribers*ticket*exchange};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={calculateScenario};
  if(typeof document==='undefined')return;
  const $=id=>document.getElementById(id),I=window.I18N;
  function update(){const followers=Number($('followers').value),conversion=Number($('conversion').value),ticket=Number($('ticket').value),currency=$('currency').value;const fx=currency==='MXN'?Number($('exchange').value):1;
    const nf=new Intl.NumberFormat(I.language==='en'?'en-US':'es-MX',{maximumFractionDigits:1});
    $('followers-value').textContent=nf.format(followers);$('conversion-value').textContent=nf.format(conversion)+'%';$('ticket-value').textContent='US$'+nf.format(ticket);
    for(const id of ['followers','conversion','ticket'])$(id).setAttribute('aria-valuetext',$(id+'-value').textContent);
    $('exchange').disabled=currency!=='MXN';
    const result=calculateScenario(followers,conversion,ticket,fx);
    if(!result||(currency==='MXN'&&!$('exchange').validity.valid)){$('gross-result').textContent='—';$('subscriber-result').textContent='';$('conversion-uplift').textContent='';$('calc-error').textContent=I.t('exchangeError');return;}
    const money=n=>'$'+new Intl.NumberFormat(I.language==='en'?'en-US':'es-MX',{maximumFractionDigits:0}).format(n)+' '+currency;
    $('calc-error').textContent='';$('gross-result').textContent=money(result.gross);$('subscriber-result').textContent=I.t('subscribers',{n:nf.format(result.subscribers),percent:nf.format(conversion)});$('conversion-uplift').textContent=I.t('uplift',{amount:money(result.improvedGross)});
    $('scenario-current').style.width=(conversion/5*100)+'%';$('scenario-plus').style.width=(Math.min(5,conversion+1)/5*100)+'%';
  }
  ['followers','conversion','ticket','exchange'].forEach(id=>$(id).addEventListener('input',update));$('currency').addEventListener('change',update);document.addEventListener('portfolio:language',update);update();
})();
