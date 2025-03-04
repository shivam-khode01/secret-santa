const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Group = require('../models/group');
const isAuthenticated = require('../middleware/authentication');
const nodemailer = require('nodemailer');

// Enhanced Nodemailer transporter with more robust configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    secure: true, // Use TLS
    requireTLS: true
});

// Validation middleware for group-related routes
const validateGroupExists = async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.groupId || req.params.id);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        req.group = group; // Attach group to request for further use
        next();
    } catch (err) {
        res.status(500).json({ error: 'Error validating group' });
    }
};

// Sophisticated Secret Santa Pairing Algorithm
async function pairUsersInGroup(groupId) {
    try {
        // Find the group and populate its members
        const group = await Group.findById(groupId).populate('members');
        
        if (!group || group.members.length < 2) {
            throw new Error('Not enough members to pair');
        }

        // Shuffle members to ensure randomness
        const shuffledMembers = group.members.sort(() => 0.5 - Math.random());
        
        const pairs = [];
        const usedRecipients = new Set();

        for (let i = 0; i < shuffledMembers.length; i++) {
            const santa = shuffledMembers[i];
            
            // Find a suitable recipient
            let recipientIndex = (i + 1) % shuffledMembers.length;
            while (
                shuffledMembers[recipientIndex]._id.equals(santa._id) || 
                usedRecipients.has(shuffledMembers[recipientIndex]._id.toString())
            ) {
                recipientIndex = (recipientIndex + 1) % shuffledMembers.length;
            }

            const recipient = shuffledMembers[recipientIndex];
            
            // Update santa's recipient
            santa.santaFor = recipient._id;
            await santa.save();

            // Track used recipients to prevent duplicates
            usedRecipients.add(recipient._id.toString());

            pairs.push({
                santa: santa.name,
                recipient: recipient.name,
                santaId: santa._id,
                recipientId: recipient._id
            });
        }

        return pairs;
    } catch (error) {
        console.error('Pairing error:', error);
        throw error;
    }
}

// Send Pairing Notifications via Email
async function sendPairingNotifications(pairs) {
    for (const pair of pairs) {
        try {
            const santa = await User.findById(pair.santaId);
            const recipient = await User.findById(pair.recipientId);

            // Send email to santa with recipient's wishlist hint
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: santa.email,
                subject: 'Your Secret Santa Recipient',
                text: `Hello ${santa.name},\n\nYou are the Secret Santa for ${recipient.name}!\n\nHint: ${recipient.hint || 'No hint provided'}\n\nHappy gifting!`
            });
        } catch (error) {
            console.error(`Failed to send notification for ${pair.santa}:`, error);
        }
    }
}

// Create Admin Action Log
async function createAdminLog(action, details) {
    console.log(`Admin Action: ${action}`, details);
}

// Regenerate Pairs for a Specific Group
async function regeneratePairsForGroup(groupId) {
    try {
        // Clear existing santa assignments
        await User.updateMany(
            { group: groupId }, 
            { $unset: { santaFor: "" } }
        );

        // Regenerate pairs
        await pairUsersInGroup(groupId);
    } catch (error) {
        console.error('Pair regeneration error:', error);
        throw error;
    }
}

// Regenerate Pairs for All Groups
async function regeneratePairsForAllGroups() {
    try {
        // Clear all santa assignments
        await User.updateMany({}, { $unset: { santaFor: "" } });

        // Find all groups
        const groups = await Group.find();

        // Regenerate pairs for each group
        for (const group of groups) {
            if (group.members.length >= 2) {
                await pairUsersInGroup(group._id);
            }
        }
    } catch (error) {
        console.error('All groups pair regeneration error:', error);
        throw error;
    }
}

// Admin Dashboard with enhanced data retrieval
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        // Add pagination and filtering options
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [users, groups, userCount, groupCount] = await Promise.all([
            User.find()
                .populate('santaFor')
                .populate('group')
                .skip(skip)
                .limit(limit),
            Group.find().populate('members'),
            User.countDocuments(),
            Group.countDocuments()
        ]);

        res.render('admin/dashboard', { 
            title: 'Admin Dashboard', 
            users, 
            groups,
            pagination: {
                currentPage: page,
                totalUsers: userCount,
                totalGroups: groupCount,
                limit
            }
        });
    } catch (err) {
        console.error('Dashboard retrieval error:', err);
        res.status(500).render('error', { 
            title: 'Error', 
            error: 'Could not load dashboard',
            details: err.message 
        });
    }
});

// Pair Users in a Specific Group with more robust validation
router.post('/pair-group/:groupId', 
    isAuthenticated, 
    validateGroupExists,
    async (req, res) => {
        try {
            const group = req.group;
            
            // Additional validation
            if (group.members.length < 2) {
                return res.status(400).json({ error: 'Not enough members to pair' });
            }

            // Implement more sophisticated pairing logic
            const pairs = await pairUsersInGroup(group._id);

            // Optional: Send email notifications about pairings
            await sendPairingNotifications(pairs);

            res.json({
                message: 'Pairing completed successfully',
                pairs: pairs
            });
        } catch (error) {
            console.error('Pairing error:', error);
            res.status(500).json({ 
                error: 'Could not pair users',
                details: error.message 
            });
        }
    }
);

