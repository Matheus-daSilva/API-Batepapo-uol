import cors from "cors";
import express from "express";
import joi from "joi";
import dotenv from "dotenv";
import dayjs from "dayjs";
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

    try {
        await mongoClient.connect();
        const db = mongoClient.db("local");
        const thereIs = await db.collection("user").findOne({ name });
        if (thereIs) {
            return res.sendStatus(409);
        } else {
            await db.collection("user").insertOne(loginName)
            res.sendStatus(201);
        }
        mongoClient.close();
    }
    catch (e) {
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

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;

    const messagesSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().pattern(/^message|private_message$/),
        from: joi.string().valid(user)
    })

    const validation = messagesSchema.validateAsync({ to, text, type, from: user });

    if (validation.error) {
        return res.sendStatus(422);
    }

    const userMessage = {
        to,
        text,
        type,
        time: dayjs().format('HH:mm:ss'),
        from: user
    }
    console.log(userMessage);
    try {
        await mongoClient.connect();
        const db = mongoClient.db("local");
        await db.collection("userMessages").insertOne(userMessage)
        res.sendStatus(201);
        mongoClient.close();
    }
    catch (e) {
        res.sendStatus(500);
        mongoClient.close();
    }

})

app.get("/messages", async (req, res) => {
    const { limit } = req.query;
    const { user } = req.headers;

    await mongoClient.connect();
    const db = mongoClient.db("local");
    const to = await db.collection("userMessages").findOne({ to: user });
    const from = await db.collection("userMessages").findOne({ from: user });
    const users = await db.collection("userMessages").find({}).toArray();
    const userMessage = [];

    if (!to && !from) {
        res.send(404);
    }

    for (let i = 0; i < users.length; i++) {
        if (users[i].type == "message" || users[i].type == "status") {
            userMessage.push(users[i]);
        }
        if (users[i].type == "private_message" && (users[i].to == user || users[i].from == user)) {
            userMessage.push(users[i]);
        }
    }

    if (!limit) {
        res.send(userMessage);
    } else {
        const slicedArray = userMessage.reverse().splice(0, limit).reverse();
        res.send(slicedArray);
    }
    mongoClient.close();
})

app.post("/status", async (req, res) => {
    const { user } = req.headers;
    const userStatus = {
        lastStatus: Date.now()
    };

    try {
        await mongoClient.connect();
        const db = mongoClient.db("local");
        const verification = await db.collection("user").findOne({ name: user });
        if (!verification) {
            res.send(404);
        }
        else {
            await db.collection("user").updateOne({ name: user }, { $set: userStatus });
        }
        res.sendStatus(201);
        mongoClient.close();
    }
    catch (e) {
        res.sendStatus(500);
        mongoClient.close();
    }
})

const removeParticipants = async () => {
    const time = Date.now();
    await mongoClient.connect();
    const activedUser = await mongoClient.collection("user").find({}).toArray();
    for (let i = 0; i < deactivatedUsers.length; i++) {
        if (activedUser[i].lastStatus < time - 10000) {
                const verification =activedUser[i].name
                const deleted = await db.collection("participants").findOne({verification})
                await db.collection("participants").deleteOne({deleted});
                await database.collection("menssages").insertOne({
                    from: verification,
                    to: "Todos",
                    text: "sai na sala...",
                    type: "status",
                    time: dayjs().format("HH:mm:ss")
                });
        }
    }
    mongoClient.close();

}

setInterval(removeParticipants, 10000);

app.listen(5000);