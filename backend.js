const express = require('express');
const cors = require('cors');
const port = 8000;

const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();

app.use(cors())
app.use(express.json());
const stripe = require('stripe')(process.env.PAYMENT_SECRET);
app.get('/',(req,res)=>{
    res.send('working')
})
app.listen(port)



const security =(req,res,next)=>{
  
  if(!req.headers.authorization){
   return res.status(401).send({status:'unauthorized'})
  }
 const token = req.headers.authorization.split(' ')[1]; 

  if(!token){
    res.status(401).send({status:'unauthorized'})
    return;
  }
  jwt.verify(token,process.env.ACCESS_TOKEN,(err,decode)=>{
if(err){
  res.status(401).send({status:'unauthorized'})
  return;
}

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

const verifyAdmin = async (req,res,next)=>{
  const email = req.user.email;
  const findHr = await usersCollection.findOne({email});
  if(!findHr){
  return res.send({status:'unauthorized'})
  }
  if(findHr.role !== 'admin'){
    return res.send({'status': 'unauthorized'})
  }
  next();
}

const verifyHrOrAdmin = async(req,res,next)=>{
  const email = req.user.email;
  console.log(email)
  const findUser = await usersCollection.findOne({email});
  
  if(!findUser){
  return res.send({status:'unauthorized'})
  }
  
  if(findUser.role === 'hr' ||findUser.role === 'admin'){
  next()
  return;
  }

  return res.send({'status': 'unauthorized'})
 
  }

  const verifyEmployee =async(req,res,next)=>{
    const email = req.user.email;
  
  const findUser = await usersCollection.findOne({email});
  
  if(!findUser){
  return res.send({status:'unauthorized'})
  }
  
  if(findUser.role === 'employee'){
  next()
  return;
  }

  return res.send({'status': 'unauthorized'})
 
  }

app.get('/api/v1/hr/users',security,verifyHrOrAdmin,async(req,res)=>{
  const currentPage =parseInt( req.query.currentPage) -1 ;
  const users = await usersCollection.find().skip(currentPage * 5).limit(5).toArray();
  const usersCount = await usersCollection.estimatedDocumentCount();
  const result = {
    users,
    totalUsers: usersCount
  }
  
  res.send(result)
})
app.get('/api/v1/admin/users',security,verifyAdmin,async(req,res)=>{
  const result = await usersCollection.find().toArray();
  res.send(result)
})
app.get('/api/v1/employee/:email',security,verifyHrOrAdmin,async(req,res)=>{
  const email = req.params.email;
  const query = {
    email
  }
const employee = await usersCollection.findOne(query);
const salaryHistory = await paymentCollection.find({employee: email}).toArray();

res.send({employee,salaryHistory})
})
app.post('/api/v1/isFired',async(req,res)=>{
  const query = {
    email: req.body.email
  }
  const result = await usersCollection.findOne(query);

  if(result){
    res.send({isFired:result.isFired})
    return;
  }
  res.send({isFired:false})
})
app.get('/api/v1/employee/payment/history/:email',async(req,res)=>{
  const email = req.params.email;
  const query = {
    employee: email
  }
  const result = await paymentCollection.find(query).toArray();
  res.send(result)
})
app.get('/api/v1/users',security,verifyHrOrAdmin,async(req,res)=>{
  const result = await usersCollection.find().project({name:1}).toArray();
  res.send(result)
})
app.get('/api/v1/worksheets/:email',async(req,res)=>{
  const email = req.params.email;
  const query = {
    email
  }
  const result = (await workSheetCollection.find(query).sort({length: -1}).toArray()).reverse();
  res.send(result)
})
app.get('/api/v1/worksheets/employees/get',security,verifyHrOrAdmin,async(req,res)=>{
  const name = req.query.name;
    let query = {};
    if(name !== 'All'){
      query.name = name
    }
    const result = await workSheetCollection.find(query).toArray();
    res.send(result)
  
})
app.get('/api/v1/checkUser/:email',async(req,res)=>{
  const email = req.params.email;
  const query = {email};
  const findUser = await usersCollection.findOne(query);
  const role = findUser.role;
  res.send({role})
})
app.get('/api/v1/dashboard/admin',async(req,res)=>{
  const total_employees =  (await usersCollection.estimatedDocumentCount());
const salaries = await paymentCollection.find().toArray();
const worksheets = await workSheetCollection.estimatedDocumentCount();
const fired = (await usersCollection.find({isFired:true}).toArray()).length;
const totalSalaries = await paymentCollection.aggregate([
  {
    $group:{
      _id: null,
      total:{
        $sum: '$amount'
      }
    }
  }
]).toArray()

// console.log(total_employees,worksheets,salaries,fired)
res.send({total_employees,worksheets,salaries,totalPayedSalaries:totalSalaries[0].total,fired})
})

app.get('/api/v1/dashboard/employee/:email',async(req,res)=>{
  const email = req.params.email;
  const query = {email};
  const employee = await usersCollection.findOne(query);
  const worksheets = (await workSheetCollection.find(query).toArray()).length;
  const salaries = await paymentCollection.find(query).toArray();
  const total_salaries = salaries.reduce((prev,curr)=> prev + curr.amount,0);
  
   res.send({employee,worksheets,total_salaries})

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

// app.patch
app.patch('/api/v1/admin/change-role',async(req,res)=>{
  const query = {_id : new ObjectId(req.body.id)}
  const updatedDoc = {
    $set:{
      role:req.body.role
    }
  }
  const result = await usersCollection.updateOne(query,updatedDoc);
  res.send(result)
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

app.patch('/api/v1/fire-employee/:email',async(req,res)=>{
  const email = req.params.email;
  const query ={
    email
  }
  const updatedDoc ={
 $set:{
  isFired: true
 }
  }
  const result = await usersCollection.updateOne(query,updatedDoc);
  res.send(result)
})
  } finally {
   
  }
}
run().catch(console.dir);
