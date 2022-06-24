import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import { MongoClient,ObjectId } from "mongodb";
import Joi from "joi"
import dayjs from "dayjs";

dotenv.config();

const TIMER = 15000;

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
	db = mongoClient.db("batepapo_uol");
});

const app = express();

app.use(cors());
app.use(express.json());

const userSchema = Joi.object({
    name: Joi.string().required()
});

const messageSchemaBody = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().required().valid("message", "private_message")
    
})

async function verificaUser(name){
    const users = await db.collection("users").find().toArray();
    for(let i=0;i<users.length;i++){
        if(name === users[i].user){
            return true
        }
    }
    return false
}

const messageSchemaHeaders = Joi.boolean()


app.post("/participants", async (req,res)=>{
    
    const { name } = req.body;
    const validation = userSchema.validate(req.body)
    if(validation.error){
        res.sendStatus(422);
        return;
    }else{
        const alreadyExist = await db.collection("users").findOne({name:name})
            
        if(alreadyExist){
            res.sendStatus(409)
        }
        else{
            await db.collection("users").insertOne({
                name:name,
                lastStatus: Date.now()
            })
            db.collection("messages").insertOne({
                from:name,
                to: "Todos",
                text: "entra na sala...",
                type:"status",
                    time: dayjs().format('HH:mm:ss')
            })
            res.sendStatus(201);
            }
    }
      
})
app.get("/participants", async (req,res)=>{
    const users = await db.collection("users").find().toArray();
    res.status(200).send(users);
})


app.post("/messages", async (req,res)=>{
    const { to, text, type} = req.body;
    const { user } = req.headers;
    const checkUser = await verificaUser(user)

    const validateUser = messageSchemaHeaders.validateAsync(checkUser)
    const validation = messageSchemaBody.validate(req.body);
    if(validation.error || validateUser.error ){
        res.sendStatus(422);
        return;
    }

    await db.collection("messages").insertOne({
            from:user,
            to: to,
            text: text,
            type: type,
            time: dayjs().format('HH:mm:ss')
        })
    res.sendStatus(201);
})
app.get("/messages", async (req,res)=>{
    const { user } = req.headers;
    const limit = parseInt(req.query.limit);
    const messages = await db.collection("messages").find().toArray();

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
})


app.post("/status", async (req,res)=>{
    const { user } = req.headers;
    try{
        await db.collection("users").findOne({name: user});
        await db.collection("users").updateOne({name: user},{$set:{lastStatus:Date.now()}});
        res.sendStatus(200);
    }
    catch{
        res.sendStatus(404);
    }
})


app.delete("/messages/:ID_DA_MENSAGEM", async (req,res)=>{
    const { ID_DA_MENSAGEM } = req.params;
    const { user } = req.headers;
    
    const check = await db.collection("messages").findOne({_id: new ObjectId(ID_DA_MENSAGEM)})
    if(check.error){
        res.sendStatus(404);
        return;
    }else{
        if(check.from === user){
            try{
                await db.collection("messages").deleteOne({_id: new ObjectId(ID_DA_MENSAGEM)});
            }catch (error) {
                res.sendStatus(500);
              }
        }else{
            res.sendStatus(401);
        }
        
    }
})


app.put("/messages/:ID_DA_MENSAGEM", async (req,res)=>{
    const { ID_DA_MENSAGEM } = req.params;
    const { user } = req.headers;
    const { to, text, type} = req.body;
    const checkUser = await verificaUser(user)

    const validateUser = messageSchemaHeaders.validateAsync(checkUser)
    const validation = messageSchemaBody.validate(req.body);
    if(validation.error || validateUser.error){
        res.sendStatus(422);
        return;
    }
    const check = await db.collection("messages").findOne({_id: new ObjectId(ID_DA_MENSAGEM)})
    if(check.error){
        res.sendStatus(404);
        return;
    }else{
        if(check.from === user){
            try{
                await db.collection("messages").updateOne({_id: new ObjectId(ID_DA_MENSAGEM)},{$set:{
                    from:user,
                    to: to,
                    text: text,
                    type: type,
                    time: dayjs().format('HH:mm:ss')
                }});
                res.sendStatus(200);
            }catch (error) {
                res.sendStatus(500);
              }
        }else{
            res.sendStatus(401);
        }
        
    }
})


setInterval(async ()=>{
    const users = await db.collection("users").find().toArray();
    for(let i=0;i<users.length;i++){
        if(Date.now() - users[i].lastStatus >= 10000){
            await db.collection("users").deleteOne({ name: users[i].name});
            await db.collection("messages").insertOne({
                from:users[i].name,
                to: "Todos",
                text: "sai da sala...",
                type: "status",
                time: dayjs().format('HH:mm:ss')
            })
        }
    }
}, TIMER);

app.listen(5001);