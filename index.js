const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongo = require('mongodb');
const bodyParser = require('body-parser');
const ObjectId = require('mongodb').ObjectId

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

// Set up mongoose
let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// body-parser to Parse POST Requests
app.use(bodyParser.urlencoded({extended: false}))

// Create User Model
let UserSchema = new mongoose.Schema({
  username: { type: String, lowercase: true, trim: true, unique: true }
})

// Create and Save URL */
let User = mongoose.model('User', UserSchema);

// Create Exercise Model
let ExerciseSchema = new mongoose.Schema({
  user_id: ObjectId,
  description: String,
  duration: { type: Number, min: 1 },
  date: { type: Date, default: Date.now }
})

// Create and Save URL */
let Exercise = mongoose.model('Exercise', ExerciseSchema);

app.post('/api/users', async function(req, res) {
  const username = req.body.username
  try {
      // check if it is already in database
      let findUser = await User.findOne({username: username.toLowerCase().trim()})
      // if it's already in database, display User info
      if ( findUser ) {
        return res.json( {username: findUser.username, _id: findUser._id})
      }
      // if not in database, create new url and save
      else {
        findUser = new User({username: username});
        await findUser.save()
        return res.json( {username: findUser.username, _id: findUser._id })
      }
  }
  catch (err) {
    console.error(err);
    res.json('Server error...')
    }
})

app.get('/api/users', async function(req, res) {
  try {
    // get all users in database
    const findAllUsers = await User.find({}, {username: 1})
    res.json(findAllUsers)
  
  }
  catch (err) {
      console.error(err);
        res.json('Server error')
  }
})

app.post('/api/users/:_id/exercises', async function(req, res) {
      
  try {

      // if its invalid id input
      if (!ObjectId.isValid(req.body[':_id'])) {
          return res.json("User id not valid")
      }
      // check if date is valid
      if (new Date(req.body.date) === "Invalid Date") {
          return res.json('Date is invalid')
        }
    
      // check if id is in database
      let findUser = await User.findById(req.body[':_id'])
    
      // if it is in database
      if ( findUser ) {
        //get input info
        const user_id = req.body[':_id'];
        const description = req.body.description;
        const duration = parseInt(req.body.duration);
        // set current date if blank
        const date = req.body.date === undefined ? new Date() : new Date(req.body.date);

        if (description === "") {
          return res.json("Description is required")
        }
        
        if (duration === "" || isNaN(duration) || duration === 0) {
          return res.json("Duration is required in minutes")
        }

        // add and save in database
        const addExercise = new Exercise({
          user_id: ObjectId(user_id), 
          description: description, 
          duration: duration, 
          date: date});
        
        addExercise.save();
        // display info
        return res.json({
                  _id: addExercise.user_id,
                  username: findUser.username,
                  date: addExercise.date.toDateString(),
                  duration: addExercise.duration,
                  description: addExercise.description,
                 })
      }
      // if not in database
      else {
        return res.json("User not found")
      }
  }
  catch (err) {
    console.error(err);
    res.json('Server error...')
    }
})

app.get('/api/users/:_id/logs', async function(req, res) {
  try {
    const user_id = req.params._id
    // check if id is in database
      let findUser = await User.findById(user_id)
      
    // if it is in databse
    if (findUser) {
      let filter = {user_id}
      let dateFilter = {}
    
    if (req.query.from) {
			dateFilter.$gte = new Date(req.query.from);
		}

		if (dateFilter.$gte == 'Invalid Date') {
			return res.json({ error: 'from date is invalid' });
		}

		if (req.query.to) {
			dateFilter.$lte = new Date(req.query.to);
		}

		if (dateFilter.$lte == 'Invalid Date') {
			return res.json({ error: 'to date is invalid' });
		}
	  if (req.query.from || req.query.to) {
      filter.dateFilter = dateFilter;
    }

	  let limit = (req.query.limit !== undefined ?   parseInt(req.query.limit) : 100);

	  if (isNaN(limit)) {
		  return res.json({ error: 'limit is not a number' });
	  }
      
      const findUserExercises = await Exercise.find(filter).limit(limit)
     // display log info
      return res.json({
        username: findUser.username,
        count: findUserExercises.length,
        _id: user_id,
        log: findUserExercises.map((exercise) => {
          return {description: exercise.description,
                  duration: exercise.duration,
                  date: exercise.date.toDateString()}
        })
    })
    }
    else {
      res.json('User not found')
    }
  }
  catch (err) {
      console.error(err);
      res.json('Server error')
  }
})
  
  
