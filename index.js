const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.llz6n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection = client.db('beautyBabe').collection('users');
    const servicesCollection = client.db('beautyBabe').collection('services');
    const reviewsCollection = client.db('beautyBabe').collection('reviews');


    // jwt api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECURE, {
        expiresIn: '365d'
      })
      res.send({ token })
    })

    // middleware
    const verifyToken = (req, res, next) => {
      console.log("verifyToken --->", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECURE, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "forbidden access" })
        }
        req.decoded = decoded
        next()
      })
    }

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()

    }


    // admin related api
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'unauthorized access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })

    })
    //1.make admin api
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    //2.delete a admin
    app.delete('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })



    // user related api

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body
      // insert email if user does not exists
      // you can do this many way(1.email 2.upsert 3.simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user)
      res.send(user)

    })

    // services related api ------------------------------------------------
    app.post('/services', verifyToken, verifyAdmin, async (req, res) => {
      const services = req.body;
      const result = await servicesCollection.insertOne(services)
      res.send(result)
    })
    app.get('/services', async (req, res) => {
      const result = await servicesCollection.find().toArray();
      res.send(result);
    })
    // limited 3 services
    app.get('/services/limited', async (req, res) => {
      const result = await servicesCollection.find().limit(3).toArray();
      res.send(result);
    })

    // single service api
    app.get('/service/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.findOne(query);
      res.send(result)
    })
    // update a service
    app.patch('/service/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updatedService = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          title: updatedService.title,
          price: updatedService.price,
          image: updatedService.image,
          description: updatedService.description,
        },
      };
      const result = await servicesCollection.updateOne(filter,updateDoc)
      res.send(result)

    })
    // delete a service 
    app.delete('/service/:id',verifyToken,verifyAdmin, async(req,res) =>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await servicesCollection.deleteOne(query);
      res.send(result);
    })

    // review api ---------------------------
    app.post('/reviews', async(req,res) =>{
      const reviews = req.body
      const result = await reviewsCollection.insertOne(reviews)
      res.send(result)
    })
    app.get('/reviews', async(req,res) =>{
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("beauty parlour for woman is running")
})
app.listen(port, () => {
  console.log(`beauty parlour for woman is running on port ${port}`);
})
