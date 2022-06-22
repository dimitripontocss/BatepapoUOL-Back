import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import { MongoClient } from "mongodb";
import Joi from "joi"
import dayjs from "dayjs";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
	db = mongoClient.db("batepapo_uol");
});

const app = express();

app.use(cors());
app.use(express.json());

app.post("/participants", (req,res)=>{
    
    const { name } = req.body;
   
    db.collection("users").insertOne({
		name:name,
        lastStatus: Date.now()
	}).then(res.sendStatus(201));

    db.collection("messages").insertOne({
		from:name,
        to: "Todos",
        text: "entra na sala...",
        type:"status",
        time: dayjs().format('HH:mm:ss')
	});
})
app.get("/participants", (req,res)=>{
    db.collection("users").find().toArray().then(users => res.status(200).send(users) )
})



app.post("/messages", (req,res)=>{
    const { to, text, type} = req.body;
    const { user } = req.headers;

    db.collection("messages").insertOne({
		from:user,
        to: to,
        text: text,
        type: type,
        time: dayjs().format('HH:mm:ss')
	}).then(res.sendStatus(201));
})
app.get("/messages", (req,res)=>{
    const limit = parseInt(req.query.limit);
    db.collection("messages").find().toArray().then(messages => res.status(200).send(messages) )
})

app.listen(5000);