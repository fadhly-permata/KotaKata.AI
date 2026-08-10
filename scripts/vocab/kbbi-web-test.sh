#!/bin/sh
# ============================================================
# KotaKata AI — Uji coba fetch deskripsi kata dari KBBI web.id
# (https://kbbi.web.id) lewat endpoint ajax_submit, mengikuti
# pola getWordDescription() (X-Requested-With: XMLHttpRequest).
#
# Usage:
#   sh scripts/vocab/kbbi-web-test.sh [kata1 kata2 ...]
#   sh scripts/vocab/kbbi-web-test.sh terlelap
#   sh scripts/vocab/kbbi-web-test.sh        # pakai kata default
# ============================================================
set -u

# ---- kata target (default: beberapa kata untuk uji coba)
if [ "$#" -gt 0 ]; then
  set -- "$@"
else
  set -- terlelap penjarah kolektif
fi

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
TIMEOUT=20
TMPFILE=$(mktemp)

for WORD in "$@"; do
  # Random id — cache-buster ala generateRandomId() di TS (angka acak).
  RAND_ID=$((RANDOM * 100000 + RANDOM))
  URL="https://kbbi.web.id/${WORD}/ajax_submit${RAND_ID}"

  echo ""
  echo "======================================================"
  echo "KATA: ${WORD}"
  echo "URL : ${URL}"
  echo "------------------------------------------------------"

  BODY=$(curl -sS -m "${TIMEOUT}" \
    -A "${UA}" \
    -H "Accept: application/json" \
    -H "X-Requested-With: XMLHttpRequest" \
    "${URL}" 2>&1)
  CURL_RC=$?

  if [ "${CURL_RC}" -ne 0 ]; then
    echo "❌ curl gagal (rc=${CURL_RC}): ${BODY}" | head -c 500
    echo ""
    continue
  fi

  LEN=$(printf '%s' "${BODY}" | wc -c)
  echo "✅ respons ${LEN} byte"
  printf '%s' "${BODY}" > "${TMPFILE}"

  # Coba parse JSON array [ { "d": "...", ... } ] — sama seperti TS.
  if command -v node >/dev/null 2>&1; then
    node -e "
      const fs = require('fs');
      const body = fs.readFileSync('${TMPFILE}', 'utf8');
      let data = null;
      try { data = JSON.parse(body); } catch { /* bukan JSON */ }
      if (Array.isArray(data) && data.length > 0) {
        const text = data.map(e => e.d || '').filter(Boolean).join('\n\n');
        console.log('--- JSON OK (' + data.length + ' entri) ---');
        console.log(text);
      } else {
        console.log('--- BUKAN array JSON / kosong ---');
        console.log(body.slice(0, 1200));
      }
    "
  else
    echo "(node tidak tersedia — tampilkan mentah)"
    head -c 1200 "${TMPFILE}"
    echo ""
  fi
done

rm -f "${TMPFILE}"
echo ""
echo "======================================================"
echo "SELESAI"
