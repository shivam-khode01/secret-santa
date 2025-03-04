const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    wishlist: [String], // Allow wishlist to be an array of strings
    hint: String,
    role: { type: String, default: 'user' },
    santaFor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' } // Add group field
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
};

module.exports = mongoose.model('User', userSchema);