// Delete User Route
router.delete('/users/:id', isAuthenticated, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Find and delete the user
        const deletedUser = await User.findByIdAndDelete(userId);
        
        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // If the user was part of a group, remove them from the group
        if (deletedUser.group) {
            await Group.findByIdAndUpdate(
                deletedUser.group, 
                { $pull: { members: userId } }
            );
        }
        
        res.json({ 
            message: 'User deleted successfully', 
            deletedUser 
        });
    } catch (err) {
        console.error('User deletion error:', err);
        res.status(500).json({ 
            error: 'Could not delete user',
            details: err.message 
        });
    }
});

// Pair Ungrouped Users Route
router.post('/pair-ungrouped', isAuthenticated, async (req, res) => {
    try {
        // Find users without a group
        const ungroupedUsers = await User.find({ group: null });
        
        // Check if there are enough users to pair
        if (ungroupedUsers.length < 2) {
            return res.status(400).json({ 
                error: 'Not enough ungrouped users to pair' 
            });
        }
        
        // Shuffle ungrouped users
        const shuffledUsers = ungroupedUsers.sort(() => 0.5 - Math.random());
        
        // Pair users
        for (let i = 0; i < shuffledUsers.length; i++) {
            const santa = shuffledUsers[i];
            const recipient = shuffledUsers[(i + 1) % shuffledUsers.length];
            
            santa.santaFor = recipient._id;
            await santa.save();
        }
        
        res.json({ 
            message: 'Ungrouped users paired successfully',
            pairs: shuffledUsers.map((user, index) => ({
                santa: user.name,
                recipient: shuffledUsers[(index + 1) % shuffledUsers.length].name
            }))
        });
    } catch (err) {
        console.error('Ungrouped users pairing error:', err);
        res.status(500).json({ 
            error: 'Could not pair ungrouped users',
            details: err.message 
        });
    }
});

// Remove User from Group Route
router.post('/remove-user-from-group', isAuthenticated, async (req, res) => {
    const { userId, groupId } = req.body;
    
    try {
        // Remove user from group's members
        await Group.findByIdAndUpdate(
            groupId, 
            { $pull: { members: userId } }
        );
        
        // Remove group reference from user
        await User.findByIdAndUpdate(
            userId, 
            { $unset: { group: "" } }
        );
        
        res.json({ message: 'User successfully removed from group' });
    } catch (err) {
        console.error('Remove user from group error:', err);
        res.status(500).json({ 
            error: 'Could not remove user from group',
            details: err.message 
        });
    }
});

// Create Group with more comprehensive validation
router.post('/groups', isAuthenticated, async (req, res) => {
    const { name, code } = req.body;

    // Input validation
    if (!name || !code) {
        return res.status(400).json({ error: 'Name and code are required' });
    }

    try {
        // Case-insensitive group code check
        const existingGroup = await Group.findOne({ 
            code: { $regex: new RegExp(`^${code}$`, 'i') } 
        });

        if (existingGroup) {
            return res.status(400).json({ error: 'Group code already exists.' });
        }

        const newGroup = new Group({ 
            name, 
            code,
            createdBy: req.user._id // Track group creator
        });

        await newGroup.save();

        res.status(201).json({ 
            message: 'Group created successfully', 
            group: newGroup 
        });
    } catch (err) {
        console.error("Group creation error:", err);
        res.status(500).json({ 
            error: 'Could not create group',
            details: err.message 
        });
    }
});

// Delete Group with cascading deletion and logging
router.delete('/groups/:id', 
    isAuthenticated, 
    validateGroupExists, 
    async (req, res) => {
        try {
            const group = req.group;

            // Soft delete or hard delete based on preference
            group.isDeleted = true;
            await group.save();

            // Remove group reference from users
            await User.updateMany(
                { group: group._id }, 
                { 
                    $unset: { group: "" },
                    $set: { deletedGroupHistory: group._id }
                }
            );

            // Optional: Log deletion for audit purposes
            await createAdminLog('Group Deletion', {
                groupId: group._id,
                groupName: group.name,
                deletedBy: req.user._id
            });

            res.json({ 
                message: 'Group deleted successfully',
                deletedGroup: group 
            });
        } catch (err) {
            console.error("Group deletion error:", err);
            res.status(500).json({ 
                error: 'Could not delete group',
                details: err.message 
            });
        }
    }
);

// Regenerate Pairs with more detailed control
router.post('/pairs/regenerate', isAuthenticated, async (req, res) => {
    try {
        const { groupId } = req.body;
        
        // Optional: Add option to regenerate for specific group or all groups
        if (groupId) {
            await regeneratePairsForGroup(groupId);
        } else {
            await regeneratePairsForAllGroups();
        }

        res.json({ 
            message: 'Pairs regenerated successfully',
            regeneratedAt: new Date()
        });
    } catch (error) {
        console.error('Pair regeneration error:', error);
        res.status(500).json({ 
            error: 'Could not regenerate pairs',
            details: error.message 
        });
    }
});

module.exports = router;