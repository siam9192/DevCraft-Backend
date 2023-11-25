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
const stripe = require('stripe')(process.env.PAYMENT_SECRET);
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
const paymentCollection = db.collection('Payments');
const workSheetCollection = db.collection('Worksheets')
app.get('/api/v1/users',async(req,res)=>{
  const result = await usersCollection.find().toArray();
  res.send(result)
})
app.get('/api/v1/employee/:email',async(req,res)=>{
  const email = req.params.email;
  const query = {
    email
  }
const employee = await usersCollection.findOne(query);
const salaryHistory = await paymentCollection.find({employee: email}).toArray();
res.send({employee,salaryHistory})
})
app.get('/api/v1/employee/payment/history/:email',async(req,res)=>{
  const email = req.params.email;
  const query = {
    employee: email
  }
  const result = await paymentCollection.find(query).toArray();
  res.send(result)
})
app.get('/api/v1/worksheets/:email',async(req,res)=>{
  const email = req.params.email;
  const query = {
    email
  }
  const result = await workSheetCollection.find(query).toArray();
  res.send(result)
})
app.get('/api/v1/worksheets/employees/get',async(req,res)=>{
  const name = req.query.name;
    let query = {};
    if(name !== 'All'){
      query.name = name
    }
    const result = await workSheetCollection.find(query).toArray();
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


// stripe payment
app.post('/api/v1/paymentSecret',async(req,res)=>{
  const amount = req.body.amount * 100;
  const paymentIntent = await stripe.paymentIntents.create({
    amount:amount,
    currency: 'usd',
    payment_method_types: ['card']
  })
  
 res.send({
  client_secret: paymentIntent.client_secret
 })
 
})

app.post('/api/v1/employee/payment',async(req,res)=>{
  const payment = req.body;
  console.log(payment)
  const result = await paymentCollection.insertOne(payment);
  res.send(result)
})

app.post('/api/v1/worksheet/add',async(req,res)=>{
  const worksheet = req.body;
  const result = await workSheetCollection.insertOne(worksheet);
  res.send(result)
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
