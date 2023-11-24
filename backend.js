const express = require('express');
const cors = require('cors');
const port = 8000;
// const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
// "http://localhost:5173","https://grand-luminary.web.app/",
app.use(cors())
app.use(express.json());
// app.use(cookieParser());
app.get('/',(req,res)=>{
    res.send('working')
})
app.listen(port)

const security =(req,res,next)=>{
  const token = req.cookies.token;
  if(!token){
    res.status(401).send({status:'unauthorized'})
    return;
  }
  jwt.verify(token,process.env.SECRET,(err,decode)=>{
if(err){
  console.log(err).message;
  return;
}
// console.log(decode)
req.user = decode;
next();
  })

} 

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.katjfem.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  try {
const db = client.db('Employee-management');
const usersCollection = db.collection('Users');

app.get('/api/v1/users',async(req,res)=>{
  const result = await usersCollection.find().toArray();
  res.send(result)
})


app.post('/api/v1/user/new',async(req,res)=>{
    const user = req.body;
    const result = await usersCollection.insertOne(user);
    res.send(result);
})

app.post('/api/v1/jwt',(req,res)=>{
  const user = req.body;
const token =   jwt.sign(user,process.env.ACCESS_TOKEN,{
    expiresIn:'30d'
  })
  res.send({token})
})

app.patch('/api/v1/update/user/:id',async(req,res)=>{
  const query = {
    _id: new ObjectId(req.params.id)
  }
  const user = req.body;
  const updatedDoc = {
    $set: user
  }
  const result = await usersCollection.updateOne(query,updatedDoc);
  res.send(result)

})


  } finally {
   
  }
}
run().catch(console.dir);
