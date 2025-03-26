import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';

import { createClient } from 'redis';
import { Product, ServiceResponse } from '../types'

config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());


// make a redis client
const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

// Handle Redis connection errors
redisClient.on('error', (err) => {
    console.error('redis client error', err);
});

// Attempt to connect to Redis, but don't block startup on failure
redisClient.connect().catch(() => {
    console.log('redis connection failed');
});



// An implied example of 'products' by definition
const products: Product[] = [
    {
        id: 1,
        name: 'Laptop',
        description: 'a very powerful laptop',
        price: 999.99,
        stock: 10,
    },
    {
        id: 2,
        name: 'Headphones',
        description: 'a very loud bass-thumping blood-pumping headphone',
        price: 199.99,
        stock: 6,
    },
];

app.get('/products', async (req, res) => {
    try {
        const cachedProducts = await redisClient.get('products');
        if(cachedProducts) {
            res.json({
                success: true,
                data: JSON.parse(cachedProducts)
            });
            return;
        }

        await redisClient.set('products', JSON.stringify(products), {
            EX: 900
        });

        res.json({
            success: true,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: `failed to fetch products - error : ${error}`
        });
    }
});


app.get('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const cachedProducts = await redisClient.get(`product:${id}`);
        if(cachedProducts) {
            res.json({
                success: true,
                data: JSON.parse(cachedProducts)
            });
            return;
        }

        const product = products.find((p) => p.id === parseInt(id, 10))
        if(!product) {
            res.status(404).json({
                success: false,
                error: `product with id ${id} not found`
            });
            return;
        }

        await redisClient.set(`product:${id}`, JSON.stringify(product), {
            EX: 900
        });

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        
        res.status(500).json({
            success: false,
            error: `failed to fetch the product with id ${req.params.id} - error : ${error}`
        });
    }
});



const port = process.env.PRODUCT_SERVICE_PORT || 3001;
app.listen(port, () => {
    console.log(`product service listening on port ${port}`);
    
})