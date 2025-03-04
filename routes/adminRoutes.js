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

// Placeholder functions to be implemented
async function pairUsersInGroup(groupId) {
    // Implement sophisticated pairing algorithm
    // Ensure no repeat pairings, balanced distribution
    throw new Error('Pairing algorithm not implemented');
}

async function sendPairingNotifications(pairs) {
    // Send email notifications to paired users
    // Implement email sending logic
}

async function createAdminLog(action, details) {
    // Create an administrative action log
    // Useful for auditing and tracking changes
}

async function regeneratePairsForGroup(groupId) {
    // Regenerate pairs for a specific group
}

async function regeneratePairsForAllGroups() {
    // Regenerate pairs across all groups
}

module.exports = router;