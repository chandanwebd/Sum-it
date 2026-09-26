/* Sum-IT invoice & quote styles (engine for /functies/facturen/).
 * Built from the internal design reference "Sum-it Documentstijlen": 32 A4
 * layouts in 3 series that render the same invoice / quote fields as the
 * app's PDF renderers (invoices/pdf.py, offers/pdf.py). Sample data is fictional.
 * API: window.SumitInvoiceStyles = { sets, model(kind, lang), accentTokens(hex), esc }
 */
(function(){
  "use strict";

  /* =========================================================================
     DATA — exactly the fields the two renderers read.
     offers/pdf.py :: render_offer(quote, line_items, org, logo, country_code)
     invoices/pdf.py :: _render(invoice, line_items, org, iban, logo, country_code)
     ========================================================================= */

  /* Fictional sample data (same company, client and amounts as the invoice
     on the homepage). Amounts are computed from the lines so they add up. */
  var ORG = {
    legal_name:"Jouw Bedrijf B.V.",
    address_line1:"Voorbeeldstraat 12",
    address_line2:"",
    postal_code:"1234 AB", city:"Utrecht",
    vat_id:"NL000099998B57",
    phone:"+31 6 12 34 56 78",
    email:"facturen@jouwbedrijf.nl",
    website:"jouwbedrijf.nl",
    kvk:"12345678"
  };
  var IBAN = "NL91 ABNA 0417 1643 00";
  var VAT_RATE = 0.21, DISCOUNT = 100;
  var LINES = [
    { d:{nl:"Montage-uren (2 monteurs)", en:"Installation hours (2 fitters)"}, q:16, u:{nl:"uur", en:"hr"}, p:62 },
    { d:{nl:"Wandpaneel HMPE 10 mm, wit", en:"HMPE wall panel 10 mm, white"}, q:12, u:{nl:"m\u00b2", en:"m\u00b2"}, p:74.5 },
    { d:{nl:"Afwerkprofiel RVS, geborsteld", en:"Stainless finishing profile"}, q:36, u:{nl:"m", en:"m"}, p:18.9 },
    { d:{nl:"Inmeten en voorbereiding", en:"Measuring and preparation"}, q:1, u:{nl:"post", en:"item"}, p:185 }
  ];
  function r2(n){ return Math.round(n*100)/100; }
  function lineItems(lang){
    return LINES.map(function(l){
      return { description:l.d[lang], quantity:l.q, unit:l.u[lang], unit_price:l.p,
        vat_rate:VAT_RATE, total_incl_vat:r2(r2(l.q*l.p)*(1+VAT_RATE)) };
    });
  }
  function amounts(){
    var net = r2(LINES.reduce(function(s,l){ return s + r2(l.q*l.p); }, 0));
    var vat = r2(net*VAT_RATE);
    return { net:net, vat:vat, total:r2(net + vat - DISCOUNT) };
  }
  var CLIENT = {
    name:{nl:"De Klant B.V.", en:"The Client B.V."},
    address:"Klantlaan 8\n5611 AB Eindhoven",
    vat:"NL001234567B01", taxid:"87654321"
  };
  function quoteData(lang){
    var a = amounts(), en = lang === "en";
    return {
      quote_number:"OFF-2026-001",
      subject: en ? "Wall panels and finishing, office renovation" : "Wandpanelen en afwerking, verbouwing kantoor",
      quote_date:"2026-09-11", valid_until:"2026-10-11", delivery_deadline:"2026-11-06",
      client_name:CLIENT.name[lang], client_address:CLIENT.address, client_vat_id:CLIENT.vat,
      work_description: en
        ? "Supply and install HMPE wall panels (10 mm) in the office and hallway, including stainless finishing profiles. Measuring, preparation and removal of the old cladding are included. Work is carried out outside office hours."
        : "Leveren en monteren van HMPE-wandpanelen (10 mm) in kantoor en gang, inclusief afwerkprofielen in RVS. Inmeten, voorbereiding en het afvoeren van de oude betimmering vallen binnen de opdracht. Werkzaamheden buiten kantooruren.",
      currency:"EUR",
      subtotal_excl_vat:a.net,
      vat_breakdown_by_rate:{"0.21":{vat:a.vat}},
      discount_amount:DISCOUNT,
      final_amount:a.total,
      payment_term_text: en ? "30% on order, 70% within 14 days of completion" : "30% bij opdracht, 70% binnen 14 dagen na oplevering",
      is_reverse_charge:false,
      reverse_charge_legal_text:null,
      lines:lineItems(lang)
    };
  }
  function invoiceData(lang){
    var a = amounts(), en = lang === "en";
    return {
      invoice_type:"invoice",
      invoice_number:"2026-0142",
      invoice_date:"2026-09-14", due_date:"2026-10-14",
      reference_po_number:"PO-3391",
      recipient_name:CLIENT.name[lang], recipient_address:CLIENT.address,
      recipient_vat_id:CLIENT.vat, recipient_tax_identifier:CLIENT.taxid,
      currency:"EUR",
      subtotal_excl_vat:a.net,
      vat_breakdown_by_rate:{"0.21":{vat:a.vat}},
      discount_amount:DISCOUNT,
      final_amount:a.total,
      skonto_enabled:true, skonto_percentage:2, skonto_deadline:"2026-09-24",
      reverse_charge_legal_text:null,
      legal_notice_text: en ? "Our general terms and conditions apply to all our work." : "Op al onze werkzaamheden zijn onze algemene voorwaarden van toepassing.",
      notes: en ? "Please quote the invoice number with your payment." : "Vermeld het factuurnummer bij betaling.",
      logo_position:"top",
      lines:lineItems(lang)
    };
  }

  var L = {
    nl:{offer:"Offerte",invoice:"Factuur",to:"Aan",bill_to:"Factuuradres",
      offer_date:"Datum",invoice_date:"Factuurdatum",valid_until:"Geldig tot",
      delivery_deadline:"Opleverdatum",due_date:"Vervaldatum",reference:"Referentie",
      description:"Omschrijving",qty:"Aantal",unit_price:"Stuksprijs",vat_pct:"Btw",
      amount:"Bedrag",net_total:"Subtotaal",vat:"Btw",discount:"Korting",total:"Totaal",
      scope:"Werkzaamheden",terms:"Voorwaarden",payment:"Betaling",tax_id:"KVK",phone:"Tel",
      skonto:"Betalingskorting: {p}% bij betaling voor {d}.",sender:"Afzender"},
    en:{offer:"Offer",invoice:"Invoice",to:"To",bill_to:"Bill to",
      offer_date:"Date",invoice_date:"Invoice date",valid_until:"Valid until",
      delivery_deadline:"Delivery deadline",due_date:"Due date",reference:"Reference",
      description:"Description",qty:"Qty",unit_price:"Unit price",vat_pct:"VAT",
      amount:"Amount",net_total:"Net total",vat:"VAT",discount:"Discount",total:"Total",
      scope:"Scope of work",terms:"Terms",payment:"Payment",tax_id:"Reg. no.",phone:"Tel",
      skonto:"Skonto: {p}% if paid by {d}.",sender:"Sender"}
  };

  /* --------------------------- formatting ------------------------------- */
  function money(v,lang){
    var s = Number(v||0).toFixed(2);
    var p = s.split("."), i = p[0].replace(/\B(?=(\d{3})+(?!\d))/g,",");
    s = i + "." + p[1];
    if(lang==="nl") s = s.replace(/[,.]/g,function(c){return c===","?".":","});
    return s;
  }
  function date(v,lang){
    if(!v) return "";
    if(lang!=="nl") return v;
    var p = v.split("-"); return p[2]+"/"+p[1]+"/"+p[0];
  }
  function pct(r){ return Math.round(Number(r)*100)+"%"; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]; }); }
  function nl2br(s){ return esc(s).replace(/\n/g,"<br>"); }

  /* --------------------------- model view ------------------------------- */
  // Normalises offer/invoice into one shape the skins draw from, so every
  // skin renders both documents without knowing which it got.
  function model(kind,lang){
    var t = L[lang];
    var isOffer = kind==="offer";
    var d = isOffer?quoteData(lang):invoiceData(lang);
    var meta = [];
    if(isOffer){
      meta.push([t.offer_date,date(d.quote_date,lang)]);
      if(d.valid_until) meta.push([t.valid_until,date(d.valid_until,lang)]);
      if(d.delivery_deadline) meta.push([t.delivery_deadline,date(d.delivery_deadline,lang)]);
    }else{
      meta.push([t.invoice_date,date(d.invoice_date,lang)]);
      if(d.due_date) meta.push([t.due_date,date(d.due_date,lang)]);
      if(d.reference_po_number) meta.push([t.reference,d.reference_po_number]);
    }
    var totals = [];
    totals.push([t.net_total,money(d.subtotal_excl_vat,lang),"muted"]);
    Object.keys(d.vat_breakdown_by_rate||{}).forEach(function(r){
      totals.push([t.vat+" "+pct(r),money(d.vat_breakdown_by_rate[r].vat,lang),"muted"]);
    });
    if(d.discount_amount) totals.push([t.discount,"-"+money(d.discount_amount,lang),"muted"]);

    var foot = [];
    if(isOffer){
      if(d.payment_term_text) foot.push(t.payment+": "+d.payment_term_text);
      if(d.is_reverse_charge) foot.push(d.reverse_charge_legal_text||"Btw verlegd");
    }else{
      if(d.skonto_enabled) foot.push(t.skonto.replace("{p}",d.skonto_percentage).replace("{d}",date(d.skonto_deadline,lang)));
      if(d.reverse_charge_legal_text) foot.push(d.reverse_charge_legal_text);
      if(d.legal_notice_text) foot.push(d.legal_notice_text);
      if(d.notes) foot.push(d.notes);
    }

    var sender = [ORG.address_line1,ORG.address_line2,(ORG.postal_code+" "+ORG.city).trim(),
      "BTW: "+ORG.vat_id, t.phone+": "+ORG.phone, ORG.email];
    if(!isOffer){ sender.push(ORG.website); sender.push("IBAN: "+IBAN); }

    return {
      t:t, isOffer:isOffer, lang:lang,
      title:isOffer?t.offer:t.invoice,
      number:isOffer?d.quote_number:d.invoice_number,
      subject:isOffer?d.subject:null,
      scope:isOffer?d.work_description:null,
      recipientLabel:isOffer?t.to:t.bill_to,
      recipient:{
        name:isOffer?d.client_name:d.recipient_name,
        address:isOffer?d.client_address:d.recipient_address,
        vat:isOffer?d.client_vat_id:d.recipient_vat_id,
        taxid:isOffer?null:d.recipient_tax_identifier
      },
      senderName:ORG.legal_name, senderLines:sender,
      meta:meta, lines:d.lines, totals:totals,
      grand:[t.total+" ("+d.currency+")",money(d.final_amount,lang)],
      foot:foot
    };
  }

  /* ----------------------- shared line rendering ------------------------ */
  function rows(m,opt){
    opt = opt||{};
    return m.lines.map(function(li,i){
      var unit = li.unit?" / "+li.unit:"";
      return '<tr'+(opt.zebra&&i%2?' class="z"':'')+'>'+
        '<td class="d">'+esc(li.description)+'</td>'+
        '<td class="num q">'+money(li.quantity,m.lang)+(opt.unitInQty&&li.unit?' '+esc(li.unit):'')+'</td>'+
        '<td class="num p">'+money(li.unit_price,m.lang)+(opt.unitInQty?'':esc(unit))+'</td>'+
        '<td class="num v">'+pct(li.vat_rate)+'</td>'+
        '<td class="num a">'+money(li.total_incl_vat,m.lang)+'</td></tr>';
    }).join("");
  }
  function headCells(m){
    var t=m.t;
    return '<th class="d">'+t.description+'</th><th class="num q">'+t.qty+'</th>'+
      '<th class="num p">'+t.unit_price+'</th><th class="num v">'+t.vat_pct+'</th>'+
      '<th class="num a">'+t.amount+'</th>';
  }
  function totalRows(m,cls){
    var h = m.totals.map(function(r){
      return '<tr class="'+(r[2]||'')+'"><td class="num lbl">'+esc(r[0])+'</td><td class="num val">'+r[1]+'</td></tr>';
    }).join("");
    h += '<tr class="grand"><td class="num lbl">'+esc(m.grand[0])+'</td><td class="num val">'+m.grand[1]+'</td></tr>';
    return '<table class="'+(cls||'tot')+'">'+h+'</table>';
  }
  function senderBlock(m){
    return '<div class="sender"><div class="sn">'+esc(m.senderName)+'</div>'+
      m.senderLines.filter(Boolean).map(function(l){return '<div>'+esc(l)+'</div>';}).join("")+'</div>';
  }
  function recipientBlock(m){
    var r=m.recipient;
    return '<div class="rcpt"><div class="lab">'+esc(m.recipientLabel)+'</div>'+
      '<div class="rn">'+esc(r.name)+'</div>'+
      (r.address?'<div class="ra">'+nl2br(r.address)+'</div>':'')+
      (r.vat?'<div class="ra">BTW: '+esc(r.vat)+'</div>':'')+
      (r.taxid?'<div class="ra">'+esc(m.t.tax_id)+': '+esc(r.taxid)+'</div>':'')+
      '</div>';
  }
  /* Deterministische pseudo-QR: herkenbaar als betaalcode, niet scanbaar. */
  function makeQR(seed){
    var n = 25, s = 0, i;
    for(i=0;i<seed.length;i++) s = (s*31 + seed.charCodeAt(i)) >>> 0;
    function rnd(){ s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; }
    function finder(x,y){ return (x<7&&y<7)||(x>n-8&&y<7)||(x<7&&y>n-8); }
    var d = "";
    for(var y=0;y<n;y++) for(var x=0;x<n;x++){
      var on;
      if(finder(x,y)){
        var lx = x>n-8 ? x-(n-7) : x, ly = y>n-8 ? y-(n-7) : y;
        on = (lx===0||lx===6||ly===0||ly===6) || (lx>=2&&lx<=4&&ly>=2&&ly<=4);
      } else if((x<8&&y<8)||(x>n-9&&y<8)||(x<8&&y>n-9)){ on = false; }
      else { on = rnd() > 0.53; }
      if(on) d += "M"+x+" "+y+"h1v1h-1z";
    }
    return '<svg viewBox="0 0 '+n+' '+n+'" role="img" aria-label="Betaal-QR">'+
      '<rect width="'+n+'" height="'+n+'" fill="#fff"></rect>'+
      '<path d="'+d+'" fill="#14181c"></path></svg>';
  }

  /* Het actieblok. Zelfde plek, totaal andere vorm per documenttype. */
  function slotBlock(m){
    var t = m.t, nl = m.lang === "nl";
    if(m.isOffer){
      var geldig = (m.meta[1] && m.meta[1][1]) || "";
      return '<div class="slot slot-offer">'+
        '<div class="slot-hd"><span class="k">'+esc(t.valid_until)+'</span><span class="v">'+esc(geldig)+'</span></div>'+
        '<div class="akkoord">'+
          '<div class="ttl">'+(nl?"Voor akkoord":"Accepted and agreed")+'</div>'+
          '<div class="fld"><span>'+(nl?"Naam":"Name")+'</span><i></i></div>'+
          '<div class="fld"><span>'+(nl?"Datum":"Date")+'</span><i></i></div>'+
          '<div class="fld"><span>'+(nl?"Handtekening":"Signature")+'</span><i></i></div>'+
        '</div>'+
        '<p class="note">'+(nl
          ? "Aan deze offerte kunnen geen rechten worden ontleend. Getekend retour of digitaal akkoord volstaat."
          : "No rights may be derived from this offer. A signed copy or digital approval is sufficient.")+'</p>'+
      '</div>';
    }
    var verval = (m.meta[1] && m.meta[1][1]) || "";
    return '<div class="slot slot-invoice">'+
      '<div class="slot-hd"><span class="k">'+(nl?"Te betalen vóór":"Pay before")+'</span><span class="v">'+esc(verval)+'</span></div>'+
      '<div class="betaal">'+
        '<div class="det">'+
          '<div class="row"><b>'+(nl?"Bedrag":"Amount")+'</b><span>'+esc(m.grand[0].replace(/^[^(]*/,"").replace(/[()]/g,""))+' '+m.grand[1]+'</span></div>'+
          '<div class="row"><b>IBAN</b><span>'+esc(IBAN)+'</span></div>'+
          '<div class="row"><b>'+(nl?"Ten name van":"Account name")+'</b><span>'+esc(ORG.legal_name)+'</span></div>'+
          '<div class="row"><b>'+(nl?"Kenmerk":"Reference")+'</b><span>'+esc(m.number)+'</span></div>'+
        '</div>'+
        '<div class="qr">'+makeQR(m.number+IBAN)+'<em>'+(nl?"Scan om te betalen":"Scan to pay")+'</em></div>'+
      '</div>'+
    '</div>';
  }

  function footBlock(m){
    var slot = slotBlock(m);
    if(!m.foot.length) return slot;
    return slot+'<div class="foot"><div class="lab">'+esc(m.t.terms)+'</div>'+
      m.foot.map(function(f){return '<p>'+esc(f)+'</p>';}).join("")+'</div>';
  }
  function scopeBlock(m){
    if(!m.scope) return '';
    return '<div class="scope"><div class="lab">'+esc(m.t.scope)+'</div><p>'+esc(m.scope)+'</p></div>';
  }
  function metaInline(m,sep){
    return m.meta.map(function(x){return esc(x[0])+': '+esc(x[1]);}).join(sep||'&nbsp;&nbsp;&nbsp;&nbsp;');
  }
  function metaList(m){
    return m.meta.map(function(x){
      return '<div class="mrow"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>';
    }).join("");
  }

  /* =========================================================================
     THE TEN SKINS
     Each returns { css, html } for one A4 page.
     ========================================================================= */

  var BASE_TABLE = function(o){
    o=o||{};
    return '.lt{width:100%;border-collapse:collapse}'+
    '.lt th{font-size:8.5px;letter-spacing:.07em;text-transform:uppercase;font-weight:600;padding:'+(o.hp||'7px 8px')+';}'+
    '.lt td{padding:'+(o.rp||'8px')+';vertical-align:top}'+
    '.lt .d{width:42%}.lt .q{width:11%}.lt .p{width:17%}.lt .v{width:12%}.lt .a{width:18%}';
  };

  var SKINS_A = [
  /* 1 ------------------------------------------------------------------ */
  { id:"kantoor", name:"Kantoor", tag:"Neutraal", family:"Instrument Sans",
    desc:"",
    render:function(m){ return {
      css:'.p1{padding:52px 56px;font-family:"Instrument Sans",sans-serif;font-size:11.5px;color:#1b2024}'+
        '.p1 .top{display:flex;justify-content:space-between;align-items:flex-start;gap:30px}'+
        '.p1 .logo{font-size:26px;color:var(--ac-deep)}'+
        '.p1 .sender{text-align:right;font-size:10px;color:#4a555d;line-height:1.65}'+
        '.p1 .sender .sn{font-weight:700;font-size:12px;color:#1b2024;margin-bottom:3px}'+
        '.p1 .lab{font-size:8.5px;letter-spacing:.11em;text-transform:uppercase;color:#8a949b;font-weight:600;margin-bottom:5px}'+
        '.p1 .rcpt{margin-top:46px}.p1 .rn{font-weight:700;font-size:13px}.p1 .ra{color:#4a555d;line-height:1.6}'+
        '.p1 h2{font-size:21px;margin:34px 0 4px;letter-spacing:-.02em;font-weight:700}'+
        '.p1 .subj{font-size:12px;color:#3d474f;margin-bottom:8px}'+
        '.p1 .meta{font-size:10px;color:#6d7982;padding-bottom:14px;border-bottom:2px solid var(--ac-deep)}'+
        '.p1 .scope{margin:20px 0 16px}.p1 .scope p{margin:0;color:#3d474f;line-height:1.6;max-width:68ch}'+
        BASE_TABLE()+
        '.p1 .lt th{color:#8a949b;border-bottom:1px solid #d3d8db}'+
        '.p1 .lt td{border-bottom:1px solid #eceef0}'+
        '.p1 .lt .d{font-weight:500}'+
        '.p1 .totwrap{display:flex;justify-content:flex-end;margin-top:16px}'+
        '.p1 .tot{width:52%;border-collapse:collapse}'+
        '.p1 .tot td{padding:4px 8px}.p1 .tot .muted td{color:#6d7982}'+
        '.p1 .tot .grand td{border-top:2px solid var(--ac-deep);padding-top:8px;font-weight:700;font-size:14px;color:var(--ac-deep)}'+
        '.p1 .foot{margin-top:30px;border-top:1px solid #e4e7ea;padding-top:14px}'+
        '.p1 .foot p{margin:0 0 4px;font-size:9.5px;color:#6d7982;line-height:1.55;max-width:78ch}',
      html:'<div class="p1"><div class="top"><div class="logo">Jouw<span style="color:var(--ac-mid)">Bedrijf</span><small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        recipientBlock(m)+
        '<h2>'+esc(m.title)+' '+esc(m.number)+'</h2>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="meta">'+metaInline(m)+'</div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div>'
    };}
  },

  /* 2 ------------------------------------------------------------------ */
  { id:"blauwdruk", name:"Blauwdruk", tag:"Technisch", family:"IBM Plex Mono",
    desc:"",
    render:function(m){ return {
      css:'.p2{padding:44px 46px;font-family:"IBM Plex Mono",monospace;font-size:10px;color:var(--ac-deep);background:#fff}'+
        '.p2 .rulewrap{border:1px solid var(--ac-deep)}'+
        '.p2 .band{display:flex;border-bottom:1px solid var(--ac-deep)}'+
        '.p2 .band>div{padding:12px 14px}'+
        '.p2 .band .l{flex:1;border-right:1px solid var(--ac-deep)}'+
        '.p2 .band .r{width:42%;font-size:9px;line-height:1.7}'+
        '.p2 .logo{font-family:"Instrument Sans",sans-serif;font-size:22px;color:var(--ac-deep)}'+
        '.p2 .sender .sn{font-weight:600;margin-bottom:2px}'+
        '.p2 .cols{display:flex;border-bottom:1px solid var(--ac-deep)}'+
        '.p2 .cols>div{padding:12px 14px}'+
        '.p2 .cols .c1{flex:1;border-right:1px solid var(--ac-deep)}'+
        '.p2 .cols .c2{width:42%}'+
        '.p2 .lab{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:var(--ac-mute);margin-bottom:6px}'+
        '.p2 .rn{font-family:"Instrument Sans",sans-serif;font-weight:700;font-size:13px;margin-bottom:2px}'+
        '.p2 .ra{line-height:1.6}'+
        '.p2 .mrow{display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px dotted var(--ac-line)}'+
        '.p2 .mrow:last-child{border-bottom:0}.p2 .mrow span{color:var(--ac-mute)}'+
        '.p2 .ttl{padding:12px 14px;border-bottom:1px solid var(--ac-deep);display:flex;justify-content:space-between;align-items:baseline;gap:16px}'+
        '.p2 .ttl b{font-family:"Instrument Sans",sans-serif;font-size:17px;letter-spacing:-.01em}'+
        '.p2 .ttl span{font-size:9px;color:var(--ac-mute);text-align:right}'+
        '.p2 .scope{padding:12px 14px;border-bottom:1px solid var(--ac-deep)}'+
        '.p2 .scope p{margin:0;line-height:1.65;color:#2c4150;max-width:80ch;font-size:9.5px}'+
        BASE_TABLE({hp:'8px 12px',rp:'6px 12px'})+
        '.p2 .lt th{color:var(--ac-deep);border-bottom:1px solid var(--ac-deep);background:var(--ac-soft)}'+
        '.p2 .lt td{border-bottom:1px dotted var(--ac-line);font-size:9.5px}'+
        '.p2 .lt tr:last-child td{border-bottom:1px solid var(--ac-deep)}'+
        '.p2 .totwrap{display:flex;justify-content:flex-end}'+
        '.p2 .tot{width:46%;border-collapse:collapse;margin:0 12px 0 0}'+
        '.p2 .tot td{padding:4px 0}.p2 .tot .muted td{color:var(--ac-mute)}'+
        '.p2 .tot .val{padding-right:12px}'+
        '.p2 .tot .grand td{border-top:1px solid var(--ac-deep);padding-top:6px;font-weight:600;font-size:12px}'+
        '.p2 .foot{padding:12px 14px;border-top:1px solid var(--ac-deep)}'+
        '.p2 .foot p{margin:0 0 3px;font-size:8.5px;color:var(--ac-mute);line-height:1.6}',
      html:'<div class="p2"><div class="rulewrap">'+
        '<div class="band"><div class="l"><div class="logo">Jouw Bedrijf<small style="letter-spacing:.2em;font-size:8px;display:block;margin-top:6px;color:var(--ac-mute)">INSTALLATIE &amp; ONDERHOUD</small></div></div>'+
        '<div class="r">'+senderBlock(m)+'</div></div>'+
        '<div class="ttl"><b>'+esc(m.title)+' '+esc(m.number)+'</b><span>'+(m.subject?esc(m.subject):'')+'</span></div>'+
        '<div class="cols"><div class="c1">'+recipientBlock(m)+'</div><div class="c2"><div class="lab">Kenmerken</div>'+metaList(m)+'</div></div>'+
        (m.scope?'<div class="scope"><div class="lab">'+esc(m.t.scope)+'</div><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+
        slotBlock(m)+(m.foot.length?'<div class="foot">'+m.foot.map(function(f){return '<p>'+esc(f)+'</p>';}).join("")+'</div>':'')+
        '</div></div>'
    };}
  },

  /* 3 ------------------------------------------------------------------ */
  { id:"notaris", name:"Notaris", tag:"Klassiek", family:"EB Garamond",
    desc:"",
    render:function(m){ return {
      css:'.p3{padding:64px 74px;font-family:"EB Garamond",Georgia,serif;font-size:12.5px;color:#1d1b18;background:#fffdf9}'+
        '.p3 .head{text-align:center;padding-bottom:22px;border-bottom:1px solid var(--ac-line)}'+
        '.p3 .logo{font-family:"EB Garamond",serif;font-size:30px;font-weight:600;letter-spacing:.02em}'+
        '.p3 .logo small{letter-spacing:.32em;font-size:.3em;color:#7b7264;margin-top:.5em}'+
        '.p3 .sender{margin-top:12px;font-size:10px;color:#7b7264;line-height:1.7}'+
        '.p3 .sender .sn{display:none}'+
        '.p3 .sender>div{display:inline;}'+
        '.p3 .sender>div:not(:last-child):after{content:" · "}'+
        '.p3 h2{color:var(--ac-deep);text-align:center;font-size:26px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;margin:34px 0 6px}'+
        '.p3 .docnum{text-align:center;font-size:11px;letter-spacing:.18em;color:#7b7264;text-transform:uppercase}'+
        '.p3 .subj{text-align:center;font-style:italic;font-size:13px;color:#4a4438;margin-top:10px;max-width:62ch;margin-inline:auto}'+
        '.p3 .grid2{display:flex;gap:40px;margin-top:34px}'+
        '.p3 .grid2>div{flex:1}'+
        '.p3 .lab{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#7b7264;margin-bottom:7px;font-family:"Instrument Sans",sans-serif}'+
        '.p3 .rn{font-size:15px;font-weight:600}.p3 .ra{color:#4a4438;line-height:1.6}'+
        '.p3 .mrow{display:flex;justify-content:space-between;border-bottom:1px dotted var(--ac-line);padding:3px 0}'+
        '.p3 .mrow span{color:#7b7264}.p3 .mrow b{font-weight:600}'+
        '.p3 .scope{margin:26px 0 6px}.p3 .scope p{margin:0;line-height:1.7;max-width:74ch;text-align:justify}'+
        BASE_TABLE({hp:'9px 6px',rp:'8px 6px'})+
        '.p3 .lt{margin-top:24px}'+
        '.p3 .lt th{font-family:"Instrument Sans",sans-serif;color:#7b7264;border-top:1px solid #1d1b18;border-bottom:1px solid var(--ac-line);letter-spacing:.14em;font-size:8px}'+
        '.p3 .lt td{border-bottom:1px solid var(--ac-line)}'+
        '.p3 .totwrap{display:flex;justify-content:flex-end;margin-top:14px}'+
        '.p3 .tot{width:48%}.p3 .tot td{padding:4px 6px}'+
        '.p3 .tot .muted td{color:#7b7264}'+
        '.p3 .tot .grand td{border-top:1px solid #1d1b18;border-bottom:3px double #1d1b18;padding:7px 6px;font-weight:600;font-size:15px}'+
        '.p3 .foot{margin-top:34px;text-align:center;border-top:1px solid var(--ac-line);padding-top:16px}'+
        '.p3 .foot p{margin:0 0 5px;font-size:10px;color:#7b7264;line-height:1.6;font-style:italic}',
      html:'<div class="p3"><div class="head"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="grid2"><div>'+recipientBlock(m)+'</div><div><div class="lab">'+(m.isOffer?'Gegevens':'Gegevens')+'</div>'+metaList(m)+'</div></div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div>'
    };}
  },

  /* 4 ------------------------------------------------------------------ */
  { id:"bouwbon", name:"Bouwbon", tag:"Vakmensen", family:"Archivo Narrow",
    desc:"",
    render:function(m){ return {
      css:'.p4{padding:0;font-family:"Archivo Narrow",sans-serif;font-size:11px;color:#111;background:#fff}'+
        '.p4 .bar1{background:var(--ac-deep);color:var(--ac-on-deep);padding:22px 44px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}'+
        '.p4 .logo{font-family:"Archivo",sans-serif;font-weight:800;font-size:27px;letter-spacing:-.02em}'+
        '.p4 .logo small{color:var(--ac-mid);letter-spacing:.24em;font-size:.32em}'+
        '.p4 .bar1 .ttl{text-align:right}'+
        '.p4 .bar1 .ttl b{display:block;font-family:"Archivo",sans-serif;font-weight:800;font-size:24px;text-transform:uppercase;letter-spacing:.02em;line-height:1}'+
        '.p4 .bar1 .ttl span{font-size:12px;color:var(--ac-mid);letter-spacing:.12em}'+
        '.p4 .body{padding:0 44px 44px}'+
        '.p4 .strip{display:flex;border-bottom:3px solid var(--ac-deep)}'+
        '.p4 .strip>div{padding:14px 0;flex:1}'+
        '.p4 .strip .r{text-align:right;font-size:10px;color:#4a4a4a;line-height:1.6}'+
        '.p4 .sender .sn{font-weight:700;color:#111}'+
        '.p4 .lab{font-family:"Archivo",sans-serif;font-size:8.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--ac-deep);margin-bottom:5px}'+
        '.p4 .duo{display:flex;gap:34px;margin-top:20px}'+
        '.p4 .duo>div{flex:1}'+
        '.p4 .rn{font-family:"Archivo",sans-serif;font-weight:700;font-size:15px}'+
        '.p4 .ra{color:#4a4a4a;line-height:1.55}'+
        '.p4 .mrow{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e2e2e2}'+
        '.p4 .mrow span{color:#6a6a6a;text-transform:uppercase;font-size:9px;letter-spacing:.08em}'+
        '.p4 .mrow b{font-family:"Archivo",sans-serif;font-weight:700}'+
        '.p4 .scope{margin:22px 0 4px;background:#f6f6f4;border-left:5px solid var(--ac);padding:13px 16px}'+
        '.p4 .scope p{margin:0;line-height:1.6;color:#333;max-width:82ch}'+
        BASE_TABLE({hp:'8px 8px',rp:'7px 8px'})+
        '.p4 .lt{margin-top:22px}'+
        '.p4 .lt th{background:var(--ac-deep);color:var(--ac-on-deep);font-family:"Archivo",sans-serif;font-weight:700;letter-spacing:.1em}'+
        '.p4 .lt td{border-bottom:1px solid #e2e2e2}'+
        '.p4 .lt tr.z td{background:#f8f8f6}'+
        '.p4 .lt .d{font-weight:600}'+
        '.p4 .totwrap{display:flex;justify-content:flex-end;margin-top:14px}'+
        '.p4 .tot{width:50%}.p4 .tot td{padding:4px 8px}'+
        '.p4 .tot .muted td{color:#6a6a6a}'+
        '.p4 .tot .grand td{background:var(--ac-deep);color:var(--ac-on-deep);font-family:"Archivo",sans-serif;font-weight:800;font-size:15px;padding:9px 8px}'+
        '.p4 .foot{margin-top:26px;border-top:3px solid var(--ac-deep);padding-top:12px}'+
        '.p4 .foot p{margin:0 0 4px;font-size:9.5px;color:#4a4a4a;line-height:1.55}',
      html:'<div class="p4"><div class="bar1"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+
        '<div class="ttl"><b>'+esc(m.title)+'</b><span>'+esc(m.number)+'</span></div></div>'+
        '<div class="body"><div class="strip"><div></div><div class="r">'+senderBlock(m)+'</div></div>'+
        '<div class="duo"><div>'+recipientBlock(m)+'</div><div><div class="lab">'+(m.isOffer?'Planning':'Betaling')+'</div>'+metaList(m)+'</div></div>'+
        (m.subject?'<div style="margin-top:18px;font-family:\'Archivo\',sans-serif;font-weight:700;font-size:14px">'+esc(m.subject)+'</div>':'')+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m,{zebra:true})+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div></div>'
    };}
  },

  /* 5 ------------------------------------------------------------------ */
  { id:"zacht", name:"Zacht", tag:"Rustig", family:"Instrument Sans",
    desc:"",
    render:function(m){ return {
      css:'.p5{padding:76px 78px;font-family:"Instrument Sans",sans-serif;font-size:11.5px;color:#2e3338;background:#fbfaf8;line-height:1.7}'+
        '.p5 .logo{font-size:17px;font-weight:600;letter-spacing:-.01em;color:#2e3338}'+
        '.p5 .logo small{letter-spacing:.2em;font-size:.44em;color:var(--ac-deep);font-weight:600}'+
        '.p5 h2{font-size:34px;font-weight:400;letter-spacing:-.03em;margin:52px 0 0;color:#1a1e21}'+
        '.p5 .docnum{font-size:12px;color:#9aa0a4;margin-top:4px;letter-spacing:.02em}'+
        '.p5 .subj{font-size:14px;color:#5c646a;margin-top:18px;max-width:52ch;line-height:1.6}'+
        '.p5 .cols{display:flex;gap:52px;margin-top:46px}'+
        '.p5 .cols>div{flex:1}'+
        '.p5 .lab{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#b3b8bb;margin-bottom:9px;font-weight:600}'+
        '.p5 .rn{font-weight:600;font-size:13px;color:#1a1e21}'+
        '.p5 .ra{color:#5c646a}'+
        '.p5 .sender .sn{font-weight:600;color:#1a1e21}'+
        '.p5 .sender>div{color:#5c646a}'+
        '.p5 .mrow{display:flex;justify-content:space-between;padding:2px 0}'+
        '.p5 .mrow span{color:#9aa0a4}.p5 .mrow b{font-weight:600;color:#1a1e21}'+
        '.p5 .scope{margin:40px 0 0}.p5 .scope p{margin:0;max-width:66ch;color:#5c646a}'+
        BASE_TABLE({hp:'0 0 10px',rp:'11px 0'})+
        '.p5 .lt{margin-top:44px}'+
        '.p5 .lt th{color:#b3b8bb;letter-spacing:.16em;font-weight:600}'+
        '.p5 .lt td{border-bottom:1px solid #ecebe8}'+
        '.p5 .lt .d{font-weight:500;color:#1a1e21}'+
        '.p5 .lt .q,.p5 .lt .p,.p5 .lt .v{color:#7f868b}'+
        '.p5 .totwrap{display:flex;justify-content:flex-end;margin-top:22px}'+
        '.p5 .tot{width:44%}.p5 .tot td{padding:5px 0}'+
        '.p5 .tot .muted td{color:#9aa0a4}'+
        '.p5 .tot .grand td{padding-top:14px;font-size:19px;font-weight:600;color:var(--ac-deep);border-top:2px solid var(--ac);margin-top:6px}'+
        '.p5 .foot{margin-top:54px}'+
        '.p5 .foot p{margin:0 0 6px;font-size:10px;color:#9aa0a4;line-height:1.65;max-width:72ch}',
      html:'<div class="p5"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+
        '<h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">'+esc(m.t.sender)+'</div>'+senderBlock(m)+'</div>'+
        '<div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div>'
    };}
  },

  /* 6 ------------------------------------------------------------------ */
  { id:"marge", name:"Marge", tag:"Asymmetrisch", family:"Instrument Sans",
    desc:"",
    render:function(m){ return {
      css:'.p6{display:flex;height:100%;font-family:"Instrument Sans",sans-serif;font-size:11px;color:#20262b;background:#fff}'+
        '.p6 .rail{width:232px;flex:none;background:var(--ac-deep);color:var(--ac-on-deep);padding:46px 26px;display:flex;flex-direction:column;gap:26px}'+
        '.p6 .logo{font-size:20px;font-weight:700;color:#fff;letter-spacing:-.01em}'+
        '.p6 .logo small{letter-spacing:.2em;font-size:.4em;color:var(--ac-mid)}'+
        '.p6 .lab{font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ac-mid);margin-bottom:7px;font-weight:600}'+
        '.p6 .rail .rn{font-weight:700;color:#fff;font-size:12.5px}'+
        '.p6 .rail .ra{color:var(--ac-mid);line-height:1.6}'+
        '.p6 .rail .sender .sn{font-weight:700;color:#fff}'+
        '.p6 .rail .sender>div{color:var(--ac-mid);line-height:1.65;font-size:10px}'+
        '.p6 .mrow{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid color-mix(in srgb,var(--ac-mid) 40%,transparent)}'+
        '.p6 .mrow span{color:var(--ac-mid)}.p6 .mrow b{color:#fff;font-weight:600}'+
        '.p6 .main{flex:1;padding:46px 44px;min-width:0;display:flex;flex-direction:column}'+
        '.p6 h2{font-size:25px;font-weight:700;letter-spacing:-.025em;margin:0;color:var(--ac-deep)}'+
        '.p6 .numline{font-size:11px;color:#7a858d;margin-top:3px}'+
        '.p6 .subj{font-size:13px;color:#3c464e;margin-top:14px;max-width:56ch;line-height:1.55}'+
        '.p6 .scope{margin:24px 0 0}.p6 .scope .lab{color:#9aa4ab}'+
        '.p6 .scope p{margin:0;line-height:1.62;color:#4a545c;max-width:68ch}'+
        BASE_TABLE({hp:'7px 6px',rp:'8px 6px'})+
        '.p6 .lt{margin-top:26px}'+
        '.p6 .lt th{color:#9aa4ab;border-bottom:1.5px solid var(--ac-deep)}'+
        '.p6 .lt td{border-bottom:1px solid #eef1f3}'+
        '.p6 .lt .d{font-weight:500}'+
        '.p6 .totwrap{display:flex;justify-content:flex-end;margin-top:16px}'+
        '.p6 .tot{width:62%}.p6 .tot td{padding:4px 6px}'+
        '.p6 .tot .muted td{color:#7a858d}'+
        '.p6 .tot .grand td{border-top:1.5px solid var(--ac-deep);padding-top:8px;font-weight:700;font-size:15px;color:var(--ac-deep)}'+
        '.p6 .foot{margin-top:auto;padding-top:20px;border-top:1px solid #eef1f3}'+
        '.p6 .foot p{margin:0 0 4px;font-size:9px;color:#7a858d;line-height:1.55}',
      html:'<div class="p6"><div class="rail"><div class="logo">Jouw Bedrijf<small>installatie</small></div>'+
        recipientBlock(m)+
        '<div><div class="lab">Details</div>'+metaList(m)+'</div>'+
        '<div style="margin-top:auto"><div class="lab">'+esc(m.t.sender)+'</div>'+senderBlock(m)+'</div></div>'+
        '<div class="main"><h2>'+esc(m.title)+'</h2><div class="numline">'+esc(m.number)+'</div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div></div>'
    };}
  },

  /* 7 ------------------------------------------------------------------ */
  { id:"inkt", name:"Inkt", tag:"Statement", family:"Archivo",
    desc:"",
    render:function(m){ return {
      css:'.p7{font-family:"Archivo",sans-serif;font-size:11px;color:#1b1f24;background:#fff}'+
        '.p7 .hero{background:var(--ac-deep);color:var(--ac-on-deep);padding:44px 48px 38px}'+
        '.p7 .herotop{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}'+
        '.p7 .logo{font-weight:800;font-size:22px;letter-spacing:-.02em;color:var(--ac-on-deep)}'+
        '.p7 .logo small{letter-spacing:.22em;font-size:.36em;color:var(--ac-mid)}'+
        '.p7 .hero .sender{text-align:right;font-size:9.5px;color:var(--ac-mid);line-height:1.65}'+
        '.p7 .hero .sender .sn{color:#fff;font-weight:700;font-size:11px}'+
        '.p7 .heroline{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;margin-top:38px}'+
        '.p7 .heroline .t{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--ac-mid);font-weight:600}'+
        '.p7 .heroline .n{font-size:30px;font-weight:800;letter-spacing:-.03em;color:#fff;line-height:1.05;margin-top:6px}'+
        '.p7 .heroline .amt{text-align:right}'+
        '.p7 .heroline .amt span{display:block;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--ac-mid);font-weight:600}'+
        '.p7 .heroline .amt b{font-size:34px;font-weight:800;letter-spacing:-.03em;color:#fff;line-height:1.1}'+
        '.p7 .body{padding:34px 48px 44px}'+
        '.p7 .cols{display:flex;gap:40px}'+
        '.p7 .cols>div{flex:1}'+
        '.p7 .lab{font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ac-mute);font-weight:700;margin-bottom:6px}'+
        '.p7 .rn{font-weight:700;font-size:13px}.p7 .ra{color:#4d565b;line-height:1.55}'+
        '.p7 .mrow{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--ac-line)}'+
        '.p7 .mrow span{color:var(--ac-mute)}.p7 .mrow b{font-weight:700}'+
        '.p7 .subj{margin-top:24px;font-size:14px;font-weight:700;letter-spacing:-.01em}'+
        '.p7 .scope{margin-top:12px}.p7 .scope p{margin:0;color:#4d565b;line-height:1.62;max-width:76ch}'+
        BASE_TABLE({hp:'8px 7px',rp:'8px 7px'})+
        '.p7 .lt{margin-top:26px}'+
        '.p7 .lt th{color:var(--ac-mute);border-bottom:2px solid var(--ac-deep)}'+
        '.p7 .lt td{border-bottom:1px solid var(--ac-line)}'+
        '.p7 .lt .d{font-weight:600}'+
        '.p7 .totwrap{display:flex;justify-content:flex-end;margin-top:14px}'+
        '.p7 .tot{width:50%}.p7 .tot td{padding:4px 7px}'+
        '.p7 .tot .muted td{color:var(--ac-mute)}'+
        '.p7 .tot .grand td{border-top:2px solid var(--ac-deep);padding-top:8px;font-weight:800;font-size:14px;color:var(--ac-deep)}'+
        '.p7 .foot{margin-top:28px;background:var(--ac-soft);padding:14px 16px}'+
        '.p7 .foot p{margin:0 0 4px;font-size:9.5px;color:#586267;line-height:1.55}',
      html:'<div class="p7"><div class="hero"><div class="herotop"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<div class="heroline"><div><div class="t">'+esc(m.title)+'</div><div class="n">'+esc(m.number)+'</div></div>'+
        '<div class="amt"><span>'+esc(m.grand[0])+'</span><b>'+m.grand[1]+'</b></div></div></div>'+
        '<div class="body"><div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        (m.scope?'<div class="scope"><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div></div>'
    };}
  },

  /* 8 ------------------------------------------------------------------ */
  { id:"raster", name:"Raster", tag:"Zwitsers", family:"Archivo",
    desc:"",
    render:function(m){ return {
      css:'.p8{padding:50px 52px;font-family:"Archivo",sans-serif;font-size:10.5px;color:#111;background:#fff;line-height:1.5}'+
        '.p8 .g{display:grid;grid-template-columns:repeat(12,1fr);gap:0 14px}'+
        '.p8 .rule{grid-column:1/-1;height:4px;background:var(--ac-deep);margin-bottom:16px}'+
        '.p8 .rule.thin{height:1px;background:var(--ac-deep);margin:18px 0 14px}'+
        '.p8 .logo{grid-column:1/6;font-weight:700;font-size:19px;letter-spacing:-.02em}'+
        '.p8 .logo small{letter-spacing:.2em;font-size:.4em;color:var(--ac-deep)}'+
        '.p8 .sender{grid-column:8/13;font-size:9px;color:#555;line-height:1.6}'+
        '.p8 .sender .sn{font-weight:700;color:#111}'+
        '.p8 h2{grid-column:1/8;font-size:38px;font-weight:700;letter-spacing:-.045em;line-height:.98;margin:26px 0 0}'+
        '.p8 .numline{grid-column:8/13;align-self:end;font-size:11px;font-weight:700;color:var(--ac-deep);letter-spacing:.04em;margin-bottom:4px}'+
        '.p8 .lab{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:var(--ac-mute);font-weight:700;margin-bottom:6px}'+
        '.p8 .rcpt{grid-column:1/5}.p8 .rn{font-weight:700;font-size:12px}.p8 .ra{color:#555}'+
        '.p8 .metacol{grid-column:5/9}'+
        '.p8 .subjcol{grid-column:9/13}'+
        '.p8 .subjcol p{margin:0;font-weight:700;font-size:12px;line-height:1.35}'+
        '.p8 .mrow{display:flex;justify-content:space-between;gap:8px;padding:2px 0}'+
        '.p8 .mrow span{color:#8a8a8a}.p8 .mrow b{font-weight:700}'+
        '.p8 .scope{grid-column:1/9;margin-top:20px}'+
        '.p8 .scope p{margin:0;color:#444;line-height:1.6}'+
        '.p8 .tablewrap{grid-column:1/-1;margin-top:22px}'+
        BASE_TABLE({hp:'6px 6px',rp:'7px 6px'})+
        '.p8 .lt th{color:#8a8a8a;border-top:1px solid #111;border-bottom:1px solid #111}'+
        '.p8 .lt td{border-bottom:1px solid #e6e6e6}'+
        '.p8 .lt .d{font-weight:600}'+
        '.p8 .totwrap{grid-column:7/-1;margin-top:14px}'+
        '.p8 .tot{width:100%}.p8 .tot td{padding:3px 6px}'+
        '.p8 .tot .muted td{color:#8a8a8a}'+
        '.p8 .tot .grand td{border-top:4px solid var(--ac);padding-top:7px;font-weight:700;font-size:15px}'+
        '.p8 .foot{grid-column:1/9;margin-top:26px}'+
        '.p8 .foot p{margin:0 0 4px;font-size:9px;color:#666;line-height:1.55}',
      html:'<div class="p8"><div class="g"><div class="rule"></div>'+
        '<div class="logo">Jouw Bedrijf<small>installatie</small></div>'+senderBlock(m)+
        '<h2>'+esc(m.title)+'</h2><div class="numline">'+esc(m.number)+'</div>'+
        '<div class="rule thin"></div>'+
        recipientBlock(m)+
        '<div class="metacol"><div class="lab">Details</div>'+metaList(m)+'</div>'+
        '<div class="subjcol"><div class="lab">Project</div><p>'+esc(m.subject||m.recipient.name)+'</p></div>'+
        (m.scope?'<div class="scope"><div class="lab">'+esc(m.t.scope)+'</div><p>'+esc(m.scope)+'</p></div>':'')+
        '<div class="tablewrap"><table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table></div>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div></div>'
    };}
  },

  /* 9 ------------------------------------------------------------------ */
  { id:"vakwerk", name:"Vakwerk", tag:"Ambacht", family:"Bitter",
    desc:"",
    render:function(m){ return {
      css:'.p9{padding:34px;font-family:"Bitter",Georgia,serif;font-size:11px;color:#2b231b;background:#fcf9f4}'+
        '.p9 .frame{border:2px solid var(--ac-deep);padding:3px;height:100%}'+
        '.p9 .inner{border:1px solid var(--ac-mid);height:100%;padding:34px 38px}'+
        '.p9 .head{display:flex;justify-content:space-between;align-items:flex-start;gap:26px;border-bottom:1px solid var(--ac-line);padding-bottom:18px}'+
        '.p9 .logo{font-family:"Bitter",serif;font-weight:700;font-size:24px;color:var(--ac-deep);letter-spacing:-.01em}'+
        '.p9 .logo small{letter-spacing:.22em;font-size:.35em;color:var(--ac-mute);font-weight:500}'+
        '.p9 .sender{text-align:right;font-size:9.5px;color:#6f6252;line-height:1.65}'+
        '.p9 .sender .sn{font-weight:700;color:#2b231b;font-size:11px}'+
        '.p9 .stampline{display:flex;align-items:baseline;gap:14px;margin-top:24px}'+
        '.p9 .stampline b{font-size:20px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ac-deep)}'+
        '.p9 .stampline span{font-size:11px;color:var(--ac-mute);letter-spacing:.1em}'+
        '.p9 .subj{margin-top:6px;font-size:13px;font-style:italic;color:#54483b;max-width:64ch}'+
        '.p9 .cols{display:flex;gap:36px;margin-top:24px}'+
        '.p9 .cols>div{flex:1}'+
        '.p9 .lab{font-family:"Instrument Sans",sans-serif;font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:var(--ac-mute);font-weight:700;margin-bottom:6px}'+
        '.p9 .rn{font-weight:700;font-size:13px}.p9 .ra{color:#6f6252;line-height:1.55}'+
        '.p9 .mrow{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dotted var(--ac-line)}'+
        '.p9 .mrow span{color:var(--ac-mute)}.p9 .mrow b{font-weight:700}'+
        '.p9 .scope{margin-top:22px}.p9 .scope p{margin:0;color:#54483b;line-height:1.68;max-width:74ch}'+
        BASE_TABLE({hp:'8px 7px',rp:'8px 7px'})+
        '.p9 .lt{margin-top:22px}'+
        '.p9 .lt th{font-family:"Instrument Sans",sans-serif;color:var(--ac-deep);background:var(--ac-soft);letter-spacing:.12em}'+
        '.p9 .lt td{border-bottom:1px solid var(--ac-line)}'+
        '.p9 .lt .d{font-weight:600}'+
        '.p9 .totwrap{display:flex;justify-content:flex-end;margin-top:14px}'+
        '.p9 .tot{width:52%}.p9 .tot td{padding:4px 7px}'+
        '.p9 .tot .muted td{color:var(--ac-mute)}'+
        '.p9 .tot .grand td{border-top:1px solid var(--ac-deep);border-bottom:3px double var(--ac-deep);padding:7px;font-weight:700;font-size:14px;color:var(--ac-deep)}'+
        '.p9 .foot{margin-top:24px;border-top:1px dotted var(--ac-line);padding-top:12px}'+
        '.p9 .foot p{margin:0 0 4px;font-size:9px;color:#6f6252;line-height:1.6;font-style:italic}',
      html:'<div class="p9"><div class="frame"><div class="inner">'+
        '<div class="head"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<div class="stampline"><b>'+esc(m.title)+'</b><span>'+esc(m.number)+'</span></div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+
        '</div></div></div>'
    };}
  },

  /* 10 ----------------------------------------------------------------- */
  { id:"compact", name:"Compact", tag:"Veel regels", family:"Instrument Sans",
    desc:"",
    render:function(m){ return {
      css:'.p10{padding:40px 44px;font-family:"Instrument Sans",sans-serif;font-size:10px;color:#1d2227;background:#fff;line-height:1.4}'+
        '.p10 .top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:1px solid #1d2227;padding-bottom:12px}'+
        '.p10 .logo{font-size:17px;font-weight:700;letter-spacing:-.02em}'+
        '.p10 .logo small{letter-spacing:.18em;font-size:.4em;color:var(--ac-deep)}'+
        '.p10 .sender{text-align:right;font-size:8.5px;color:#5c666d;line-height:1.55}'+
        '.p10 .sender .sn{font-weight:700;color:#1d2227;font-size:10px}'+
        '.p10 .band{display:flex;gap:0;border-bottom:1px solid #dde1e4}'+
        '.p10 .band>div{padding:12px 14px;flex:1;border-right:1px solid #dde1e4}'+
        '.p10 .band>div:last-child{border-right:0}'+
        '.p10 .band>div:first-child{padding-left:0}'+
        '.p10 .lab{font-size:7.5px;letter-spacing:.16em;text-transform:uppercase;color:#9aa3a9;font-weight:600;margin-bottom:4px}'+
        '.p10 .rn{font-weight:700;font-size:11.5px}.p10 .ra{color:#5c666d;line-height:1.5}'+
        '.p10 .mrow{display:flex;justify-content:space-between;gap:8px;padding:1.5px 0}'+
        '.p10 .mrow span{color:#9aa3a9}.p10 .mrow b{font-weight:600}'+
        '.p10 .ttl{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:14px 0 4px}'+
        '.p10 .ttl b{font-size:18px;font-weight:700;letter-spacing:-.02em}'+
        '.p10 .ttl span{font-size:11px;color:#5c666d;text-align:right;max-width:52ch}'+
        '.p10 .scope p{margin:0 0 10px;color:#5c666d;line-height:1.52;max-width:88ch;font-size:9.5px}'+
        BASE_TABLE({hp:'5px 6px',rp:'4.5px 6px'})+
        '.p10 .lt{margin-top:6px}'+
        '.p10 .lt th{color:var(--ac-on-deep);background:var(--ac-deep);letter-spacing:.09em;font-size:8px}'+
        '.p10 .lt td{border-bottom:1px solid #eef0f2;font-size:9.5px}'+
        '.p10 .lt tr.z td{background:#fafbfc}'+
        '.p10 .lt .d{font-weight:500}'+
        '.p10 .lt .q{width:13%}.p10 .lt .p{width:15%}'+
        '.p10 .totwrap{display:flex;justify-content:flex-end;margin-top:10px}'+
        '.p10 .tot{width:42%}.p10 .tot td{padding:2.5px 6px}'+
        '.p10 .tot .muted td{color:#7d878e}'+
        '.p10 .tot .grand td{border-top:1px solid var(--ac-deep);border-bottom:1px solid var(--ac-deep);color:var(--ac-deep);padding:6px;font-weight:700;font-size:13px}'+
        '.p10 .foot{margin-top:18px;border-top:1px solid #eef0f2;padding-top:10px}'+
        '.p10 .foot p{margin:0 0 3px;font-size:8.5px;color:#7d878e;line-height:1.5}',
      html:'<div class="p10"><div class="top"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<div class="band"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        '<div class="ttl"><b>'+esc(m.title)+' '+esc(m.number)+'</b><span>'+esc(m.subject||'')+'</span></div>'+
        (m.scope?'<div class="scope"><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m,{zebra:true,unitInQty:true})+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div>'
    };}
  }
  ];

  /* Reorder so the list reads 01..10 in a sensible progression */
  var ORDER = ["kantoor","zacht","marge","raster","blauwdruk","compact","inkt","bouwbon","vakwerk","notaris"];
  SKINS_A.sort(function(a,b){ return ORDER.indexOf(a.id)-ORDER.indexOf(b.id); });

  /* =========================================================================
     SERIE B — speelser. Zelfde velden, meer karakter.
     ========================================================================= */
  var SKINS_B = [

  /* B1 ----------------------------------------------------------------- */
  { id:"citrus", name:"Citrus", tag:"Fris", family:"Outfit",
    desc:"",
    render:function(m){ return {
      css:'.p11{font-family:"Outfit",sans-serif;font-size:11px;color:#181613;background:#fffdf6}'+
        '.p11 .cap{background:#ffd429;padding:40px 46px 34px;border-bottom:5px solid #181613}'+
        '.p11 .caprow{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}'+
        '.p11 .logo{font-weight:800;font-size:25px;letter-spacing:-.03em}'+
        '.p11 .logo small{letter-spacing:.2em;font-size:.34em;font-weight:600;color:#6b5a10}'+
        '.p11 .sender{text-align:right;font-size:9.5px;line-height:1.6;color:#4c4326}'+
        '.p11 .sender .sn{font-weight:700;color:#181613;font-size:11px}'+
        '.p11 h2{font-size:46px;font-weight:800;letter-spacing:-.045em;margin:26px 0 0;line-height:.95}'+
        '.p11 .docnum{font-size:13px;font-weight:600;color:#6b5a10;margin-top:6px}'+
        '.p11 .body{padding:30px 46px 44px}'+
        '.p11 .cols{display:flex;gap:16px}'+
        '.p11 .cols>div{flex:1;background:#fff;border:2px solid #181613;border-radius:14px;padding:14px 16px}'+
        '.p11 .lab{font-size:8px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;color:#9a8c55;margin-bottom:5px}'+
        '.p11 .rn{font-weight:700;font-size:13px}.p11 .ra{color:#5a5342;line-height:1.5}'+
        '.p11 .mrow{display:flex;justify-content:space-between;padding:2.5px 0}'+
        '.p11 .mrow span{color:#9a8c55}.p11 .mrow b{font-weight:700}'+
        '.p11 .subj{margin-top:20px;font-size:16px;font-weight:600;letter-spacing:-.015em}'+
        '.p11 .scope p{margin:8px 0 0;color:#5a5342;line-height:1.6;max-width:76ch}'+
        BASE_TABLE({hp:'9px 12px',rp:'9px 12px'})+
        '.p11 .lt{margin-top:24px;border:2px solid #181613;border-radius:14px;overflow:hidden}'+
        '.p11 .lt th{background:#181613;color:#ffd429;letter-spacing:.1em;font-weight:700}'+
        '.p11 .lt td{border-bottom:1px solid #eee6cd}'+
        '.p11 .lt tr:last-child td{border-bottom:0}'+
        '.p11 .lt .d{font-weight:600}'+
        '.p11 .totwrap{display:flex;justify-content:flex-end;margin-top:16px}'+
        '.p11 .tot{width:52%}.p11 .tot td{padding:4px 12px}'+
        '.p11 .tot .muted td{color:#9a8c55}'+
        '.p11 .tot .grand td{background:#ffd429;font-weight:800;font-size:16px;padding:10px 12px;border-top:2px solid #181613}'+
        '.p11 .tot .grand td:first-child{border-radius:10px 0 0 10px}'+
        '.p11 .tot .grand td:last-child{border-radius:0 10px 10px 0}'+
        '.p11 .foot{margin-top:26px;border-top:2px dashed #d9cd9a;padding-top:12px}'+
        '.p11 .foot p{margin:0 0 4px;font-size:9.5px;color:#7a7053;line-height:1.55}',
      html:'<div class="p11"><div class="cap"><div class="caprow"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div></div>'+
        '<div class="body"><div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        (m.scope?'<div class="scope"><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div></div>'
    };}
  },

  /* B2 ----------------------------------------------------------------- */
  { id:"sticker", name:"Sticker", tag:"Pastel", family:"Outfit",
    desc:"",
    render:function(m){ return {
      css:'.p12{font-family:"Outfit",sans-serif;font-size:11px;color:#2a2735;background:#f7f4ff;padding:40px 44px}'+
        '.p12 .top{display:flex;justify-content:space-between;align-items:center;gap:20px;background:#fff;border-radius:20px;padding:18px 22px}'+
        '.p12 .logo{font-weight:800;font-size:21px;color:#5b4ad1;letter-spacing:-.03em}'+
        '.p12 .logo small{letter-spacing:.18em;font-size:.36em;color:#9b93c9;font-weight:600}'+
        '.p12 .sender{text-align:right;font-size:9px;color:#6f6a86;line-height:1.55}'+
        '.p12 .sender .sn{font-weight:700;color:#2a2735;font-size:10.5px}'+
        '.p12 .hero{display:flex;gap:14px;margin-top:14px}'+
        '.p12 .hero .l{flex:1;background:#e8e3ff;border-radius:20px;padding:22px 24px}'+
        '.p12 .hero .r{width:36%;background:#ffe0ec;border-radius:20px;padding:22px 24px;display:flex;flex-direction:column;justify-content:center}'+
        '.p12 .hero h2{margin:0;font-size:30px;font-weight:800;letter-spacing:-.04em;color:#3b2f8f}'+
        '.p12 .hero .docnum{font-size:12px;font-weight:600;color:#7a6fc4;margin-top:2px}'+
        '.p12 .hero .subj{font-size:12px;color:#4a4265;margin-top:10px;line-height:1.45}'+
        '.p12 .hero .r span{font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:#b4527c}'+
        '.p12 .hero .r b{display:block;font-size:28px;font-weight:800;letter-spacing:-.035em;color:#8c2c56;margin-top:4px;line-height:1.05}'+
        '.p12 .cols{display:flex;gap:14px;margin-top:14px}'+
        '.p12 .cols>div{flex:1;background:#fff;border-radius:20px;padding:16px 20px}'+
        '.p12 .lab{font-size:8px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;color:#a49cc7;margin-bottom:5px}'+
        '.p12 .rn{font-weight:700;font-size:13px}.p12 .ra{color:#6f6a86;line-height:1.5}'+
        '.p12 .mrow{display:flex;justify-content:space-between;padding:2.5px 0;border-bottom:1px dashed #e6e2f2}'+
        '.p12 .mrow:last-child{border-bottom:0}'+
        '.p12 .mrow span{color:#a49cc7}.p12 .mrow b{font-weight:700}'+
        '.p12 .card{background:#fff;border-radius:20px;padding:18px 22px;margin-top:14px}'+
        '.p12 .scope p{margin:6px 0 0;color:#6f6a86;line-height:1.6;max-width:78ch}'+
        BASE_TABLE({hp:'6px 10px',rp:'8px 10px'})+
        '.p12 .lt th{color:#a49cc7;letter-spacing:.12em;border-bottom:2px solid #e8e3ff}'+
        '.p12 .lt td{border-bottom:1px dashed #eeebf7}'+
        '.p12 .lt .d{font-weight:600}'+
        '.p12 .totwrap{display:flex;justify-content:flex-end;margin-top:12px}'+
        '.p12 .tot{width:54%}.p12 .tot td{padding:3px 10px}'+
        '.p12 .tot .muted td{color:#a49cc7}'+
        '.p12 .tot .grand td{background:#5b4ad1;color:#fff;font-weight:800;font-size:15px;padding:9px 10px}'+
        '.p12 .tot .grand td:first-child{border-radius:12px 0 0 12px}'+
        '.p12 .tot .grand td:last-child{border-radius:0 12px 12px 0}'+
        '.p12 .foot p{margin:0 0 4px;font-size:9px;color:#8b85a3;line-height:1.55}',
      html:'<div class="p12"><div class="top"><div class="logo">Jouw Bedrijf<small>installatie</small></div>'+senderBlock(m)+'</div>'+
        '<div class="hero"><div class="l"><h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+'</div>'+
        '<div class="r"><span>'+esc(m.grand[0])+'</span><b>'+m.grand[1]+'</b></div></div>'+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        (m.scope?'<div class="card scope"><div class="lab">'+esc(m.t.scope)+'</div><p>'+esc(m.scope)+'</p></div>':'')+
        '<div class="card"><table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div></div>'+
        slotBlock(m)+(m.foot.length?'<div class="card foot">'+m.foot.map(function(f){return '<p>'+esc(f)+'</p>';}).join("")+'</div>':'')+
        '</div>'
    };}
  },

  /* B3 ----------------------------------------------------------------- */
  { id:"terminal", name:"Terminal", tag:"Retro", family:"Courier Prime",
    desc:"",
    render:function(m){ return {
      css:'.p13{font-family:"Courier Prime",monospace;font-size:10.5px;color:#7dffb0;background:#06120c;padding:40px 44px;line-height:1.55}'+
        '.p13 .scr{border:1px solid #1d6b45;padding:22px 24px;height:100%;position:relative}'+
        '.p13 .scr:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(to bottom,rgba(125,255,176,.055) 0 1px,transparent 1px 3px);pointer-events:none}'+
        '.p13 .top{display:flex;justify-content:space-between;gap:20px;border-bottom:1px dashed #1d6b45;padding-bottom:12px}'+
        '.p13 .logo{font-weight:700;font-size:18px;color:#c9ffdf;letter-spacing:.02em}'+
        '.p13 .logo small{letter-spacing:.24em;font-size:.4em;color:#3f9c6c}'+
        '.p13 .sender{text-align:right;font-size:9px;color:#4fb37e;line-height:1.6}'+
        '.p13 .sender .sn{color:#c9ffdf;font-weight:700}'+
        '.p13 h2{font-size:19px;margin:18px 0 2px;color:#c9ffdf;font-weight:700;letter-spacing:.04em}'+
        '.p13 h2:before{content:"> "}'+
        '.p13 .docnum{font-size:11px;color:#4fb37e}'+
        '.p13 .subj{margin-top:8px;color:#9de7bd}'+
        '.p13 .cols{display:flex;gap:26px;margin-top:20px;border-top:1px dashed #1d6b45;border-bottom:1px dashed #1d6b45;padding:14px 0}'+
        '.p13 .cols>div{flex:1}'+
        '.p13 .lab{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#3f9c6c;margin-bottom:5px}'+
        '.p13 .lab:before{content:"[ "}.p13 .lab:after{content:" ]"}'+
        '.p13 .rn{color:#c9ffdf;font-weight:700}.p13 .ra{color:#4fb37e}'+
        '.p13 .mrow{display:flex;justify-content:space-between;gap:10px}'+
        '.p13 .mrow span{color:#3f9c6c}.p13 .mrow b{color:#c9ffdf;font-weight:700}'+
        '.p13 .scope{margin-top:16px}.p13 .scope p{margin:0;color:#9de7bd;line-height:1.65;max-width:84ch}'+
        BASE_TABLE({hp:'7px 6px',rp:'5px 6px'})+
        '.p13 .lt{margin-top:18px}'+
        '.p13 .lt th{color:#06120c;background:#7dffb0;letter-spacing:.12em}'+
        '.p13 .lt td{border-bottom:1px dotted #1d6b45;color:#9de7bd}'+
        '.p13 .lt .d{color:#c9ffdf}'+
        '.p13 .totwrap{display:flex;justify-content:flex-end;margin-top:12px}'+
        '.p13 .tot{width:48%}.p13 .tot td{padding:2.5px 6px}'+
        '.p13 .tot .muted td{color:#4fb37e}'+
        '.p13 .tot .grand td{border-top:1px solid #7dffb0;border-bottom:3px double #7dffb0;padding:6px;color:#c9ffdf;font-weight:700;font-size:13px}'+
        '.p13 .foot{margin-top:20px;border-top:1px dashed #1d6b45;padding-top:10px}'+
        '.p13 .foot p{margin:0 0 3px;font-size:9px;color:#4fb37e;line-height:1.55}'+
        '.p13 .foot p:before{content:"# "}',
      html:'<div class="p13"><div class="scr"><div class="top"><div class="logo">Jouw Bedrijf<small>installatie</small></div>'+senderBlock(m)+'</div>'+
        '<h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+
        slotBlock(m)+(m.foot.length?'<div class="foot">'+m.foot.map(function(f){return '<p>'+esc(f)+'</p>';}).join("")+'</div>':'')+
        '</div></div>'
    };}
  },

  /* B4 ----------------------------------------------------------------- */
  { id:"ticket", name:"Ticket", tag:"Stub", family:"Archivo",
    desc:"",
    render:function(m){ return {
      css:'.p14{font-family:"Archivo",sans-serif;font-size:10.5px;color:#1a1d26;background:#eef1f6;padding:30px}'+
        '.p14 .tk{display:flex;height:100%;background:#fff;border-radius:16px;overflow:hidden;position:relative}'+
        '.p14 .stub{width:205px;flex:none;background:#ff5a3c;color:#fff;padding:30px 24px;display:flex;flex-direction:column;gap:20px;position:relative}'+
        '.p14 .stub:after{content:"";position:absolute;right:-7px;top:0;bottom:0;width:14px;'+
          'background:radial-gradient(circle at 7px 7px,#eef1f6 5px,transparent 5.5px) 0 0/14px 20px repeat-y}'+
        '.p14 .logo{font-weight:800;font-size:19px;letter-spacing:-.03em}'+
        '.p14 .logo small{letter-spacing:.2em;font-size:.36em;color:#ffd2c8}'+
        '.p14 .stub .lab{font-size:7.5px;letter-spacing:.2em;text-transform:uppercase;color:#ffd2c8;font-weight:700;margin-bottom:4px}'+
        '.p14 .stub .big{font-size:24px;font-weight:800;letter-spacing:-.03em;line-height:1.1}'+
        '.p14 .stub .mrow{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.3)}'+
        '.p14 .stub .mrow span{color:#ffd2c8}.p14 .stub .mrow b{font-weight:700}'+
        '.p14 .stub .rn{font-weight:700;font-size:12px}.p14 .stub .ra{color:#ffe3dc;line-height:1.45}'+
        '.p14 .main{flex:1;padding:30px 32px;min-width:0;display:flex;flex-direction:column}'+
        '.p14 .lab{font-size:7.5px;letter-spacing:.2em;text-transform:uppercase;color:#9aa1b1;font-weight:700;margin-bottom:5px}'+
        '.p14 h2{margin:0;font-size:24px;font-weight:800;letter-spacing:-.035em;color:#ff5a3c}'+
        '.p14 .docnum{font-size:11px;color:#77808f;margin-top:2px}'+
        '.p14 .subj{margin-top:12px;font-size:13px;font-weight:600}'+
        '.p14 .scope p{margin:8px 0 0;color:#5c6472;line-height:1.6;max-width:72ch}'+
        '.p14 .sender{margin-top:14px;font-size:8.5px;color:#8b93a2;line-height:1.5}'+
        '.p14 .sender .sn{font-weight:700;color:#1a1d26;font-size:10px}'+
        BASE_TABLE({hp:'6px 6px',rp:'7px 6px'})+
        '.p14 .lt{margin-top:20px}'+
        '.p14 .lt th{color:#9aa1b1;border-bottom:2px solid #1a1d26;letter-spacing:.1em}'+
        '.p14 .lt td{border-bottom:1px solid #edeff3}'+
        '.p14 .lt .d{font-weight:600}'+
        '.p14 .totwrap{display:flex;justify-content:flex-end;margin-top:12px}'+
        '.p14 .tot{width:58%}.p14 .tot td{padding:3px 6px}'+
        '.p14 .tot .muted td{color:#8b93a2}'+
        '.p14 .tot .grand td{border-top:2px solid #ff5a3c;padding-top:7px;font-weight:800;font-size:14px;color:#ff5a3c}'+
        '.p14 .foot{margin-top:auto;padding-top:16px;border-top:1px dashed #dfe3ea}'+
        '.p14 .foot p{margin:0 0 3px;font-size:8.5px;color:#8b93a2;line-height:1.5}',
      html:'<div class="p14"><div class="tk"><div class="stub"><div class="logo">Jouw Bedrijf<small>installatie</small></div>'+
        '<div><div class="lab">'+esc(m.grand[0])+'</div><div class="big">'+m.grand[1]+'</div></div>'+
        '<div><div class="lab">Details</div>'+metaList(m)+'</div>'+
        '<div style="margin-top:auto">'+recipientBlock(m)+'</div></div>'+
        '<div class="main"><h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        (m.scope?'<div class="scope"><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+
        slotBlock(m)+'<div class="foot">'+senderBlock(m)+m.foot.map(function(f){return '<p>'+esc(f)+'</p>';}).join("")+'</div>'+
        '</div></div></div>'
    };}
  },

  /* B5 ----------------------------------------------------------------- */
  { id:"memo", name:"Memo", tag:"Handgeschreven", family:"Caveat",
    desc:"",
    render:function(m){ return {
      css:'.p15{font-family:"Instrument Sans",sans-serif;font-size:11px;color:#25262a;'+
        'background:#fffef8;background-image:repeating-linear-gradient(to bottom,transparent 0 25px,#e7e9ef 25px 26px);'+
        'padding:46px 44px 44px 92px;position:relative}'+
        '.p15:before{content:"";position:absolute;left:66px;top:0;bottom:0;width:2px;background:#f2b8b0}'+
        '.p15 .top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}'+
        '.p15 .logo{font-weight:700;font-size:19px;letter-spacing:-.02em;color:#25262a}'+
        '.p15 .logo small{letter-spacing:.18em;font-size:.38em;color:#9599a5;font-weight:500}'+
        '.p15 .sender{text-align:right;font-size:9px;color:#6f7482;line-height:1.6}'+
        '.p15 .sender .sn{font-weight:700;color:#25262a;font-size:10.5px}'+
        '.p15 .scribble{font-family:"Caveat",cursive;font-size:20px;color:#c0453a;transform:rotate(-2.5deg);display:inline-block}'+
        '.p15 h2{font-family:"Caveat",cursive;font-size:40px;font-weight:700;margin:22px 0 0;color:#25262a;line-height:1}'+
        '.p15 .docnum{font-size:11px;color:#6f7482;letter-spacing:.06em}'+
        '.p15 .subj{margin-top:12px;font-size:13px;font-weight:600}'+
        '.p15 .cols{display:flex;gap:34px;margin-top:22px}'+
        '.p15 .cols>div{flex:1}'+
        '.p15 .lab{font-family:"Caveat",cursive;font-size:16px;color:#c0453a;margin-bottom:2px}'+
        '.p15 .rn{font-weight:700;font-size:13px}.p15 .ra{color:#6f7482;line-height:1.5}'+
        '.p15 .mrow{display:flex;justify-content:space-between;padding:1.5px 0}'+
        '.p15 .mrow span{color:#9599a5}.p15 .mrow b{font-weight:700}'+
        '.p15 .scope{margin-top:18px}.p15 .scope p{margin:0;color:#4d525e;line-height:1.63;max-width:74ch}'+
        BASE_TABLE({hp:'6px 6px',rp:'7px 6px'})+
        '.p15 .lt{margin-top:20px;background:#fff;box-shadow:0 0 0 1px #e2e5ec}'+
        '.p15 .lt th{color:#9599a5;border-bottom:1.5px solid #25262a;letter-spacing:.1em}'+
        '.p15 .lt td{border-bottom:1px solid #eef0f4}'+
        '.p15 .lt .d{font-weight:500}'+
        '.p15 .totwrap{display:flex;justify-content:flex-end;margin-top:12px;align-items:flex-start;gap:14px}'+
        '.p15 .tot{width:50%}.p15 .tot td{padding:3px 6px}'+
        '.p15 .tot .muted td{color:#9599a5}'+
        '.p15 .tot .grand td{font-family:"Caveat",cursive;font-size:24px;color:#c0453a;border-top:2px solid #c0453a;padding-top:4px}'+
        '.p15 .foot{margin-top:24px;border-top:1px dashed #cfd3dc;padding-top:12px}'+
        '.p15 .foot p{margin:0 0 4px;font-size:9.5px;color:#6f7482;line-height:1.55}',
      html:'<div class="p15"><div class="top"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap"><span class="scribble">'+(m.isOffer?'geldig tot '+esc(m.meta[1]?m.meta[1][1]:''):'graag voor '+esc(m.meta[1]?m.meta[1][1]:''))+'</span>'+totalRows(m)+'</div>'+
        footBlock(m)+'</div>'
    };}
  },

  /* B6 ----------------------------------------------------------------- */
  { id:"neon", name:"Neon", tag:"Donker", family:"Bricolage Grotesque",
    desc:"",
    render:function(m){ return {
      css:'.p16{font-family:"Bricolage Grotesque",sans-serif;font-size:10.5px;color:#d8dbe2;background:#0e1013;padding:40px 44px}'+
        '.p16 .top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:16px;border-bottom:1px solid #23262d}'+
        '.p16 .logo{font-weight:800;font-size:20px;color:#fff;letter-spacing:-.03em}'+
        '.p16 .logo small{letter-spacing:.2em;font-size:.36em;color:#c6f24a;font-weight:600}'+
        '.p16 .sender{text-align:right;font-size:9px;color:#828894;line-height:1.6}'+
        '.p16 .sender .sn{color:#fff;font-weight:700;font-size:10.5px}'+
        '.p16 .mega{margin:28px 0 0;display:flex;align-items:flex-end;justify-content:space-between;gap:24px}'+
        '.p16 .mega h2{margin:0;font-size:62px;font-weight:800;letter-spacing:-.055em;line-height:.85;color:#c6f24a}'+
        '.p16 .mega .rt{text-align:right}'+
        '.p16 .mega .rt .docnum{font-size:12px;color:#828894;letter-spacing:.06em}'+
        '.p16 .mega .rt b{display:block;font-size:26px;font-weight:800;color:#fff;letter-spacing:-.035em;margin-top:6px}'+
        '.p16 .subj{margin-top:16px;font-size:14px;color:#fff;font-weight:600;max-width:60ch}'+
        '.p16 .cols{display:flex;gap:30px;margin-top:24px;border-top:1px solid #23262d;border-bottom:1px solid #23262d;padding:16px 0}'+
        '.p16 .cols>div{flex:1}'+
        '.p16 .lab{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#c6f24a;font-weight:700;margin-bottom:6px}'+
        '.p16 .rn{color:#fff;font-weight:700;font-size:13px}.p16 .ra{color:#9aa0ab;line-height:1.5}'+
        '.p16 .mrow{display:flex;justify-content:space-between;padding:2.5px 0}'+
        '.p16 .mrow span{color:#6f7683}.p16 .mrow b{color:#fff;font-weight:700}'+
        '.p16 .scope{margin-top:18px}.p16 .scope p{margin:0;color:#9aa0ab;line-height:1.65;max-width:78ch}'+
        BASE_TABLE({hp:'7px 7px',rp:'8px 7px'})+
        '.p16 .lt{margin-top:22px}'+
        '.p16 .lt th{color:#0e1013;background:#c6f24a;letter-spacing:.1em;font-weight:700}'+
        '.p16 .lt td{border-bottom:1px solid #1d2026}'+
        '.p16 .lt .d{color:#fff;font-weight:600}'+
        '.p16 .totwrap{display:flex;justify-content:flex-end;margin-top:14px}'+
        '.p16 .tot{width:50%}.p16 .tot td{padding:3.5px 7px}'+
        '.p16 .tot .muted td{color:#6f7683}'+
        '.p16 .tot .grand td{border-top:2px solid #c6f24a;padding-top:8px;color:#c6f24a;font-weight:800;font-size:16px}'+
        '.p16 .foot{margin-top:24px;border-top:1px solid #23262d;padding-top:12px}'+
        '.p16 .foot p{margin:0 0 4px;font-size:9px;color:#6f7683;line-height:1.55}',
      html:'<div class="p16"><div class="top"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<div class="mega"><h2>'+esc(m.title)+'</h2><div class="rt"><div class="docnum">'+esc(m.number)+'</div><b>'+m.grand[1]+'</b></div></div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div>'
    };}
  },

  /* B7 ----------------------------------------------------------------- */
  { id:"blokken", name:"Blokken", tag:"Bauhaus", family:"Archivo",
    desc:"",
    render:function(m){ return {
      css:'.p17{font-family:"Archivo",sans-serif;font-size:10.5px;color:#14141a;background:#f4f1ec;padding:0;position:relative;overflow:hidden}'+
        '.p17 .band{display:flex;height:96px}'+
        '.p17 .band .b1{flex:2;background:#1b3fd8}'+
        '.p17 .band .b2{flex:1;background:#e5342a}'+
        '.p17 .band .b3{flex:1;background:#f2c318}'+
        '.p17 .circ{position:absolute;right:44px;top:44px;width:104px;height:104px;border-radius:50%;background:#14141a;color:#fff;'+
          'display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8px}'+
        '.p17 .circ span{font-size:7.5px;letter-spacing:.16em;text-transform:uppercase;color:#f2c318;font-weight:700}'+
        '.p17 .circ b{font-size:16px;font-weight:800;letter-spacing:-.03em;margin-top:2px;line-height:1.1}'+
        '.p17 .body{padding:34px 44px 44px}'+
        '.p17 .logo{font-weight:800;font-size:21px;letter-spacing:-.03em}'+
        '.p17 .logo small{letter-spacing:.2em;font-size:.36em;color:#1b3fd8}'+
        '.p17 h2{font-size:40px;font-weight:800;letter-spacing:-.05em;margin:16px 0 0;line-height:.95;max-width:70%}'+
        '.p17 .docnum{font-size:12px;font-weight:700;color:#e5342a;letter-spacing:.04em;margin-top:4px}'+
        '.p17 .subj{margin-top:12px;font-size:13px;font-weight:600;max-width:58ch}'+
        '.p17 .cols{display:flex;gap:0;margin-top:24px;border-top:3px solid #14141a}'+
        '.p17 .cols>div{flex:1;padding:14px 16px;border-right:1px solid #d9d4ca}'+
        '.p17 .cols>div:first-child{padding-left:0}'+
        '.p17 .cols>div:last-child{border-right:0}'+
        '.p17 .lab{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#1b3fd8;font-weight:700;margin-bottom:5px}'+
        '.p17 .rn{font-weight:800;font-size:13px}.p17 .ra{color:#5b5b63;line-height:1.5}'+
        '.p17 .mrow{display:flex;justify-content:space-between;padding:2.5px 0}'+
        '.p17 .mrow span{color:#8b8b93}.p17 .mrow b{font-weight:700}'+
        '.p17 .sender{font-size:9px;color:#5b5b63;line-height:1.55}'+
        '.p17 .sender .sn{font-weight:800;color:#14141a;font-size:10.5px}'+
        '.p17 .scope{margin-top:18px}.p17 .scope p{margin:0;color:#4c4c54;line-height:1.6;max-width:76ch}'+
        BASE_TABLE({hp:'7px 7px',rp:'8px 7px'})+
        '.p17 .lt{margin-top:20px}'+
        '.p17 .lt th{background:#1b3fd8;color:#fff;letter-spacing:.1em;font-weight:700}'+
        '.p17 .lt td{border-bottom:1px solid #ddd8ce}'+
        '.p17 .lt .d{font-weight:600}'+
        '.p17 .totwrap{display:flex;justify-content:flex-end;margin-top:14px}'+
        '.p17 .tot{width:50%}.p17 .tot td{padding:3.5px 7px}'+
        '.p17 .tot .muted td{color:#8b8b93}'+
        '.p17 .tot .grand td{background:#f2c318;font-weight:800;font-size:15px;padding:9px 7px}'+
        '.p17 .foot{margin-top:24px;border-top:3px solid #14141a;padding-top:12px}'+
        '.p17 .foot p{margin:0 0 4px;font-size:9px;color:#5b5b63;line-height:1.55}',
      html:'<div class="p17"><div class="band"><div class="b1"></div><div class="b2"></div><div class="b3"></div></div>'+
        '<div class="circ"><span>'+esc(m.t.total)+'</span><b>'+m.grand[1]+'</b></div>'+
        '<div class="body"><div class="logo">Jouw Bedrijf<small>installatie</small></div>'+
        '<h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div>'+
        '<div><div class="lab">'+esc(m.t.sender)+'</div>'+senderBlock(m)+'</div></div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div></div>'
    };}
  },

  /* B8 ----------------------------------------------------------------- */
  { id:"duotone", name:"Duotone", tag:"Display", family:"Fraunces",
    desc:"",
    render:function(m){ return {
      css:'.p18{font-family:"Instrument Sans",sans-serif;font-size:10.5px;color:#231b2e;background:#fdf6f3}'+
        '.p18 .hd{background:#2d1b4e;color:#ffd9c9;padding:36px 46px 30px;position:relative;overflow:hidden}'+
        '.p18 .hd:after{content:"";position:absolute;right:-70px;bottom:-90px;width:250px;height:250px;border-radius:50%;background:#ff6a4d;opacity:.9}'+
        '.p18 .hdrow{display:flex;justify-content:space-between;gap:22px;position:relative;z-index:1}'+
        '.p18 .logo{font-family:"Fraunces",serif;font-weight:900;font-size:22px;color:#fff;letter-spacing:-.02em}'+
        '.p18 .logo small{font-family:"Instrument Sans",sans-serif;letter-spacing:.2em;font-size:.36em;color:#c6a8f0;font-weight:600}'+
        '.p18 .hd .sender{text-align:right;font-size:9px;color:#c6a8f0;line-height:1.6}'+
        '.p18 .hd .sender .sn{color:#fff;font-weight:700;font-size:10.5px}'+
        '.p18 .hd h2{font-family:"Fraunces",serif;font-weight:900;font-size:56px;letter-spacing:-.04em;margin:22px 0 0;color:#fff;line-height:.9;position:relative;z-index:1}'+
        '.p18 .hd .docnum{font-size:12px;color:#c6a8f0;margin-top:6px;letter-spacing:.08em;position:relative;z-index:1}'+
        '.p18 .body{padding:30px 46px 44px}'+
        '.p18 .subj{font-family:"Fraunces",serif;font-size:17px;font-weight:600;letter-spacing:-.015em;max-width:56ch}'+
        '.p18 .cols{display:flex;gap:34px;margin-top:22px}'+
        '.p18 .cols>div{flex:1}'+
        '.p18 .lab{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#a08bb8;font-weight:700;margin-bottom:5px}'+
        '.p18 .rn{font-weight:700;font-size:13px}.p18 .ra{color:#6b5f78;line-height:1.5}'+
        '.p18 .mrow{display:flex;justify-content:space-between;padding:2.5px 0;border-bottom:1px solid #f0e3dd}'+
        '.p18 .mrow span{color:#a08bb8}.p18 .mrow b{font-weight:700}'+
        '.p18 .scope{margin-top:20px}.p18 .scope p{margin:0;color:#6b5f78;line-height:1.65;max-width:74ch}'+
        BASE_TABLE({hp:'7px 7px',rp:'8px 7px'})+
        '.p18 .lt{margin-top:22px}'+
        '.p18 .lt th{color:#a08bb8;border-bottom:2px solid #2d1b4e;letter-spacing:.12em}'+
        '.p18 .lt td{border-bottom:1px solid #f4e9e4}'+
        '.p18 .lt .d{font-weight:600}'+
        '.p18 .totwrap{display:flex;justify-content:flex-end;margin-top:14px}'+
        '.p18 .tot{width:50%}.p18 .tot td{padding:3.5px 7px}'+
        '.p18 .tot .muted td{color:#a08bb8}'+
        '.p18 .tot .grand td{font-family:"Fraunces",serif;font-weight:900;font-size:20px;color:#ff6a4d;border-top:2px solid #2d1b4e;padding-top:8px}'+
        '.p18 .foot{margin-top:26px;border-top:1px solid #f0e3dd;padding-top:12px}'+
        '.p18 .foot p{margin:0 0 4px;font-size:9px;color:#8d8095;line-height:1.55}',
      html:'<div class="p18"><div class="hd"><div class="hdrow"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div></div>'+
        '<div class="body">'+(m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div></div>'
    };}
  },

  /* B9 ----------------------------------------------------------------- */
  { id:"bubbel", name:"Bubbel", tag:"Vriendelijk", family:"Outfit",
    desc:"",
    render:function(m){ return {
      css:'.p19{font-family:"Outfit",sans-serif;font-size:11px;color:#1f2b33;background:#eff8fb;padding:38px 42px}'+
        '.p19 .pill{background:#fff;border-radius:999px;padding:14px 26px;display:flex;justify-content:space-between;align-items:center;gap:20px}'+
        '.p19 .logo{font-weight:800;font-size:20px;color:#0f7b93;letter-spacing:-.03em}'+
        '.p19 .logo small{letter-spacing:.18em;font-size:.36em;color:#78b3c2;font-weight:600}'+
        '.p19 .pill .sender{text-align:right;font-size:9px;color:#5f7885;line-height:1.5}'+
        '.p19 .pill .sender .sn{font-weight:700;color:#1f2b33;font-size:10.5px}'+
        '.p19 .head{background:#fff;border-radius:28px;padding:26px 30px;margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:24px}'+
        '.p19 .head h2{margin:0;font-size:32px;font-weight:800;letter-spacing:-.04em;color:#0f7b93}'+
        '.p19 .head .docnum{font-size:12px;color:#78b3c2;font-weight:600;margin-top:2px}'+
        '.p19 .head .subj{font-size:12px;color:#4a616c;margin-top:8px;max-width:46ch;line-height:1.45}'+
        '.p19 .head .amt{background:#ffe9a8;border-radius:999px;padding:16px 26px;text-align:center;flex:none}'+
        '.p19 .head .amt span{display:block;font-size:8px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:#8a6a10}'+
        '.p19 .head .amt b{font-size:22px;font-weight:800;color:#5e4708;letter-spacing:-.03em}'+
        '.p19 .cols{display:flex;gap:12px;margin-top:14px}'+
        '.p19 .cols>div{flex:1;background:#fff;border-radius:24px;padding:16px 22px}'+
        '.p19 .lab{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#9fc2ce;font-weight:700;margin-bottom:5px}'+
        '.p19 .rn{font-weight:700;font-size:13px}.p19 .ra{color:#5f7885;line-height:1.5}'+
        '.p19 .mrow{display:flex;justify-content:space-between;padding:2.5px 0}'+
        '.p19 .mrow span{color:#9fc2ce}.p19 .mrow b{font-weight:700}'+
        '.p19 .card{background:#fff;border-radius:28px;padding:20px 26px;margin-top:14px}'+
        '.p19 .scope p{margin:6px 0 0;color:#5f7885;line-height:1.6;max-width:76ch}'+
        BASE_TABLE({hp:'6px 12px',rp:'8px 12px'})+
        '.p19 .lt th{color:#9fc2ce;letter-spacing:.12em}'+
        '.p19 .lt thead tr{background:#eff8fb}'+
        '.p19 .lt th:first-child{border-radius:999px 0 0 999px}'+
        '.p19 .lt th:last-child{border-radius:0 999px 999px 0}'+
        '.p19 .lt td{border-bottom:1px solid #eef5f8}'+
        '.p19 .lt .d{font-weight:600}'+
        '.p19 .totwrap{display:flex;justify-content:flex-end;margin-top:12px}'+
        '.p19 .tot{width:52%}.p19 .tot td{padding:3px 12px}'+
        '.p19 .tot .muted td{color:#9fc2ce}'+
        '.p19 .tot .grand td{background:#0f7b93;color:#fff;font-weight:800;font-size:15px;padding:9px 12px}'+
        '.p19 .tot .grand td:first-child{border-radius:999px 0 0 999px}'+
        '.p19 .tot .grand td:last-child{border-radius:0 999px 999px 0}'+
        '.p19 .foot p{margin:0 0 4px;font-size:9px;color:#7b95a1;line-height:1.55}',
      html:'<div class="p19"><div class="pill"><div class="logo">Jouw Bedrijf<small>installatie</small></div>'+senderBlock(m)+'</div>'+
        '<div class="head"><div><h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+'</div>'+
        '<div class="amt"><span>'+esc(m.t.total)+'</span><b>'+m.grand[1]+'</b></div></div>'+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        (m.scope?'<div class="card scope"><div class="lab">'+esc(m.t.scope)+'</div><p>'+esc(m.scope)+'</p></div>':'')+
        '<div class="card"><table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div></div>'+
        slotBlock(m)+(m.foot.length?'<div class="card foot">'+m.foot.map(function(f){return '<p>'+esc(f)+'</p>';}).join("")+'</div>':'')+
        '</div>'
    };}
  },

  /* B10 ---------------------------------------------------------------- */
  { id:"krant", name:"Krant", tag:"Redactioneel", family:"Fraunces",
    desc:"",
    render:function(m){ return {
      css:'.p20{font-family:"Fraunces",Georgia,serif;font-size:10.5px;color:#1a1713;background:#fbf7ee;padding:36px 42px}'+
        '.p20 .kop{border-top:5px solid #1a1713;border-bottom:1px solid #1a1713;padding:10px 0 8px;display:flex;justify-content:space-between;align-items:baseline;gap:18px}'+
        '.p20 .logo{font-family:"Fraunces",serif;font-weight:900;font-size:24px;letter-spacing:-.02em}'+
        '.p20 .logo small{font-family:"Instrument Sans",sans-serif;letter-spacing:.28em;font-size:.3em;color:#8a7c66;font-weight:600}'+
        '.p20 .kop .ed{font-family:"Instrument Sans",sans-serif;font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:#8a7c66;text-align:right;line-height:1.7}'+
        '.p20 h2{font-family:"Fraunces",serif;font-weight:900;font-size:52px;letter-spacing:-.04em;line-height:.92;margin:18px 0 0;text-wrap:balance}'+
        '.p20 .dek{font-size:14px;color:#544b3c;margin-top:8px;max-width:62ch;line-height:1.4;font-weight:400}'+
        '.p20 .byline{font-family:"Instrument Sans",sans-serif;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#8a7c66;margin-top:10px;border-bottom:1px solid #ddd2bc;padding-bottom:10px}'+
        '.p20 .cols{display:flex;gap:26px;margin-top:16px}'+
        '.p20 .cols>div{flex:1;border-right:1px solid #ddd2bc;padding-right:26px}'+
        '.p20 .cols>div:last-child{border-right:0;padding-right:0}'+
        '.p20 .lab{font-family:"Instrument Sans",sans-serif;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#a8997f;font-weight:700;margin-bottom:5px}'+
        '.p20 .rn{font-weight:600;font-size:13px}.p20 .ra{color:#6b6152;line-height:1.5}'+
        '.p20 .mrow{display:flex;justify-content:space-between;padding:2px 0}'+
        '.p20 .mrow span{color:#a8997f}.p20 .mrow b{font-weight:600}'+
        '.p20 .sender{font-size:9.5px;color:#6b6152;line-height:1.55}'+
        '.p20 .sender .sn{font-weight:600;color:#1a1713}'+
        '.p20 .scope{margin-top:16px;column-count:2;column-gap:26px;column-rule:1px solid #ddd2bc}'+
        '.p20 .scope p{margin:0;color:#544b3c;line-height:1.6;text-align:justify}'+
        BASE_TABLE({hp:'7px 6px',rp:'7px 6px'})+
        '.p20 .lt{margin-top:20px}'+
        '.p20 .lt th{font-family:"Instrument Sans",sans-serif;color:#8a7c66;border-top:2px solid #1a1713;border-bottom:1px solid #1a1713;letter-spacing:.14em}'+
        '.p20 .lt td{border-bottom:1px solid #e7dcc7}'+
        '.p20 .lt .d{font-weight:600}'+
        '.p20 .totwrap{display:flex;justify-content:flex-end;margin-top:12px}'+
        '.p20 .tot{width:48%}.p20 .tot td{padding:3px 6px}'+
        '.p20 .tot .muted td{color:#a8997f}'+
        '.p20 .tot .grand td{border-top:2px solid #1a1713;border-bottom:4px double #1a1713;padding:7px 6px;font-weight:900;font-size:17px}'+
        '.p20 .foot{margin-top:22px;border-top:1px solid #ddd2bc;padding-top:10px}'+
        '.p20 .foot p{margin:0 0 4px;font-family:"Instrument Sans",sans-serif;font-size:8.5px;color:#8a7c66;line-height:1.55}',
      html:'<div class="p20"><div class="kop"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+
        '<div class="ed">'+esc(m.title)+' &middot; '+esc(m.number)+'<br>'+metaInline(m,' &middot; ')+'</div></div>'+
        '<h2>'+esc(m.subject||m.recipient.name)+'</h2>'+
        '<div class="dek">'+esc(m.title)+' '+esc(m.number)+' voor '+esc(m.recipient.name)+'.</div>'+
        '<div class="byline">'+esc(m.senderName)+'</div>'+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div>'+
        '<div><div class="lab">'+esc(m.t.sender)+'</div>'+senderBlock(m)+'</div></div>'+
        (m.scope?'<div class="scope"><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div>'
    };}
  }
  ];

  /* SERIE C — gangbare factuurpatronen. */

  function senderInline(m){
    return m.senderLines.filter(Boolean).join("  ·  ");
  }

  var SKINS_C = [

  /* C1 --- Minimaal ---------------------------------------------------- */
  { id:"stripe", name:"Minimaal", tag:"Sober", family:"Instrument Sans",
    desc:"",
    render:function(m){ return {
      css:'.p31{padding:54px 58px;font-family:"Instrument Sans",sans-serif;font-size:11px;color:#1a1f24;background:#fff}'+
        '.p31 .logo{font-size:19px;font-weight:700;letter-spacing:-.02em}'+
        '.p31 .logo small{letter-spacing:.18em;font-size:.4em;color:#8e979d;font-weight:600}'+
        '.p31 h2{font-size:17px;font-weight:600;margin:26px 0 0;letter-spacing:-.01em}'+
        '.p31 .hr{height:2px;background:var(--ac);width:44px;margin:10px 0 0}'+
        '.p31 .kv{display:grid;grid-template-columns:repeat(2,1fr);gap:14px 34px;margin-top:26px}'+
        '.p31 .kv .cell span{display:block;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#98a0a6;font-weight:600;margin-bottom:3px}'+
        '.p31 .kv .cell b{font-weight:600;font-size:11.5px}'+
        '.p31 .cols{display:flex;gap:44px;margin-top:26px;border-top:1px solid #e6e9eb;padding-top:20px}'+
        '.p31 .cols>div{flex:1}'+
        '.p31 .lab{font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#98a0a6;font-weight:600;margin-bottom:5px}'+
        '.p31 .rn{font-weight:600;font-size:12.5px}.p31 .ra{color:#5e686e;line-height:1.55}'+
        '.p31 .sender{color:#5e686e;line-height:1.55}.p31 .sender .sn{font-weight:600;color:#1a1f24}'+
        '.p31 .scope{margin-top:22px}.p31 .scope p{margin:0;color:#5e686e;line-height:1.6;max-width:72ch}'+
        BASE_TABLE({hp:'0 6px 8px',rp:'9px 6px'})+
        '.p31 .lt{margin-top:26px;border-top:1px solid #1a1f24}'+
        '.p31 .lt thead tr{border-bottom:1px solid #e6e9eb}'+
        '.p31 .lt th{padding-top:9px;color:#98a0a6;letter-spacing:.12em}'+
        '.p31 .lt td{border-bottom:1px solid #f1f3f4}'+
        '.p31 .lt tr:last-child td{border-bottom:1px solid #1a1f24}'+
        '.p31 .totwrap{display:flex;justify-content:flex-end;margin-top:14px}'+
        '.p31 .tot{width:48%}.p31 .tot td{padding:4px 6px}'+
        '.p31 .tot .muted td{color:#98a0a6}'+
        '.p31 .tot .grand td{padding-top:9px;font-weight:700;font-size:15px;color:var(--ac-deep)}'+
        '.p31 .foot{margin-top:22px}.p31 .foot .lab{margin-bottom:4px}'+
        '.p31 .foot p{margin:0 0 3px;font-size:9px;color:#98a0a6;line-height:1.55}',
      html:'<div class="p31"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+
        '<h2>'+esc(m.title)+' '+esc(m.number)+'</h2><div class="hr"></div>'+
        '<div class="kv">'+m.meta.map(function(x){
            return '<div class="cell"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>';
          }).join("")+'</div>'+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">'+esc(m.t.sender)+'</div>'+senderBlock(m)+'</div></div>'+
        (m.subject?'<div class="scope"><div class="lab">'+(m.isOffer?'Project':'Omschrijving')+'</div><p><strong>'+esc(m.subject)+'</strong></p></div>':'')+
        (m.scope?'<div class="scope"><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div>'
    };}
  },

  /* C2 --- Kleurband ----------------------------------------------------- */
  { id:"kleurband", name:"Kleurband", tag:"Kopbalk", family:"Instrument Sans",
    desc:"",
    render:function(m){ return {
      css:'.p32{font-family:"Instrument Sans",sans-serif;font-size:11px;color:#1a1f24;background:#fff}'+
        '.p32 .band{background:var(--ac-deep);color:var(--ac-on-deep);padding:30px 48px;display:flex;justify-content:space-between;align-items:center;gap:24px;min-height:104px}'+
        '.p32 .logo{font-size:23px;font-weight:800;letter-spacing:-.03em}'+
        '.p32 .logo small{letter-spacing:.2em;font-size:.34em;color:var(--ac-mid);font-weight:600}'+
        '.p32 .band .rt{text-align:right}'+
        '.p32 .band .rt b{display:block;font-size:27px;font-weight:800;letter-spacing:-.03em;line-height:1}'+
        '.p32 .band .rt span{font-size:11px;color:var(--ac-mid);letter-spacing:.1em}'+
        '.p32 .body{padding:28px 48px 44px}'+
        '.p32 .cols{display:flex;gap:38px}'+
        '.p32 .cols>div{flex:1}'+
        '.p32 .lab{font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:#98a0a6;font-weight:700;margin-bottom:5px}'+
        '.p32 .rn{font-weight:700;font-size:13px}.p32 .ra{color:#5e686e;line-height:1.55}'+
        '.p32 .sender{color:#5e686e;line-height:1.55}.p32 .sender .sn{font-weight:700;color:#1a1f24}'+
        '.p32 .mrow{display:flex;justify-content:space-between;padding:2.5px 0;border-bottom:1px solid #eef1f2}'+
        '.p32 .mrow span{color:#98a0a6}.p32 .mrow b{font-weight:700}'+
        '.p32 .subj{margin-top:20px;font-size:14px;font-weight:700;letter-spacing:-.01em}'+
        '.p32 .scope p{margin:8px 0 0;color:#5e686e;line-height:1.6;max-width:74ch}'+
        BASE_TABLE({hp:'8px 8px',rp:'8px 8px'})+
        '.p32 .lt{margin-top:22px}'+
        '.p32 .lt th{background:var(--ac-soft);color:var(--ac-deep);letter-spacing:.1em}'+
        '.p32 .lt td{border-bottom:1px solid #eef1f2}'+
        '.p32 .lt .d{font-weight:600}'+
        '.p32 .totwrap{display:flex;justify-content:flex-end;margin-top:14px}'+
        '.p32 .tot{width:50%}.p32 .tot td{padding:4px 8px}'+
        '.p32 .tot .muted td{color:#98a0a6}'+
        '.p32 .tot .grand td{background:var(--ac-deep);color:var(--ac-on-deep);font-weight:800;font-size:15px;padding:9px 8px}'+
        '.p32 .foot{margin-top:22px}.p32 .foot p{margin:0 0 3px;font-size:9px;color:#98a0a6;line-height:1.55}',
      html:'<div class="p32"><div class="band"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+
        '<div class="rt"><b>'+esc(m.title)+'</b><span>'+esc(m.number)+'</span></div></div>'+
        '<div class="body"><div class="cols"><div>'+recipientBlock(m)+'</div>'+
        '<div><div class="lab">'+esc(m.t.sender)+'</div>'+senderBlock(m)+'</div>'+
        '<div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        (m.scope?'<div class="scope"><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div></div>'
    };}
  },

  /* C3 --- Groot Bedrag -------------------------------------------------- */
  { id:"grootbedrag", name:"Groot Bedrag", tag:"Callout", family:"Instrument Sans",
    desc:"",
    render:function(m){ return {
      css:'.p33{padding:46px 50px;font-family:"Instrument Sans",sans-serif;font-size:11px;color:#1a1f24;background:#fff}'+
        '.p33 .top{display:flex;justify-content:space-between;align-items:flex-start;gap:22px}'+
        '.p33 .logo{font-size:19px;font-weight:700;letter-spacing:-.02em}'+
        '.p33 .logo small{letter-spacing:.18em;font-size:.4em;color:var(--ac-deep);font-weight:600}'+
        '.p33 .sender{text-align:right;font-size:9.5px;color:#68727a;line-height:1.55}'+
        '.p33 .sender .sn{font-weight:700;color:#1a1f24;font-size:11px}'+
        '.p33 .hero{margin-top:26px;background:var(--ac-soft);border-radius:4px;padding:22px 26px;display:flex;align-items:center;justify-content:space-between;gap:26px}'+
        '.p33 .hero .l span{display:block;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--ac-deep);font-weight:700}'+
        '.p33 .hero .l b{display:block;font-size:40px;font-weight:800;letter-spacing:-.04em;color:var(--ac-deep);line-height:1.05;margin-top:4px}'+
        '.p33 .hero .r{text-align:right}'+
        '.p33 .hero .r span{display:block;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#7e878d;font-weight:700}'+
        '.p33 .hero .r b{display:block;font-size:17px;font-weight:700;margin-top:3px}'+
        '.p33 .hero .r em{display:block;font-style:normal;font-size:10.5px;color:#7e878d;margin-top:8px}'+
        '.p33 .cols{display:flex;gap:38px;margin-top:24px}'+
        '.p33 .cols>div{flex:1}'+
        '.p33 .lab{font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:#98a0a6;font-weight:700;margin-bottom:5px}'+
        '.p33 .rn{font-weight:700;font-size:12.5px}.p33 .ra{color:#68727a;line-height:1.55}'+
        '.p33 .mrow{display:flex;justify-content:space-between;padding:2.5px 0}'+
        '.p33 .mrow span{color:#98a0a6}.p33 .mrow b{font-weight:700}'+
        '.p33 .scope{margin-top:20px}.p33 .scope p{margin:0;color:#68727a;line-height:1.6;max-width:74ch}'+
        BASE_TABLE({hp:'6px 6px',rp:'7px 6px'})+
        '.p33 .lt{margin-top:22px}'+
        '.p33 .lt th{color:#a6adb2;border-bottom:1px solid #dfe3e5;letter-spacing:.12em}'+
        '.p33 .lt td{border-bottom:1px solid #f2f4f5;color:#4d565c}'+
        '.p33 .lt .d{color:#1a1f24;font-weight:500}'+
        '.p33 .totwrap{display:flex;justify-content:flex-end;margin-top:12px}'+
        '.p33 .tot{width:46%}.p33 .tot td{padding:3px 6px;color:#68727a}'+
        '.p33 .tot .grand td{border-top:1px solid #cfd5d8;padding-top:7px;font-weight:700;font-size:12.5px;color:#1a1f24}'+
        '.p33 .foot{margin-top:20px}.p33 .foot p{margin:0 0 3px;font-size:9px;color:#98a0a6;line-height:1.55}',
      html:'<div class="p33"><div class="top"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<div class="hero"><div class="l"><span>'+esc(m.isOffer?m.t.total:(m.lang==="nl"?"Te betalen":"Amount due"))+'</span><b>'+m.grand[1]+'</b></div>'+
        '<div class="r"><span>'+esc(m.meta[1]?m.meta[1][0]:m.meta[0][0])+'</span><b>'+esc(m.meta[1]?m.meta[1][1]:m.meta[0][1])+'</b>'+
        '<em>'+esc(m.title)+' '+esc(m.number)+'</em></div></div>'+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        (m.subject?'<div class="scope"><div class="lab">Project</div><p><strong>'+esc(m.subject)+'</strong></p></div>':'')+
        (m.scope?'<div class="scope"><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div>'
    };}
  },

  /* C4 --- Haarlijn ------------------------------------------------------ */
  { id:"haarlijn", name:"Haarlijn", tag:"Ingetogen", family:"Instrument Sans",
    desc:"",
    render:function(m){ return {
      css:'.p34{padding:74px 76px;font-family:"Instrument Sans",sans-serif;font-size:10.5px;color:#23282c;background:#fff;line-height:1.6}'+
        '.p34 .top{display:flex;justify-content:space-between;align-items:baseline;gap:24px;border-bottom:.5px solid #b9bfc3;padding-bottom:10px}'+
        '.p34 .logo{font-size:15px;font-weight:600;letter-spacing:.01em}'+
        '.p34 .logo small{letter-spacing:.24em;font-size:.46em;color:#9aa1a6;font-weight:500}'+
        '.p34 .top .rt{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#9aa1a6}'+
        '.p34 h2{font-size:14px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;margin:40px 0 0}'+
        '.p34 .subj{margin-top:8px;color:#5d666c;max-width:62ch}'+
        '.p34 .cols{display:flex;gap:46px;margin-top:34px}'+
        '.p34 .cols>div{flex:1}'+
        '.p34 .lab{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#9aa1a6;font-weight:600;margin-bottom:6px}'+
        '.p34 .rn{font-weight:600;font-size:11.5px}.p34 .ra{color:#5d666c;line-height:1.5}'+
        '.p34 .sender{color:#5d666c;line-height:1.5}.p34 .sender .sn{font-weight:600;color:#23282c}'+
        '.p34 .mrow{display:flex;justify-content:space-between;padding:1.5px 0}'+
        '.p34 .mrow span{color:#9aa1a6}.p34 .mrow b{font-weight:600}'+
        '.p34 .scope{margin-top:28px}.p34 .scope p{margin:0;color:#5d666c;max-width:66ch}'+
        BASE_TABLE({hp:'0 4px 7px',rp:'8px 4px'})+
        '.p34 .lt{margin-top:34px;border-top:.5px solid #23282c}'+
        '.p34 .lt th{padding-top:8px;color:#9aa1a6;letter-spacing:.18em}'+
        '.p34 .lt td{border-bottom:.5px solid #dfe3e5}'+
        '.p34 .totwrap{display:flex;justify-content:flex-end;margin-top:14px}'+
        '.p34 .tot{width:44%}.p34 .tot td{padding:3px 4px;color:#5d666c}'+
        '.p34 .tot .grand td{border-top:.5px solid #23282c;padding-top:9px;font-weight:700;font-size:17px;color:var(--ac)}'+
        '.p34 .foot{margin-top:30px}.p34 .foot p{margin:0 0 4px;font-size:8.5px;color:#9aa1a6;line-height:1.6}',
      html:'<div class="p34"><div class="top"><div class="logo">Jouw Bedrijf<small>installatie</small></div>'+
        '<div class="rt">'+esc(m.number)+'</div></div>'+
        '<h2>'+esc(m.title)+'</h2>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">'+esc(m.t.sender)+'</div>'+senderBlock(m)+'</div>'+
        '<div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div>'
    };}
  },

  /* C5 --- Tweekleur ----------------------------------------------------- */
  { id:"tweekleur", name:"Tweekleur", tag:"Kopblok", family:"Archivo",
    desc:"",
    render:function(m){ return {
      css:'.p35{font-family:"Archivo",sans-serif;font-size:10.5px;color:#191d21;background:#fff}'+
        '.p35 .band{display:flex;min-height:96px}'+
        '.p35 .band .dk{flex:1;background:var(--ac-deep);color:var(--ac-on-deep);padding:24px 30px;display:flex;flex-direction:column;justify-content:center}'+
        '.p35 .band .ac{width:38%;background:var(--ac);color:var(--ac-on);padding:24px 26px;display:flex;flex-direction:column;justify-content:center}'+
        '.p35 .logo{font-size:21px;font-weight:800;letter-spacing:-.03em}'+
        '.p35 .logo small{letter-spacing:.2em;font-size:.34em;color:var(--ac-mid);font-weight:600}'+
        '.p35 .band .ac span{font-size:9px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;opacity:.8}'+
        '.p35 .band .ac b{font-size:24px;font-weight:800;letter-spacing:-.03em;line-height:1.05;margin-top:2px}'+
        '.p35 .band .ac em{font-style:normal;font-size:11px;margin-top:2px;opacity:.85}'+
        '.p35 .body{padding:28px 30px 42px}'+
        '.p35 .cols{display:flex;gap:34px}'+
        '.p35 .cols>div{flex:1}'+
        '.p35 .lab{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#98a0a6;font-weight:700;margin-bottom:5px}'+
        '.p35 .rn{font-weight:700;font-size:12.5px}.p35 .ra{color:#5f686e;line-height:1.5}'+
        '.p35 .sender{color:#5f686e;line-height:1.5}.p35 .sender .sn{font-weight:700;color:#191d21}'+
        '.p35 .mrow{display:flex;justify-content:space-between;padding:2.5px 0;border-bottom:1px solid #eef0f2}'+
        '.p35 .mrow span{color:#98a0a6}.p35 .mrow b{font-weight:700}'+
        '.p35 .subj{margin-top:18px;font-size:13.5px;font-weight:700}'+
        '.p35 .scope p{margin:7px 0 0;color:#5f686e;line-height:1.6;max-width:76ch}'+
        BASE_TABLE({hp:'7px 7px',rp:'8px 7px'})+
        '.p35 .lt{margin-top:20px}'+
        '.p35 .lt th{color:#98a0a6;border-top:2px solid var(--ac-deep);border-bottom:1px solid #e4e7ea;letter-spacing:.1em}'+
        '.p35 .lt td{border-bottom:1px solid #f1f3f5}'+
        '.p35 .lt .d{font-weight:600}'+
        '.p35 .totwrap{display:flex;justify-content:flex-end;margin-top:14px}'+
        '.p35 .tot{width:50%}.p35 .tot td{padding:3.5px 7px}'+
        '.p35 .tot .muted td{color:#98a0a6}'+
        '.p35 .tot .grand td{border-top:1px solid var(--ac-deep);padding-top:8px;font-weight:800;font-size:15px}'+
        '.p35 .tot .grand td:first-child{border-left:5px solid var(--ac);padding-left:10px}'+
        '.p35 .foot{margin-top:20px}.p35 .foot p{margin:0 0 3px;font-size:9px;color:#98a0a6;line-height:1.55}',
      html:'<div class="p35"><div class="band"><div class="dk"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div></div>'+
        '<div class="ac"><span>'+esc(m.meta[0][0])+' '+esc(m.meta[0][1])+'</span><b>'+esc(m.title)+'</b><em>'+esc(m.number)+'</em></div></div>'+
        '<div class="body"><div class="cols"><div>'+recipientBlock(m)+'</div>'+
        '<div><div class="lab">'+esc(m.t.sender)+'</div>'+senderBlock(m)+'</div>'+
        '<div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        (m.scope?'<div class="scope"><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div></div>'
    };}
  },

  /* C6 --- Enkele Kolom -------------------------------------------------- */
  { id:"enkelekolom", name:"Enkele Kolom", tag:"Studio", family:"Instrument Sans",
    desc:"",
    render:function(m){ return {
      css:'.p36{padding:64px 0;font-family:"Instrument Sans",sans-serif;font-size:11px;color:#1e2328;background:#fff}'+
        '.p36 .col{width:70%;margin:0 auto}'+
        '.p36 .logo{font-size:17px;font-weight:700;letter-spacing:-.02em;text-align:center}'+
        '.p36 .logo small{letter-spacing:.2em;font-size:.42em;color:var(--ac-deep);font-weight:600}'+
        '.p36 h2{text-align:center;font-size:13px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;margin:34px 0 4px;color:var(--ac-deep)}'+
        '.p36 .docnum{text-align:center;font-size:10.5px;color:#8f979d;letter-spacing:.1em}'+
        '.p36 .subj{text-align:center;margin-top:14px;font-size:13px;color:#4d565c;line-height:1.5}'+
        '.p36 .div{height:1px;background:#e3e7e9;margin:26px 0}'+
        '.p36 .lab{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#a3aaaf;font-weight:700;margin-bottom:5px}'+
        '.p36 .blk{margin-bottom:18px}'+
        '.p36 .rn{font-weight:700;font-size:12.5px}.p36 .ra{color:#5b646a;line-height:1.5}'+
        '.p36 .sender{color:#5b646a;line-height:1.5}.p36 .sender .sn{font-weight:700;color:#1e2328}'+
        '.p36 .mrow{display:flex;justify-content:space-between;padding:2px 0}'+
        '.p36 .mrow span{color:#a3aaaf}.p36 .mrow b{font-weight:700}'+
        '.p36 .scope p{margin:0;color:#5b646a;line-height:1.62}'+
        BASE_TABLE({hp:'0 0 8px',rp:'9px 0'})+
        '.p36 .lt{margin-top:20px}'+
        '.p36 .lt th{color:#a3aaaf;border-bottom:1px solid #1e2328;letter-spacing:.16em}'+
        '.p36 .lt td{border-bottom:1px solid #eef1f2}'+
        '.p36 .lt .d{font-weight:500}'+
        '.p36 .tot{width:100%;margin-top:12px}.p36 .tot td{padding:3px 0;color:#8f979d}'+
        '.p36 .tot .grand td{border-top:1px solid #1e2328;padding-top:9px;font-weight:700;font-size:16px;color:var(--ac-deep)}'+
        '.p36 .foot{margin-top:24px}.p36 .foot p{margin:0 0 3px;font-size:9px;color:#a3aaaf;line-height:1.55}',
      html:'<div class="p36"><div class="col"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+
        '<h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="div"></div>'+
        '<div class="blk">'+recipientBlock(m)+'</div>'+
        '<div class="blk"><div class="lab">'+esc(m.t.sender)+'</div>'+senderBlock(m)+'</div>'+
        '<div class="blk"><div class="lab">Details</div>'+metaList(m)+'</div>'+
        (m.scope?'<div class="blk scope"><div class="lab">'+esc(m.t.scope)+'</div><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        totalRows(m)+footBlock(m)+'</div></div>'
    };}
  },

  /* C7 --- Actie Eerst --------------------------------------------------- */
  { id:"actie", name:"Actie Eerst", tag:"Betalen/tekenen", family:"Instrument Sans",
    desc:"",
    render:function(m){ return {
      css:'.p37{padding:44px 48px;font-family:"Instrument Sans",sans-serif;font-size:10.5px;color:#1a1f24;background:#fff}'+
        '.p37 .top{display:flex;justify-content:space-between;align-items:flex-start;gap:22px;border-bottom:3px solid var(--ac-deep);padding-bottom:14px}'+
        '.p37 .logo{font-size:20px;font-weight:700;letter-spacing:-.02em}'+
        '.p37 .logo small{letter-spacing:.18em;font-size:.38em;color:var(--ac-deep);font-weight:600}'+
        '.p37 .top .rt{text-align:right}'+
        '.p37 .top .rt b{display:block;font-size:18px;font-weight:700;letter-spacing:-.02em}'+
        '.p37 .top .rt span{font-size:10.5px;color:#8f979d}'+
        '.p37 .slot{margin-top:20px}'+
        '.p37 .cols{display:flex;gap:34px;margin-top:24px;border-top:1px solid #eaedef;padding-top:18px}'+
        '.p37 .cols>div{flex:1}'+
        '.p37 .lab{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#98a0a6;font-weight:700;margin-bottom:5px}'+
        '.p37 .rn{font-weight:700;font-size:12.5px}.p37 .ra{color:#5f686e;line-height:1.5}'+
        '.p37 .sender{color:#5f686e;line-height:1.5}.p37 .sender .sn{font-weight:700;color:#1a1f24}'+
        '.p37 .mrow{display:flex;justify-content:space-between;padding:2px 0}'+
        '.p37 .mrow span{color:#98a0a6}.p37 .mrow b{font-weight:700}'+
        '.p37 .scope{margin-top:18px}.p37 .scope p{margin:0;color:#5f686e;line-height:1.6;max-width:78ch}'+
        BASE_TABLE({hp:'6px 6px',rp:'7px 6px'})+
        '.p37 .lt{margin-top:18px}'+
        '.p37 .lt th{color:#98a0a6;border-bottom:1.5px solid var(--ac-deep);letter-spacing:.12em}'+
        '.p37 .lt td{border-bottom:1px solid #f1f3f5}'+
        '.p37 .lt .d{font-weight:500}'+
        '.p37 .totwrap{display:flex;justify-content:flex-end;margin-top:12px}'+
        '.p37 .tot{width:46%}.p37 .tot td{padding:3px 6px}'+
        '.p37 .tot .muted td{color:#98a0a6}'+
        '.p37 .tot .grand td{border-top:1.5px solid var(--ac-deep);padding-top:7px;font-weight:700;font-size:14px;color:var(--ac-deep)}'+
        '.p37 .foot{margin-top:18px}.p37 .foot p{margin:0 0 3px;font-size:8.5px;color:#98a0a6;line-height:1.5}',
      html:'<div class="p37"><div class="top"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+
        '<div class="rt"><b>'+esc(m.title)+' '+esc(m.number)+'</b><span>'+metaInline(m,' &middot; ')+'</span></div></div>'+
        slotBlock(m)+
        '<div class="cols"><div>'+recipientBlock(m)+'</div>'+
        '<div><div class="lab">'+esc(m.t.sender)+'</div>'+senderBlock(m)+'</div>'+
        '<div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+
        (m.foot.length?'<div class="foot"><div class="lab">'+esc(m.t.terms)+'</div>'+m.foot.map(function(f){return '<p>'+esc(f)+'</p>';}).join("")+'</div>':'')+
        '</div>'
    };}
  },

  /* C8 --- Luxe ---------------------------------------------------------- */
  { id:"luxe", name:"Luxe", tag:"Editorial", family:"Fraunces",
    desc:"",
    render:function(m){ return {
      css:'.p38{padding:58px 60px;font-family:"Instrument Sans",sans-serif;font-size:10.5px;color:#221f1b;background:#faf6ef}'+
        '.p38 .wm{font-family:"Fraunces",serif;font-weight:900;font-size:26px;letter-spacing:-.02em;color:var(--ac-deep)}'+
        '.p38 .wm small{display:block;font-family:"Instrument Sans",sans-serif;font-weight:600;letter-spacing:.3em;font-size:.28em;color:#8c857a;margin-top:.7em;text-transform:uppercase}'+
        '.p38 .top{display:flex;justify-content:space-between;align-items:flex-start;gap:26px;border-bottom:1px solid var(--ac-line);padding-bottom:18px}'+
        '.p38 .sender{text-align:right;font-size:9.5px;color:#6d665c;line-height:1.65}'+
        '.p38 .sender .sn{font-weight:700;color:#221f1b;font-size:11px}'+
        '.p38 h2{font-family:"Fraunces",serif;font-size:34px;font-weight:400;letter-spacing:-.02em;margin:30px 0 0}'+
        '.p38 .docnum{font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#9a9287;margin-top:6px}'+
        '.p38 .subj{font-family:"Fraunces",serif;font-size:15px;color:#4a443b;margin-top:12px;max-width:58ch;line-height:1.4}'+
        '.p38 .cols{display:flex;gap:44px;margin-top:30px}'+
        '.p38 .cols>div{flex:1}'+
        '.p38 .lab{font-size:8px;letter-spacing:.24em;text-transform:uppercase;color:#9a9287;font-weight:700;margin-bottom:6px}'+
        '.p38 .rn{font-weight:700;font-size:12.5px}.p38 .ra{color:#6d665c;line-height:1.5}'+
        '.p38 .mrow{display:flex;justify-content:space-between;padding:2.5px 0;border-bottom:1px solid var(--ac-line)}'+
        '.p38 .mrow span{color:#9a9287}.p38 .mrow b{font-weight:700}'+
        '.p38 .scope{margin-top:24px}.p38 .scope p{margin:0;color:#5a534a;line-height:1.7;max-width:70ch}'+
        BASE_TABLE({hp:'0 5px 9px',rp:'10px 5px'})+
        '.p38 .lt{margin-top:26px;border-top:1px solid #221f1b}'+
        '.p38 .lt th{padding-top:9px;color:#9a9287;letter-spacing:.2em}'+
        '.p38 .lt td{border-bottom:1px solid var(--ac-line)}'+
        '.p38 .totwrap{display:flex;justify-content:flex-end;margin-top:14px}'+
        '.p38 .tot{width:46%}.p38 .tot td{padding:3.5px 5px;color:#6d665c}'+
        '.p38 .tot .grand td{font-family:"Fraunces",serif;font-weight:900;font-size:20px;color:var(--ac-deep);border-top:1px solid #221f1b;padding-top:9px}'+
        '.p38 .foot{margin-top:26px}.p38 .foot p{margin:0 0 4px;font-size:8.5px;color:#9a9287;line-height:1.6}',
      html:'<div class="p38"><div class="top"><div class="wm">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div>'
    };}
  },

  /* C9 --- Vensterenvelop ------------------------------------------------ */
  { id:"venster", name:"Vensterenvelop", tag:"NL standaard", family:"Instrument Sans",
    desc:"",
    render:function(m){ return {
      css:'.p39{padding:34px 52px 44px;font-family:"Instrument Sans",sans-serif;font-size:10.5px;color:#1c2126;background:#fff;position:relative;display:flex;flex-direction:column;height:100%}'+
        '.p39 .hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}'+
        '.p39 .logo{font-size:18px;font-weight:700;letter-spacing:-.02em}'+
        '.p39 .logo small{letter-spacing:.18em;font-size:.38em;color:var(--ac-deep);font-weight:600}'+
        '.p39 .sender{text-align:right;font-size:9px;color:#6b747a;line-height:1.5}'+
        '.p39 .sender .sn{font-weight:700;color:#1c2126;font-size:10.5px}'+
        '.p39 .win{margin-top:38px;height:104px;display:flex;align-items:flex-start;justify-content:space-between;gap:30px}'+
        '.p39 .win .rcpt{width:82mm;border-left:2px solid var(--ac);padding-left:12px}'+
        '.p39 .rn{font-weight:700;font-size:12.5px}.p39 .ra{color:#4d565c;line-height:1.5}'+
        '.p39 .win .meta{width:58mm;flex:none}'+
        '.p39 .lab{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#99a1a7;font-weight:700;margin-bottom:5px}'+
        '.p39 .mrow{display:flex;justify-content:space-between;padding:2.5px 0;border-bottom:1px solid #eef1f3}'+
        '.p39 .mrow span{color:#99a1a7}.p39 .mrow b{font-weight:700}'+
        '.p39 h2{font-size:16px;font-weight:700;margin:18px 0 2px;letter-spacing:-.01em}'+
        '.p39 .subj{color:#4d565c}'+
        '.p39 .scope{margin-top:14px}.p39 .scope p{margin:0;color:#4d565c;line-height:1.6;max-width:80ch}'+
        BASE_TABLE({hp:'7px 6px',rp:'7px 6px'})+
        '.p39 .lt{margin-top:18px}'+
        '.p39 .lt th{color:#99a1a7;border-bottom:1px solid #1c2126;letter-spacing:.12em}'+
        '.p39 .lt td{border-bottom:1px solid #f0f2f4}'+
        '.p39 .lt .d{font-weight:500}'+
        '.p39 .totwrap{display:flex;justify-content:flex-end;margin-top:12px}'+
        '.p39 .tot{width:46%}.p39 .tot td{padding:3px 6px}'+
        '.p39 .tot .muted td{color:#99a1a7}'+
        '.p39 .tot .grand td{border-top:1.5px solid var(--ac-deep);padding-top:7px;font-weight:700;font-size:14px}'+
        '.p39 .foot p{margin:0 0 3px;font-size:8.5px;color:#99a1a7;line-height:1.5}'+
        '.p39 .strip{margin-top:auto;padding-top:12px;border-top:1px solid #e6e9eb;font-size:8.5px;color:#8b949a;letter-spacing:.02em;text-align:center}',
      html:'<div class="p39"><div class="hdr"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<div class="win">'+recipientBlock(m)+'<div class="meta"><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        '<h2>'+esc(m.title)+' '+esc(m.number)+'</h2>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        (m.scope?'<div class="scope"><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+
        '<div class="strip">'+esc(senderInline(m))+'  ·  KVK '+esc(ORG.kvk)+'</div>'+
        '</div>'
    };}
  },

  /* C10 --- Statuszegel -------------------------------------------------- */
  { id:"zegel", name:"Statuszegel", tag:"Stempel", family:"Archivo",
    desc:"",
    render:function(m){ return {
      css:'.p40{padding:46px 50px;font-family:"Archivo",sans-serif;font-size:10.5px;color:#1a1e23;background:#fff;position:relative;overflow:hidden}'+
        '.p40 .zegel{position:absolute;right:44px;top:150px;transform:rotate(-14deg);border:4px solid var(--ac);color:var(--ac);'+
          'padding:8px 20px;border-radius:6px;font-weight:800;font-size:30px;letter-spacing:.1em;text-transform:uppercase;opacity:.3}'+
        '.p40 .top{display:flex;justify-content:space-between;align-items:flex-start;gap:22px;border-bottom:2px solid var(--ac-deep);padding-bottom:14px}'+
        '.p40 .logo{font-size:20px;font-weight:800;letter-spacing:-.03em}'+
        '.p40 .logo small{letter-spacing:.2em;font-size:.36em;color:var(--ac-deep);font-weight:700}'+
        '.p40 .sender{text-align:right;font-size:9px;color:#69727a;line-height:1.5}'+
        '.p40 .sender .sn{font-weight:800;color:#1a1e23;font-size:10.5px}'+
        '.p40 h2{font-size:30px;font-weight:800;letter-spacing:-.04em;margin:24px 0 0}'+
        '.p40 .docnum{font-size:11px;color:#8d959c;margin-top:2px}'+
        '.p40 .subj{margin-top:12px;font-size:13px;font-weight:700;max-width:54ch}'+
        '.p40 .cols{display:flex;gap:34px;margin-top:22px}'+
        '.p40 .cols>div{flex:1}'+
        '.p40 .lab{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#98a0a6;font-weight:700;margin-bottom:5px}'+
        '.p40 .rn{font-weight:800;font-size:12.5px}.p40 .ra{color:#5e676d;line-height:1.5}'+
        '.p40 .mrow{display:flex;justify-content:space-between;padding:2.5px 0;border-bottom:1px solid #eef1f2}'+
        '.p40 .mrow span{color:#98a0a6}.p40 .mrow b{font-weight:800}'+
        '.p40 .scope{margin-top:18px}.p40 .scope p{margin:0;color:#5e676d;line-height:1.6;max-width:72ch}'+
        BASE_TABLE({hp:'7px 6px',rp:'7px 6px'})+
        '.p40 .lt{margin-top:20px;position:relative}'+
        '.p40 .lt th{color:#98a0a6;border-bottom:2px solid var(--ac-deep);letter-spacing:.1em}'+
        '.p40 .lt td{border-bottom:1px solid #f1f3f5}'+
        '.p40 .lt .d{font-weight:600}'+
        '.p40 .totwrap{display:flex;justify-content:flex-end;margin-top:12px}'+
        '.p40 .tot{width:48%}.p40 .tot td{padding:3.5px 6px}'+
        '.p40 .tot .muted td{color:#98a0a6}'+
        '.p40 .tot .grand td{border-top:2px solid var(--ac-deep);padding-top:8px;font-weight:800;font-size:15px;color:var(--ac-deep)}'+
        '.p40 .foot{margin-top:18px}.p40 .foot p{margin:0 0 3px;font-size:8.5px;color:#98a0a6;line-height:1.5}',
      html:'<div class="p40"><div class="zegel">'+(m.isOffer?(m.lang==="nl"?"Concept":"Draft"):(m.lang==="nl"?"Openstaand":"Unpaid"))+'</div>'+
        '<div class="top"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<h2>'+esc(m.title)+'</h2><div class="docnum">'+esc(m.number)+'</div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        scopeBlock(m)+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m)+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div>'
    };}
  },

  /* C11 --- Gegroepeerd -------------------------------------------------- */
  { id:"gegroepeerd", name:"Gegroepeerd", tag:"Fases", family:"Instrument Sans",
    desc:"",
    render:function(m){
      var groups = [
        { name: m.lang==="nl" ? "Materiaal" : "Materials", idx:[0,1] },
        { name: m.lang==="nl" ? "Uitvoering" : "Execution", idx:[2,3,4] }
      ];
      var body = groups.map(function(g){
        var sub = g.idx.reduce(function(a,i){ return a + (m.lines[i] ? Number(m.lines[i].total_incl_vat) : 0); },0);
        var head = '<tr class="grp"><td class="d" colspan="4">'+esc(g.name)+'</td><td class="num a">'+money(sub,m.lang)+'</td></tr>';
        var body = g.idx.filter(function(i){return m.lines[i];}).map(function(i){
          var li = m.lines[i], unit = li.unit ? " / "+li.unit : "";
          return '<tr><td class="d">'+esc(li.description)+'</td>'+
            '<td class="num q">'+money(li.quantity,m.lang)+'</td>'+
            '<td class="num p">'+money(li.unit_price,m.lang)+esc(unit)+'</td>'+
            '<td class="num v">'+pct(li.vat_rate)+'</td>'+
            '<td class="num a">'+money(li.total_incl_vat,m.lang)+'</td></tr>';
        }).join("");
        return head+body;
      }).join("");
      return {
      css:'.p41{padding:46px 50px;font-family:"Instrument Sans",sans-serif;font-size:10.5px;color:#1b2025;background:#fff}'+
        '.p41 .top{display:flex;justify-content:space-between;align-items:flex-start;gap:22px}'+
        '.p41 .logo{font-size:19px;font-weight:700;letter-spacing:-.02em}'+
        '.p41 .logo small{letter-spacing:.18em;font-size:.38em;color:var(--ac-deep);font-weight:600}'+
        '.p41 .sender{text-align:right;font-size:9px;color:#69727a;line-height:1.5}'+
        '.p41 .sender .sn{font-weight:700;color:#1b2025;font-size:10.5px}'+
        '.p41 h2{font-size:20px;font-weight:700;margin:24px 0 2px;letter-spacing:-.02em}'+
        '.p41 .docnum{font-size:10.5px;color:#8d959c}'+
        '.p41 .cols{display:flex;gap:34px;margin-top:22px;border-top:1px solid #eaedef;padding-top:16px}'+
        '.p41 .cols>div{flex:1}'+
        '.p41 .lab{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#98a0a6;font-weight:700;margin-bottom:5px}'+
        '.p41 .rn{font-weight:700;font-size:12.5px}.p41 .ra{color:#5e676d;line-height:1.5}'+
        '.p41 .mrow{display:flex;justify-content:space-between;padding:2px 0}'+
        '.p41 .mrow span{color:#98a0a6}.p41 .mrow b{font-weight:700}'+
        '.p41 .scope{margin-top:16px}.p41 .scope p{margin:0;color:#5e676d;line-height:1.6;max-width:78ch}'+
        BASE_TABLE({hp:'7px 6px',rp:'6.5px 6px'})+
        '.p41 .lt{margin-top:20px}'+
        '.p41 .lt th{color:#98a0a6;border-bottom:1.5px solid #1b2025;letter-spacing:.12em}'+
        '.p41 .lt td{border-bottom:1px solid #f2f4f5}'+
        '.p41 .lt tr.grp td{background:var(--ac-soft);font-weight:700;color:var(--ac-deep);'+
          'border-bottom:1px solid var(--ac-line);letter-spacing:.05em;padding-top:8px;padding-bottom:8px}'+
        '.p41 .lt tr:not(.grp) .d{padding-left:16px;color:#3f474d}'+
        '.p41 .totwrap{display:flex;justify-content:flex-end;margin-top:12px}'+
        '.p41 .tot{width:48%}.p41 .tot td{padding:3.5px 6px}'+
        '.p41 .tot .muted td{color:#98a0a6}'+
        '.p41 .tot .grand td{border-top:1.5px solid var(--ac-deep);padding-top:8px;font-weight:700;font-size:15px;color:var(--ac-deep)}'+
        '.p41 .foot{margin-top:18px}.p41 .foot p{margin:0 0 3px;font-size:8.5px;color:#98a0a6;line-height:1.5}',
      html:'<div class="p41"><div class="top"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+senderBlock(m)+'</div>'+
        '<h2>'+esc(m.title)+' '+esc(m.number)+'</h2><div class="docnum">'+esc(m.subject||"")+'</div>'+
        '<div class="cols"><div>'+recipientBlock(m)+'</div><div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        (m.scope?'<div class="scope"><div class="lab">'+esc(m.t.scope)+'</div><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+body+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div>'
    };}
  },

  /* C12 --- Corporate ---------------------------------------------------- */
  { id:"corporate", name:"Corporate", tag:"Klassiek", family:"Archivo",
    desc:"",
    render:function(m){ return {
      css:'.p42{font-family:"Archivo",sans-serif;font-size:10.5px;color:#1a1e24;background:#fff;position:relative}'+
        '.p42 .corner{position:absolute;top:0;left:0;right:0;height:132px;overflow:hidden}'+
        '.p42 .corner i{position:absolute;display:block}'+
        '.p42 .corner .c1{inset:0;background:var(--ac-deep);clip-path:polygon(0 0,100% 0,100% 58%,0 100%)}'+
        '.p42 .corner .c2{inset:0;background:var(--ac);opacity:.85;clip-path:polygon(0 0,62% 0,0 100%)}'+
        '.p42 .hd{position:relative;z-index:1;padding:26px 46px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;min-height:132px}'+
        '.p42 .logo{font-size:21px;font-weight:800;letter-spacing:-.03em;color:var(--ac-on-deep)}'+
        '.p42 .logo small{letter-spacing:.2em;font-size:.34em;font-weight:700;opacity:.75}'+
        '.p42 .hd .rt{text-align:right;color:var(--ac-on-deep)}'+
        '.p42 .hd .rt b{display:block;font-size:26px;font-weight:800;letter-spacing:-.03em;line-height:1}'+
        '.p42 .hd .rt span{font-size:11px;opacity:.8}'+
        '.p42 .body{padding:18px 46px 44px}'+
        '.p42 .cols{display:flex;gap:34px}'+
        '.p42 .cols>div{flex:1}'+
        '.p42 .lab{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:var(--ac-deep);font-weight:800;margin-bottom:5px}'+
        '.p42 .rn{font-weight:800;font-size:12.5px}.p42 .ra{color:#5e666e;line-height:1.5}'+
        '.p42 .sender{color:#5e666e;line-height:1.5}.p42 .sender .sn{font-weight:800;color:#1a1e24}'+
        '.p42 .mrow{display:flex;justify-content:space-between;padding:2.5px 0;border-bottom:1px solid #eef0f3}'+
        '.p42 .mrow span{color:#98a0a8}.p42 .mrow b{font-weight:800}'+
        '.p42 .subj{margin-top:18px;font-size:13.5px;font-weight:800}'+
        '.p42 .scope p{margin:7px 0 0;color:#5e666e;line-height:1.6;max-width:78ch}'+
        BASE_TABLE({hp:'8px 8px',rp:'7.5px 8px'})+
        '.p42 .lt{margin-top:20px}'+
        '.p42 .lt th{background:var(--ac-deep);color:var(--ac-on-deep);letter-spacing:.1em}'+
        '.p42 .lt tr.z td{background:var(--ac-soft)}'+
        '.p42 .lt td{border-bottom:1px solid #eef0f3}'+
        '.p42 .lt .d{font-weight:600}'+
        '.p42 .totwrap{display:flex;justify-content:flex-end;margin-top:12px}'+
        '.p42 .tot{width:50%}.p42 .tot td{padding:3.5px 8px}'+
        '.p42 .tot .muted td{color:#98a0a8}'+
        '.p42 .tot .grand td{background:var(--ac);color:var(--ac-on);font-weight:800;font-size:15px;padding:9px 8px}'+
        '.p42 .foot{margin-top:18px}.p42 .foot p{margin:0 0 3px;font-size:8.5px;color:#98a0a8;line-height:1.5}',
      html:'<div class="p42"><div class="corner"><i class="c1"></i><i class="c2"></i></div>'+
        '<div class="hd"><div class="logo">Jouw Bedrijf<small>installatie &amp; onderhoud</small></div>'+
        '<div class="rt"><b>'+esc(m.title)+'</b><span>'+esc(m.number)+'</span></div></div>'+
        '<div class="body"><div class="cols"><div>'+recipientBlock(m)+'</div>'+
        '<div><div class="lab">'+esc(m.t.sender)+'</div>'+senderBlock(m)+'</div>'+
        '<div><div class="lab">Details</div>'+metaList(m)+'</div></div>'+
        (m.subject?'<div class="subj">'+esc(m.subject)+'</div>':'')+
        (m.scope?'<div class="scope"><p>'+esc(m.scope)+'</p></div>':'')+
        '<table class="lt"><thead><tr>'+headCells(m)+'</tr></thead><tbody>'+rows(m,{zebra:true})+'</tbody></table>'+
        '<div class="totwrap">'+totalRows(m)+'</div>'+footBlock(m)+'</div></div>'
    };}
  }
  ];

  var SETS = { a:SKINS_A, b:SKINS_B, c:SKINS_C };
  var SKINS = SKINS_A;

  /* ------------------------- accent derivation -------------------------- */
  function hex2rgb(h){
    h = h.replace("#","");
    if(h.length===3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  }
  function rgb2hex(r){
    return "#"+r.map(function(v){
      v = Math.max(0,Math.min(255,Math.round(v)));
      return (v<16?"0":"")+v.toString(16);
    }).join("");
  }
  function mix(a,b,t){
    var A=hex2rgb(a), B=hex2rgb(b);
    return rgb2hex([A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t]);
  }
  function lum(h){
    var c = hex2rgb(h).map(function(v){
      v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
    });
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];
  }
  function accentTokens(base){
    var l = lum(base);
    var deep = l > 0.14 ? mix(base,"#0d1114", Math.min(0.72, 0.30 + l*0.9)) : base;
    return {
      "--ac": base,
      "--ac-deep": deep,
      "--ac-mid": mix(base,"#ffffff",0.52),
      "--ac-soft": mix(base,"#ffffff",0.92),
      "--ac-line": mix(base,"#ffffff",0.74),
      "--ac-mute": mix(base,"#6b7178",0.62),
      "--ac-on": l > 0.42 ? "#14181c" : "#ffffff",
      "--ac-on-deep": "#ffffff"
    };
  }

  window.SumitInvoiceStyles = {
    sets: { a:SKINS_A, b:SKINS_B, c:SKINS_C },
    model: model,
    accentTokens: accentTokens,
    esc: esc
  };
})();
