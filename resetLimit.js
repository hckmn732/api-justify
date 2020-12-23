const User = require('./models/user');

async function updateDailyLimit(email){
	return new Promise((resolve, reject) => {
		let query = {email: email}
		update = {dailyRate : 0}
		options = { upsert: true, new: true, setDefaultsOnInsert: true }
		User.findOneAndUpdate(query, update, options, function(error, result) {
			if (result) resolve(result)
			resolve(error)
		})
	})
}

// Retreive all users, and for each user, set daily limit to 0
async function resetLimit(){
    User.find({},async (err, data) => {
        if (data) {
            for(let index = 0; index < data.length; index++) {
                let user = data[index]
                await updateDailyLimit(user.email)
            }
        }
    });
}

module.exports = { resetLimit }