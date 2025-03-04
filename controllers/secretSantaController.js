function generateGroupSecretSantaPairs(group) {
    // Fetch all users in the specific group
    const groupParticipants = group.members;
    
    // Shuffle participants within the group
    const shuffled = groupParticipants.sort(() => 0.5 - Math.random());
    
    const pairs = shuffled.map((participant, index) => {
        const recipient = shuffled[(index + 1) % shuffled.length];
        return { 
            santa: participant, 
            recipient: recipient 
        };
    });
    
    return pairs;
}

// Add this function to handle group-specific pairing
async function pairUsersInGroup(groupId) {
    try {
        // Find the group and populate its members
        const group = await Group.findById(groupId).populate('members');
        
        if (!group) {
            throw new Error('Group not found');
        }
        
        // Generate pairs for this group
        const pairs = generateGroupSecretSantaPairs(group);
        
        // Update each user's santaFor field
        for (const pair of pairs) {
            const santa = await User.findById(pair.santa);
            santa.santaFor = pair.recipient;
            await santa.save();
        }
        
        return pairs;
    } catch (error) {
        console.error('Error pairing users in group:', error);
        throw error;
    }
}

module.exports = {
    generateGroupSecretSantaPairs,
    pairUsersInGroup
};