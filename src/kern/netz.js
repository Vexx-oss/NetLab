"use strict";
/* ---------- IPv4- und MAC-Helfer ----------
   Adressen sind im Modell Texte ("192.168.1.10"), gerechnet wird mit vorzeichenlosen 32-Bit-Zahlen. */
const IP = (() => {
  function zuZahl(s){
    const p = String(s == null ? "" : s).trim().split(".");
    if (p.length !== 4 || p.some(x => !/^\d{1,3}$/.test(x) || +x > 255)) return null;
    return (((+p[0]) << 24) >>> 0) + ((+p[1]) << 16) + ((+p[2]) << 8) + (+p[3]);
  }
  const zuText = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  const gueltig = s => zuZahl(s) !== null;
  function maskeGueltig(s){
    const n = zuZahl(s); if (n === null) return false;
    const inv = (~n) >>> 0;                    /* nach den Einsen nur noch Nullen */
    return (inv & (inv + 1)) === 0;
  }
  function praefix(maske){
    const n = zuZahl(maske); if (n === null || !maskeGueltig(maske)) return null;
    let p = 0; for (let i = 31; i >= 0; i--) { if ((n >>> i) & 1) p++; else break; }
    return p;
  }
  const maskeZahl = p => p <= 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0;
  const maske = p => zuText(maskeZahl(p));
  function netz(ip, m){ const a = zuZahl(ip), b = zuZahl(m); if (a === null || b === null) return null; return zuText((a & b) >>> 0); }
  function broadcast(ip, m){ const a = zuZahl(ip), b = zuZahl(m); if (a === null || b === null) return null; return zuText(((a & b) | (~b)) >>> 0); }
  function gleichesNetz(a, b, m){
    const x = zuZahl(a), y = zuZahl(b), z = zuZahl(m);
    if (x === null || y === null || z === null) return false;
    return ((x & z) >>> 0) === ((y & z) >>> 0);
  }
  const imNetz = (ip, netzAdr, m) => gleichesNetz(ip, netzAdr, m);
  /* ACL-Platzhalter: Bit 1 = egal */
  function wildcardPasst(ip, basis, wc){
    const a = zuZahl(ip), b = zuZahl(basis), w = zuZahl(wc);
    if (a === null || b === null || w === null) return false;
    const pflicht = (~w) >>> 0;
    return ((a & pflicht) >>> 0) === ((b & pflicht) >>> 0);
  }
  function privat(ip){
    const n = zuZahl(ip); if (n === null) return false;
    return (n >>> 24) === 10 || (n >>> 20) === (172 << 4 | 1) || (n >>> 16) === (192 << 8 | 168);
  }
  const apipa = ip => { const n = zuZahl(ip); return n !== null && (n >>> 16) === (169 << 8 | 254); };
  const loopback = ip => { const n = zuZahl(ip); return n !== null && (n >>> 24) === 127; };
  function cidr(ip, m){ const p = praefix(m); const nz = netz(ip, m); return p === null || nz === null ? null : `${nz}/${p}`; }
  /* "192.168.1.0/24" → {netz, maske, praefix} */
  function ausCidr(s){
    const m = /^\s*(\d+\.\d+\.\d+\.\d+)\s*\/\s*(\d{1,2})\s*$/.exec(String(s)); if (!m || +m[2] > 32 || !gueltig(m[1])) return null;
    const p = +m[2]; return {netz: netz(m[1], maske(p)), maske: maske(p), praefix: p};
  }
  const istNetzadresse = (ip, m) => gueltig(ip) && maskeGueltig(m) && netz(ip, m) === zuText(zuZahl(ip)) && praefix(m) < 31;
  const istBroadcast = (ip, m) => gueltig(ip) && maskeGueltig(m) && broadcast(ip, m) === zuText(zuZahl(ip)) && praefix(m) < 31;
  /* nutzbare Hostadresse in diesem Netz? */
  const hostAdresse = (ip, m) => gueltig(ip) && maskeGueltig(m) && !istNetzadresse(ip, m) && !istBroadcast(ip, m);
  const wildcard = m => { const n = zuZahl(m); return n === null ? null : zuText((~n) >>> 0); };
  const plus = (ip, k) => zuText((zuZahl(ip) + k) >>> 0);
  const vergleich = (a, b) => zuZahl(a) - zuZahl(b);

  /* MAC: kanonisch "00:1a:2b:3c:4d:5e" */
  const macCisco = mac => { const h = String(mac).replace(/[^0-9a-f]/gi, "").toLowerCase(); return `${h.slice(0,4)}.${h.slice(4,8)}.${h.slice(8,12)}`; };
  const macWindows = mac => String(mac).toUpperCase().replace(/:/g, "-");
  const MAC_BROADCAST = "ff:ff:ff:ff:ff:ff";
  function macAus(n){ /* 48-Bit aus Zahl, Präfix 02 = lokal verwaltet (keine echten Herstellerkennungen) */
    const h = (n >>> 0).toString(16).padStart(8, "0");
    return `02:00:${h.slice(0,2)}:${h.slice(2,4)}:${h.slice(4,6)}:${h.slice(6,8)}`;
  }
  return {zuZahl, zuText, gueltig, maskeGueltig, praefix, maske, maskeZahl, netz, broadcast, gleichesNetz, imNetz,
          wildcardPasst, privat, apipa, loopback, cidr, ausCidr, istNetzadresse, istBroadcast, hostAdresse, wildcard, plus, vergleich,
          macCisco, macWindows, MAC_BROADCAST, macAus};
})();
