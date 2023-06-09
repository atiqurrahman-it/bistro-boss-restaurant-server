const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

let port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

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
    const reviewCollection = client.db("BistroDB").collection("reviews");

    const cartCollection = client.db("BistroDB").collection("carts");

    // cart collection api
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const query = { userEmail:email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/carts/:id",async (req,res)=>{
      const id=req.params.id
       const query = { _id: new ObjectId(id) };
       const result = await cartCollection.deleteOne(query);
       res.send(result)
    })

    //

    app.get("/menu", async (req, res) => {
      const menus = await menuCollection.find().toArray();
      res.send(menus);
    });

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
