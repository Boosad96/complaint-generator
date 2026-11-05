// app.js — complaint wizard, fee calculator and free draft preview. No dependencies.
// All data comes from /data.json. Nothing the user types leaves the browser.
(function () {
  var DATA = null;
  var SOURCES = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function inr(n) {
    return '₹' + Number(n).toLocaleString('en-IN');
  }
  function srcLinks(keys) {
    if (!SOURCES) return '';
    return keys.map(function (k) {
      var s = SOURCES[k];
      return s ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>' : esc(k);
    }).join(', ');
  }
  function feeFor(amount) {
    for (var i = 0; i < DATA.fee_slabs.length; i++) {
      var s = DATA.fee_slabs[i];
      if (s.max === null || amount <= s.max) return s;
    }
    return DATA.fee_slabs[DATA.fee_slabs.length - 1];
  }
  function forumFor(amount) {
    if (amount <= 5000000) return DATA.forums[0];
    if (amount <= 20000000) return DATA.forums[1];
    return DATA.forums[2];
  }

  // ---------- fee calculator ----------
  function initFeeCalc() {
    var form = document.getElementById('fee-calc');
    if (!form) return;
    var out = document.getElementById('fee-result');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var amount = parseFloat(document.getElementById('fee-amount').value);
      if (!amount || amount <= 0) { out.innerHTML = '<p>Enter the amount you paid, in rupees.</p>'; return; }
      var f = forumFor(amount);
      var s = feeFor(amount);
      out.innerHTML = '<div class="answer"><h3>' + esc(f.name) + ' — fee ' + (s.fee === 0 ? 'nil (free)' : inr(s.fee)) + '</h3>'
        + '<p>You paid <strong>' + inr(amount) + '</strong>. The forum is picked by what you paid as consideration, not by the compensation you claim.</p>'
        + '<p><strong>' + esc(f.name) + ':</strong> ' + esc(f.limit) + '. File at: ' + esc(f.where) + '.</p>'
        + '<p><strong>Filing fee:</strong> ' + (s.fee === 0 ? 'nil — no fee at all' : inr(s.fee)) + ' (' + esc(s.label) + ').</p>'
        + '<p class="small">Fee under the Consumer Protection (Consumer Disputes Redressal Commissions) Rules, 2020, as amended in August 2023. The e-Jagriti portal calculates the fee when you file — trust what the portal shows over any table, including this one.</p>'
        + '<p><a class="btn" href="/wizard/">Find your route →</a> <a class="btn btn-secondary" href="/checklist/">Filing checklist →</a></p></div>';
    });
  }

  // ---------- wizard ----------
  function initWizard() {
    var form = document.getElementById('wizard');
    if (!form) return;
    var stateWrap = document.getElementById('wizard-state-wrap');
    var reraWant = document.getElementById('wizard-rera-want');
    var dateWrap = document.getElementById('wizard-date-wrap');
    var stateSel = document.getElementById('wizard-state');
    // fill the state dropdown from data
    if (stateSel && DATA) {
      stateSel.innerHTML = '<option value="">Select state…</option>' + DATA.rera_states.map(function (st) {
        return '<option value="' + esc(st.state) + '">' + esc(st.state) + '</option>';
      }).join('') + '<option value="other">Another state</option>';
    }
    form.addEventListener('change', function () {
      var p = form.querySelector('input[name="problem"]:checked');
      var isRera = p && (p.value === 'rera-delay' || p.value === 'rera-refund');
      if (stateWrap) stateWrap.hidden = !isRera;
      if (reraWant) reraWant.hidden = !isRera;
      if (dateWrap) dateWrap.hidden = !!isRera;
    });
    document.getElementById('wizard-go').addEventListener('click', function () {
      var out = document.getElementById('wizard-result');
      var p = form.querySelector('input[name="problem"]:checked');
      var amount = parseFloat(document.getElementById('wizard-amount').value);
      if (!p) { out.innerHTML = '<p>Please answer question 1 first — what happened?</p>'; return; }
      if (!amount || amount <= 0) { out.innerHTML = '<p>Please enter how much you paid, in rupees. The forum and the fee both depend on it.</p>'; return; }
      var isRera = (p.value === 'rera-delay' || p.value === 'rera-refund');
      var html = '';
      if (isRera) {
        var want = form.querySelector('input[name="rera_want"]:checked');
        var stName = stateSel ? stateSel.value : '';
        if (!want) { out.innerHTML = '<p>For a RERA case, please also answer question 3 — what do you want: refund/interest/possession, or compensation?</p>'; return; }
        var st = DATA.rera_states.filter(function (x) { return x.state === stName; })[0];
        var isAO = want.value === 'compensation';
        var route = isAO ? DATA.rera.ao : DATA.rera.authority;
        var feeText = isAO ? (st ? st.ao_fee : route.fee) : (st ? st.authority_fee : route.fee);
        var formText = isAO ? (st ? st.ao_form : route.form) : (st ? st.authority_form : route.form);
        var portal = st ? st.portal : null;
        html = '<div class="answer"><h3>Your route: ' + esc(route.name) + ' — ' + esc(route.section) + '</h3>'
          + '<p><strong>Step 1 — try the free route first.</strong> Write to the builder demanding what you are owed, and keep the reply. If the builder ignores you, most state RERA portals also offer a conciliation track before a formal complaint.</p>'
          + '<p><strong>Step 2 — file with the ' + esc(route.name) + '.</strong> ' + esc(route.relief) + '.</p>'
          + '<p><strong>Form:</strong> ' + esc(formText) + ' &nbsp;·&nbsp; <strong>Fee:</strong> ' + esc(feeText) + ' &nbsp;·&nbsp; <strong>Disposal target:</strong> ' + esc(route.disposal) + '.</p>'
          + (portal ? '<p><strong>Where to file:</strong> your state RERA portal — <a href="https://' + esc(portal) + '" target="_blank" rel="noopener">' + esc(portal) + '</a>' + (st.status === 'confirm' ? ' <span class="badge">confirm form &amp; fee on the portal</span>' : '') + '. The portal is picked by where the <em>property</em> is, not where you live.</p>'
            : '<p><strong>Where to file:</strong> your state RERA portal — find it on the national portal <a href="https://rera.gov.in" target="_blank" rel="noopener">rera.gov.in</a>. The portal is picked by where the <em>property</em> is, not where you live.</p>')
          + '<p><strong>Limitation:</strong> ' + esc(DATA.rera.limitation) + '</p>'
          + '<p><strong>Interest:</strong> ' + esc(DATA.rera.interest) + '</p>'
          + '<p><a class="btn" href="/rera/">RERA route in full →</a> <a class="btn btn-secondary" href="/checklist/">Filing checklist →</a></p>'
          + '<p class="small">Not legal advice. Form letters and fees vary by state — always confirm the form and the fee on your state portal before paying.</p></div>';
      } else {
        var dateVal = document.getElementById('wizard-date').value;
        var f = forumFor(amount);
        var s = feeFor(amount);
        var late = '';
        if (dateVal) {
          var d = new Date(dateVal);
          var twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
          if (d < twoYearsAgo) {
            late = '<p><strong>⚠ Time limit warning:</strong> the problem happened more than 2 years ago. Under Section 69 of the Consumer Protection Act, 2019, a complaint must be filed within 2 years of the cause of action. A late complaint needs a separate application explaining the delay, and the Commission does not have to accept it. File now, and explain the delay honestly.</p>';
          }
        }
        html = '<div class="answer"><h3>Your route: ' + esc(f.name) + ' — fee ' + (s.fee === 0 ? 'nil (free)' : inr(s.fee)) + '</h3>'
          + '<p><strong>Step 1 — try the free route first.</strong> Register the grievance with the National Consumer Helpline — call <strong>1915</strong> (8 AM–8 PM) or file at <a href="https://consumerhelpline.gov.in" target="_blank" rel="noopener">consumerhelpline.gov.in</a>. Keep the docket number. Many refunds are settled here within about 30 days, and it costs nothing.</p>'
          + '<p><strong>Step 2 — if that fails, file on e-Jagriti</strong> (<a href="https://e-jagriti.gov.in" target="_blank" rel="noopener">e-jagriti.gov.in</a>). You paid <strong>' + inr(amount) + '</strong>, so your forum is the <strong>' + esc(f.name) + '</strong> (' + esc(f.limit) + '). ' + esc(f.where) + '.</p>'
          + '<p><strong>Filing fee:</strong> ' + (s.fee === 0 ? 'nil — no fee at all' : inr(s.fee)) + ' (' + esc(s.label) + ').</p>'
          + '<p><strong>Appeal:</strong> ' + esc(f.appeal) + '.</p>'
          + late
          + '<p><a class="btn" href="/checklist/">Filing checklist →</a> <a class="btn btn-secondary" href="/draft/">Make a free draft →</a></p>'
          + '<p class="small">Not legal advice. The forum is fixed by what you paid as consideration, not by the compensation you claim.</p></div>';
      }
      out.innerHTML = html;
    });
  }

  // ---------- free draft preview ----------
  function initDraft() {
    var form = document.getElementById('draft-form');
    if (!form) return;
    document.getElementById('draft-go').addEventListener('click', function () {
      var out = document.getElementById('draft-output');
      function v(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
      var name = v('d-name'), addr = v('d-addr'), opName = v('d-opname'), opAddr = v('d-opaddr'),
        product = v('d-product'), amount = v('d-amount'), pdate = v('d-pdate'), cdate = v('d-cdate'),
        facts = v('d-facts'), relief = v('d-relief'), comp = v('d-comp');
      if (!name || !opName || !product || !amount || !facts) {
        out.innerHTML = '<p>Please fill in at least: your name, the opposite party’s name, what you bought, how much you paid, and what happened.</p>';
        return;
      }
      var amt = parseFloat(amount.replace(/[^0-9.]/g, ''));
      var forumLine = '';
      if (amt && amt > 0) {
        var f = forumFor(amt);
        forumLine = '<p><strong>Forum (by consideration paid):</strong> ' + esc(f.name) + ' — ' + esc(f.limit) + '.</p>';
      }
      out.innerHTML = '<div class="draft">'
        + '<h3>BEFORE THE ' + (amt && amt > 0 ? esc(forumFor(amt).name).toUpperCase() : 'DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION') + '</h3>'
        + '<p class="centre">Consumer Complaint under the Consumer Protection Act, 2019<br>e-Jagriti portal: e-jagriti.gov.in</p>'
        + '<p><strong>Complainant:</strong> ' + esc(name) + (addr ? '<br>' + esc(addr) : '') + '</p>'
        + '<p><strong>Opposite Party:</strong> ' + esc(opName) + (opAddr ? '<br>' + esc(opAddr) : '') + '</p>'
        + '<p><strong>1. What was bought:</strong> ' + esc(product) + '</p>'
        + '<p><strong>2. Amount paid as consideration:</strong> ₹' + esc(amount) + '</p>'
        + (pdate ? '<p><strong>3. Date of purchase / payment:</strong> ' + esc(pdate) + '</p>' : '')
        + (cdate ? '<p><strong>4. Date the problem arose:</strong> ' + esc(cdate) + '</p>' : '')
        + '<p><strong>5. Facts of the case (in date order):</strong><br>' + esc(facts).replace(/\n/g, '<br>') + '</p>'
        + '<p><strong>6. Relief sought:</strong> ' + esc(relief || 'Refund of the amount paid, compensation for loss and harassment, and the cost of filing.') + (comp ? ' Compensation claimed: ₹' + esc(comp) + '.' : '') + '</p>'
        + forumLine
        + '<p><strong>Verification:</strong> I, ' + esc(name) + ', verify that the facts stated above are true to my knowledge. A notarised affidavit to this effect must be attached when filing on e-Jagriti.</p>'
        + '<p><strong>Place:</strong> ___________ &nbsp;&nbsp; <strong>Date:</strong> ___________<br><strong>Signature of complainant:</strong> ___________</p>'
        + '<p class="small">This is a free preview draft generated in your browser — nothing you typed was sent anywhere. Before filing, check every fact and amount, attach the evidence listed in the <a href="/checklist/">filing checklist</a>, and get the affidavit notarised. This is not legal advice.</p>'
        + '</div><p><button class="btn" onclick="window.print()">Print / save as PDF</button></p>';
      out.scrollIntoView({ behavior: 'smooth' });
    });
  }

  fetch('/data.json').then(function (r) { return r.json(); }).then(function (d) {
    DATA = d; SOURCES = d.meta.sources;
    initFeeCalc(); initWizard(); initDraft();
  }).catch(function () {
    var el = document.getElementById('fee-result') || document.getElementById('wizard-result');
    if (el) el.innerHTML = '<p>Tool data could not be loaded. You can still read the <a href="/checklist/">filing checklist</a> and the <a href="/fees/">fee table</a>.</p>';
  });
})();
