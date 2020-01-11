const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const crypto = require('crypto');
const mongooseDelete = require('mongoose-delete');

const keys = require.main.require('./app/config/keys');
const strings = require.main.require('./app/config/strings');

// Make email and phone docs unique except for those that are flagged as deleted
const uniquePartialIndex = {
    unique: true,
    partialFilterExpression: {
        deleted: false
    }
};

const UserSchema = new Schema({
    name: {
        first: { type: String, required: true },
        last: { type: String, required: true }
    },
    email: { type: String, select: false },
    phone: { type: String },
    photo: { type: String, default: strings.userPhotoUrl },
    google: {
        id: { type: String, select: false },
        accessToken: { type: String, select: false },
        refreshToken: { type: String, select: false }
    },
    isAdmin: { type: Boolean, default: false, select: false },
    ip: { type: String, select: false }
}, {
    timestamps: true
});

// TODO: Generate key with library
// TODO: Encrypt refresh token
// https://github.com/nodejs/node/blob/933d8eb689bb4bc412e71c0069bf9b7b24de4f9d/doc/api/deprecations.md#dep0106-cryptocreatecipher-and-cryptocreatedecipher

UserSchema.statics.encryptAccessToken = function(plainText) {
    return crypto
        .createCipheriv(keys.encryption.algorithm, keys.encryption.key)
        .update(plainText, 'utf-8', 'hex');
};

UserSchema.statics.decryptAccessToken = function(cipher) {
    return crypto
        .createDecipheriv(keys.encryption.algorithm, keys.encryption.key)
        .update(cipher, 'hex', 'utf-8');
};

UserSchema.plugin(mongooseDelete, { overrideMethods: true });

UserSchema.index({ email: 1, phone: 1 }, uniquePartialIndex);

var User = mongoose.model('User', UserSchema);

module.exports = User;