var mongoose = require('mongoose')
var Schema = mongoose.Schema

userSchema = new Schema( {
	email: String,
	dailyRate: Number
})

User = mongoose.model('User', userSchema)
module.exports = User
