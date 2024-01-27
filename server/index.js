const express = require("express")
const app =express()
const {MongoClient} = require("mongodb")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const secretKey = "9573844773"
app.use(express.json())

const cors = require("cors")
app.use(cors())

const client = new MongoClient("mongodb://127.0.0.1:27017/");

const dbName = "whatsapp"
const usersCollection = "users"
const chatsCollection = "chats"

const authenticateToken = async(req,res,next)=>{
    const authHeader = req.headers["authorization"]
    let jwtToken
    if(authHeader!==undefined){
        jwtToken= authHeader.split(" ")[1]
    }
    if(jwtToken!==undefined){
        try {
            const payload = await jwt.verify(jwtToken, secretKey);
            req.mobilenumber = payload.mobilenumber;
            next();
        } catch (error) {
            res.status(401).send("Invalid JWT Token");
        }
    } else {
        res.status(401).send("JWT Token not provided");
    }
}

app.post("/register/", async (req,res)=>{
    const {username,mobilenumber,password} = req.body
    const db = client.db(dbName)
    const collection = db.collection(usersCollection)
    const usersData = await collection.find({ mobilenumber: mobilenumber })
    const hashedPassword = await bcrypt.hash(password,10)
    if(usersData.username===undefined){
        await collection.insertOne({
            username,
            password:hashedPassword,
            mobilenumber,
        })
        
        res.send("Registerd Successfully")
    }
    else{
        res.status(400)
        res.send("Mobile Number Already Registered")
    }
})

app.post("/login/",async(req,res)=>{
    const {mobilenumber,password} = req.body
    const db = client.db(dbName)
    const collection = db.collection(usersCollection)
    const usersData = await collection.find({mobilenumber:mobilenumber}).toArray()
    if(usersData.length===0){
        res.status("404")
        res.send("Invalid Mobile Number")
    }
    else{
        const isPasswordMatched = await bcrypt.compare(password,usersData[0].password)
        if(isPasswordMatched){
            const jwtToken= jwt.sign({mobilenumber,mobilenumber},secretKey)
            const currentDate = new Date();

        const formattedDate = currentDate.toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
        await collection.updateOne(
                { mobilenumber: mobilenumber },
                {
                    $set: {
                        lastseen: currentDate,
                    },
                }
            );
            res.send({jwtToken})
        }
        else{
            res.status(401)
            res.send("Invalid Password")
        }
    }
})

app.post("/sendmessage/",authenticateToken,async(req,res)=>{
    const {msgSender,msgReciever,msgContent,msgTime} = req.body
    const msgObject = {
        participants:[msgSender,msgReciever].sort(),
        msgDetails :{
            msgContent:msgContent,
            msgTime:msgTime,
            msgSender:msgSender
        }
    }
    const db = client.db(dbName)
    const collection= db.collection(chatsCollection)
    await collection.insertOne(msgObject)
    res.send("Message Sent Successfully")
})

app.get("/allChats/",authenticateToken,async(req,res)=>{
    const {mobilenumber} = req
    const db =client.db(dbName)
    const collection = db.collection(chatsCollection)
    const allChats =await collection.aggregate([
        {
        $group: {
            _id: "$participants",
            documents: { $push: "$$ROOT" }
        }
        },
        {
        $project: {
            _id: 0,
            participants: "$_id",
            documents: 1
        }
        }
    ]).toArray()
    
    res.send(allChats)
})

app.get("/allChat/:mobilenumber",authenticateToken,async(req,res)=>{
    const userFriendMobilenumber= req.params.mobilenumber
    const userMobileNumber = req.mobilenumber
    const db = client.db(dbName)
    const collection = db.collection(chatsCollection)
    const allChats = await collection.aggregate([
        {
            $group: {
            _id: "$participants",
            documents: { $push: "$$ROOT" }
            }
        },
        {
            $project: {
            _id: 0,
            participants: "$_id",
            documents: 1
            }
        },
        {
            $match: {
            participants: userMobileNumber
            }
        }
        ]).toArray();
    
    res.send(allChats)
})

app.get("/getuser/:mobilenumber",authenticateToken,async(req,res)=>{
    const userFriendMobilenumber = req.params.mobilenumber
    const db = client.db(dbName)
    const collection = db.collection(usersCollection)
    const userData = await collection.find({mobilenumber:userFriendMobilenumber}).toArray()
    if(userData.length===0){
        res.status(404)
        res.send("User Not Found")
    }
    else{
        res.send({
            username:userData[0].username,
            mobilenumber:userData[0].mobilenumber
        })
    }
})

app.get("/userProfile/",authenticateToken,async(req,res)=>{
    const {mobilenumber} = req
    const db = client.db(dbName)
    const collection = db.collection(usersCollection)
    const userData =await collection.find({mobilenumber:mobilenumber}).toArray()
    console.log(userData)
    res.send(userData)
})

app.put("/addLastSeen/",authenticateToken,async(req,res)=>{
    const {mobilenumber} = req
    const {lastSeen} = req.body
    const db = client.db(dbName)
    const collection = db.collection(usersCollection)
    await collection.updateOne(
        { mobilenumber: mobilenumber },
        {
            $set: {
                lastseen: lastSeen,
            },
        }
    );
    res.send({jwtToken})
})

app.listen(5000,()=>console.log("server running on port 5000"))

