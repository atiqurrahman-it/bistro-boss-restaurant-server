const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
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
  // console.log("token inside ", token);

  // verify a token symmetric
  jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET_JWT,
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

    // create access token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.Access_token_bistro_boss, {
        expiresIn: "1h",
      });

      console.log("server site ",token)

      res.send({ token });
    });

    //user related api
    app.get("/users", async (req, res) => {
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
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
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

    // menu related api

    app.get("/menu", async (req, res) => {
      const menus = await menuCollection.find().toArray();
      res.send(menus);
    });

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
