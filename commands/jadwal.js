const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// konfigurasi
const DAY_MAP_ID = {
  senin: "senin.webp",
  selasa: "selasa.webp",
  rabu: "rabu.webp",
  kamis: "kamis.webp",
  jumat: "jumat.webp",
  sabtu: null,
  minggu: null,
};
const OLAHRAGA_FILE = path.join(process.cwd(), "olahraga.json");

const CRON_ENABLED = (process.env.CRON_ENABLED || "false").toLowerCase() === "true";
const CRON_TIME = process.env.CRON_TIME || "0 6 * * *";
const CRON_TZ = process.env.CRON_TZ || "Asia/Makassar";
const CRON_TARGETS = (process.env.CRON_TARGETS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// helper
function getLocalImage(filename) {
  const filePath = path.join(process.cwd(), "images", filename);
  if (!fs.existsSync(filePath)) throw new Error(`Image not found: ${filePath}`);
  return fs.readFileSync(filePath);
}

function todayNameID(date = new Date()) {
  const day = date.getDay(); // 0 Minggu ... 6 Sabtu
  return ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"][day];
}

function parseDayFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const k of Object.keys(DAY_MAP_ID)) {
    if (t.includes(k)) return k;
  }
  return null;
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function loadOlahragaDays() {
  try {
    const raw = fs.readFileSync(OLAHRAGA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveOlahragaDays(days) {
  fs.writeFileSync(OLAHRAGA_FILE, JSON.stringify(days, null, 2));
}

// core send function
async function sendOutfitImage(sock, jid, dayKey, quotedMsg) {
  try {
    if (!dayKey) {
      await sock.sendMessage(jid, { text: "Hari tidak dikenali." }, { quoted: quotedMsg });
      return;
    }

    // weekend -> libur
    if (dayKey === "sabtu" || dayKey === "minggu") {
      await sock.sendMessage(jid, { text: `Hari ${capitalize(dayKey)} libur, tidak ada jadwal baju.` }, { quoted: quotedMsg });
      return;
    }

    const olahragaDays = loadOlahragaDays();

    // if olahraga day -> kirim pesan olahraga terlebih dahulu
    if (olahragaDays.includes(dayKey)) {
      try {
        const bufferOlahraga = getLocalImage("olahraga.webp");
        await sock.sendMessage(jid, { image: bufferOlahraga, caption: "Tambahan: Olahraga 🏃‍♂️" }, { quoted: quotedMsg });
      } catch (e) {
        console.warn("Olahraga image missing or failed:", e.message);
      }
    }

    const filename = DAY_MAP_ID[dayKey];
    if (!filename) {
      await sock.sendMessage(jid, { text: `Tidak ada mapping gambar untuk hari: ${dayKey}` }, { quoted: quotedMsg });
      return;
    }

    const buffer = getLocalImage(filename);
    const caption = `Jadwal baju: ${capitalize(dayKey)}`;
    await sock.sendMessage(jid, { image: buffer, caption }, { quoted: quotedMsg });
  } catch (e) {
    console.error("Gagal kirim gambar:", e);
    try {
      await sock.sendMessage(jid, { text: `Gagal mengirim gambar untuk ${dayKey}. Pastikan file images/${DAY_MAP_ID[dayKey]} ada.` }, { quoted: quotedMsg });
    } catch (_) {}
  }
}

// handler untuk messages.upsert style Baileys
// Mendukung: "baju", "jadwalbaju", "baju <hari>", "jadwal <hari>", "olahraga <hari>", "hapus olahraga <hari>"
// serta versi dengan prefix titik: ".baju", ".jadwalbaju", ".baju senin", ".olahraga rabu", ".hapus olahraga rabu"
async function jadwalCommand(sock, chatId, messageUpdate) {
  try {
    const { messages, type } = messageUpdate;
    if (type !== 'notify') return;
    for (const msg of messages) {
      const m = msg.message;
      const jid = msg.key.remoteJid;
      if (!m) continue;
      if (jid?.endsWith("@broadcast")) continue;

      const text =
        m.conversation ||
        m?.extendedTextMessage?.text ||
        m?.imageMessage?.caption ||
        m?.videoMessage?.caption ||
        "";
      if (!text) continue;

      const raw = text.trim();
      const lower = raw.toLowerCase().trim();

      // help/menu
      if (lower === ".jadwal") {
        const olahragaDays = loadOlahragaDays();
        let olahragaText = olahragaDays.length > 0 
          ? `\n\nHari olahraga: ${olahragaDays.map(capitalize).join(", ")}`
          : "\n\nBelum ada jadwal olahraga.";
        
        await sock.sendMessage(jid, { 
          text: `*📅 Jadwal Baju*\n\nPerintah yang tersedia:\n`.concat(
            `• .jadwal - Menampilkan menu ini\n`,
            `• .baju - Menampilkan jadwal baju hari ini\n`,
            `• .baju<hari> - Menampilkan jadwal baju untuk hari tertentu\n`,
            `  Contoh: .bajusenin, .bajuselasa\n`,
            `• .olahraga<hari> - Menambahkan hari olahraga\n`,
            `  Contoh: .olahragakamis\n`,
            `• .hapusolahraga<hari> - Menghapus hari olahraga\n`,
            `  Contoh: .hapusolahragakamis`,
            olahragaText
          )
        }, { quoted: msg });
        continue;
      }

      // handle single keyword today: baju / jadwalbaju
      if (lower === ".jadwalbaju" || lower === ".baju") {
        const day = todayNameID();
        await sendOutfitImage(sock, jid, day, msg);
        continue;
      }

      // baju <hari> or jadwal <hari>
      if (lower.startsWith(".baju")) {
        const dayParsed = parseDayFromText(lower);
        if (dayParsed) {
          await sendOutfitImage(sock, jid, dayParsed, msg);
        } else {
          await sock.sendMessage(jid, { text: "Hari tidak dikenali. \nContoh: .bajusenin" }, { quoted: msg });
        }
        continue;
      }

      // olahraga <hari> -> tambah
      if (lower.startsWith(".olahraga")) {
        const dayParsed = parseDayFromText(lower);
        if (dayParsed) {
          if (dayParsed === "sabtu" || dayParsed === "minggu") {
            await sock.sendMessage(jid, { text: `📌 Hari ${capitalize(dayParsed)} adalah hari libur, tidak bisa ditambahkan sebagai hari olahraga.` }, { quoted: msg });
            continue;
          }
          let days = loadOlahragaDays();
          if (!days.includes(dayParsed)) {
            days.push(dayParsed);
            saveOlahragaDays(days);
            await sock.sendMessage(jid, { text: `✅ Hari ${capitalize(dayParsed)} ditambahkan sebagai hari olahraga.` }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: `Hari ${capitalize(dayParsed)} sudah jadi hari olahraga.` }, { quoted: msg });
          }
        } else {
          await sock.sendMessage(jid, { text: "Hari tidak dikenali. Contoh: .olahragarabu" }, { quoted: msg });
        }
        continue;
      }

      // hapus olahraga <hari>
      if (lower.startsWith(".hapusolahraga")) {
        // support both "hapus olahraga rabu" and "hapusolahraga rabu" (typo tolerance)
        const dayParsed = parseDayFromText(lower);
        if (dayParsed) {
          let days = loadOlahragaDays();
          if (days.includes(dayParsed)) {
            days = days.filter(d => d !== dayParsed);
            saveOlahragaDays(days);
            await sock.sendMessage(jid, { text: `❌ Hari ${capitalize(dayParsed)} dihapus dari jadwal olahraga.` }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { text: `Hari ${capitalize(dayParsed)} tidak ada di jadwal olahraga.` }, { quoted: msg });
          }
        } else {
          await sock.sendMessage(jid, { text: "Hari tidak dikenali. Contoh: .hapusolahragarabu" }, { quoted: msg });
        }
        continue;
      }

      // Jika bukan perintah terkait jadwal, abaikan — biarkan handler lain (main) memproses
    }
  } catch (e) {
    console.error("Error in jadwal handler:", e);
  }
}

function setupCron(sock) {
  if (CRON_ENABLED && CRON_TARGETS.length > 0) {
    cron.schedule(
      CRON_TIME,
      async () => {
        try {
          const day = todayNameID();
          for (const target of CRON_TARGETS) {
            await sendOutfitImage(sock, target, day);
            await new Promise(r => setTimeout(r, 1000));
          }
        } catch (e) {
          console.error("Cron error:", e);
        }
      },
      { timezone: CRON_TZ }
    );
    console.log(`⏰ Cron aktif: ${CRON_TIME} (${CRON_TZ}) → ${CRON_TARGETS.join(", ")}`);
  } else {
    console.log("Cron nonaktif. Set CRON_ENABLED=true dan CRON_TARGETS untuk mengaktifkan.");
  }
}

module.exports = {
  jadwalCommand,
  setupCron,
  sendOutfitImage
};