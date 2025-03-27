import express from "express";
import cors from 'cors';
import helmet from "helmet";

import { config } from "dotenv";

import { Order, OrderItems, OrderStatus } from "../types";
import amqp from 'amqplib';
import { throwDeprecation } from "process";
import { error } from "console";

config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());


// post order -> one or multiple products
// view orders

const orders : Order[] = [

    {
        id: 1,
        userID: "asads2",
        products: [
            {
                productId: 1,
                quantity: 2,
                productPrice: 999.99
            },
            {
                productId: 2,
                quantity: 34,
                productPrice: 69.99
            }
        ],
        totalAmount: -1,
        status: OrderStatus.PENDING,
        createdAt: new Date(Date.now()),

    },

];


// RabbitMQ connection
let channel: amqp.Channel;

async function connectQueue() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672')
        channel = await connection.createChannel();

        // create queues
        await channel.assertQueue('order_created', {durable:true});
        await channel.assertQueue('order_processed', {durable:true});

        console.log('Connected to RabbitMQ');
        

    } catch (error) {
        console.error('Failed to connect to RabbitMQ');
        throw error;
        
    }
}

function generateId(): number {
    return Math.floor(Math.random() * 1000000);
}  


// function to create new orders
app.post('/orders', async (req,res) => {
    try {
        
        const { userID, products, totalAmount } = req.body;

        const order: Order = {
            id: generateId(),
            userID,
            products,
            totalAmount,
            status: OrderStatus.PENDING,
            createdAt: new Date(Date.now())
        }

        orders.push(order);

        // here comes the interesting part
        // we are publishing this order to queue
        channel.sendToQueue('order_created', Buffer.from(JSON.stringify(order)));

        res.json({
            success: true,
            data: order.id
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create the order'
        });
        throw error;
    }
})


// we need a port to view the orders
app.get('/orders/:id', (req, res) => {
    
    try {
        
        const { id } = req.params;
        const order = orders.find( o => o.id === parseInt(id, 10));

        if (!order) {
            res.status(404).json({
                success: false,
                error: `There are no orders with id ${id}`
            });
        }


        res.json({
            success: true,
            data: order
        });


    } catch (error) {
        res.status(500).json({
            success: false,
            error: `Failed to fetch the details of order with id ${req.params}`
        })
    }
})


const port = process.env.PORT || 3002;

connectQueue().then(()=>{
    app.listen(port, ()=>{
        console.log(`Order service running at port:${port}`); 
    });
})
