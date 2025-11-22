function log2(x){return Math.log(x)/Math.log(2)}

function poolSizeForPassword(pw){
  let hasLower = /[a-z]/.test(pw)
  let hasUpper = /[A-Z]/.test(pw)
  let hasDigit = /[0-9]/.test(pw)
  let hasSymbol = /[^A-Za-z0-9]/.test(pw)
  let size = 0
  if(hasLower) size += 26
  if(hasUpper) size += 26
  if(hasDigit) size += 10
  if(hasSymbol) size += 32 // approximate symbol space
  return size
}

function shannonTotal(pw){
  if(!pw || pw.length===0) return 0
  const len = pw.length
  const freq = {}
  for(const c of pw) freq[c] = (freq[c]||0)+1
  let H = 0
  for(const k in freq){
    const p = freq[k]/len
    H += -p * log2(p)
  }
  return H * len // total bits over whole string
}

function longestSequenceLength(pw){
  if(!pw) return 0
  let best = 1
  for(let i=0;i<pw.length;i++){
    let up = 1
    let down = 1
    for(let j=i+1;j<pw.length;j++){
      if(pw.charCodeAt(j) - pw.charCodeAt(j-1) === 1) up++
      else break
    }
    for(let j=i+1;j<pw.length;j++){
      if(pw.charCodeAt(j-1) - pw.charCodeAt(j) === 1) down++
      else break
    }
    best = Math.max(best, up, down)
  }
  return best
}

function effectiveEntropy(pw){
  const len = pw.length
  if(len===0) return {bits:0, details:{}}
  const pool = poolSizeForPassword(pw)
  const poolEntropy = pool>0 ? len * log2(pool) : 0
  const shannon = shannonTotal(pw)

  // penalties
  const freq = {}
  for(const c of pw) freq[c] = (freq[c]||0)+1
  const maxFreq = Math.max(...Object.values(freq))
  const repeatFrac = maxFreq/len
  let repeatPenalty = 0
  if(repeatFrac > 0.3) repeatPenalty = (repeatFrac - 0.3) * 20 // up to ~14 bits penalty

  const seqLen = longestSequenceLength(pw)
  let seqPenalty = 0
  if(seqLen >= 3) seqPenalty = (seqLen - 2) * 2 // 2 bits per extra sequential char

  // Combine: be conservative: take max of pool-based or shannon, then subtract penalties
  let base = Math.max(poolEntropy, shannon)
  let bits = Math.max(0, base - repeatPenalty - seqPenalty)

  // Small adjustments for extremely short passwords
  if(len < 4) bits = Math.min(bits, 6 + len*2)

  // Round
  bits = Math.round(bits*100)/100

  return {
    bits,
    details:{pool,poolEntropy:Math.round(poolEntropy*100)/100,shannon:Math.round(shannon*100)/100,repeatPenalty:Math.round(repeatPenalty*100)/100,seqPenalty}
  }
}

function strengthLabel(bits){
  if(bits < 28) return {label:'Very weak', className:'bad'}
  if(bits < 36) return {label:'Weak', className:'bad'}
  if(bits < 60) return {label:'Moderate', className:'neutral'}
  if(bits < 128) return {label:'Strong', className:'good'}
  return {label:'Very strong', className:'good'}
}

function renderInfo(elInfo, pw){
  const res = effectiveEntropy(pw)
  const sl = strengthLabel(res.bits)
  elInfo.innerHTML = ''

  const top = document.createElement('div')
  top.className = 'metric'
  const sb = document.createElement('div')
  sb.innerHTML = `<span class="label">${res.bits} bits</span> <span class="muted">${sl.label}</span>`
  top.appendChild(sb)
  elInfo.appendChild(top)

  const bar = document.createElement('div')
  bar.className = 'bar'
  const fill = document.createElement('div')
  fill.className = 'fill'
  // width clamp: map bits to 0..100. Use 140 bits as 100%.
  let pct = Math.min(100, Math.round((res.bits/140)*100))
  fill.style.width = pct + '%'
  bar.appendChild(fill)
  elInfo.appendChild(bar)

  const details = document.createElement('div')
  details.className = 'muted'
  details.textContent = `len=${pw.length} pool=${res.details.pool} poolBits=${res.details.poolEntropy} shannon=${res.details.shannon}`
  elInfo.appendChild(details)

  return {bits:res.bits, shannon:res.details.shannon, len:pw.length, label:sl.label, className:sl.className}
}

function compareAndShow(){
  const pw1 = document.getElementById('pw1').value
  const pw2 = document.getElementById('pw2').value
  const info1 = document.getElementById('info1')
  const info2 = document.getElementById('info2')
  const r1 = renderInfo(info1, pw1)
  const r2 = renderInfo(info2, pw2)

  // deterministic winner: compare bits, tie break by shannon, then length, then choose pw1
  let winnerText = ''
  let winnerClass = 'neutral'
  if(r1.bits > r2.bits + 0.5) {
    winnerText = `Password 1 is stronger (${r1.bits} bits vs ${r2.bits} bits)`
    winnerClass = r1.className
  } else if(r2.bits > r1.bits + 0.5) {
    winnerText = `Password 2 is stronger (${r2.bits} bits vs ${r1.bits} bits)`
    winnerClass = r2.className
  } else {
    // tie-break
    if(r1.shannon > r2.shannon + 0.1) {
      winnerText = `Password 1 is stronger (tie-breaker: higher Shannon entropy)`
      winnerClass = r1.className
    } else if(r2.shannon > r1.shannon + 0.1){
      winnerText = `Password 2 is stronger (tie-breaker: higher Shannon entropy)`
      winnerClass = r2.className
    } else if(r1.len > r2.len){
      winnerText = `Password 1 is stronger (tie-breaker: longer length)`
      winnerClass = r1.className
    } else if(r2.len > r1.len){
      winnerText = `Password 2 is stronger (tie-breaker: longer length)`
      winnerClass = r2.className
    } else {
      winnerText = `Password 1 is chosen as stronger (tie-breaker: first)`
      winnerClass = r1.className
    }
  }

  const result = document.getElementById('result')
  const winner = document.getElementById('winner')
  winner.textContent = winnerText
  winner.className = 'winner ' + winnerClass
  result.classList.remove('hidden')
}

window.addEventListener('load', ()=>{
  document.getElementById('compare').addEventListener('click', compareAndShow)
  document.getElementById('pw1').addEventListener('input', ()=>{renderInfo(document.getElementById('info1'), document.getElementById('pw1').value)})
  document.getElementById('pw2').addEventListener('input', ()=>{renderInfo(document.getElementById('info2'), document.getElementById('pw2').value)})
  document.getElementById('swap').addEventListener('click', ()=>{
    const a=document.getElementById('pw1'),b=document.getElementById('pw2')
    const t=a.value; a.value=b.value; b.value=t
    renderInfo(document.getElementById('info1'), a.value)
    renderInfo(document.getElementById('info2'), b.value)
  })
  // initial render
  renderInfo(document.getElementById('info1'), '')
  renderInfo(document.getElementById('info2'), '')
})
