const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: String,
    code: { type: String, unique: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Group', groupSchema);