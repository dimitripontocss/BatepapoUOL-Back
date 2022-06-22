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


//Falta usar o joi
app.post("/participants", (req,res)=>{
    
    const { name } = req.body;
   
    db.collection("users").insertOne({
		name:name,
        lastStatus: Date.now()
	}).then(()=>{
        db.collection("messages").insertOne({
            from:name,
            to: "Todos",
            text: "entra na sala...",
            type:"status",
            time: dayjs().format('HH:mm:ss')
        }),res.sendStatus(201)
    });

    
})
app.get("/participants", (req,res)=>{
    db.collection("users").find().toArray().then(users => res.status(200).send(users) )
})

//Falta usar o joi
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
    const { user } = req.headers;
    const limit = parseInt(req.query.limit);
    db.collection("messages").find().toArray().then((messages) => filterMessages(messages));

    function filterMessages(messages){
        let sendableMessages=[];
        for(let i=0;i<messages.length;i++){
            if(messages[i].type === "message" || messages[i].type === "status"){
                sendableMessages.push(messages[i]);
            }else if(messages[i].from === user || messages[i].to === user || messages[i].to === "Todos"){
                sendableMessages.push(messages[i]);
            }
        }
        if(Number.isInteger(limit)){
            if(sendableMessages.length < limit){
                res.status(200).send(sendableMessages);
            }else{
                const sendableMessagesWLimit = sendableMessages.slice(sendableMessages.length-limit);
                res.status(200).send(sendableMessagesWLimit);
            }
        }
    }
})

app.post("/status", (req,res)=>{
    const { user } = req.headers;

    db.collection("users").findOne({name: user}, (err,user)).then((u)=> changeStatus(u));

    function changeStatus(activeUser){
        if(activeUser){
            console.log(activeUser.lastStatus,activeUser.name)
            activeUser.lastStatus = Date.now();
            activeUser.save(()=>console.log("salvou"))
            console.log(activeUser.lastStatus,activeUser.name)
            res.sendStatus(200);
        }else{
            res.sendStatus(404);
        }
    }
})

app.listen(5001);