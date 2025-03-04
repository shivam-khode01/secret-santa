function generateSecretSantaPairs(participants) {
    // Shuffle participants array and generate pairs
    const shuffled = participants.sort(() => 0.5 - Math.random());
    const pairs = shuffled.map((participant, index) => {
        const recipient = shuffled[(index + 1) % shuffled.length];
        return { santa: participant.name, recipient: recipient.name };
    });
    return pairs;
}

module.exports = generateSecretSantaPairs;