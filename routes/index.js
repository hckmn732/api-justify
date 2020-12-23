var express = require('express')
var router = express.Router()
var User = require('../models/user')
const jwt = require('jsonwebtoken')
const TOKEN_SECRET = "API_TEXT_JUSTIFY"
const LINE_LENGTH = 80
const MAX_DAILY_RATE = 80000

//Middleware to verify user authorization
const authenticateJWT = (req, res, next) => {
	let token = req.headers.authorization
    if (token) {
		token = token.trim()
        jwt.verify(token, TOKEN_SECRET, (err, data) => {
            if (err) {
                return res.sendStatus(403)
			}			
            req.email = data.email
            next()
        })
    } else {
        res.sendStatus(401)
    }
}

// Main function for text ustification
function textJustification(words, length) {
		
	let lines = []
	let currentLine = ""

	// Construct arrays for each lines
	for(var i in words) {
		// if wor
		if(currentLine.length == 0 && words[i].length <= length) {
			currentLine = words[i] 
		} 
		// if current line size with nextword + space <= line length, add the word
		else if ( (currentLine.length + words[i].length+1) <= length) {
			currentLine = currentLine + " " + words[i] 
		} 
		// if we cannot add the next word in the line, then clean the current line variable with next word
		else {
			lines.push(currentLine);
			currentLine = words[i];
		}
		// if is the last word, add to a new line
		if( parseInt(i)+1 == words.length) {
			lines.push(currentLine);
		}
	}

	// Fill line where length < 80 with blank space
	for (let index = 0; index < lines.length; index++) {
		let line = lines[index]
		// while line lenght < desired line length, fill with space progressivrly until, we have desired length line
		while (line.length<length) {
			for (let index = 0; index < line.length; index++) {
				let char = line[index]
				if(line.length == length){
					// line is fully filled with space, so exit
					break
				}else if(!line.includes(' ')){
					// line have only one word, without space, add first space
					line = line + ' '
				}else if(char == " "){
					// add space progressively 
					line = [line.slice(0, index), " ", line.slice(index)].join('')
					index = index + 1
				}
			}
		}
		
		lines[index] = line
	}
	return lines;
}

async function justify(text,length){
	return new Promise((resolve, reject) => {
		//Split text in paragraph first

		let paragraphText = text.split(/\s\s+/g)
		let output = ""

		//For each paragraph, convert to words array, and call textJustification Function
		//And Finally append each paragraph in output
		for (let index = 0; index < paragraphText.length; index++) {
			let paragraph = paragraphText[index];
			let words = paragraph.split(" ")
			if(paragraph != ''){
				let textJustifed = textJustification(words,length)	
				output = output + textJustifed.join("\n") + "\n"
			}
		}
		resolve(output)		
	})
}

//retreive a user
async function getUser(email){
	return new Promise((resolve, reject) => {
		if(email){
			let query =  {email: email }
			User.findOne(query,(err, data) => {
				if(data) resolve(data)
				resolve(false)
			})
		}else{
			resolve(false)
		}
	})
}

//add new user in database
async function addUser(email){
	return new Promise((resolve, reject) => {
		if(email){
			let fields = {
				email: email,
				dailyRate : 0
			}
			
			let user = new User(fields)
			user.save((err, user) => {
				if (user) resolve(user)
				resolve(false)
			})
		}else{
			resolve(false)
		}

	})
}

//update user daily limit after a successfull justification operation
async function updateDailyLimit(email,newLimit){
	return new Promise((resolve, reject) => {
		let query = {email: email}
		update = {dailyRate : newLimit}
		options = { upsert: true, new: true, setDefaultsOnInsert: true }
		User.findOneAndUpdate(query, update, options, function(error, result) {
			if (result) resolve(result)
			resolve(error)
		})
	})
}

//generate user token 24h validity
async function generateToken(email){
	return new Promise((resolve, reject) => {
		const accessToken = jwt.sign({ email: email }, TOKEN_SECRET ,{ expiresIn: '24h' })
		resolve(accessToken)
	})
}

// homepage
router.get('/', async(req, res) => {
	return res.send('Welcome to our API Text Justify')
})

// route for user token generator, if user email not exist, create user and generate token
router.post('/api/token', async (req, res) => {
	let email = req.body.email
	let user = await getUser(email)
	if(!user){
		user = await addUser(email)
	}
	let token = await generateToken(user.email)
	res.json({
		token
	})
})

// route for justifying a text
// every request pass through the middlewre before

router.post('/api/justify', authenticateJWT ,async (req, res) => {
	let text = req.body.text
	let queryLength = parseInt(req.query.length)
	let lineLength = (queryLength>0) ? queryLength : LINE_LENGTH
	let User = await getUser(req.email)
	if(text){
		if (!(User && User.dailyRate + text.length  <= MAX_DAILY_RATE)) {
			return res.status(402).json({ message: '402 Payment Required.' })
		}
		
		let textJustified = await justify(text,lineLength)
		await updateDailyLimit(User.email, User.dailyRate + text.length)
		res.type("text/plain")
		return res.send(textJustified)
		
	}
	return res.json({ message: 'No text passed' })
})


module.exports = router
