const eightBallResponses = [
    "Lawak",
    "Hahaha",
    "Pandir apa kam?",
    "Bacot",
    "Mauk ha",
    "Kimek",
    "Kada tahu",
    "munyak nda"
];

async function eightBallCommand(sock, chatId, question) {
    if (!question) {
        await sock.sendMessage(chatId, { text: 'silakan ajukan pertanyaan!' });
        return;
    }

    const randomResponse = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
    await sock.sendMessage(chatId, { text: `🎱 ${randomResponse}` });
}

module.exports = { eightBallCommand };
