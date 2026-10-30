/* Editable monthly scenarios. No forecasts, account access or data transmission. */
(() => {
  'use strict';
  function calculateScenario(followers,conversion,ticket,exchange=1){
    const values=[followers,conversion,ticket,exchange];if(values.some(n=>typeof n!=='number'||!Number.isFinite(n)))return null;
    if(!Number.isInteger(followers)||followers<1||followers>500000||conversion<1||conversion>5||ticket<5||ticket>50||exchange<1||exchange>100)return null;
    const subscribers=Math.floor(followers*conversion/100),gross=subscribers*ticket*exchange;
    const improvedSubscribers=Math.floor(followers*Math.min(5,conversion+1)/100);
    return {subscribers,gross,improvedSubscribers,improvedGross:improvedSubscribers*ticket*exchange};
  }
  function calculateFinances({followers,conversion,ticket,exchange=1,feePercent=0,refundPercent=0,monthlyCostsUSD=0}={}){
    const scenario=calculateScenario(followers,conversion,ticket,exchange);
    if(!scenario||[feePercent,refundPercent,monthlyCostsUSD].some(n=>typeof n!=='number'||!Number.isFinite(n)))return null;
    if(feePercent<0||feePercent>100||refundPercent<0||refundPercent>100||monthlyCostsUSD<0||monthlyCostsUSD>1000000)return null;
    // Both deductions use initial gross: an explicit planning assumption, not a platform tariff.
    const costs=monthlyCostsUSD*exchange;
    const totals=gross=>{const fees=gross*feePercent/100,refunds=gross*refundPercent/100;return {gross,fees,refunds,costs,net:gross-fees-refunds-costs};};
    const current=totals(scenario.gross),comparison=totals(scenario.improvedGross),contributionUSD=ticket*(100-(feePercent+refundPercent))/100;
    const breakEvenSubscribers=contributionUSD>0?Math.ceil(monthlyCostsUSD/contributionUSD):null;
    return {...scenario,current,comparison,netDifference:comparison.net-current.net,breakEvenSubscribers};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={calculateScenario,calculateFinances};
  if(typeof document==='undefined')return;
  const $=id=>document.getElementById(id),I=window.I18N;
  if(!$('followers')||!I)return;
  const copy={
    es:{
      costsTitle:'Incluye tus costos',costsIntro:'Empieza con tus propios datos. Los ceros son un punto de partida; no representan las tarifas de ninguna plataforma.',
      feeLabel:'Comisión sobre ingresos (%)',feeHelp:'Porcentaje del ingreso bruto que estimas pagar a la plataforma. Usa tu tarifa real; agrega otros cargos a los costos mensuales.',
      refundLabel:'Devoluciones estimadas (%)',refundHelp:'Parte del ingreso bruto que devolverías. Es un supuesto editable, no una tasa típica.',
      costLabel:'Costos mensuales (US$)',costHelp:'Herramientas, producción y otros gastos fijos del mes, en dólares. No incluye impuestos.',
      netTitle:'Después de costos',netLabel:'Resultado operativo mensual · antes de impuestos',fees:'Comisión estimada',refunds:'Devoluciones estimadas',costs:'Costos mensuales',
      formula:'Resultado = ingreso bruto − comisión − devoluciones − costos. Comisión y devoluciones se calculan ambas sobre el bruto inicial; las condiciones reales de cada plataforma pueden ser distintas.',
      floor:'Los suscriptores se redondean hacia abajo a personas completas. Con audiencias pequeñas, el resultado puede ser cero; no es un promedio probabilístico ni una predicción.',
      plus:'Con +1 punto de conversión (máximo 5%), mismos precios y costos: ',delta:'Diferencia operativa: ',
      breakEven:'Para cubrir estos costos, el modelo necesita ',paying:' suscriptores de pago al mes. No es una meta garantizada ni incluye impuestos.',
      noBreakEven:'Con estos porcentajes, cada venta no deja margen positivo para cubrir costos. Revisa los supuestos.',zeroCosts:'Sin costos fijos introducidos, el punto de equilibrio no evalúa todavía todos tus gastos.',
      limit:'Simulación gratuita y local: no conecta tus cuentas ni guarda estos valores. Rangos elegidos para explorar supuestos; no son promedios del sector. No incluye impuestos, cambios de divisa del proveedor, renovación de suscriptores ni cargos no indicados. No predice ingresos.',
      error:'Revisa los valores: comisión y devoluciones entre 0 y 100%; costos entre US$0 y US$1,000,000; tipo de cambio entre 1 y 100. No dejes campos vacíos.',
      moneyNote:'Todos los importes del resultado usan la moneda seleccionada. Los costos se introducen siempre en USD y se convierten con el mismo tipo de cambio ilustrativo.'
    },
    en:{
      costsTitle:'Include your costs',costsIntro:'Start with your own figures. Zeros are starting values, not the fees charged by any platform.',
      feeLabel:'Revenue fee (%)',feeHelp:'Share of gross revenue you expect to pay the platform. Use your actual rate; add other charges to monthly costs.',
      refundLabel:'Estimated refunds (%)',refundHelp:'Share of gross revenue you would refund. An editable assumption, not a typical rate.',
      costLabel:'Monthly costs (US$)',costHelp:'Tools, production and other fixed monthly expenses, in dollars. Taxes are excluded.',
      netTitle:'After costs',netLabel:'Monthly operating result · before taxes',fees:'Estimated fees',refunds:'Estimated refunds',costs:'Monthly costs',
      formula:'Result = gross revenue − fees − refunds − costs. Both fees and refunds use the initial gross; each platform’s actual terms may differ.',
      floor:'Paying subscribers are rounded down to whole people. Small audiences can produce zero; this is not a probability-weighted average or a prediction.',
      plus:'With +1 conversion point (capped at 5%), at the same prices and costs: ',delta:'Operating difference: ',
      breakEven:'To cover these costs, this model needs ',paying:' paying subscribers per month. This is not a guaranteed target and excludes taxes.',
      noBreakEven:'At these percentages, each sale leaves no positive contribution to cover costs. Review your assumptions.',zeroCosts:'With no fixed costs entered, break-even does not yet account for all your expenses.',
      limit:'Free, local simulation: it does not connect to your accounts or save these values. Ranges explore assumptions, not industry averages. Taxes, provider exchange rates, subscriber renewals and unlisted charges are excluded. This does not forecast earnings.',
      error:'Check your values: fees and refunds from 0 to 100%; costs from US$0 to US$1,000,000; exchange rate from 1 to 100. Do not leave fields empty.',
      moneyNote:'All result amounts use the selected currency. Costs are always entered in USD and converted using the same illustrative exchange rate.'
    }
  };
  const wording=()=>copy[I.language==='en'?'en':'es'];
  const node=(tag,id,className)=>{const element=document.createElement(tag);if(id)element.id=id;if(className)element.className=className;return element;};
  const translated=[];
  function textNode(tag,key,className,id){const element=node(tag,id,className);translated.push([element,key]);return element;}
  const details=node('details','creator-costs');details.setAttribute('data-clarity-mask','true');
  details.append(textNode('summary','costsTitle'),textNode('p','costsIntro','small muted'));
  for(const field of [
    {id:'creator-fee',label:'feeLabel',help:'feeHelp',max:100,step:'.1'},
    {id:'creator-refunds',label:'refundLabel',help:'refundHelp',max:100,step:'.1'},
    {id:'creator-cost',label:'costLabel',help:'costHelp',max:1000000,step:'.01'}
  ]){
    const control=node('div',null,'currency-controls'),label=textNode('label',field.label);label.htmlFor=field.id;
    const input=node('input',field.id);input.type='number';input.min='0';input.max=String(field.max);input.step=field.step;input.value='0';input.required=true;input.inputMode='decimal';input.setAttribute('aria-describedby',field.id+'-help');
    control.append(label,input);details.append(control,textNode('p',field.help,'small muted',field.id+'-help'));
  }
  details.append(textNode('p','moneyNote','small muted'));document.querySelector('.calculator-inputs').append(details);
  const finances=node('section','creator-finances');finances.setAttribute('data-clarity-mask','true');finances.setAttribute('aria-labelledby','creator-net-title');
  finances.append(textNode('h4','netTitle',null,'creator-net-title'),node('strong','creator-net','gross-result'),textNode('p','netLabel','small'));
  const breakdown=node('dl');for(const key of ['fees','refunds','costs'])breakdown.append(textNode('dt',key),node('dd','creator-total-'+key));
  finances.append(breakdown,node('p','creator-comparison'),node('p','creator-break-even','small'),textNode('p','formula','small muted'),textNode('p','floor','small muted'));
  $('conversion-uplift').after(finances);
  function update(){const t=wording();translated.forEach(([element,key])=>{element.textContent=t[key];});const limit=document.querySelector('[data-i18n="calcLimit"]');if(limit)limit.textContent=t.limit;
    const followers=Number($('followers').value),conversion=Number($('conversion').value),ticket=Number($('ticket').value),currency=$('currency').value;const fx=currency==='MXN'?Number($('exchange').value):1;
    const nf=new Intl.NumberFormat(I.language==='en'?'en-US':'es-MX',{maximumFractionDigits:1});
    $('followers-value').textContent=nf.format(followers);$('conversion-value').textContent=nf.format(conversion)+'%';$('ticket-value').textContent='US$'+nf.format(ticket);
    for(const id of ['followers','conversion','ticket'])$(id).setAttribute('aria-valuetext',$(id+'-value').textContent);
    $('exchange').disabled=currency!=='MXN';
    const valid=['creator-fee','creator-refunds','creator-cost'].every(id=>$(id).value!==''&&$(id).validity.valid);
    const result=valid?calculateFinances({followers,conversion,ticket,exchange:fx,feePercent:Number($('creator-fee').value),refundPercent:Number($('creator-refunds').value),monthlyCostsUSD:Number($('creator-cost').value)}):null;
    if(!result||!['USD','MXN'].includes(currency)||(currency==='MXN'&&(!$('exchange').value||!$('exchange').validity.valid))){
      for(const id of ['gross-result','creator-net',...['fees','refunds','costs'].map(key=>'creator-total-'+key)])$(id).textContent='—';
      for(const id of ['subscriber-result','conversion-uplift','creator-comparison','creator-break-even','calc-formula','scenario-current-label','scenario-plus-label'])$(id).textContent='';
      $('scenario-current').style.width='0%';$('scenario-plus').style.width='0%';$('calc-error').textContent=t.error;return;
    }
    const money=n=>new Intl.NumberFormat(I.language==='en'?'en-US':'es-MX',{style:'currency',currency,currencyDisplay:'code',maximumFractionDigits:2}).format(Object.is(n,-0)?0:n);
    $('calc-error').textContent='';$('scenario-current-label').textContent=nf.format(conversion)+'%';$('scenario-plus-label').textContent=nf.format(Math.min(5,conversion+1))+'%';$('calc-formula').textContent=I.t('calcFormula',{followers:nf.format(followers),percent:nf.format(conversion),subscribers:nf.format(result.subscribers),ticket:'US$'+nf.format(ticket)});$('gross-result').textContent=money(result.gross);$('subscriber-result').textContent=I.t('subscribers',{n:nf.format(result.subscribers),percent:nf.format(conversion)});$('conversion-uplift').textContent=I.t('uplift',{amount:money(result.improvedGross)});
    $('scenario-current').style.width=(conversion/5*100)+'%';$('scenario-plus').style.width=(Math.min(5,conversion+1)/5*100)+'%';
    $('creator-net').textContent=money(result.current.net);for(const key of ['fees','refunds','costs'])$('creator-total-'+key).textContent=money(result.current[key]);
    $('creator-comparison').textContent=t.plus+money(result.comparison.net)+'. '+t.delta+money(result.netDifference)+'.';
    $('creator-break-even').textContent=result.breakEvenSubscribers===null?t.noBreakEven:result.breakEvenSubscribers===0?t.zeroCosts:t.breakEven+nf.format(result.breakEvenSubscribers)+t.paying;
  }
  ['followers','conversion','ticket','exchange','creator-fee','creator-refunds','creator-cost'].forEach(id=>$(id).addEventListener('input',update));$('currency').addEventListener('change',update);document.addEventListener('portfolio:language',update);update();
})();
