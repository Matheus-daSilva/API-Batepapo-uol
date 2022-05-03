import cors from "cors";
import express from "express";
import joi from "joi";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

app.post("/participants", async (req, res) => {
    const { name } = req.body;

    const loginSchema = joi.object({
        name: joi.string().required(),
    });
    const validation = loginSchema.validate({ name });

    if (validation.error) {
        return res.sendStatus(422);
    }

    const loginName = {
        name,
        lastStatus: Date.now()
    };
    console.log(loginName)

    try {
        await mongoClient.connect();
        const db = mongoClient.db("local");
        const thereIs = await db.collection("user").findOne({ name });
        console.log(thereIs)
        if (thereIs) {
            return res.sendStatus(409);
        } else {
            await db.collection("user").insertOne(loginName)
            res.sendStatus(201);
        }
        mongoClient.close();
    }
    catch (e) {
        console.log(e)
        res.sendStatus(500);
        mongoClient.close();
    }

})

app.get("/participants", async (req, res) => {
    await mongoClient.connect();
    const db = mongoClient.db("local");
    const users = await db.collection("user").find({}).toArray();
    res.send(users);
    mongoClient.close();
})

app.listen(5000);