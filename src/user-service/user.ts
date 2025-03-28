import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { config } from 'dotenv';
import { createClient } from 'redis';
import { User } from '../types'

config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());


const users: User[] = [{
    id: 69,
    name: "Mike Oochie",
    email: "mike.oochie@expose.com",
    address: "69, Bakers' Street, 1970" 
}];

const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
})

redisClient.connect().catch(error => {
    console.warn('redis connection warning, running without caching');
    throw error;
});


// function to get user details from if the user exists
app.get('/users/:id', async (req, res) => {
    
    try {
    
        const { id } = req.params;
        if (!/^\d+$/.test(id)) {
            res.status(400).json({ 
                success: false, 
                error: `Invalid user ID: ${id}` 
            });
            return;
        }

        const cachedUser = await redisClient.get(`user:${id}`);
        if(cachedUser) {
            res.json({
                success: true,
                data: JSON.parse(cachedUser) 
            });
            return;
        }
    

        // the user does not exist in the cache
        const user = users.find( u => u.id === parseInt(id, 10) );
        
        // user not present in the declared users 
        // this check is temporary == because we have created users: User[]
        if ( !user ) {
            res.status(404).json({
                success: false,
                error: `user not found with id ${id}`
            });
            return;
        }
        
        // cache the user in redis
        await redisClient.set(`user:${id}`, JSON.stringify(user), {
            EX: parseInt(process.env.CACHE_TIMEOUT ?? "600", 10)
        });

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'failed to get user details'
        });
        throw error;
    }

})

function generateId(): number {
    return Math.floor(Math.random() * 1000000);
}  

// now an endpoint to create new users
app.post("/users/add", async (req, res) => {
    try {
        
        const { name, email, address } = req.body;
        const newID = generateId();
        
        const user: User = {
            id: newID,
            name: name,
            email: email,
            address: address
        }

        users.push(user);

        await redisClient.set(`user:${newID}`, JSON.stringify(user), {
            EX: parseInt(process.env.CACHE_TIMEOUT ?? "600", 10)
        });

        res.json({
            success: true,
            data: newID
        });
    
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "failed to add new user"
        });
        throw error;
    }

})



const port = process.env.USER_SERVICE_PORT || 3003;
app.listen( port, ()=>{
    console.log(`User service listening on port ${port}`);  
})