const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const stripe=require('stripe')(process.env.payment_Secret_key) //  payment 
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

let port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());



// verify for user token and access
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  // jodi user er token na thake
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unAuthorized access " });
  }
  const token = authorization.split(" ")[1];
  // console.log("token inside server site atik", token);

  // verify a token symmetric
  jwt.verify(
    token,
    process.env.Access_token_bistro_boss,
    function (error, decoded) {
      if (error) {
        return res
          .status(403)
          .send({ error: true, message: "unAuthorized access " });
      }
      req.decoded = decoded;
      next();
    }
  );
};


// mongoDb connect
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_PASSWORD}@cluster0.4aqqhbm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection = client.db("BistroDB").collection("menu");
    const usersCollection = client.db("BistroDB").collection("users");
    const reviewCollection = client.db("BistroDB").collection("reviews");
    const cartCollection = client.db("BistroDB").collection("carts");
    const paymentCollection = client.db("BistroDB").collection("payments");

    //
  // Warning :use verifyJWT before using verifyAdmin
    const verifyAdmin=async(req,res,next)=>{
      const email=req.decoded.email; // form verifyAdmin 
      const query={email:email}
      const user=await usersCollection.findOne(query)
      if(user?.role !=='admin'){
        return res.status(403).send({error:true,message:'forbidden message'})
      }
      next();
    }

    // create access token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.Access_token_bistro_boss, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    /**
     * 1. use jwt token:verifyJWT
     * 2. use verifyAdmin middleware
     */
    //user related api
    app.get("/users",verifyJWT,verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exist " });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    
    // security layer :verifyJWT
    // email same 
    //check admin 
    app.get("/users/admin/:email",verifyJWT,async(req,res)=>{
      const email=req.params.email
      //
      if(req.decoded.email !==email){
        res.send({admin:false})
      }
      const query={email:email}
      const AdminUser=await usersCollection.findOne(query)
      const result={admin:AdminUser?.role=="admin"}
      res.send(result)
    }) 

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // cart collection api
    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail=req.decoded.email
      console.log(decodedEmail,"inside server side")

      if(email!==decodedEmail){
         return res.status(401).send({ error: true, message: "forbidden access !" });
      }

      const query = { userEmail: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    //  create payment intent
    app.post("/create-payment-intent",verifyJWT,async(req,res)=>{
      const {price}=req.body;
      const amount=price * 100;
      console.log(price,amount)
      const paymentIntent=await stripe.paymentIntents.create({
        amount:amount,
        currency:'usd',
        payment_method_types:['card']
      }) 
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // payment related api
    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      // const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
      // const deleteResult = await cartCollection.deleteMany(query)

      // res.send({ insertResult, deleteResult });
      res.send(insertResult);
    })

    // menu related api

    app.get("/menu", async (req, res) => {
      const menus = await menuCollection.find().toArray();
      res.send(menus);
    });

    app.post("/menu",verifyJWT,verifyAdmin,async(req,res)=>{
      const newItem=req.body;
      const  result=await menuCollection.insertOne(newItem)
      res.send(result)
    })

    app.delete("/menu/:id",verifyJWT,verifyAdmin,async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)}
      const result=await menuCollection.deleteOne(query)
      res.send(result)
    })

    // reviews related api

    app.get("/reviews", async (req, res) => {
      const menus = await reviewCollection.find().toArray();
      res.send(menus);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// start routes
app.get("/", (req, res) => {
  res.send("Bistro boss is stand up.... ");
});

app.listen(port, () => {
  console.log(`Bistro boss listening on port ${port}`);
});
